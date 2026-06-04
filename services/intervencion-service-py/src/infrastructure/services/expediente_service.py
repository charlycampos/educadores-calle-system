"""
Servicio para apertura automática del expediente digital.

Según el Modelo Operacional Actividad 5004954 (Fase II — Abordaje):
"Abrir el expediente del NNA (DNI del NNA y referente familiar, Formatos 3, 4 y 5)"

El número de expediente se genera automáticamente cuando se cumplen las 3 condiciones:
  1. F03 finalizada  → NNA.CODIGO_FICHA03 no es null
  2. F04 creada      → existe al menos 1 registro en DIAGNOSTICO_SOCIAL para el NNA
  3. F05 creada      → existe al menos 1 registro en PROCESO_LOGROS para el NNA
"""
import logging

logger = logging.getLogger("expediente_service")


async def _intentar_abrir_expediente(nna_id: int) -> None:
    from src.infrastructure.db.connection import get_pool
    pool = get_pool()
    logger.info(f"[EXPEDIENTE] Iniciando verificación para NNA {nna_id}")

    async with pool.acquire() as conn:

        # 1. F03
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT CARPETA_ID, CODIGO_FICHA03 FROM NNA WHERE ID = :1", [nna_id]
            )
            row = await cur.fetchone()
        if not row:
            logger.info(f"[EXPEDIENTE] NNA {nna_id} no encontrado"); return
        carpeta_id, codigo_f03 = row[0], row[1]
        if not codigo_f03:
            logger.info(f"[EXPEDIENTE] NNA {nna_id} sin F03 finalizado"); return
        if not carpeta_id:
            logger.info(f"[EXPEDIENTE] NNA {nna_id} sin carpeta"); return
        logger.info(f"[EXPEDIENTE] F03 OK — carpeta_id={carpeta_id}, codigo_f03={codigo_f03}")

        # 2. Carpeta sin código aún
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT CODIGO, CORRELATIVO, ANIO, SEDE_ID FROM NNA_CARPETA WHERE ID = :1", [carpeta_id]
            )
            carpeta_row = await cur.fetchone()
        if not carpeta_row:
            logger.info(f"[EXPEDIENTE] Carpeta {carpeta_id} no encontrada"); return
        codigo_actual, correlativo, anio, sede_id = carpeta_row
        if codigo_actual:
            logger.info(f"[EXPEDIENTE] Carpeta {carpeta_id} ya tiene código: {codigo_actual}"); return
        logger.info(f"[EXPEDIENTE] Carpeta {carpeta_id} sin código aún")

        # 3. F04
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT COUNT(1) FROM DIAGNOSTICO_SOCIAL WHERE NNA_ID = :1", [nna_id]
            )
            count_f04 = (await cur.fetchone())[0]
        if count_f04 == 0:
            logger.info(f"[EXPEDIENTE] NNA {nna_id} sin F04"); return
        logger.info(f"[EXPEDIENTE] F04 OK — {count_f04} registro(s)")

        # 4. F05
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT COUNT(1) FROM PROCESO_LOGROS WHERE NNA_ID = :1", [nna_id]
            )
            count_f05 = (await cur.fetchone())[0]
        if count_f05 == 0:
            logger.info(f"[EXPEDIENTE] NNA {nna_id} sin F05"); return
        logger.info(f"[EXPEDIENTE] F05 OK — {count_f05} registro(s)")

        # 5. Generar código
        sede_name = "DESCONOCIDO"
        if sede_id:
            async with conn.cursor() as cur:
                await cur.execute("SELECT NOMBRE FROM SEC_SEDE WHERE ID = :1", [sede_id])
                sede_row = await cur.fetchone()
            if sede_row and sede_row[0]:
                sede_name = str(sede_row[0]).upper().strip()

        # Calcular el número correlativo real de apertura (los abiertos este año + 1)
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT COUNT(1) FROM NNA_CARPETA WHERE ANIO = :1 AND CODIGO IS NOT NULL",
                [anio],
            )
            nro_expediente = (await cur.fetchone())[0] + 1

        codigo = f"{str(nro_expediente).zfill(5)}-{anio}-SEC.{sede_name}"
        logger.info(f"[EXPEDIENTE] Generando código: {codigo}")

        async with conn.cursor() as cur:
            await cur.execute(
                "UPDATE NNA_CARPETA SET CODIGO = :1, CORRELATIVO = :2, UPDATED_AT = SYSTIMESTAMP WHERE ID = :3",
                [codigo, nro_expediente, carpeta_id],
            )
            await conn.commit()
        logger.info(f"[EXPEDIENTE] ✓ NNA {nna_id} → carpeta {carpeta_id} → {codigo} (correlativo: {nro_expediente})")


async def trigger_apertura_expediente(nna_id: int) -> None:
    """Async — FastAPI la awaita directamente en el event loop principal."""
    try:
        await _intentar_abrir_expediente(nna_id)
    except Exception as e:
        logger.error(f"Error al intentar abrir expediente NNA {nna_id}: {e}", exc_info=True)
