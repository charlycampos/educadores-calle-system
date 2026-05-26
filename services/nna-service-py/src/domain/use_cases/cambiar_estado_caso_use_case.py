"""
Caso de uso: Cambiar estado de un caso.
Valida transiciones permitidas y registra en historial.
"""
from dataclasses import dataclass
from typing import Optional


class TransicionInvalidaError(Exception):
    pass


class NotFoundError(Exception):
    pass


@dataclass
class CambiarEstadoInput:
    caso_id: int
    nuevo_estado: str
    usuario_id: int
    motivo: Optional[str] = None
    tipo_cambio: str = "CAMBIO_ESTADO"


class CambiarEstadoCasoUseCase:
    def __init__(self, caso_repo, historial_repo):
        self._caso_repo = caso_repo
        self._historial_repo = historial_repo

    async def execute(self, input: CambiarEstadoInput):
        caso = await self._caso_repo.find_by_id(input.caso_id)
        if not caso:
            raise NotFoundError(f"Caso {input.caso_id} no encontrado")

        if not caso.puede_cambiar_a(input.nuevo_estado):
            raise TransicionInvalidaError(
                f"No se puede cambiar de '{caso.estado}' a '{input.nuevo_estado}'"
            )

        estado_anterior = caso.estado

        # Actualizar estado
        await self._caso_repo.update_estado(
            caso_id=input.caso_id,
            nuevo_estado=input.nuevo_estado,
        )

        # Registrar en historial
        await self._historial_repo.create(
            caso_id=input.caso_id,
            estado_anterior=estado_anterior,
            estado_nuevo=input.nuevo_estado,
            usuario_id=input.usuario_id,
            motivo=input.motivo,
            tipo_cambio=input.tipo_cambio,
        )

        return {"caso_id": input.caso_id, "estado": input.nuevo_estado}
