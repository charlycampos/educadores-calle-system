import os
import sys
import asyncio
import oracledb

async def main():
    # Use direct connection
    conn = await oracledb.connect_async(
        user='system',
        password='oracle',
        dsn='localhost:1521/XE'
    )
    async with conn:
        async with conn.cursor() as cur:
            await cur.execute("SELECT COLUMN_NAME, NULLABLE, DATA_TYPE FROM USER_TAB_COLUMNS WHERE TABLE_NAME = 'NNA_CARPETA'")
            rows = await cur.fetchall()
            print("Columns of NNA_CARPETA:")
            for r in rows:
                print(r)

if __name__ == '__main__':
    asyncio.run(main())
