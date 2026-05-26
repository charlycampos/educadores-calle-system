from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr

from src.domain.use_cases.login_use_case import LoginUseCase, LoginInput, UnauthorizedError
from src.infrastructure.db.repositories.oracle_usuario_repository import OracleUsuarioRepository
from src.infrastructure.http.middleware.jwt_middleware import generar_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/login")
async def login(body: LoginRequest):
    repo = OracleUsuarioRepository()
    use_case = LoginUseCase(usuario_repo=repo, generar_token_fn=generar_token)
    try:
        result = await use_case.execute(LoginInput(email=body.email, password=body.password))
        return {"token": result.token, "user": result.user}
    except UnauthorizedError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.get("/me")
async def me(current_user: dict = Depends(get_current_user)):
    """Devuelve el payload del token actual."""
    return current_user


@router.post("/verify")
async def verify_token(current_user: dict = Depends(get_current_user)):
    """Verifica que el token sea válido (usado por otros servicios)."""
    return {"valid": True, "user": current_user}
