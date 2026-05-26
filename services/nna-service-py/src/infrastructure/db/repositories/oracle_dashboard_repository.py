from typing import Dict, List, Any
from src.infrastructure.db.connection import get_pool

class OracleDashboardRepository:
    """Repositorio para consultas consolidadas del Dashboard Nacional."""

    async def get_kpis_nacionales(self) -> Dict[str, Any]:
        """Obtiene KPIs generales: Total NNA, Sedes Operativas, Alertas Críticas, Egresados Mes."""
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                # 1. Total NNA activos
                await cur.execute("SELECT COUNT(*) FROM NNA_CASO WHERE ESTADO != 'CERRADO'")
                total_nna = (await cur.fetchone())[0]

                # 2. Sedes Operativas (con al menos 1 caso activo)
                await cur.execute("SELECT COUNT(DISTINCT SEDE_ID) FROM NNA_CASO WHERE ESTADO != 'CERRADO'")
                sedes_operativas = (await cur.fetchone())[0]

                # 3. Alertas Críticas (Aproximación: Casos en Evaluación > 30 días + Sin F04)
                # NOTA: Usamos DIAGNOSTICO_SOCIAL para el Formato 4
                sql_alertas = """
                    SELECT COUNT(*) FROM NNA_CASO c
                    WHERE (c.ESTADO IN ('CAPTACION', 'EN_EVALUACION') AND c.FECHA_INGRESO < SYSTIMESTAMP - 30)
                       OR NOT EXISTS (SELECT 1 FROM DIAGNOSTICO_SOCIAL d WHERE d.NNA_ID = c.NNA_ID)
                """
                await cur.execute(sql_alertas)
                alertas_criticas = (await cur.fetchone())[0]

                # 4. Egresados Mes
                await cur.execute("""
                    SELECT COUNT(*) FROM NNA_CASO 
                    WHERE ESTADO = 'CERRADO' 
                      AND FECHA_CIERRE >= TRUNC(SYSTIMESTAMP, 'MM')
                """)
                egresados_mes = (await cur.fetchone())[0]

                return {
                    "totalNna": total_nna,
                    "sedesOperativas": sedes_operativas,
                    "alertasCriticas": alertas_criticas,
                    "egresadosMes": egresados_mes
                }

    async def get_estado_sedes(self) -> List[Dict[str, Any]]:
        """Obtiene el listado de sedes con su estado (Semáforo) y distribución de fases."""
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                sql = """
                    SELECT 
                        s.ID, s.NOMBRE, s.CODIGO,
                        COUNT(c.ID) as TOTAL_NNA,
                        SUM(CASE WHEN c.ESTADO = 'CAPTACION' THEN 1 ELSE 0 END) as CAPTACION,
                        SUM(CASE WHEN c.ESTADO = 'EN_EVALUACION' THEN 1 ELSE 0 END) as DIAGNOSTICO,
                        SUM(CASE WHEN c.ESTADO = 'INTERVENCION' THEN 1 ELSE 0 END) as INTERVENCION,
                        SUM(CASE WHEN c.ESTADO = 'PRE_EGRESO' THEN 1 ELSE 0 END) as PRE_EGRESO,
                        SUM(CASE WHEN (c.ESTADO IN ('CAPTACION', 'EN_EVALUACION') AND c.FECHA_INGRESO < SYSTIMESTAMP - 30) THEN 1 ELSE 0 END) as ALERTAS
                    FROM SEC_SEDE s
                    LEFT JOIN NNA_CASO c ON c.SEDE_ID = s.ID AND c.ESTADO != 'CERRADO'
                    GROUP BY s.ID, s.NOMBRE, s.CODIGO
                    ORDER BY TOTAL_NNA DESC
                """
                await cur.execute(sql)
                rows = await cur.fetchall()
                
                sedes = []
                for r in rows:
                    alertas = r[8] or 0
                    estado = "verde"
                    if alertas > 5: estado = "rojo"
                    elif alertas > 0: estado = "amarillo"

                    sedes.append({
                        "id": r[0],
                        "nombre": r[1],
                        "codigo": r[2],
                        "totalNna": r[3] or 0,
                        "fases": {
                            "captacion": r[4] or 0,
                            "diagnostico": r[5] or 0,
                            "intervencion": r[6] or 0,
                            "preEgreso": r[7] or 0
                        },
                        "alertas": alertas,
                        "estado": estado
                    })
                return sedes

    async def get_distribucion_regional(self) -> List[Dict[str, Any]]:
        """NNA por región geográfica."""
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                sql = """
                    SELECT s.REGION, COUNT(c.ID)
                    FROM SEC_SEDE s
                    LEFT JOIN NNA_CASO c ON c.SEDE_ID = s.ID AND c.ESTADO != 'CERRADO'
                    GROUP BY s.REGION
                """
                await cur.execute(sql)
                rows = await cur.fetchall()
                return [{"region": r[0] or "OTROS", "count": r[1]} for r in rows]

    async def get_alertas_nacionales(self) -> List[Dict[str, Any]]:
        """Consolidado de alertas críticas a nivel nacional."""
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                # Alerta 1: Sin F04
                await cur.execute("""
                    SELECT COUNT(*) FROM NNA_CASO c
                    WHERE c.ESTADO != 'CERRADO'
                      AND NOT EXISTS (SELECT 1 FROM DIAGNOSTICO_SOCIAL d WHERE d.NNA_ID = c.NNA_ID)
                """)
                sin_f04 = (await cur.fetchone())[0]

                # Alerta 2: Evaluación Retrasada
                await cur.execute("""
                    SELECT COUNT(*) FROM NNA_CASO 
                    WHERE ESTADO IN ('CAPTACION', 'EN_EVALUACION') 
                      AND FECHA_INGRESO < SYSTIMESTAMP - 30
                """)
                retrasados = (await cur.fetchone())[0]

                return [
                    {"tipo": "Sin diagnóstico F04", "cantidad": sin_f04, "nivel": "CRITICO"},
                    {"tipo": "Evaluación retrasada", "cantidad": retrasados, "nivel": "ALTO"}
                ]
