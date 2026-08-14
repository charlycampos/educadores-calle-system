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

# Participantes: la tabla es polimórfica (NNA o FAMILIAR), por eso ambos
# JOIN son LEFT. Los NNA alimentan el Formato 10 y los familiares el 11.
_PARTICIPANTE_SELECT = """
    SELECT pt.ID, pt.TALLER_ID, pt.TIPO, pt.NNA_ID, pt.FAMILIAR_ID,
           pt.ASISTE, pt.EVALUACION,
           n.NOMBRES, n.APELLIDO_PATERNO, n.APELLIDO_MATERNO,
           n.FECHA_NACIMIENTO, n.SEXO,
           f.NOMBRES, f.PARENTESCO, f.DNI, f.TELEFONO,
           n.CARPETA_ID, f.CARPETA_ID,
           n.EDAD, n.UNIDAD_EDAD
    FROM PARTICIPANTE_TALLER pt
    LEFT JOIN NNA n          ON n.ID = pt.NNA_ID
    LEFT JOIN NNA_FAMILIAR f ON f.ID = pt.FAMILIAR_ID
"""

# Misma forma de resultado (16 columnas) para cuando la migración 002 aún no
# se ha ejecutado: TIPO y FAMILIAR_ID se sintetizan como literales, de modo
# que el mapeo de filas es idéntico y el servicio no se cae.
_PARTICIPANTE_SELECT_LEGACY = """
    SELECT pt.ID, pt.TALLER_ID, 'NNA' AS TIPO, pt.NNA_ID, NULL AS FAMILIAR_ID,
           pt.ASISTE, pt.EVALUACION,
           n.NOMBRES, n.APELLIDO_PATERNO, n.APELLIDO_MATERNO,
           n.FECHA_NACIMIENTO, n.SEXO,
           NULL AS F_NOMBRES, NULL AS F_PARENTESCO, NULL AS F_DNI, NULL AS F_TELEFONO,
           n.CARPETA_ID, NULL AS F_CARPETA_ID,
           n.EDAD, n.UNIDAD_EDAD
    FROM PARTICIPANTE_TALLER pt
    LEFT JOIN NNA n ON n.ID = pt.NNA_ID
"""

# Solo se cachea el resultado positivo: las columnas no desaparecen, pero sí
# pueden aparecer si se aplica la migración con el servicio ya levantado.
# Cachear el False obligaría a reiniciar el servicio tras migrar.
_soporta_familiares: bool = False


