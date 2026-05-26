import oracledb
from src.infrastructure.db.connection import get_pool
from src.domain.entities.taller import TallerBase, EjecutarTallerRequest

class OracleTallerRepository:
    def _row_to_dict(self, row, columns) -> dict:
        d = dict(zip(columns, row))
        # Mapear nombres de columnas de DB a nombres esperados por el frontend
        # Mantenemos los originales (tema, fecha_programada) para Pydantic
        if "tema" in d: 
            d["nombre"] = d["tema"]
        if "fecha_programada" in d: 
            val = d["fecha_programada"]
            if val:
                d["fecha"] = val.isoformat() if hasattr(val, "isoformat") else str(val)
                # Extraer hora HH:MM del timestamp para el frontend
                if hasattr(val, "strftime"):
                    d["hora"] = val.strftime("%H:%M")
        
        # Para fechas, nos aseguramos de que sigan siendo objetos datetime para Pydantic
        # si es que no han sido convertidas a string
        return d

    async def create_taller(self, taller: TallerBase) -> dict:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                sql = """
                    INSERT INTO TALLER (SEDE_ID, EDUCADOR_ID, TEMA, FECHA_PROGRAMADA, OBJETIVOS, METODOLOGIA, ESTADO)
                    VALUES (:1, :2, :3, :4, :5, :6, 'PLANIFICADO')
                    RETURNING ID, ESTADO, FECHA_REGISTRO INTO :7, :8, :9
                """
                id_var = cur.var(int)
                estado_var = cur.var(str)
                fecha_var = cur.var(oracledb.DB_TYPE_TIMESTAMP)

                await cur.execute(sql, [
                    taller.sede_id,
                    taller.educador_id,
                    taller.tema,
                    taller.fecha_programada,
                    taller.objetivos,
                    taller.metodologia,
                    id_var, estado_var, fecha_var
                ])
                await conn.commit()
                
                fecha_reg = fecha_var.getvalue()[0]
                return {
                    "id": id_var.getvalue()[0],
                    "sede_id": taller.sede_id,
                    "educador_id": taller.educador_id,
                    "tema": taller.tema,
                    "nombre": taller.tema,
                    "fecha_programada": taller.fecha_programada,
                    "fecha": taller.fecha_programada.isoformat() if hasattr(taller.fecha_programada, "isoformat") else str(taller.fecha_programada),
                    "hora": taller.fecha_programada.strftime("%H:%M") if hasattr(taller.fecha_programada, "strftime") else None,
                    "fecha_ejecucion": None,
                    "estado": estado_var.getvalue()[0],
                    "objetivos": taller.objetivos,
                    "metodologia": taller.metodologia,
                    "fecha_registro": fecha_reg
                }

    async def get_taller(self, taller_id: int) -> dict:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT * FROM TALLER WHERE ID = :1", [taller_id])
                row = await cur.fetchone()
                if not row:
                    return None
                columns = [col[0].lower() for col in cur.description]
                return self._row_to_dict(row, columns)

    async def ejecutar_taller(self, taller_id: int, data: EjecutarTallerRequest) -> dict:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                # Actualizar estado del taller
                sql_taller = """
                    UPDATE TALLER 
                    SET ESTADO = 'EJECUTADO', FECHA_EJECUCION = :1
                    WHERE ID = :2
                """
                await cur.execute(sql_taller, [data.fecha_ejecucion, taller_id])
                
                # Insertar participantes
                sql_participante = """
                    INSERT INTO PARTICIPANTE_TALLER (TALLER_ID, NNA_ID, ASISTE, EVALUACION)
                    VALUES (:1, :2, :3, :4)
                """
                
                participantes_data = [
                    (taller_id, p.nna_id, 1 if p.asiste else 0, p.evaluacion)
                    for p in data.participantes
                ]
                
                if participantes_data:
                    await cur.executemany(sql_participante, participantes_data)

                await conn.commit()
                return await self.get_taller_with_participants(taller_id)

    async def update_taller(self, taller_id: int, data: dict) -> dict:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                sql = """
                    UPDATE TALLER 
                    SET TEMA = :1, FECHA_PROGRAMADA = :2, OBJETIVOS = :3, METODOLOGIA = :4
                    WHERE ID = :5
                """
                await cur.execute(sql, [
                    data.get("tema"),
                    data.get("fecha_programada"),
                    data.get("objetivos"),
                    data.get("metodologia"),
                    taller_id
                ])
                await conn.commit()
                return await self.get_taller_with_participants(taller_id)

    async def _get_participantes_for_taller(self, taller_id: int) -> list:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                sql = """
                    SELECT pt.ID, pt.TALLER_ID, pt.NNA_ID, pt.ASISTE, pt.EVALUACION,
                           n.NOMBRES, n.APELLIDO_PATERNO, n.APELLIDO_MATERNO
                    FROM PARTICIPANTE_TALLER pt
                    JOIN NNA n ON n.ID = pt.NNA_ID
                    WHERE pt.TALLER_ID = :1
                """
                await cur.execute(sql, [taller_id])
                participantes = []
                for row in await cur.fetchall():
                    eval_str = row[4] or ""
                    logros, limitaciones, sugerencias = self._parse_evaluacion(eval_str)
                    
                    participantes.append({
                        "id": row[0],
                        "tallerId": row[1],
                        "nnaId": row[2],
                        "asistio": bool(row[3]),
                        "logros": logros,
                        "limitaciones": limitaciones,
                        "sugerencias": sugerencias,
                        "nna": {
                            "nombres": row[5],
                            "apellidoPaterno": row[6],
                            "apellidoMaterno": row[7]
                        }
                    })
                return participantes

    async def get_taller_with_participants(self, taller_id: int) -> dict:
        taller = await self.get_taller(taller_id)
        if not taller:
            return None
        taller["participantes"] = await self._get_participantes_for_taller(taller_id)
        return taller

    def _parse_evaluacion(self, eval_str: str) -> tuple[str, str, str]:
        if not eval_str:
            return "", "", ""
        logros = ""
        limitaciones = ""
        sugerencias = ""
        
        import re
        m_logros = re.search(r"Logros:\s*(.*?)(?:\nLimitaciones:|$)", eval_str, re.DOTALL)
        m_lim = re.search(r"Limitaciones:\s*(.*?)(?:\nSugerencias:|$)", eval_str, re.DOTALL)
        m_sug = re.search(r"Sugerencias:\s*(.*)$", eval_str, re.DOTALL)
        
        if m_logros: logros = m_logros.group(1).strip()
        if m_lim: limitaciones = m_lim.group(1).strip()
        if m_sug: sugerencias = m_sug.group(1).strip()
        
        if not m_logros and not m_lim and not m_sug:
            logros = eval_str
            
        return logros, limitaciones, sugerencias

    async def list_all(self) -> list:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT * FROM TALLER ORDER BY FECHA_PROGRAMADA DESC")
                columns = [col[0].lower() for col in cur.description]
                talleres = [self._row_to_dict(row, columns) for row in await cur.fetchall()]
        for t in talleres:
            t["participantes"] = await self._get_participantes_for_taller(t["id"])
        return talleres

    async def list_by_sede(self, sede_id: int) -> list:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT * FROM TALLER WHERE SEDE_ID = :1 ORDER BY FECHA_PROGRAMADA DESC", [sede_id])
                columns = [col[0].lower() for col in cur.description]
                talleres = [self._row_to_dict(row, columns) for row in await cur.fetchall()]
        for t in talleres:
            t["participantes"] = await self._get_participantes_for_taller(t["id"])
        return talleres

    async def list_by_educador(self, educador_id: int) -> list:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT * FROM TALLER WHERE EDUCADOR_ID = :1 ORDER BY FECHA_PROGRAMADA DESC", [educador_id])
                columns = [col[0].lower() for col in cur.description]
                talleres = [self._row_to_dict(row, columns) for row in await cur.fetchall()]
        for t in talleres:
            t["participantes"] = await self._get_participantes_for_taller(t["id"])
        return talleres

    async def list_by_nna(self, nna_id: int) -> list:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                sql = """
                    SELECT t.*, pt.ASISTE, pt.EVALUACION 
                    FROM TALLER t
                    JOIN PARTICIPANTE_TALLER pt ON pt.TALLER_ID = t.ID
                    WHERE pt.NNA_ID = :1
                    ORDER BY t.FECHA_PROGRAMADA DESC
                """
                await cur.execute(sql, [nna_id])
                columns = [col[0].lower() for col in cur.description]
                result = []
                for row in await cur.fetchall():
                    t = self._row_to_dict(row, columns)
                    t["asiste"] = bool(t.get("asiste", 0))
                    result.append(t)
                return result

    async def add_participante(self, taller_id: int, nna_id: int) -> dict:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                # Verificar duplicado
                await cur.execute(
                    "SELECT ID FROM PARTICIPANTE_TALLER WHERE TALLER_ID = :1 AND NNA_ID = :2",
                    [taller_id, nna_id]
                )
                row = await cur.fetchone()
                if row:
                    return await self.get_participante(taller_id, nna_id)
                
                # Insertar nuevo
                sql = """
                    INSERT INTO PARTICIPANTE_TALLER (TALLER_ID, NNA_ID, ASISTE)
                    VALUES (:1, :2, 0)
                    RETURNING ID INTO :3
                """
                id_var = cur.var(int)
                await cur.execute(sql, [taller_id, nna_id, id_var])
                await conn.commit()
                
                return await self.get_participante(taller_id, nna_id)

    async def get_participante(self, taller_id: int, nna_id: int) -> dict:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                sql = """
                    SELECT pt.ID, pt.TALLER_ID, pt.NNA_ID, pt.ASISTE, pt.EVALUACION,
                           n.NOMBRES, n.APELLIDO_PATERNO, n.APELLIDO_MATERNO
                    FROM PARTICIPANTE_TALLER pt
                    JOIN NNA n ON n.ID = pt.NNA_ID
                    WHERE pt.TALLER_ID = :1 AND pt.NNA_ID = :2
                """
                await cur.execute(sql, [taller_id, nna_id])
                row = await cur.fetchone()
                if not row:
                    return None
                
                eval_str = row[4] or ""
                logros, limitaciones, sugerencias = self._parse_evaluacion(eval_str)
                
                return {
                    "id": row[0],
                    "tallerId": row[1],
                    "nnaId": row[2],
                    "asistio": bool(row[3]),
                    "logros": logros,
                    "limitaciones": limitaciones,
                    "sugerencias": sugerencias,
                    "nna": {
                        "nombres": row[5],
                        "apellidoPaterno": row[6],
                        "apellidoMaterno": row[7]
                    }
                }

    async def update_participante(self, taller_id: int, nna_id: int, data: dict) -> dict:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                if "asistio" in data:
                    sql_asiste = "UPDATE PARTICIPANTE_TALLER SET ASISTE = :1 WHERE TALLER_ID = :2 AND NNA_ID = :3"
                    await cur.execute(sql_asiste, [1 if data["asistio"] else 0, taller_id, nna_id])
                
                if any(k in data for k in ["logros", "limitaciones", "sugerencias", "evaluacion"]):
                    if "evaluacion" in data and data["evaluacion"] is not None:
                        eval_str = data["evaluacion"]
                    else:
                        await cur.execute("SELECT EVALUACION FROM PARTICIPANTE_TALLER WHERE TALLER_ID = :1 AND NNA_ID = :2", [taller_id, nna_id])
                        row = await cur.fetchone()
                        existente = row[0] if row else ""
                        ex_logros, ex_lim, ex_sug = self._parse_evaluacion(existente)
                        
                        logros = data.get("logros", ex_logros)
                        limitaciones = data.get("limitaciones", ex_lim)
                        sugerencias = data.get("sugerencias", ex_sug)
                        
                        eval_str = f"Logros: {logros or '—'}\nLimitaciones: {limitaciones or '—'}\nSugerencias: {sugerencias or '—'}"
                    
                    sql_eval = "UPDATE PARTICIPANTE_TALLER SET EVALUACION = :1 WHERE TALLER_ID = :2 AND NNA_ID = :3"
                    await cur.execute(sql_eval, [eval_str[:500], taller_id, nna_id])
                
                await conn.commit()
                return await self.get_participante(taller_id, nna_id)

    async def remove_participante(self, taller_id: int, nna_id: int) -> bool:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                sql = "DELETE FROM PARTICIPANTE_TALLER WHERE TALLER_ID = :1 AND NNA_ID = :2"
                await cur.execute(sql, [taller_id, nna_id])
                await conn.commit()
                return cur.rowcount > 0
