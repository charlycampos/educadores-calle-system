import oracledb

def main():
    conn = oracledb.connect(
        user='sec_user',
        password='SEC_2026_dev',
        dsn='localhost:1521/XEPDB1'
    )
    with conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COLUMN_NAME, NULLABLE, DATA_TYPE FROM USER_TAB_COLUMNS WHERE TABLE_NAME = 'NNA_CARPETA'")
            rows = cur.fetchall()
            print("Columns of NNA_CARPETA:")
            for r in rows:
                print(r)

if __name__ == '__main__':
    main()
