import re
import oracledb
from src.infrastructure.db.connection import get_pool
from src.domain.entities.taller import TallerBase, EjecutarTallerRequest

def _parse_metodologia(meta: str):
    if not meta:
        return None, None, None
    m_inicio = re.search(r"INICIO:\s*(.*?)(?:\n\nPROCESO:|$)", meta, re.DOTALL)
    m_proceso = re.search(r"PROCESO:\s*(.*?)(?:\n\nCIERRE:|$)", meta, re.DOTALL)
    m_cierre = re.search(r"CIERRE:\s*(.*)$", meta, re.DOTALL)
    return (
        m_inicio.group(1).strip() if m_inicio else None,
        m_proceso.group(1).strip() if m_proceso else None,
        m_cierre.group(1).strip() if m_cierre else None,
    )

_TALLER_SELECT = """
    SELECT t.*,
           u.NOMBRE_COMPLETO as educador_nombre
    FROM TALLER t
    LEFT JOIN SEC_USUARIO u ON u.ID = t.EDUCADOR_ID
"""

class OracleTallerRepository:
    def _row_to_dict(self, row, columns) -> dict:
        d = dict(zip(columns, row))

        if "tema" in d:
            d["nombre"] = d["tema"]

        if "fecha_programada" in d:
            val = d["fecha_programada"]
            if val:
                d["fecha"] = val.isoformat() if hasattr(val, "isoformat") else str(val)
                if hasattr(val, "strftime"):
                    d["hora"] = val.strftime("%H:%M")

        # camelCase aliases for new columns
        if "dirigido_a" in d:
            d["dirigidoA"] = d.get("dirigido_a")
        if "num_personas_planificadas" in d:
            d["numeroPersonasPlanificadas"] = d.get("num_personas_planificadas")
        if "acciones_previas" in d:
            d["accionesPrevias"] = d.get("acciones_previas")
        if "inicio_tiempo" in d:
            d["inicioTiempo"] = d.get("inicio_tiempo")
        if "inicio_materiales" in d:
            d["inicioMateriales"] = d.get("inicio_materiales")
        if "proceso_tiempo" in d:
            d["procesoTiempo"] = d.get("proceso_tiempo")
        if "proceso_materiales" in d:
            d["procesoMateriales"] = d.get("proceso_materiales")
        if "cierre_tiempo" in d:
            d["cierreTiempo"] = d.get("cierre_tiempo")
        if "cierre_materiales" in d:
            d["cierreMateriales"] = d.get("cierre_materiales")

        # Parse metodologia back into inicioActividad/procesoActividad/cierreActividad
        inicio, proceso, cierre = _parse_metodologia(d.get("metodologia") or "")
        d["inicioActividad"] = inicio
        d["procesoActividad"] = proceso
        d["cierreActividad"] = cierre

        # Educator name from JOIN
        educador_nombre = d.pop("educador_nombre", None)
        d["educadorResponsable"] = {"nombreCompleto": educador_nombre} if educador_nombre else None

        return d

    async def create_taller(self, taller: TallerBase) -> dict:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                sql = """
                    INSERT INTO TALLER (
                        SEDE_ID, EDUCADOR_ID, TEMA, FECHA_PROGRAMADA, OBJETIVOS, METODOLOGIA, ESTADO,
                        LUGAR, DIRIGIDO_A, NUM_PERSONAS_PLANIFICADAS, ACCIONES_PREVIAS,
                        INICIO_TIEMPO, INICIO_MATERIALES,
                        PROCESO_TIEMPO, PROCESO_MATERIALES,
                        CIERRE_TIEMPO, CIERRE_MATERIALES
                    ) VALUES (
                        :1, :2, :3, :4, :5, :6, 'PLANIFICADO',
                        :7, :8, :9, :10, :11, :12, :13, :14, :15, :16
                    )
                    RETURNING ID, ESTADO, FECHA_REGISTRO INTO :17, :18, :19
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
                    taller.lugar,
                    taller.dirigido_a,
                    taller.num_personas_planificadas,
                    taller.acciones_previas,
                    taller.inicio_tiempo,
                    taller.inicio_materiales,
                    taller.proceso_tiempo,
                    taller.proceso_materiales,
                    taller.cierre_tiempo,
                    taller.cierre_materiales,
                    id_var, estado_var, fecha_var
                ])
                await conn.commit()
                return await self.get_taller_with_participants(id_var.getvalue()[0])

    async def get_taller(self, taller_id: int) -> dict:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    _TALLER_SELECT + "WHERE t.ID = :1",
                    [taller_id]
                )
                row = await cur.fetchone()
                if not row:
                    return None
                columns = [col[0].lower() for col in cur.description]
                return self._row_to_dict(row, columns)

    async def ejecutar_taller(self, taller_id: int, data: EjecutarTallerRequest) -> dict:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "UPDATE TALLER SET ESTADO = 'EJECUTADO', FECHA_EJECUCION = :1 WHERE ID = :2",
                    [data.fecha_ejecucion, taller_id]
                )
                await cur.execute(
                    "DELETE FROM PARTICIPANTE_TALLER WHERE TALLER_ID = :1",
                    [taller_id]
                )
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
                    SET TEMA = :1, FECHA_PROGRAMADA = :2, OBJETIVOS = :3, METODOLOGIA = :4,
                        LUGAR = :5, DIRIGIDO_A = :6,
                        NUM_PERSONAS_PLANIFICADAS = :7, ACCIONES_PREVIAS = :8,
                        INICIO_TIEMPO = :9, INICIO_MATERIALES = :10,
                        PROCESO_TIEMPO = :11, PROCESO_MATERIALES = :12,
                        CIERRE_TIEMPO = :13, CIERRE_MATERIALES = :14
                    WHERE ID = :15
                """
                await cur.execute(sql, [
                    data.get("tema"),
                    data.get("fecha_programada"),
                    data.get("objetivos"),
                    data.get("metodologia"),
                    data.get("lugar"),
                    data.get("dirigido_a"),
                    data.get("num_personas_planificadas"),
                    data.get("acciones_previas"),
                    data.get("inicio_tiempo"),
                    data.get("inicio_materiales"),
                    data.get("proceso_tiempo"),
                    data.get("proceso_materiales"),
                    data.get("cierre_tiempo"),
                    data.get("cierre_materiales"),
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
                           n.NOMBRES, n.APELLIDO_PATERNO, n.APELLIDO_MATERNO,
                           n.FECHA_NACIMIENTO, n.SEXO
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
                            "apellidoMaterno": row[7],
                            "fechaNacimiento": row[8].isoformat() if hasattr(row[8], "isoformat") else (str(row[8]) if row[8] else None),
                            "sexo": row[9]
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
        m_logros = re.search(r"Logros:\s*(.*?)(?:\nLimitaciones:|$)", eval_str, re.DOTALL)
        m_lim = re.search(r"Limitaciones:\s*(.*?)(?:\nSugerencias:|$)", eval_str, re.DOTALL)
        m_sug = re.search(r"Sugerencias:\s*(.*)$", eval_str, re.DOTALL)
        logros = m_logros.group(1).strip() if m_logros else ""
        limitaciones = m_lim.group(1).strip() if m_lim else ""
        sugerencias = m_sug.group(1).strip() if m_sug else ""
        if not m_logros and not m_lim and not m_sug:
            logros = eval_str
        return logros, limitaciones, sugerencias

    async def list_all(self, limit: int = 500, offset: int = 0) -> list:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    _TALLER_SELECT + "ORDER BY t.FECHA_PROGRAMADA DESC OFFSET :1 ROWS FETCH NEXT :2 ROWS ONLY",
                    [offset, limit]
                )
                columns = [col[0].lower() for col in cur.description]
                talleres = [self._row_to_dict(row, columns) for row in await cur.fetchall()]
        for t in talleres:
            t["participantes"] = await self._get_participantes_for_taller(t["id"])
        return talleres

    async def list_by_sede(self, sede_id: int, limit: int = 500, offset: int = 0) -> list:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    _TALLER_SELECT + "WHERE t.SEDE_ID = :1 ORDER BY t.FECHA_PROGRAMADA DESC OFFSET :2 ROWS FETCH NEXT :3 ROWS ONLY",
                    [sede_id, offset, limit]
                )
                columns = [col[0].lower() for col in cur.description]
                talleres = [self._row_to_dict(row, columns) for row in await cur.fetchall()]
        for t in talleres:
            t["participantes"] = await self._get_participantes_for_taller(t["id"])
        return talleres

    async def list_by_educador(self, educador_id: int, limit: int = 500, offset: int = 0) -> list:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    _TALLER_SELECT + "WHERE t.EDUCADOR_ID = :1 ORDER BY t.FECHA_PROGRAMADA DESC OFFSET :2 ROWS FETCH NEXT :3 ROWS ONLY",
                    [educador_id, offset, limit]
                )
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
                    SELECT t.*, pt.ASISTE, pt.EVALUACION,
                           u.NOMBRE_COMPLETO as educador_nombre
                    FROM TALLER t
                    JOIN PARTICIPANTE_TALLER pt ON pt.TALLER_ID = t.ID
                    LEFT JOIN SEC_USUARIO u ON u.ID = t.EDUCADOR_ID
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
                await cur.execute(
                    "SELECT ID FROM PARTICIPANTE_TALLER WHERE TALLER_ID = :1 AND NNA_ID = :2",
                    [taller_id, nna_id]
                )
                if await cur.fetchone():
                    return await self.get_participante(taller_id, nna_id)
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
                           n.NOMBRES, n.APELLIDO_PATERNO, n.APELLIDO_MATERNO,
                           n.FECHA_NACIMIENTO, n.SEXO
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
                        "apellidoMaterno": row[7],
                        "fechaNacimiento": row[8].isoformat() if hasattr(row[8], "isoformat") else (str(row[8]) if row[8] else None),
                        "sexo": row[9]
                    }
                }

    async def update_participante(self, taller_id: int, nna_id: int, data: dict) -> dict:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                if "asistio" in data:
                    await cur.execute(
                        "UPDATE PARTICIPANTE_TALLER SET ASISTE = :1 WHERE TALLER_ID = :2 AND NNA_ID = :3",
                        [1 if data["asistio"] else 0, taller_id, nna_id]
                    )
                if any(k in data for k in ["logros", "limitaciones", "sugerencias", "evaluacion"]):
                    if "evaluacion" in data and data["evaluacion"] is not None:
                        eval_str = data["evaluacion"]
                    else:
                        await cur.execute(
                            "SELECT EVALUACION FROM PARTICIPANTE_TALLER WHERE TALLER_ID = :1 AND NNA_ID = :2",
                            [taller_id, nna_id]
                        )
                        row = await cur.fetchone()
                        existente = row[0] if row else ""
                        ex_logros, ex_lim, ex_sug = self._parse_evaluacion(existente)
                        logros = data.get("logros", ex_logros)
                        limitaciones = data.get("limitaciones", ex_lim)
                        sugerencias = data.get("sugerencias", ex_sug)
                        eval_str = f"Logros: {logros or '—'}\nLimitaciones: {limitaciones or '—'}\nSugerencias: {sugerencias or '—'}"
                    await cur.execute(
                        "UPDATE PARTICIPANTE_TALLER SET EVALUACION = :1 WHERE TALLER_ID = :2 AND NNA_ID = :3",
                        [eval_str[:500], taller_id, nna_id]
                    )
                await conn.commit()
                return await self.get_participante(taller_id, nna_id)

    async def remove_participante(self, taller_id: int, nna_id: int) -> bool:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "DELETE FROM PARTICIPANTE_TALLER WHERE TALLER_ID = :1 AND NNA_ID = :2",
                    [taller_id, nna_id]
                )
                await conn.commit()
                return cur.rowcount > 0
