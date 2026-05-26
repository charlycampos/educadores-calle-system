from src.infrastructure.db.repositories.oracle_taller_repository import OracleTallerRepository

class ListarTalleresUseCase:
    def __init__(self, repository: OracleTallerRepository):
        self.repository = repository

    async def get_all(self) -> list:
        return await self.repository.list_all()

    async def get_by_sede(self, sede_id: int) -> list:
        return await self.repository.list_by_sede(sede_id)

    async def get_by_educador(self, educador_id: int) -> list:
        return await self.repository.list_by_educador(educador_id)

    async def get_by_nna(self, nna_id: int) -> list:
        return await self.repository.list_by_nna(nna_id)

    async def get_detail(self, taller_id: int) -> dict:
        return await self.repository.get_taller_with_participants(taller_id)
