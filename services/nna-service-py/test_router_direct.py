import sys
import os
import asyncio

# 1. Set Windows Selector Event Loop Policy to prevent the 'TypeError: Expected bytes, got bytearray' in oracledb Thin mode on Windows
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from datetime import datetime

# Add current directory to path so we can import src
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from src.infrastructure.db.connection import init_pool, close_pool
from src.infrastructure.http.routers.nna_router import registrar_nna, RegistrarNnaRequest

async def test_direct():
    print("[*] Initializing database pool...")
    await init_pool()
    print("[+] DB Pool initialized successfully.")
    
    # Create the exact request payload using the Pydantic models
    payload = {
      "perfil": "TRABAJO_EN_CALLE",
      "zona_intervencion": "safsdfasd",
      "distrito_intervencion": None,
      "situacion_calle": "TRANSITO_EN_CALLE",
      "actividad_realizada": "SDFSDF",
      "tiempo_en_calle": "SDFSDFDS",
      "condicion": "SOLO",
      "horario_inicio": "10:01",
      "horario_fin": "15:00",
      "horario_inicio2": None,
      "horario_fin2": None,
      "dias_trabajo": "Lunes, Martes",
      "fecha_abordaje": "2026-05-21T00:00:00.000Z",
      "fecha_ingreso": "2006-05-21T00:00:00.000Z",
      "fecha_reingreso": None,
      "fecha_cambio_perfil": None,
      "crear_nueva_carpeta": True,
      "familiares": [],
      "nnas": [
        {
          "nombres": "ROBERT",
          "apellido_paterno": "RAMOS",
          "apellido_materno": "ADRIANZEN",
          "tipo_doc": "DNI",
          "numero_doc": "785484541",
          "sexo": "M",
          "nacionalidad": "PERUANA",
          "tiene_partida_nacimiento": True,
          "detalle_sin_doc": None,
          "departamento_nac": "MADRE DE DIOS",
          "provincia_nac": "TAMBOPATA",
          "distrito_nac": "LAS PIEDRAS",
          "domicilio_actual": "asdfsda",
          "referencia_domicilio": "sadfsda",
          "departamento_dom": "LORETO",
          "provincia_dom": "ALTO AMAZONAS",
          "distrito_dom": "JEBEROS",
          "telefono_contacto": "999999999",
          "nombre_tutor": None,
          "vive_con": "AMBOS_PADRES",
          "detalle_vive_con": None,
          "lugar_pernocte": "SU_CASA",
          "detalle_lugar_pernocte": None,
          "tiene_antecedente_albergue": False,
          "detalle_antecedente_albergue": None,
          "afiliado_sis": "NO",
          "afiliado_otro_seguro": "NO",
          "detalle_otro_seguro": None,
          "sufre_enfermedad": True,
          "detalle_enfermedad": "SDFSDFDSFSD",
          "observaciones_salud": "SDFDSFDSFSD",
          "tiene_discapacidad": False,
          "tipo_discapacidad": None,
          "detalle_discapacidad": None,
          "estudia_actualmente": True,
          "nivel_educativo": "PRIMARIA",
          "grado_estudio": "SDFDSF",
          "institucion_educativa": "SDFSDFDS",
          "modalidad_estudio": "EBR",
          "detalle_no_estudia": None,
          "edad": 11,
          "unidad_edad": "ANIOS",
          "actividades_tiempo_libre": "SDFSDFSD",
          "caracteristicas": "SDFDSFDS",
          "fecha_nacimiento": "2015-01-01T00:00:00.000Z",
          "len_mat_nna": "AIMARA",
          "len_mat_esp_nna": None,
          "aut_ide_et_nna": "OTRO",
          "aut_ide_et_esp_nna": "Especificacion de prueba etnia",
          "cert_discap_nna": "SI_TIENE"
        }
      ]
    }
    
    # 1. Parse into RegistrarNnaRequest Pydantic model
    print("[*] Parsing payload into Pydantic model...")
    body = RegistrarNnaRequest(**payload)
    
    # 2. Mock current user
    user = {
        "userId": 1,
        "email": "educador@educadores.gob.pe",
        "rol": "EDUCADOR",
        "sedeId": 9,  # Piura
        "sedeCodigo": "PIU-01",
        "regionId": 1
    }
    
    # 3. Call the router function directly
    print("[*] Calling registrar_nna directly...")
    try:
        res = await registrar_nna(body=body, user=user)
        print("[+] SUCCESS! Registration completed.")
        print(f"[+] Result: {res}")
    except Exception as e:
        print("[-] ERROR OCCURRED during registration:")
        import traceback
        traceback.print_exc()

    print("[*] Closing database pool...")
    await close_pool()
    print("[+] DB Pool closed.")

if __name__ == "__main__":
    # Fix the Javascript 'null' value to Python 'None'
    null = None
    loop = asyncio.SelectorEventLoop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(test_direct())


