import oracledb
import os
from dotenv import load_dotenv

load_dotenv()

def check_orphans():
    try:
        conn = oracledb.connect(
            user=os.getenv("ORACLE_USER"),
            password=os.getenv("ORACLE_PASSWORD"),
            dsn=f"{os.getenv('ORACLE_HOST')}:{os.getenv('ORACLE_PORT')}/{os.getenv('ORACLE_SERVICE')}"
        )
        with conn.cursor() as cur:
            # 1. Total drafts (CODIGO_FICHA03 is null or empty)
            cur.execute("SELECT ID, NOMBRES, APELLIDO_PATERNO, APELLIDO_MATERNO, CREATED_AT FROM NNA WHERE CODIGO_FICHA03 IS NULL")
            drafts = cur.fetchall()
            print(f"Drafts (F03 is NULL): {len(drafts)}")
            for d in drafts:
                # Check if it has a case in NNA_CASO
                cur.execute("SELECT ID, CODIGO_CASO, RESPONSABLE_ID, ESTADO FROM NNA_CASO WHERE NNA_ID = :nna_id", {"nna_id": d[0]})
                cases = cur.fetchall()
                print(f" - NNA ID {d[0]}: {d[1]} {d[2]} {d[3]} (Created: {d[4]})")
                if not cases:
                    print("   -> ORPHANED: No active or closed case in NNA_CASO")
                for c in cases:
                    print(f"   -> Case ID {c[0]} ({c[1]}), Responsable: {c[2]}, Estado: {c[3]}")
                    
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_orphans()
