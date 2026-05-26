from src.domain.entities.diario import DiarioCampoCreate
from src.infrastructure.db.repositories.oracle_diario_repository import OracleDiarioRepository

class DiarioUseCase:
    def __init__(self, repository: OracleDiarioRepository):
        self.repository = repository

    async def registrar_diario(self, data: DiarioCampoCreate, educador_id: int) -> dict:
        return await self.repository.create_diario(data, educador_id)

    async def listar_por_caso(self, caso_id: int) -> list:
        return await self.repository.list_by_caso(caso_id)
