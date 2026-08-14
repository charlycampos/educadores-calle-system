from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class SeguimientoFamiliarBase(BaseModel):
    caso_id: Optional[int] = None
    tema_tratado: Optional[str] = None
    acuerdos: Optional[str] = None
    evaluacion: Optional[str] = None
    proxima_visita: Optional[datetime] = None
    fecha_termino: Optional[datetime] = None
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
    # BORRADOR mientras el educador la va llenando; FINALIZADA al cerrarla.
    # Por defecto FINALIZADA para no cambiar el comportamiento de las fichas
    # que ya existían antes de que hubiera borradores.
    estado: Optional[str] = "FINALIZADA"

class SeguimientoFamiliarCreate(SeguimientoFamiliarBase):
    pass

class SeguimientoFamiliarUpdate(SeguimientoFamiliarBase):
    pass

class SeguimientoFamiliarResponse(SeguimientoFamiliarBase):
    id: int
    educador_id: int
    fecha: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
