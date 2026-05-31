import logging
import os
from typing import Optional
from fastapi import APIRouter, Depends, Request, HTTPException, status, BackgroundTasks
from fastapi.responses import FileResponse
from src.domain.entities.diagnostico import DiagnosticoSocialCreate
from src.infrastructure.db.repositories.oracle_diagnostico_repository import OracleDiagnosticoRepository
from src.domain.use_cases.diagnostico_use_case import DiagnosticoUseCase

logger = logging.getLogger("diagnostico_router")

router = APIRouter(prefix="/api/diagnostico", tags=["Diagnostico Social"])


def get_repository():
    return OracleDiagnosticoRepository()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _extract_token(request: Request, token: Optional[str]) -> Optional[str]:
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header.split(" ")[1]
    return token


def _get_pdf_path(diag: dict) -> str:
    codigo = diag.get("codigo_ficha_04") or f"ID_{diag.get('id')}"
    codigo = "".join(c for c in codigo if c.isalnum() or c in ("-", "_", ".")).strip()
    repositorio_dir = os.getenv("REPOSITORIO_F04_PDFS", "./repositorio_archivos/fichas_f04")
    return os.path.join(repositorio_dir, f"{codigo}.pdf")


async def _get_nna_data(nna_id: int) -> dict:
    from src.infrastructure.db.connection import get_pool
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "SELECT NOMBRES, APELLIDO_PATERNO, APELLIDO_MATERNO, NUMERO_DOC, TIPO_DOC, FECHA_NACIMIENTO "
                    "FROM NNA WHERE ID = :1",
                    [nna_id]
                )
                row = await cur.fetchone()
                if row:
                    return {
                        "nombres": row[0] or "",
                        "apellidoPaterno": row[1] or "",
                        "apellidoMaterno": row[2] or "",
                        "numeroDoc": row[3] or "",
                        "tipoDoc": row[4] or "",
                        "fechaNacimiento": row[5].isoformat() if row[5] else "",
                    }
    except Exception as e:
        logger.error(f"Error al obtener NNA {nna_id} para PDF F04: {e}", exc_info=True)
    return {}


def trigger_f04_pdf_generation(diag_id: int):
    import asyncio
    from src.infrastructure.services.pdf_generator_f04 import generate_f04_pdf

    async def _run():
        repo = OracleDiagnosticoRepository()
        diag = await repo.get_by_id(diag_id)
        if not diag:
            return
        nna_data = await _get_nna_data(diag.get("nna_id"))
        filepath = _get_pdf_path(diag)
        try:
            generate_f04_pdf(diag, nna_data, filepath)
            logger.info(f"PDF F04 generado: {filepath}")
        except Exception as e:
            logger.error(f"Error generando PDF F04 para diagnóstico {diag_id}: {e}", exc_info=True)

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(_run())
    except RuntimeError:
        asyncio.run(_run())


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/nna/{nna_id}")
async def guardar_diagnostico(
    nna_id: int,
    data: DiagnosticoSocialCreate,
    background_tasks: BackgroundTasks,
    repo: OracleDiagnosticoRepository = Depends(get_repository),
):
    use_case = DiagnosticoUseCase(repo)
    result = await use_case.guardar_diagnostico(nna_id, data)
    diag_id = result.get("id")
    if diag_id:
        background_tasks.add_task(trigger_f04_pdf_generation, diag_id)
    return result


@router.get("/nna/{nna_id}")
async def obtener_diagnosticos_de_nna(nna_id: int, repo: OracleDiagnosticoRepository = Depends(get_repository)):
    use_case = DiagnosticoUseCase(repo)
    return await use_case.obtener_diagnostico_por_nna(nna_id)


@router.get("/prefilled/nna/{nna_id}")
async def obtener_diagnostico_prellenado(nna_id: int, repo: OracleDiagnosticoRepository = Depends(get_repository)):
    use_case = DiagnosticoUseCase(repo)
    return await use_case.obtener_diagnostico_prellenado(nna_id)


@router.get("/{id}/pdf/pages")
async def get_diagnostico_pdf_pages(id: int, request: Request, token: Optional[str] = None):
    from pypdf import PdfReader
    from src.infrastructure.services.pdf_generator_f04 import generate_f04_pdf
    from jose import jwt, JWTError
    from src.config import settings

    actual_token = _extract_token(request, token)
    if not actual_token:
        raise HTTPException(status_code=401, detail="No autorizado: Token faltante")
    try:
        jwt.decode(actual_token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        raise HTTPException(status_code=401, detail="No autorizado: Token inválido")

    repo = OracleDiagnosticoRepository()
    diag = await repo.get_by_id(id)
    if not diag:
        raise HTTPException(status_code=404, detail="Diagnóstico no encontrado")

    filepath = _get_pdf_path(diag)
    if not os.path.exists(filepath):
        nna_data = await _get_nna_data(diag.get("nna_id"))
        try:
            generate_f04_pdf(diag, nna_data, filepath)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error generando PDF: {str(e)}")

    try:
        reader = PdfReader(filepath)
        page_count = len(reader.pages)
    except Exception:
        page_count = 1
    return {"pages": page_count}


@router.get("/{id}/pdf")
async def get_diagnostico_pdf(id: int, request: Request, token: Optional[str] = None):
    from src.infrastructure.services.pdf_generator_f04 import generate_f04_pdf
    from jose import jwt, JWTError
    from src.config import settings

    actual_token = _extract_token(request, token)
    if not actual_token:
        raise HTTPException(status_code=401, detail="No autorizado: Token faltante")
    try:
        jwt.decode(actual_token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        raise HTTPException(status_code=401, detail="No autorizado: Token inválido")

    repo = OracleDiagnosticoRepository()
    diag = await repo.get_by_id(id)
    if not diag:
        raise HTTPException(status_code=404, detail="Diagnóstico no encontrado")

    filepath = _get_pdf_path(diag)
    if not os.path.exists(filepath):
        nna_data = await _get_nna_data(diag.get("nna_id"))
        try:
            generate_f04_pdf(diag, nna_data, filepath)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error generando PDF: {str(e)}")

    filename = os.path.basename(filepath)
    return FileResponse(
        filepath,
        media_type="application/pdf",
        filename=filename,
        headers={"Content-Disposition": f"inline; filename={filename}"},
    )


@router.get("/{id}")
async def obtener_diagnostico_por_id(id: int, repo: OracleDiagnosticoRepository = Depends(get_repository)):
    use_case = DiagnosticoUseCase(repo)
    diag = await use_case.obtener_diagnostico_por_id(id)
    if not diag:
        raise HTTPException(status_code=404, detail="Diagnóstico no encontrado")
    return diag


@router.put("/{id}")
async def actualizar_diagnostico(
    id: int,
    data: DiagnosticoSocialCreate,
    background_tasks: BackgroundTasks,
    repo: OracleDiagnosticoRepository = Depends(get_repository),
):
    use_case = DiagnosticoUseCase(repo)
    diag = await use_case.obtener_diagnostico_por_id(id)
    if not diag:
        raise HTTPException(status_code=404, detail="Diagnóstico no encontrado")
    result = await use_case.actualizar_diagnostico(id, data)
    background_tasks.add_task(trigger_f04_pdf_generation, id)
    return result


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
