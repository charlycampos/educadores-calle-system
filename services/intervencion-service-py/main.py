import sys
import asyncio

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from src.config import settings
from src.infrastructure.db.connection import init_pool, close_pool
from src.infrastructure.http.middleware.jwt_middleware import JWTMiddleware

from src.infrastructure.http.routers.diario_router import router as diario_router
from src.infrastructure.http.routers.pti_router import router as pti_router
from src.infrastructure.http.routers.diagnostico_router import router as diagnostico_router
from src.infrastructure.http.routers.seguimiento_router import router as seguimiento_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pool()
    print(f"intervencion-service corriendo en http://localhost:{settings.port}")
    print("Módulos activos: Diario, PTI, F04 Diagnostico, F10 Seguimiento")
    yield
    await close_pool()


app = FastAPI(
    title="SEC Intervencion Service",
    version="1.0.0",
    description="Microservicio principal para el control de la intervención de los Educadores de Calle",
    lifespan=lifespan,
)

app.add_middleware(JWTMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(diario_router)
app.include_router(pti_router)
app.include_router(diagnostico_router)
app.include_router(seguimiento_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "intervencion-service", "version": "1.0.0"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=(settings.app_env == "development"),
    )
