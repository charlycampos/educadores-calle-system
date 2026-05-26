from dataclasses import dataclass
from typing import Optional
from datetime import datetime


@dataclass
class InformeCierre:
    id: int
    codigo_informe: Optional[str]
    caso_id: int
    motivo_egreso: str
    fecha_egreso: Optional[datetime]
    situacion_familiar: Optional[str]
    situacion_educativa: Optional[str]
    logros_alcanzados: Optional[str]
    recomendaciones: Optional[str]
    archivo_url: Optional[str]
    creado_por_id: int
    created_at: Optional[datetime]
    updated_at: Optional[datetime] = None
