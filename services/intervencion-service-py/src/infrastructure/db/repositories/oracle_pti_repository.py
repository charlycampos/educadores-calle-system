import oracledb
from src.infrastructure.db.connection import get_pool
from src.domain.entities.pti import PlanTrabajoCreate
from datetime import datetime
import uuid

class OraclePTIRepository:
    def _row_to_dict(self, row, columns) -> dict:
        return dict(zip(columns, row))

    async def create_pti(self, caso_id: int, data: PlanTrabajoCreate) -> dict:
        pool = get_pool()
        codigo_pti = f"PII-{datetime.now().year}-{uuid.uuid4().hex[:6].upper()}"
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                # 1. Crear PTI
                sql_pti = """
                    INSERT INTO PLAN_TRABAJO (CODIGO_PTI, CASO_ID, OBJETIVO_GENERAL)
                    VALUES (:1, :2, :3)
                    RETURNING ID, FECHA_INICIO, ESTADO, CREATED_AT, UPDATED_AT INTO :4, :5, :6, :7, :8
                """
                id_var = cur.var(int)
                fecha_var = cur.var(oracledb.DB_TYPE_TIMESTAMP)
                estado_var = cur.var(str)
                created_var = cur.var(oracledb.DB_TYPE_TIMESTAMP)
                updated_var = cur.var(oracledb.DB_TYPE_TIMESTAMP)

                await cur.execute(sql_pti, [
                    codigo_pti, caso_id, data.objetivo_general,
                    id_var, fecha_var, estado_var, created_var, updated_var
                ])
                
                plan_id = id_var.getvalue()[0]

                # 2. Crear Acciones
                if data.acciones:
                    sql_accion = """
                        INSERT INTO ACCION_PTI (PLAN_TRABAJO_ID, DESCRIPCION, META, PLAZO, RESPONSABLE)
                        VALUES (:1, :2, :3, :4, :5)
                    """
                    acciones_data = [
                        (plan_id, acc.descripcion, acc.meta, acc.plazo, acc.responsable)
                        for acc in data.acciones
                    ]
                    await cur.executemany(sql_accion, acciones_data)

                await conn.commit()
                return await self.get_last_pti(caso_id)

    async def get_last_pti(self, caso_id: int) -> dict:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT * FROM PLAN_TRABAJO WHERE CASO_ID = :1 ORDER BY CREATED_AT DESC FETCH FIRST 1 ROWS ONLY", [caso_id])
                row = await cur.fetchone()
                if not row:
                    return None
                
                columns = [col[0].lower() for col in cur.description]
                pti = self._row_to_dict(row, columns)
                
                await cur.execute("SELECT * FROM ACCION_PTI WHERE PLAN_TRABAJO_ID = :1 ORDER BY CREATED_AT ASC", [pti["id"]])
                acc_columns = [col[0].lower() for col in cur.description]
                pti["acciones"] = [self._row_to_dict(r, acc_columns) for r in await cur.fetchall()]
                
                return pti
