import asyncio
import sys
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from src.infrastructure.db.connection import init_pool, get_pool, close_pool

async def main():
    await init_pool()
    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            try:
                # get column names
                await cur.execute("SELECT * FROM SEC_USUARIO WHERE ROWNUM = 1")
                col_names = [col[0] for col in cur.description]
                print("SEC_USUARIO columns:", col_names)
                
                # Fetch users
                await cur.execute("""
                    SELECT u.EMAIL, r.NOMBRE AS ROL_NOMBRE, u.SEDE_ID
                    FROM SEC_USUARIO u
                    JOIN SEC_ROL r ON r.ID = u.ROL_ID
                """)
                users = await cur.fetchall()
                print("\n=== USUARIOS EN LA BASE DE DATOS ===")
                for u in users:
                    print(f"Email: {u[0]} | Rol: {u[1]} | Sede: {u[2]}")
                print("====================================\n")
            except Exception as e:
                print("Error:", e)

    await close_pool()

asyncio.run(main())
