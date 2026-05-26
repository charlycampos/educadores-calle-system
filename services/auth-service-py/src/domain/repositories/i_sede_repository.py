from abc import ABC, abstractmethod
from typing import Optional
from ..entities.sede import Sede


class ISedeRepository(ABC):

    @abstractmethod
    async def find_all_active(self) -> list[Sede]:
        ...

    @abstractmethod
    async def find_by_id(self, sede_id: int) -> Optional[Sede]:
        ...

    @abstractmethod
    async def find_by_codigo(self, codigo: str) -> Optional[Sede]:
        ...
