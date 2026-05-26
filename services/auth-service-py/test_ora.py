import sys
import asyncio
asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
from src.infrastructure.db.connection import init_pool, get_pool, close_pool

async def main():
    await init_pool()
    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            try:
                await cur.execute("SELECT COUNT(*) FROM NNA_CASO c WHERE c.RESPONSABLE_ID = :v1", {"v1": 2})
                print("Exito v1:", await cur.fetchall())
            except Exception as e:
                print("Error v1:", e)
                
            try:
                await cur.execute("SELECT COUNT(*) FROM NNA_CASO c WHERE c.RESPONSABLE_ID = :id_usuario", {"id_usuario": 2})
                print("Exito id_usuario:", await cur.fetchall())
            except Exception as e:
                print("Error id_usuario:", e)

    await close_pool()

if __name__ == "__main__":
    asyncio.run(main())
