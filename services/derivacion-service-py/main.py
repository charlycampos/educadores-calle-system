import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from src.config import settings
from src.infrastructure.db.connection import init_pool, close_pool
from src.infrastructure.http.middleware.jwt_middleware import JWTMiddleware
from src.infrastructure.http.routers.derivacion_router import router as derivacion_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pool()
    print(f"derivacion-service corriendo en http://localhost:{settings.port}")
    print("Manejo de derivaciones internas y externas activo")
    yield
    await close_pool()


app = FastAPI(
    title="SEC Derivacion Service",
    version="1.0.0",
    description="Microservicio de derivaciones del NNA",
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

app.include_router(derivacion_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "derivacion-service", "version": "1.0.0"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=(settings.app_env == "development"),
    )
