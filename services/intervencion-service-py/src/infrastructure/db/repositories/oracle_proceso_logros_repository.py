import inspect
import oracledb
import uuid
from datetime import datetime
from src.infrastructure.db.connection import get_pool
from src.domain.entities.proceso_logros import ProcesoLogrosCreate


class OracleProcesoLogrosRepository:

    async def _row_to_dict(self, row, columns) -> dict:
        d = dict(zip(columns, row))
        for key in ('f1_obs', 'f2_obs', 'f3_obs'):
            if key in d and d[key] and hasattr(d[key], 'read'):
                raw = d[key].read()
                if inspect.isawaitable(raw):
                    raw = await raw
                d[key] = raw
        for key in ('f1_fecha', 'f2_fecha', 'f3_fecha',
                    'f1_inicio', 'f1_fin', 'f2_inicio', 'f2_fin', 'f3_inicio', 'f3_fin',
                    'fecha_ingreso', 'created_at', 'updated_at'):
            if key in d and d[key] and hasattr(d[key], 'isoformat'):
                d[key] = d[key].isoformat()
        _aliases = {
            'nna_id': 'nnaId', 'caso_id': 'casoId', 'codigo_f05': 'codigoF05',
            'perfil_usuario': 'perfilUsuario', 'fecha_ingreso': 'fechaIngreso',
            'educador_responsable': 'educadorResponsable',
            'f1_fecha': 'f1Fecha', 'f1_inicio': 'f1Inicio', 'f1_fin': 'f1Fin', 'f1_i1': 'f1I1', 'f1_i2': 'f1I2', 'f1_i3': 'f1I3',
            'f1_i4': 'f1I4', 'f1_i5': 'f1I5', 'f1_obs': 'f1Obs',
            'f2_fecha': 'f2Fecha', 'f2_inicio': 'f2Inicio', 'f2_fin': 'f2Fin', 'f2_i1': 'f2I1', 'f2_i2': 'f2I2', 'f2_i3': 'f2I3',
            'f2_i4': 'f2I4', 'f2_i5': 'f2I5', 'f2_i6': 'f2I6', 'f2_i7': 'f2I7',
            'f2_i8': 'f2I8', 'f2_i9': 'f2I9', 'f2_i10': 'f2I10', 'f2_obs': 'f2Obs',
            'f3_fecha': 'f3Fecha', 'f3_inicio': 'f3Inicio', 'f3_fin': 'f3Fin', 'f3_i1': 'f3I1', 'f3_i2': 'f3I2', 'f3_i3': 'f3I3',
            'f3_i4': 'f3I4', 'f3_i5': 'f3I5', 'f3_obs': 'f3Obs',
            'created_at': 'createdAt', 'updated_at': 'updatedAt',
        }
        for snake, camel in _aliases.items():
            if snake in d:
                d[camel] = d[snake]
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
                        F3_FECHA, F3_I1, F3_I2, F3_I3, F3_I4, F3_I5, F3_OBS,
                        F1_INICIO, F1_FIN, F2_INICIO, F2_FIN, F3_INICIO, F3_FIN
                    ) VALUES (
                        :1,:2,:3,:4,:5,:6,
                        :7,:8,:9,:10,:11,:12,:13,
                        :14,:15,:16,:17,:18,:19,:20,
                        :21,:22,:23,:24,:25,
                        :26,:27,:28,:29,:30,:31,:32,
                        :33,:34,:35,:36,:37,:38
                    )
                    RETURNING ID, CREATED_AT, UPDATED_AT INTO :39, :40, :41
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
                    data.f1_inicio, data.f1_fin, data.f2_inicio, data.f2_fin, data.f3_inicio, data.f3_fin,
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
                result = []
                for r in rows:
                    result.append(await self._row_to_dict(r, columns))
                return result

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
                return await self._row_to_dict(row, columns)

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
                        F1_INICIO = :31, F1_FIN = :32,
                        F2_INICIO = :33, F2_FIN = :34,
                        F3_INICIO = :35, F3_FIN = :36,
                        UPDATED_AT = SYSTIMESTAMP
                    WHERE ID = :37
                    RETURNING UPDATED_AT INTO :38
                """
                updated_var = cur.var(oracledb.DB_TYPE_TIMESTAMP)
                await cur.execute(sql, [
                    data.caso_id, data.perfil_usuario, data.fecha_ingreso, data.educador_responsable,
                    data.f1_fecha, data.f1_i1, data.f1_i2, data.f1_i3, data.f1_i4, data.f1_i5, data.f1_obs,
                    data.f2_fecha, data.f2_i1, data.f2_i2, data.f2_i3, data.f2_i4, data.f2_i5, data.f2_i6,
                    data.f2_i7, data.f2_i8, data.f2_i9, data.f2_i10, data.f2_obs,
                    data.f3_fecha, data.f3_i1, data.f3_i2, data.f3_i3, data.f3_i4, data.f3_i5, data.f3_obs,
                    data.f1_inicio, data.f1_fin, data.f2_inicio, data.f2_fin, data.f3_inicio, data.f3_fin,
                    logros_id, updated_var,
                ])
                await conn.commit()

                result = data.model_dump()
                result["id"] = logros_id
                u = updated_var.getvalue()[0]
                result["updated_at"] = u.isoformat() if u else None
                return result
