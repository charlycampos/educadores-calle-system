import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from src.config import settings
from src.infrastructure.db.connection import init_pool, close_pool
from src.infrastructure.http.routers.folio_router import router as folio_router
from src.infrastructure.http.routers.cierre_router import router as cierre_router
from src.infrastructure.http.routers.stats_router import router as stats_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pool()
    print(f"expediente-service corriendo en http://localhost:{settings.port}")
    print("Foliado digital, informes de cierre y estadisticas activos")
    yield
    await close_pool()


app = FastAPI(
    title="SEC Expediente Service",
    version="1.0.0",
    description="Foliado digital, informes de cierre y estadísticas del dashboard",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(folio_router)
app.include_router(cierre_router)
app.include_router(stats_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "expediente-service", "version": "1.0.0"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=(settings.app_env == "development"),
    )
