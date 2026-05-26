from dataclasses import dataclass
from typing import Optional
import bcrypt

from ..repositories.i_usuario_repository import IUsuarioRepository


@dataclass
class LoginInput:
    email: str
    password: str


@dataclass
class LoginOutput:
    token: str
    user: dict


class UnauthorizedError(Exception):
    pass


class LoginUseCase:
    def __init__(self, usuario_repo: IUsuarioRepository, generar_token_fn):
        self._repo = usuario_repo
        self._generar_token = generar_token_fn

    async def execute(self, input: LoginInput) -> LoginOutput:
        usuario = await self._repo.find_by_email(input.email)

        if not usuario:
            raise UnauthorizedError("Credenciales inválidas")

        if not usuario.esta_activo():
            raise UnauthorizedError("Usuario inactivo. Contacte al administrador.")

        if not bcrypt.checkpw(input.password.encode(), usuario.password_hash.encode()):
            raise UnauthorizedError("Credenciales inválidas")

        token = self._generar_token({
            "userId":     usuario.id,
            "email":      usuario.email,
            "rol":        usuario.rol,
            "sedeId":     usuario.sede_id,
            "sedeCodigo": usuario.sede_codigo,
            "regionId":   usuario.region_id,
        })

        return LoginOutput(
            token=token,
            user={
                "id":         usuario.id,
                "nombre":     usuario.nombre_completo,
                "email":      usuario.email,
                "rol":        usuario.rol,
                "sedeId":     usuario.sede_id,
                "sedeCodigo": usuario.sede_codigo,
                "zona":       usuario.zona_asignada,
            }
        )
