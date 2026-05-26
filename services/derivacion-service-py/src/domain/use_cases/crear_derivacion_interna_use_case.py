from src.domain.entities.derivacion import DerivacionCreateInterna, DerivacionBase
from src.infrastructure.db.repositories.oracle_derivacion_repository import OracleDerivacionRepository

class CrearDerivacionInternaUseCase:
    def __init__(self, repository: OracleDerivacionRepository):
        self.repository = repository

    async def execute(self, data: DerivacionCreateInterna, remitente_id: int, sede_id: int) -> dict:
        derivacion_base = DerivacionBase(
            caso_id=data.caso_id,
            sede_id=sede_id,
            tipo="INTERNA",
            remitente_id=remitente_id,
            destinatario_id=data.destinatario_id,
            motivo=data.motivo
        )
        return await self.repository.create_derivacion(derivacion_base)
