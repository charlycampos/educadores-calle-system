import asyncio
import sys
import json

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from src.infrastructure.db.connection import init_pool, close_pool, get_pool
from src.infrastructure.db.repositories.oracle_nna_repository import OracleNnaRepository, _row_to_nna
from src.infrastructure.http.routers.nna_router import _nna_to_dict

async def main():
    await init_pool()
    try:
        nna_repo = OracleNnaRepository()
        select_query = await nna_repo.get_select_query()
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(f"{select_query} WHERE ID = 121")
                row = await cur.fetchone()
                if row:
                    nna = _row_to_nna(row)
                    d = _nna_to_dict(nna)
                    print("SERIALIZED DATOS_F03 TYPE:", type(d.get("datosF03")))
                    print("SERIALIZED DATOS_F03 VALUE:", d.get("datosF03"))
                else:
                    print("NNA 121 not found in select_query!")
    except Exception as e:
        print(f"Error: {e}")
    await close_pool()

if __name__ == '__main__':
    asyncio.run(main())
