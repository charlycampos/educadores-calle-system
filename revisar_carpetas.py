# -*- coding: utf-8 -*-
"""
Revisa si SONIA CARPIO MESTANZA quedo metida dentro de la carpeta de
WALTER LOPEZ VEGA, y si es asi, ofrece separarla en su propia carpeta.

NO necesitas saber programar. Solo se ejecuta con doble clic en REVISAR.bat
Lee la base de datos usando las mismas credenciales del sistema (.env).
"""

import os
import sys

# --- Localizar y leer el .env del nna-service (mismas credenciales del sistema) ---
BASE = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(BASE, "services", "nna-service-py", ".env")

def leer_env(path):
    datos = {}
    with open(path, "r", encoding="utf-8") as f:
        for linea in f:
            linea = linea.strip()
            if not linea or linea.startswith("#") or "=" not in linea:
                continue
            k, v = linea.split("=", 1)
            datos[k.strip()] = v.strip()
    return datos

try:
    env = leer_env(ENV_PATH)
except Exception as e:
    print("No pude leer el archivo de configuracion:", ENV_PATH)
    print("Detalle:", e)
    input("\nPresiona Enter para cerrar...")
    sys.exit(1)

try:
    import oracledb
except Exception:
    print("Falta la libreria oracledb. Este script debe correrse con REVISAR.bat")
    input("\nPresiona Enter para cerrar...")
    sys.exit(1)

HOST = env.get("ORACLE_HOST", "localhost")
PORT = int(env.get("ORACLE_PORT", "1521"))
USER = env.get("ORACLE_USER")
PWD  = env.get("ORACLE_PASSWORD")
SVC  = env.get("ORACLE_SERVICE", "XEPDB1")

def sin_tildes_sql(col):
    return "TRANSLATE(UPPER(%s), 'ÁÉÍÓÚÑ', 'AEIOUN')" % col

print("=" * 60)
print("  REVISION DE CARPETAS: SONIA  vs  WALTER")
print("=" * 60)
print("Conectando a la base de datos del sistema...")

try:
    conn = oracledb.connect(user=USER, password=PWD, dsn="%s:%s/%s" % (HOST, PORT, SVC))
except Exception as e:
    print("\nNO pude conectarme a la base de datos.")
    print("Asegurate de que el sistema (Oracle) este encendido en esta PC.")
    print("Detalle tecnico:", e)
    input("\nPresiona Enter para cerrar...")
    sys.exit(1)

cur = conn.cursor()

def buscar(ap_paterno, ap_materno):
    cur.execute(
        "SELECT ID, NOMBRES, APELLIDO_PATERNO, APELLIDO_MATERNO, CARPETA_ID "
        "FROM NNA WHERE %s = :1 AND %s = :2" % (
            sin_tildes_sql("APELLIDO_PATERNO"), sin_tildes_sql("APELLIDO_MATERNO")),
        [ap_paterno, ap_materno])
    return cur.fetchall()

def codigo_carpeta(carpeta_id):
    if carpeta_id is None:
        return "(sin carpeta)"
    cur.execute("SELECT CODIGO FROM NNA_CARPETA WHERE ID = :1", [carpeta_id])
    r = cur.fetchone()
    if not r:
        return "(carpeta inexistente)"
    return r[0] if r[0] else "(carpeta sin codigo aun)"

sonia = buscar("CARPIO", "MESTANZA")
walter = buscar("LOPEZ", "VEGA")

def mostrar(etiqueta, filas):
    print("\n" + etiqueta + ":")
    if not filas:
        print("   No se encontro ningun registro con ese nombre.")
        return
    for (idn, nom, ap, am, carp) in filas:
        print("   - ID %s | %s %s %s | CARPETA_ID = %s | Expediente: %s"
              % (idn, nom, ap, am, carp, codigo_carpeta(carp)))

mostrar("SONIA CARPIO MESTANZA", sonia)
mostrar("WALTER LOPEZ VEGA", walter)

print("\n" + "-" * 60)

