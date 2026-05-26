from typing import Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel

from src.domain.use_cases.cerrar_caso_use_case import (
    CerrarCasoUseCase, CerrarCasoInput, CasoYaCerradoError
)
from src.infrastructure.db.repositories.oracle_folio_repository import OracleFolioRepository
from src.infrastructure.db.repositories.oracle_informe_repository import OracleInformeRepository
from src.infrastructure.http.middleware.jwt_middleware import get_current_user

router = APIRouter(prefix="/api/cierre", tags=["cierre"])


class CerrarCasoRequest(BaseModel):
    motivo_egreso: str
    fecha_egreso: Optional[datetime] = None
    situacion_familiar: Optional[str] = None
    situacion_educativa: Optional[str] = None
    logros_alcanzados: Optional[str] = None
    recomendaciones: Optional[str] = None
    archivo_url: Optional[str] = None


@router.post("/caso/{caso_id}", status_code=status.HTTP_201_CREATED)
async def cerrar_caso(
    caso_id: int,
    body: CerrarCasoRequest,
    user: dict = Depends(get_current_user),
):
    informe_repo = OracleInformeRepository()
    folio_repo = OracleFolioRepository()
    use_case = CerrarCasoUseCase(informe_repo, folio_repo)
    try:
        informe = await use_case.execute(
            CerrarCasoInput(
                caso_id=caso_id,
                sede_id=user["sedeId"],
                motivo_egreso=body.motivo_egreso,
                creado_por_id=user["userId"],
                fecha_egreso=body.fecha_egreso,
                situacion_familiar=body.situacion_familiar,
                situacion_educativa=body.situacion_educativa,
                logros_alcanzados=body.logros_alcanzados,
                recomendaciones=body.recomendaciones,
                archivo_url=body.archivo_url,
            )
        )
        return {
            "id":               informe.id,
            "codigo_informe":   informe.codigo_informe,
            "caso_id":          informe.caso_id,
            "motivo_egreso":    informe.motivo_egreso,
            "fecha_egreso":     str(informe.fecha_egreso) if informe.fecha_egreso else None,
        }
    except CasoYaCerradoError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.get("/caso/{caso_id}")
async def get_informe_cierre(caso_id: int, user: dict = Depends(get_current_user)):
    repo = OracleInformeRepository()
    informe = await repo.find_by_caso(caso_id)
    if not informe:
        raise HTTPException(status_code=404, detail="No existe informe de cierre para este caso")
    return {
        "id":                 informe.id,
        "codigo_informe":     informe.codigo_informe,
        "motivo_egreso":      informe.motivo_egreso,
        "fecha_egreso":       str(informe.fecha_egreso) if informe.fecha_egreso else None,
        "situacion_familiar": informe.situacion_familiar,
        "situacion_educativa":informe.situacion_educativa,
        "logros_alcanzados":  informe.logros_alcanzados,
        "recomendaciones":    informe.recomendaciones,
        "archivo_url":        informe.archivo_url,
    }
