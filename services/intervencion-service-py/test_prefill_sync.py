import sys
import os
import json

sys.path.append(os.getcwd())

import oracledb
from src.config import settings

def test():
    try:
        dsn = f"{settings.oracle_host}:{settings.oracle_port}/{settings.oracle_service}"
        conn = oracledb.connect(
            user=settings.oracle_user,
            password=settings.oracle_password,
            dsn=dsn
        )
        cur = conn.cursor()
        
        cur.execute("SELECT ID, NOMBRES, APELLIDO_PATERNO, DBMS_LOB.GETLENGTH(DATOS_F03) FROM NNA WHERE DATOS_F03 IS NOT NULL")
        rows = cur.fetchall()
        print(f"Found {len(rows)} NNAs with DATOS_F03 backup:")
        for r in rows:
            print(r)
            
        target_id = 201
        print(f"\n[*] INSPECTING NNA ID {target_id}:")
        cur.execute("SELECT DATOS_F03 FROM NNA WHERE ID = :1", [target_id])
        lob_val = cur.fetchone()[0]
        if hasattr(lob_val, 'read'):
            lob_str = lob_val.read()
        else:
            lob_str = str(lob_val)
        print("DATOS_F03 Content:")
        print(lob_str[:1500])
                
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test()
