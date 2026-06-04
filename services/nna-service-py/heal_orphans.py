import oracledb
import os
import datetime
from dotenv import load_dotenv

load_dotenv()

def heal_orphans():
    try:
        conn = oracledb.connect(
            user=os.getenv("ORACLE_USER"),
            password=os.getenv("ORACLE_PASSWORD"),
            dsn=f"{os.getenv('ORACLE_HOST')}:{os.getenv('ORACLE_PORT')}/{os.getenv('ORACLE_SERVICE')}"
        )
        with conn.cursor() as cur:
            # 1. Fetch all draft NNAs that do not have a case in NNA_CASO
            cur.execute("""
                SELECT n.ID, n.NOMBRES, n.APELLIDO_PATERNO, n.APELLIDO_MATERNO 
                FROM NNA n
                WHERE n.CODIGO_FICHA03 IS NULL
                AND n.ID NOT IN (SELECT NNA_ID FROM NNA_CASO)
            """)
            orphans = cur.fetchall()
            print(f"Found {len(orphans)} orphaned drafts to heal.")
            
            anio = datetime.datetime.now().year
            
            for idx, o in enumerate(orphans):
                nna_id, nombres, paterno, materno = o
                
                # Fetch next case code
                cur.execute("SELECT NVL(MAX(ID), 0) + 1 FROM NNA_CASO")
                next_id = cur.fetchone()[0]
                codigo_caso = f"CAS-{anio}-{next_id:05d}"
                
                # Insert missing case in BORRADOR state
                cur.execute("""
                    INSERT INTO NNA_CASO (
                        CODIGO_CASO, NNA_ID, SEDE_ID, RESPONSABLE_ID,
                        PERFIL, ESTADO, FASE, FECHA_APERTURA
                    ) VALUES (
                        :codigo, :nna_id, :sede_id, :resp_id,
                        :perfil, :estado, :fase, CURRENT_TIMESTAMP
                    )
                """, {
                    "codigo": codigo_caso,
                    "nna_id": nna_id,
                    "sede_id": 1,
                    "resp_id": 6,
                    "perfil": "TRABAJO_INFANTIL",
                    "estado": "BORRADOR",
                    "fase": "CONTACTO_INICIAL"
                })
                print(f"Healed: Created case {codigo_caso} in state 'BORRADOR' for {nombres} {paterno} (ID: {nna_id})")
                
            conn.commit()
            print("Healing completed successfully and committed!")
        conn.close()
    except Exception as e:
        print(f"Error during healing: {e}")

if __name__ == "__main__":
    heal_orphans()
