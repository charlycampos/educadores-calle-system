from datetime import datetime
from typing import Optional
from src.domain.entities.folio import Folio
from src.infrastructure.db.connection import get_pool

_SELECT = """
    SELECT f.ID, f.CASO_ID, f.SEDE_ID, f.NUMERO_FOLIO, f.TIPO_DOCUMENTO,
           f.TITULO, f.ARCHIVO_URL, f.HASH_DOCUMENTO, f.CREADO_POR_ID, f.FECHA_CREACION,
           u.nombre_completo, f.TALLER_ID, f.PAGINAS
    FROM EXP_FOLIO f
    LEFT JOIN SEC_USUARIO u ON f.CREADO_POR_ID = u.id
"""


def _row_to_folio(row) -> Folio:
    return Folio(
        id=row[0], caso_id=row[1], sede_id=row[2], numero_folio=row[3],
        tipo_documento=row[4], titulo=row[5], archivo_url=row[6],
        hash_documento=row[7], creado_por_id=row[8], fecha_creacion=row[9],
        usuario_responsable=row[10] if len(row) > 10 else None,
        taller_id=row[11] if len(row) > 11 else None,
        paginas=(row[12] if len(row) > 12 and row[12] else 1),
    )


def _codigo_sede(nombre: str) -> str:
    normalizado = (nombre or '').upper().strip()
    codigos = {
        'LIMA': 'LIM', 'SEDE CENTRAL LIMA': 'LIM', 'HUARAL': 'HUA',
        'HUANCAYO': 'HYO', 'JUNÍN': 'HYO', 'JUNIN': 'HYO',
        'AREQUIPA': 'ARE', 'LA LIBERTAD': 'TRU', 'TRUJILLO': 'TRU',
        'LAMBAYEQUE': 'CHI', 'CHICLAYO': 'CHI', 'CAJAMARCA': 'CAJ',
        'JAÉN': 'JAE', 'JAEN': 'JAE', 'PIURA': 'PIU', 'TUMBES': 'TUM',
        'CUSCO': 'CUS', 'PUNO': 'PUN', 'TACNA': 'TAC', 'ICA': 'ICA',
        'AYACUCHO': 'AYA', 'APURÍMAC': 'APU', 'APURIMAC': 'APU',
        'HUÁNUCO': 'HCO', 'HUANUCO': 'HCO', 'ANCASH': 'ANC',
        'LORETO': 'IQU', 'IQUITOS': 'IQU', 'UCAYALI': 'PUC',
        'PUCALLPA': 'PUC', 'HUANCAVELICA': 'HVC', 'MOQUEGUA': 'MOQ',
        'PASCO': 'PAS', 'CALLAO': 'CAL', 'TARAPOTO': 'TAR',
        'CHACHAPOYAS': 'CHA',
    }
    return codigos.get(normalizado, normalizado[:3])


