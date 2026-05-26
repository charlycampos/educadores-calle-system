from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, model_validator

class DiagnosticoSocialBase(BaseModel):
    nna_id: int
    situacion_calle: Optional[str] = None
    tiempo_en_calle: Optional[str] = None
    motivo_ingreso: Optional[str] = None
    lugar_pernota: Optional[str] = None
    actividad_calle: Optional[str] = None
    consumo_sustancias: bool = False
    nombre_tutor: Optional[str] = None
    dni_tutor: Optional[str] = None
    direccion_tutor: Optional[str] = None
    telefono_tutor: Optional[str] = None
    datos_extra: Optional[Dict[str, Any]] = None

    @model_validator(mode="before")
    @classmethod
    def convert_camel_to_snake(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Translate keys from camelCase to snake_case
            mapping = {
                "nnaId": "nna_id",
                "situacionCalle": "situacion_calle",
                "tiempoEnCalle": "tiempo_en_calle",
                "motivoIngreso": "motivo_ingreso",
                "lugarPernota": "lugar_pernota",
                "actividadCalle": "actividad_calle",
                "consumoSustancias": "consumo_sustancias",
                "tutorNombre": "nombre_tutor",
                "tutorDNI": "dni_tutor",
                "tutorDireccion": "direccion_tutor",
                "tutorTelefono": "telefono_tutor",
            }
            new_data = {}
            for k, v in data.items():
                target_key = mapping.get(k, k)
                new_data[target_key] = v
            
            # Map sub-structures if present
            if "situacionCalleDetalle" in data and isinstance(data["situacionCalleDetalle"], dict):
                det = data["situacionCalleDetalle"]
                if "motivo" in det and not new_data.get("motivo_ingreso"):
                    new_data["motivo_ingreso"] = det["motivo"]
                if "lugar" in det and not new_data.get("lugar_pernota"):
                    new_data["lugar_pernota"] = det["lugar"]
                if "actividad" in det and not new_data.get("actividad_calle"):
                    new_data["actividad_calle"] = det["actividad"]
                if "consumo" in det and isinstance(det["consumo"], dict):
                    new_data["consumo_sustancias"] = bool(det["consumo"].get("si"))
            
            # Map address and contact details
            if "direccionActual" in data and not new_data.get("direccion_tutor"):
                new_data["direccion_tutor"] = data["direccionActual"]
            if "telefonoContacto" in data and not new_data.get("telefono_tutor"):
                new_data["telefono_tutor"] = data["telefonoContacto"]

            # Put original unmodified data as backing datos_extra JSON
            if "datos_extra" not in new_data or not new_data["datos_extra"]:
                new_data["datos_extra"] = data
            
            return new_data
        return data

class DiagnosticoSocialCreate(DiagnosticoSocialBase):
    pass

class DiagnosticoSocialResponse(BaseModel):
    id: int
    nna_id: int
    codigo_ficha_04: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    # Permite retornar campos extra dinámicos mapeados del JSON
    class Config:
        from_attributes = True
        extra = "allow"
