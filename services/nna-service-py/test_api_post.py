import sys
import os
import urllib.request
import json
from datetime import datetime, timedelta, timezone
from jose import jwt

def main():
    # 1. Generate JWT Token signed with the app's secret
    user_payload = {
        "userId": 1,
        "email": "educador@educadores.gob.pe",
        "rol": "EDUCADOR",
        "sedeId": 9,  # Piura
        "sedeCodigo": "PIU-01",
        "regionId": 1,
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        "iat": datetime.now(timezone.utc)
    }
    secret = "secreto_super_seguro_SEC_2026_cambiar_en_produccion"
    token = jwt.encode(user_payload, secret, algorithm="HS256")
    print(f"[+] Generated self-signed JWT Token: {token[:30]}...")

    # 2. Exact payload from the user's failed request
    nna_payload = {
      "perfil": "TRABAJO_EN_CALLE",
      "zona_intervencion": "SDFDSF",
      "distrito_intervencion": None,
      "situacion_calle": "TRANSITO_EN_CALLE",
      "actividad_realizada": "ASDFSDF",
      "tiempo_en_calle": "SAFASDSDFA",
      "condicion": "SOLO",
      "horario_inicio": "10:00",
      "horario_fin": "15:00",
      "horario_inicio2": None,
      "horario_fin2": None,
      "dias_trabajo": "Lunes, Martes",
      "fecha_abordaje": "2026-05-21T00:00:00.000Z",
      "fecha_ingreso": "2026-05-21T00:00:00.000Z",
      "fecha_reingreso": None,
      "fecha_cambio_perfil": None,
      "crear_nueva_carpeta": True,
      "familiares": [
        {
          "nombres": "CHARLY CAMPOS GUERRA",
          "parentesco": "Padre",
          "dni": "40646456",
          "telefono": "654654",
          "ocupacion": "OBRERO",
          "viveCon": "SI"
        }
      ],
      "nnas": [
        {
          "nombres": "ERMES",
          "apellido_paterno": "CAMPOSANO",
          "apellido_materno": "FRANCO",
          "tipo_doc": "DNI",
          "numero_doc": "33434343",
          "sexo": "M",
          "nacionalidad": "PERUANA",
          "tiene_partida_nacimiento": True,
          "detalle_sin_doc": None,
          "departamento_nac": "MOQUEGUA",
          "provincia_nac": "MARISCAL NIETO",
          "distrito_nac": "MOQUEGUA",
          "domicilio_actual": "SDFSDF",
          "referencia_domicilio": "SDFSDF",
          "departamento_dom": "LORETO",
          "provincia_dom": "ALTO AMAZONAS",
          "distrito_dom": "BALSAPUERTO",
          "telefono_contacto": "999999999",
          "nombre_tutor": "CHARLY CAMPOS GUERRA",
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
          "detalle_enfermedad": "ASDFASDF",
          "observaciones_salud": "ASDFASDFADS",
          "tiene_discapacidad": False,
          "tipo_discapacidad": None,
          "detalle_discapacidad": None,
          "estudia_actualmente": True,
          "nivel_educativo": "INICIAL",
          "grado_estudio": "ASDFSDAFSA",
          "institucion_educativa": "ASDFDS",
          "modalidad_estudio": "EBR",
          "detalle_no_estudia": None,
          "edad": 6,
          "unidad_edad": "ANIOS",
          "actividades_tiempo_libre": "ASDFSDF",
          "caracteristicas": "SDFSDFSD",
          "fecha_nacimiento": "2020-01-01T00:00:00.000Z"
        }
      ]
    }

    # 3. Post to local running nna-service
    nna_url = "http://localhost:3002/api/nna"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    print("[*] Sending registration request to localhost:3002...")
    try:
        req = urllib.request.Request(
            nna_url,
            data=json.dumps(nna_payload).encode('utf-8'),
            headers=headers,
            method='POST'
        )
        with urllib.request.urlopen(req) as response:
            print(f"[+] Success! Status Code: {response.status}")
            print("[+] Response Body:")
            print(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(f"[-] HTTP Error: {e.code} - {e.reason}")
        print("[-] Response Body:")
        print(e.read().decode('utf-8'))
    except Exception as e:
        print(f"[-] Request failed: {e}")

if __name__ == "__main__":
    main()
