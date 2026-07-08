import asyncio
import sys
import os

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.append(os.getcwd())

from src.infrastructure.db.connection import init_pool

async def run_test():
    try:
        await init_pool()
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT column_name, data_type, data_length, nullable FROM user_tab_cols WHERE table_name = 'DIARIO_CAMPO'")
                for r in await cur.fetchall():
                    print(f"Columna: {r[0]}, Tipo: {r[1]}, Longitud: {r[2]}, Nulable: {r[3]}")
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    from src.infrastructure.db.connection import get_pool
    asyncio.run(run_test())
