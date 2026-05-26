import oracledb
import json
import uuid
from datetime import datetime
from src.infrastructure.db.connection import get_pool
from src.domain.entities.diagnostico import DiagnosticoSocialCreate

class OracleDiagnosticoRepository:
    def _row_to_dict(self, row, columns) -> dict:
        d = dict(zip(columns, row))
        if 'datos_extra' in d and d['datos_extra']:
            try:
                # Si es un LOB, hay que leerlo
                if hasattr(d['datos_extra'], 'read'):
                    extra_data = json.loads(d['datos_extra'].read())
                else:
                    extra_data = json.loads(d['datos_extra'])
            except:
                extra_data = {}
            
            # Combinar datos extra directamente al nivel raíz para el frontend
            if isinstance(extra_data, dict):
                merged = {}
                merged.update(extra_data)
                # Conservar metadatos del nivel raíz (sobreescribir si colisionan)
                for k, v in d.items():
                    if k != 'datos_extra':
                        merged[k] = v
                return merged
        return d

    async def create_diagnostico(self, nna_id: int, data: DiagnosticoSocialCreate) -> dict:
        pool = get_pool()
        codigo_f04 = f"F04-{datetime.now().year}-{uuid.uuid4().hex[:6].upper()}"
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                sql = """
                    INSERT INTO DIAGNOSTICO_SOCIAL (
                        CODIGO_FICHA_04, NNA_ID, SITUACION_CALLE, TIEMPO_EN_CALLE, MOTIVO_INGRESO, LUGAR_PERNOTA,
                        ACTIVIDAD_CALLE, CONSUMO_SUSTANCIAS, NOMBRE_TUTOR, DNI_TUTOR, DIRECCION_TUTOR, TELEFONO_TUTOR, DATOS_EXTRA
                    )
                    VALUES (:1, :2, :3, :4, :5, :6, :7, :8, :9, :10, :11, :12, :13)
                    RETURNING ID, CREATED_AT, UPDATED_AT INTO :14, :15, :16
                """
                id_var = cur.var(int)
                created_var = cur.var(oracledb.DB_TYPE_TIMESTAMP)
                updated_var = cur.var(oracledb.DB_TYPE_TIMESTAMP)
                
                datos_extra_str = json.dumps(data.datos_extra) if data.datos_extra else None

                await cur.execute(sql, [
                    codigo_f04, nna_id, data.situacion_calle, data.tiempo_en_calle, data.motivo_ingreso, data.lugar_pernota,
                    data.actividad_calle, 1 if data.consumo_sustancias else 0, data.nombre_tutor, data.dni_tutor,
                    data.direccion_tutor, data.telefono_tutor, datos_extra_str,
                    id_var, created_var, updated_var
                ])
                await conn.commit()
                
                result = data.model_dump()
                result["id"] = id_var.getvalue()[0]
                result["codigo_ficha_04"] = codigo_f04
                result["created_at"] = created_var.getvalue()[0]
                result["updated_at"] = updated_var.getvalue()[0]
                return result

    async def get_by_id(self, diag_id: int) -> dict:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT * FROM DIAGNOSTICO_SOCIAL WHERE ID = :1", [diag_id])
                row = await cur.fetchone()
                if not row:
                    return None
                columns = [col[0].lower() for col in cur.description]
                return self._row_to_dict(row, columns)

    async def get_by_nna(self, nna_id: int) -> list[dict]:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT * FROM DIAGNOSTICO_SOCIAL WHERE NNA_ID = :1 ORDER BY CREATED_AT DESC", [nna_id])
                rows = await cur.fetchall()
                columns = [col[0].lower() for col in cur.description]
                return [self._row_to_dict(r, columns) for r in rows]

    async def update_diagnostico(self, diag_id: int, data: DiagnosticoSocialCreate) -> dict:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                sql = """
                    UPDATE DIAGNOSTICO_SOCIAL
                    SET SITUACION_CALLE = :1,
                        TIEMPO_EN_CALLE = :2,
                        MOTIVO_INGRESO = :3,
                        LUGAR_PERNOTA = :4,
                        ACTIVIDAD_CALLE = :5,
                        CONSUMO_SUSTANCIAS = :6,
                        NOMBRE_TUTOR = :7,
                        DNI_TUTOR = :8,
                        DIRECCION_TUTOR = :9,
                        TELEFONO_TUTOR = :10,
                        DATOS_EXTRA = :11,
                        UPDATED_AT = SYSTIMESTAMP
                    WHERE ID = :12
                    RETURNING UPDATED_AT INTO :13
                """
                updated_var = cur.var(oracledb.DB_TYPE_TIMESTAMP)
                datos_extra_str = json.dumps(data.datos_extra) if data.datos_extra else None
                
                await cur.execute(sql, [
                    data.situacion_calle, data.tiempo_en_calle, data.motivo_ingreso, data.lugar_pernota,
                    data.actividad_calle, 1 if data.consumo_sustancias else 0, data.nombre_tutor, data.dni_tutor,
                    data.direccion_tutor, data.telefono_tutor, datos_extra_str,
                    diag_id, updated_var
                ])
                await conn.commit()
                
                updated_time = updated_var.getvalue()[0]
                result = data.model_dump()
                result["id"] = diag_id
                result["updated_at"] = updated_time
                return result

    async def delete_diagnostico(self, diag_id: int) -> bool:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("DELETE FROM DIAGNOSTICO_SOCIAL WHERE ID = :1", [diag_id])
                await conn.commit()
                return cur.rowcount > 0
