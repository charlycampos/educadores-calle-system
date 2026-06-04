import asyncio
import os
import sys

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# Add path so imports work
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.infrastructure.db.connection import init_pool, close_pool
from src.infrastructure.http.routers.informe_situacional_router import get_informe_situacional

async def main():
    await init_pool()
    try:
        print("Calling endpoint function directly...")
        # Simulate user dictionary dependency
        res = await get_informe_situacional(286, {"userId": 1, "sedeId": 1})
        print("Success! Result:", res)
    except Exception as e:
        import traceback
        print("ERROR:")
        traceback.print_exc()
    finally:
        await close_pool()

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
