from src.domain.entities.diagnostico import DiagnosticoSocialCreate
from src.infrastructure.db.repositories.oracle_diagnostico_repository import OracleDiagnosticoRepository

class DiagnosticoUseCase:
    def __init__(self, repository: OracleDiagnosticoRepository):
        self.repository = repository

    async def guardar_diagnostico(self, nna_id: int, data: DiagnosticoSocialCreate) -> dict:
        return await self.repository.create_diagnostico(nna_id, data)

    async def obtener_diagnostico_por_nna(self, nna_id: int) -> list[dict]:
        return await self.repository.get_by_nna(nna_id)

    async def obtener_diagnostico_por_id(self, diag_id: int) -> dict:
        return await self.repository.get_by_id(diag_id)

    async def actualizar_diagnostico(self, diag_id: int, data: DiagnosticoSocialCreate) -> dict:
        return await self.repository.update_diagnostico(diag_id, data)

    async def eliminar_diagnostico(self, diag_id: int) -> bool:
        return await self.repository.delete_diagnostico(diag_id)
