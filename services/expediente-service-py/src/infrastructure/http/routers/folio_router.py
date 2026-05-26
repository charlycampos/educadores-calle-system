from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel

from src.domain.use_cases.agregar_folio_use_case import (
    AgregarFolioUseCase, AgregarFolioInput, TipoDocumentoInvalidoError
)
from src.infrastructure.db.repositories.oracle_folio_repository import OracleFolioRepository
from src.infrastructure.http.middleware.jwt_middleware import get_current_user

router = APIRouter(prefix="/api/expediente", tags=["expediente"])


class AgregarFolioRequest(BaseModel):
    tipo_documento: str
    titulo: str
    archivo_url: str
    contenido_hash: Optional[str] = None


@router.get("/caso/{caso_id}")
async def get_expediente(caso_id: int, user: dict = Depends(get_current_user)):
    """Devuelve todos los folios de un caso ordenados correlativamente."""
    repo = OracleFolioRepository()
    folios = await repo.list_by_caso(caso_id)
    return [
        {
            "id":             f.id,
            "numero_folio":   f.numero_folio,
            "tipo_documento": f.tipo_documento,
            "titulo":         f.titulo,
            "archivo_url":    f.archivo_url,
            "hash_documento": f.hash_documento,
            "creado_por_id":  f.creado_por_id,
            "fecha_creacion": str(f.fecha_creacion) if f.fecha_creacion else None,
        }
        for f in folios
    ]


@router.post("/caso/{caso_id}/folio", status_code=status.HTTP_201_CREATED)
async def agregar_folio(
    caso_id: int,
    body: AgregarFolioRequest,
    user: dict = Depends(get_current_user),
):
    repo = OracleFolioRepository()
    use_case = AgregarFolioUseCase(repo)
    try:
        folio = await use_case.execute(
            AgregarFolioInput(
                caso_id=caso_id,
                sede_id=user["sedeId"],
                tipo_documento=body.tipo_documento,
                titulo=body.titulo,
                archivo_url=body.archivo_url,
                creado_por_id=user["userId"],
                contenido_hash=body.contenido_hash,
            )
        )
        return {
            "id":             folio.id,
            "numero_folio":   folio.numero_folio,
            "tipo_documento": folio.tipo_documento,
            "titulo":         folio.titulo,
            "archivo_url":    folio.archivo_url,
        }
    except TipoDocumentoInvalidoError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
