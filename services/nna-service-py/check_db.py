import asyncio
import oracledb
import os
from dotenv import load_dotenv

load_dotenv()

async def check_data():
    try:
        conn = await oracledb.connect_async(
            user=os.getenv("ORACLE_USER"),
            password=os.getenv("ORACLE_PASSWORD"),
            dsn=f"{os.getenv('ORACLE_HOST')}:{os.getenv('ORACLE_PORT')}/{os.getenv('ORACLE_SERVICE')}"
        )
        async with conn.cursor() as cur:
            await cur.execute("SELECT COUNT(*) FROM NNA")
            count = await cur.fetchone()
            print(f"Total NNAs in DB: {count[0]}")
            
            await cur.execute("SELECT ID, NOMBRES, APELLIDO_PATERNO FROM NNA FETCH FIRST 5 ROWS ONLY")
            rows = await cur.fetchall()
            for r in rows:
                print(f" - {r}")
                
        await conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_data())
