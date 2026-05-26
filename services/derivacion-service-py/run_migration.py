import asyncio
import oracledb
from src.infrastructure.db.connection import init_pool, get_pool, close_pool

async def run():
    await init_pool()
    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            sql = open('src/infrastructure/db/migrations/001_create_derivacion.sql').read()
            stmts = [s.strip() for s in sql.split(';') if s.strip()]
            for s in stmts:
                print(f"Executing: {s[:50]}...")
                try:
                    await cur.execute(s)
                except Exception as e:
                    print(f"Error (maybe exists): {e}")
            await conn.commit()
    print('Migration finished')
    await close_pool()

asyncio.run(run())
