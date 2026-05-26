import oracledb
from src.infrastructure.db.connection import get_pool
from src.domain.entities.diario import DiarioCampoCreate

class OracleDiarioRepository:
    def _row_to_dict(self, row, columns) -> dict:
        return dict(zip(columns, row))

    async def create_diario(self, data: DiarioCampoCreate, educador_id: int) -> dict:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                sql = """
                    INSERT INTO DIARIO_CAMPO (CASO_ID, UBICACION, ACTIVIDAD, ESTADO_FISICO, ESTADO_ANIMO, OBSERVACIONES, CREADO_POR_ID)
                    VALUES (:1, :2, :3, :4, :5, :6, :7)
                    RETURNING ID, FECHA, CREATED_AT, UPDATED_AT INTO :8, :9, :10, :11
                """
                id_var = cur.var(int)
                fecha_var = cur.var(oracledb.DB_TYPE_TIMESTAMP)
                created_var = cur.var(oracledb.DB_TYPE_TIMESTAMP)
                updated_var = cur.var(oracledb.DB_TYPE_TIMESTAMP)

                await cur.execute(sql, [
                    data.caso_id, data.ubicacion, data.actividad, data.estado_fisico, data.estado_animo, data.observaciones, educador_id,
                    id_var, fecha_var, created_var, updated_var
                ])
                await conn.commit()
                
                return {
                    "id": id_var.getvalue()[0],
                    "caso_id": data.caso_id,
                    "ubicacion": data.ubicacion,
                    "actividad": data.actividad,
                    "estado_fisico": data.estado_fisico,
                    "estado_animo": data.estado_animo,
                    "observaciones": data.observaciones,
                    "creado_por_id": educador_id,
                    "fecha": fecha_var.getvalue()[0],
                    "created_at": created_var.getvalue()[0],
                    "updated_at": updated_var.getvalue()[0]
                }

    async def list_by_caso(self, caso_id: int) -> list:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT * FROM DIARIO_CAMPO WHERE CASO_ID = :1 ORDER BY FECHA DESC", [caso_id])
                columns = [col[0].lower() for col in cur.description]
                return [self._row_to_dict(row, columns) for row in await cur.fetchall()]
