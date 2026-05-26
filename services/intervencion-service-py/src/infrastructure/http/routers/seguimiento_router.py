from fastapi import APIRouter, Depends, Request, HTTPException
from typing import List
from src.domain.entities.seguimiento import SeguimientoFamiliarCreate, SeguimientoFamiliarResponse
from src.infrastructure.db.repositories.oracle_seguimiento_repository import OracleSeguimientoRepository
from src.domain.use_cases.seguimiento_use_case import SeguimientoUseCase

router = APIRouter(prefix="/api/seguimiento", tags=["Seguimiento Familiar"])

def get_repository():
    return OracleSeguimientoRepository()

@router.post("/caso/{caso_id}", response_model=SeguimientoFamiliarResponse)
async def registrar_seguimiento(caso_id: int, data: SeguimientoFamiliarCreate, request: Request, repo: OracleSeguimientoRepository = Depends(get_repository)):
    use_case = SeguimientoUseCase(repo)
    return await use_case.registrar_seguimiento(caso_id, data, request.state.user_id)

@router.get("/caso/{caso_id}", response_model=List[SeguimientoFamiliarResponse])
async def listar_por_caso(caso_id: int, repo: OracleSeguimientoRepository = Depends(get_repository)):
    use_case = SeguimientoUseCase(repo)
    return await use_case.listar_por_caso(caso_id)
