from src.domain.entities.diario import DiarioCampoCreate
from src.infrastructure.db.repositories.oracle_diario_repository import OracleDiarioRepository

class DiarioUseCase:
    def __init__(self, repository: OracleDiarioRepository):
        self.repository = repository

    async def registrar_diario(self, data: DiarioCampoCreate, educador_id: int) -> dict:
        return await self.repository.create_diario(data, educador_id)

    async def listar_por_caso(self, caso_id: int) -> list:
        return await self.repository.list_by_caso(caso_id)

    async def eliminar_diario(self, entrada_id: int) -> bool:
        return await self.repository.delete_diario(entrada_id)

    async def get_by_id(self, entrada_id: int) -> dict | None:
        return await self.repository.get_by_id(entrada_id)

    async def actualizar_diario(self, entrada_id: int, data: DiarioCampoCreate) -> dict | None:
        return await self.repository.update_diario(entrada_id, data)
