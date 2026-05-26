import oracledb
from src.config import settings

# Configurar para que todos los CLOBs y LOBs se recuperen directamente como strings/bytes
# de forma nativa. Esto evita lidiar con objetos LOB asíncronos y AsyncLOB unawaited.
oracledb.defaults.fetch_lobs = False

_pool = None


async def init_pool() -> None:
    global _pool
    _pool = oracledb.create_pool_async(
        user=settings.oracle_user,
        password=settings.oracle_password,
        dsn=f"{settings.oracle_host}:{settings.oracle_port}/{settings.oracle_service}",
        min=2,
        max=10,
        increment=1,
    )
    async with _pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT SYS_CONTEXT('USERENV','CURRENT_SCHEMA') FROM dual"
            )
            row = await cur.fetchone()
            print(f"[OK] Base de datos conectada - schema: {row[0]}")


async def close_pool() -> None:
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


def get_pool():
    if _pool is None:
        raise RuntimeError("Pool de base de datos no inicializado")
    return _pool
