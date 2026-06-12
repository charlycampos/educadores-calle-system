from fastapi import APIRouter, HTTPException, status, Depends, Request
from pydantic import BaseModel, EmailStr
from slowapi import Limiter
from slowapi.util import get_remote_address

from src.domain.use_cases.login_use_case import LoginUseCase, LoginInput, UnauthorizedError
from src.infrastructure.db.repositories.oracle_usuario_repository import OracleUsuarioRepository
from src.infrastructure.http.middleware.jwt_middleware import generar_token, generar_token_descarga, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Rate limiter por IP — protege el login contra fuerza bruta
limiter = Limiter(key_func=get_remote_address)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/login")
@limiter.limit("5/minute")
async def login(request: Request, body: LoginRequest):
    repo = OracleUsuarioRepository()
    use_case = LoginUseCase(usuario_repo=repo, generar_token_fn=generar_token)
    try:
        result = await use_case.execute(LoginInput(email=body.email, password=body.password))
        return {"token": result.token, "user": result.user}
    except UnauthorizedError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/download-token")
async def download_token(current_user: dict = Depends(get_current_user)):
    """Emite un token corto (5 min) para descargas de PDF en URLs."""
    return {"token": generar_token_descarga(current_user), "expiresInSeconds": 300}


@router.get("/me")
async def me(current_user: dict = Depends(get_current_user)):
    """Devuelve el payload del token actual."""
    ret