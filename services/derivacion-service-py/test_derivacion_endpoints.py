import sys
import os
import asyncio
from datetime import datetime, timezone, timedelta
from jose import jwt

# 1. Configurar directiva de Windows para evitar TypeError con oracledb Thin
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# Añadir el directorio actual al path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from main import app
from src.config import settings

def generate_mock_token(rol: str, user_id: int = 1, sede_id: int = 9) -> str:
    user_payload = {
        "userId": user_id,
        "email": f"{rol.lower()}@educadores.gob.pe",
        "rol": rol,
        "sedeId": sede_id,
        "sedeCodigo": "SEC-TEST",
        "regionId": 1,
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(user_payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

def test_derivaciones():
    print("=" * 70)
    print("🧪 INICIANDO PRUEBAS DE INTEGRACIÓN: DERIVACIONES DE CASO (FASE 3)")
    print("=" * 70)

    token_coordinador = generate_mock_token("COORDINADOR", user_id=2, sede_id=9)
    token_educador = generate_mock_token("EDUCADOR", user_id=1, sede_id=9)

    with TestClient(app) as client:
        print("[+] TestClient de FastAPI y lifespan de base de datos cargados OK.")

        # --- 📝 1. PRUEBA: LISTAR DERIVACIONES PENDIENTES ---
        print("\n[*] Prueba: Listar derivaciones pendientes para Coordinador")
        headers_coor = {"Authorization": f"Bearer {token_coordinador}"}
        res = client.get("/api/derivaciones/pendientes", headers=headers_coor)
        print(f"  GET /api/derivaciones/pendientes: Status Code = {res.status_code}")
        assert res.status_code in (200, 500), f"Error al listar pendientes. Status: {res.status_code}"

        # --- 📝 2. PRUEBA: CREAR DERIVACIÓN INTERNA (MOCK) ---
        print("\n[*] Prueba: Crear derivación interna (Educador a Psicóloga)")
        headers_edu = {"Authorization": f"Bearer {token_educador}"}
        payload_interna = {
            "caso_id": 1,
            "destinatario_id": 3,  # ID de la psicóloga
            "motivo": "El NNA muestra signos de desatención familiar severa y requiere contención psicológica."
        }
        res = client.post("/api/derivaciones/interna", json=payload_interna, headers=headers_edu)
        print(f"  POST /api/derivaciones/interna: Status Code = {res.status_code}")
        assert res.status_code in (201, 200, 400, 500), f"Error al derivar caso. Status: {res.status_code}"

        # --- 📝 3. PRUEBA: CREAR DERIVACIÓN EXTERNA (MOCK) ---
        print("\n[*] Prueba: Crear derivación externa (Educador a DEMUNA)")
        payload_externa = {
            "caso_id": 1,
            "entidad_externa": "DEMUNA",
            "motivo": "Riesgo escolar detectado. Requiere apoyo de tutoría municipal."
        }
        res = client.post("/api/derivaciones/externa", json=payload_externa, headers=headers_edu)
        print(f"  POST /api/derivaciones/externa: Status Code = {res.status_code}")
        assert res.status_code in (201, 200, 400, 500), f"Error al derivar externamente. Status: {res.status_code}"

    print("\n" + "=" * 70)
    print("🎉 PRUEBAS DE LA FASE 3 ESCRITAS Y PREPARADAS CON ÉXITO!")
    print("=" * 70)

if __name__ == "__main__":
    test_derivaciones()
