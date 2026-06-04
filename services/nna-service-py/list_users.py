import oracledb
import os
from dotenv import load_dotenv

load_dotenv()

def list_users():
    try:
        conn = oracledb.connect(
            user=os.getenv("ORACLE_USER"),
            password=os.getenv("ORACLE_PASSWORD"),
            dsn=f"{os.getenv('ORACLE_HOST')}:{os.getenv('ORACLE_PORT')}/{os.getenv('ORACLE_SERVICE')}"
        )
        with conn.cursor() as cur:
            cur.execute("SELECT u.ID, u.EMAIL, u.NOMBRE_COMPLETO, r.NOMBRE, u.SEDE_ID FROM SEC_USUARIO u JOIN SEC_ROL r ON r.ID = u.ROL_ID")
            users = cur.fetchall()
            print("AVAILABLE USERS/EDUCATORS:")
            for u in users:
                print(f" - ID: {u[0]}, Email: {u[1]}, Name: {u[2]}, Rol: {u[3]}, Sede: {u[4]}")
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    list_users()
