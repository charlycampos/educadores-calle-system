import os
import oracledb
from dotenv import load_dotenv

# Fix for passlib + bcrypt >= 4.0.0
import bcrypt
if not hasattr(bcrypt, '__about__'):
    class _MockAbout:
        __version__ = "4.0.0"
    bcrypt.__about__ = _MockAbout

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Cargar variables de entorno (asumiremos que existe el .env en auth-service-py)
load_dotenv(os.path.join("auth-service-py", ".env"))

ORACLE_USER = os.getenv("ORACLE_USER", "sec_user")
ORACLE_PASSWORD = os.getenv("ORACLE_PASSWORD", "password")
ORACLE_DSN = os.getenv("ORACLE_DSN", "localhost:1521/XEPDB1")

SQL_FILES = [
    "auth-service/src/infrastructure/db/migrations/001_create_tables.sql",
    "nna-service-py/src/infrastructure/db/migrations/001_create_tables.sql",
    "nna-service-py/src/infrastructure/db/migrations/002_add_edad_nna.sql",
    "nna-service-py/src/infrastructure/db/migrations/003_add_datos_f03_nna.sql",
    "nna-service-py/src/infrastructure/db/migrations/004_add_victima_explotacion_caso.sql",
    "expediente-service-py/src/infrastructure/db/migrations/001_create_tables.sql",
    "intervencion-service-py/src/infrastructure/db/migrations/001_create_intervencion_tables.sql",
    "talleres-service-py/src/infrastructure/db/migrations/001_create_taller_tables.sql",
    "derivacion-service-py/src/infrastructure/db/migrations/001_create_derivacion.sql"
]

def run_migrations():
    print(f"==================================================")
    print(f"Iniciando Migraciones de Base de Datos para '{ORACLE_USER}'")
    print(f"==================================================")

    try:
        connection = oracledb.connect(
            user=ORACLE_USER,
            password=ORACLE_PASSWORD,
            dsn=ORACLE_DSN
        )
        cursor = connection.cursor()
        print("[+] Conectado a Oracle DB exitosamente.")

        import subprocess

        # 1. Ejecutar Scripts SQL usando SQL*Plus
        script_dir = os.path.dirname(os.path.abspath(__file__))
        for sql_file in SQL_FILES:
            filepath = os.path.join(script_dir, sql_file)
            if not os.path.exists(filepath):
                print(f"[!] ADVERTENCIA: Archivo no encontrado: {filepath}")
                continue
                
            print(f"[-] Ejecutando con sqlplus: {sql_file}...")
            # Crear un archivo temporal que ejecute el script y luego salga
            temp_script = os.path.join(script_dir, "temp_run.sql")
            with open(temp_script, "w", encoding="utf-8") as f:
                f.write(f"@{filepath}\nEXIT;\n")
            
            try:
                # Ejecutar sqlplus silenciando output para no saturar consola a menos que haya error fatal
                result = subprocess.run(
                    ["sqlplus", "-S", f"{ORACLE_USER}/{ORACLE_PASSWORD}@{ORACLE_DSN}", f"@{temp_script}"],
                    capture_output=True, text=True
                )
                if result.returncode != 0 or "ORA-" in result.stdout or "SP2-" in result.stdout:
                    # Imprimir solo si hubo error real, o si son advertencias de "tabla ya existe" las podemos ver.
                    # Vamos a imprimir el output para debugging pero filtrando lo menos importante
                    lines = result.stdout.splitlines()
                    for line in lines:
                        if "ORA-" in line and "ORA-00955" not in line and "ORA-02289" not in line and "ORA-00942" not in line and "ORA-01920" not in line:
                            print(f"    [Error Oracle]: {line.strip()}")
            except Exception as e:
                print(f"    [!] Error al ejecutar sqlplus: {e}")
            finally:
                if os.path.exists(temp_script):
                    os.remove(temp_script)

        print("[+] Creación de tablas completada mediante SQL*Plus.")

        # 2. Insertar Sede, Rol y Usuario Administrador
        print("[-] Creando/Verificando Usuario Administrador Semilla...")
        hashed_password = pwd_context.hash("password123")
        
        # 2.1 Verificar Sede
        cursor.execute("SELECT ID FROM SEC_SEDE WHERE CODIGO = '404'")
        sede = cursor.fetchone()
        if not sede:
            cursor.execute("""
                INSERT INTO SEC_SEDE (CODIGO, NOMBRE, REGION_ID, REGION, DEPARTAMENTO, PROVINCIA, ACTIVO) 
                VALUES ('404', 'LIMA', 1, 'LIMA', 'LIMA', 'LIMA', 1)
            """)
            connection.commit()
            cursor.execute("SELECT ID FROM SEC_SEDE WHERE CODIGO = '404'")
            sede = cursor.fetchone()
            
        sede_id = sede[0]
        
        # 2.2 Verificar Rol
        cursor.execute("SELECT ID FROM SEC_ROL WHERE NOMBRE = 'ADMIN_NACIONAL'")
        rol = cursor.fetchone()
        if not rol:
            cursor.execute("""
                INSERT INTO SEC_ROL (NOMBRE, DESCRIPCION) 
                VALUES ('ADMIN_NACIONAL', 'Administrador Nacional DGNNA')
            """)
            connection.commit()
            cursor.execute("SELECT ID FROM SEC_ROL WHERE NOMBRE = 'ADMIN_NACIONAL'")
            rol = cursor.fetchone()
            
        rol_id = rol[0]
        
        # 2.3 Verificar Usuario
        cursor.execute("SELECT ID FROM SEC_USUARIO WHERE EMAIL = 'admin@educadores.gob.pe'")
        admin = cursor.fetchone()
        
        if not admin:
            insert_query = """
                INSERT INTO SEC_USUARIO (
                    NOMBRE_COMPLETO, EMAIL, PASSWORD_HASH, ROL_ID, SEDE_ID, ACTIVO
                ) VALUES (
                    'Administrador Nacional', 'admin@educadores.gob.pe', :pwd, :rol, :sede, 1
                )
            """
            cursor.execute(insert_query, pwd=hashed_password, rol=rol_id, sede=sede_id)
            connection.commit()
            print("[+] Usuario 'admin@educadores.gob.pe' creado con contraseña 'password123'")
        else:
            print("[*] El usuario administrador ya existía en la base de datos.")

    except oracledb.Error as e:
        print(f"[!] Error de Base de Datos: {e}")
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals():
            connection.close()
        print("==================================================")
        print("Proceso Finalizado.")

if __name__ == "__main__":
    run_migrations()
