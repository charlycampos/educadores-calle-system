from dataclasses import dataclass
from typing import Optional
from datetime import datetime


@dataclass
class Traslado:
    id: int
    caso_id: int
    nna_id: int
    tipo: str               # INTERNO | EXTERNO
    sede_origen_id: int
    sede_destino_id: int
    coordinador_origen_id: int
    coordinador_dest_id: Optional[int]
    motivo: str
    estado: str             # PENDIENTE | ACEPTADO | RECHAZADO
    fecha_solicitud: Optional[datetime]
    fecha_respuesta: Optional[datetime]
    observaciones: Optional[str]
