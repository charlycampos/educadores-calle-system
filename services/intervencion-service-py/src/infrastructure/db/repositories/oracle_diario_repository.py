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
                    INSERT INTO DIARIO_CAMPO (CASO_ID, UBICACION, ACTIVIDAD, ESTADO_FISICO, ESTADO_ANIMO, OBSERVACIONES, LATITUD, LONGITUD, CREADO_POR_ID)
                    VALUES (:1, :2, :3, :4, :5, :6, :7, :8, :9)
                    RETURNING ID, FECHA, CREATED_AT, UPDATED_AT INTO :10, :11, :12, :13
                """
                id_var = cur.var(int)
                fecha_var = cur.var(oracledb.DB_TYPE_TIMESTAMP)
                created_var = cur.var(oracledb.DB_TYPE_TIMESTAMP)
                updated_var = cur.var(oracledb.DB_TYPE_TIMESTAMP)

                actividad_val = data.actividad.strip() if (data.actividad and data.actividad.strip()) else "(Pendiente de ejecución)"

                cur.setinputsizes(None, None, None, None, None, oracledb.DB_TYPE_CLOB, None, None, None)
                await cur.execute(sql, [
                    data.caso_id, data.ubicacion, actividad_val, data.estado_fisico, data.estado_animo, data.observaciones,
                    data.latitud, data.longitud, educador_id,
                    id_var, fecha_var, created_var, updated_var
                ])
                await conn.commit()
                
                return {
                    "id": id_var.getvalue()[0],
                    "caso_id": data.caso_id,
                    "ubicacion": data.ubicacion,
                    "actividad": actividad_val,
                    "estado_fisico": data.estado_fisico,
                    "latitud": data.latitud,
                    "longitud": data.longitud,
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

    async def get_by_id(self, entrada_id: int) -> dict | None:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT * FROM DIARIO_CAMPO WHERE ID = :1", [entrada_id])
                columns = [col[0].lower() for col in cur.description]
                row = await cur.fetchone()
                if row:
                    return self._row_to_dict(row, columns)
                return None

    async def delete_diario(self, entrada_id: int) -> bool:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("DELETE FROM DIARIO_CAMPO WHERE ID = :1", [entrada_id])
                await conn.commit()
                return cur.rowcount > 0

    async def update_diario(self, entrada_id: int, data: DiarioCampoCreate) -> dict | None:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                sql = """
                    UPDATE DIARIO_CAMPO 
                       SET UBICACION = :1, 
                           ACTIVIDAD = :2, 
                           OBSERVACIONES = :3, 
                           LATITUD = :4, 
                           LONGITUD = :5,
                           UPDATED_AT = SYSDATE
                      WHERE ID = :6
                """
                actividad_val = data.actividad.strip() if (data.actividad and data.actividad.strip()) else "(Pendiente de ejecución)"
                cur.setinputsizes(None, None, oracledb.DB_TYPE_CLOB, None, None, None)
                await cur.execute(sql, [
                    data.ubicacion, actividad_val, data.observaciones,
                    data.latitud, data.longitud, entrada_id
                ])
                await conn.commit()
                if cur.rowcount > 0:
                    # Retornar los datos actualizados
                    await cur.execute("SELECT * FROM DIARIO_CAMPO WHERE ID = :1", [entrada_id])
                    columns = [col[0].lower() for col in cur.description]
                    row = await cur.fetchone()
                    if row:
                        return self._row_to_dict(row, columns)
                return None
