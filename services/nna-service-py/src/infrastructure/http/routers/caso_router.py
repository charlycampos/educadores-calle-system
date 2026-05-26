from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel

from src.domain.use_cases.cambiar_estado_caso_use_case import (
    CambiarEstadoCasoUseCase, CambiarEstadoInput,
    TransicionInvalidaError, NotFoundError
)
from src.infrastructure.db.repositories.oracle_caso_repository import (
    OracleCasoRepository, OracleHistorialRepository
)
from src.infrastructure.http.middleware.jwt_middleware import get_current_user

router = APIRouter(prefix="/casos", tags=["casos"])


class CambiarEstadoRequest(BaseModel):
    nuevo_estado: str
    motivo: Optional[str] = None


class ReasignarRequest(BaseModel):
    nuevo_responsable_id: int
    motivo: Optional[str] = None


@router.get("/")
async def list_casos(user: dict = Depends(get_current_user)):
    repo = OracleCasoRepository()
    rol = user.get("rol")
    sede_id = user.get("sedeId")
    user_id = user.get("userId")

    if rol == "ESTADISTICO":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado a esta información",
        )

    if rol in ("ADMIN_NACIONAL",):
        casos = await repo.list_by_sede(sede_id=sede_id, solo_activos=False)
    elif rol == "MONITOR":
        casos = await repo.list_all(solo_activos=True)
    elif rol == "COORDINADOR":
        casos = await repo.list_by_sede(sede_id=sede_id)
    else:
        casos = await repo.list_by_responsable(responsable_id=user_id)

    return [
        {
            "id": c.id, "codigo_caso": c.codigo_caso,
            "nna_id": c.nna_id,
            "nna_nombre": f"{c.nna_nombres or ''} {c.nna_apellidos or ''}".strip(),
            "estado": c.estado, "perfil": c.perfil,
            "nivel_riesgo": c.nivel_riesgo,
            "zona_intervencion": c.zona_intervencion,
            "fecha_apertura": str(c.fecha_apertura) if c.fecha_apertura else None,
        }
        for c in casos
    ]


@router.get("/{caso_id}")
async def get_caso(caso_id: int, user: dict = Depends(get_current_user)):
    rol = user.get("rol")
    if rol == "ESTADISTICO":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado a esta información",
        )
    repo = OracleCasoRepository()
    caso = await repo.find_by_id(caso_id)
    if not caso:
        raise HTTPException(status_code=404, detail="Caso no encontrado")
    return {
        "id": caso.id, "codigo_caso": caso.codigo_caso,
        "nna_id": caso.nna_id,
        "nna_nombre": f"{caso.nna_nombres or ''} {caso.nna_apellidos or ''}".strip(),
        "sede_id": caso.sede_id, "responsable_id": caso.responsable_id,
        "estado": caso.estado, "perfil": caso.perfil,
        "nivel_riesgo": caso.nivel_riesgo,
        "zona_intervencion": caso.zona_intervencion,
        "actividad_realizada": caso.actividad_realizada,
        "condicion": caso.condicion,
        "fecha_apertura": str(caso.fecha_apertura) if caso.fecha_apertura else None,
        "fecha_cierre": str(caso.fecha_cierre) if caso.fecha_cierre else None,
    }


@router.patch("/{caso_id}/estado")
async def cambiar_estado(
    caso_id: int,
    body: CambiarEstadoRequest,
    user: dict = Depends(get_current_user),
):
    rol = user.get("rol")
    if rol == "ESTADISTICO":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")
    if rol == "MONITOR":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos de escritura")
    caso_repo = OracleCasoRepository()
    hist_repo = OracleHistorialRepository()
    use_case = CambiarEstadoCasoUseCase(caso_repo, hist_repo)
    try:
        return await use_case.execute(
            CambiarEstadoInput(
                caso_id=caso_id,
                nuevo_estado=body.nuevo_estado,
                usuario_id=user["userId"],
                motivo=body.motivo,
            )
        )
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except TransicionInvalidaError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))


@router.patch("/{caso_id}/reasignar")
async def reasignar_caso(
    caso_id: int,
    body: ReasignarRequest,
    user: dict = Depends(get_current_user),
):
    """Reasigna el responsable del caso (usado en derivaciones internas)."""
    rol = user.get("rol")
    if rol == "ESTADISTICO":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")
    if rol == "MONITOR":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos de escritura")
    caso_repo = OracleCasoRepository()
    hist_repo = OracleHistorialRepository()
    caso = await caso_repo.find_by_id(caso_id)
    if not caso:
        raise HTTPException(status_code=404, detail="Caso no encontrado")
    responsable_anterior = caso.responsable_id
    await caso_repo.update_responsable(caso_id, body.nuevo_responsable_id)
    await hist_repo.create(
        caso_id=caso_id,
        estado_anterior=caso.estado,
        estado_nuevo=caso.estado,
        usuario_id=user["userId"],
        motivo=body.motivo or f"Reasignación por derivación interna",
        tipo_cambio="REASIGNACION",
    )
    return {"ok": True, "caso_id": caso_id, "nuevo_responsable_id": body.nuevo_responsable_id}


@router.get("/{caso_id}/historial")
async def get_historial(caso_id: int, user: dict = Depends(get_current_user)):
    rol = user.get("rol")
    if rol == "ESTADISTICO":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado a esta información",
        )
    repo = OracleHistorialRepository()
    return await repo.list_by_caso(caso_id)
