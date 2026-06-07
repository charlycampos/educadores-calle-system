from src.domain.entities.pti import PlanTrabajoCreate
from src.infrastructure.db.repositories.oracle_pti_repository import OraclePTIRepository

class PTIUseCase:
    def __init__(self, repository: OraclePTIRepository):
        self.repository = repository

    async def crear_pti(self, caso_id: int, data: PlanTrabajoCreate) -> dict:
        return await self.repository.create_pti(caso_id, data)

    async def obtener_ultimo_pti(self, caso_id: int) -> dict:
        return await self.repository.get_last_pti(caso_id)

    async def listar_ptis(self, caso_id: int) -> list:
        return await self.repository.get_all_ptis(caso_id)

    async def actualizar_accion(self, accion_id: int, data: dict) -> dict:
        return await self.repository.update_accion(accion_id, data)
