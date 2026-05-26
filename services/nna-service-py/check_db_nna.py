import asyncio
import sys

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from src.infrastructure.db.connection import init_pool, close_pool
from src.infrastructure.http.routers.nna_router import get_expediente

async def main():
    await init_pool()
    try:
        # Probamos llamando a get_expediente para el NNA 111
        result = await get_expediente(nna_id=111)
        print("RESULTADO DE GET EXPEDIENTE:")
        for nna in result:
            print(f"ID: {nna.get('id')}")
            print(f"nombres: {nna.get('nombres')}")
            print(f"lenMatNna: {nna.get('lenMatNna')} (type: {type(nna.get('lenMatNna'))})")
            print(f"autIdeEtNna: {nna.get('autIdeEtNna')} (type: {type(nna.get('autIdeEtNna'))})")
            print(f"certDiscapNna: {nna.get('certDiscapNna')} (type: {type(nna.get('certDiscapNna'))})")
    except Exception as e:
        print(f"Error: {e}")
    await close_pool()

if __name__ == '__main__':
    asyncio.run(main())


