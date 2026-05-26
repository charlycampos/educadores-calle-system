from typing import Optional
from datetime import datetime
from src.domain.entities.informe_cierre import InformeCierre
from src.infrastructure.db.connection import get_pool

_SELECT = """
    SELECT ID, CODIGO_INFORME, CASO_ID, MOTIVO_EGRESO, FECHA_EGRESO,
           SITUACION_FAMILIAR, SITUACION_EDUCATIVA, LOGROS_ALCANZADOS,
           RECOMENDACIONES, ARCHIVO_URL, CREADO_POR_ID, CREATED_AT
    FROM EXP_INFORME_CIERRE
"""


def _row_to_informe(row) -> InformeCierre:
    return InformeCierre(
        id=row[0], codigo_informe=row[1], caso_id=row[2], motivo_egreso=row[3],
        fecha_egreso=row[4], situacion_familiar=row[5], situacion_educativa=row[6],
        logros_alcanzados=row[7], recomendaciones=row[8], archivo_url=row[9],
        creado_por_id=row[10], created_at=row[11],
    )


class OracleInformeRepository:

    async def find_by_caso(self, caso_id: int) -> Optional[InformeCierre]:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(f"{_SELECT} WHERE CASO_ID = :caso", {"caso": caso_id})
                row = await cur.fetchone()
                return _row_to_informe(row) if row else None

    async def get_next_correlativo(self, anio: int) -> int:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "SELECT NVL(MAX(ID), 0) + 1 FROM EXP_INFORME_CIERRE "
                    "WHERE EXTRACT(YEAR FROM CREATED_AT) = :anio",
                    {"anio": anio},
                )
                row = await cur.fetchone()
                return row[0]

    async def create(self, caso_id, codigo_informe, motivo_egreso, fecha_egreso,
                     situacion_familiar, situacion_educativa, logros_alcanzados,
                     recomendaciones, archivo_url, creado_por_id) -> InformeCierre:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                out_id = cur.var(int)
                await cur.execute(
                    """INSERT INTO EXP_INFORME_CIERRE
                       (CASO_ID, CODIGO_INFORME, MOTIVO_EGRESO, FECHA_EGRESO,
                        SITUACION_FAMILIAR, SITUACION_EDUCATIVA, LOGROS_ALCANZADOS,
                        RECOMENDACIONES, ARCHIVO_URL, CREADO_POR_ID)
                       VALUES (:caso, :codigo, :motivo, :fecha, :fam, :edu,
                               :logros, :recom, :url, :usr)
                       RETURNING ID INTO :out_id""",
                    {
                        "caso": caso_id, "codigo": codigo_informe,
                        "motivo": motivo_egreso, "fecha": fecha_egreso,
                        "fam": situacion_familiar, "edu": situacion_educativa,
                        "logros": logros_alcanzados, "recom": recomendaciones,
                        "url": archivo_url, "usr": creado_por_id, "out_id": out_id,
                    },
                )
                await conn.commit()
                new_id = out_id.getvalue()[0]

        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(f"{_SELECT} WHERE ID = :id", {"id": new_id})
                return _row_to_informe(await cur.fetchone())
