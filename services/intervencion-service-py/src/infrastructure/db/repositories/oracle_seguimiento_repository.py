import oracledb
from src.infrastructure.db.connection import get_pool
from src.domain.entities.seguimiento import SeguimientoFamiliarCreate

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
                        ZONA, ENTREVISTADO, PARENTESCO, TELEFONO, LUGAR_SEGUIMIENTO, DIRECCION,
                        HORA, ANTECEDENTES, DESCRIPCION, OBSERVACIONES, NOMBRE_EDUCADOR
                    )
                    VALUES (:1, :2, :3, :4, :5, :6, :7, :8, :9, :10, :11, :12, :13, :14, :15, :16, :17)
                    RETURNING ID, FECHA, CREATED_AT, UPDATED_AT INTO :18, :19, :20, :21
                """
                id_var = cur.var(int)
                fecha_var = cur.var(oracledb.DB_TYPE_TIMESTAMP)
                created_var = cur.var(oracledb.DB_TYPE_TIMESTAMP)
                updated_var = cur.var(oracledb.DB_TYPE_TIMESTAMP)

                await cur.execute(sql, [
                    caso_id, educador_id, data.tema_tratado, data.acuerdos, data.evaluacion, data.proxima_visita,
                    data.zona, data.entrevistado, data.parentesco, data.telefono, data.lugar_seguimiento, data.direccion,
                    data.hora, data.antecedentes, data.descripcion, data.observaciones, data.nombre_educador,
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
