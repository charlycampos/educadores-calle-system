from typing import Optional

from src.domain.entities.sede import Sede
from src.domain.repositories.i_sede_repository import ISedeRepository
from src.infrastructure.db.connection import get_pool

_SELECT = """
    SELECT
        ID           AS id,
        CODIGO       AS codigo,
        NOMBRE       AS nombre,
        REGION_ID    AS region_id,
        REGION       AS region,
        DEPARTAMENTO AS departamento,
        PROVINCIA    AS provincia,
        DIRECCION    AS direccion,
        TELEFONO     AS telefono,
        ACTIVO       AS activo
    FROM SEC_SEDE
"""


def _row_to_sede(row) -> Sede:
    return Sede(
        id=row[0],
        codigo=row[1],
        nombre=row[2],
        region_id=row[3],
        region=row[4],
        departamento=row[5],
        provincia=row[6],
        direccion=row[7],
        telefono=row[8],
        activo=row[9],
    )


class OracleSedeRepository(ISedeRepository):

    async def find_all_active(self) -> list[Sede]:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    f"{_SELECT} WHERE ACTIVO = 1 ORDER BY NOMBRE"
                )
                rows = await cur.fetchall()
                return [_row_to_sede(r) for r in rows]

    async def find_by_id(self, sede_id: int) -> Optional[Sede]:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    f"{_SELECT} WHERE ID = :sede_id",
                    {"sede_id": sede_id},
                )
                row = await cur.fetchone()
                return _row_to_sede(row) if row else None

    async def find_by_codigo(self, codigo: str) -> Optional[Sede]:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    f"{_SELECT} WHERE CODIGO = :codigo",
                    {"codigo": codigo},
                )
                row = await cur.fetchone()
                return _row_to_sede(row) if row else None
