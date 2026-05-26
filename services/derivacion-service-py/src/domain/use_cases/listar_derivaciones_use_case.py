from src.infrastructure.db.repositories.oracle_derivacion_repository import OracleDerivacionRepository

class ListarDerivacionesUseCase:
    def __init__(self, repository: OracleDerivacionRepository):
        self.repository = repository

    async def get_pendientes(self, sede_id: int, usuario_id: int, rol: str) -> list:
        # Si es coordinador, ve todas las pendientes de la sede (incluyendo externas).
        # Si es educador/psicologo/tsoc/abogado, ve solo las internas pendientes donde es el destinatario.
        if rol == "COORDINADOR":
            return await self.repository.list_pendientes_coordinador(sede_id)
        else:
            return await self.repository.list_pendientes_usuario(usuario_id)

    async def get_by_caso(self, caso_id: int) -> list:
        return await self.repository.list_by_caso(caso_id)
