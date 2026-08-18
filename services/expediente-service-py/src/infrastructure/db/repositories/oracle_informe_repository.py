import inspect
from typing import Optional
from datetime import datetime
from src.domain.entities.informe_cierre import InformeCierre
from src.infrastructure.db.connection import get_pool

_SELECT = """
    SELECT ID, CODIGO_INFORME, CASO_ID, MOTIVO_EGRESO, FECHA_EGRESO,
           SITUACION_FAMILIAR, SITUACION_EDUCATIVA, LOGROS_ALCANZADOS,
           RECOMENDACIONES, ARCHIVO_URL, CREADO_POR_ID, CREATED_AT, ESTADO, DETALLES
    FROM EXP_INFORME_CIERRE
"""


async def _row_to_informe(row) -> InformeCierre:
    # CLOB reading helper
    async def read_clob(val):
        if val is None:
            return None
        if hasattr(val, "read"):
            res = val.read()
            if inspect.isawaitable(res):
                return await res
            return res
        return val

    return InformeCierre(
        id=row[0], codigo_informe=row[1], caso_id=row[2], motivo_egreso=row[3],
        fecha_egreso=row[4], situacion_familiar=row[5], situacion_educativa=row[6],
        logros_alcanzados=row[7], recomendaciones=row[8], archivo_url=row[9],
        creado_por_id=row[10], created_at=row[11], estado=row[12],
        detalles=await read_clob(row[13])
    )


