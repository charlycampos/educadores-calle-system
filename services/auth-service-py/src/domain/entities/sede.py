from dataclasses import dataclass
from typing import Optional


@dataclass
class Sede:
    id: int
    codigo: str
    nombre: str
    region_id: int
    region: str
    departamento: str
    provincia: str
    direccion: Optional[str]
    telefono: Optional[str]
    activo: int
