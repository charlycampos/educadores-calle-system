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
    lugar: Optional[str] = None
    dirigido_a: Optional[str] = None
    num_personas_planificadas: Optional[int] = None
    acciones_previas: Optional[str] = None
    inicio_tiempo: Optional[str] = None
    inicio_materiales: Optional[str] = None
    proceso_tiempo: Optional[str] = None
    proceso_materiales: Optional[str] = None
    cierre_tiempo: Optional[str] = None
    cierre_materiales: Optional[str] = None

class PlanificarTallerRequest(BaseModel):
    tema: str
    fecha_programada: datetime
    objetivos: Optional[str] = None
    metodologia: Optional[str] = None
    lugar: Optional[str] = None
    dirigido_a: Optional[str] = None
    num_personas_planificadas: Optional[int] = None
    acciones_previas: Optional[str] = None
    inicio_tiempo: Optional[str] = None
    inicio_materiales: Optional[str] = None
    proceso_tiempo: Optional[str] = None
    proceso_materiales: Optional[str] = None
    cierre_tiempo: Optional[str] = None
    cierre_materiales: Optional[str] = None

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
    fechaNacimiento: Optional[str] = None
    sexo: Optional[str] = None

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

class EducadorResponsable(BaseModel):
    nombreCompleto: Optional[str] = None

class TallerResponse(TallerBase):
    id: int
    fecha_ejecucion: Optional[datetime] = None
    estado: str
    fecha_registro: datetime
    participantes: Optional[List[ParticipanteResponse]] = None

    # Campos camelCase para compatibilidad con el frontend
    nombre: Optional[str] = None
    fecha: Optional[str] = None
    hora: Optional[str] = None
    dirigidoA: Optional[str] = None
    numeroPersonasPlanificadas: Optional[int] = None
    accionesPrevias: Optional[str] = None
    inicioActividad: Optional[str] = None
    inicioTiempo: Optional[str] = None
    inicioMateriales: Optional[str] = None
    procesoActividad: Optional[str] = None
    procesoTiempo: Optional[str] = None
    procesoMateriales: Optional[str] = None
    cierreActividad: Optional[str] = None
    cierreTiempo: Optional[str] = None
    cierreMateriales: Optional[str] = None
    educadorResponsable: Optional[EducadorResponsable] = None

    class Config:
        from_attributes = True
