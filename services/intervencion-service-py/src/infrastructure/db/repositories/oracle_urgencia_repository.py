import oracledb
import logging
import json
from datetime import datetime
from typing import Optional
from src.infrastructure.db.connection import get_pool
from src.domain.entities.urgencia import UrgenciaF15Create

logger = logging.getLogger("oracle_urgencia_repository")

class OracleUrgenciaRepository:
    def _row_to_dict(self, row, columns) -> dict:
        d = dict(zip(columns, row))
        # Convertir booleanos numéricos (0/1) a bools de Python
        for key in ["nna_ubicado", "asiste_escuela", "tiene_dni", "tiene_sis"]:
            if key in d:
                d[key] = bool(d[key])
        
        # Parsear datos_extra CLOB JSON
        if 'datos_extra' in d and d['datos_extra']:
            try:
                if hasattr(d['datos_extra'], 'read'):
                    raw = d['datos_extra'].read()
                    d['datos_extra'] = json.loads(raw) if raw else None
                else:
                    d['datos_extra'] = json.loads(d['datos_extra'])
            except Exception as e:
                logger.warning(f"Error parseando datos_extra JSON en urgencia: {e}")
                d['datos_extra'] = None
        else:
            d['datos_extra'] = None
            
        return d

    async def _generate_codigo_reporte(self, cur) -> str:
        current_year = datetime.now().year
        await cur.execute(
            "SELECT COUNT(*) FROM NNA_URGENCIA_F15 WHERE EXTRACT(YEAR FROM CREATED_AT) = :1",
            [current_year]
        )
        row = await cur.fetchone()
        count = row[0] if row else 0
        correlativo = count + 1
        return f"URG-{current_year}-{correlativo:04d}"

    async def create_urgencia(self, data: UrgenciaF15Create, educador_id: int, sede_id: int) -> dict:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                codigo = await self._generate_codigo_reporte(cur)
                
                sql = """
                    INSERT INTO NNA_URGENCIA_F15 (
                        CODIGO_REPORTE, FECHA_ATENCION, HORA_ATENCION, ZONA_ATENCION, NNA_UBICADO, PERFIL, ANTECEDENTES, ACTIVIDADES_REALIZA,
                        NOMBRE_REFERIDO, DIRECCION_REFERIDA, ASISTE_ESCUELA, ESCUELA_DETALLE, GRADO_ESCUELA, TIENE_DNI, TIENE_SIS, FAMILIARES_VIVE, HORARIOS_DIAS,
                        RIESGO_SALUD, RIESGO_VIOLENCIA, RIESGO_ESCOLAR, RIESGO_LABORAL_PADRES, RIESGO_FAMILIAR,
                        ACCIONES_REALIZADAS, OTRA_SITUACION, ACUERDOS,
                        EDUCADOR_ID, SEDE_ID, ESTADO, DATOS_EXTRA
                    ) VALUES (
                        :1, :2, :3, :4, :5, :6, :7, :8,
                        :9, :10, :11, :12, :13, :14, :15, :16, :17,
                        :18, :19, :20, :21, :22,
                        :23, :24, :25,
                        :26, :27, 'PENDIENTE', :28
                    ) RETURNING ID, CREATED_AT, UPDATED_AT INTO :29, :30, :31
                """
                
                id_var = cur.var(int)
                created_var = cur.var(oracledb.DB_TYPE_TIMESTAMP)
                updated_var = cur.var(oracledb.DB_TYPE_TIMESTAMP)
                
                fecha_atencion = data.fecha_atencion or datetime.now()
                datos_extra_str = json.dumps(data.datos_extra) if data.datos_extra else None
                
                await cur.execute(sql, [
                    codigo, fecha_atencion, data.hora_atencion, data.zona_atencion, int(data.nna_ubicado), data.perfil, data.antecedentes, data.actividades_realiza,
                    data.nombre_referido, data.direccion_referida, int(data.asiste_escuela), data.escuela_detalle, data.grado_escuela, int(data.tiene_dni), int(data.tiene_sis), data.familiares_vive, data.horarios_dias,
                    data.riesgo_salud, data.riesgo_violencia, data.riesgo_escolar, data.riesgo_laboral_padres, data.riesgo_familiar,
                    data.acciones_realizadas, data.otra_situacion, data.acuerdos,
                    educador_id, sede_id, datos_extra_str,
                    id_var, created_var, updated_var
                ])
                await conn.commit()
                
                res = data.model_dump()
                res.update({
                    "id": id_var.getvalue()[0],
                    "codigo_reporte": codigo,
                    "educador_id": educador_id,
                    "sede_id": sede_id,
                    "nna_id": None,
                    "estado": "PENDIENTE",
                    "created_at": created_var.getvalue()[0],
                    "updated_at": updated_var.getvalue()[0],
                    "fecha_atencion": fecha_atencion
                })
                return res

    async def get_by_id(self, id: int) -> Optional[dict]:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT * FROM NNA_URGENCIA_F15 WHERE ID = :1", [id])
                row = await cur.fetchone()
                if not row:
                    return None
                columns = [col[0].lower() for col in cur.description]
                return self._row_to_dict(row, columns)

    async def list_by_sede(self, sede_id: int, limit: int = 500, offset: int = 0) -> list[dict]:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "SELECT * FROM NNA_URGENCIA_F15 WHERE SEDE_ID = :1 ORDER BY CREATED_AT DESC"
                    " OFFSET :2 ROWS FETCH NEXT :3 ROWS ONLY",
                    [sede_id, offset, limit]
                )
                columns = [col[0].lower() for col in cur.description]
                rows = await cur.fetchall()
                return [self._row_to_dict(row, columns) for row in rows]

    async def update_urgencia(self, id: int, data: UrgenciaF15Create) -> Optional[dict]:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                sql = """
                    UPDATE NNA_URGENCIA_F15 SET
                        FECHA_ATENCION = :1, HORA_ATENCION = :2, ZONA_ATENCION = :3, NNA_UBICADO = :4, PERFIL = :5, ANTECEDENTES = :6, ACTIVIDADES_REALIZA = :7,
                        NOMBRE_REFERIDO = :8, DIRECCION_REFERIDA = :9, ASISTE_ESCUELA = :10, ESCUELA_DETALLE = :11, GRADO_ESCUELA = :12, TIENE_DNI = :13, TIENE_SIS = :14, FAMILIARES_VIVE = :15, HORARIOS_DIAS = :16,
                        RIESGO_SALUD = :17, RIESGO_VIOLENCIA = :18, RIESGO_ESCOLAR = :19, RIESGO_LABORAL_PADRES = :20, RIESGO_FAMILIAR = :21,
                        ACCIONES_REALIZADAS = :22, OTRA_SITUACION = :23, ACUERDOS = :24, DATOS_EXTRA = :25,
                        UPDATED_AT = SYSTIMESTAMP
                    WHERE ID = :26
                """
                datos_extra_str = json.dumps(data.datos_extra) if data.datos_extra else None
                await cur.execute(sql, [
                    data.fecha_atencion or datetime.now(), data.hora_atencion, data.zona_atencion, int(data.nna_ubicado), data.perfil, data.antecedentes, data.actividades_realiza,
                    data.nombre_referido, data.direccion_referida, int(data.asiste_escuela), data.escuela_detalle, data.grado_escuela, int(data.tiene_dni), int(data.tiene_sis), data.familiares_vive, data.horarios_dias,
                    data.riesgo_salud, data.riesgo_violencia, data.riesgo_escolar, data.riesgo_laboral_padres, data.riesgo_familiar,
                    data.acciones_realizadas, data.otra_situacion, data.acuerdos, datos_extra_str,
                    id
                ])
                await conn.commit()
                if cur.rowcount == 0:
                    return None
                return await self.get_by_id(id)

    async def update_estado(self, id: int, estado: str, nna_id: Optional[int] = None) -> bool:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                if nna_id is not None:
                    await cur.execute(
                        "UPDATE NNA_URGENCIA_F15 SET ESTADO = :1, NNA_ID = :2, UPDATED_AT = SYSTIMESTAMP WHERE ID = :3",
                        [estado, nna_id, id]
                    )
                else:
                    await cur.execute(
                        "UPDATE NNA_URGENCIA_F15 SET ESTADO = :1, UPDATED_AT = SYSTIMESTAMP WHERE ID = :2",
                        [estado, id]
                    )
                await conn.commit()
                return cur.rowcount > 0
