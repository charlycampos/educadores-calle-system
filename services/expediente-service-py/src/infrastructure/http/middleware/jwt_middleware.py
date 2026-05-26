"""
Utilidades JWT: generar y verificar tokens.
El payload incluye sedeId, sedeCodigo y regionId para multi-tenancy.
"""
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from jose import jwt, JWTError
from fastapi import HTTPException, status, Depends

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from src.config import settings

bearer_scheme = HTTPBearer()


def generar_token(payload: dict[str, Any]) -> str:
    data = payload.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    data["exp"] = expire
    data["iat"] = datetime.now(timezone.utc)
    return jwt.encode(data, settings.jwt_secret, algorithm=settings.jwt_algorithm)



def verificar_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
        )


from fastapi import Request

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(

    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Optional[dict[str, Any]]:
    if credentials:
        return verificar_token(credentials.credentials)
    # También verificar si hay un header normal o query param
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        try:
            return verificar_token(auth_header.split(" ")[1])
        except Exception:
            pass
    token_param = request.query_params.get("token")
    if token_param:
        try:
            return verificar_token(token_param)
        except Exception:
            pass
    return None



def require_roles(*roles: str):
    """Dependencia que exige que el usuario tenga uno de los roles indicados."""
    def _check(user: dict = Depends(get_current_user)):
        if user.get("rol") not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para esta acción",
            )
        return user
    return _check
