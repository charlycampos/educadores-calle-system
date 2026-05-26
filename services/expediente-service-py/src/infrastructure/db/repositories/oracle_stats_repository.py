"""
Repositorio de estadísticas — consulta tablas de otros servicios (misma BD Oracle).
"""
from src.infrastructure.db.connection import get_pool


class OracleStatsRepository:

    async def casos_por_estado(self, sede_id: int = None, responsable_id: int = None) -> list[dict]:
        pool = get_pool()
        where, params = self._build_where(sede_id, responsable_id)
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    f"""SELECT ESTADO, COUNT(*) AS TOTAL
                        FROM NNA_CASO {where}
                        GROUP BY ESTADO ORDER BY ESTADO""",
                    params,
                )
                return [{"estado": r[0], "total": r[1]} for r in await cur.fetchall()]

    async def total_casos(self, sede_id: int = None, responsable_id: int = None) -> int:
        pool = get_pool()
        where, params = self._build_where(sede_id, responsable_id)
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(f"SELECT COUNT(*) FROM NNA_CASO {where}", params)
                row = await cur.fetchone()
                return row[0]

    async def carga_por_responsable(self, sede_id: int) -> list[dict]:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """SELECT c.RESPONSABLE_ID, u.NOMBRE_COMPLETO, COUNT(*) AS TOTAL
                       FROM NNA_CASO c
                       JOIN SEC_USUARIO u ON u.ID = c.RESPONSABLE_ID
                       WHERE c.SEDE_ID = :sede AND c.ESTADO != 'CERRADO'
                       GROUP BY c.RESPONSABLE_ID, u.NOMBRE_COMPLETO
                       ORDER BY TOTAL DESC""",
                    {"sede": sede_id},
                )
                return [
                    {"responsable_id": r[0], "nombre": r[1], "total_casos": r[2]}
                    for r in await cur.fetchall()
                ]

    async def alertas(self, sede_id: int = None, responsable_id: int = None) -> dict:
        pool = get_pool()
        where, params = self._build_where(sede_id, responsable_id)
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                # Casos estancados en evaluación > 30 días
                p1 = dict(params)
                await cur.execute(
                    f"""SELECT COUNT(*) FROM NNA_CASO {where}
                        {'AND' if where else 'WHERE'} ESTADO IN ('EN_EVALUACION','CAPTACION')
                        AND FECHA_INGRESO < (SYSTIMESTAMP - INTERVAL '30' DAY)""",
                    p1,
                )
                estancados = (await cur.fetchone())[0]

                # Casos sin folio INF pero cerrados
                await cur.execute(
                    f"""SELECT COUNT(*) FROM NNA_CASO c {where}
                        {'AND' if where else 'WHERE'} c.ESTADO = 'CERRADO'
                        AND NOT EXISTS (
                            SELECT 1 FROM EXP_FOLIO f
                            WHERE f.CASO_ID = c.ID AND f.TIPO_DOCUMENTO = 'INF'
                        )""",
                    params,
                )
                cerrados_sin_inf = (await cur.fetchone())[0]

                # Casos en INTERVENCION > 11 meses (PII por vencer)
                await cur.execute(
                    f"""SELECT COUNT(*) FROM NNA_CASO {where}
                        {'AND' if where else 'WHERE'} ESTADO = 'INTERVENCION'
                        AND FECHA_INGRESO < (SYSTIMESTAMP - INTERVAL '330' DAY)
                        AND FECHA_INGRESO > (SYSTIMESTAMP - INTERVAL '365' DAY)""",
                    params,
                )
                pii_por_vencer = (await cur.fetchone())[0]

        return [
            {"tipo": "Evaluación retrasada (>30d)", "cantidad": estancados,       "nivel": "ALTO"},
            {"tipo": "PII por vencer (<1 mes)",     "cantidad": pii_por_vencer,   "nivel": "MEDIO"},
            {"tipo": "Cerrados sin informe INF",    "cantidad": cerrados_sin_inf,  "nivel": "CRITICO"},
        ]

    async def distribucion_perfil(self, sede_id: int = None) -> list[dict]:
        pool = get_pool()
        params = {"sede": sede_id} if sede_id else {}
        where = "WHERE SEDE_ID = :sede" if sede_id else ""
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    f"""SELECT PERFIL, COUNT(*) FROM NNA_CASO {where}
                        GROUP BY PERFIL ORDER BY COUNT(*) DESC""",
                    params,
                )
                return [{"perfil": r[0], "total": r[1]} for r in await cur.fetchall()]

    async def pendientes_educador(self, responsable_id: int) -> list[dict]:
        """Lista de tareas pendientes para un educador específico."""
        pool = get_pool()
        pendientes = []
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                # Casos estancados > 30 días
                await cur.execute(
                    """SELECT c.ID, c.CODIGO_CASO, n.NOMBRES || ' ' || n.APELLIDO_PATERNO AS NNA,
                              ROUND(SYSDATE - CAST(c.FECHA_INGRESO AS DATE)) AS DIAS
                       FROM NNA_CASO c JOIN NNA n ON n.ID = c.NNA_ID
                       WHERE c.RESPONSABLE_ID = :resp
                         AND c.ESTADO IN ('EN_EVALUACION','CAPTACION')
                         AND c.FECHA_INGRESO < (SYSTIMESTAMP - INTERVAL '30' DAY)
                       ORDER BY DIAS DESC FETCH FIRST 10 ROWS ONLY""",
                    {"resp": responsable_id},
                )
                for r in await cur.fetchall():
                    pendientes.append({
                        "caso_id": r[0], "codigo_caso": r[1], "nna": r[2],
                        "tipo": "estancado", "descripcion": f"Evaluación pendiente {r[3]} días",
                        "urgencia": "ALTA", "dias": r[3],
                    })

                # NNA sin documento
                await cur.execute(
                    """SELECT c.ID, c.CODIGO_CASO, n.NOMBRES || ' ' || n.APELLIDO_PATERNO AS NNA
                       FROM NNA_CASO c JOIN NNA n ON n.ID = c.NNA_ID
                       WHERE c.RESPONSABLE_ID = :resp
                         AND c.ESTADO != 'CERRADO'
                         AND (n.NUMERO_DOC IS NULL OR n.TIPO_DOC = 'SIN_DOC')
                       FETCH FIRST 5 ROWS ONLY""",
                    {"resp": responsable_id},
                )
                for r in await cur.fetchall():
                    pendientes.append({
                        "caso_id": r[0], "codigo_caso": r[1], "nna": r[2],
                        "tipo": "documento", "descripcion": "Sin DNI registrado",
                        "urgencia": "MEDIA", "dias": 0,
                    })

        pendientes.sort(key=lambda x: {"ALTA": 3, "MEDIA": 2, "BAJA": 1}.get(x["urgencia"], 0), reverse=True)
        return pendientes

    # ── Helper ───────────────────────────────────────────────────────────────
    def _build_where(self, sede_id, responsable_id):
        conditions, params = [], {}
        if sede_id:
            conditions.append("SEDE_ID = :sede")
            params["sede"] = sede_id
        if responsable_id:
            conditions.append("RESPONSABLE_ID = :resp")
            params["resp"] = responsable_id
        where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
        return where, params
