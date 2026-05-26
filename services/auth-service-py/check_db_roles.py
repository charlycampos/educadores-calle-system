import asyncio
import oracledb
from src.config import settings
from src.infrastructure.db.connection import init_pool, get_pool

async def check_roles():
    try:
        await init_pool()
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT id, nombre FROM SEC_ROL")
                roles = await cur.fetchall()
                print("\n--- ROLES EN BASE DE DATOS ORACLE ---")
                for r in roles:
                    print(f"ID: {r[0]} | NOMBRE: {r[1]}")
                print("-------------------------------------\n")
        await pool.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_roles())
