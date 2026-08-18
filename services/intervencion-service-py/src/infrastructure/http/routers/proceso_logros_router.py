import logging
import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from src.domain.entities.proceso_logros import ProcesoLogrosCreate
from src.infrastructure.db.repositories.oracle_proceso_logros_repository import OracleProcesoLogrosRepository
from src.infrastructure.db.repositories.oracle_caso_fase_repository import OracleCasoFaseRepository
from src.infrastructure.http.middleware.jwt_middleware import get_current_user
from src.domain.use_cases.proceso_logros_use_case import ProcesoLogrosUseCase
from src.domain import fases as cat

logger = logging.getLogger("proceso_logros_router")

router = APIRouter(prefix="/api/proceso-logros", tags=["Proceso de Logros F05"])


def get_repo():
    return OracleProcesoLogrosRepository()


def get_fase_repo():
    return OracleCasoFaseRepository()


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
    fase_repo: OracleCasoFaseRepository = Depends(get_fase_repo),
    current_user: dict = Depends(get_current_user),
):
    """
    Cierra una fase del F05 (1, 2 ó 3), promueve el caso a la siguiente fase,
    genera su PDF parcial y devuelve la URL.
    El frontend registra el folio en EXP_FOLIO tras llamar a este endpoint.

    Este es el ÚNICO punto del sistema donde un caso avanza de fase. El
    educador da un clic y el resto ocurre solo: se sella la fecha de término,
    se abre la siguiente fase al día siguiente, se actualiza NNA_CASO.FASE y
    queda el rastro en NNA_HISTORIAL_ESTADO. No hay ningún campo "fase" que
    alguien tenga que llenar a mano.

    Lo automático es el registro y el cálculo, nunca la decisión: ningún plazo
    vencido promueve a nadie. Cuando una fase pasa su límite, aparece como
    alerta en el tablero y ahí se queda hasta que un educador la cierre.

    El cierre NO exige que los indicadores estén cumplidos. Acuerdo con los
    educadores (reunión SEC 05/08/2026, Luis Gutiérrez):

        "No necesariamente todo tiene que cumplirse para pasar. Porque hay
         chicos que en la segunda fase los ponemos a estudiar, le matriculamos,
         pero por su falta de interés ya no van. Entonces, si se tiene que
         cumplir todos, entonces nunca pasaremos de fase."

    Un 'NO' o un 'EN PROCESO' son evaluaciones válidas, no fallos que retengan
    al NNA. Solo se exige haber evaluado al menos un indicador, para no archivar
    en el expediente una ficha completamente vacía.
    """
    if fase_num not in (1, 2, 3):
        raise HTTPException(status_code=400, detail="Número de fase inválido. Debe ser 1, 2 ó 3.")

    logros = await repo.get_by_id(logros_id)
    if not logros:
        raise HTTPException(status_code=404, detail="Registro F05 no encontrado")

    FASE_CONFIG = {1: (5, "I"), 2: (10, "II"), 3: (5, "III")}

    # No hay dependencia entre fases: cada una se cierra por su cuenta. El
    # sistema no impone la secuencia — el educador evalúa y cierra la fase
    # que corresponda según el momento del caso.

    total, label = FASE_CONFIG[fase_num]
    evaluados = [
        i for i in range(1, total + 1)
        if logros.get(f"f{fase_num}_i{i}") in ("SI", "NO", "PROCESO")
    ]
    if not evaluados:
        raise HTTPException(
            status_code=422,
            detail=f"Marca al menos un indicador de la Fase {label} para poder cerrarla.",
        )

    # ── 1. Sellar el dato ANTES de generar el PDF ──────────────────────────
    # El orden importa: reportlab es frágil y si aborta, el avance de fase no
    # debe perderse. Antes se generaba el PDF y no se escribía nada, así que
    # una fase cerrada solo dejaba rastro en el nombre de un archivo.
    from datetime import date
    fecha_fin = date.today()
    caso_id = logros.get("caso_id")

    try:
        await repo.sellar_fin_fase(logros_id, fase_num, fecha_fin)
        if caso_id:
            await fase_repo.cerrar_y_promover(
                caso_id=caso_id,
                fase=cat.desde_numero(fase_num),
                fecha_fin=fecha_fin,
                cerrada_por_id=current_user.get("userId"),
            )
        else:
            # Un F05 sin caso_id es un dato viejo. Se registra la fecha igual
            # y se avisa: sin caso no hay a quién promover.
            logger.warning(f"F05 id={logros_id} sin caso_id: no se promovió la fase")
    except Exception as e:
        logger.error(f"Error al cerrar la fase {fase_num} del F05 id={logros_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"No se pudo registrar el cierre de la Fase {label}: {e}")

    # ── 2. Generar el PDF ──────────────────────────────────────────────────
    # Se relee la ficha para que el PDF salga con la fecha de término recién
    # sellada; si no, el documento archivado quedaría sin ella.
    from src.infrastructure.services.pdf_generator_f05 import generate_f05_fase_pdf
    logros = await repo.get_by_id(logros_id)
    nna_data = await _get_nna_data(logros.get("nna_id"))
    filepath = _get_fase_pdf_path(logros, fase_num)
    try:
        generate_f05_fase_pdf(logros, nna_data, fase_num, filepath)
        logger.info(f"PDF F05 Fase {fase_num} generado: {filepath}")
    except Exception as e:
        logger.error(f"Error generando PDF F05 Fase {fase_num} id={logros_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error al generar el PDF de la Fase {label}: {e}")

    siguiente = cat.SIGUIENTE[cat.desde_numero(fase_num)]
    return {
        "ok": True,
        "logros_id": logros_id,
        "fase_num": fase_num,
        "codigo_f05": logros.get("codigo_f05"),
        "pdf_url": f"/api/proceso-logros/{logros_id}/pdf/fase/{fase_num}",
        "fecha_fin": fecha_fin.isoformat(),
        "fase_vigente": siguiente,
        "mensaje": (
            f"Fase {label} cerrada. El caso pasa a la Fase {siguiente}."
            if siguiente else
            f"Fase {label} cerrada. El NNA está listo para el egreso (Ficha F13)."
        ),
    }


# ── Tracking de fases ─────────────────────────────────────────────────────────

@router.get("/caso/{caso_id}/fases")
async def tracking_fases(
    caso_id: int,
    fase_repo: OracleCasoFaseRepository = Depends(get_fase_repo),
    current_user: dict = Depends(get_current_user),
):
    """
    Línea de tiempo de las fases del caso: cuándo empezó cada una, cuánto duró,
    si está vencida y quién la cerró.

    El cálculo de plazos se hace aquí y no en el frontend, para que ninguna
    pantalla vuelva a inventar su propia versión de la fase.
    """
    historial = await fase_repo.historial(caso_id)
    vigente = next((f for f in historial if f["vigente"]), None)
    return {
        "casoId":       caso_id,
        "faseVigente":  vigente,
        "historial":    historial,
        "totalMeses":   sum(cat.PLAZO_MESES.values()),
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
    fase_repo: OracleCasoFaseRepository = Depends(get_fase_repo),
    current_user: dict = Depends(get_current_user),
):
    """
    Finaliza el F05: cierra la Fase III, genera el PDF y devuelve la URL.
    El frontend registra el folio en EXP_FOLIO tras llamar a este endpoint.

    Igual que al cerrar una fase, no se exige que los indicadores estén
    cumplidos: un NO o un EN PROCESO son evaluaciones válidas. Solo se pide
    que las fases previas estén cerradas y que se haya evaluado algo en la III.

    Cerrar la Fase III NO egresa al NNA: el egreso lo declara el F13. El caso
    queda en Fase III y sin fase abierta, listo para la Ficha de Egreso.
    """
    logros = await repo.get_by_id(logros_id)
    if not logros:
        raise HTTPException(status_code=404, detail="Registro F05 no encontrado")

    # Tampoco aquí se exige que las fases anteriores estén cerradas.

    evaluados = [i for i in range(1, 6) if logros.get(f"f3_i{i}") in ("SI", "NO", "PROCESO")]
    if not evaluados:
        raise HTTPException(
            status_code=422,
            detail="Marca al menos un indicador de la Fase III para poder cerrarla.",
        )

    # Sellar la Fase III antes del PDF, igual que en cerrar-fase. Este endpoint
    # es el que usa el botón "Cerrar Fase III y Egresar", así que sin esto
    # F3_FIN quedaba en blanco y el tracking mostraba la Fase III abierta —
    # marcándola como vencida a los 6 meses de un caso ya terminado.
    from datetime import date
    fecha_fin = date.today()
    caso_id = logros.get("caso_id")
    try:
        await repo.sellar_fin_fase(logros_id, 3, fecha_fin)
        if caso_id:
            await fase_repo.cerrar_y_promover(
                caso_id=caso_id, fase="III", fecha_fin=fecha_fin,
                cerrada_por_id=current_user.get("userId"),
            )
    except Exception as e:
        logger.error(f"Error al cerrar la Fase III del F05 id={logros_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"No se pudo registrar el cierre de la Fase III: {e}")

    # Generar PDF de forma síncrona (no en background)
    from src.infrastructure.services.pdf_generator_f05 import generate_f05_pdf
    logros = await repo.get_by_id(logros_id)
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
