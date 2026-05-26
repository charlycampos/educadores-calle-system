from fastapi import APIRouter, Depends, Request, HTTPException
from typing import List
from src.domain.entities.diario import DiarioCampoCreate, DiarioCampoResponse
from src.infrastructure.db.repositories.oracle_diario_repository import OracleDiarioRepository
from src.domain.use_cases.diario_use_case import DiarioUseCase

router = APIRouter(prefix="/api/diario", tags=["Diario Campo"])

def get_repository():
    return OracleDiarioRepository()

@router.post("", response_model=DiarioCampoResponse)
async def registrar_diario(data: DiarioCampoCreate, request: Request, repo: OracleDiarioRepository = Depends(get_repository)):
    use_case = DiarioUseCase(repo)
    return await use_case.registrar_diario(data, request.state.user_id)

@router.get("/caso/{caso_id}", response_model=List[DiarioCampoResponse])
async def listar_por_caso(caso_id: int, repo: OracleDiarioRepository = Depends(get_repository)):
    use_case = DiarioUseCase(repo)
    return await use_case.listar_por_caso(caso_id)
