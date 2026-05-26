from src.domain.entities.pti import PlanTrabajoCreate
from src.infrastructure.db.repositories.oracle_pti_repository import OraclePTIRepository

class PTIUseCase:
    def __init__(self, repository: OraclePTIRepository):
        self.repository = repository

    async def crear_pti(self, caso_id: int, data: PlanTrabajoCreate) -> dict:
        return await self.repository.create_pti(caso_id, data)

    async def obtener_ultimo_pti(self, caso_id: int) -> dict:
        return await self.repository.get_last_pti(caso_id)
