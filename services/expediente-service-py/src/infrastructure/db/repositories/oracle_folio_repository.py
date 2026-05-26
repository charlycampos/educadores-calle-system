from typing import Optional
from src.domain.entities.folio import Folio
from src.infrastructure.db.connection import get_pool

_SELECT = """
    SELECT ID, CASO_ID, SEDE_ID, NUMERO_FOLIO, TIPO_DOCUMENTO,
           TITULO, ARCHIVO_URL, HASH_DOCUMENTO, CREADO_POR_ID, FECHA_CREACION
    FROM EXP_FOLIO
"""


def _row_to_folio(row) -> Folio:
    return Folio(
        id=row[0], caso_id=row[1], sede_id=row[2], numero_folio=row[3],
        tipo_documento=row[4], titulo=row[5], archivo_url=row[6],
        hash_documento=row[7], creado_por_id=row[8], fecha_creacion=row[9],
    )


class OracleFolioRepository:

    async def list_by_caso(self, caso_id: int) -> list[Folio]:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    f"{_SELECT} WHERE CASO_ID = :caso ORDER BY NUMERO_FOLIO",
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

    async def create(self, caso_id, sede_id, numero_folio, tipo_documento,
                     titulo, archivo_url, hash_documento, creado_por_id) -> Folio:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                out_id = cur.var(int)
                await cur.execute(
                    """INSERT INTO EXP_FOLIO
                       (CASO_ID, SEDE_ID, NUMERO_FOLIO, TIPO_DOCUMENTO,
                        TITULO, ARCHIVO_URL, HASH_DOCUMENTO, CREADO_POR_ID)
                       VALUES (:caso, :sede, :num, :tipo, :titulo, :url, :hash, :usr)
                       RETURNING ID INTO :out_id""",
                    {
                        "caso": caso_id, "sede": sede_id, "num": numero_folio,
                        "tipo": tipo_documento, "titulo": titulo, "url": archivo_url,
                        "hash": hash_documento, "usr": creado_por_id, "out_id": out_id,
                    },
                )
                await conn.commit()
                new_id = out_id.getvalue()[0]

        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(f"{_SELECT} WHERE ID = :id", {"id": new_id})
                return _row_to_folio(await cur.fetchone())
