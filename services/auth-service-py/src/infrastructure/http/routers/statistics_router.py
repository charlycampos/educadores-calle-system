"""
statistics_router.py — Estadísticas del dashboard para todos los roles.
Consulta directamente las tablas Oracle: NNA_CASO, NNA, SEC_USUARIO.
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status

from src.infrastructure.http.middleware.jwt_middleware import get_current_user, require_roles
from src.infrastructure.db.connection import get_pool

router = APIRouter(prefix="/api/statistics", tags=["statistics"])

# Roles que pueden ver estadísticas globales (sede o nacional)
ROLES_ADMIN = ("ADMIN_NACIONAL", "ADMIN_SEDE", "COORDINADOR")
ROLES_CAMPO = ("EDUCADOR", "PSICOLOGO", "TRABAJADOR_SOCIAL", "ABOGADO")

# ── Fases del servicio (RDE 069-2021, ver GUIA_OPERATIVA_SEC.md) ─────────────
#
# Antes aquí había un diccionario que traducía NNA_CASO.ESTADO a etiquetas de
# fase. Producía tres errores a la vez:
#
#   * mapeaba 'PRE_EGRESO', un estado que el dominio nunca produce, así que la
#     Fase 3 salía siempre en cero;
#   * no mapeaba 'SEGUIMIENTO' ni 'DERIVADO', que sí existen;
#   * partía la Fase 1 en dos filas ('CAPTACION' y 'EN_EVALUACION').
#
# Y el expediente-service tenía OTRO diccionario distinto sobre la misma
# columna. Ahora ambos leen NNA_CASO.FASE, que escribe el cierre de fase del F05.
_FASE_LABEL = {
    "I":        "Fase I: Contacto e Integración",
    "II":       "Fase II: Restitución de Derechos",
    "III":      "Fase III: Seguimiento y Egreso",
    "EGRESADO": "Egresados",
}

_COLOR_FASE = {
    "I":        "#fcd34d",
    "II":       "#60a5fa",
    "III":      "#34d399",
    "EGRESADO": "#94a3b8",
}

# Plazo normativo de cada fase, en meses. El frontend lo usa para el semáforo
# sin tener que reimplementar la norma.
_PLAZO_MESES = {"I": 3, "II": 15, "III": 6}


async def _query(sql: str, params: dict = None):
    """Ejecuta una query y devuelve todas las filas."""
    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(sql, params or {})
            return await cur.fetchall()


async def _scalar(sql: str, params: dict = None):
    """Ejecuta una query y devuelve el primer valor de la primera fila."""
    rows = await _query(sql, params)
    return rows[0][0] if rows else 0


# ── /api/statistics/dashboard ─────────────────────────────────────────────────
@router.get("/dashboard")
async def dashboard(user: dict = Depends(get_current_user)):
    """
    Estadísticas del dashboard. Filtra por sede si el usuario no es ADMIN_NACIONAL.
    """
    rol      = user.get("rol", "")
    sede_id  = user.get("sedeId")
    user_id  = user.get("userId")
    es_nacional = (rol == "ADMIN_NACIONAL")
    es_campo    = (rol in ROLES_CAMPO)

    try:
        # ── Filtro base ────────────────────────────────────────────────────────
        if es_campo:
            where_base  = "WHERE c.RESPONSABLE_ID = :1"
            params_base = [user_id]
        elif es_nacional:
            where_base  = "WHERE 1=1"
            params_base = {}
        else:
            # ADMIN_SEDE o COORDINADOR → filtra por sede
            where_base  = "WHERE c.SEDE_ID = :1"
            params_base = [sede_id]

        # ── 1. Total de casos ──────────────────────────────────────────────────
        total_casos = await _scalar(
            f"SELECT COUNT(*) FROM NNA_CASO c {where_base}", params_base
        )

        # ── 2. Casos por fase ──────────────────────────────────────────────────
        # Agrupa por FASE (el avance metodológico), no por ESTADO (la situación
        # administrativa). Los egresados salen aparte y no inflan las fases.
        rows_fases = await _query(
            f"""SELECT c.FASE, COUNT(*) FROM NNA_CASO c {where_base}
                GROUP BY c.FASE
                ORDER BY DECODE(c.FASE, 'I', 1, 'II', 2, 'III', 3, 'EGRESADO', 4, 5)""",
            params_base,
        )
        fases = [
            {
                "fase":       _FASE_LABEL.get(r[0], r[0]),
                "codigo":     r[0],
                "cantidad":   r[1],
                "color":      _COLOR_FASE.get(r[0], "#e2e8f0"),
                "plazoMeses": _PLAZO_MESES.get(r[0]),
            }
            for r in rows_fases
        ]

        # ── 3. Carga laboral (casos por educador) ──────────────────────────────
        rows_carga = await _query(
            f"""
            SELECT u.NOMBRE_COMPLETO, COUNT(c.ID)
            FROM NNA_CASO c
            JOIN SEC_USUARIO u ON u.ID = c.RESPONSABLE_ID
            {where_base}
            GROUP BY u.NOMBRE_COMPLETO
            ORDER BY COUNT(c.ID) DESC
            """,
            params_base,
        )
        rows_carga = rows_carga[:15]
        carga_laboral = [{"educador": r[0], "cantidad": r[1]} for r in rows_carga]

        # ── 4. Alertas de calidad ──────────────────────────────────────────────
        hace_30 = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        hace_11m = (datetime.now() - timedelta(days=335)).strftime("%Y-%m-%d")
        hace_12m = (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")

        def _build_alert_params(extra: dict) -> dict:
            return {**params_base, **extra}

        # Alerta 1: Casos estancados en evaluación > 30 días
        # CAST a DATE porque FECHA_INGRESO es TIMESTAMP
        p1 = list(params_base)
        cond_estancados = (
            f"{where_base} AND c.ESTADO IN ('EN_EVALUACION','CAPTACION') "
            f"AND c.FECHA_INGRESO IS NOT NULL "
            f"AND CAST(c.FECHA_INGRESO AS DATE) < TO_DATE('{hace_30}','YYYY-MM-DD')"
        )
        estancados = await _scalar(f"SELECT COUNT(*) FROM NNA_CASO c {cond_estancados}", p1)

        # Alerta 2: PII por vencer (en intervención entre 11 y 12 meses)
        p2 = list(params_base)
        cond_pii = (
            f"{where_base} AND c.ESTADO = 'INTERVENCION' "
            f"AND c.FECHA_INGRESO IS NOT NULL "
            f"AND CAST(c.FECHA_INGRESO AS DATE) < TO_DATE('{hace_11m}','YYYY-MM-DD') "
            f"AND CAST(c.FECHA_INGRESO AS DATE) > TO_DATE('{hace_12m}','YYYY-MM-DD')"
        )
        pii_vencer = await _scalar(f"SELECT COUNT(*) FROM NNA_CASO c {cond_pii}", p2)

        # Alerta 3: Sin diagnóstico social (F04) — casos activos sin diagnóstico completo
        # Compara total activos vs total con diagnóstico
        activos = await _scalar(
            f"SELECT COUNT(*) FROM NNA_CASO c {where_base} AND c.ESTADO != 'CERRADO'",
            params_base,
        )

        # Contar diagnósticos en la tabla DIAGNOSTICO_SOCIAL
        try:
            and_base = where_base.replace("WHERE", "AND")
            diag_completos = await _scalar(
                f"""
                SELECT COUNT(DISTINCT c.NNA_ID) FROM NNA_CASO c
                JOIN DIAGNOSTICO_SOCIAL d ON d.NNA_ID = c.NNA_ID AND d.ESTADO = 'COMPLETO'
                WHERE 1=1 {and_base}
                """,
                params_base,
            )
        except Exception as e:
            print(f"Error querying DIAGNOSTICO_SOCIAL: {e}")
            diag_completos = 0

        sin_diagnostico = max(0, activos - diag_completos)

        # El PII quedó fuera del sistema (módulo oculto), así que su alerta
        # ocupaba un tercio del bloque sin decirle nada al educador.
        alertas = [
            {"tipo": "Evaluación Retrasada (>30d)", "cantidad": estancados,      "nivel": "ALTO"},
            {"tipo": "Sin Diagnóstico (F04)",        "cantidad": sin_diagnostico, "nivel": "CRITICO"},
        ]

        # ── 5. KPIs extra ──────────────────────────────────────────────────────
        eficiencia = round((diag_completos / activos * 100)) if activos > 0 else 0

        rows_perfil = await _query(
            f"SELECT c.PERFIL, COUNT(*) FROM NNA_CASO c {where_base} GROUP BY c.PERFIL",
            params_base,
        )
        distribucion_perfil = [{"nombre": r[0], "cantidad": r[1]} for r in rows_perfil if r[0]]

        return {
            "totalCasos":   total_casos,
            "fases":         fases,
            "cargaLaboral":  carga_laboral,
            "alertas":       alertas,
            "kpis": {
                "eficienciaDiagnostico": eficiencia,
                "distribucionPerfil":    distribucion_perfil,
            },
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener estadísticas: {str(e)}",
        )


# ── /api/statistics/resumen-periodo ───────────────────────────────────────────
@router.get("/resumen-periodo")
async def resumen_periodo(
    anio: int | None = None,
    mes: int | None = None,
    user: dict = Depends(get_current_user),
):
    """
    Cantidades del periodo para las tarjetas del tablero.

    DOS TIPOS DE NÚMERO, Y NO SE PUEDEN MEZCLAR:

      * FLUJO — lo que ocurrió dentro del periodo: atendidos, ingresos,
        talleres, visitas, fases cerradas, egresos. Estos sí responden al
        filtro de año y mes.

      * STOCK — la foto de hoy: casos activos y su reparto por fase. Van
        aparte y NO se filtran. "Casos activos en marzo" no significa nada:
        un caso está activo ahora o no lo está.

    Mezclarlos bajo el mismo selector de periodo es la forma más rápida de que
    nadie entienda qué está mirando.

    `mes` opcional: sin él, el resumen es de todo el año.

    ATENDIDOS se define como NNA distintos con al menos una interacción
    registrada — diario de campo, taller o visita familiar. No es lo mismo que
    casos asignados: mide a cuántos chicos se vio de verdad, que es lo que
    preguntan al reportar a la DGNNA.
    """
    rol     = user.get("rol", "")
    sede_id = user.get("sedeId")
    user_id = user.get("userId")

    hoy  = datetime.now()
    anio = anio or hoy.year

    # Rango del periodo. Se calcula en Python y se compara con >= / < en vez de
    # EXTRACT(...) sobre la columna: así Oracle puede usar el índice de fecha.
    if mes:
        desde = datetime(anio, mes, 1)
        hasta = datetime(anio + 1, 1, 1) if mes == 12 else datetime(anio, mes + 1, 1)
        # Periodo anterior, para la comparación de las tarjetas.
        if mes == 1:
            desde_prev, hasta_prev = datetime(anio - 1, 12, 1), desde
        else:
            desde_prev, hasta_prev = datetime(anio, mes - 1, 1), desde
    else:
        desde, hasta = datetime(anio, 1, 1), datetime(anio + 1, 1, 1)
        desde_prev, hasta_prev = datetime(anio - 1, 1, 1), desde

    # Binds POR NOMBRE, no posicionales.
    #
    # La consulta de atendidos repite :desde y :hasta seis veces. Con una lista
    # posicional, oracledb cuenta cada aparición como un bind distinto y espera
    # seis valores: la consulta reventaba, el except la dejaba en 0, y el
    # resultado era una tarjeta que siempre marcaba cero. Con diccionario, cada
    # nombre se resuelve una vez y da igual cuántas veces aparezca.
    if rol in ROLES_CAMPO:
        filtro_caso, p_caso = "c.RESPONSABLE_ID = :alcance", {"alcance": user_id}
    elif rol == "ADMIN_NACIONAL":
        filtro_caso, p_caso = "1=1", {}
    else:
        filtro_caso, p_caso = "c.SEDE_ID = :alcance", {"alcance": sede_id}

    async def _contar(sql: str, d, h, extra: dict | None = None) -> int:
        # `is not None` y no `or`: el alcance del rol nacional es un dict vacío
        # y con `or` se caería al filtro de casos sin querer.
        alcance = extra if extra is not None else p_caso
        try:
            return int(await _scalar(sql, {**alcance, "desde": d, "hasta": h}) or 0)
        except Exception as e:
            # Una tarjeta que falla se muestra en cero; el resto del bloque
            # sigue sirviendo. Es preferible a tumbar el tablero entero.
            print(f"Error en una tarjeta del resumen: {e}")
            return 0

    # Un NNA cuenta como atendido si hubo cualquier contacto registrado.
    #
    # El diario de campo se cruza por CASO_ID y también por el educador que lo
    # escribió: desde la migración 009 el CASO_ID puede ir vacío (salidas de
    # coordinación general), y esas entradas quedaban fuera del conteo.
    SQL_ATENDIDOS = f"""
        SELECT COUNT(DISTINCT c.NNA_ID) FROM NNA_CASO c
         WHERE {filtro_caso} AND (
               EXISTS (SELECT 1 FROM DIARIO_CAMPO d
                        WHERE d.CASO_ID = c.ID AND d.FECHA >= :desde AND d.FECHA < :hasta)
            OR EXISTS (SELECT 1 FROM SEGUIMIENTO_FAMILIAR s
                        WHERE s.CASO_ID = c.ID AND s.FECHA >= :desde AND s.FECHA < :hasta)
            OR EXISTS (SELECT 1 FROM PARTICIPANTE_TALLER pt
                        JOIN TALLER t ON t.ID = pt.TALLER_ID
                       WHERE pt.NNA_ID = c.NNA_ID
                         AND NVL(t.FECHA_EJECUCION, t.FECHA_PROGRAMADA) >= :desde
                         AND NVL(t.FECHA_EJECUCION, t.FECHA_PROGRAMADA) <  :hasta)
         )
    """
    SQL_INGRESOS = f"""
        SELECT COUNT(*) FROM NNA_CASO c
         WHERE {filtro_caso} AND c.FECHA_INGRESO >= :desde AND c.FECHA_INGRESO < :hasta
    """
    SQL_VISITAS = f"""
        SELECT COUNT(*) FROM SEGUIMIENTO_FAMILIAR s
          JOIN NNA_CASO c ON c.ID = s.CASO_ID
         WHERE {filtro_caso} AND s.FECHA >= :desde AND s.FECHA < :hasta
    """
    SQL_EGRESOS = f"""
        SELECT COUNT(*) FROM EXP_INFORME_CIERRE i
          JOIN NNA_CASO c ON c.ID = i.CASO_ID
         WHERE {filtro_caso} AND i.ESTADO IN ('FINALIZADO','PEND_COORDINADOR','FIRMADO')
           AND i.FECHA_EGRESO >= :desde AND i.FECHA_EGRESO < :hasta
    """
    SQL_FASES = f"""
        SELECT COUNT(*) FROM CASO_FASE f
          JOIN NNA_CASO c ON c.ID = f.CASO_ID
         WHERE {filtro_caso} AND f.FECHA_FIN >= :desde AND f.FECHA_FIN < :hasta
    """

    # Los talleres no cuelgan de NNA_CASO: se filtran por educador o por sede.
    if rol in ROLES_CAMPO:
        filtro_taller, p_taller = "t.EDUCADOR_ID = :alcance", {"alcance": user_id}
    elif rol == "ADMIN_NACIONAL":
        filtro_taller, p_taller = "1=1", {}
    else:
        filtro_taller, p_taller = "t.SEDE_ID = :alcance", {"alcance": sede_id}

    SQL_TALLERES = f"""
        SELECT COUNT(*) FROM TALLER t
         WHERE {filtro_taller}
           AND NVL(t.FECHA_EJECUCION, t.FECHA_PROGRAMADA) >= :desde
           AND NVL(t.FECHA_EJECUCION, t.FECHA_PROGRAMADA) <  :hasta
    """
    SQL_PARTICIPACIONES = f"""
        SELECT COUNT(*) FROM PARTICIPANTE_TALLER pt
          JOIN TALLER t ON t.ID = pt.TALLER_ID
         WHERE {filtro_taller}
           AND NVL(t.FECHA_EJECUCION, t.FECHA_PROGRAMADA) >= :desde
           AND NVL(t.FECHA_EJECUCION, t.FECHA_PROGRAMADA) <  :hasta
    """

    atendidos   = await _contar(SQL_ATENDIDOS, desde, hasta)
    ingresos    = await _contar(SQL_INGRESOS,  desde, hasta)
    visitas     = await _contar(SQL_VISITAS,   desde, hasta)
    egresos     = await _contar(SQL_EGRESOS,   desde, hasta)
    fases       = await _contar(SQL_FASES,     desde, hasta)
    talleres    = await _contar(SQL_TALLERES,        desde, hasta, p_taller)
    participac  = await _contar(SQL_PARTICIPACIONES, desde, hasta, p_taller)

    # Comparación con el periodo anterior. Solo donde la tendencia dice algo:
    # en egresos, con números de un dígito, un "+100%" es ruido, no señal.
    atendidos_prev = await _contar(SQL_ATENDIDOS, desde_prev, hasta_prev)
    talleres_prev  = await _contar(SQL_TALLERES, desde_prev, hasta_prev, p_taller)

    # ── STOCK: la foto de hoy, ajena al periodo ────────────────────────────
    # El tablero ya no lo pinta como franja aparte —el reparto por fase está en
    # "Mis casos por fase"—, pero se sigue devolviendo por si otra vista lo usa.
    try:
        rows_stock = await _query(
            f"""SELECT c.FASE, COUNT(*) FROM NNA_CASO c
                 WHERE {filtro_caso} AND c.ESTADO <> 'CERRADO'
                 GROUP BY c.FASE""",
            p_caso,
        )
        por_fase = {r[0]: r[1] for r in rows_stock}
    except Exception as e:
        print(f"Error al contar el stock por fase: {e}")
        por_fase = {}

    return {
        "anio": anio,
        "mes":  mes,
        "flujo": {
            "atendidos":      atendidos,
            "atendidosPrev":  atendidos_prev,
            "ingresos":       ingresos,
            "talleres":       talleres,
            "talleresPrev":   talleres_prev,
            "participaciones": participac,
            "visitas":        visitas,
            "fasesCerradas":  fases,
            "egresos":        egresos,
        },
        "stock": {
            "activos": sum(v for k, v in por_fase.items() if k != "EGRESADO"),
            "fase1":   por_fase.get("I", 0),
            "fase2":   por_fase.get("II", 0),
            "fase3":   por_fase.get("III", 0),
        },
    }


# ── /api/statistics/casos-alerta ──────────────────────────────────────────────
@router.get("/casos-alerta")
async def casos_alerta(tipo: str, user: dict = Depends(get_current_user)):
    """
    IDs de los NNA detrás de cada tarjeta de alerta del tablero.

    Las tarjetas dicen "Sin Diagnóstico: 5" y hasta ahora enlazaban al listado
    completo: el educador veía el número y quedaba en medio de sus 90 casos
    buscando cuáles eran. Con esto la lista puede filtrarse a esos cinco.

    Devuelve solo IDs a propósito. La alternativa —marcar cada NNA del listado
    con una bandera— obligaba a tocar la consulta general del nna-service, que
    alimenta muchas más pantallas. Un endpoint chico y una intersección en el
    cliente es más barato y no arriesga el resto.

    Tipos:
      sin-f04    → casos activos sin Ficha de Diagnóstico Social
      estancado  → casos en evaluación por más de 30 días
    """
    rol     = user.get("rol", "")
    sede_id = user.get("sedeId")
    user_id = user.get("userId")

    # Mismo criterio de alcance que el resto del tablero: los roles de campo
    # ven lo suyo, los de gestión su sede, y el nacional todo.
    if rol in ROLES_CAMPO:
        where, params = "WHERE c.RESPONSABLE_ID = :1", [user_id]
    elif rol == "ADMIN_NACIONAL":
        where, params = "WHERE 1=1", []
    else:
        where, params = "WHERE c.SEDE_ID = :1", [sede_id]

    try:
        if tipo == "sin-f04":
            sql = f"""
                SELECT c.NNA_ID FROM NNA_CASO c
                {where} AND c.ESTADO != 'CERRADO'
                  AND NOT EXISTS (
                      SELECT 1 FROM DIAGNOSTICO_SOCIAL d WHERE d.NNA_ID = c.NNA_ID AND d.ESTADO = 'COMPLETO'
                  )
            """
        elif tipo == "estancado":
            hace_30 = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
            sql = f"""
                SELECT c.NNA_ID FROM NNA_CASO c
                {where} AND c.ESTADO IN ('EN_EVALUACION','CAPTACION')
                  AND c.FECHA_INGRESO IS NOT NULL
                  AND CAST(c.FECHA_INGRESO AS DATE) < TO_DATE('{hace_30}','YYYY-MM-DD')
            """
        else:
            raise HTTPException(status_code=400, detail=f"Tipo de alerta desconocido: {tipo}")

        rows = await _query(sql, params)
        return {"tipo": tipo, "nnaIds": [r[0] for r in rows]}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener los casos de la alerta: {str(e)}",
        )


# ── /api/statistics/mis-pendientes ────────────────────────────────────────────
@router.get("/mis-pendientes")
async def mis_pendientes(
    user: dict = Depends(require_roles("EDUCADOR", "PSICOLOGO", "TRABAJADOR_SOCIAL", "ABOGADO"))
):
    """Pendientes personales del usuario autenticado."""
    user_id = user.get("userId")
    hoy     = datetime.now()
    hace_30 = (hoy - timedelta(days=30)).strftime("%Y-%m-%d")

    try:
        pendientes = []

        # 1. Casos estancados en evaluación > 30 días
        # NOTA: FECHA_INGRESO es TIMESTAMP; CAST a DATE para aritmética con SYSDATE
        rows_estancados = await _query(
            f"""
            SELECT c.ID, n.NOMBRES || ' ' || n.APELLIDO_PATERNO,
                   ROUND(SYSDATE - CAST(c.FECHA_INGRESO AS DATE)) AS DIAS,
                   c.NNA_ID, n.CARPETA_ID
            FROM NNA_CASO c
            JOIN NNA n ON n.ID = c.NNA_ID
            WHERE c.RESPONSABLE_ID = :1
              AND c.ESTADO IN ('EN_EVALUACION','CAPTACION')
              AND c.FECHA_INGRESO IS NOT NULL
              AND CAST(c.FECHA_INGRESO AS DATE) < TO_DATE('{hace_30}','YYYY-MM-DD')
            """,
            [user_id],
        )
        rows_estancados = rows_estancados[:5]
        for r in rows_estancados:
            dias = int(r[2]) if r[2] else 0
            pendientes.append({
                "id":          r[0],
                # nnaId y carpetaId son datos distintos y ambos hacen falta:
                # la ruta del expediente lleva la carpeta y el query param el
                # NNA. Sin nnaId el ticker navegaba a /nna/undefined.
                "nnaId":       r[3],
                "carpetaId":   r[4],
                "tipo":        "estancado",
                "titulo":      r[1],
                "descripcion": f"Evaluación pendiente {dias} días",
                "urgencia":    "ALTA",
                "dias":        dias,
                "icono":       "📅",
            })

        # 2. Fases vencidas — el plazo avisa, no promueve
        #
        # Ninguna fase avanza sola por vencimiento: la guía es explícita en que
        # si al mes de extensión no se lograron los ítems, el NNA NO pasa de
        # fase. Así que el plazo cumplido aparece aquí como pendiente y ahí se
        # queda hasta que el educador cierre la fase en el F05 con su criterio.
        #
        # Tolerante a que CASO_FASE no exista todavía: durante la transición
        # puede haber servicios desplegados antes de la migración 013, y una
        # tabla faltante no debe tumbar el tablero entero.
        try:
            rows_vencidas = await _query(
                """
                SELECT c.ID,
                       n.NOMBRES || ' ' || n.APELLIDO_PATERNO,
                       f.FASE,
                       TRUNC(SYSDATE - ADD_MONTHS(f.FECHA_INICIO,
                             f.PLAZO_MESES + f.MESES_EXTENSION)) AS DIAS,
                       c.NNA_ID, n.CARPETA_ID
                  FROM CASO_FASE f
                  JOIN NNA_CASO c ON c.ID = f.CASO_ID
                  JOIN NNA n      ON n.ID = c.NNA_ID
                 WHERE f.FECHA_FIN IS NULL
                   AND c.RESPONSABLE_ID = :1
                   AND c.ESTADO <> 'CERRADO'
                   AND ADD_MONTHS(f.FECHA_INICIO,
                                  f.PLAZO_MESES + f.MESES_EXTENSION) < SYSDATE
                 ORDER BY DIAS DESC
                """,
                [user_id],
            )
            for r in rows_vencidas[:5]:
                dias = int(r[3]) if r[3] else 0
                pendientes.append({
                    # `id` es el del caso, igual que en el bloque anterior:
                    # el ticker lo usa como key de React y mezclarlo con el
                    # id del NNA produce colisiones.
                    "id":          r[0],
                    "nnaId":       r[4],
                    "carpetaId":   r[5],
                    "tipo":        "FASE",
                    "titulo":      r[1],
                    "descripcion": f"Fase {r[2]} vencida — cierra la fase en el F05",
                    "urgencia":    "ALTA" if dias > 30 else "MEDIA",
                    "dias":        dias,
                    "icono":       "⏱️",
                })
        except Exception as e:
            print(f"CASO_FASE no disponible (¿falta la migración 013?): {e}")

        # 3. Casos activos a cargo (sin cerrar)
        rows_activos = await _query(
            """
            SELECT COUNT(*) FROM NNA_CASO c
            WHERE c.RESPONSABLE_ID = :1 AND c.ESTADO != 'CERRADO'
            """,
            [user_id],
        )
        total_activos = rows_activos[0][0] if rows_activos else 0

        return {
            "total":      len(pendientes),
            "pendientes": pendientes,
            "resumen":    {"casosActivos": total_activos},
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener pendientes: {str(e)}",
        )
