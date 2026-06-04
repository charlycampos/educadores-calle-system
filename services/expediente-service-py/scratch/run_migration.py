import asyncio
import os
import sys

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.infrastructure.db.connection import init_pool, close_pool, get_pool

async def main():
    await init_pool()
    pool = get_pool()
    
    migration_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../src/infrastructure/db/migrations/002_create_informe_situacional.sql"))
    print(f"Reading migration from {migration_path}")
    
    with open(migration_path, "r", encoding="utf-8") as f:
        sql_content = f.read()
    
    # Split instructions by '/' as standard in sqlplus scripts
    statements = sql_content.split("/")
    
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            for stmt in statements:
                clean_stmt = stmt.strip()
                if not clean_stmt:
                    continue
                # Remove comments
                lines = [line for line in clean_stmt.splitlines() if not line.strip().startswith("--")]
                clean_stmt = "\n".join(lines).strip()
                if not clean_stmt:
                    continue
                
                print(f"Executing:\n{clean_stmt}\n---")
                try:
                    await cur.execute(clean_stmt)
                    print("OK")
                except Exception as e:
                    print(f"Error executing statement: {e}")
        await conn.commit()
    
    await close_pool()

if __name__ == "__main__":
    asyncio.run(main())
