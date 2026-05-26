from fastapi import Request
from jose import jwt, JWTError
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from src.config import settings

class JWTMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Dejar pasar preflights CORS sin validar token
        if request.method == "OPTIONS":
            return await call_next(request)
        if request.url.path.startswith("/api/"):
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                return JSONResponse(status_code=401, content={"detail": "Token missing or invalid format"})

            token = auth_header.split(" ")[1]
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
