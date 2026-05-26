import asyncio
import sys
import json

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from src.infrastructure.db.connection import init_pool, close_pool, get_pool

async def main():
    await init_pool()
    try:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT ID, NOMBRES, ACTIVIDADES_TIEMPO_LIBRE, DATOS_F03 FROM NNA WHERE ID = 121")
                row = await cur.fetchone()
                if row:
                    nid, nombres, act_libre, clob_raw = row
                    clob_str = clob_raw.read() if hasattr(clob_raw, "read") else clob_raw
                    print(f"ID: {nid}")
                    print(f"Nombres: {nombres}")
                    print(f"ACTIVIDADES_TIEMPO_LIBRE: {act_libre}")
                    print(f"DATOS_F03 CLOB RAW: {clob_str}")
                else:
                    print("NNA 121 not found!")
    except Exception as e:
        print(f"Error: {e}")
    await close_pool()

if __name__ == '__main__':
    asyncio.run(main())
