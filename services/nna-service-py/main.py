import uvicorn
import logging
import logging.config
import os
import time
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import traceback
from contextlib import asynccontextmanager

# ── Configuración de logging ───────────────────────────────────────────────────
os.makedirs("logs", exist_ok=True)

LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "detallado": {
            "format": "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
    },
    "handlers": {
        "consola": {
            "class": "logging.StreamHandler",
            "formatter": "detallado",
            "stream": "ext://sys.stdout",
        },
        "archivo": {
            "class": "logging.handlers.RotatingFileHandler",
            "formatter": "detallado",
            "filename": "../../nna-service.log",
            "maxBytes": 5_000_000,   # 5 MB por archivo
            "backupCount": 5,
            "encoding": "utf-8",
        },
    },
    "root": {
        "level": "INFO",
        "handlers": ["consola", "archivo"],
    },
    # Silenciar loggers muy verbosos de librerías externas
    "loggers": {
        "uvicorn.access":   {"level": "WARNING"},
        "oracledb":         {"level": "WARNING"},
        "asyncio":          {"level": "WARNING"},
    },
}

logging.config.dictConfig(LOGGING_CONFIG)
logger = logging.getLogger("main")

# ── Importaciones de tu sistema ───────────────────────────────────────────────
from src.config import settings
from src.infrastructure.db.connection import init_pool, close_pool
from src.infrastructure.http.routers import (
    nna_router,
    caso_router,
    dashboard_router,
    traslado_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=" * 60)
    logger.info("NNA Service arrancando...")
    logger.info("=" * 60)
    for r in app.routes:
        logger.info(f"Route path: {getattr(r, 'path', None)}, methods: {getattr(r, 'methods', None)}")
    await init_pool()
    logger.info("Pool Oracle inicializado OK")
    yield
    logger.info("NNA Service apagándose...")
    await close_pool()


class AuditMiddleware:
    """
    Middleware ASGI puro para auditoría.
    Evita los bugs de BaseHTTPMiddleware con el manejo del stream de receive.
    """
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        t0 = time.time()
        
        # Usamos un Request temporal para leer el body de forma segura
        request = Request(scope, receive)
        try:
            body_bytes = await request.body()
        except Exception as e:
            logger.error(f"Error leyendo body en middleware: {e}")
            body_bytes = b""

        logger.info(
            f">>> {scope['method']} {scope['path']} "
            f"| body_size={len(body_bytes)}B"
        )

        # Creamos un receive que inyecte el body ya leído
        _body_returned = False
        async def receive_with_body():
            nonlocal _body_returned
            if not _body_returned:
                _body_returned = True
                return {"type": "http.request", "body": body_bytes, "more_body": False}
            return await receive()

        # Envolvemos send para capturar el status de la respuesta
        async def send_with_audit(message):
            if message["type"] == "http.response.start":
                elapsed = (time.time() - t0) * 1000
                logger.info(
                    f"<<< {scope['method']} {scope['path']} "
                    f"| status={message['status']} | {elapsed:.0f}ms"
                )
            await send(message)

        try:
            await self.app(scope, receive_with_body, send_with_audit)
        except Exception as exc:
            elapsed = (time.time() - t0) * 1000
            logger.error(
                f"!!! {scope['method']} {scope['path']} "
                f"| EXCEPCIÓN tras {elapsed:.0f}ms: {exc}",
                exc_info=True,
            )
            raise exc

app = FastAPI(title="SEC - NNA Service (PRODUCCIÓN)", lifespan=lifespan)

# Registrar Middlewares (orden inverso de ejecución)
app.add_middleware(AuditMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Handler para loguear errores de validación (422)
from fastapi.exceptions import RequestValidationError
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    logger.error(f"[422 VALIDATION ERROR] {request.method} {request.url.path}")
    for e in errors:
        logger.error(f"  Campo: {'.'.join(str(x) for x in e.get('loc', []))} | Error: {e.get('msg')} | Input: {str(e.get('input', ''))[:200]}")
    return JSONResponse(
        status_code=422,
        content={"detail": errors, "message": " | ".join(f"{'.'.join(str(x) for x in e.get('loc', []))}: {e.get('msg')}" for e in errors)}
    )

@app.get("/health")
async def health():
    return {
        "status": "ok", 
        "service": "nna-service", 
        "version": "1.1.0", 
        "info": "Servicio completamente funcional con todos los routers"
    }

# INCLUSIÓN DE ROUTERS CON PREFIJO /api
app.include_router(nna_router.router, prefix="/api")
app.include_router(caso_router.router, prefix="/api")
app.include_router(dashboard_router.router, prefix="/api")
app.include_router(traslado_router.router, prefix="/api")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=3002, reload=True)
# Force reload token: 1

