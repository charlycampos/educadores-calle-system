import asyncio
import os
import sys

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.infrastructure.db.connection import init_pool, close_pool, get_pool

async def main():
    await init_pool()
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                print("Running: ALTER TABLE EXP_INFORME_SITUACIONAL ADD CODIGO_INFORME VARCHAR2(50);")
                try:
                    await cur.execute("ALTER TABLE EXP_INFORME_SITUACIONAL ADD CODIGO_INFORME VARCHAR2(50)")
                    print("Successfully executed migration.")
                except Exception as e:
                    print(f"Skipping or column already exists: {e}")
    except Exception as e:
        import traceback
        print("ERROR RUNNING MIGRATION:")
        traceback.print_exc()
    finally:
        await close_pool()

if __name__ == "__main__":
    asyncio.run(main())
