from fastapi import APIRouter, Depends
from src.infrastructure.db.repositories.oracle_dashboard_repository import OracleDashboardRepository
from src.infrastructure.http.middleware.jwt_middleware import get_current_user, require_roles

router = APIRouter(prefix="/dashboard-nacional", tags=["dashboard-nacional"])

@router.get("/stats")
async def get_national_stats(
    user: dict = Depends(require_roles("ADMIN_NACIONAL", "MONITOR", "ESTADISTICO"))
):
    """Consolidado de estadísticas nacionales para el Dashboard."""
    try:
        repo = OracleDashboardRepository()
        
        kpis = await repo.get_kpis_nacionales()
        sedes = await repo.get_estado_sedes()
        regiones = await repo.get_distribucion_regional()
        alertas = await repo.get_alertas_nacionales()
        
        # Calcular distribución por fase nacional sumando las de las sedes
        fases_nacional = {
            "captacion": sum(s["fases"]["captacion"] for s in sedes),
            "diagnostico": sum(s["fases"]["diagnostico"] for s in sedes),
            "intervencion": sum(s["fases"]["intervencion"] for s in sedes),
            "preEgreso": sum(s["fases"]["preEgreso"] for s in sedes)
        }

        return {
            "kpis": kpis,
            "sedes": sedes,
            "regiones": regiones,
            "alertas": alertas,
            "fasesNacional": fases_nacional
        }
    except Exception as e:
        import traceback
        print(f"❌ Error en dashboard_router: {str(e)}")
        traceback.print_exc()
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))
