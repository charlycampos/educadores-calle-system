import oracledb
from src.config import settings

pool = None


async def init_pool() -> None:
    global pool
    pool = oracledb.create_pool_async(
        user=settings.oracle_user,
        password=settings.oracle_password,
        dsn=f"{settings.oracle_host}:{settings.oracle_port}/{settings.oracle_service}",
        min=1,
        max=5,
        increment=1,
    )
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute("SELECT SYS_CONTEXT('USERENV','CURRENT_SCHEMA') FROM dual")
            row = await cur.fetchone()
            print(f"Base de datos conectada - schema: {row[0]}")


async def close_pool() -> None:
    global pool
    if pool:
        await pool.close()
        print("Pool de conexiones cerrado")


def get_pool():
    return pool
