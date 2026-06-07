from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class SeguimientoFamiliarBase(BaseModel):
    caso_id: int
    tema_tratado: Optional[str] = None
    acuerdos: Optional[str] = None
    evaluacion: Optional[str] = None
    proxima_visita: Optional[datetime] = None
    zona: Optional[str] = None
    entrevistado: Optional[str] = None
    parentesco: Optional[str] = None
    telefono: Optional[str] = None
    lugar_seguimiento: Optional[str] = None
    direccion: Optional[str] = None
    hora: Optional[str] = None
    antecedentes: Optional[str] = None
    descripcion: Optional[str] = None
    observaciones: Optional[str] = None
    nombre_educador: Optional[str] = None

class SeguimientoFamiliarCreate(SeguimientoFamiliarBase):
    pass

class SeguimientoFamiliarResponse(SeguimientoFamiliarBase):
    id: int
    educador_id: int
    fecha: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
