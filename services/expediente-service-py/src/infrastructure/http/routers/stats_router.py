from fastapi import APIRouter, Depends
from src.infrastructure.db.repositories.oracle_stats_repository import OracleStatsRepository
from src.infrastructure.http.middleware.jwt_middleware import get_current_user

router = APIRouter(prefix="/api/stats", tags=["estadísticas"])

PHASE_LABELS = {
    "CAPTACION":      "Fase 1: Contacto",
    "EN_EVALUACION":  "Fase 1: Diagnóstico",
    "INTERVENCION":   "Fase 2: Intervención",
    "SEGUIMIENTO":    "Fase 3: Seguimiento",
    "DERIVADO":       "Derivado",
    "CERRADO":        "Egresados",
}

PHASE_COLORS = {
    "CAPTACION":     "#cbd5e1",
    "EN_EVALUACION": "#fcd34d",
    "INTERVENCION":  "#60a5fa",
    "SEGUIMIENTO":   "#34d399",
    "DERIVADO":      "#f97316",
    "CERRADO":       "#94a3b8",
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

    fases = [
        {
            "fase":     PHASE_LABELS.get(e["estado"], e["estado"]),
            "estado":   e["estado"],
            "cantidad": e["total"],
            "color":    PHASE_COLORS.get(e["estado"], "#e2e8f0"),
        }
        for e in por_estado
    ]

    carga = []
    if rol in ("ADMIN_NACIONAL", "COORDINADOR"):
        carga = await repo.carga_por_responsable(sede_id)

    eficiencia = 0
    total_intervencion = next((e["total"] for e in por_estado if e["estado"] == "INTERVENCION"), 0)
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
