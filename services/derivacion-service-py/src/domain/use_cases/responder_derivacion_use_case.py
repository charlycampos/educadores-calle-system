from src.domain.entities.derivacion import ResponderDerivacionRequest
from src.infrastructure.db.repositories.oracle_derivacion_repository import OracleDerivacionRepository

class ResponderDerivacionUseCase:
    def __init__(self, repository: OracleDerivacionRepository):
        self.repository = repository

    async def execute(self, derivacion_id: int, data: ResponderDerivacionRequest, usuario_id: int, rol: str) -> dict:
        derivacion = await self.repository.get_derivacion(derivacion_id)
        if not derivacion:
            raise ValueError("Derivacion no encontrada")

        if derivacion["estado"] != "PENDIENTE":
            raise ValueError("La derivacion ya ha sido procesada")

        if derivacion["tipo"] == "INTERNA" and derivacion["destinatario_id"] != usuario_id and rol != "COORDINADOR":
             raise ValueError("No autorizado para responder esta derivacion interna")
             
        if derivacion["tipo"] == "EXTERNA" and rol != "COORDINADOR":
             raise ValueError("Solo el coordinador puede responder derivaciones externas")

        estado = "ACEPTADA" if data.accion == "ACEPTAR" else "RECHAZADA"
        return await self.repository.responder_derivacion(derivacion_id, estado, data.observaciones)
