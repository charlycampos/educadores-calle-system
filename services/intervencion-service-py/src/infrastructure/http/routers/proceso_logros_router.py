import logging
import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from src.domain.entities.proceso_logros import ProcesoLogrosCreate
from src.infrastructure.db.repositories.oracle_proceso_logros_repository import OracleProcesoLogrosRepository
from src.domain.use_cases.proceso_logros_use_case import ProcesoLogrosUseCase

logger = logging.getLogger("proceso_logros_router")

router = APIRouter(prefix="/api/proceso-logros", tags=["Proceso de Logros F05"])


def get_repo():
    return OracleProcesoLogrosRepository()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_pdf_path(logros: dict) -> str:
    codigo = logros.get("codigo_f05") or f"ID_{logros.get('id')}"
    codigo = "".join(c for c in codigo if c.isalnum() or c in ("-", "_")).strip()
    base = os.getenv("REPOSITORIO_F05_PDFS", "./repositorio_archivos/fichas_f05")
    return os.path.join(base, f"{codigo}.pdf")


def _get_fase_pdf_path(logros: dict, fase_num: int) -> str:
    codigo = logros.get("codigo_f05") or f"ID_{logros.get('id')}"
    codigo = "".join(c for c in codigo if c.isalnum() or c in ("-", "_")).strip()
    base = os.getenv("REPOSITORIO_F05_PDFS", "./repositorio_archivos/fichas_f05")
    return os.path.join(base, f"{codigo}-fase{fase_num}.pdf")


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


def trigger_f05_pdf_generation(logros_id: int):
    import asyncio
    from src.infrastructure.services.pdf_generator_f05 import generate_f05_pdf

    async def _run():
        repo = OracleProcesoLogrosRepository()
        logros = await repo.get_by_id(logros_id)
        if not logros:
            return
        nna_data = await _get_nna_data(logros.get("nna_id"))
        filepath = _get_pdf_path(logros)
        try:
            generate_f05_pdf(logros, nna_data, filepath)
            logger.info(f"PDF F05 generado: {filepath}")
        except Exception as e:
            logger.error(f"Error generando PDF F05 {logros_id}: {e}", exc_info=True)

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(_run())
    except RuntimeError:
        asyncio.run(_run())


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/nna/{nna_id}")
async def crear_logros(
    nna_id: int,
    data: ProcesoLogrosCreate,
    background_tasks: BackgroundTasks,
    repo: OracleProcesoLogrosRepository = Depends(get_repo),
):
    from src.infrastructure.services.expediente_service import trigger_apertura_expediente
    use_case = ProcesoLogrosUseCase(repo)
    result = await use_case.guardar(nna_id, data)
    if result.get("id"):
        background_tasks.add_task(trigger_f05_pdf_generation, result["id"])
        await trigger_apertura_expediente(nna_id)
    return result


@router.get("/nna/{nna_id}")
async def obtener_logros_por_nna(
    nna_id: int,
    repo: OracleProcesoLogrosRepository = Depends(get_repo),
):
    use_case = ProcesoLogrosUseCase(repo)
    return await use_case.obtener_por_nna(nna_id)


@router.get("/{logros_id}/pdf/pages")
async def get_logros_pdf_pages(logros_id: int):
    from pypdf import PdfReader
    from src.infrastructure.services.pdf_generator_f05 import generate_f05_pdf

    repo = OracleProcesoLogrosRepository()
    logros = await repo.get_by_id(logros_id)
    if not logros:
        raise HTTPException(status_code=404, detail="Registro F05 no encontrado")

    filepath = _get_pdf_path(logros)
    if not os.path.exists(filepath):
        nna_data = await _get_nna_data(logros.get("nna_id"))
        try:
            generate_f05_pdf(logros, nna_data, filepath)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error generando PDF: {e}")

    try:
        page_count = len(PdfReader(filepath).pages)
    except Exception:
        page_count = 1
    return {"pages": page_count}


