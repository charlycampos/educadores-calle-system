from dataclasses import dataclass
from typing import Optional
from datetime import datetime

# Tipos de documento válidos según arquitectura
TIPOS_DOCUMENTO = [
    "F03",        # Ficha de Inscripción
    "F04",        # Diagnóstico Social
    "EVAL_PSIC",  # Evaluación Psicológica
    "F06",        # Ficha de Derivación
    "PII",        # Plan de Intervención Individual
    "DC",         # Diario de Campo
    "F07",        # Plan de Taller
    "F08",        # Ejecución de Taller
    "F10",        # Seguimiento Familiar
    "F11",        # Informe Mensual
    "F09",        # Informe Situacional
    "F12",        # Informe de Egreso
    "F05",        # Logros y Actividades
    "INF",        # Informe de Cierre
    "OFIC",       # Oficio de Traslado
    "LEG",        # Informe Legal
]


@dataclass
class Folio:
    id: int
    caso_id: int
    sede_id: int
    numero_folio: int
    tipo_documento: str
    titulo: str
    archivo_url: str
    hash_documento: Optional[str]
    creado_por_id: int
    fecha_creacion: Optional[datetime]
    usuario_responsable: Optional[str] = None

