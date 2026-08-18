from fastapi import APIRouter, Depends
from src.infrastructure.db.repositories.oracle_stats_repository import OracleStatsRepository
from src.infrastructure.http.middleware.jwt_middleware import get_current_user

router = APIRouter(prefix="/api/stats", tags=["estadísticas"])

# Fases del servicio según la RDE 069-2021 (ver GUIA_OPERATIVA_SEC.md).
#
# Este diccionario reemplaza al que traducía NNA_CASO.ESTADO a etiquetas de
# fase. Eran dos cosas distintas forzadas en una: ESTADO dice la situación
# administrativa del caso (derivado, cerrado), FASE dice su avance
# metodológico. Un NNA puede estar en Fase II y derivado a la vez.
PHASE_LABELS = {
    "I":        "Fase I: Contacto e Integración",
    "II":       "Fase II: Restitución de Derechos",
    "III":      "Fase III: Seguimiento y Egreso",
    "EGRESADO": "Egresados",
}

PHASE_COLORS = {
    "I":        "#fcd34d",
    "II":       "#60a5fa",
    "III":      "#34d399",
    "EGRESADO": "#94a3b8",
}


@router.get("/dashboard")
async def dashboard(user: dict = Depends(get_current_user)):
    """Estadísticas del dashboard adaptadas al rol del usuario."""
    repo = OracleStatsRepository()
    rol = user.get("rol")
    sede_id = user.get("sedeId")
    user_id = user.get("userId")

    # Filtros según rol
    is_personal = rol not in ("ADMIN_NACIONAL", "COORDINADOR")
    filtro_sede = sede_id if not is_personal else None
    filtro_resp = user_id if is_personal else None

    total = await repo.total_casos(filtro_sede, filtro_resp)
    por_estado = await repo.casos_por_estado(filtro_sede, filtro_resp)
    alertas = await repo.alertas(filtro_sede, filtro_resp)
    perfil = await repo.distribucion_perfil(filtro_sede)

    # `codigo` es lo que el frontend debe comparar. `fase` es solo la etiqueta
    # para mostrar: buscar subcadenas dentro de ella ('Fase 2', 'Diagnóstico')
    # se rompe cada vez que se reescribe la redacción, que es justo lo que pasó.
    fases = [
        {
            "fase":       PHASE_LABELS.get(e["estado"], e["estado"]),
            "codigo":     e["estado"],
            "estado":     e["estado"],
            "cantidad":   e["total"],
            "color":      PHASE_COLORS.get(e["estado"], "#e2e8f0"),
            "plazoMeses": {"I": 3, "II": 15, "III": 6}.get(e["estado"]),
        }
        for e in por_estado
    ]

    carga = []
    if rol in ("ADMIN_NACIONAL", "COORDINADOR"):
        carga = await repo.carga_por_responsable(sede_id)

    # Casos que ya pasaron a la Fase II. Antes buscaba el estado 'INTERVENCION',
    # que ningún flujo llegaba a escribir: el KPI valía 0 en todas las sedes.
    eficiencia = 0
    total_intervencion = next((e["total"] for e in por_estado if e["estado"] == "II"), 0)
    if total > 0:
        eficiencia = round((total_intervencion / total) * 100)

    return {
        "totalCasos":       total,
        "fases":            fases,
        "cargaLaboral":     carga,
        "alertas":          alertas,
        "kpis": {
            "eficienciaIntervencion": eficiencia,
            "distribucionPerfil":     perfil,
        },
    }


@router.get("/pendientes")
async def mis_pendientes(user: dict = Depends(get_current_user)):
    """Tareas pendientes del usuario logueado (solo roles de campo)."""
    rol = user.get("rol")
    if rol in ("ADMIN_NACIONAL", "COORDINADOR"):
        return {"total": 0, "pendientes": [], "mensaje": "Vista disponible solo para personal de campo"}

    repo = OracleStatsRepository()
    pendientes = await repo.pendientes_educador(user["userId"])
    return {"total": len(pendientes), "pendientes": pendientes[:15]}
