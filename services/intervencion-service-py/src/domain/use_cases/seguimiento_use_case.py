from src.domain.entities.seguimiento import SeguimientoFamiliarCreate
from src.infrastructure.db.repositories.oracle_seguimiento_repository import OracleSeguimientoRepository

class SeguimientoUseCase:
    def __init__(self, repository: OracleSeguimientoRepository):
        self.repository = repository

    async def registrar_seguimiento(self, caso_id: int, data: SeguimientoFamiliarCreate, educador_id: int) -> dict:
        return await self.repository.create_seguimiento(caso_id, data, educador_id)

    async def listar_por_caso(self, caso_id: int) -> list:
        return await self.repository.list_by_caso(caso_id)
