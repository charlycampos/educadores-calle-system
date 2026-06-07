import inspect
from typing import Optional
from datetime import datetime
from src.domain.entities.informe_cierre import InformeCierre
from src.infrastructure.db.connection import get_pool

_SELECT = """
    SELECT ID, CODIGO_INFORME, CASO_ID, MOTIVO_EGRESO, FECHA_EGRESO,
           SITUACION_FAMILIAR, SITUACION_EDUCATIVA, LOGROS_ALCANZADOS,
           RECOMENDACIONES, ARCHIVO_URL, CREADO_POR_ID, CREATED_AT, ESTADO, DETALLES
    FROM EXP_INFORME_CIERRE
"""


async def _row_to_informe(row) -> InformeCierre:
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

    return InformeCierre(
        id=row[0], codigo_informe=row[1], caso_id=row[2], motivo_egreso=row[3],
        fecha_egreso=row[4], situacion_familiar=row[5], situacion_educativa=row[6],
        logros_alcanzados=row[7], recomendaciones=row[8], archivo_url=row[9],
        creado_por_id=row[10], created_at=row[11], estado=row[12],
        detalles=await read_clob(row[13])
    )


class OracleInformeRepository:

    async def find_by_caso(self, caso_id: int) -> Optional[InformeCierre]:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(f"{_SELECT} WHERE CASO_ID = :caso", {"caso": caso_id})
                row = await cur.fetchone()
                return await _row_to_informe(row) if row else None

    async def get_sede_codigo(self, sede_id: int) -> str:
        if not sede_id:
            raise ValueError("La cuenta no tiene sede asignada. No se puede generar el código del informe de cierre.")
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT NOMBRE FROM SEC_SEDE WHERE ID = :sede_id", {"sede_id": sede_id})
                row = await cur.fetchone()
                if not row:
                    raise ValueError(f"No se encontró la sede con ID {sede_id} en la base de datos.")
                nombre = row[0]
                nom = nombre.upper().strip()
                mapping = {
                    "LIMA": "LIM",
                    "SEDE CENTRAL LIMA": "LIM",
                    "HUARAL": "HUA",
                    "HUANCAYO": "HYO",
                    "JUNÍN": "HYO",
                    "JUNIN": "HYO",
                    "AREQUIPA": "ARE",
                    "LA LIBERTAD": "TRU",
                    "TRUJILLO": "TRU",
                    "LAMBAYEQUE": "CHI",
                    "CHICLAYO": "CHI",
                    "CAJAMARCA": "CAJ",
                    "JAÉN": "JAE",
                    "JAEN": "JAE",
                    "PIURA": "PIU",
                    "TUMBES": "TUM",
                    "CUSCO": "CUS",
                    "PUNO": "PUN",
                    "TACNA": "TAC",
                    "ICA": "ICA",
                    "AYACUCHO": "AYA",
                    "APURÍMAC": "APU",
                    "APURIMAC": "APU",
                    "HUÁNUCO": "HCO",
                    "HUANUCO": "HCO",
                    "ANCASH": "ANC",
                    "LORETO": "IQU",
                    "IQUITOS": "IQU",
                    "UCAYALI": "PUC",
                    "PUCALLPA": "PUC",
                    "HUANCAVELICA": "HVC",
                    "MOQUEGUA": "MOQ",
                    "PASCO": "PAS",
                    "CALLAO": "CAL",
                    "TARAPOTO": "TAR",
                    "CHACHAPOYAS": "CHA"
                }
                return mapping.get(nom, nom[:3])

    async def get_next_correlativo(self, anio: int, sede_id: int) -> int:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "SELECT COUNT(*) FROM EXP_INFORME_CIERRE r "
                    "JOIN NNA_CASO c ON c.ID = r.CASO_ID "
                    "WHERE EXTRACT(YEAR FROM r.CREATED_AT) = :anio AND c.SEDE_ID = :sede_id",
                    {"anio": anio, "sede_id": sede_id},
                )
                row = await cur.fetchone()
                return (row[0] or 0) + 1

    async def create(self, caso_id, codigo_informe, motivo_egreso, fecha_egreso,
                     situacion_familiar, situacion_educativa, logros_alcanzados,
                     recomendaciones, archivo_url, creado_por_id, estado: str = "FINALIZADO", detalles: Optional[str] = None) -> InformeCierre:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                out_id = cur.var(int)
                await cur.execute(
                    """INSERT INTO EXP_INFORME_CIERRE
                       (CASO_ID, CODIGO_INFORME, MOTIVO_EGRESO, FECHA_EGRESO,
                        SITUACION_FAMILIAR, SITUACION_EDUCATIVA, LOGROS_ALCANZADOS,
                        RECOMENDACIONES, ARCHIVO_URL, CREADO_POR_ID, ESTADO, DETALLES)
                       VALUES (:caso, :codigo, :motivo, :fecha, :fam, :edu,
                               :logros, :recom, :url, :usr, :estado, :detalles)
                       RETURNING ID INTO :out_id""",
                    {
                        "caso": caso_id, "codigo": codigo_informe,
                        "motivo": motivo_egreso, "fecha": fecha_egreso,
                        "fam": situacion_familiar, "edu": situacion_educativa,
                        "logros": logros_alcanzados, "recom": recomendaciones,
                        "url": archivo_url, "usr": creado_por_id, "estado": estado,
                        "detalles": detalles, "out_id": out_id,
                    },
                )
                await conn.commit()
                new_id = out_id.getvalue()[0]

        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(f"{_SELECT} WHERE ID = :id", {"id": new_id})
                return await _row_to_informe(await cur.fetchone())

    async def update(self, id: int, motivo_egreso, fecha_egreso,
                    situacion_familiar, situacion_educativa, logros_alcanzados,
                    recomendaciones, archivo_url, estado, detalles: Optional[str] = None) -> InformeCierre:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "UPDATE EXP_INFORME_CIERRE SET MOTIVO_EGRESO = :1, FECHA_EGRESO = :2, "
                    "SITUACION_FAMILIAR = :3, SITUACION_EDUCATIVA = :4, LOGROS_ALCANZADOS = :5, "
                    "RECOMENDACIONES = :6, ARCHIVO_URL = :7, ESTADO = :8, DETALLES = :9, UPDATED_AT = SYSTIMESTAMP "
                    "WHERE ID = :10",
                    [
                        motivo_egreso, fecha_egreso, situacion_familiar,
                        situacion_educativa, logros_alcanzados, recomendaciones,
                        archivo_url, estado, detalles, id
                    ]
                )
                await conn.commit()

        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(f"{_SELECT} WHERE ID = :id", {"id": id})
                return await _row_to_informe(await cur.fetchone())

