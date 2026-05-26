import asyncio
from src.infrastructure.db.connection import init_pool, get_pool, close_pool

async def main():
    await init_pool()
    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            try:
                await cur.execute("""
                    SELECT c.ID, n.NOMBRES || ' ' || n.APELLIDO_PATERNO,
                           ROUND(SYSDATE - CAST(c.FECHA_INGRESO AS DATE)) AS DIAS
                    FROM NNA_CASO c
                    JOIN NNA n ON n.ID = c.NNA_ID
                    WHERE c.ESTADO IN ('EN_EVALUACION','CAPTACION')
                      AND c.FECHA_INGRESO IS NOT NULL
                      AND CAST(c.FECHA_INGRESO AS DATE) < TO_DATE('2024-04-14','YYYY-MM-DD')
                    FETCH FIRST 5 ROWS ONLY
                """)
                print(await cur.fetchall())
            except Exception as e:
                print("Error estancados:", e)
                
            try:
                await cur.execute("""
                SELECT COUNT(*) FROM NNA_CASO c
                WHERE c.RESPONSABLE_ID = 2 AND c.ESTADO != 'CERRADO'
                """)
                print("Activos:", await cur.fetchall())
            except Exception as e:
                print("Error activos:", e)

    await close_pool()

asyncio.run(main())
