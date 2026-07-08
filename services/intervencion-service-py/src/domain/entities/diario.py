from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class DiarioCampoBase(BaseModel):
    caso_id: Optional[int] = None
    ubicacion: Optional[str] = None
    actividad: Optional[str] = None
    estado_fisico: Optional[str] = None
    estado_animo: Optional[str] = None
    observaciones: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None

class DiarioCampoCreate(DiarioCampoBase):
    pass

class DiarioCampoResponse(DiarioCampoBase):
    id: int
    creado_por_id: int
    fecha: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
