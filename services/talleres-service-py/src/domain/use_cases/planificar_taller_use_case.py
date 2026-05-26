from src.domain.entities.taller import PlanificarTallerRequest, TallerBase
from src.infrastructure.db.repositories.oracle_taller_repository import OracleTallerRepository

class PlanificarTallerUseCase:
    def __init__(self, repository: OracleTallerRepository):
        self.repository = repository

    async def execute(self, data: PlanificarTallerRequest, educador_id: int, sede_id: int) -> dict:
        taller_base = TallerBase(
            sede_id=sede_id,
            educador_id=educador_id,
            tema=data.tema,
            fecha_programada=data.fecha_programada,
            objetivos=data.objetivos,
            metodologia=data.metodologia
        )
        return await self.repository.create_taller(taller_base)
