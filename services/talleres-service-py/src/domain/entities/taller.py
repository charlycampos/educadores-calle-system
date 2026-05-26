from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field

class TallerBase(BaseModel):
    sede_id: int
    educador_id: int
    tema: str
    fecha_programada: datetime
    objetivos: Optional[str] = None
    metodologia: Optional[str] = None

class PlanificarTallerRequest(BaseModel):
    tema: str
    fecha_programada: datetime
    objetivos: Optional[str] = None
    metodologia: Optional[str] = None

class ParticipanteEjecucion(BaseModel):
    nna_id: int
    asiste: bool
    evaluacion: Optional[str] = None

class EjecutarTallerRequest(BaseModel):
    fecha_ejecucion: datetime
    participantes: List[ParticipanteEjecucion]

class NnaMiniResponse(BaseModel):
    nombres: str
    apellidoPaterno: str
    apellidoMaterno: Optional[str] = None

class ParticipanteResponse(BaseModel):
    id: int
    tallerId: int
    nnaId: int
    asistio: bool
    logros: Optional[str] = None
    limitaciones: Optional[str] = None
    sugerencias: Optional[str] = None
    nna: Optional[NnaMiniResponse] = None

    class Config:
        from_attributes = True

class AgregarParticipanteRequest(BaseModel):
    nnaId: int

class ActualizarParticipanteRequest(BaseModel):
    asistio: Optional[bool] = None
    logros: Optional[str] = None
    limitaciones: Optional[str] = None
    sugerencias: Optional[str] = None

class TallerResponse(TallerBase):
    id: int
    fecha_ejecucion: Optional[datetime] = None
    estado: str
    fecha_registro: datetime
    participantes: Optional[List[ParticipanteResponse]] = None
    
    # Campos adicionales para compatibilidad con el frontend
    nombre: Optional[str] = None
    fecha: Optional[str] = None
    hora: Optional[str] = None

    class Config:
        from_attributes = True
