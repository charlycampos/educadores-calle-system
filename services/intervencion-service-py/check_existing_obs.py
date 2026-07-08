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
                await cur.execute("SELECT id, observaciones, length(observaciones) FROM DIARIO_CAMPO WHERE observaciones IS NOT NULL")
                rows = await cur.fetchall()
                print(f"Total rows with observations: {len(rows)}")
                for r in rows[:10]:
                    print(f"ID: {r[0]}, Length: {r[2]}")
                    print(f"Val: {r[1][:200]}...")
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    from src.infrastructure.db.connection import get_pool
    asyncio.run(run_test())