# --- Verdicto ---
if not sonia or not walter:
    print("VEREDICTO: No pude encontrar a uno de los dos por nombre exacto.")
    print("Quiza el nombre esta escrito distinto en el sistema.")
    print("Toma una captura de esta pantalla y enviasela a Charly/Claude.")
    cur.close(); conn.close()
    input("\nPresiona Enter para cerrar...")
    sys.exit(0)

# Tomamos el primer registro de cada uno
sonia_id, _, _, _, sonia_carp = sonia[0]
walter_id, _, _, _, walter_carp = walter[0]

if sonia_carp != walter_carp:
    print("VEREDICTO: TODO ESTA BIEN en la base de datos.")
    print("SONIA y WALTER estan en carpetas DISTINTAS, como debe ser.")
    print("")
    print("Si en pantalla todavia ves a SONIA dentro de WALTER, es")
    print("memoria del navegador. Haz esto:")
    print("  1) Cierra y abre de nuevo el sistema (START.bat).")
    print("  2) En el navegador presiona Ctrl + Shift + R para recargar.")
    cur.close(); conn.close()
    input("\nPresiona Enter para cerrar...")
    sys.exit(0)

# --- Mismo carpeta: PROBLEMA CONFIRMADO ---
print("VEREDICTO: PROBLEMA CONFIRMADO.")
print("SONIA esta metida DENTRO de la carpeta de WALTER (CARPETA_ID = %s)." % sonia_carp)
print("Por eso aparece en su expediente. Hay que darle a SONIA su propia carpeta.")
print("")
print("Si escribes SI, voy a:")
print("  - Crear una carpeta nueva, vacia, para SONIA.")
print("  - Mover SOLO a SONIA (ID %s) a esa carpeta nueva." % sonia_id)
print("  - WALTER y su carpeta NO se tocan.")
print("  - Guardo el dato anterior (CARPETA_ID = %s) por si hay que revertir." % sonia_carp)
print("")
resp = input("Escribe SI y Enter para separarla (cualquier otra cosa cancela): ").strip().upper()

if resp != "SI":
    print("\nCancelado. No se cambio nada.")
    cur.close(); conn.close()
    input("\nPresiona Enter para cerrar...")
    sys.exit(0)

try:
    # Datos de la carpeta actual (la de WALTER) para heredar anio y sede
    cur.execute("SELECT ANIO, SEDE_ID FROM NNA_CARPETA WHERE ID = :1", [walter_carp])
    row = cur.fetchone()
    anio = row[0] if row and row[0] else __import__("datetime").datetime.now().year
    sede_id = row[1] if row else None

    # Crear carpeta nueva para SONIA (CORRELATIVO 0 y sin codigo, igual que el sistema)
    out_id = cur.var(int)
    cur.execute(
        "INSERT INTO NNA_CARPETA (ANIO, CORRELATIVO, SEDE_ID) "
        "VALUES (:anio, 0, :sede) RETURNING ID INTO :out_id",
        {"anio": anio, "sede": sede_id, "out_id": out_id})
    nueva_carpeta = out_id.getvalue()[0]

    # Mover a SONIA
    cur.execute("UPDATE NNA SET CARPETA_ID = :1 WHERE ID = :2", [nueva_carpeta, sonia_id])

    conn.commit()
    print("\nLISTO. SONIA fue separada correctamente.")
    print("   SONIA (ID %s) ahora esta en su carpeta nueva (CARPETA_ID = %s)." % (sonia_id, nueva_carpeta))
    print("   Carpeta anterior (compartida con WALTER) era: %s" % sonia_carp)
    print("")
    print("Ahora cierra y abre el sistema (START.bat) y recarga el navegador")
    print("con Ctrl + Shift + R. SONIA ya no deberia aparecer en WALTER.")
except Exception as e:
    conn.rollback()
    print("\nOcurrio un error y NO se cambio nada (se revirtio todo).")
    print("Detalle tecnico:", e)

cur.close()
conn.close()
input("\nPresiona Enter para cerrar...")
