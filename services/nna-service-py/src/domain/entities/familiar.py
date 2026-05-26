from dataclasses import dataclass
from typing import Optional
from datetime import datetime


@dataclass
class Familiar:
    id: int
    carpeta_id: int
    nombres: str
    parentesco: str
    dni: Optional[str] = None
    telefono: Optional[str] = None
    ocupacion: Optional[str] = None
    vive_con: str = "NO"
    created_at: Optional[datetime] = None
