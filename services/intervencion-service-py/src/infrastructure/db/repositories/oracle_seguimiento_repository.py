import oracledb
from src.infrastructure.db.connection import get_pool
from src.domain.entities.seguimiento import SeguimientoFamiliarCreate, SeguimientoFamiliarUpdate

class OracleSeguimientoRepository:
    def _row_to_dict(self, row, columns) -> dict:
        return dict(zip(columns, row))

    async def create_seguimiento(self, caso_id: int, data: SeguimientoFamiliarCreate, educador_id: int) -> dict:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                sql = """
                    INSERT INTO SEGUIMIENTO_FAMILIAR (
                        CASO_ID, EDUCADOR_ID, TEMA_TRATADO, ACUERDOS, EVALUACION, PROXIMA_VISITA,
                        FECHA_TERMINO, ZONA, ENTREVISTADO, PARENTESCO, TELEFONO, LUGAR_SEGUIMIENTO,
                        DIRECCION, HORA, ANTECEDENTES, DESCRIPCION, OBSERVACIONES, NOMBRE_EDUCADOR,
                        ESTADO
                    )
                    VALUES (:1, :2, :3, :4, :5, :6, :7, :8, :9, :10, :11, :12, :13, :14, :15, :16, :17, :18, :19)
                    RETURNING ID, FECHA, CREATED_AT, UPDATED_AT INTO :20, :21, :22, :23
                """
                id_var = cur.var(int)
                fecha_var = cur.var(oracledb.DB_TYPE_TIMESTAMP)
                created_var = cur.var(oracledb.DB_TYPE_TIMESTAMP)
                updated_var = cur.var(oracledb.DB_TYPE_TIMESTAMP)

                await cur.execute(sql, [
                    caso_id, educador_id, data.tema_tratado, data.acuerdos, data.evaluacion,
                    data.proxima_visita, data.fecha_termino,
                    data.zona, data.entrevistado, data.parentesco, data.telefono,
                    data.lugar_seguimiento, data.direccion, data.hora, data.antecedentes,
                    data.descripcion, data.observaciones, data.nombre_educador,
                    data.estado or "FINALIZADA",
                    id_var, fecha_var, created_var, updated_var
                ])
                await conn.commit()

                return {
                    "id": id_var.getvalue()[0],
                    "caso_id": caso_id,
                    "educador_id": educador_id,
                    "tema_tratado": data.tema_tratado,
                    "acuerdos": data.acuerdos,
                    "evaluacion": data.evaluacion,
                    "proxima_visita": data.proxima_visita,
                    "fecha_termino": data.fecha_termino,
                    "zona": data.zona,
                    "entrevistado": data.entrevistado,
                    "parentesco": data.parentesco,
                    "telefono": data.telefono,
                    "lugar_seguimiento": data.lugar_seguimiento,
                    "direccion": data.direccion,
                    "hora": data.hora,
                    "antecedentes": data.antecedentes,
                    "descripcion": data.descripcion,
                    "observaciones": data.observaciones,
                    "nombre_educador": data.nombre_educador,
                    "estado": data.estado or "FINALIZADA",
                    "fecha": fecha_var.getvalue()[0],
                    "created_at": created_var.getvalue()[0],
                    "updated_at": updated_var.getvalue()[0]
                }

    async def update_seguimiento(self, seguimiento_id: int, data: SeguimientoFamiliarUpdate) -> dict:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                sql = """
                    UPDATE SEGUIMIENTO_FAMILIAR SET
                        TEMA_TRATADO = :1, ACUERDOS = :2, EVALUACION = :3,
                        PROXIMA_VISITA = :4, FECHA_TERMINO = :5, ZONA = :6,
                        ENTREVISTADO = :7, PARENTESCO = :8, TELEFONO = :9,
                        LUGAR_SEGUIMIENTO = :10, DIRECCION = :11, HORA = :12,
                        ANTECEDENTES = :13, DESCRIPCION = :14, OBSERVACIONES = :15,
                        NOMBRE_EDUCADOR = :16, ESTADO = :17, UPDATED_AT = SYSTIMESTAMP
                    WHERE ID = :18
                    RETURNING CASO_ID, EDUCADOR_ID, FECHA, CREATED_AT, UPDATED_AT
                        INTO :19, :20, :21, :22, :23
                """
                caso_var    = cur.var(int)
                educ_var    = cur.var(int)
                fecha_var   = cur.var(oracledb.DB_TYPE_TIMESTAMP)
                created_var = cur.var(oracledb.DB_TYPE_TIMESTAMP)
                updated_var = cur.var(oracledb.DB_TYPE_TIMESTAMP)

                await cur.execute(sql, [
                    data.tema_tratado, data.acuerdos, data.evaluacion,
                    data.proxima_visita, data.fecha_termino, data.zona,
                    data.entrevistado, data.parentesco, data.telefono,
                    data.lugar_seguimiento, data.direccion, data.hora,
                    data.antecedentes, data.descripcion, data.observaciones,
                    data.nombre_educador, data.estado or "FINALIZADA", seguimiento_id,
                    caso_var, educ_var, fecha_var, created_var, updated_var
                ])
                await conn.commit()

                return {
                    "id": seguimiento_id,
                    "caso_id": caso_var.getvalue()[0],
                    "educador_id": educ_var.getvalue()[0],
                    "tema_tratado": data.tema_tratado,
                    "acuerdos": data.acuerdos,
                    "evaluacion": data.evaluacion,
                    "proxima_visita": data.proxima_visita,
                    "fecha_termino": data.fecha_termino,
                    "zona": data.zona,
                    "entrevistado": data.entrevistado,
                    "parentesco": data.parentesco,
                    "telefono": data.telefono,
                    "lugar_seguimiento": data.lugar_seguimiento,
                    "direccion": data.direccion,
                    "hora": data.hora,
                    "antecedentes": data.antecedentes,
                    "descripcion": data.descripcion,
                    "observaciones": data.observaciones,
                    "nombre_educador": data.nombre_educador,
                    "estado": data.estado or "FINALIZADA",
                    "fecha": fecha_var.getvalue()[0],
                    "created_at": created_var.getvalue()[0],
                    "updated_at": updated_var.getvalue()[0]
                }

    async def list_by_caso(self, caso_id: int) -> list:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT * FROM SEGUIMIENTO_FAMILIAR WHERE CASO_ID = :1 ORDER BY FECHA DESC", [caso_id])
                columns = [col[0].lower() for col in cur.description]
                return [self._row_to_dict(row, columns) for row in await cur.fetchall()]

    async def get_by_id(self, seguimiento_id: int) -> dict | None:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """SELECT sf.*, c.NNA_ID
                       FROM SEGUIMIENTO_FAMILIAR sf
                       JOIN NNA_CASO c ON sf.CASO_ID = c.ID
                       WHERE sf.ID = :1""",
                    [seguimiento_id],
                )
                row = await cur.fetchone()
                if not row:
                    return None
                columns = [col[0].lower() for col in cur.description]
                return self._row_to_dict(row, columns)
