"""
Diagnóstico raw — venv\Scripts\python test_login.py
"""
import bcrypt
import oracledb
from src.config import settings

PASSWORD = "password123"

conn = oracledb.connect(
    user=settings.oracle_user,
    password=settings.oracle_password,
    dsn=f"{settings.oracle_host}:{settings.oracle_port}/{settings.oracle_service}",
)
cur = conn.cursor()

print("=" * 60)
print("TODOS LOS USUARIOS EN SEC_USUARIO:")
cur.execute("SELECT ID, EMAIL, LENGTH(EMAIL), ACTIVO, PASSWORD_HASH FROM SEC_USUARIO ORDER BY ID")
rows = cur.fetchall()
print(f"Total filas: {len(rows)}")
for r in rows:
    uid, email, elen, activo, pw = r
    pw_preview = pw[:20] if pw else "NULL"
    ok = False
    if pw:
        try:
            ok = bcrypt.checkpw(PASSWORD.encode(), pw.strip().encode())
        except:
            ok = "ERROR"
    print(f"  ID={uid} | ACTIVO={activo} | LEN={elen} | bcrypt={ok} | email='{email}' | hash_inicio='{pw_preview}'")

cur.close()
conn.close()
print("=" * 60)
