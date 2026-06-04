import oracledb
import uuid
from datetime import datetime
from src.infrastructure.db.connection import get_pool
from src.domain.entities.proceso_logros import ProcesoLogrosCreate


class OracleProcesoLogrosRepository:

    def _row_to_dict(self, row, columns) -> dict:
        d = dict(zip(columns, row))
        for key in ('f1_obs', 'f2_obs', 'f3_obs'):
            if key in d and d[key] and hasattr(d[key], 'read'):
                d[key] = d[key].read()
        for key in ('f1_fecha', 'f2_fecha', 'f3_fecha', 'fecha_ingreso', 'created_at', 'updated_at'):
            if key in d and d[key] and hasattr(d[key], 'isoformat'):
                d[key] = d[key].isoformat()
        return d

    async def create(self, nna_id: int, data: ProcesoLogrosCreate) -> dict:
        pool = get_pool()
        codigo = f"F05-{datetime.now().year}-{uuid.uuid4().hex[:6].upper()}"
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                sql = """
                    INSERT INTO PROCESO_LOGROS (
                        CODIGO_F05, NNA_ID, CASO_ID, PERFIL_USUARIO, FECHA_INGRESO, EDUCADOR_RESPONSABLE,
                        F1_FECHA, F1_I1, F1_I2, F1_I3, F1_I4, F1_I5, F1_OBS,
                        F2_FECHA, F2_I1, F2_I2, F2_I3, F2_I4, F2_I5, F2_I6,
                        F2_I7, F2_I8, F2_I9, F2_I10, F2_OBS,
                        F3_FECHA, F3_I1, F3_I2, F3_I3, F3_I4, F3_I5, F3_OBS
                    ) VALUES (
                        :1,:2,:3,:4,:5,:6,
                        :7,:8,:9,:10,:11,:12,:13,
                        :14,:15,:16,:17,:18,:19,:20,
                        :21,:22,:23,:24,:25,
                        :26,:27,:28,:29,:30,:31,:32
                    )
                    RETURNING ID, CREATED_AT, UPDATED_AT INTO :33, :34, :35
                """
                id_var      = cur.var(int)
                created_var = cur.var(oracledb.DB_TYPE_TIMESTAMP)
                updated_var = cur.var(oracledb.DB_TYPE_TIMESTAMP)

                await cur.execute(sql, [
                    codigo, nna_id, data.caso_id, data.perfil_usuario,
                    data.fecha_ingreso, data.educador_responsable,
                    data.f1_fecha, data.f1_i1, data.f1_i2, data.f1_i3, data.f1_i4, data.f1_i5, data.f1_obs,
                    data.f2_fecha, data.f2_i1, data.f2_i2, data.f2_i3, data.f2_i4, data.f2_i5, data.f2_i6,
                    data.f2_i7, data.f2_i8, data.f2_i9, data.f2_i10, data.f2_obs,
                    data.f3_fecha, data.f3_i1, data.f3_i2, data.f3_i3, data.f3_i4, data.f3_i5, data.f3_obs,
                    id_var, created_var, updated_var,
                ])
                await conn.commit()

                result = data.model_dump()
                result["id"]         = id_var.getvalue()[0]
                result["nna_id"]     = nna_id
                result["codigo_f05"] = codigo
                c = created_var.getvalue()[0]
                u = updated_var.getvalue()[0]
                result["created_at"] = c.isoformat() if c else None
                result["updated_at"] = u.isoformat() if u else None
                return result

    async def get_by_nna(self, nna_id: int) -> list[dict]:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "SELECT * FROM PROCESO_LOGROS WHERE NNA_ID = :1 ORDER BY CREATED_AT DESC",
                    [nna_id],
                )
                rows = await cur.fetchall()
                if not rows:
                    return []
                columns = [col[0].lower() for col in cur.description]
                return [self._row_to_dict(r, columns) for r in rows]

    async def get_by_id(self, logros_id: int) -> dict | None:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "SELECT * FROM PROCESO_LOGROS WHERE ID = :1", [logros_id]
                )
                row = await cur.fetchone()
                if not row:
                    return None
                columns = [col[0].lower() for col in cur.description]
                return self._row_to_dict(row, columns)

    async def update(self, logros_id: int, data: ProcesoLogrosCreate) -> dict:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                sql = """
                    UPDATE PROCESO_LOGROS SET
                        CASO_ID = :1, PERFIL_USUARIO = :2, FECHA_INGRESO = :3,
                        EDUCADOR_RESPONSABLE = :4,
                        F1_FECHA = :5,  F1_I1 = :6,  F1_I2 = :7,  F1_I3 = :8,
                        F1_I4 = :9,     F1_I5 = :10, F1_OBS = :11,
                        F2_FECHA = :12, F2_I1 = :13, F2_I2 = :14, F2_I3 = :15,
                        F2_I4 = :16,    F2_I5 = :17, F2_I6 = :18, F2_I7 = :19,
                        F2_I8 = :20,    F2_I9 = :21, F2_I10 = :22, F2_OBS = :23,
                        F3_FECHA = :24, F3_I1 = :25, F3_I2 = :26, F3_I3 = :27,
                        F3_I4 = :28,    F3_I5 = :29, F3_OBS = :30,
                        UPDATED_AT = SYSTIMESTAMP
                    WHERE ID = :31
                    RETURNING UPDATED_AT INTO :32
                """
                updated_var = cur.var(oracledb.DB_TYPE_TIMESTAMP)
                await cur.execute(sql, [
                    data.caso_id, data.perfil_usuario, data.fecha_ingreso, data.educador_responsable,
                    data.f1_fecha, data.f1_i1, data.f1_i2, data.f1_i3, data.f1_i4, data.f1_i5, data.f1_obs,
                    data.f2_fecha, data.f2_i1, data.f2_i2, data.f2_i3, data.f2_i4, data.f2_i5, data.f2_i6,
                    data.f2_i7, data.f2_i8, data.f2_i9, data.f2_i10, data.f2_obs,
                    data.f3_fecha, data.f3_i1, data.f3_i2, data.f3_i3, data.f3_i4, data.f3_i5, data.f3_obs,
                    logros_id, updated_var,
                ])
                await conn.commit()

                result = data.model_dump()
                result["id"] = logros_id
                u = updated_var.getvalue()[0]
                result["updated_at"] = u.isoformat() if u else None
                return result