async def familiares_habilitados() -> bool:
    """
    Indica si la migración 002 ya está aplicada.

    Permite que el módulo de talleres siga operando (sin padres) cuando la
    migración está pendiente, en vez de devolver ORA-00904 en cada consulta.
    """
    global _soporta_familiares
    if _soporta_familiares:
        return True

    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT COUNT(*) FROM USER_TAB_COLUMNS
                 WHERE TABLE_NAME = 'PARTICIPANTE_TALLER'
                   AND COLUMN_NAME IN ('TIPO', 'FAMILIAR_ID')
                """
            )
            row = await cur.fetchone()
            _soporta_familiares = bool(row and row[0] == 2)

    if _soporta_familiares:
        print("[talleres-service] Migración 002 detectada: registro de padres/tutores activo.")
    else:
        print(
            "[talleres-service] AVISO: falta ejecutar la migración "
            "002_participante_familiar.sql. Los talleres funcionan, pero no se "
            "podrán registrar padres/tutores (Formato 11)."
        )
    return _soporta_familiares

# El estado EVALUADO solo se puede persistir si la migración 003 recreó el
# CHECK de TALLER.ESTADO. Sin ella, intentar guardarlo da ORA-02290.
_soporta_evaluado: bool = False


async def estado_evaluado_habilitado() -> bool:
    """Indica si la migración 003 ya está aplicada."""
    global _soporta_evaluado
    if _soporta_evaluado:
        return True

    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT COUNT(*) FROM USER_CONSTRAINTS
                 WHERE TABLE_NAME = 'TALLER'
                   AND CONSTRAINT_TYPE = 'C'
                   AND SEARCH_CONDITION_VC LIKE '%EVALUADO%'
                """
            )
            row = await cur.fetchone()
            _soporta_evaluado = bool(row and row[0] > 0)

    if not _soporta_evaluado:
        print(
            "[talleres-service] AVISO: falta ejecutar la migración "
            "003_estado_evaluado.sql. Los talleres evaluados se quedarán en EJECUTADO."
        )
    return _soporta_evaluado


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
        # Se resuelve ANTES de tomar la conexión: familiares_habilitados()
        # adquiere una del pool, y pedirla desde dentro de otra puede agotarlo
        # y dejar la petición colgada.
        con_familiares = await familiares_habilitados()

        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                # Solo se sella la fecha: el estado se deriva al final, según la
                # asistencia y las evaluaciones que queden registradas.
                await cur.execute(
                    "UPDATE TALLER SET FECHA_EJECUCION = :1 WHERE ID = :2",
                    [data.fecha_ejecucion, taller_id]
                )
                # Solo se reemplazan los NNA: los familiares (Formato 11) se
                # inscriben aparte y borrarlos acá perdería su asistencia.
                if con_familiares:
                    await cur.execute(
                        "DELETE FROM PARTICIPANTE_TALLER WHERE TALLER_ID = :1 AND TIPO = 'NNA'",
                        [taller_id]
                    )
                    sql_participante = """
                        INSERT INTO PARTICIPANTE_TALLER (TALLER_ID, TIPO, NNA_ID, ASISTE, EVALUACION)
                        VALUES (:1, 'NNA', :2, :3, :4)
                    """
                else:
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

        await self.recalcular_estado(taller_id)
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

    def _participante_row_to_dict(self, row) -> dict:
        """Mapea una fila de _PARTICIPANTE_SELECT, sea NNA o familiar."""
        tipo = row[2] or "NNA"
        logros, limitaciones, sugerencias = self._parse_evaluacion(row[6] or "")

        participante = {
            "id": row[0],
            "tallerId": row[1],
            "tipo": tipo,
            "nnaId": row[3],
            "familiarId": row[4],
            "asistio": bool(row[5]),
            "logros": logros,
            "limitaciones": limitaciones,
            "sugerencias": sugerencias,
            "nna": None,
            "familiar": None,
        }

        # Carpeta a la que pertenece la fila: permite emparejar familiares con
        # los NNA del mismo expediente sin una subconsulta por fila.
        participante["_carpetaId"] = row[17] if tipo == "FAMILIAR" else row[16]

        if tipo == "FAMILIAR":
            participante["familiar"] = {
                "nombres": row[12],
                "parentesco": row[13],
                "dni": row[14],
                "telefono": row[15],
                "nnaRelacionado": None,
            }
        else:
            fecha_nac = row[10]
            participante["nna"] = {
                "nombres": row[7],
                "apellidoPaterno": row[8],
                "apellidoMaterno": row[9],
                "fechaNacimiento": fecha_nac.isoformat() if hasattr(fecha_nac, "isoformat") else (str(fecha_nac) if fecha_nac else None),
                "sexo": row[11],
                # Muchos NNA de calle se registran solo con la edad, sin fecha
                # de nacimiento. Sin este campo el F10 salía con la columna
                # Edad vacía para casi todos.
                "edad": row[18] if len(row) > 18 else None,
                "unidadEdad": row[19] if len(row) > 19 else None,
            }

        return participante

    async def _get_participantes_for_taller(self, taller_id: int) -> list:
        con_familiares = await familiares_habilitados()
        if con_familiares:
            sql = _PARTICIPANTE_SELECT + """
                WHERE pt.TALLER_ID = :taller_id
                ORDER BY CASE WHEN pt.TIPO = 'NNA' THEN 0 ELSE 1 END,
                         n.APELLIDO_PATERNO, f.NOMBRES
            """
        else:
            sql = _PARTICIPANTE_SELECT_LEGACY + """
                WHERE pt.TALLER_ID = :taller_id
                ORDER BY n.APELLIDO_PATERNO
            """

        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(sql, taller_id=taller_id)
                participantes = [self._participante_row_to_dict(row) for row in await cur.fetchall()]

        # Se resuelve en memoria a qué NNA acompaña cada familiar: comparten
        # carpeta. En la grilla, un familiar sin esta referencia queda suelto.
        nna_por_carpeta = {
            p["_carpetaId"]: f'{p["nna"]["apellidoPaterno"] or ""} {p["nna"]["nombres"] or ""}'.strip()
            for p in participantes
            if p["tipo"] != "FAMILIAR" and p.get("_carpetaId") and p.get("nna")
        }
        for p in participantes:
            if p["tipo"] == "FAMILIAR" and p.get("familiar"):
                p["familiar"]["nnaRelacionado"] = nna_por_carpeta.get(p.get("_carpetaId"))
            p.pop("_carpetaId", None)

        return participantes

    async def list_familiares_candidatos(self, taller_id: int) -> list:
        """
        Familiares sugeridos para el taller: los registrados en la ficha F03
        de las carpetas a las que pertenecen los NNA ya inscritos.

        Se agrupa por familiar porque dos hermanos de la misma carpeta
        comparten padres y no deben aparecer duplicados.
        """
        if not await familiares_habilitados():
            return []

        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                sql = """
                    SELECT f.ID,
                           MIN(f.NOMBRES)    AS nombres,
                           MIN(f.PARENTESCO) AS parentesco,
                           MIN(f.DNI)        AS dni,
                           MIN(f.TELEFONO)   AS telefono,
                           MIN(f.VIVE_CON)   AS vive_con,
                           MIN(n.APELLIDO_PATERNO || ' ' || n.NOMBRES) AS nna_relacionado,
                           MAX(CASE WHEN ya.ID IS NOT NULL THEN 1 ELSE 0 END) AS ya_inscrito
                    FROM PARTICIPANTE_TALLER pt
                    JOIN NNA n              ON n.ID = pt.NNA_ID
                    JOIN NNA_FAMILIAR f     ON f.CARPETA_ID = n.CARPETA_ID
                    LEFT JOIN PARTICIPANTE_TALLER ya
                           ON ya.TALLER_ID = pt.TALLER_ID
                          AND ya.FAMILIAR_ID = f.ID
                    WHERE pt.TALLER_ID = :taller_id
                      AND pt.TIPO = 'NNA'
                    GROUP BY f.ID
                    ORDER BY MIN(f.NOMBRES)
                """
                await cur.execute(sql, taller_id=taller_id)
                return [
                    {
                        "familiarId": row[0],
                        "nombres": row[1],
                        "parentesco": row[2],
                        "dni": row[3],
                        "telefono": row[4],
                        "viveCon": row[5],
                        "nnaRelacionado": row[6],
                        "yaInscrito": bool(row[7]),
                    }
                    for row in await cur.fetchall()
                ]

    async def recalcular_estado(self, taller_id: int) -> None:
        """
        Deriva el estado del taller de sus datos, en vez de que el educador lo
        marque a mano:

            PLANIFICADO  nadie asistió todavía
            EJECUTADO    hay asistentes, falta evaluar a alguno
            EVALUADO     todos los NNA que asistieron tienen su F8

        Solo cuentan los NNA: el Formato 8 es evaluación individual del NNA, los
        familiares no se evalúan. Un taller CANCELADO no se toca.
        """
        con_familiares = await familiares_habilitados()
        con_evaluado = await estado_evaluado_habilitado()

        # Sin la migración 002 no existe la columna TIPO y todas las filas son NNA.
        filtro_nna = "AND pt.TIPO = 'NNA'" if con_familiares else ""
        # Sin la 003 la base rechaza EVALUADO: se queda en EJECUTADO.
        rama_evaluado = "'EVALUADO'" if con_evaluado else "'EJECUTADO'"

        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    f"""
                    UPDATE TALLER t
                       SET ESTADO = (
                           SELECT CASE
                                    WHEN COUNT(CASE WHEN pt.ASISTE = 1 THEN 1 END) = 0
                                        THEN 'PLANIFICADO'
                                    WHEN COUNT(CASE WHEN pt.ASISTE = 1
                                                     AND pt.EVALUACION IS NULL THEN 1 END) = 0
                                        THEN {rama_evaluado}
                                    ELSE 'EJECUTADO'
                                  END
                             FROM PARTICIPANTE_TALLER pt
                            WHERE pt.TALLER_ID = t.ID
                              {filtro_nna}
                       )
                     WHERE t.ID = :taller_id
                       AND t.ESTADO <> 'CANCELADO'
                    """,
                    taller_id=taller_id,
                )
                await conn.commit()

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
        filtro_tipo = " AND pt.TIPO = 'NNA'" if await familiares_habilitados() else ""
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                sql = f"""
                    SELECT t.*, pt.ASISTE, pt.EVALUACION,
                           u.NOMBRE_COMPLETO as educador_nombre
                    FROM TALLER t
                    JOIN PARTICIPANTE_TALLER pt ON pt.TALLER_ID = t.ID
                    LEFT JOIN SEC_USUARIO u ON u.ID = t.EDUCADOR_ID
                    WHERE pt.NNA_ID = :1{filtro_tipo}
                    ORDER BY t.FECHA_PROGRAMADA DESC
                """
                await cur.execute(sql, [nna_id])
                columns = [col[0].lower() for col in cur.description]
                result = []
                for row in await cur.fetchall():
                    t = self._row_to_dict(row, columns)
                    t["asiste"] = bool(t.get("asiste", 0))
                    t["familiaresAcompanantes"] = []
                    result.append(t)

                # Quién de su familia lo acompañó a cada taller. Es el dato que
                # sostiene los indicadores del F05 sobre el adulto responsable,
                # y hasta ahora no se veía en ninguna parte del expediente.
                if result and await familiares_habilitados():
                    ids = [t["id"] for t in result if t.get("id")]
                    if ids:
                        marcas = ", ".join(f":t{i}" for i in range(len(ids)))
                        binds = {f"t{i}": v for i, v in enumerate(ids)}
                        binds["nna"] = nna_id
                        await cur.execute(
                            f"""
                            SELECT pt.TALLER_ID, f.NOMBRES, f.PARENTESCO, pt.ASISTE
                              FROM PARTICIPANTE_TALLER pt
                              JOIN NNA_FAMILIAR f ON f.ID = pt.FAMILIAR_ID
                             WHERE pt.TIPO = 'FAMILIAR'
                               AND pt.TALLER_ID IN ({marcas})
                               AND f.CARPETA_ID = (SELECT CARPETA_ID FROM NNA WHERE ID = :nna)
                            """,
                            binds,
                        )
                        por_taller = {}
                        for taller_id, nombres, parentesco, asiste in (await cur.fetchall() or []):
                            por_taller.setdefault(taller_id, []).append({
                                "nombres": nombres,
                                "parentesco": parentesco,
                                "asistio": bool(asiste),
                            })
                        for t in result:
                            t["familiaresAcompanantes"] = por_taller.get(t["id"], [])

                return result

    async def list_candidatos(self, taller_id: int, rol: str, user_id: int, sede_id: int) -> list:
        """
        Árbol de candidatos para el selector único: los NNA del ámbito del
        usuario con su familia anidada, marcando quién ya está inscrito.

        El ámbito replica el del listado de NNA: el educador y los
        especialistas ven sus casos, coordinación ve toda la sede.
        """
        con_familiares = await familiares_habilitados()

        if rol in {"MONITOR", "ADMIN_NACIONAL"}:
            filtro_ambito = "1 = 1"
            binds = {}
        elif rol in {"COORDINADOR", "ADMIN_SEDE"}:
            filtro_ambito = """n.ID IN (SELECT NNA_ID FROM NNA_CASO
                                        WHERE SEDE_ID = :sede AND ESTADO != 'CERRADO')"""
            binds = {"sede": sede_id}
        else:
            filtro_ambito = """n.ID IN (SELECT NNA_ID FROM NNA_CASO
                                        WHERE RESPONSABLE_ID = :resp AND ESTADO != 'CERRADO')"""
            binds = {"resp": user_id}

        columnas_familiar = (
            "f.ID, f.NOMBRES, f.PARENTESCO, f.DNI"
            if con_familiares else
            "NULL, NULL, NULL, NULL"
        )
        join_familiar = (
            "LEFT JOIN NNA_FAMILIAR f ON f.CARPETA_ID = n.CARPETA_ID"
            if con_familiares else ""
        )
        orden_familiar = ", f.NOMBRES" if con_familiares else ""

        sql = f"""
            SELECT n.ID, n.NOMBRES, n.APELLIDO_PATERNO, n.APELLIDO_MATERNO,
                   n.NUMERO_DOC, n.FECHA_NACIMIENTO, n.SEXO, c.CODIGO,
                   {columnas_familiar}
              FROM NNA n
              LEFT JOIN NNA_CARPETA c ON c.ID = n.CARPETA_ID
              {join_familiar}
             WHERE {filtro_ambito}
             ORDER BY n.APELLIDO_PATERNO, n.NOMBRES{orden_familiar}
        """

        # Quiénes ya están en el taller, para no ofrecerlos de nuevo
        inscritos_nna: set = set()
        inscritos_fam: set = set()
        for p in await self._get_participantes_for_taller(taller_id):
            if p["tipo"] == "FAMILIAR":
                inscritos_fam.add(p["familiarId"])
            else:
                inscritos_nna.add(p["nnaId"])

        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(sql, binds)
                filas = await cur.fetchall()

        # Una fila por par (NNA, familiar): se agrupa por NNA conservando el orden
        candidatos: dict = {}
        for row in filas:
            nna_id = row[0]
            if nna_id not in candidatos:
                fecha_nac = row[5]
                candidatos[nna_id] = {
                    "nnaId": nna_id,
                    "nombres": row[1],
                    "apellidoPaterno": row[2],
                    "apellidoMaterno": row[3],
                    "numeroDoc": row[4],
                    "fechaNacimiento": fecha_nac.isoformat() if hasattr(fecha_nac, "isoformat") else (str(fecha_nac) if fecha_nac else None),
                    "sexo": row[6],
                    "carpetaCodigo": row[7],
                    "yaInscrito": nna_id in inscritos_nna,
                    "familiares": [],
                    "_vistos": set(),
                }

            familiar_id = row[8]
            if familiar_id and familiar_id not in candidatos[nna_id]["_vistos"]:
                candidatos[nna_id]["_vistos"].add(familiar_id)
                candidatos[nna_id]["familiares"].append({
                    "familiarId": familiar_id,
                    "nombres": row[9],
                    "parentesco": row[10],
                    "dni": row[11],
                    "yaInscrito": familiar_id in inscritos_fam,
                })

        for c in candidatos.values():
            c.pop("_vistos", None)
        return list(candidatos.values())

    async def list_destinos_folio(self, taller_id: int) -> list:
        """
        Expedientes donde debe archivarse la evidencia del taller: un caso
        activo por participante.

        Los familiares no tienen caso propio, así que su evidencia va al
        expediente del NNA del mismo expediente familiar (misma carpeta).
        Se consulta solo al subir evidencia, no en cada listado de talleres.
        """
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    SELECT n.ID,
                           n.APELLIDO_PATERNO || ' ' || n.NOMBRES AS nombre,
                           (SELECT MIN(c.ID)
                              FROM NNA_CASO c
                             WHERE c.NNA_ID = n.ID
                               AND c.ESTADO <> 'CERRADO') AS caso_id
                      FROM PARTICIPANTE_TALLER pt
                      JOIN NNA n ON n.ID = pt.NNA_ID
                     WHERE pt.TALLER_ID = :taller_id
                       AND pt.NNA_ID IS NOT NULL
                     ORDER BY n.APELLIDO_PATERNO, n.NOMBRES
                    """,
                    taller_id=taller_id,
                )
                return [
                    {"nnaId": row[0], "nombre": row[1], "casoId": row[2]}
                    for row in await cur.fetchall()
                ]

    # ---------------------------------------------------------------
    # Participantes (NNA y familiares)
    # ---------------------------------------------------------------
    # Toda referencia se hace con (taller_id, tipo, referencia_id) para
    # que NNA y familiares compartan el mismo camino de código.

    @staticmethod
    def _columna_ref(tipo: str) -> str:
        return "FAMILIAR_ID" if tipo == "FAMILIAR" else "NNA_ID"

    async def add_participante(self, taller_id: int, ref_id: int, tipo: str = "NNA") -> dict:
        con_familiares = await familiares_habilitados()
        if tipo == "FAMILIAR" and not con_familiares:
            raise ValueError(
                "Falta ejecutar la migración 002_participante_familiar.sql "
                "para poder registrar padres o tutores."
            )

        columna = self._columna_ref(tipo)
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    f"SELECT ID FROM PARTICIPANTE_TALLER WHERE TALLER_ID = :1 AND {columna} = :2",
                    [taller_id, ref_id]
                )
                if await cur.fetchone():
                    return await self.get_participante(taller_id, ref_id, tipo)

                if con_familiares:
                    await cur.execute(
                        f"""
                        INSERT INTO PARTICIPANTE_TALLER (TALLER_ID, TIPO, {columna}, ASISTE)
                        VALUES (:1, :2, :3, 0)
                        """,
                        [taller_id, tipo, ref_id]
                    )
                else:
                    await cur.execute(
                        "INSERT INTO PARTICIPANTE_TALLER (TALLER_ID, NNA_ID, ASISTE) VALUES (:1, :2, 0)",
                        [taller_id, ref_id]
                    )
                await conn.commit()

        # Un participante nuevo aún sin asistencia puede devolver el taller a PLANIFICADO.
        await self.recalcular_estado(taller_id)
        return await self.get_participante(taller_id, ref_id, tipo)

    async def add_participantes_bulk(self, taller_id: int, nna_ids: list, familiar_ids: list) -> list:
        """Alta masiva (los checks del educador). Ignora los ya inscritos."""
        for nna_id in nna_ids or []:
            await self.add_participante(taller_id, nna_id, "NNA")
        for familiar_id in familiar_ids or []:
            await self.add_participante(taller_id, familiar_id, "FAMILIAR")
        await self.recalcular_estado(taller_id)
        return await self._get_participantes_for_taller(taller_id)

    async def get_participante(self, taller_id: int, ref_id: int, tipo: str = "NNA") -> dict:
        columna = self._columna_ref(tipo)
        base = _PARTICIPANTE_SELECT if await familiares_habilitados() else _PARTICIPANTE_SELECT_LEGACY
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    base + f" WHERE pt.TALLER_ID = :1 AND pt.{columna} = :2",
                    [taller_id, ref_id]
                )
                row = await cur.fetchone()
                if not row:
                    return None
                participante = self._participante_row_to_dict(row)
                participante.pop("_carpetaId", None)
                return participante

    async def update_participante(self, taller_id: int, ref_id: int, data: dict, tipo: str = "NNA") -> dict:
        if tipo == "FAMILIAR" and not await familiares_habilitados():
            raise ValueError(
                "Falta ejecutar la migración 002_participante_familiar.sql "
                "para poder gestionar padres o tutores."
            )
        columna = self._columna_ref(tipo)
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                if "asistio" in data:
                    await cur.execute(
                        f"UPDATE PARTICIPANTE_TALLER SET ASISTE = :1 WHERE TALLER_ID = :2 AND {columna} = :3",
                        [1 if data["asistio"] else 0, taller_id, ref_id]
                    )
                if any(k in data for k in ["logros", "limitaciones", "sugerencias", "evaluacion"]):
                    if "evaluacion" in data and data["evaluacion"] is not None:
                        eval_str = data["evaluacion"]
                    else:
                        await cur.execute(
                            f"SELECT EVALUACION FROM PARTICIPANTE_TALLER WHERE TALLER_ID = :1 AND {columna} = :2",
                            [taller_id, ref_id]
                        )
                        row = await cur.fetchone()
                        existente = row[0] if row else ""
                        ex_logros, ex_lim, ex_sug = self._parse_evaluacion(existente)
                        logros = data.get("logros", ex_logros)
                        limitaciones = data.get("limitaciones", ex_lim)
                        sugerencias = data.get("sugerencias", ex_sug)
                        eval_str = f"Logros: {logros or '—'}\nLimitaciones: {limitaciones or '—'}\nSugerencias: {sugerencias or '—'}"
                    await cur.execute(
                        f"UPDATE PARTICIPANTE_TALLER SET EVALUACION = :1 WHERE TALLER_ID = :2 AND {columna} = :3",
                        [eval_str[:500], taller_id, ref_id]
                    )
                await conn.commit()

        # La asistencia y la evaluación son justo lo que define el estado.
        await self.recalcular_estado(taller_id)
        return await self.get_participante(taller_id, ref_id, tipo)

    async def remove_participante(self, taller_id: int, ref_id: int, tipo: str = "NNA") -> bool:
        if tipo == "FAMILIAR" and not await familiares_habilitados():
            return False
        columna = self._columna_ref(tipo)
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    f"DELETE FROM PARTICIPANTE_TALLER WHERE TALLER_ID = :1 AND {columna} = :2",
                    [taller_id, ref_id]
                )
                filas = cur.rowcount
                await conn.commit()

        # Quitar al último asistente puede devolver el taller a PLANIFICADO.
        await self.recalcular_estado(taller_id)
        return filas > 0