@router.get("/{logros_id}/pdf")
async def get_logros_pdf(logros_id: int, token: Optional[str] = None):
    from src.infrastructure.services.pdf_generator_f05 import generate_f05_pdf

    repo = OracleProcesoLogrosRepository()
    logros = await repo.get_by_id(logros_id)
    if not logros:
        raise HTTPException(status_code=404, detail="Registro F05 no encontrado")

    filepath = _get_pdf_path(logros)
    if not os.path.exists(filepath):
        nna_data = await _get_nna_data(logros.get("nna_id"))
        try:
            generate_f05_pdf(logros, nna_data, filepath)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error generando PDF: {e}")

    filename = os.path.basename(filepath)
    return FileResponse(
        filepath,
        media_type="application/pdf",
        filename=filename,
        headers={"Content-Disposition": f"inline; filename={filename}"},
    )


@router.get("/{logros_id}")
async def obtener_logros_por_id(
    logros_id: int,
    repo: OracleProcesoLogrosRepository = Depends(get_repo),
):
    use_case = ProcesoLogrosUseCase(repo)
    result = await use_case.obtener_por_id(logros_id)
    if not result:
        raise HTTPException(status_code=404, detail="Registro F05 no encontrado")
    return result


@router.post("/{logros_id}/cerrar-fase/{fase_num}")
async def cerrar_fase(
    logros_id: int,
    fase_num: int,
    repo: OracleProcesoLogrosRepository = Depends(get_repo),
):
    """
    Cierra una fase del F05 (1, 2 ó 3): valida que todos sus ítems sean SI,
    genera el PDF parcial de esa fase y devuelve la URL.
    El frontend registra el folio en EXP_FOLIO tras llamar a este endpoint.
    """
    if fase_num not in (1, 2, 3):
        raise HTTPException(status_code=400, detail="Número de fase inválido. Debe ser 1, 2 ó 3.")

    logros = await repo.get_by_id(logros_id)
    if not logros:
        raise HTTPException(status_code=404, detail="Registro F05 no encontrado")

    FASE_CONFIG = {1: (5, "I"), 2: (10, "II"), 3: (5, "III")}

    # Para Fase 2 y 3, verificar que la fase anterior esté completa
    if fase_num >= 2:
        prev_total, prev_label = FASE_CONFIG[fase_num - 1]
        if not all(logros.get(f"f{fase_num - 1}_i{i}") == "SI" for i in range(1, prev_total + 1)):
            raise HTTPException(
                status_code=422,
                detail=f"Debe completar la Fase {prev_label} antes de cerrar la Fase {FASE_CONFIG[fase_num][1]}.",
            )

    total, label = FASE_CONFIG[fase_num]
    pendientes = [f"ítem {i}" for i in range(1, total + 1) if logros.get(f"f{fase_num}_i{i}") != "SI"]
    if pendientes:
        raise HTTPException(
            status_code=422,
            detail=f"Fase {label} incompleta. Ítems pendientes: {', '.join(pendientes)}",
        )

    from src.infrastructure.services.pdf_generator_f05 import generate_f05_fase_pdf
    nna_data = await _get_nna_data(logros.get("nna_id"))
    filepath = _get_fase_pdf_path(logros, fase_num)
    try:
        generate_f05_fase_pdf(logros, nna_data, fase_num, filepath)
        logger.info(f"PDF F05 Fase {fase_num} generado: {filepath}")
    except Exception as e:
        logger.error(f"Error generando PDF F05 Fase {fase_num} id={logros_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error al generar el PDF de la Fase {label}: {e}")

    return {
        "ok": True,
        "logros_id": logros_id,
        "fase_num": fase_num,
        "codigo_f05": logros.get("codigo_f05"),
        "pdf_url": f"/api/proceso-logros/{logros_id}/pdf/fase/{fase_num}",
    }


@router.get("/{logros_id}/pdf/fase/{fase_num}/pages")
async def get_fase_pdf_pages(logros_id: int, fase_num: int, repo: OracleProcesoLogrosRepository = Depends(get_repo)):
    logros = await repo.get_by_id(logros_id)
    if not logros:
        raise HTTPException(status_code=404, detail="Registro F05 no encontrado")
    filepath = _get_fase_pdf_path(logros, fase_num)
    if not os.path.exists(filepath):
        return {"pages": 1}
    try:
        from pypdf import PdfReader
        reader = PdfReader(filepath)
        return {"pages": len(reader.pages)}
    except Exception:
        return {"pages": 1}


