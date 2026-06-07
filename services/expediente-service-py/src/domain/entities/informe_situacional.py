from dataclasses import dataclass
from typing import Optional
from datetime import datetime


@dataclass
class InformeSituacional:
    id: int
    caso_id: int
    fecha_informe: datetime
    destinatario: str
    asunto: str
    antecedentes: Optional[str]
    estrategias: Optional[str]
    situacion_salud: Optional[str]
    situacion_educativa: Optional[str]
    situacion_familiar: Optional[str]
    conclusiones: Optional[str]
    recomendaciones: Optional[str]
    creado_por_id: int
    created_at: Optional[datetime]
    estado: str = 'BORRADOR'
    updated_at: Optional[datetime] = None
    codigo_informe: Optional[str] = None
