from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class SeguimientoFamiliarBase(BaseModel):
    caso_id: int
    tema_tratado: Optional[str] = None
    acuerdos: Optional[str] = None
    evaluacion: Optional[str] = None
    proxima_visita: Optional[datetime] = None

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
