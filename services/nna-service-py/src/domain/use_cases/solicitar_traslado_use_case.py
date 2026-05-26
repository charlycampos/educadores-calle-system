"""
Caso de uso: Solicitar traslado de NNA (interno o externo).
Solo el COORDINADOR puede iniciar un traslado.
"""
from dataclasses import dataclass
from typing import Optional


class PermissionError(Exception):
    pass


class NotFoundError(Exception):
    pass


@dataclass
class SolicitarTrasladoInput:
    caso_id: int
    sede_destino_id: int
    motivo: str
    coordinador_origen_id: int
    sede_origen_id: int
    region_origen_id: int
    region_destino_id: int


class SolicitarTrasladoUseCase:
    def __init__(self, caso_repo, traslado_repo):
        self._caso_repo = caso_repo
        self._traslado_repo = traslado_repo

    async def execute(self, input: SolicitarTrasladoInput):
        caso = await self._caso_repo.find_by_id(input.caso_id)
        if not caso:
            raise NotFoundError(f"Caso {input.caso_id} no encontrado")

        # Determinar tipo: INTERNO (misma región) o EXTERNO (distinta región)
        tipo = "INTERNO" if input.region_origen_id == input.region_destino_id else "EXTERNO"

        traslado = await self._traslado_repo.create(
            caso_id=input.caso_id,
            nna_id=caso.nna_id,
            tipo=tipo,
            sede_origen_id=input.sede_origen_id,
            sede_destino_id=input.sede_destino_id,
            coordinador_origen_id=input.coordinador_origen_id,
            motivo=input.motivo,
        )
        return traslado


@dataclass
class ResponderTrasladoInput:
    traslado_id: int
    coordinador_dest_id: int
    sede_dest_id: int
    aceptar: bool
    observaciones: Optional[str] = None


class ResponderTrasladoUseCase:
    def __init__(self, caso_repo, traslado_repo, historial_repo):
        self._caso_repo = caso_repo
        self._traslado_repo = traslado_repo
        self._historial_repo = historial_repo

    async def execute(self, input: ResponderTrasladoInput):
        traslado = await self._traslado_repo.find_by_id(input.traslado_id)
        if not traslado:
            raise NotFoundError(f"Traslado {input.traslado_id} no encontrado")

        nuevo_estado = "ACEPTADO" if input.aceptar else "RECHAZADO"

        await self._traslado_repo.update_estado(
            traslado_id=input.traslado_id,
            estado=nuevo_estado,
            coordinador_dest_id=input.coordinador_dest_id,
            observaciones=input.observaciones,
        )

        if input.aceptar:
            # Cambiar sede del caso al destino
            await self._caso_repo.update_sede(
                caso_id=traslado.caso_id,
                nueva_sede_id=input.sede_dest_id,
            )
            # Registrar en historial
            await self._historial_repo.create(
                caso_id=traslado.caso_id,
                estado_anterior=None,
                estado_nuevo="ACTIVO",
                usuario_id=input.coordinador_dest_id,
                motivo=f"Traslado {traslado.tipo} aceptado desde sede {traslado.sede_origen_id}",
                tipo_cambio=f"TRASLADO_{traslado.tipo}",
            )

        return {"traslado_id": input.traslado_id, "estado": nuevo_estado}
