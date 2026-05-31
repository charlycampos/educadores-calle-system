import asyncio
import json
import sys
import os

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# Añadir directorio actual al path
sys.path.append(os.getcwd())

from src.infrastructure.db.connection import init_pool, get_pool
from src.infrastructure.db.repositories.oracle_diagnostico_repository import OracleDiagnosticoRepository

async def test():
    try:
        await init_pool()
        repo = OracleDiagnosticoRepository()
        
        # Query to find some NNA ID first
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT ID, NOMBRES, APELLIDO_PATERNO, NOMBRE_TUTOR FROM NNA ORDER BY ID DESC")
                rows = await cur.fetchall()
                print("Recent NNA list (ID, NOMBRES, APELLIDO_PATERNO, NOMBRE_TUTOR):")
                for r in rows[:10]:
                    print(r)
                if not rows:
                    print("No NNA found in database!")
                    return
                
                # Probar con el NNA más reciente
                nna_id = rows[0][0]
                print(f"\n[*] TESTING PREFILL FOR NNA ID: {nna_id}")
                res = await repo.get_prefilled_by_nna(nna_id)
                
                print("\n[*] RESULT FROM get_prefilled_by_nna:")
                print(json.dumps(res, indent=2, default=str))
    except Exception as e:
        print(f"Error executing test: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
