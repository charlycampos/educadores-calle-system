import asyncio
import sys

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from src.infrastructure.db.connection import init_pool, close_pool, get_pool

async def main():
    await init_pool()
    try:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT ID, NOMBRES, CARPETA_ID, DATOS_F03 FROM NNA WHERE CARPETA_ID = 141 ORDER BY ID ASC")
                rows = await cur.fetchall()
                print(f"TOTAL NNAS IN CARPETA 141: {len(rows)}")
                for r in rows:
                    nid, nombres, cid, clob_raw = r
                    clob_str = clob_raw.read() if hasattr(clob_raw, "read") else clob_raw
                    clob_preview = clob_str[:150] + "..." if clob_str else "None"
                    print(f" - ID: {nid} | Nombres: {nombres} | CLOB: {clob_preview}")
    except Exception as e:
        print(f"Error: {e}")
    await close_pool()

if __name__ == '__main__':
    asyncio.run(main())