class OracleInformeRepository:

    async def marcar_caso_egresado(self, caso_id: int, fecha_egreso, usuario_id: int) -> None:
        """
        Cierra el caso al finalizarse la Ficha de Egreso (F13).

        Causa raíz del bug que arregla: CerrarCasoUseCase creaba el informe y
        el folio INF, pero nunca tocaba NNA_CASO — pese a que su propio
        docstring decía "marca el caso como CERRADO". Resultado: todos los NNA
        egresados seguían contando como activos en los cuatro tableros y en la
        carga de trabajo de su educador.

        Cierra tres cosas a la vez:
          * el caso            → ESTADO 'CERRADO'
          * su avance          → FASE 'EGRESADO'
          * la fase en curso   → FECHA_FIN en CASO_FASE

        Un egreso puede ocurrir en cualquier fase: la guía prevé causales
        excepcionales (derivación, variación de la medida de protección), así
        que no se exige haber llegado a la Fase III.

        No revienta si CASO_FASE aún no existe: durante la transición puede
        haber servicios desplegados antes de la migración 013.
        """
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    UPDATE NNA_CASO
                       SET ESTADO       = 'CERRADO',
                           FASE         = 'EGRESADO',
                           FECHA_CIERRE = NVL(FECHA_CIERRE, :1),
                           UPDATED_AT   = SYSTIMESTAMP
                     WHERE ID = :2
                    """,
                    [fecha_egreso, caso_id],
                )

                try:
                    await cur.execute(
                        """
                        UPDATE CASO_FASE
                           SET FECHA_FIN = NVL(FECHA_FIN, CAST(:1 AS DATE)),
                               ESTADO    = 'CERRADA'
                         WHERE CASO_ID = :2 AND FECHA_FIN IS NULL
                        """,
                        [fecha_egreso, caso_id],
                    )
                except Exception:
                    pass  # tabla aún no creada: el cierre del caso ya quedó hecho

                try:
                    await cur.execute(
                        """
                        INSERT INTO NNA_HISTORIAL_ESTADO
                            (CASO_ID, ESTADO_ANTERIOR, ESTADO_NUEVO, USUARIO_ID,
                             FECHA_CAMBIO, MOTIVO, TIPO_CAMBIO)
                        VALUES (:1, NULL, 'EGRESADO', :2, SYSTIMESTAMP,
                                'Egreso del servicio (Ficha F13)', 'FASE')
                        """,
                        [caso_id, usuario_id],
                    )
                except Exception:
                    pass  # la auditoría no debe impedir el cierre del caso

                await conn.commit()

    async def find_by_caso(self, caso_id: int) -> Optional[InformeCierre]:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(f"{_SELECT} WHERE CASO_ID = :caso", {"caso": caso_id})
                row = await cur.fetchone()
                return await _row_to_informe(row) if row else None

    async def get_sede_codigo(self, sede_id: int) -> str:
        if not sede_id:
            raise ValueError("La cuenta no tiene sede asignada. No se puede generar el código del informe de cierre.")
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT NOMBRE FROM SEC_SEDE WHERE ID = :sede_id", {"sede_id": sede_id})
                row = await cur.fetchone()
                if not row:
                    raise ValueError(f"No se encontró la sede con ID {sede_id} en la base de datos.")
                nombre = row[0]
                nom = nombre.upper().strip()
                mapping = {
                    "LIMA": "LIM",
                    "SEDE CENTRAL LIMA": "LIM",
                    "HUARAL": "HUA",
                    "HUANCAYO": "HYO",
                    "JUNÍN": "HYO",
                    "JUNIN": "HYO",
                    "AREQUIPA": "ARE",
                    "LA LIBERTAD": "TRU",
                    "TRUJILLO": "TRU",
                    "LAMBAYEQUE": "CHI",
                    "CHICLAYO": "CHI",
                    "CAJAMARCA": "CAJ",
                    "JAÉN": "JAE",
                    "JAEN": "JAE",
                    "PIURA": "PIU",
                    "TUMBES": "TUM",
                    "CUSCO": "CUS",
                    "PUNO": "PUN",
                    "TACNA": "TAC",
                    "ICA": "ICA",
                    "AYACUCHO": "AYA",
                    "APURÍMAC": "APU",
                    "APURIMAC": "APU",
                    "HUÁNUCO": "HCO",
                    "HUANUCO": "HCO",
                    "ANCASH": "ANC",
                    "LORETO": "IQU",
                    "IQUITOS": "IQU",
                    "UCAYALI": "PUC",
                    "PUCALLPA": "PUC",
                    "HUANCAVELICA": "HVC",
                    "MOQUEGUA": "MOQ",
                    "PASCO": "PAS",
                    "CALLAO": "CAL",
                    "TARAPOTO": "TAR",
                    "CHACHAPOYAS": "CHA"
                }
                return mapping.get(nom, nom[:3])

    async def get_caso_sede_id(self, caso_id: int) -> int | None:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT SEDE_ID FROM NNA_CASO WHERE ID = :1", [caso_id])
                row = await cur.fetchone()
                return row[0] if row else None

    async def get_caso_responsable_id(self, caso_id: int) -> Optional[int]:
        """Educador a cargo del caso. Se usa para validar quién puede firmar."""
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "SELECT RESPONSABLE_ID FROM NNA_CASO WHERE ID = :1", [caso_id]
                )
                row = await cur.fetchone()
                return row[0] if row else None

    async def get_next_correlativo(self, anio: int, sede_codigo: str) -> int:
        """
        Siguiente número de la serie INF-<sede>-<año>-NNNN.

        Se calcula sobre los CÓDIGOS YA EMITIDOS, no contando filas.

        Antes contaba informes de la sede en el año, y funcionaba solo porque el
        número se pedía justo antes del INSERT: la fila aún no existía, así que
        el conteo avanzaba solo. Al mover la asignación a la firma del
        coordinador eso se rompe — entre dos firmas el número de filas no
        cambia, y ambas recibirían el mismo correlativo.

        REGEXP_SUBSTR toma los dígitos del final del código; el LIKE acota a la
        serie de esa sede y ese año.
        """
        patron = f"INF-{sede_codigo}-{anio}-%"
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    SELECT NVL(MAX(TO_NUMBER(REGEXP_SUBSTR(CODIGO_INFORME, '[0-9]+$'))), 0)
                      FROM EXP_INFORME_CIERRE
                     WHERE CODIGO_INFORME LIKE :patron
                    """,
                    {"patron": patron},
                )
                row = await cur.fetchone()
                return (row[0] or 0) + 1

    async def create(self, caso_id, codigo_informe, motivo_egreso, fecha_egreso,
                     situacion_familiar, situacion_educativa, logros_alcanzados,
                     recomendaciones, archivo_url, creado_por_id, estado: str = "FINALIZADO", detalles: Optional[str] = None) -> InformeCierre:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                out_id = cur.var(int)
                await cur.execute(
                    """INSERT INTO EXP_INFORME_CIERRE
                       (CASO_ID, CODIGO_INFORME, MOTIVO_EGRESO, FECHA_EGRESO,
                        SITUACION_FAMILIAR, SITUACION_EDUCATIVA, LOGROS_ALCANZADOS,
                        RECOMENDACIONES, ARCHIVO_URL, CREADO_POR_ID, ESTADO, DETALLES)
                       VALUES (:caso, :codigo, :motivo, :fecha, :fam, :edu,
                               :logros, :recom, :url, :usr, :estado, :detalles)
                       RETURNING ID INTO :out_id""",
                    {
                        "caso": caso_id, "codigo": codigo_informe,
                        "motivo": motivo_egreso, "fecha": fecha_egreso,
                        "fam": situacion_familiar, "edu": situacion_educativa,
                        "logros": logros_alcanzados, "recom": recomendaciones,
                        "url": archivo_url, "usr": creado_por_id, "estado": estado,
                        "detalles": detalles, "out_id": out_id,
                    },
                )
                await conn.commit()
                new_id = out_id.getvalue()[0]

        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(f"{_SELECT} WHERE ID = :id", {"id": new_id})
                return await _row_to_informe(await cur.fetchone())

    async def update(self, id: int, motivo_egreso, fecha_egreso,
                    situacion_familiar, situacion_educativa, logros_alcanzados,
                    recomendaciones, archivo_url, estado, detalles: Optional[str] = None) -> InformeCierre:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                # ARCHIVO_URL con NVL: guardar un borrador NO envía la URL del
                # PDF, y asignarla a ciegas la borraba. Antes daba igual porque
                # una ficha finalizada no se podía re-guardar; ahora que se puede
                # corregir una ficha OBSERVADA, cada corrección dejaría el folio
                # del expediente apuntando a nada.
                await cur.execute(
                    """
                    UPDATE EXP_INFORME_CIERRE
                       SET MOTIVO_EGRESO      = :motivo,
                           FECHA_EGRESO       = :fecha,
                           SITUACION_FAMILIAR = :sit_fam,
                           SITUACION_EDUCATIVA = :sit_edu,
                           LOGROS_ALCANZADOS  = :logros,
                           RECOMENDACIONES    = :recom,
                           ARCHIVO_URL        = NVL(:archivo, ARCHIVO_URL),
                           ESTADO             = :estado,
                           DETALLES           = :detalles,
                           UPDATED_AT         = SYSTIMESTAMP
                     WHERE ID = :id
                    """,
                    {
                        "motivo": motivo_egreso, "fecha": fecha_egreso,
                        "sit_fam": situacion_familiar, "sit_edu": situacion_educativa,
                        "logros": logros_alcanzados, "recom": recomendaciones,
                        # Cadena vacía cuenta como "no enviado": el cliente manda
                        # '' en los campos que dejó de usar.
                        "archivo": archivo_url or None,
                        "estado": estado, "detalles": detalles, "id": id,
                    },
                )
                await conn.commit()

        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(f"{_SELECT} WHERE ID = :id", {"id": id})
                return await _row_to_informe(await cur.fetchone())

    # ── Circuito de firma ─────────────────────────────────────────────────────

    async def find_by_id(self, id: int) -> Optional[InformeCierre]:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(f"{_SELECT} WHERE ID = :id", {"id": id})
                row = await cur.fetchone()
                return await _row_to_informe(row) if row else None

    async def set_estado_y_detalles(
        self, id: int, estado: str, detalles: str,
        codigo_informe: str | None = None,
    ) -> None:
        """
        Cambia el estado de la ficha y reescribe sus detalles.

        Las firmas y las observaciones viven dentro de `DETALLES` —un CLOB con
        el resto del formulario— para no tener que agregar columnas: son datos
        de la ficha, no del expediente.

        `codigo_informe` solo llega al firmar el coordinador, que es cuando la
        ficha se vuelve un documento oficial y recién ahí consume correlativo.
        Se aplica con NVL sobre el propio valor para no borrarlo en los demás
        cambios de estado.
        """
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    UPDATE EXP_INFORME_CIERRE
                       SET ESTADO = :estado,
                           DETALLES = :detalles,
                           CODIGO_INFORME = NVL(:codigo, CODIGO_INFORME),
                           UPDATED_AT = SYSTIMESTAMP
                     WHERE ID = :id
                    """,
                    {"estado": estado, "detalles": detalles,
                     "codigo": codigo_informe, "id": id},
                )
                await conn.commit()

    async def actualizar_titulo_folio_inf(self, caso_id: int, codigo_informe: str) -> None:
        """
        Completa el título del folio INF con el correlativo recién asignado.

        El folio se crea al finalizar la ficha, cuando todavía no hay número, y
        queda como "Informe de Cierre — pendiente de firma". Al firmar el
        coordinador se le pone el correlativo real, para que el expediente
        muestre el mismo número que el documento.
        """
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    UPDATE EXP_FOLIO
                       SET TITULO = :titulo
                     WHERE CASO_ID = :caso AND TIPO_DOCUMENTO = 'INF'
                    """,
                    {"titulo": f"Informe de Cierre — {codigo_informe}", "caso": caso_id},
                )
                await conn.commit()

    async def get_nombre_usuario(self, user_id: int) -> str:
        """
        Nombre de quien firma.

        El token solo trae el id, el rol y la sede: el nombre hay que buscarlo.
        Sin esto, la ficha se firmaría sin nombre debajo de la línea.
        """
        if not user_id:
            return ""
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "SELECT NOMBRE_COMPLETO FROM SEC_USUARIO WHERE ID = :id",
                    {"id": user_id},
                )
                row = await cur.fetchone()
                return row[0] if row else ""

    async def list_pendientes_firma(self, sede_id: int) -> list[dict]:
        """
        Fichas de la sede esperando la firma del coordinador.

        Trae el nombre del NNA y del educador porque la bandeja se lee de un
        vistazo: sin ellos el coordinador tendría que abrir una por una para
        saber de quién es cada ficha.
        """
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    SELECT i.ID, i.CODIGO_INFORME, i.CASO_ID, i.FECHA_EGRESO, i.ESTADO,
                           i.UPDATED_AT,
                           n.ID, n.NOMBRES, n.APELLIDO_PATERNO, n.APELLIDO_MATERNO,
                           u.NOMBRE_COMPLETO
                    FROM   EXP_INFORME_CIERRE i
                    JOIN   NNA_CASO c    ON c.ID = i.CASO_ID
                    JOIN   NNA n         ON n.ID = c.NNA_ID
                    LEFT   JOIN SEC_USUARIO u ON u.ID = i.CREADO_POR_ID
                    WHERE  c.SEDE_ID = :sede
                    AND    i.ESTADO  = 'PEND_COORDINADOR'
                    ORDER  BY i.UPDATED_AT
                    """,
                    {"sede": sede_id},
                )
                filas = await cur.fetchall()

        return [
            {
                "id":             f[0],
                "codigoInforme":  f[1],
                "casoId":         f[2],
                "fechaEgreso":    str(f[3]) if f[3] else None,
                "estado":         f[4],
                "enviadoEl":      str(f[5]) if f[5] else None,
                "nnaId":          f[6],
                "nna":            f"{f[7]} {f[8]} {f[9] or ''}".strip(),
                "educador":       f[10] or "",
            }
            for f in filas
        ]

