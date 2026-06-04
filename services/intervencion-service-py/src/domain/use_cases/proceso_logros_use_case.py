from src.domain.entities.proceso_logros import ProcesoLogrosCreate
from src.infrastructure.db.repositories.oracle_proceso_logros_repository import OracleProcesoLogrosRepository


class ProcesoLogrosUseCase:
    def __init__(self, repo: OracleProcesoLogrosRepository):
        self.repo = repo

    async def guardar(self, nna_id: int, data: ProcesoLogrosCreate) -> dict:
        return await self.repo.create(nna_id, data)

    async def obtener_por_nna(self, nna_id: int) -> list[dict]:
        return await self.repo.get_by_nna(nna_id)

    async def obtener_por_id(self, logros_id: int) -> dict | None:
        return await self.repo.get_by_id(logros_id)

    async def actualizar(self, logros_id: int, data: ProcesoLogrosCreate) -> dict:
        return await self.repo.update(logros_id, data)
