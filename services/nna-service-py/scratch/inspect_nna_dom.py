import oracledb

def main():
    conn = oracledb.connect(
        user='sec_user',
        password='SEC_2026_dev',
        dsn='localhost:1521/XEPDB1'
    )
    with conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT ID, CODIGO_FICHA03, DEPARTAMENTO_DOM, PROVINCIA_DOM, DISTRITO_DOM, DATOS_F03 
                FROM NNA 
                WHERE CODIGO_FICHA03 = 'F03-2026-0061'
            """)
            row = cur.fetchone()
            if row:
                print("NNA Row:")
                print(f"ID: {row[0]}")
                print(f"CODIGO_FICHA03: {row[1]}")
                print(f"DEPARTAMENTO_DOM: {row[2]}")
                print(f"PROVINCIA_DOM: {row[3]}")
                print(f"DISTRITO_DOM: {row[4]}")
                print("DATOS_F03 sample:")
                print(row[5][:300] if row[5] else "None")
            else:
                print("No NNA found with CODIGO_FICHA03 = 'F03-2026-0061'")

if __name__ == '__main__':
    main()
