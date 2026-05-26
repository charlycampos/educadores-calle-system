from abc import ABC, abstractmethod
from typing import Optional
from ..entities.usuario import Usuario


class IUsuarioRepository(ABC):

    @abstractmethod
    async def find_by_email(self, email: str) -> Optional[Usuario]:
        ...

    @abstractmethod
    async def find_by_id(self, user_id: int) -> Optional[Usuario]:
        ...

    @abstractmethod
    async def create(
        self,
        nombre_completo: str,
        email: str,
        password_hash: str,
        rol_id: int,
        sede_id: int,
        zona_asignada: Optional[str] = None,
    ) -> Usuario:
        ...

    @abstractmethod
    async def list_by_sede(self, sede_id: int) -> list[Usuario]:
        ...

    @abstractmethod
    async def update_password(self, user_id: int, new_hash: str) -> None:
        ...

    @abstractmethod
    async def update(
        self,
        user_id: int,
        nombre_completo: Optional[str] = None,
        rol_id: Optional[int] = None,
        zona_asignada: Optional[str] = None,
        activo: Optional[bool] = None,
    ) -> Usuario:
        ...
