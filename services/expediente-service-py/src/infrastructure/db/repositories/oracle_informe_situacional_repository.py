import inspect
from typing import Optional
from datetime import datetime
from src.domain.entities.informe_situacional import InformeSituacional
from src.infrastructure.db.connection import get_pool

_SELECT = """
    SELECT ID, CASO_ID, FECHA_INFORME, DESTINATARIO, ASUNTO, ANTECEDENTES, ESTRATEGIAS,
           SITUACION_SALUD, SITUACION_EDUCATIVA, SITUACION_FAMILIAR,
           CONCLUSIONES, RECOMENDACIONES, CREADO_POR_ID, CREATED_AT, ESTADO, UPDATED_AT,
           CODIGO_INFORME
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
        updated_at=row[15],
        codigo_informe=row[16] if len(row) > 16 else None
    )


class OracleInformeSituacionalRepository:

    async def find_by_caso(self, caso_id: int) -> Optional[InformeSituacional]:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(f"{_SELECT} WHERE CASO_ID = :caso", {"caso": caso_id})
                row = await cur.fetchone()
                return await _row_to_informe(row) if row else None

    async def get_sede_codigo(self, sede_id: int) -> str:
        if not sede_id:
            raise ValueError("La cuenta no tiene sede asignada. No se puede generar el código del informe.")
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
                    "SELECT COUNT(*) FROM EXP_INFORME_SITUACIONAL r "
                    "JOIN NNA_CASO c ON c.ID = r.CASO_ID "
                    "WHERE EXTRACT(YEAR FROM r.CREATED_AT) = :anio AND c.SEDE_ID = :sede_id",
                    {"anio": anio, "sede_id": sede_id},
                )
                row = await cur.fetchone()
                return (row[0] or 0) + 1

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
                    await cur.execute("SELECT SEDE_ID FROM NNA_CASO WHERE ID = :caso", {"caso": caso_id})
                    sede_row = await cur.fetchone()
                    sede_id = sede_row[0] if sede_row else None
                    sede_codigo = await self.get_sede_codigo(sede_id)
                    anio = datetime.now().year
                    correlativo = await self.get_next_correlativo(anio, sede_id)
                    codigo_informe = f"F09-{sede_codigo}-{anio}-{str(correlativo).zfill(4)}"

                    await cur.execute(
                        """INSERT INTO EXP_INFORME_SITUACIONAL
                           (CASO_ID, FECHA_INFORME, DESTINATARIO, ASUNTO, ANTECEDENTES, ESTRATEGIAS,
                            SITUACION_SALUD, SITUACION_EDUCATIVA, SITUACION_FAMILIAR,
                            CONCLUSIONES, RECOMENDACIONES, CREADO_POR_ID, ESTADO, CODIGO_INFORME)
                           VALUES (:caso, :fecha, :dest, :asunto, :antec, :estrat,
                                   :salud, :edu, :fam, :concl, :recom, :usr, :estado, :codigo)""",
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
                            "estado": estado,
                            "codigo": codigo_informe
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
