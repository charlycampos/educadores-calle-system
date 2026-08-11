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
    # Secciones V y VI del modelo oficial (migración 006).
    indicadores_vulnerab: Optional[str] = None
    pii_fase1: Optional[str] = None
    pii_fase2: Optional[str] = None
    pii_fase3: Optional[str] = None
    correlativo: Optional[int] = None
    anio: Optional[int] = None
    # NNA que cubre el informe. Son varios cuando son hermanos: el expediente
    # sigue siendo individual, lo compartido es el informe.
    nna_ids: Optional[list] = None
