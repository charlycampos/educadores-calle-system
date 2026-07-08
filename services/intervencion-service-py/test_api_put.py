import urllib.request
import json
import os
import sys

sys.path.append(os.getcwd())

from jose import jwt
from src.config import settings

# Generate JWT Token
claims = {
    "userId": 22,
    "email": "educador@test.com",
    "rol": "EDUCADOR",
    "sedeId": 1
}
secret = "0Vkc_WA15_hSeZ9DmQ0K0ZdYaZXLuZnQX5mzZ17g0jraHAJUdJfL8y-iix-FTCOm6oJWdkqQtmk-9rbMy41Yzw"
algorithm = "HS256"

token = jwt.encode(claims, secret, algorithm=algorithm)

url = "http://localhost:3003/api/diario/42"

payload = {
    "caso_id": 303,
    "ubicacion": "Ubicacion de prueba API",
    "actividad": "Actividad de prueba API",
    "estado_fisico": "BUENO",
    "estado_animo": "ALEGRE",
    "observaciones": '{"test": true}',
    "latitud": None,
    "longitud": None
}

data = json.dumps(payload).encode('utf-8')
headers = {
    'Content-Type': 'application/json',
    'Authorization': f'Bearer {token}'
}
req = urllib.request.Request(url, data=data, headers=headers, method='PUT')

try:
    print(f"Sending authenticated PUT request to {url}...")
    with urllib.request.urlopen(req) as response:
        print("Status Code:", response.status)
        print("Response:", response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("HTTPError Status Code:", e.code)
    print("HTTPError Response:", e.read().decode('utf-8'))
except Exception as e:
    print("Error calling API:", e)
