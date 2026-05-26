"""
Caso de uso: Registrar NNA (puede ser batch — varios hermanos en una carpeta).
Genera código F03 correlativo y crea el primer caso automáticamente.
"""
from dataclasses import dataclass
from typing import Optional
from datetime import datetime


@dataclass
class NnaInput:
    nombres: str
    apellido_paterno: str
    apellido_materno: Optional[str]
    tipo_doc: str
    numero_doc: Optional[str]
    fecha_nacimiento: Optional[datetime]
    sexo: Optional[str]
    nacionalidad: str = "PERUANA"
    # Identidad / documentos
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
    # Familia / vivienda
    nombre_tutor: Optional[str] = None
    vive_con: Optional[str] = None
    detalle_vive_con: Optional[str] = None
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
    # Edad y otros
    caracteristicas: Optional[str] = None
    actividades_tiempo_libre: Optional[str] = None
    edad: Optional[int] = None
    unidad_edad: Optional[str] = "ANIOS"  # 'ANIOS', 'MESES', 'DIAS'

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

    datos_f03: Optional[str] = None       # CLOB de respaldo (familiares, etc.)


@dataclass
class CasoInput:
    sede_id: int
    responsable_id: int
    perfil: str
    zona_intervencion: Optional[str] = None
    distrito_intervencion: Optional[str] = None
    situacion_calle: Optional[str] = None
    actividad_realizada: Optional[str] = None
    tiempo_en_calle: Optional[str] = None
    condicion: Optional[str] = None
    fecha_abordaje: Optional[datetime] = None
    fecha_ingreso: Optional[datetime] = None
    fecha_reingreso: Optional[datetime] = None
    fecha_cambio_perfil: Optional[datetime] = None
    horario_inicio: Optional[str] = None
    horario_fin: Optional[str] = None
    horario_inicio2: Optional[str] = None
    horario_fin2: Optional[str] = None
    dias_trabajo: Optional[str] = None


class ConflictError(Exception):
    pass


class RegistrarNnaUseCase:
    def __init__(self, nna_repo, caso_repo, carpeta_repo):
        self._nna_repo = nna_repo
        self._caso_repo = caso_repo
        self._carpeta_repo = carpeta_repo

    async def execute(
        self,
        nnas_input: list[NnaInput],
        caso_input: CasoInput,
        carpeta_id: Optional[int] = None,
        crear_nueva_carpeta: bool = True,
    ) -> list[dict]:
        # 1. Verificar documentos duplicados
        for nna_data in nnas_input:
            if nna_data.numero_doc and nna_data.tipo_doc != "SIN_DOC":
                existente = await self._nna_repo.find_by_doc(nna_data.numero_doc)
                if existente:
                    raise ConflictError(
                        f"El documento {nna_data.numero_doc} ({nna_data.nombres}) ya está registrado"
                    )

        # 2. Resolver carpeta
        if not carpeta_id or crear_nueva_carpeta:
            sede_id = caso_input.sede_id if caso_input else None
            carpeta_id = await self._carpeta_repo.create_nueva(sede_id=sede_id)

        # 3. Obtener próximo código F03
        proximo_f03 = await self._nna_repo.get_next_codigo_f03()

        # 4. Crear cada NNA + su caso
        resultado = []
        for i, nna_data in enumerate(nnas_input):
            codigo_f03 = f"F03-{datetime.now().year}-{(proximo_f03 + i):04d}"
            codigo_caso = await self._caso_repo.get_next_codigo_caso()

            nna = await self._nna_repo.create(
                nna_data=nna_data,
                carpeta_id=carpeta_id,
                codigo_f03=codigo_f03,
                tiene_hermanos=len(nnas_input) > 1,
                cant_hermanos=len(nnas_input) - 1,
            )

            caso = await self._caso_repo.create(
                nna_id=nna.id,
                codigo_caso=codigo_caso,
                caso_input=caso_input,
            )

            resultado.append({"nna": nna, "caso": caso})

        return resultado
