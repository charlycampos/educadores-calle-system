"""
Utilidades JWT: generar y verificar tokens.
El payload incluye sedeId, sedeCodigo y regionId para multi-tenancy.
"""
from datetime import datetime, timedelta, timezone
from typing import Any
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


def generar_token_descarga(user: dict[str, Any]) -> str:
    """Token corto (5 min) solo para descargas de PDF vía query param."""
    data = {
        "userId": user.get("userId"), "sedeId": user.get("sedeId"),
        "rol": user.get("rol"), "scope": "download",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(data, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def verificar_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
        )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict[str, Any]:
    return verificar_token(credentials.credentials)


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
