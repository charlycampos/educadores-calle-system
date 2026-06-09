from fastapi import APIRouter, HTTPException, status, Depends

from src.infrastructure.db.repositories.oracle_sede_repository import OracleSedeRepository
from src.infrastructure.http.middleware.jwt_middleware import get_current_user

router = APIRouter(prefix="/api/sedes", tags=["sedes"])


@router.get("/")
async def list_sedes(current_user: dict = Depends(get_current_user)):
    """Lista todas las sedes activas."""
    repo = OracleSedeRepository()
    sedes = await repo.find_all_active()
    return [
        {
            "id":           s.id,
            "codigo":       s.codigo,
            "nombre":       s.nombre,
            "regionId":     s.region_id,
            "region":       s.region,
            "departamento": s.departamento,
            "provincia":    s.provincia,
            "direccion":    s.direccion,
            "telefono":     s.telefono,
        }
        for s in sedes
    ]


@router.get("/mi-sede")
async def get_mi_sede(current_user: dict = Depends(get_current_user)):
    """Devuelve la sede del usuario autenticado."""
    sede_id = current_user.get("sedeId")
    if not sede_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario sin sede asignada")
    repo = OracleSedeRepository()
    sede = await repo.find_by_id(sede_id)
    if not sede:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sede no encontrada")
    return {
        "id": sede.id, "codigo": sede.codigo, "nombre": sede.nombre,
        "regionId": sede.region_id, "region": sede.region,
        "departamento": sede.departamento, "provincia": sede.provincia,
        "direccion": sede.direccion, "telefono": sede.telefono,
    }


@router.get("/{sede_id}")
async def get_sede(sede_id: int, current_user: dict = Depends(get_current_user)):
    repo = OracleSedeRepository()
    sede = await repo.find_by_id(sede_id)
    if not sede:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sede no encontrada")
    return {
        "id":           sede.id,
        "codigo":       sede.codigo,
        "nombre":       sede.nombre,
        "regionId":     sede.region_id,
        "region":       sede.region,
        "departamento": sede.departamento,
        "provincia":    sede.provincia,
        "direccion":    sede.direccion,
        "telefono":     sede.telefono,
    }
