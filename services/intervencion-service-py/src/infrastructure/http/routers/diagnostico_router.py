from fastapi import APIRouter, Depends, Request, HTTPException, status
from src.domain.entities.diagnostico import DiagnosticoSocialCreate
from src.infrastructure.db.repositories.oracle_diagnostico_repository import OracleDiagnosticoRepository
from src.domain.use_cases.diagnostico_use_case import DiagnosticoUseCase

router = APIRouter(prefix="/api/diagnostico", tags=["Diagnostico Social"])

def get_repository():
    return OracleDiagnosticoRepository()

@router.post("/nna/{nna_id}")
async def guardar_diagnostico(nna_id: int, data: DiagnosticoSocialCreate, repo: OracleDiagnosticoRepository = Depends(get_repository)):
    use_case = DiagnosticoUseCase(repo)
    return await use_case.guardar_diagnostico(nna_id, data)

@router.get("/nna/{nna_id}")
async def obtener_diagnosticos_de_nna(nna_id: int, repo: OracleDiagnosticoRepository = Depends(get_repository)):
    use_case = DiagnosticoUseCase(repo)
    diags = await use_case.obtener_diagnostico_por_nna(nna_id)
    return diags # Devuelve la lista completa directamente, lo cual es compatible con la grilla

@router.get("/{id}")
async def obtener_diagnostico_por_id(id: int, repo: OracleDiagnosticoRepository = Depends(get_repository)):
    use_case = DiagnosticoUseCase(repo)
    diag = await use_case.obtener_diagnostico_por_id(id)
    if not diag:
        raise HTTPException(status_code=404, detail="Diagnóstico no encontrado")
    return diag

@router.put("/{id}")
async def actualizar_diagnostico(id: int, data: DiagnosticoSocialCreate, repo: OracleDiagnosticoRepository = Depends(get_repository)):
    use_case = DiagnosticoUseCase(repo)
    diag = await use_case.obtener_diagnostico_por_id(id)
    if not diag:
        raise HTTPException(status_code=404, detail="Diagnóstico no encontrado")
    return await use_case.actualizar_diagnostico(id, data)

@router.delete("/{id}")
async def eliminar_diagnostico(id: int, repo: OracleDiagnosticoRepository = Depends(get_repository)):
    use_case = DiagnosticoUseCase(repo)
    diag = await use_case.obtener_diagnostico_por_id(id)
    if not diag:
        raise HTTPException(status_code=404, detail="Diagnóstico no encontrado")
    exito = await use_case.eliminar_diagnostico(id)
    if not exito:
        raise HTTPException(status_code=500, detail="No se pudo eliminar el diagnóstico")
    return {"ok": True}
