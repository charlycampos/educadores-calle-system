from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel

from src.domain.use_cases.solicitar_traslado_use_case import (
    SolicitarTrasladoUseCase, SolicitarTrasladoInput,
    ResponderTrasladoUseCase, ResponderTrasladoInput,
    NotFoundError
)
from src.infrastructure.db.repositories.oracle_caso_repository import (
    OracleCasoRepository, OracleTrasladoRepository, OracleHistorialRepository
)
from src.infrastructure.http.middleware.jwt_middleware import get_current_user, require_roles

router = APIRouter(prefix="/traslados", tags=["traslados"])


class SolicitarTrasladoRequest(BaseModel):
    caso_id: int
    sede_destino_id: int
    region_destino_id: int
    motivo: str


class ResponderTrasladoRequest(BaseModel):
    aceptar: bool
    observaciones: Optional[str] = None


@router.post("/", status_code=status.HTTP_201_CREATED)
async def solicitar_traslado(
    body: SolicitarTrasladoRequest,
    user: dict = Depends(require_roles("COORDINADOR", "ADMIN_NACIONAL")),
):
    caso_repo = OracleCasoRepository()
    traslado_repo = OracleTrasladoRepository()
    use_case = SolicitarTrasladoUseCase(caso_repo, traslado_repo)
    try:
        traslado = await use_case.execute(
            SolicitarTrasladoInput(
                caso_id=body.caso_id,
                sede_destino_id=body.sede_destino_id,
                motivo=body.motivo,
                coordinador_origen_id=user["userId"],
                sede_origen_id=user["sedeId"],
                region_origen_id=user["regionId"],
                region_destino_id=body.region_destino_id,
            )
        )
        return {"id": traslado.id, "tipo": traslado.tipo, "estado": traslado.estado}
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.patch("/{traslado_id}/responder")
async def responder_traslado(
    traslado_id: int,
    body: ResponderTrasladoRequest,
    user: dict = Depends(require_roles("COORDINADOR", "ADMIN_NACIONAL")),
):
    caso_repo = OracleCasoRepository()
    traslado_repo = OracleTrasladoRepository()
    hist_repo = OracleHistorialRepository()
    use_case = ResponderTrasladoUseCase(caso_repo, traslado_repo, hist_repo)
    try:
        return await use_case.execute(
            ResponderTrasladoInput(
                traslado_id=traslado_id,
                coordinador_dest_id=user["userId"],
                sede_dest_id=user["sedeId"],
                aceptar=body.aceptar,
                observaciones=body.observaciones,
            )
        )
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/pendientes")
async def traslados_pendientes(
    user: dict = Depends(require_roles("COORDINADOR", "ADMIN_SEDE", "MONITOR", "ADMIN_NACIONAL")),
):
    repo = OracleTrasladoRepository()
    rol = user.get("rol", "")
    if rol in {"MONITOR", "ADMIN_NACIONAL"}:
        return await repo.list_all_pendientes()
    else:
        return await repo.list_pendientes_por_sede(user["sedeId"])
