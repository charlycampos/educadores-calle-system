import logging
import os
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from fastapi.responses import FileResponse

from src.domain.entities.seguimiento import (
    SeguimientoFamiliarCreate,
    SeguimientoFamiliarResponse,
    SeguimientoFamiliarUpdate,
)
from src.domain.use_cases.seguimiento_use_case import SeguimientoUseCase
from src.infrastructure.db.repositories.oracle_seguimiento_repository import OracleSeguimientoRepository

logger = logging.getLogger("seguimiento_router")

router = APIRouter(prefix="/api/seguimiento", tags=["Seguimiento Familiar F12"])


def get_repository():
    return OracleSeguimientoRepository()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_pdf_path(seguimiento_id: int) -> str:
    base = os.getenv("REPOSITORIO_F12_PDFS", "./repositorio_archivos/fichas_f12")
    return os.path.join(base, f"SEG-F12-{seguimiento_id}.pdf")


async def _get_nna_data(nna_id: int) -> dict:
    from src.infrastructure.db.connection import get_pool
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "SELECT NOMBRES, APELLIDO_PATERNO, APELLIDO_MATERNO, NUMERO_DOC, TIPO_DOC "
                    "FROM NNA WHERE ID = :1",
                    [nna_id],
                )
                row = await cur.fetchone()
                if row:
                    return {
                        "nombres":         row[0] or "",
                        "apellidoPaterno": row[1] or "",
                        "apellidoMaterno": row[2] or "",
                        "numeroDoc":       row[3] or "",
                        "tipoDoc":         row[4] or "",
                    }
    except Exception as e:
        logger.error(f"Error al obtener NNA {nna_id}: {e}", exc_info=True)
    return {}


def trigger_f12_pdf_generation(seguimiento_id: int):
    import asyncio
    from src.infrastructure.services.pdf_generator_f12 import generate_f12_pdf

    async def _run():
        repo = OracleSeguimientoRepository()
        seg = await repo.get_by_id(seguimiento_id)
        if not seg:
            return
        nna_data = await _get_nna_data(seg.get("nna_id"))
        filepath = _get_pdf_path(seguimiento_id)
        try:
            generate_f12_pdf(seg, nna_data, filepath)
            logger.info(f"PDF F12 generado: {filepath}")
        except Exception as e:
            logger.error(f"Error generando PDF F12 id={seguimiento_id}: {e}", exc_info=True)

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(_run())
    except RuntimeError:
        asyncio.run(_run())


# ── CRUD endpoints ────────────────────────────────────────────────────────────

@router.post("/caso/{caso_id}", response_model=SeguimientoFamiliarResponse)
async def registrar_seguimiento(
    caso_id: int,
    data: SeguimientoFamiliarCreate,
    request: Request,
    background_tasks: BackgroundTasks,
    repo: OracleSeguimientoRepository = Depends(get_repository),
):
    use_case = SeguimientoUseCase(repo)
    result = await use_case.registrar_seguimiento(caso_id, data, request.state.user_id)
    if result.get("id"):
        background_tasks.add_task(trigger_f12_pdf_generation, result["id"])
    return result


@router.put("/{seguimiento_id}", response_model=SeguimientoFamiliarResponse)
async def actualizar_seguimiento(
    seguimiento_id: int,
    data: SeguimientoFamiliarUpdate,
    background_tasks: BackgroundTasks,
    repo: OracleSeguimientoRepository = Depends(get_repository),
):
    use_case = SeguimientoUseCase(repo)
    try:
        result = await use_case.actualizar_seguimiento(seguimiento_id, data)
        background_tasks.add_task(trigger_f12_pdf_generation, seguimiento_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/caso/{caso_id}", response_model=List[SeguimientoFamiliarResponse])
async def listar_por_caso(
    caso_id: int,
    repo: OracleSeguimientoRepository = Depends(get_repository),
):
    use_case = SeguimientoUseCase(repo)
    return await use_case.listar_por_caso(caso_id)


# ── PDF endpoints ─────────────────────────────────────────────────────────────

@router.get("/{seguimiento_id}/pdf/pages")
async def get_seguimiento_pdf_pages(seguimiento_id: int):
    from pypdf import PdfReader
    from src.infrastructure.services.pdf_generator_f12 import generate_f12_pdf

    repo = OracleSeguimientoRepository()
    seg = await repo.get_by_id(seguimiento_id)
    if not seg:
        raise HTTPException(status_code=404, detail="Seguimiento no encontrado")

    filepath = _get_pdf_path(seguimiento_id)
    if not os.path.exists(filepath):
        nna_data = await _get_nna_data(seg.get("nna_id"))
        try:
            generate_f12_pdf(seg, nna_data, filepath)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error generando PDF: {e}")

    try:
        page_count = len(PdfReader(filepath).pages)
    except Exception:
        page_count = 1
    return {"pages": page_count}


@router.get("/{seguimiento_id}/pdf")
async def get_seguimiento_pdf(seguimiento_id: int, token: Optional[str] = None):
    from src.infrastructure.services.pdf_generator_f12 import generate_f12_pdf

    repo = OracleSeguimientoRepository()
    seg = await repo.get_by_id(seguimiento_id)
    if not seg:
        raise HTTPException(status_code=404, detail="Seguimiento no encontrado")

    filepath = _get_pdf_path(seguimiento_id)
    if not os.path.exists(filepath):
        nna_data = await _get_nna_data(seg.get("nna_id"))
        try:
            generate_f12_pdf(seg, nna_data, filepath)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error generando PDF: {e}")

    filename = os.path.basename(filepath)
    return FileResponse(
        filepath,
        media_type="application/pdf",
        filename=filename,
        headers={"Content-Disposition": f"inline; filename={filename}"},
    )