@router.get("/{logros_id}/pdf/fase/{fase_num}")
async def get_fase_pdf(
    logros_id: int,
    fase_num: int,
    token: Optional[str] = None,
    repo: OracleProcesoLogrosRepository = Depends(get_repo),
):
    logros = await repo.get_by_id(logros_id)
    if not logros:
        raise HTTPException(status_code=404, detail="Registro F05 no encontrado")
    filepath = _get_fase_pdf_path(logros, fase_num)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail=f"PDF de Fase {fase_num} no generado aún.")
    codigo = logros.get("codigo_f05", f"F05-{logros_id}")
    return FileResponse(
        filepath,
        media_type="application/pdf",
        filename=f"{codigo}-fase{fase_num}.pdf",
        headers={"Content-Disposition": f"inline; filename={codigo}-fase{fase_num}.pdf"},
    )


@router.post("/{logros_id}/finalizar")
async def finalizar_logros(
    logros_id: int,
    repo: OracleProcesoLogrosRepository = Depends(get_repo),
):
    """
    Finaliza el F05: valida que los 20 ítems sean SI,
    genera el PDF de forma síncrona y devuelve la URL.
    El frontend registra el folio en EXP_FOLIO tras llamar a este endpoint.
    """
    logros = await repo.get_by_id(logros_id)
    if not logros:
        raise HTTPException(status_code=404, detail="Registro F05 no encontrado")

    # Las Fases I y II deben estar completas antes de poder finalizar la Fase III
    for fase, total, nombre in [(1, 5, "I"), (2, 10, "II")]:
        if not all(logros.get(f"f{fase}_i{i}") == "SI" for i in range(1, total + 1)):
            raise HTTPException(
                status_code=422,
                detail=f"Debe completar la Fase {nombre} antes de finalizar la Fase III.",
            )

    # Verificar que los 5 ítems de la Fase III estén en SI
    pendientes = [f"ítem {i}" for i in range(1, 6) if logros.get(f"f3_i{i}") != "SI"]
    if pendientes:
        raise HTTPException(
            status_code=422,
            detail=f"Fase III incompleta. Pendientes: {', '.join(pendientes)}",
        )

    # Generar PDF de forma síncrona (no en background)
    from src.infrastructure.services.pdf_generator_f05 import generate_f05_pdf
    nna_data = await _get_nna_data(logros.get("nna_id"))
    filepath  = _get_pdf_path(logros)
    try:
        generate_f05_pdf(logros, nna_data, filepath)
        logger.info(f"PDF F05 final generado: {filepath}")
    except Exception as e:
        logger.error(f"Error generando PDF F05 final {logros_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error al generar el PDF: {e}")

    return {
        "ok": True,
        "logros_id": logros_id,
        "codigo_f05": logros.get("codigo_f05"),
        "pdf_url": f"/api/proceso-logros/{logros_id}/pdf",
    }


@router.post("/nna/{nna_id}/verificar-expediente")
async def verificar_apertura_expediente(nna_id: int):
    """Verifica si el NNA cumple F03+F04+F05 y genera el nro de expediente si aplica."""
    from src.infrastructure.services.expediente_service import trigger_apertura_expediente
    await trigger_apertura_expediente(nna_id)
    return {"ok": True}


@router.put("/{logros_id}")
async def actualizar_logros(
    logros_id: int,
    data: ProcesoLogrosCreate,
    background_tasks: BackgroundTasks,
    repo: OracleProcesoLogrosRepository = Depends(get_repo),
):
    use_case = ProcesoLogrosUseCase(repo)
    existing = await use_case.obtener_por_id(logros_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Registro F05 no encontrado")
    result = await use_case.actualizar(logros_id, data)
    background_tasks.add_task(trigger_f05_pdf_generation, logros_id)
    return result
