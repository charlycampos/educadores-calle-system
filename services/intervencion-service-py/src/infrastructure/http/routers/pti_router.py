from fastapi import APIRouter, Depends, Request, HTTPException
from src.domain.entities.pti import PlanTrabajoCreate, PlanTrabajoResponse
from src.infrastructure.db.repositories.oracle_pti_repository import OraclePTIRepository
from src.domain.use_cases.pti_use_case import PTIUseCase

router = APIRouter(prefix="/api/pti", tags=["PTI"])

def get_repository():
    return OraclePTIRepository()

@router.post("/caso/{caso_id}", response_model=PlanTrabajoResponse)
async def crear_pti(caso_id: int, data: PlanTrabajoCreate, request: Request, repo: OraclePTIRepository = Depends(get_repository)):
    use_case = PTIUseCase(repo)
    return await use_case.crear_pti(caso_id, data)

@router.get("/caso/{caso_id}")
async def obtener_pti(caso_id: int, repo: OraclePTIRepository = Depends(get_repository)):
    use_case = PTIUseCase(repo)
    pti = await use_case.obtener_ultimo_pti(caso_id)
    if not pti:
        return None # Mantener compatibilidad con el frontend que espera null si no existe
    return pti
