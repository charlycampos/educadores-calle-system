from dataclasses import dataclass
from typing import Optional
from datetime import datetime

ESTADOS_VALIDOS = ["CAPTACION", "EN_EVALUACION", "INTERVENCION", "SEGUIMIENTO", "DERIVADO", "CERRADO"]


@dataclass
class Caso:
    id: int
    codigo_caso: str
    nna_id: int
    sede_id: int
    responsable_id: int
    perfil: str
    estado: str
    fase: str = "I"  # I, II o III
    # Intervención
    zona_intervencion: Optional[str] = None
    distrito_intervencion: Optional[str] = None
    actividad_realizada: Optional[str] = None
    tiempo_en_calle: Optional[str] = None
    condicion: Optional[str] = None
    nivel_riesgo: Optional[str] = None
    situacion_calle: Optional[str] = None
    antecedente_institucional: Optional[str] = None
    victima_explotacion: Optional[str] = "NO"
    # Horarios / días
    horario_inicio: Optional[str] = None
    horario_fin: Optional[str] = None
    horario_inicio2: Optional[str] = None
    horario_fin2: Optional[str] = None
    dias_trabajo: Optional[str] = None
    # Fechas
    fecha_apertura: Optional[datetime] = None
    fecha_cierre: Optional[datetime] = None
    fecha_abordaje: Optional[datetime] = None
    fecha_ingreso: Optional[datetime] = None
    fecha_reingreso: Optional[datetime] = None
    fecha_cambio_perfil: Optional[datetime] = None
    fecha_apertura_expediente: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Datos del NNA (join)
    nna_nombres: Optional[str] = None
    nna_apellidos: Optional[str] = None
    responsable_nombre: Optional[str] = None

    def puede_cambiar_a(self, nuevo_estado: str) -> bool:
        """Valida transiciones de estado permitidas."""
        transiciones = {
            "CAPTACION":      ["EN_EVALUACION"],
            "EN_EVALUACION":  ["INTERVENCION", "DERIVADO"],
            "INTERVENCION":   ["SEGUIMIENTO", "DERIVADO", "CERRADO"],
            "SEGUIMIENTO":    ["CERRADO", "INTERVENCION"],
            "DERIVADO":       ["CERRADO"],
            "CERRADO":        [],
        }
        return nuevo_estado in transiciones.get(self.estado, [])
