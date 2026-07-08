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
        
        # Test long observations string (e.g. 5000 chars of dummy base64)
        dummy_base64 = "A" * 3000
        
        data = DiarioCampoCreate(
            caso_id=None,
            ubicacion="Ubicacion de prueba",
            actividad="Test",
            estado_fisico="BUENO",
            estado_animo="ALEGRE",
            observaciones=f'{{"tipoActividad":"CONSEJERIA","foto":"data:image/jpeg;base64,{dummy_base64}"}}',
            latitud=None,
            longitud=None
        )
        
        print("[*] Calling update_diario with 3KB observations string...")
        res = await repo.update_diario(42, data)
        print("[+] Success result length:", len(res['observaciones']))
    except Exception as e:
        print("[-] Exception occurred:")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    from src.infrastructure.db.connection import get_pool
    asyncio.run(run_test())
