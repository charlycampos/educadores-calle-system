from fastapi import APIRouter, Depends, Request, HTTPException
from typing import List
from src.domain.entities.taller import (
    PlanificarTallerRequest, EjecutarTallerRequest, TallerResponse,
    AgregarParticipanteRequest, ActualizarParticipanteRequest, ParticipanteResponse
)
from src.infrastructure.db.repositories.oracle_taller_repository import OracleTallerRepository
from src.domain.use_cases.planificar_taller_use_case import PlanificarTallerUseCase
from src.domain.use_cases.ejecutar_taller_use_case import EjecutarTallerUseCase
from src.domain.use_cases.listar_talleres_use_case import ListarTalleresUseCase

router = APIRouter(prefix="/api/talleres", tags=["Talleres"])

def get_repository():
    return OracleTallerRepository()

@router.post("/planificar", response_model=TallerResponse)
async def planificar_taller(data: PlanificarTallerRequest, request: Request, repo: OracleTallerRepository = Depends(get_repository)):
    use_case = PlanificarTallerUseCase(repo)
    return await use_case.execute(data, request.state.user_id, request.state.sede_id)

@router.put("/{taller_id}", response_model=TallerResponse)
async def actualizar_taller(taller_id: int, data: PlanificarTallerRequest, repo: OracleTallerRepository = Depends(get_repository)):
    # Reusamos PlanificarTallerRequest para la actualización ya que los campos son los mismos
    return await repo.update_taller(taller_id, data.model_dump())

@router.post("/{taller_id}/ejecutar", response_model=TallerResponse)
async def ejecutar_taller(taller_id: int, data: EjecutarTallerRequest, request: Request, repo: OracleTallerRepository = Depends(get_repository)):
    use_case = EjecutarTallerUseCase(repo)
    try:
        return await use_case.execute(taller_id, data, request.state.user_id, request.state.rol)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("", response_model=List[TallerResponse])
async def listar_talleres(request: Request, repo: OracleTallerRepository = Depends(get_repository)):
    use_case = ListarTalleresUseCase(repo)
    rol = request.state.rol
    if rol in {"MONITOR", "ADMIN_NACIONAL", "ESTADISTICO"}:
        return await use_case.get_all()
    elif rol == "COORDINADOR":
        return await use_case.get_by_sede(request.state.sede_id)
    else:
        return await use_case.get_by_educador(request.state.user_id)

@router.get("/{taller_id}", response_model=TallerResponse)
async def obtener_taller(taller_id: int, request: Request, repo: OracleTallerRepository = Depends(get_repository)):
    use_case = ListarTalleresUseCase(repo)
    taller = await use_case.get_detail(taller_id)
    if not taller:
        raise HTTPException(status_code=404, detail="Taller no encontrado")
    return taller

@router.get("/historial/{nna_id}", response_model=List[TallerResponse])
async def historial_talleres_nna(nna_id: int, request: Request, repo: OracleTallerRepository = Depends(get_repository)):
    use_case = ListarTalleresUseCase(repo)
    return await use_case.get_by_nna(nna_id)

@router.post("/{taller_id}/participantes", response_model=ParticipanteResponse)
async def agregar_participante(taller_id: int, body: AgregarParticipanteRequest, repo: OracleTallerRepository = Depends(get_repository)):
    res = await repo.add_participante(taller_id, body.nnaId)
    if not res:
        raise HTTPException(status_code=400, detail="No se pudo agregar al participante. Verifique los IDs.")
    return res

@router.put("/{taller_id}/participantes/{nna_id}", response_model=ParticipanteResponse)
async def actualizar_participante(taller_id: int, nna_id: int, body: ActualizarParticipanteRequest, repo: OracleTallerRepository = Depends(get_repository)):
    res = await repo.update_participante(taller_id, nna_id, body.model_dump(exclude_unset=True))
    if not res:
        raise HTTPException(status_code=404, detail="Participante no encontrado.")
    return res

@router.delete("/{taller_id}/participantes/{nna_id}")
async def eliminar_participante(taller_id: int, nna_id: int, repo: OracleTallerRepository = Depends(get_repository)):
    exito = await repo.remove_participante(taller_id, nna_id)
    if not exito:
        raise HTTPException(status_code=404, detail="Participante no encontrado en el taller.")
    return {"message": "Participante eliminado exitosamente"}
