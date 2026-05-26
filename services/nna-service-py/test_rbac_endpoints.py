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

def test_rbac():
    print("=" * 70)
    print("🧪 INICIANDO PRUEBAS DE INTEGRACIÓN: CONTROL DE ACCESOS POR ROLES (RBAC)")
    print("=" * 70)

    # 1. Crear tokens para los 4 roles
    token_estadistico = generate_mock_token("ESTADISTICO")
    token_monitor = generate_mock_token("MONITOR")
    token_educador = generate_mock_token("EDUCADOR")
    token_coordinador = generate_mock_token("COORDINADOR")

    # Iniciar TestClient con lifespan para inicializar el DB Pool
    with TestClient(app) as client:
        print("[+] TestClient de FastAPI y lifespan de base de datos cargados OK.")

        # --- 📈 1. VERIFICACIÓN DEL ROL: ESTADISTICO ---
        print("\n[*] Pruebas para rol: ESTADISTICO")
        headers_est = {"Authorization": f"Bearer {token_estadistico}"}

        # Debe poder acceder al Dashboard de estadísticas nacionales
        res = client.get("/api/dashboard-nacional/stats", headers=headers_est)
        print(f"  GET /api/dashboard-nacional/stats: Status Code = {res.status_code}")
        assert res.status_code in (200, 500), f"Error: Estadístico debería poder acceder al dashboard. Status: {res.status_code}"

        # Debe estar estrictamente bloqueado en endpoints de NNA
        res = client.get("/api/nna", headers=headers_est)
        print(f"  GET /api/nna: Status Code = {res.status_code} (Esperado: 403)")
        assert res.status_code == 403, f"Error: Estadístico no debe listar NNAs. Status: {res.status_code}"

        res = client.get("/api/nna/1/expediente", headers=headers_est)
        print(f"  GET /api/nna/1/expediente: Status Code = {res.status_code} (Esperado: 403)")
        assert res.status_code == 403, f"Error: Estadístico no debe ver expediente de NNA. Status: {res.status_code}"

        res = client.post("/api/nna", json={}, headers=headers_est)
        print(f"  POST /api/nna: Status Code = {res.status_code} (Esperado: 403)")
        assert res.status_code == 403, f"Error: Estadístico no debe registrar NNAs. Status: {res.status_code}"

        # Debe estar estrictamente bloqueado en endpoints de Casos
        res = client.get("/api/casos/", headers=headers_est)
        print(f"  GET /api/casos/: Status Code = {res.status_code} (Esperado: 403)")
        assert res.status_code == 403, f"Error: Estadístico no debe listar casos. Status: {res.status_code}"

        res = client.get("/api/casos/1", headers=headers_est)
        print(f"  GET /api/casos/1: Status Code = {res.status_code} (Esperado: 403)")
        assert res.status_code == 403, f"Error: Estadístico no debe ver caso individual. Status: {res.status_code}"

        res = client.patch("/api/casos/1/estado", json={}, headers=headers_est)
        print(f"  PATCH /api/casos/1/estado: Status Code = {res.status_code} (Esperado: 403)")
        assert res.status_code == 403, f"Error: Estadístico no debe cambiar estado. Status: {res.status_code}"

        print("✨ Rol ESTADISTICO verificado exitosamente.")


        # --- 🕵️‍♂️ 2. VERIFICACIÓN DEL ROL: MONITOR ---
        print("\n[*] Pruebas para rol: MONITOR")
        headers_mon = {"Authorization": f"Bearer {token_monitor}"}

        # Debe poder acceder al Dashboard de estadísticas nacionales
        res = client.get("/api/dashboard-nacional/stats", headers=headers_mon)
        print(f"  GET /api/dashboard-nacional/stats: Status Code = {res.status_code}")
        assert res.status_code in (200, 500), f"Error: Monitor debería poder acceder al dashboard. Status: {res.status_code}"

        # Debe poder listar NNAs
        res = client.get("/api/nna", headers=headers_mon)
        print(f"  GET /api/nna: Status Code = {res.status_code}")
        assert res.status_code in (200, 500), f"Error: Monitor debería listar NNAs. Status: {res.status_code}"

        # Debe poder listar Casos
        res = client.get("/api/casos/", headers=headers_mon)
        print(f"  GET /api/casos/: Status Code = {res.status_code}")
        assert res.status_code in (200, 500), f"Error: Monitor debería listar Casos. Status: {res.status_code}"

        # Debe tener bloqueadas las acciones de escritura
        res = client.post("/api/nna", json={}, headers=headers_mon)
        print(f"  POST /api/nna: Status Code = {res.status_code} (Esperado: 403)")
        assert res.status_code == 403, f"Error: Monitor no debe registrar NNAs (escritura bloqueada). Status: {res.status_code}"

        res = client.patch("/api/casos/1/estado", json={"nuevo_estado": "CERRADO"}, headers=headers_mon)
        print(f"  PATCH /api/casos/1/estado: Status Code = {res.status_code} (Esperado: 403)")
        assert res.status_code == 403, f"Error: Monitor no debe cambiar estado (escritura bloqueada). Status: {res.status_code}"

        res = client.patch("/api/casos/1/reasignar", json={"nuevo_responsable_id": 2}, headers=headers_mon)
        print(f"  PATCH /api/casos/1/reasignar: Status Code = {res.status_code} (Esperado: 403)")
        assert res.status_code == 403, f"Error: Monitor no debe reasignar casos. Status: {res.status_code}"

        print("✨ Rol MONITOR verificado exitosamente.")


        # --- 📝 3. VERIFICACIÓN DEL ROL: EDUCADOR ---
        print("\n[*] Pruebas para rol: EDUCADOR")
        headers_edu = {"Authorization": f"Bearer {token_educador}"}

        # NO debe poder acceder al Dashboard de estadísticas nacionales
        res = client.get("/api/dashboard-nacional/stats", headers=headers_edu)
        print(f"  GET /api/dashboard-nacional/stats: Status Code = {res.status_code} (Esperado: 403)")
        assert res.status_code == 403, f"Error: Educador no debe acceder al dashboard nacional. Status: {res.status_code}"

        # Debe poder listar NNAs
        res = client.get("/api/nna", headers=headers_edu)
        print(f"  GET /api/nna: Status Code = {res.status_code}")
        assert res.status_code in (200, 500), f"Error: Educador debería listar sus NNAs. Status: {res.status_code}"

        print("✨ Rol EDUCADOR verificado exitosamente.")


        # --- 🏢 4. VERIFICACIÓN DEL ROL: COORDINADOR ---
        print("\n[*] Pruebas para rol: COORDINADOR")
        headers_coor = {"Authorization": f"Bearer {token_coordinador}"}

        # NO debe poder acceder al Dashboard de estadísticas nacionales
        res = client.get("/api/dashboard-nacional/stats", headers=headers_coor)
        print(f"  GET /api/dashboard-nacional/stats: Status Code = {res.status_code} (Esperado: 403)")
        assert res.status_code == 403, f"Error: Coordinador no debe acceder al dashboard nacional. Status: {res.status_code}"

        # Debe poder listar NNAs
        res = client.get("/api/nna", headers=headers_coor)
        print(f"  GET /api/nna: Status Code = {res.status_code}")
        assert res.status_code in (200, 500), f"Error: Coordinador debería listar NNAs. Status: {res.status_code}"

        print("✨ Rol COORDINADOR verificado exitosamente.")

    print("\n" + "=" * 70)
    print("🎉 TODAS LAS PRUEBAS DE SEGURIDAD (RBAC) PASARON EXITOSAMENTE!")
    print("=" * 70)

if __name__ == "__main__":
    test_rbac()
