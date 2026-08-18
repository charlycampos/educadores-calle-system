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
    # Muchos NNA de calle se registran solo con la edad, sin fecha de
    # nacimiento. Sin estos dos campos el F10 imprimía la columna Edad vacía
    # para casi todos: Pydantic descarta lo que no está declarado acá, así que
    # no bastaba con traerlos en la consulta.
    edad: Optional[int] = None
    unidadEdad: Optional[str] = None

class FamiliarMiniResponse(BaseModel):
    """Datos del familiar tomados de NNA_FAMILIAR (ficha F03)."""
    nombres: str
    parentesco: Optional[str] = None
    dni: Optional[str] = None
    telefono: Optional[str] = None
    nnaRelacionado: Optional[str] = None   # NNA del taller al que acompaña

class ParticipanteResponse(BaseModel):
    id: int
    tallerId: int
    tipo: str = "NNA"                      # NNA | FAMILIAR
    nnaId: Optional[int] = None
    familiarId: Optional[int] = None
    asistio: bool
    logros: Optional[str] = None
    limitaciones: Optional[str] = None
    sugerencias: Optional[str] = None
    # False = los tres campos de arriba vienen heredados del taller.
    # True  = alguien escribió una evaluación distinta para este participante.
    evaluacionPropia: bool = False
    nna: Optional[NnaMiniResponse] = None
    familiar: Optional[FamiliarMiniResponse] = None

    class Config:
        from_attributes = True


class EvaluacionTallerRequest(BaseModel):
    """
    Formato N° 08 — Evaluación de Talleres Socioeducativos.

    Solo los tres campos que el educador escribe. Los puntos 1, 2, 3, 8 y 9
    del formato —taller, dirigido a, objetivo, lugar/fecha y educador— son
    idénticos al Formato 07 y se heredan de la planificación al imprimir.
    """
    logros: Optional[str] = None
    limitaciones: Optional[str] = None
    sugerencias: Optional[str] = None


class EvaluacionTallerResponse(BaseModel):
    logros: str = ""
    limitaciones: str = ""
    sugerencias: str = ""
    fecha: Optional[str] = None
    evaluadaPorId: Optional[int] = None
    evaluado: bool = False

class FamiliarCandidatoResponse(BaseModel):
    """Familiar sugerido para el taller, derivado de los NNA ya inscritos."""
    familiarId: int
    nombres: str
    parentesco: Optional[str] = None
    dni: Optional[str] = None
    telefono: Optional[str] = None
    viveCon: Optional[str] = None
    nnaRelacionado: Optional[str] = None   # nombre del NNA por el que aparece
    yaInscrito: bool = False

class FamiliarDeNnaResponse(BaseModel):
    """Familiar colgado de un NNA en el árbol de candidatos."""
    familiarId: int
    nombres: str
    parentesco: Optional[str] = None
    dni: Optional[str] = None
    yaInscrito: bool = False

class NnaCandidatoResponse(BaseModel):
    """
    Un NNA del ámbito del educador con su familia anidada.

    Alimenta el selector único: el educador marca al NNA y, si asistieron,
    a sus padres — sin escribir ningún nombre.
    """
    nnaId: int
    nombres: str
    apellidoPaterno: Optional[str] = None
    apellidoMaterno: Optional[str] = None
    numeroDoc: Optional[str] = None
    fechaNacimiento: Optional[str] = None
    sexo: Optional[str] = None
    carpetaCodigo: Optional[str] = None
    yaInscrito: bool = False
    familiares: List[FamiliarDeNnaResponse] = Field(default_factory=list)

class AgregarParticipanteRequest(BaseModel):
    """Admite un NNA (Formato 10) o un familiar (Formato 11)."""
    nnaId: Optional[int] = None
    familiarId: Optional[int] = None

    @property
    def tipo(self) -> str:
        return "FAMILIAR" if self.familiarId is not None else "NNA"

class AgregarParticipantesBulkRequest(BaseModel):
    """Alta masiva: lo que el educador marca con checks en el celular."""
    nnaIds: List[int] = Field(default_factory=list)
    familiarIds: List[int] = Field(default_factory=list)

class ActualizarParticipanteRequest(BaseModel):
    asistio: Optional[bool] = None
    logros: Optional[str] = None
    limitaciones: Optional[str] = None
    sugerencias: Optional[str] = None

class EducadorResponsable(BaseModel):
    nombreCompleto: Optional[str] = None

class FamiliarAcompanante(BaseModel):
    """Familiar del NNA que participó en el mismo taller.

    Sostiene los indicadores del F05 sobre el adulto responsable: sin esto no
    había forma de saber, desde el expediente, si la familia acompaña.
    """
    nombres: str
    parentesco: Optional[str] = None
    asistio: bool = False


class TallerResponse(TallerBase):
    id: int
    fecha_ejecucion: Optional[datetime] = None
    estado: str
    fecha_registro: datetime
    participantes: Optional[List[ParticipanteResponse]] = None
    # Solo lo llena el historial por NNA: quién de su familia fue con él.
    familiaresAcompanantes: Optional[List[FamiliarAcompanante]] = None
    # Asistencia y evaluación del propio NNA en ese taller.
    asiste: Optional[bool] = None
    evaluacion: Optional[str] = None
    # La evaluación DEL TALLER (Formato 08). Distinta de `evaluacion`, que es
    # el texto del NNA en el historial: por eso el nombre no se reutiliza.
    evaluacionTaller: Optional[EvaluacionTallerResponse] = None

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