class OracleFolioRepository:

    async def list_by_caso(self, caso_id: int) -> list[Folio]:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    f"{_SELECT} WHERE f.CASO_ID = :caso ORDER BY f.NUMERO_FOLIO",
                    {"caso": caso_id},
                )
                return [_row_to_folio(r) for r in await cur.fetchall()]

    async def get_next_numero_folio(self, caso_id: int) -> int:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "SELECT NVL(MAX(NUMERO_FOLIO), 0) + 1 FROM EXP_FOLIO WHERE CASO_ID = :caso",
                    {"caso": caso_id},
                )
                row = await cur.fetchone()
                return row[0]

    async def list_by_taller(self, taller_id: int) -> list[Folio]:
        """Folios generados por un taller: su evidencia archivada."""
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    f"{_SELECT} WHERE f.TALLER_ID = :taller ORDER BY f.FECHA_CREACION, f.ID",
                    {"taller": taller_id},
                )
                return [_row_to_folio(r) for r in await cur.fetchall()]

    async def create(self, caso_id, sede_id, numero_folio, tipo_documento,
                     titulo, archivo_url, hash_documento, creado_por_id,
                     taller_id=None, paginas=1) -> Folio:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                es_compromiso = "COMPROMISO" in tipo_documento.upper()
                new_id = None

                # El compromiso formaliza una sola vez el caso. Si una respuesta
                # HTTP se perdió, el reintento reutiliza el folio ya persistido.
                if es_compromiso:
                    await cur.execute(
                        """SELECT ID
                             FROM EXP_FOLIO
                            WHERE CASO_ID = :caso
                              AND UPPER(TIPO_DOCUMENTO) LIKE '%COMPROMISO%'
                            ORDER BY ID
                            FETCH FIRST 1 ROWS ONLY""",
                        {"caso": caso_id},
                    )
                    folio_existente = await cur.fetchone()
                    if folio_existente:
                        new_id = folio_existente[0]

                if new_id is None:
                    out_id = cur.var(int)
                    await cur.execute(
                        """INSERT INTO EXP_FOLIO
                           (CASO_ID, SEDE_ID, NUMERO_FOLIO, TIPO_DOCUMENTO,
                            TITULO, ARCHIVO_URL, HASH_DOCUMENTO, CREADO_POR_ID,
                            TALLER_ID, PAGINAS)
                           VALUES (:caso, :sede, :num, :tipo, :titulo, :url, :hash, :usr,
                                   :taller, :paginas)
                           RETURNING ID INTO :out_id""",
                        {
                            "caso": caso_id, "sede": sede_id, "num": numero_folio,
                            "tipo": tipo_documento, "titulo": titulo, "url": archivo_url,
                            "hash": hash_documento, "usr": creado_por_id,
                            "taller": taller_id, "paginas": max(1, int(paginas or 1)),
                            "out_id": out_id,
                        },
                    )
                    new_id = out_id.getvalue()[0]

                # El compromiso formaliza la inscripción en una sola transacción:
                # asigna el F03 (si aún no existe) y promueve el caso.
                if es_compromiso:
                    await cur.execute(
                        """SELECT NNA_ID, SEDE_ID, ESTADO
                             FROM NNA_CASO
                            WHERE ID = :caso
                              FOR UPDATE""",
                        {"caso": caso_id},
                    )
                    caso_row = await cur.fetchone()
                    if not caso_row:
                        raise ValueError(f"No se encontró el caso {caso_id} para formalizar la inscripción.")

                    nna_id, caso_sede_id, estado_caso = caso_row
                    if estado_caso == 'PENDIENTE':
                        await cur.execute(
                            "SELECT CODIGO_FICHA03 FROM NNA WHERE ID = :nna_id FOR UPDATE",
                            {"nna_id": nna_id},
                        )
                        nna_row = await cur.fetchone()
                        if not nna_row:
                            raise ValueError(f"No se encontró el NNA {nna_id} del caso {caso_id}.")

                        if not nna_row[0]:
                            # El bloqueo de la sede serializa la numeración y evita
                            # que dos compromisos obtengan el mismo correlativo.
                            await cur.execute(
                                "SELECT NOMBRE FROM SEC_SEDE WHERE ID = :sede_id FOR UPDATE",
                                {"sede_id": caso_sede_id},
                            )
                            sede_row = await cur.fetchone()
                            if not sede_row:
                                raise ValueError(f"No se encontró la sede {caso_sede_id}.")

                            sede_codigo = _codigo_sede(sede_row[0])
                            anio = datetime.now().year
                            patron = f"F03-{sede_codigo}-{anio}-%"
                            await cur.execute(
                                """SELECT NVL(MAX(TO_NUMBER(REGEXP_SUBSTR(CODIGO_FICHA03, '[0-9]+$'))), 0) + 1
                                     FROM NNA
                                    WHERE CODIGO_FICHA03 LIKE :patron""",
                                {"patron": patron},
                            )
                            correlativo = int((await cur.fetchone())[0])
                            codigo_f03 = f"F03-{sede_codigo}-{anio}-{correlativo:04d}"
                            await cur.execute(
                                """UPDATE NNA
                                      SET CODIGO_FICHA03 = :codigo,
                                          UPDATED_AT = SYSTIMESTAMP
                                    WHERE ID = :nna_id""",
                                {"codigo": codigo_f03, "nna_id": nna_id},
                            )

                        await cur.execute(
                            """UPDATE NNA_CASO
                                  SET ESTADO = 'EN_EVALUACION',
                                      UPDATED_AT = SYSTIMESTAMP
                                WHERE ID = :caso
                                  AND ESTADO = 'PENDIENTE'""",
                            {"caso": caso_id},
                        )
                await conn.commit()

        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(f"{_SELECT} WHERE f.ID = :id", {"id": new_id})
                return _row_to_folio(await cur.fetchone())
