import inspect
from typing import Optional
from datetime import datetime
from src.domain.entities.informe_situacional import InformeSituacional
from src.infrastructure.db.connection import get_pool

_SELECT = """
    SELECT ID, CASO_ID, FECHA_INFORME, DESTINATARIO, ASUNTO, ANTECEDENTES, ESTRATEGIAS,
           SITUACION_SALUD, SITUACION_EDUCATIVA, SITUACION_FAMILIAR,
           CONCLUSIONES, RECOMENDACIONES, CREADO_POR_ID, CREATED_AT, ESTADO, UPDATED_AT
    FROM EXP_INFORME_SITUACIONAL
"""


async def _row_to_informe(row) -> InformeSituacional:
    # CLOB reading helper
    async def read_clob(val):
        if val is None:
            return None
        if hasattr(val, "read"):
            res = val.read()
            if inspect.isawaitable(res):
                return await res
            return res
        return val

    return InformeSituacional(
        id=row[0],
        caso_id=row[1],
        fecha_informe=row[2],
        destinatario=row[3],
        asunto=row[4],
        antecedentes=await read_clob(row[5]),
        estrategias=await read_clob(row[6]),
        situacion_salud=await read_clob(row[7]),
        situacion_educativa=await read_clob(row[8]),
        situacion_familiar=await read_clob(row[9]),
        conclusiones=await read_clob(row[10]),
        recomendaciones=await read_clob(row[11]),
        creado_por_id=row[12],
        created_at=row[13],
        estado=row[14] or 'BORRADOR',
        updated_at=row[15]
    )


class OracleInformeSituacionalRepository:

    async def find_by_caso(self, caso_id: int) -> Optional[InformeSituacional]:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(f"{_SELECT} WHERE CASO_ID = :caso", {"caso": caso_id})
                row = await cur.fetchone()
                return await _row_to_informe(row) if row else None

    async def save(self, caso_id: int, data: dict, creado_por_id: int) -> InformeSituacional:
        pool = get_pool()
        fecha_inf = data.get("fecha_informe")
        if isinstance(fecha_inf, str):
            fecha_inf = datetime.strptime(fecha_inf[:10], "%Y-%m-%d")
        elif not fecha_inf:
            fecha_inf = datetime.now()

        existing = await self.find_by_caso(caso_id)
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                estado = data.get("estado", "BORRADOR")
                if existing:
                    await cur.execute(
                        """UPDATE EXP_INFORME_SITUACIONAL
                           SET FECHA_INFORME = :fecha,
                               DESTINATARIO = :dest,
                               ASUNTO = :asunto,
                               ANTECEDENTES = :antec,
                               ESTRATEGIAS = :estrat,
                               SITUACION_SALUD = :salud,
                               SITUACION_EDUCATIVA = :edu,
                               SITUACION_FAMILIAR = :fam,
                               CONCLUSIONES = :concl,
                               RECOMENDACIONES = :recom,
                               ESTADO = :estado,
                               UPDATED_AT = SYSTIMESTAMP
                           WHERE CASO_ID = :caso""",
                        {
                            "fecha": fecha_inf,
                            "dest": data.get("destinatario"),
                            "asunto": data.get("asunto"),
                            "antec": data.get("antecedentes"),
                            "estrat": data.get("estrategias"),
                            "salud": data.get("situacion_salud"),
                            "edu": data.get("situacion_educativa"),
                            "fam": data.get("situacion_familiar"),
                            "concl": data.get("conclusiones"),
                            "recom": data.get("recomendaciones"),
                            "estado": estado,
                            "caso": caso_id
                        }
                    )
                else:
                    await cur.execute(
                        """INSERT INTO EXP_INFORME_SITUACIONAL
                           (CASO_ID, FECHA_INFORME, DESTINATARIO, ASUNTO, ANTECEDENTES, ESTRATEGIAS,
                            SITUACION_SALUD, SITUACION_EDUCATIVA, SITUACION_FAMILIAR,
                            CONCLUSIONES, RECOMENDACIONES, CREADO_POR_ID, ESTADO)
                           VALUES (:caso, :fecha, :dest, :asunto, :antec, :estrat,
                                   :salud, :edu, :fam, :concl, :recom, :usr, :estado)""",
                        {
                            "caso": caso_id,
                            "fecha": fecha_inf,
                            "dest": data.get("destinatario"),
                            "asunto": data.get("asunto"),
                            "antec": data.get("antecedentes"),
                            "estrat": data.get("estrategias"),
                            "salud": data.get("situacion_salud"),
                            "edu": data.get("situacion_educativa"),
                            "fam": data.get("situacion_familiar"),
                            "concl": data.get("conclusiones"),
                            "recom": data.get("recomendaciones"),
                            "usr": creado_por_id,
                            "estado": estado
                        }
                    )
                await conn.commit()

        return await self.find_by_caso(caso_id)

    async def delete(self, caso_id: int) -> bool:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("DELETE FROM EXP_INFORME_SITUACIONAL WHERE CASO_ID = :caso", {"caso": caso_id})
                deleted = cur.rowcount > 0
                await cur.execute("DELETE FROM EXP_FOLIO WHERE CASO_ID = :caso AND TIPO_DOCUMENTO IN ('F09', 'INFORME_SITUACIONAL')", {"caso": caso_id})
                await conn.commit()
                return deleted

    async def get_nna_by_caso(self, caso_id: int) -> dict:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """SELECT n.NOMBRES, n.APELLIDO_PATERNO, n.APELLIDO_MATERNO, n.NUMERO_DOC, n.SEXO, n.FECHA_NACIMIENTO
                       FROM NNA n
                       JOIN NNA_CASO c ON n.ID = c.NNA_ID
                       WHERE c.ID = :caso""",
                    {"caso": caso_id}
                )
                row = await cur.fetchone()
                if row:
                    return {
                        "nombres": row[0],
                        "apellido_paterno": row[1],
                        "apellido_materno": row[2] or "",
                        "numero_doc": row[3] or "S/D",
                        "sexo": row[4] or "",
                        "fecha_nacimiento": row[5]
                    }
                return {}
