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
            metodologia=data.metodologia,
            lugar=data.lugar,
            dirigido_a=data.dirigido_a,
            num_personas_planificadas=data.num_personas_planificadas,
            acciones_previas=data.acciones_previas,
            inicio_tiempo=data.inicio_tiempo,
            inicio_materiales=data.inicio_materiales,
            proceso_tiempo=data.proceso_tiempo,
            proceso_materiales=data.proceso_materiales,
            cierre_tiempo=data.cierre_tiempo,
            cierre_materiales=data.cierre_materiales,
        )
        return await self.repository.create_taller(taller_base)
