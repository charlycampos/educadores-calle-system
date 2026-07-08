import urllib.request
import json
from jose import jwt

claims = {
    "userId": 22,
    "email": "educador@test.com",
    "rol": "EDUCADOR",
    "sedeId": 1
}
secret = "0Vkc_WA15_hSeZ9DmQ0K0ZdYaZXLuZnQX5mzZ17g0jraHAJUdJfL8y-iix-FTCOm6oJWdkqQtmk-9rbMy41Yzw"
token = jwt.encode(claims, secret, algorithm="HS256")

url = "http://localhost:3003/api/diario/42"

payload = {
    "caso_id": 303,
    "ubicacion": "Ubicacion de prueba API",
    "actividad": None,  # Test null value
    "estado_fisico": None,
    "estado_animo": None,
    "observaciones": '{"tipoActividad":"CONSEJERIA","estadoActividad":"PENDIENTE"}',
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
    print(f"Sending authenticated PUT request with null actividad to {url}...")
    with urllib.request.urlopen(req) as response:
        print("Status Code:", response.status)
        print("Response:", response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("HTTPError Status Code:", e.code)
    print("HTTPError Response:", e.read().decode('utf-8'))
except Exception as e:
    print("Error calling API:", e)
