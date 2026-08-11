from typing import Optional, Any
from datetime import date
from pydantic import BaseModel, model_validator


class ProcesoLogrosBase(BaseModel):
    nna_id: int
    caso_id: Optional[int] = None
    perfil_usuario: Optional[str] = None
    fecha_ingreso: Optional[date] = None
    educador_responsable: Optional[str] = None

    # Fase I (5 ítems)
    f1_fecha: Optional[date] = None      # heredado: era la fecha de evaluación
    f1_inicio: Optional[date] = None
    f1_fin: Optional[date] = None
    f1_i1: Optional[str] = None
    f1_i2: Optional[str] = None
    f1_i3: Optional[str] = None
    f1_i4: Optional[str] = None
    f1_i5: Optional[str] = None
    f1_obs: Optional[str] = None

    # Fase II (10 ítems)
    f2_fecha: Optional[date] = None      # heredado: era la fecha de evaluación
    f2_inicio: Optional[date] = None
    f2_fin: Optional[date] = None
    f2_i1: Optional[str] = None
    f2_i2: Optional[str] = None
    f2_i3: Optional[str] = None
    f2_i4: Optional[str] = None
    f2_i5: Optional[str] = None
    f2_i6: Optional[str] = None
    f2_i7: Optional[str] = None
    f2_i8: Optional[str] = None
    f2_i9: Optional[str] = None
    f2_i10: Optional[str] = None
    f2_obs: Optional[str] = None

    # Fase III (5 ítems)
    f3_fecha: Optional[date] = None      # heredado: era la fecha de evaluación
    f3_inicio: Optional[date] = None
    f3_fin: Optional[date] = None
    f3_i1: Optional[str] = None
    f3_i2: Optional[str] = None
    f3_i3: Optional[str] = None
    f3_i4: Optional[str] = None
    f3_i5: Optional[str] = None
    f3_obs: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def convert_camel_to_snake(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        mapping = {
            "nnaId": "nna_id",
            "casoId": "caso_id",
            "perfilUsuario": "perfil_usuario",
            "fechaIngreso": "fecha_ingreso",
            "educadorResponsable": "educador_responsable",
            "f1Fecha": "f1_fecha", "f1Inicio": "f1_inicio", "f1Fin": "f1_fin",
            "f1I1": "f1_i1", "f1I2": "f1_i2", "f1I3": "f1_i3",
            "f1I4": "f1_i4", "f1I5": "f1_i5",
            "f1Obs": "f1_obs",
            "f2Fecha": "f2_fecha", "f2Inicio": "f2_inicio", "f2Fin": "f2_fin",
            "f2I1": "f2_i1", "f2I2": "f2_i2", "f2I3": "f2_i3",
            "f2I4": "f2_i4", "f2I5": "f2_i5", "f2I6": "f2_i6",
            "f2I7": "f2_i7", "f2I8": "f2_i8", "f2I9": "f2_i9",
            "f2I10": "f2_i10",
            "f2Obs": "f2_obs",
            "f3Fecha": "f3_fecha", "f3Inicio": "f3_inicio", "f3Fin": "f3_fin",
            "f3I1": "f3_i1", "f3I2": "f3_i2", "f3I3": "f3_i3",
            "f3I4": "f3_i4", "f3I5": "f3_i5",
            "f3Obs": "f3_obs",
        }
        new_data = {}
        for k, v in data.items():
            new_data[mapping.get(k, k)] = v
        return new_data


class ProcesoLogrosCreate(ProcesoLogrosBase):
    pass


class ProcesoLogrosResponse(BaseModel):
    id: int
    nna_id: int
    codigo_f05: Optional[str] = None

    class Config:
        from_attributes = True
        extra = "allow"
