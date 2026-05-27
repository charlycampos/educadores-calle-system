from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
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
            "nombreResponsable": f.usuario_responsable,
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


@router.post("/upload")
async def upload_documento(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Subir un archivo PDF externo del expediente, guardarlo localmente, y retornar su metadata."""
    import os
    import uuid
    import re

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se permiten archivos en formato PDF."
        )

    # Crear subcarpeta del repositorio local si no existe
    repositorio_dir = os.path.abspath("./repositorio_archivos/documentos_subidos")
    os.makedirs(repositorio_dir, exist_ok=True)

    # Nombre único para guardarlo
    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    filepath = os.path.join(repositorio_dir, unique_filename)

    try:
        content = await file.read()
        
        # Escribir el archivo
        with open(filepath, "wb") as f:
            f.write(content)

        # Conteo exacto de páginas con pypdf, con fallback seguro a regex y 1 página
        try:
            from pypdf import PdfReader
            reader = PdfReader(filepath)
            pages = len(reader.pages)
        except Exception:
            matches = re.findall(rb"/Type\s*/Page\b", content)
            pages = max(1, len(matches))


    except Exception as e:
        if os.path.exists(filepath):
            os.remove(filepath)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al guardar el archivo: {str(e)}"
        )

    return {
        "filename": unique_filename,
        "original_name": file.filename,
        "pages": pages,
        "path": filepath,
    }


@router.get("/documento/{filename}")
async def get_documento_file(
    filename: str,
    token: Optional[str] = None,
    user: Optional[dict] = Depends(get_current_user)
):
    """Obtener el stream del PDF de un documento subido utilizando autenticación vía header o query param."""
    import os
    from fastapi.responses import FileResponse
    from src.infrastructure.http.middleware.jwt_middleware import verificar_token

    # Validar el token usando query param si get_current_user no lo pudo obtener por cabecera
    if not user:
        if not token:
            raise HTTPException(status_code=401, detail="No autorizado: Token faltante")
        try:
            user = verificar_token(token)
        except Exception:
            raise HTTPException(status_code=401, detail="No autorizado: Token inválido")

    repositorio_dir = os.path.abspath("./repositorio_archivos/documentos_subidos")
    filepath = os.path.join(repositorio_dir, filename)

    # Prevenir Directory Traversal
    real_path = os.path.abspath(filepath)
    if not real_path.startswith(repositorio_dir):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Acceso de archivo no válido."
        )

    if not os.path.exists(filepath):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El archivo solicitado no existe."
        )

    # Extraer el nombre original eliminando el prefijo del UUID para la descarga
    download_name = filename
    if "_" in filename:
        download_name = filename.split("_", 1)[1]

    return FileResponse(
        filepath,
        media_type="application/pdf",
        filename=download_name,
        headers={"Content-Disposition": f"inline; filename={download_name}"}
    )

