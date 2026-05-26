from fastapi import APIRouter, Depends, Request, HTTPException
from src.domain.entities.derivacion import DerivacionCreateInterna, DerivacionCreateExterna, ResponderDerivacionRequest, DerivacionResponse
from src.infrastructure.db.repositories.oracle_derivacion_repository import OracleDerivacionRepository
from src.domain.use_cases.crear_derivacion_interna_use_case import CrearDerivacionInternaUseCase
from src.domain.use_cases.crear_derivacion_externa_use_case import CrearDerivacionExternaUseCase
from src.domain.use_cases.responder_derivacion_use_case import ResponderDerivacionUseCase
from src.domain.use_cases.listar_derivaciones_use_case import ListarDerivacionesUseCase

router = APIRouter(prefix="/api/derivaciones", tags=["Derivaciones"])

def get_repository():
    return OracleDerivacionRepository()

@router.post("/interna", response_model=DerivacionResponse)
async def crear_derivacion_interna(data: DerivacionCreateInterna, request: Request, repo: OracleDerivacionRepository = Depends(get_repository)):
    use_case = CrearDerivacionInternaUseCase(repo)
    return await use_case.execute(data, request.state.user_id, request.state.sede_id)

@router.post("/externa", response_model=DerivacionResponse)
async def crear_derivacion_externa(data: DerivacionCreateExterna, request: Request, repo: OracleDerivacionRepository = Depends(get_repository)):
    use_case = CrearDerivacionExternaUseCase(repo)
    return await use_case.execute(data, request.state.user_id, request.state.sede_id)

@router.patch("/{derivacion_id}/responder", response_model=DerivacionResponse)
async def responder_derivacion(derivacion_id: int, data: ResponderDerivacionRequest, request: Request, repo: OracleDerivacionRepository = Depends(get_repository)):
    use_case = ResponderDerivacionUseCase(repo)
    try:
        return await use_case.execute(derivacion_id, data, request.state.user_id, request.state.rol)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/pendientes", response_model=list[DerivacionResponse])
async def listar_pendientes(request: Request, repo: OracleDerivacionRepository = Depends(get_repository)):
    use_case = ListarDerivacionesUseCase(repo)
    return await use_case.get_pendientes(request.state.sede_id, request.state.user_id, request.state.rol)

@router.get("/caso/{caso_id}", response_model=list[DerivacionResponse])
async def listar_por_caso(caso_id: int, repo: OracleDerivacionRepository = Depends(get_repository)):
    use_case = ListarDerivacionesUseCase(repo)
    return await use_case.get_by_caso(caso_id)
