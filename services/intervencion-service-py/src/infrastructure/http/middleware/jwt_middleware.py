from fastapi import Request
from jose import jwt, JWTError
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from src.config import settings

_PDF_SUFFIXES = ("/pdf", "/pdf/pages")

class JWTMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Dejar pasar preflights CORS sin validar token
        if request.method == "OPTIONS":
            return await call_next(request)
        if request.url.path.startswith("/api/"):
            path = request.url.path
            is_pdf_endpoint = any(path.endswith(s) for s in _PDF_SUFFIXES)

            # Para endpoints PDF el token puede venir en el query param (iframe no envía headers)
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
            elif is_pdf_endpoint:
                token = request.query_params.get("token")
                if not token:
                    return JSONResponse(status_code=401, content={"detail": "Token missing"})
            else:
                return JSONResponse(status_code=401, content={"detail": "Token missing or invalid format"})

            try:
                payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
                request.state.user_id = payload.get("userId")
                request.state.email = payload.get("email")
                request.state.rol = payload.get("rol")
                request.state.sede_id = payload.get("sedeId")

                if not request.state.user_id or not request.state.sede_id:
                    return JSONResponse(status_code=401, content={"detail": "Token missing required claims"})

            except JWTError as e:
                return JSONResponse(status_code=401, content={"detail": f"Token validation failed: {str(e)}"})

        response = await call_next(request)
        return response
