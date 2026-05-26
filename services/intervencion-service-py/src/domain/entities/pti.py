from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

class AccionPTIBase(BaseModel):
    descripcion: str
    meta: Optional[str] = None
    plazo: Optional[str] = None
    responsable: Optional[str] = None
    estado: Optional[str] = "PENDIENTE"

class AccionPTICreate(AccionPTIBase):
    pass

class AccionPTIResponse(AccionPTIBase):
    id: int
    plan_trabajo_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class PlanTrabajoBase(BaseModel):
    caso_id: int
    objetivo_general: Optional[str] = None

class PlanTrabajoCreate(PlanTrabajoBase):
    acciones: Optional[List[AccionPTICreate]] = []

class PlanTrabajoResponse(PlanTrabajoBase):
    id: int
    codigo_pti: Optional[str] = None
    fecha_inicio: datetime
    fecha_revision: Optional[datetime] = None
    estado: str
    acciones: List[AccionPTIResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
