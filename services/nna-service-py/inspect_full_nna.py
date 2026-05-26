import urllib.request
import json
from datetime import datetime, timedelta, timezone
from jose import jwt

def main():
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
    
    url = "http://localhost:3002/api/nna/121/expediente"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        req = urllib.request.Request(url, headers=headers, method='GET')
        with urllib.request.urlopen(req) as response:
            body = response.read().decode('utf-8')
            data = json.loads(body)
            if len(data) > 0:
                nna = data[0]
                print(json.dumps(nna, indent=2))
            else:
                print("[-] Empty response array!")
    except Exception as e:
        print(f"[-] Request failed: {e}")

if __name__ == "__main__":
    main()
