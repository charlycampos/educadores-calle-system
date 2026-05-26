"""
statistics_router.py — Estadísticas del dashboard para todos los roles.
Consulta directamente las tablas Oracle: NNA_CASO, NNA, SEC_USUARIO.
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status

from src.infrastructure.http.middleware.jwt_middleware import get_current_user, require_roles
from src.infrastructure.db.connection import get_pool

router = APIRouter(prefix="/api/statistics", tags=["statistics"])

# Roles que pueden ver estadísticas globales (sede o nacional)
ROLES_ADMIN = ("ADMIN_NACIONAL", "ADMIN_SEDE", "COORDINADOR")
ROLES_CAMPO = ("EDUCADOR", "PSICOLOGO", "TRABAJADOR_SOCIAL", "ABOGADO")

# Colores por estado de caso (coincide con el frontend)
_COLOR_ESTADO = {
    "CAPTACION":     "#cbd5e1",
    "EN_EVALUACION": "#fcd34d",
    "INTERVENCION":  "#60a5fa",
    "PRE_EGRESO":    "#4ade80",
    "CERRADO":       "#94a3b8",
}

_FASE_LABEL = {
    "CAPTACION":     "Fase 1: Contacto",
    "EN_EVALUACION": "Fase 1: Diagnóstico",
    "INTERVENCION":  "Fase 2: Intervención",
    "PRE_EGRESO":    "Fase 3: Pre-egreso",
    "CERRADO":       "Egresados",
}


async def _query(sql: str, params: dict = None):
    """Ejecuta una query y devuelve todas las filas."""
    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(sql, params or {})
            return await cur.fetchall()


async def _scalar(sql: str, params: dict = None):
    """Ejecuta una query y devuelve el primer valor de la primera fila."""
    rows = await _query(sql, params)
    return rows[0][0] if rows else 0


# ── /api/statistics/dashboard ─────────────────────────────────────────────────
@router.get("/dashboard")
async def dashboard(user: dict = Depends(get_current_user)):
    """
    Estadísticas del dashboard. Filtra por sede si el usuario no es ADMIN_NACIONAL.
    """
    rol      = user.get("rol", "")
    sede_id  = user.get("sedeId")
    user_id  = user.get("userId")
    es_nacional = (rol == "ADMIN_NACIONAL")
    es_campo    = (rol in ROLES_CAMPO)

    try:
        # ── Filtro base ────────────────────────────────────────────────────────
        if es_campo:
            where_base  = "WHERE c.RESPONSABLE_ID = :1"
            params_base = [user_id]
        elif es_nacional:
            where_base  = "WHERE 1=1"
            params_base = {}
        else:
            # ADMIN_SEDE o COORDINADOR → filtra por sede
            where_base  = "WHERE c.SEDE_ID = :1"
            params_base = [sede_id]

        # ── 1. Total de casos ──────────────────────────────────────────────────
        total_casos = await _scalar(
            f"SELECT COUNT(*) FROM NNA_CASO c {where_base}", params_base
        )

        # ── 2. Casos por estado / fase ─────────────────────────────────────────
        rows_fases = await _query(
            f"SELECT c.ESTADO, COUNT(*) FROM NNA_CASO c {where_base} GROUP BY c.ESTADO",
            params_base,
        )
        fases = [
            {
                "fase":     _FASE_LABEL.get(r[0], r[0]),
                "cantidad": r[1],
                "color":    _COLOR_ESTADO.get(r[0], "#e2e8f0"),
            }
            for r in rows_fases
        ]

        # ── 3. Carga laboral (casos por educador) ──────────────────────────────
        rows_carga = await _query(
            f"""
            SELECT u.NOMBRE_COMPLETO, COUNT(c.ID)
            FROM NNA_CASO c
            JOIN SEC_USUARIO u ON u.ID = c.RESPONSABLE_ID
            {where_base}
            GROUP BY u.NOMBRE_COMPLETO
            ORDER BY COUNT(c.ID) DESC
            """,
            params_base,
        )
        rows_carga = rows_carga[:15]
        carga_laboral = [{"educador": r[0], "cantidad": r[1]} for r in rows_carga]

        # ── 4. Alertas de calidad ──────────────────────────────────────────────
        hace_30 = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        hace_11m = (datetime.now() - timedelta(days=335)).strftime("%Y-%m-%d")
        hace_12m = (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")

        def _build_alert_params(extra: dict) -> dict:
            return {**params_base, **extra}

        # Alerta 1: Casos estancados en evaluación > 30 días
        # CAST a DATE porque FECHA_INGRESO es TIMESTAMP
        p1 = list(params_base)
        cond_estancados = (
            f"{where_base} AND c.ESTADO IN ('EN_EVALUACION','CAPTACION') "
            f"AND c.FECHA_INGRESO IS NOT NULL "
            f"AND CAST(c.FECHA_INGRESO AS DATE) < TO_DATE('{hace_30}','YYYY-MM-DD')"
        )
        estancados = await _scalar(f"SELECT COUNT(*) FROM NNA_CASO c {cond_estancados}", p1)

        # Alerta 2: PII por vencer (en intervención entre 11 y 12 meses)
        p2 = list(params_base)
        cond_pii = (
            f"{where_base} AND c.ESTADO = 'INTERVENCION' "
            f"AND c.FECHA_INGRESO IS NOT NULL "
            f"AND CAST(c.FECHA_INGRESO AS DATE) < TO_DATE('{hace_11m}','YYYY-MM-DD') "
            f"AND CAST(c.FECHA_INGRESO AS DATE) > TO_DATE('{hace_12m}','YYYY-MM-DD')"
        )
        pii_vencer = await _scalar(f"SELECT COUNT(*) FROM NNA_CASO c {cond_pii}", p2)

        # Alerta 3: Sin diagnóstico social (F04) — casos activos sin diagnóstico completo
        # Compara total activos vs total con diagnóstico
        activos = await _scalar(
            f"SELECT COUNT(*) FROM NNA_CASO c {where_base} AND c.ESTADO != 'CERRADO'",
            params_base,
        )

        # Intentamos contar diagnósticos en la tabla DIAG_SOCIAL (puede no existir aún)
        try:
            diag_completos = await _scalar(
                f"""
                SELECT COUNT(*) FROM NNA_CASO c
                JOIN DIAG_SOCIAL d ON d.CASO_ID = c.ID AND d.ESTADO = 'COMPLETO'
                {where_base}
                """,
                params_base,
            )
        except Exception:
            diag_completos = 0

        sin_diagnostico = max(0, activos - diag_completos)

        alertas = [
            {"tipo": "Evaluación Retrasada (>30d)", "cantidad": estancados,     "nivel": "ALTO"},
            {"tipo": "PII por Vencer (<1m)",         "cantidad": pii_vencer,    "nivel": "MEDIO"},
            {"tipo": "Sin Diagnóstico (F04)",         "cantidad": sin_diagnostico, "nivel": "CRITICO"},
        ]

        # ── 5. KPIs extra ──────────────────────────────────────────────────────
        eficiencia = round((diag_completos / activos * 100)) if activos > 0 else 0

        rows_perfil = await _query(
            f"SELECT c.PERFIL, COUNT(*) FROM NNA_CASO c {where_base} GROUP BY c.PERFIL",
            params_base,
        )
        distribucion_perfil = [{"nombre": r[0], "cantidad": r[1]} for r in rows_perfil if r[0]]

        return {
            "totalCasos":   total_casos,
            "fases":         fases,
            "cargaLaboral":  carga_laboral,
            "alertas":       alertas,
            "kpis": {
                "eficienciaDiagnostico": eficiencia,
                "distribucionPerfil":    distribucion_perfil,
            },
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener estadísticas: {str(e)}",
        )


# ── /api/statistics/mis-pendientes ────────────────────────────────────────────
@router.get("/mis-pendientes")
async def mis_pendientes(
    user: dict = Depends(require_roles("EDUCADOR", "PSICOLOGO", "TRABAJADOR_SOCIAL", "ABOGADO"))
):
    """Pendientes personales del usuario autenticado."""
    user_id = user.get("userId")
    hoy     = datetime.now()
    hace_30 = (hoy - timedelta(days=30)).strftime("%Y-%m-%d")

    try:
        pendientes = []

        # 1. Casos estancados en evaluación > 30 días
        # NOTA: FECHA_INGRESO es TIMESTAMP; CAST a DATE para aritmética con SYSDATE
        rows_estancados = await _query(
            f"""
            SELECT c.ID, n.NOMBRES || ' ' || n.APELLIDO_PATERNO,
                   ROUND(SYSDATE - CAST(c.FECHA_INGRESO AS DATE)) AS DIAS
            FROM NNA_CASO c
            JOIN NNA n ON n.ID = c.NNA_ID
            WHERE c.RESPONSABLE_ID = :1
              AND c.ESTADO IN ('EN_EVALUACION','CAPTACION')
              AND c.FECHA_INGRESO IS NOT NULL
              AND CAST(c.FECHA_INGRESO AS DATE) < TO_DATE('{hace_30}','YYYY-MM-DD')
            """,
            [user_id],
        )
        rows_estancados = rows_estancados[:5]
        for r in rows_estancados:
            dias = int(r[2]) if r[2] else 0
            pendientes.append({
                "id":          r[0],
                "tipo":        "estancado",
                "titulo":      r[1],
                "descripcion": f"Evaluación pendiente {dias} días",
                "urgencia":    "ALTA",
                "dias":        dias,
                "icono":       "📅",
            })

        # 2. Casos activos a cargo (sin cerrar)
        rows_activos = await _query(
            """
            SELECT COUNT(*) FROM NNA_CASO c
            WHERE c.RESPONSABLE_ID = :1 AND c.ESTADO != 'CERRADO'
            """,
            [user_id],
        )
        total_activos = rows_activos[0][0] if rows_activos else 0

        return {
            "total":      len(pendientes),
            "pendientes": pendientes,
            "resumen":    {"casosActivos": total_activos},
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener pendientes: {str(e)}",
        )
