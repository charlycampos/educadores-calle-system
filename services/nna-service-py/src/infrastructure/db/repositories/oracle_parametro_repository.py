"""
Repositorio Oracle para la consulta de MAESTRO_PARAMETROS.
"""
from pydantic import BaseModel
from src.infrastructure.db.connection import get_pool

class Parametro(BaseModel):
    id: int
    grupo: str
    codigo: str
    descripcion: str
    orden: int
    estado: int

def _row_to_parametro(row) -> Parametro:
    return Parametro(
        id=row[0],
        grupo=row[1],
        codigo=row[2],
        descripcion=row[3],
        orden=row[4],
        estado=row[5]
    )

class OracleParametroRepository:

    async def list_active_parametros(self) -> list[Parametro]:
        """Devuelve todos los parámetros activos de la base de datos ordenados por grupo y orden."""
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """SELECT ID, GRUPO, CODIGO, DESCRIPCION, ORDEN, ESTADO
                       FROM MAESTRO_PARAMETROS
                       WHERE ESTADO = 1
                       ORDER BY GRUPO ASC, ORDEN ASC"""
                )
                rows = await cur.fetchall()
                return [_row_to_parametro(r) for r in rows]
