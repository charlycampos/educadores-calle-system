import sys
import os
import asyncio

# 1. Configurar directiva de Windows para evitar TypeError con oracledb Thin
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from datetime import datetime

# Añadir el directorio actual al path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from src.infrastructure.db.connection import init_pool, close_pool
from src.infrastructure.http.routers.nna_router import registrar_nna, RegistrarNnaRequest
from src.infrastructure.db.repositories.oracle_nna_repository import OracleNnaRepository

async def run_verification():
    print("=" * 70)
    print("🧪 INICIANDO PRUEBA DE INTEGRACIÓN: VARIABLES SOCIO-DEMOGRÁFICAS F03")
    print("=" * 70)
    
    print("[*] Conectando a la base de datos Oracle...")
    await init_pool()
    print("[+] Conectado exitosamente.")
    
    # Generar un DNI aleatorio para evitar conflictos de duplicados
    import random
    dni_test = f"88{random.randint(100000, 999999)}"
    
    # 1. Definir payload de prueba con las variables socio-demográficas
    payload = {
      "perfil": "TRABAJO_EN_CALLE",
      "zona_intervencion": "ZONA DE PRUEBA SEC 2026",
      "distrito_intervencion": "CHULUCANAS",
      "situacion_calle": "TRANSITO_EN_CALLE",
      "actividad_realizada": "VENTA_AMBULANTE",
      "tiempo_en_calle": "6_MESES",
      "condicion": "SOLO",
      "horario_inicio": "08:00",
      "horario_fin": "13:00",
      "horario_inicio2": None,
      "horario_fin2": None,
      "dias_trabajo": "Lunes, Miercoles, Viernes",
      "fecha_abordaje": "2026-05-22T00:00:00.000Z",
      "crear_nueva_carpeta": True,
      "familiares": [],
      "nnas": [
        {
          "nombres": f"PRUEBA_SEC_{random.randint(100, 999)}",
          "apellido_paterno": "RODRIGUEZ",
          "apellido_materno": "GARCIA",
          "tipo_doc": "DNI",
          "numero_doc": dni_test,
          "sexo": "M",
          "nacionalidad": "PERUANA",
          "tiene_partida_nacimiento": True,
          "detalle_sin_doc": None,
          "departamento_nac": "PIURA",
          "provincia_nac": "MORROPON",
          "distrito_nac": "CHULUCANAS",
          "domicilio_actual": "AV. BALTA 123",
          "referencia_domicilio": "FRENTE AL PARQUE",
          "departamento_dom": "PIURA",
          "provincia_dom": "MORROPON",
          "distrito_dom": "CHULUCANAS",
          "telefono_contacto": "987654321",
          "nombre_tutor": None,
          "vive_con": "AMBOS_PADRES",
          "detalle_vive_con": None,
          "lugar_pernocte": "SU_CASA",
          "detalle_lugar_pernocte": None,
          "tiene_antecedente_albergue": False,
          "detalle_antecedente_albergue": None,
          "afiliado_sis": "SI",
          "afiliado_otro_seguro": "NO",
          "detalle_otro_seguro": None,
          "sufre_enfermedad": False,
          "detalle_enfermedad": None,
          "observaciones_salud": None,
          "tiene_discapacidad": True,
          "tipo_discapacidad": "FISICA",
          "detalle_discapacidad": "Dificultad de movilidad",
          "estudia_actualmente": True,
          "nivel_educativo": "PRIMARIA",
          "grado_estudio": "5TO GRADO",
          "institucion_educativa": "I.E. SAN RAMON",
          "modalidad_estudio": "EBR",
          "detalle_no_estudia": None,
          "edad": 10,
          "unidad_edad": "ANIOS",
          "actividades_tiempo_libre": "Jugar futbol",
          "caracteristicas": "Lentes de medida",
          "fecha_nacimiento": "2016-04-12T00:00:00.000Z",
          
          # Variables socio-demográficas del NNA bajo prueba
          "len_mat_nna": "9: Aimara",
          "len_mat_esp_nna": None,
          "aut_ide_et_nna": "8: Otro",
          "aut_ide_et_esp_nna": "Pueblo etnico de prueba",
          "cert_discap_nna": "1: Sí tiene"
        }
      ]
    }
    
    user = {
        "userId": 1,
        "email": "educador@educadores.gob.pe",
        "rol": "EDUCADOR",
        "sedeId": 9,
        "sedeCodigo": "PIU-01",
        "regionId": 1
    }
    
    # 2. Registrar el NNA a través del caso de uso
    print("\n[*] Enviando payload de registro...")
    body = RegistrarNnaRequest(**payload)
    res = await registrar_nna(body=body, user=user)
    
    assert len(res) > 0, "Error: El registro retornó una lista vacía"
    nna_res = res[0]["nna"]
    new_id = nna_res["id"]
    print(f"[+] Registro exitoso. Nuevo NNA Creado: {nna_res['nombres']} {nna_res['apellidoPaterno']} (ID: {new_id})")
    
    # 3. Verificar valores devueltos en la respuesta de la API
    print("\n🔬 VERIFICACIÓN 1: VALORES EN LA RESPUESTA DE LA API")
    print(f"  - lenMatNna:        Esperado: '9: Aimara' | Obtenido: '{nna_res.get('lenMatNna')}'")
    print(f"  - lenMatEspNna:     Esperado: None        | Obtenido: '{nna_res.get('lenMatEspNna')}'")
    print(f"  - autIdeEtNna:      Esperado: '8: Otro'   | Obtenido: '{nna_res.get('autIdeEtNna')}'")
    print(f"  - autIdeEtEspNna:   Esperado: 'Pueblo etnico de prueba' | Obtenido: '{nna_res.get('autIdeEtEspNna')}'")
    print(f"  - certDiscapNna:    Esperado: '1: Sí tiene' | Obtenido: '{nna_res.get('certDiscapNna')}'")
    
    assert nna_res.get("lenMatNna") == "9: Aimara", "Fallo lenMatNna en respuesta"
    assert nna_res.get("autIdeEtNna") == "8: Otro", "Fallo autIdeEtNna en respuesta"
    assert nna_res.get("autIdeEtEspNna") == "Pueblo etnico de prueba", "Fallo autIdeEtEspNna en respuesta"
    assert nna_res.get("certDiscapNna") == "1: Sí tiene", "Fallo certDiscapNna en respuesta"
    print("⭐ [VERIFICACIÓN 1] PASSED")
    
    # 4. Consultar directamente el repositorio de base de datos
    print("\n🔬 VERIFICACIÓN 2: RECUPERACIÓN DIRECTA DESDE LA BASE DE DATOS (ORACLE)")
    repo = OracleNnaRepository()
    db_nna = await repo.find_by_id(new_id)
    
    assert db_nna is not None, "Error: No se pudo encontrar el NNA por ID en la BD"
    
    print(f"  - len_mat_nna:      En BD: '{db_nna.len_mat_nna}'")
    print(f"  - len_mat_esp_nna:  En BD: '{db_nna.len_mat_esp_nna}'")
    print(f"  - aut_ide_et_nna:   En BD: '{db_nna.aut_ide_et_nna}'")
    print(f"  - aut_ide_et_esp_nna: En BD: '{db_nna.aut_ide_et_esp_nna}'")
    print(f"  - cert_discap_nna:  En BD: '{db_nna.cert_discap_nna}'")
    
    assert db_nna.len_mat_nna == "9: Aimara", "Fallo len_mat_nna en BD"
    assert db_nna.aut_ide_et_nna == "8: Otro", "Fallo aut_ide_et_nna en BD"
    assert db_nna.aut_ide_et_esp_nna == "Pueblo etnico de prueba", "Fallo aut_ide_et_esp_nna en BD"
    assert db_nna.cert_discap_nna == "1: Sí tiene", "Fallo cert_discap_nna en BD"
    print("⭐ [VERIFICACIÓN 2] PASSED")
    
    # 5. Probar actualización del registro (Edición)
    print("\n🔬 VERIFICACIÓN 3: ACTUALIZACIÓN / EDICIÓN Y PERSISTENCIA DE CAMBIOS")
    update_payload = {
        "id": new_id,
        "nombres": nna_res["nombres"],
        "apellido_paterno": "RODRIGUEZ",
        "tipo_doc": "DNI",
        "len_mat_nna": "1: Castellano",
        "len_mat_esp_nna": None,
        "aut_ide_et_nna": "3: Quechua",
        "aut_ide_et_esp_nna": None,
        "cert_discap_nna": "2: No tiene"
    }
    
    print("[*] Ejecutando update...")
    await repo.update(new_id, update_payload)
    
    # Volver a recuperar
    db_nna_updated = await repo.find_by_id(new_id)
    print(f"  - len_mat_nna (updated):     En BD: '{db_nna_updated.len_mat_nna}'")
    print(f"  - aut_ide_et_nna (updated):  En BD: '{db_nna_updated.aut_ide_et_nna}'")
    print(f"  - cert_discap_nna (updated): En BD: '{db_nna_updated.cert_discap_nna}'")
    
    assert db_nna_updated.len_mat_nna == "1: Castellano", "Fallo actualización len_mat_nna"
    assert db_nna_updated.aut_ide_et_nna == "3: Quechua", "Fallo actualización aut_ide_et_nna"
    assert db_nna_updated.cert_discap_nna == "2: No tiene", "Fallo actualización cert_discap_nna"
    print("⭐ [VERIFICACIÓN 3] PASSED")
    
    print("\n" + "=" * 70)
    print("🎉 ¡TODOS LOS TESTS DE VARIABLES SOCIO-DEMOGRÁFICAS PASARON CON ÉXITO! 🎉")
    print("=" * 70)
    
    await close_pool()

if __name__ == "__main__":
    asyncio.run(run_verification())
