import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from src.config import settings
from src.infrastructure.db.connection import init_pool, close_pool
from src.infrastructure.http.middleware.jwt_middleware import JWTMiddleware
from src.infrastructure.http.routers.taller_router import router as taller_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pool()
    print(f"talleres-service corriendo en http://localhost:{settings.port}")
    print("Gestion de talleres socioeducativos activa (Formatos 07 y 08)")
    yield
    await close_pool()


app = FastAPI(
    title="SEC Talleres Service",
    version="1.0.0",
    description="Microservicio de talleres socioeducativos",
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

app.include_router(taller_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "talleres-service", "version": "1.0.0"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=(settings.app_env == "development"),
    )
