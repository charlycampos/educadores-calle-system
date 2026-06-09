from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class UrgenciaF15Base(BaseModel):
    fecha_atencion: Optional[datetime] = None
    hora_atencion: Optional[str] = None
    zona_atencion: Optional[str] = None
    nna_ubicado: bool = False
    perfil: Optional[str] = None # TRABAJO_CALLE, MENDICIDAD, VIDA_CALLE, OTRO
    antecedentes: Optional[str] = None
    actividades_realiza: Optional[str] = None
    
    # Diagnóstico Inmediato
    nombre_referido: Optional[str] = None
    direccion_referida: Optional[str] = None
    asiste_escuela: bool = False
    escuela_detalle: Optional[str] = None
    grado_escuela: Optional[str] = None
    tiene_dni: bool = False
    tiene_sis: bool = False
    familiares_vive: Optional[str] = None
    horarios_dias: Optional[str] = None
    
    # Indicadores de Riesgo
    riesgo_salud: Optional[str] = None
    riesgo_violencia: Optional[str] = None
    riesgo_escolar: Optional[str] = None
    riesgo_laboral_padres: Optional[str] = None
    riesgo_familiar: Optional[str] = None
    
    # Acciones y Acuerdos
    acciones_realizadas: Optional[str] = None
    otra_situacion: Optional[str] = None
    acuerdos: Optional[str] = None

    # Datos adicionales estructurados (CLOB JSON)
    datos_extra: Optional[dict] = None

class UrgenciaF15Create(UrgenciaF15Base):
    pass

class UrgenciaF15Response(UrgenciaF15Base):
    id: int
    codigo_reporte: str
    educador_id: int
    sede_id: int
    nna_id: Optional[int] = None
    estado: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
