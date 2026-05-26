from src.domain.entities.derivacion import DerivacionCreateExterna, DerivacionBase
from src.infrastructure.db.repositories.oracle_derivacion_repository import OracleDerivacionRepository

class CrearDerivacionExternaUseCase:
    def __init__(self, repository: OracleDerivacionRepository):
        self.repository = repository

    async def execute(self, data: DerivacionCreateExterna, remitente_id: int, sede_id: int) -> dict:
        derivacion_base = DerivacionBase(
            caso_id=data.caso_id,
            sede_id=sede_id,
            tipo="EXTERNA",
            entidad_externa=data.entidad_externa,
            remitente_id=remitente_id,
            motivo=data.motivo
        )
        return await self.repository.create_derivacion(derivacion_base)
