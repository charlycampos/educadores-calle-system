import asyncio
import sys
import os

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.append(os.getcwd())

from src.infrastructure.db.connection import init_pool
from src.infrastructure.db.repositories.oracle_diario_repository import OracleDiarioRepository
from src.domain.entities.diario import DiarioCampoCreate

async def run_test():
    try:
        await init_pool()
        repo = OracleDiarioRepository()
        
        # Test updating entry 42 with null/None for 'actividad'
        data = DiarioCampoCreate(
            caso_id=None,
            ubicacion="Ubicacion de prueba",
            actividad=None,
            estado_fisico="BUENO",
            estado_animo="ALEGRE",
            observaciones='{"test": true}',
            latitud=None,
            longitud=None
        )
        
        print("[*] Calling update_diario for entry 42 with actividad=None...")
        res = await repo.update_diario(42, data)
        print("[+] Success result:", res)
    except Exception as e:
        print("[-] Exception occurred:")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    from src.infrastructure.db.connection import get_pool
    asyncio.run(run_test())
