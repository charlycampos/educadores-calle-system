from dataclasses import dataclass
from typing import Optional
from datetime import datetime


@dataclass
class Nna:
    id: int
    nombres: str
    apellido_paterno: str
    apellido_materno: Optional[str]
    tipo_doc: str
    numero_doc: Optional[str]
    fecha_nacimiento: Optional[datetime]
    sexo: Optional[str]
    nacionalidad: str
    carpeta_id: Optional[int]
    codigo_ficha03: Optional[str] = None

    # Identidad / Documentos
    tiene_partida_nacimiento: bool = False
    detalle_sin_doc: Optional[str] = None

    # Lugar de nacimiento
    departamento_nac: Optional[str] = None
    provincia_nac: Optional[str] = None
    distrito_nac: Optional[str] = None

    # Domicilio
    domicilio_actual: Optional[str] = None
    referencia_domicilio: Optional[str] = None
    departamento_dom: Optional[str] = None
    provincia_dom: Optional[str] = None
    distrito_dom: Optional[str] = None
    telefono_contacto: Optional[str] = None

    # Familia
    nombre_tutor: Optional[str] = None
    vive_con: Optional[str] = None
    detalle_vive_con: Optional[str] = None
    tiene_hermanos: bool = False
    cant_hermanos: int = 0
    detalles_hermanos: Optional[str] = None
    lugar_pernocte: Optional[str] = None
    detalle_lugar_pernocte: Optional[str] = None
    tiene_antecedente_albergue: bool = False
    detalle_antecedente_albergue: Optional[str] = None

    # Salud
    afiliado_sis: Optional[str] = None
    afiliado_otro_seguro: Optional[str] = None
    detalle_otro_seguro: Optional[str] = None
    sufre_enfermedad: bool = False
    detalle_enfermedad: Optional[str] = None
    observaciones_salud: Optional[str] = None
    tiene_discapacidad: bool = False
    tipo_discapacidad: Optional[str] = None
    detalle_discapacidad: Optional[str] = None

    # Educación
    estudia_actualmente: bool = False
    nivel_educativo: Optional[str] = None
    grado_estudio: Optional[str] = None
    institucion_educativa: Optional[str] = None
    modalidad_estudio: Optional[str] = None
    detalle_no_estudia: Optional[str] = None

    # Edad
    edad: Optional[int] = None
    unidad_edad: Optional[str] = None  # 'ANIOS', 'MESES', 'DIAS'

    # Otros
    actividades_tiempo_libre: Optional[str] = None
    caracteristicas: Optional[str] = None
    foto_url: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    # Variables de Tutor / Adulto Responsable (SEC 2026)
    tiene_tutor_apo: Optional[int] = 0
    pri_ape_tut_apo: Optional[str] = None
    seg_ape_tut_apo: Optional[str] = None
    nom_ape_tut_apo: Optional[str] = None
    sexo_apo: Optional[str] = None
    fecha_nac_apo: Optional[datetime] = None
    nacionalidad_apo: Optional[str] = "PERUANA"
    tip_doc_tut_apo: Optional[str] = None
    nro_doc_tut_apo: Optional[str] = None
    vin_tut_usu: Optional[str] = None
    len_mat_apo: Optional[str] = None
    len_mat_esp_apo: Optional[str] = None
    aut_ide_et_apo: Optional[str] = None
    aut_ide_et_esp_apo: Optional[str] = None
    tipo_discap_apo: Optional[str] = None
    cert_discap_apo: Optional[str] = None

    # Nuevas variables socio-demográficas del NNA (SEC 2026)
    len_mat_nna: Optional[str] = None
    len_mat_esp_nna: Optional[str] = None
    aut_ide_et_nna: Optional[str] = None
    aut_ide_et_esp_nna: Optional[str] = None
    cert_discap_nna: Optional[str] = None

    # CLOB — se mantiene como respaldo, ya no es la fuente de verdad
    datos_f03: Optional[str] = None

    @property
    def nombre_completo(self) -> str:
        partes = [self.nombres, self.apellido_paterno, self.apellido_materno]
        return " ".join(p for p in partes if p)
