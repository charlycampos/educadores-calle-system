"""
Repositorio del tracking de fases (tabla CASO_FASE).

Regla del modelo: la fase vigente de un caso es la fila con FECHA_FIN NULL.
Nunca hay dos. `NNA_CASO.FASE` es la caché de esa fila, para que los tableros
no tengan que hacer join en cada consulta.

Todo lo que promueve de fase pasa por `cerrar_y_promover`, en una sola
transacción. Si se parte en varios commits, un fallo a mitad deja el caso en
un estado imposible: fase cerrada sin la siguiente abierta.
"""
from datetime import date

from src.infrastructure.db.connection import get_pool
from src.domain import fases as cat


class OracleCasoFaseRepository:

    # ── Lectura ─────────────────────────────────────────────────────────────

    async def historial(self, caso_id: int) -> list[dict]:
        """
        Todas las fases transitadas por el caso, en orden.

        Devuelve el cálculo ya hecho —días transcurridos, fecha límite, si está
        vencida— para que el frontend no reimplemente la aritmética de plazos.
        Que ese cálculo viva en un solo lugar es justamente lo que evita que
        cada pantalla invente su propia versión de la fase, que es el problema
        que este módulo vino a resolver.
        """
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    SELECT FASE, FECHA_INICIO, FECHA_FIN, PLAZO_MESES,
                           MESES_EXTENSION, ESTADO, CERRADA_POR_ID, OBSERVACION,
                           ADD_MONTHS(FECHA_INICIO, PLAZO_MESES + MESES_EXTENSION) AS FECHA_LIMITE,
                           TRUNC(NVL(FECHA_FIN, SYSDATE) - FECHA_INICIO)           AS DIAS_TRANSCURRIDOS
                      FROM CASO_FASE
                     WHERE CASO_ID = :1
                     ORDER BY DECODE(FASE, 'I', 1, 'II', 2, 'III', 3)
                    """,
                    [caso_id],
                )
                filas = await cur.fetchall()

        hoy = date.today()
        historial = []
        for f in filas:
            (fase, inicio, fin, plazo, extension, estado,
             cerrada_por, obs, limite, dias) = f

            limite_d = limite.date() if hasattr(limite, "date") else limite
            vigente  = fin is None
            # Solo una fase abierta puede estar vencida: una cerrada ya es
            # historia, aunque haya durado más de la cuenta.
            vencida  = vigente and limite_d is not None and limite_d < hoy

            historial.append({
                "fase":              fase,
                "nombre":            cat.NOMBRE.get(fase, fase),
                "nombreCorto":       cat.NOMBRE_CORTO.get(fase, fase),
                "etiqueta":          cat.etiqueta(fase),
                "fechaInicio":       inicio.isoformat() if inicio else None,
                "fechaFin":          fin.isoformat() if fin else None,
                "plazoMeses":        plazo,
                "mesesExtension":    extension,
                "extensionMaxima":   cat.EXTENSION_MAXIMA.get(fase, 0),
                "estado":            estado,
                "cerradaPorId":      cerrada_por,
                "observacion":       obs,
                "fechaLimite":       limite_d.isoformat() if limite_d else None,
                "diasTranscurridos": int(dias) if dias is not None else None,
                "vigente":           vigente,
                "vencida":           vencida,
                "diasVencida":       (hoy - limite_d).days if vencida else 0,
            })
        return historial

    async def fase_vigente(self, caso_id: int) -> dict | None:
        """La fase abierta del caso, o None si el caso egresó."""
        return next((f for f in await self.historial(caso_id) if f["vigente"]), None)

    async def vencidas_por_responsable(self, responsable_id: int) -> list[dict]:
        """
        Fases vencidas de los casos a cargo de un educador. Alimenta las
        alertas del tablero: el plazo vencido avisa, no promueve.
        """
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    SELECT c.ID, c.NNA_ID, f.FASE,
                           TRUNC(SYSDATE - ADD_MONTHS(f.FECHA_INICIO,
                                 f.PLAZO_MESES + f.MESES_EXTENSION)) AS DIAS_VENCIDA
                      FROM CASO_FASE f
                      JOIN NNA_CASO c ON c.ID = f.CASO_ID
                     WHERE f.FECHA_FIN IS NULL
                       AND c.RESPONSABLE_ID = :1
                       AND c.ESTADO <> 'CERRADO'
                       AND ADD_MONTHS(f.FECHA_INICIO,
                                      f.PLAZO_MESES + f.MESES_EXTENSION) < SYSDATE
                     ORDER BY DIAS_VENCIDA DESC
                    """,
                    [responsable_id],
                )
                filas = await cur.fetchall()

        return [
            {
                "casoId":      r[0],
                "nnaId":       r[1],
                "fase":        r[2],
                "etiqueta":    cat.etiqueta(r[2]),
                "diasVencida": int(r[3]) if r[3] else 0,
            }
            for r in filas
        ]

    # ── Escritura ───────────────────────────────────────────────────────────

    async def abrir_fase_inicial(self, caso_id: int, fecha_inicio: date) -> None:
        """
        Abre la Fase I. Se llama al crear el caso.

        Idempotente a propósito: si el caso ya tiene historial no hace nada,
        para que reprocesar un alta no duplique la fila ni pise la fecha real.
        """
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "SELECT COUNT(*) FROM CASO_FASE WHERE CASO_ID = :1", [caso_id]
                )
                (existe,) = await cur.fetchone()
                if existe:
                    return

                await cur.execute(
                    """
                    INSERT INTO CASO_FASE
                        (CASO_ID, FASE, FECHA_INICIO, PLAZO_MESES, ESTADO)
                    VALUES (:1, 'I', :2, :3, 'EN_CURSO')
                    """,
                    [caso_id, fecha_inicio, cat.PLAZO_MESES["I"]],
                )
                await cur.execute(
                    "UPDATE NNA_CASO SET FASE = 'I', UPDATED_AT = SYSTIMESTAMP WHERE ID = :1",
                    [caso_id],
                )
                await conn.commit()

    async def cerrar_y_promover(
        self,
        caso_id: int,
        fase: str,
        fecha_fin: date,
        cerrada_por_id: int | None = None,
        observacion: str | None = None,
    ) -> dict:
        """
        Cierra la fase indicada y abre la siguiente, en una transacción.

        Cuatro escrituras que van juntas o no van:
          1. sella FECHA_FIN de la fase que cierra
          2. abre la siguiente, empezando al DÍA SIGUIENTE
             (acuerdo de María del Carmen, reunión 05/08/2026: "terminó el 30
             de agosto la fase 1, la fase 2 tendría que empezar el primero de
             septiembre")
          3. actualiza la caché NNA_CASO.FASE
          4. deja el rastro en NNA_HISTORIAL_ESTADO

        Cerrar la Fase III no egresa al NNA: el egreso lo declara el F13. Por
        eso, al cerrar la III, el caso se queda en 'III' y sin fase abierta.
        """
        if fase not in cat.FASES:
            raise ValueError(f"Fase inválida: {fase}")

        siguiente = cat.SIGUIENTE[fase]
        pool = get_pool()

        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                # La fila puede no existir en casos anteriores a la migración
                # 013 o creados sin pasar por abrir_fase_inicial. Se abre con
                # la fecha de apertura del caso para no perder el registro.
                await cur.execute(
                    "SELECT COUNT(*) FROM CASO_FASE WHERE CASO_ID = :1 AND FASE = :2",
                    [caso_id, fase],
                )
                (existe,) = await cur.fetchone()
                if not existe:
                    await cur.execute(
                        """
                        INSERT INTO CASO_FASE
                            (CASO_ID, FASE, FECHA_INICIO, PLAZO_MESES, ESTADO, OBSERVACION)
                        SELECT :1, :2, CAST(FECHA_APERTURA AS DATE), :3, 'EN_CURSO',
                               'Fase abierta al cerrarla: el caso no tenia tracking previo'
                          FROM NNA_CASO WHERE ID = :1
                        """,
                        [caso_id, fase, cat.PLAZO_MESES[fase]],
                    )

                await cur.execute(
                    """
                    UPDATE CASO_FASE
                       SET FECHA_FIN      = :1,
                           ESTADO         = 'CERRADA',
                           CERRADA_POR_ID = :2,
                           OBSERVACION    = NVL(:3, OBSERVACION)
                     WHERE CASO_ID = :4 AND FASE = :5
                    """,
                    [fecha_fin, cerrada_por_id, observacion, caso_id, fase],
                )

                # Cerrar también las fases anteriores que hayan quedado
                # abiertas. El F05 no impone la secuencia a propósito: el
                # educador puede cerrar la Fase II sin haber cerrado la I. Sin
                # esto quedarían dos filas vigentes y se rompería la invariante
                # de que la fase abierta es una sola.
                await cur.execute(
                    """
                    UPDATE CASO_FASE
                       SET FECHA_FIN   = :1,
                           ESTADO      = 'CERRADA',
                           OBSERVACION = NVL(OBSERVACION,
                               'Cerrada automaticamente al cerrarse una fase posterior')
                     WHERE CASO_ID = :2
                       AND FECHA_FIN IS NULL
                       AND DECODE(FASE, 'I', 1, 'II', 2, 'III', 3)
                           < DECODE(:3, 'I', 1, 'II', 2, 'III', 3)
                    """,
                    [fecha_fin, caso_id, fase],
                )

                if siguiente:
                    await cur.execute(
                        "SELECT COUNT(*) FROM CASO_FASE WHERE CASO_ID = :1 AND FASE = :2",
                        [caso_id, siguiente],
                    )
                    (ya_abierta,) = await cur.fetchone()
                    if not ya_abierta:
                        await cur.execute(
                            """
                            INSERT INTO CASO_FASE
                                (CASO_ID, FASE, FECHA_INICIO, PLAZO_MESES, ESTADO)
                            VALUES (:1, :2, :3 + 1, :4, 'EN_CURSO')
                            """,
                            [caso_id, siguiente, fecha_fin, cat.PLAZO_MESES[siguiente]],
                        )

                nueva_fase = siguiente or fase
                await cur.execute(
                    """
                    UPDATE NNA_CASO
                       SET FASE = :1, UPDATED_AT = SYSTIMESTAMP
                     WHERE ID = :2 AND FASE <> 'EGRESADO'
                    """,
                    [nueva_fase, caso_id],
                )

                # Se guardan los códigos ('I', 'II'), no las etiquetas:
                # ESTADO_ANTERIOR y ESTADO_NUEVO son VARCHAR2(30) y
                # "Fase II: Restitución de Derechos" mide 33 bytes en AL32UTF8
                # (las tildes ocupan dos). Guardar la etiqueta lanzaba ORA-12899
                # y, como este INSERT va dentro de la transacción, tumbaba la
                # promoción entera: la fecha quedaba sellada en el F05 pero el
                # caso no avanzaba de fase.
                await self._registrar_historial(
                    cur, caso_id, fase, nueva_fase,
                    cerrada_por_id, f"Cierre de la Fase {fase}",
                )

                await conn.commit()

        return {"faseCerrada": fase, "faseVigente": siguiente, "fechaFin": fecha_fin.isoformat()}

    async def extender(
        self, caso_id: int, fase: str, meses: int = 1, motivo: str | None = None
    ) -> None:
        """
        Otorga meses de extensión a una fase en curso, con Informe Técnico.
        Solo las fases I y II admiten extensión, y como máximo 1 mes.
        """
        maximo = cat.EXTENSION_MAXIMA.get(fase, 0)
        if meses > maximo:
            raise ValueError(
                f"La Fase {fase} admite como máximo {maximo} mes(es) de extensión."
            )

        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    UPDATE CASO_FASE
                       SET MESES_EXTENSION = :1,
                           ESTADO          = 'EXTENDIDA',
                           OBSERVACION     = NVL(:2, OBSERVACION)
                     WHERE CASO_ID = :3 AND FASE = :4 AND FECHA_FIN IS NULL
                    """,
                    [meses, motivo, caso_id, fase],
                )
                await conn.commit()

    async def marcar_egresado(
        self, caso_id: int, fecha_egreso: date, usuario_id: int | None = None
    ) -> None:
        """
        Cierra la fase abierta y marca el caso como egresado.

        Lo llama el F13 al finalizarse. Antes de esto, cerrar la Ficha de Egreso
        creaba el informe y el folio pero no tocaba NNA_CASO, así que los
        egresados seguían contando como activos en los cuatro tableros.
        """
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    UPDATE CASO_FASE
                       SET FECHA_FIN = :1, ESTADO = 'CERRADA'
                     WHERE CASO_ID = :2 AND FECHA_FIN IS NULL
                    """,
                    [fecha_egreso, caso_id],
                )
                await cur.execute(
                    """
                    UPDATE NNA_CASO
                       SET FASE         = 'EGRESADO',
                           ESTADO       = 'CERRADO',
                           FECHA_CIERRE = NVL(FECHA_CIERRE, SYSTIMESTAMP),
                           UPDATED_AT   = SYSTIMESTAMP
                     WHERE ID = :1
                    """,
                    [caso_id],
                )
                await self._registrar_historial(
                    cur, caso_id, None, "EGRESADO", usuario_id,
                    "Egreso del servicio (Ficha F13)",
                )
                await conn.commit()

    # ── Auditoría ───────────────────────────────────────────────────────────

    async def _registrar_historial(
        self, cur, caso_id: int, anterior: str | None, nuevo: str,
        usuario_id: int | None, motivo: str,
    ) -> None:
        """
        Deja el rastro en NNA_HISTORIAL_ESTADO: quién movió el caso y cuándo.

        Sin esto el tracking dice dónde está el NNA pero no cómo llegó, que es
        justo lo que hace falta para responderle a la DGNNA. USUARIO_ID es NOT
        NULL en la tabla, así que un cambio sin usuario identificado no se
        registra en vez de romper la transacción entera — el dato principal
        (la fase) ya quedó guardado.

        Por la misma razón el INSERT va protegido y los textos se recortan:
        ESTADO_ANTERIOR y ESTADO_NUEVO son VARCHAR2(30), y una etiqueta como
        "Fase II: Restitución de Derechos" ocupa 33 bytes en AL32UTF8. La
        auditoría es valiosa, pero no al precio de impedir que un educador
        cierre una fase.
        """
        if usuario_id is None:
            return
        try:
            await cur.execute(
                """
                INSERT INTO NNA_HISTORIAL_ESTADO
                    (CASO_ID, ESTADO_ANTERIOR, ESTADO_NUEVO, USUARIO_ID, FECHA_CAMBIO, MOTIVO, TIPO_CAMBIO)
                VALUES (:1, :2, :3, :4, SYSTIMESTAMP, :5, 'FASE')
                """,
                [caso_id, anterior[:30] if anterior else None, nuevo[:30],
                 usuario_id, (motivo or "")[:200]],
            )
        except Exception as e:
            print(f"No se pudo auditar el cambio de fase del caso {caso_id}: {e}")
