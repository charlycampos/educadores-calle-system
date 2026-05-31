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
                
                # Extract and map tiempo_en_calle from nested quantities
                if "tiempo" in det and isinstance(det["tiempo"], dict):
                    cant = det["tiempo"].get("cantidad") or ""
                    uni = det["tiempo"].get("unidad") or ""
                    if cant:
                        new_data["tiempo_en_calle"] = f"{cant} {uni}".strip()
                
                # Auto-calculate situacion_calle from nested checkboxes if not present
                if not new_data.get("situacion_calle") and "perfil" in det and isinstance(det["perfil"], dict):
                    perf = det["perfil"]
                    if perf.get("trabajoInfantil"):
                        new_data["situacion_calle"] = "TRABAJO_EN_CALLE"
                    elif perf.get("mendicidad"):
                        new_data["situacion_calle"] = "MENDICIDAD"
                    elif perf.get("vidaEnCalle"):
                        if perf.get("transito"):
                            new_data["situacion_calle"] = "TRANSITO_CALLE"
                        elif perf.get("convivencia"):
                            new_data["situacion_calle"] = "CONVIVENCIA_CALLE"
                        else:
                            new_data["situacion_calle"] = "VIDA_EN_CALLE"
            
            # Map address and contact details
            if "direccionActual" in data and not new_data.get("direccion_tutor"):
                new_data["direccion_tutor"] = data["direccionActual"]
            if "telefonoContacto" in data and not new_data.get("telefono_tutor"):
                new_data["telefono_tutor"] = data["telefonoContacto"]

            # Concatenate tutor full name from split fields if possible
            tutor_pri = data.get("tutorPrimerApellido") or ""
            tutor_seg = data.get("tutorSegundoApellido") or ""
            tutor_nom = data.get("tutorNombre") or ""
            if tutor_pri or tutor_seg or tutor_nom:
                new_data["nombre_tutor"] = f"{tutor_pri} {tutor_seg} {tutor_nom}".strip()

            # Siempre reemplazar datos_extra con el payload actual completo,
            # excluyendo el propio datos_extra para evitar anidamiento circular
            new_data["datos_extra"] = {k: v for k, v in data.items() if k != "datos_extra"}
            
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
