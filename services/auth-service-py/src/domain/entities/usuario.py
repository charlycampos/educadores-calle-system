from dataclasses import dataclass
from typing import Optional


@dataclass
class Usuario:
    id: int
    nombre_completo: str
    email: str
    password_hash: str
    rol: str          # nombre del rol (ej: "ADMIN", "SUPERVISOR")
    rol_id: int
    sede_id: int
    sede_codigo: str
    region_id: int
    zona_asignada: Optional[str]
    activo: int

    def esta_activo(self) -> bool:
        return bool(self.activo)
