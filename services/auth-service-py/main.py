"""
auth-service — FastAPI + python-oracledb
Puerto: 3001 (compatible con el stack anterior Node.js)
"""
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from src.config import settings
from src.infrastructure.db.connection import init_pool, close_pool
from src.infrastructure.http.routers.auth_router import router as auth_router
from src.infrastructure.http.routers.sede_router import router as sede_router
from src.infrastructure.http.routers.usuario_router import router as usuario_router
from src.infrastructure.http.routers.statistics_router import router as statistics_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_pool()
    sedes_count = await _count_sedes()
    print(f"🚀 auth-service corriendo en http://localhost:{settings.port}")
    print(f"🔑 JWT multi-sede activo")
    print(f"🏢 {sedes_count} sedes disponibles")
    yield
    # Shutdown
    await close_pool()


async def _count_sedes() -> int:
    from src.infrastructure.db.connection import get_pool
    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute("SELECT COUNT(*) FROM SEC_SEDE WHERE ACTIVO = 1")
            row = await cur.fetchone()
            return row[0] if row else 0


app = FastAPI(
    title="SEC Auth Service",
    version="2.0.0",
    description="Servicio de autenticación multi-sede para el sistema SEC",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # Ajustar en producción
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(sede_router)
app.include_router(usuario_router)
app.include_router(statistics_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "auth-service", "version": "2.0.0"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=(settings.app_env == "development"),
    )
