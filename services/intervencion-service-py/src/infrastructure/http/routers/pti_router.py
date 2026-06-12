from fastapi import APIRouter, Depends, Request, HTTPException
from typing import Optional, List
from pydantic import BaseModel
from src.domain.entities.pti import PlanTrabajoCreate, PlanTrabajoResponse
from src.infrastructure.db.repositories.oracle_pti_repository import OraclePTIRepository
from src.domain.use_cases.pti_use_case import PTIUseCase
from src.infrastructure.http.middleware.jwt_middleware import get_current_user

router = APIRouter(prefix="/api/pti", tags=["PTI"])

def get_repository():
    return OraclePTIRepository()

class AccionUpdate(BaseModel):
    estado: Optional[str] = None
    descripcion: Optional[str] = None
    area: Optional[str] = None
    objetivo: Optional[str] = None
    meta: Optional[str] = None
    plazo: Optional[str] = None
    responsable: Optional[str] = None

class PtiUpdate(BaseModel):
    objetivo_general: str
    acciones: List[dict] = []

class CerrarPlanRequest(BaseModel):
    observacion: Optional[str] = None

class AmpliarVigenciaRequest(BaseModel):
    dias: int = 30

class InformeAmpliacion(BaseModel):
    antecedentes: str = ""
    analisis: str = ""
    sustento: str = ""
    conclusiones: str = ""

@router.post("/caso/{caso_id}", response_model=PlanTrabajoResponse)
async def crear_pti(caso_id: int, data: PlanTrabajoCreate, request: Request, repo: OraclePTIRepository = Depends(get_repository), current_user: dict = Depends(get_current_user)):
    use_case = PTIUseCase(repo)
    return await use_case.crear_pti(caso_id, data)

@router.get("/caso/{caso_id}")
async def obtener_pti(caso_id: int, repo: OraclePTIRepository = Depends(get_repository)):
    use_case = PTIUseCase(repo)
    pti = await use_case.obtener_ultimo_pti(caso_id)
    if not pti:
        return None
    return pti

@router.get("/caso/{caso_id}/all")
async def obtener_todos_ptis(caso_id: int, repo: OraclePTIRepository = Depends(get_repository)):
    use_case = PTIUseCase(repo)
    return await use_case.listar_ptis(caso_id)

@router.put("/{pti_id}")
async def actualizar_pti(pti_id: int, data: PtiUpdate, repo: OraclePTIRepository = Depends(get_repository), current_user: dict = Depends(get_current_user)):
    use_case = PTIUseCase(repo)
    result = await use_case.actualizar_pti(pti_id, data.objetivo_general, data.acciones)
    if not result:
        raise HTTPException(status_code=404, detail="PTI no encontrado")
    return result

@router.put("/{pti_id}/cerrar")
async def cerrar_plan(pti_id: int, data: CerrarPlanRequest, repo: OraclePTIRepository = Depends(get_repository), current_user: dict = Depends(get_current_user)):
    """Cierra formalmente el plan. Solo planes ACTIVOS pueden cerrarse."""
    ok = await repo.cerrar_pti(pti_id, data.observacion)
    if not ok:
        raise HTTPException(status_code=409, detail="El plan no existe o no está activo")
    return {"ok": True, "estado": "CERRADO"}


@router.put("/{pti_id}/ampliar-vigencia")
async def ampliar_vigencia(pti_id: int, data: AmpliarVigenciaRequest, repo: OraclePTIRepository = Depends(get_repository), current_user: dict = Depends(get_current_user)):
    """Amplía la vigencia del plan en N días (por defecto 30, tras Informe de Ampliación)."""
    if data.dias < 1 or data.dias > 180:
        raise HTTPException(status_code=422, detail="La ampliación debe ser entre 1 y 180 días")
    ok = await repo.ampliar_vigencia(pti_id, data.dias)
    if not ok:
        raise HTTPException(status_code=409, detail="El plan no existe o no está activo")
    return {"ok": True, "diasAmpliados": data.dias}


@router.put("/{pti_id}/informe-ampliacion")
async def guardar_informe_ampliacion(pti_id: int, data: InformeAmpliacion, repo: OraclePTIRepository = Depends(get_repository), current_user: dict = Depends(get_current_user)):
    """Persiste el Informe Tecnico de Ampliacion de Fase del plan."""
    import json
    from datetime import datetime
    informe = data.model_dump()
    informe["fecha"] = datetime.now().isoformat()
    informe["guardado_por"] = current_user.get("email", "")
    ok = await repo.update_informe_ampliacion(pti_id, json.dumps(informe, ensure_ascii=False))
    if not ok:
        raise HTTPException(status_code=404, detail="PTI no encontrado")
    return {"ok": True, "informe": informe}


@router.put("/acciones/{accion_id}")
async def actualizar_accion(accion_id: int, data: AccionUpdate, repo: OraclePTIRepository = Depends(get_repository)):
    use_case = PTIUseCase(repo)
    result = await use_case.actualizar_accion(accion_id, data.model_dump(exclude_none=True))
    if not result:
        raise HTTPException(status_code=404, detail="Acción no encontrada")
    return result
