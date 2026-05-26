from dataclasses import dataclass
from typing import Optional
import bcrypt

from ..repositories.i_usuario_repository import IUsuarioRepository
from ..entities.usuario import Usuario


@dataclass
class CrearUsuarioInput:
    nombre_completo: str
    email: str
    password: str
    rol_id: int
    sede_id: int
    zona_asignada: Optional[str] = None


class ConflictError(Exception):
    pass


class CrearUsuarioUseCase:
    def __init__(self, usuario_repo: IUsuarioRepository):
        self._repo = usuario_repo

    async def execute(self, input: CrearUsuarioInput) -> Usuario:
        existente = await self._repo.find_by_email(input.email)
        if existente:
            raise ConflictError(f"El email '{input.email}' ya está en uso")

        password_hash = bcrypt.hashpw(input.password.encode(), bcrypt.gensalt()).decode()

        usuario = await self._repo.create(
            nombre_completo=input.nombre_completo,
            email=input.email,
            password_hash=password_hash,
            rol_id=input.rol_id,
            sede_id=input.sede_id,
            zona_asignada=input.zona_asignada,
        )
        return usuario
