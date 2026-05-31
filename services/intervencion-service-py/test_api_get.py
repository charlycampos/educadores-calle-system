import sys
import os
import urllib.request
import json
from jose import jwt

# Add current path
sys.path.append(os.getcwd())

from src.config import settings

def test_api():
    # Crear un token JWT válido con claims simulados
    claims = {
        "userId": 1,
        "email": "test@sec.gob.pe",
        "rol": "EDUCADOR",
        "sedeId": 1
    }
    token = jwt.encode(claims, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    
    print("[*] Haciendo petición GET a http://localhost:3003/api/diagnostico/1 con JWT...")
    req = urllib.request.Request(
        "http://localhost:3003/api/diagnostico/1",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    try:
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read())
            print("\n[+] RESPUESTA DEL MICROSERVICIO (JSON COMPLETO):")
            print(json.dumps(data, indent=2))
            
            print("\n[+] VERIFICACIÓN DE VARIABLES CLAVE:")
            print(f"nna_id: {data.get('nna_id')}")
            print(f"tiempo_en_calle (columna fisica): {data.get('tiempo_en_calle')}")
            print(f"situacion_calle (columna fisica): {data.get('situacion_calle')}")
            
            extra = data.get("datos_extra") or {}
            print(f"datos_extra cargado: {isinstance(extra, dict) and len(extra) > 0}")
            print(f"datos_extra.situacionCalleDetalle: {json.dumps(extra.get('situacionCalleDetalle'), indent=2)}")
            
    except Exception as e:
        print(f"Error: {e}")
        if hasattr(e, 'read'):
            print(e.read().decode('utf-8'))

if __name__ == '__main__':
    test_api()
