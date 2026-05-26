from src.domain.entities.taller import EjecutarTallerRequest
from src.infrastructure.db.repositories.oracle_taller_repository import OracleTallerRepository

class EjecutarTallerUseCase:
    def __init__(self, repository: OracleTallerRepository):
        self.repository = repository

    async def execute(self, taller_id: int, data: EjecutarTallerRequest, educador_id: int, rol: str) -> dict:
        taller = await self.repository.get_taller(taller_id)
        if not taller:
            raise ValueError("Taller no encontrado")

        if taller["estado"] != "PLANIFICADO":
            raise ValueError("El taller ya ha sido ejecutado o cancelado")

        if taller["educador_id"] != educador_id and rol != "COORDINADOR":
             raise ValueError("No autorizado para ejecutar este taller")

        return await self.repository.ejecutar_taller(taller_id, data)
