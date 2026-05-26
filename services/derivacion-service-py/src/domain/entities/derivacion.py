from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class DerivacionBase(BaseModel):
    caso_id: int
    sede_id: int
    tipo: str = Field(..., pattern="^(INTERNA|EXTERNA)$")
    entidad_externa: Optional[str] = None
    remitente_id: int
    destinatario_id: Optional[int] = None
    motivo: str


class DerivacionCreateInterna(BaseModel):
    caso_id: int
    destinatario_id: int
    motivo: str


class DerivacionCreateExterna(BaseModel):
    caso_id: int
    entidad_externa: str
    motivo: str


class DerivacionResponse(DerivacionBase):
    id: int
    estado: str
    fecha_derivacion: datetime
    fecha_respuesta: Optional[datetime] = None
    observaciones: Optional[str] = None

    class Config:
        from_attributes = True


class ResponderDerivacionRequest(BaseModel):
    accion: str = Field(..., pattern="^(ACEPTAR|RECHAZAR)$")
    observaciones: Optional[str] = None
