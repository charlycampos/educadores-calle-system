import asyncio
import sys
import os

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.infrastructure.db.connection import init_pool, close_pool, get_pool

async def query():
    await init_pool()
    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute("SELECT ID, CASO_ID, NUMERO_FOLIO, TIPO_DOCUMENTO, ARCHIVO_URL FROM EXP_FOLIO WHERE CASO_ID = 248")
            rows = await cur.fetchall()
            print("=== FOLIOS FOR CASO 248 ===")
            for r in rows:
                print(r)
    await close_pool()

if __name__ == "__main__":
    asyncio.run(query())
