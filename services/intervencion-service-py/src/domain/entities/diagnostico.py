from typing import Optional, Dict, Any
from datetime import date, datetime, timedelta, timezone
from pydantic import BaseModel, model_validator

MOTIVO_PRIMERA_INFANCIA = "MENOR DE 3 AÑOS"

EDUCACION_DEPENDIENTE_VACIA = {
    "eduNivel": "",
    "eduGrado": "",
    "eduTurno": "",
    "eduTipoIE": "",
    "eduModalidad": "",
    "eduInstitucion": "",
    "presentaAtraso": False,
    "tiempoAtraso": "",
    "motivoAtraso": "",
    "problemasAprendizaje": False,
    "problemasConducta": False,
    "intensidadConducta": "",
    "expulsado": False,
    "vecesExpulsado": "",
    "faltasTardanzas": False,
    "seDuermeClase": False,
    "sufreBullying": False,
    "tutorConversaDocente": False,
}

class DiagnosticoSocialBase(BaseModel):
    nna_id: int
    situacion_calle: Optional[str] = None
    tiempo_en_calle: Optional[str] = None
    motivo_ingreso: Optional[str] = None
    lugar_pernota: Optional[str] = None
    actividad_calle: Optional[str] = None
    consumo_sustancias: Optional[bool] = None
    nombre_tutor: Optional[str] = None
    dni_tutor: Optional[str] = None
    direccion_tutor: Optional[str] = None
    telefono_tutor: Optional[str] = None
    datos_extra: Optional[Dict[str, Any]] = None

    @model_validator(mode="before")
    @classmethod
    def convert_camel_to_snake(cls, data: Any) -> Any:
        if isinstance(data, dict):
            data = dict(data)

            # La aplicación del F04 puede abarcar varias sesiones. El inicio se
            # fija en el primer guardado y el fin al registrar la ficha completa.
            hoy = datetime.now(timezone(timedelta(hours=-5))).date()
            es_borrador = bool(data.get("es_borrador"))
            inicio_raw = data.get("fechaInicioAplicacion") or hoy.isoformat()
            fin_raw = data.get("fechaFinAplicacion") or (None if es_borrador else hoy.isoformat())

            try:
                inicio = date.fromisoformat(str(inicio_raw))
                fin = date.fromisoformat(str(fin_raw)) if fin_raw else None
            except ValueError as exc:
                raise ValueError("Las fechas de aplicación deben tener el formato AAAA-MM-DD.") from exc

            if inicio > hoy or (fin and fin > hoy):
                raise ValueError("Las fechas de aplicación no pueden ser posteriores a la fecha actual.")
            if fin and inicio > fin:
                raise ValueError("La fecha de inicio de aplicación no puede ser posterior a la fecha de fin.")

            # Primera infancia: se evalúa a la fecha de inicio del F04 para que
            # la clasificación histórica no cambie al editar la ficha años después.
            es_menor_de_tres = False
            fecha_nacimiento_raw = data.get("fechaNacimiento")
            if fecha_nacimiento_raw:
                try:
                    nacimiento = date.fromisoformat(str(fecha_nacimiento_raw))
                    es_menor_de_tres = (
                        inicio.year,
                        inicio.month,
                        inicio.day,
                    ) < (
                        nacimiento.year + 3,
                        nacimiento.month,
                        nacimiento.day,
                    )
                except ValueError:
                    pass
            elif data.get("edad") not in (None, ""):
                try:
                    edad = float(data.get("edad"))
                    unidad = str(data.get("unidadEdad") or "ANIOS").upper()
                    if "DIA" in unidad:
                        es_menor_de_tres = edad < 1095
                    elif "MES" in unidad:
                        es_menor_de_tres = edad < 36
                    else:
                        es_menor_de_tres = edad < 3
                except (TypeError, ValueError):
                    pass

            if es_menor_de_tres:
                data.update(EDUCACION_DEPENDIENTE_VACIA)
                data["eduEstudia"] = "NO_APLICA"
                data["eduMotivoNoEstudia"] = MOTIVO_PRIMERA_INFANCIA
            elif data.get("eduEstudia") in ("NO", "NO_APLICA"):
                data.update(EDUCACION_DEPENDIENTE_VACIA)

            # Solo General / Situación de calle es obligatorio para finalizar.
            # Los borradores y las demás secciones admiten información parcial.
            if not es_borrador:
                faltantes = []
                detalle = data.get("situacionCalleDetalle") or {}
                perfil = detalle.get("perfil") or {}
                tipo_doc = str(data.get("tipoDoc") or "").strip()

                def vacio(valor: Any) -> bool:
                    return valor is None or str(valor).strip() == ""

                if vacio(data.get("apellidoPaterno")):
                    faltantes.append("Primer apellido")
                if vacio(data.get("nombres")):
                    faltantes.append("Nombres")
                if vacio(data.get("sexo")):
                    faltantes.append("Sexo")
                if vacio(data.get("fechaNacimiento")) and vacio(data.get("edad")):
                    faltantes.append("Fecha de nacimiento o edad estimada")
                if not tipo_doc:
                    faltantes.append("Tipo de documento")
                elif tipo_doc != "7" and vacio(data.get("numeroDoc")):
                    faltantes.append("Número de documento")
                elif tipo_doc == "7" and vacio(data.get("detalleSinDoc")):
                    faltantes.append("Motivo por el que no tiene documento")
                if not any(bool(valor) for valor in perfil.values()):
                    faltantes.append("Perfil o situación de calle")

                if faltantes:
                    raise ValueError("Complete los campos obligatorios de General / Situación de calle: " + ", ".join(faltantes))

            data["fechaInicioAplicacion"] = inicio.isoformat()
            data["fechaFinAplicacion"] = fin.isoformat() if fin else ""

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
