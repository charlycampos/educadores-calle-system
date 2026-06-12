import asyncio
import sys
import os

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.append(os.getcwd())

from src.infrastructure.db.connection import init_pool, get_pool, close_pool

async def main():
    await init_pool()
    pool = get_pool()
    sede_id = 1
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            try:
                print("Probando Query 1: Totales y evidencias...")
                await cur.execute(
                    """SELECT COUNT(*),
                              SUM(CASE WHEN TRUNC(CAST(d.FECHA AS DATE)) = TRUNC(SYSDATE) THEN 1 ELSE 0 END),
                              SUM(CASE WHEN d.OBSERVACIONES LIKE '%"firma"%' THEN 1 ELSE 0 END),
                              SUM(CASE WHEN d.OBSERVACIONES LIKE '%"foto"%' THEN 1 ELSE 0 END),
                              SUM(CASE WHEN d.OBSERVACIONES LIKE '%CONSEJERIA%' THEN 1 ELSE 0 END),
                              SUM(CASE WHEN d.OBSERVACIONES LIKE '%VISITA%' THEN 1 ELSE 0 END),
                              SUM(CASE WHEN d.OBSERVACIONES LIKE '%COORDINACION%' THEN 1 ELSE 0 END),
                              SUM(CASE WHEN d.OBSERVACIONES LIKE '%RECORRIDO%' THEN 1 ELSE 0 END)
                         FROM DIARIO_CAMPO d
                         JOIN NNA_CASO c ON c.ID = d.CASO_ID
                        WHERE c.SEDE_ID = :sede""",
                    {"sede": sede_id},
                )
                t = await cur.fetchone()
                print("Resultado Query 1:", t)
            except Exception as e:
                print("Error Query 1:", e)

            try:
                print("Probando Query 2: Progreso por educador...")
                await cur.execute(
                    """SELECT u.ID, u.NOMBRE_COMPLETO,
                              (SELECT COUNT(*) FROM DIARIO_CAMPO d
                                WHERE d.CREADO_POR_ID = u.ID
                                  AND TRUNC(CAST(d.FECHA AS DATE)) = TRUNC(SYSDATE)) AS HOY,
                              (SELECT COUNT(*) FROM DIARIO_CAMPO d WHERE d.CREADO_POR_ID = u.ID) AS TOTAL
                         FROM SEC_USUARIO u
                         JOIN SEC_ROL r ON r.ID = u.ROL_ID
                        WHERE u.SEDE_ID = :sede AND u.ACTIVO = 1 AND UPPER(r.NOMBRE) = 'EDUCADOR'
                        ORDER BY u.NOMBRE_COMPLETO""",
                    {"sede": sede_id},
                )
                res = await cur.fetchall()
                print("Resultado Query 2 (primeros 5):", res[:5])
            except Exception as e:
                print("Error Query 2:", e)

            try:
                print("Probando Query 3: Diarios recientes...")
                await cur.execute(
                    """SELECT d.ID, d.CASO_ID, d.FECHA, d.UBICACION, d.ACTIVIDAD, d.OBSERVACIONES,
                              d.ESTADO_FISICO, d.ESTADO_ANIMO, d.LATITUD, d.LONGITUD,
                              u.NOMBRE_COMPLETO AS EDUCADOR_NOMBRE,
                              TRIM(n.NOMBRES || ' ' || n.APELLIDO_PATERNO || ' ' || NVL(n.APELLIDO_MATERNO, '')) AS NNA_NOMBRE
                         FROM DIARIO_CAMPO d
                         JOIN NNA_CASO c ON c.ID = d.CASO_ID
                         JOIN NNA n ON n.ID = c.NNA_ID
                         LEFT JOIN SEC_USUARIO u ON u.ID = d.CREADO_POR_ID
                        WHERE c.SEDE_ID = :sede
                        ORDER BY d.FECHA DESC
                        FETCH FIRST 5 ROWS ONLY""",
                    {"sede": sede_id},
                )
                res = await cur.fetchall()
                print("Resultado Query 3:", res)
            except Exception as e:
                print("Error Query 3:", e)

    await close_pool()

if __name__ == "__main__":
    asyncio.run(main())
