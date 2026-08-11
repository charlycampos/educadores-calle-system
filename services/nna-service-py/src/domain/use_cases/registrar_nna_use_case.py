"""
Caso de uso: Registrar NNA (puede ser batch — varios hermanos en una carpeta).
Guarda la inscripción inicial y crea el primer caso automáticamente.
El código F03 se asigna al formalizar el compromiso del NNA/apoderado.
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
    estudia_actualmente: int = 0
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
    id: Optional[int] = None
    carpeta_id: Optional[int] = None


@dataclass
class CasoInput:
    sede_id: int
    responsable_id: int
    perfil: str
    zona_intervencion: Optional[str] = None
    distrito_intervencion: Optional[str] = None
    departamento_intervencion: Optional[str] = None
    provincia_intervencion: Optional[str] = None
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
    victima_explotacion: Optional[str] = "NO"


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
        es_borrador: bool = False,
    ) -> list[dict]:
        # 1. Resolver/verificar si corresponde a una actualización de borradores existentes para evitar duplicados
        nnas_to_process = []
        for nna_data in nnas_input:
            existing_nna = None
            existing_case = None

            # A. Buscar por ID si está presente
            if nna_data.id:
                candidate = await self._nna_repo.find_by_id(nna_data.id)
                if candidate:
                    cases = await self._caso_repo.find_by_nna_id(candidate.id)
                    if cases and cases[0].estado == "BORRADOR":
                        existing_nna = candidate
                        existing_case = cases[0]
                    else:
                        raise ConflictError(
                            f"El NNA con ID {nna_data.id} ya está registrado y no es un borrador."
                        )

            # B. Buscar por coincidencias de datos (nombres, documento, etc.)
            if not existing_nna:
                coincidencias = await self._nna_repo.find_duplicates(
                    nombres=nna_data.nombres,
                    apellido_paterno=nna_data.apellido_paterno,
                    apellido_materno=nna_data.apellido_materno,
                    numero_doc=nna_data.numero_doc,
                    tipo_doc=nna_data.tipo_doc
                )

                # Si hay alguna coincidencia registrada (no borrador), arrojamos conflicto inmediato
                for c in coincidencias:
                    if c["estadoCaso"] != "BORRADOR":
                        doc_str = f" con documento {nna_data.numero_doc}" if nna_data.numero_doc else ""
                        raise ConflictError(
                            f"El NNA {nna_data.nombres} {nna_data.apellido_paterno}{doc_str} ya está registrado en el sistema."
                        )

                # Si no hay registrados pero hay un borrador coincidente, lo actualizamos
                for c in coincidencias:
                    if c["estadoCaso"] == "BORRADOR":
                        candidate = await self._nna_repo.find_by_id(c["id"])
                        if candidate:
                            cases = await self._caso_repo.find_by_nna_id(candidate.id)
                            if cases and cases[0].estado == "BORRADOR":
                                existing_nna = candidate
                                existing_case = cases[0]
                                break

            nnas_to_process.append((nna_data, existing_nna, existing_case))

        # 2. Resolver carpeta (priorizando la carpeta del borrador existente si aplica)
        resolved_carpeta_id = carpeta_id
        for _, ext_nna, _ in nnas_to_process:
            if ext_nna and ext_nna.carpeta_id:
                resolved_carpeta_id = ext_nna.carpeta_id
                break

        if not resolved_carpeta_id:
            sede_id = caso_input.sede_id if caso_input else None
            resolved_carpeta_id = await self._carpeta_repo.create_nueva(sede_id=sede_id)

        # 3. Procesar cada NNA (Insertar o Actualizar según corresponda)
        resultado = []
        for nna_data, ext_nna, ext_case in nnas_to_process:
            if ext_nna:
                # UPDATE: Actualizar borrador existente
                nna_dict = {}
                for field in dir(nna_data):
                    if not field.startswith('_') and not callable(getattr(nna_data, field)):
                        nna_dict[field] = getattr(nna_data, field)
                nna_dict["es_borrador"] = es_borrador

                await self._nna_repo.update(ext_nna.id, nna_dict)
                nna = await self._nna_repo.find_by_id(ext_nna.id)

                # Actualizar el caso activo asociado al NNA
                if ext_case:
                    case_data = {
                        "sede_id": caso_input.sede_id,
                        "responsable_id": caso_input.responsable_id,
                        "perfil": caso_input.perfil,
                        "zona_intervencion": caso_input.zona_intervencion,
                        "distrito_intervencion": caso_input.distrito_intervencion,
                        "departamento_intervencion": caso_input.departamento_intervencion,
                        "provincia_intervencion": caso_input.provincia_intervencion,
                        "situacion_calle": caso_input.situacion_calle,
                        "actividad_realizada": caso_input.actividad_realizada,
                        "tiempo_en_calle": caso_input.tiempo_en_calle,
                        "condicion": caso_input.condicion,
                        "fecha_abordaje": caso_input.fecha_abordaje,
                        "fecha_ingreso": caso_input.fecha_ingreso or datetime.now(),
                        "fecha_reingreso": caso_input.fecha_reingreso,
                        "fecha_cambio_perfil": caso_input.fecha_cambio_perfil,
                        "horario_inicio": caso_input.horario_inicio,
                        "horario_fin": caso_input.horario_fin,
                        "horario_inicio2": caso_input.horario_inicio2,
                        "horario_fin2": caso_input.horario_fin2,
                        "dias_trabajo": caso_input.dias_trabajo,
                        "victima_explotacion": caso_input.victima_explotacion or "NO",
                        "estado": "BORRADOR" if es_borrador else "PENDIENTE",
                    }
                    await self._caso_repo.update_by_nna_id(nna.id, case_data)
                    cases = await self._caso_repo.find_by_nna_id(nna.id)
                    caso = cases[0]
                else:
                    codigo_caso = await self._caso_repo.get_next_codigo_caso(caso_input.sede_id)
                    caso_input.estado = "BORRADOR" if es_borrador else "PENDIENTE"
                    caso = await self._caso_repo.create(
                        nna_id=nna.id,
                        codigo_caso=codigo_caso,
                        caso_input=caso_input,
                    )
            else:
                # INSERT: Crear nuevo registro
                codigo_caso = await self._caso_repo.get_next_codigo_caso(caso_input.sede_id)

                nna = await self._nna_repo.create(
                    nna_data=nna_data,
                    carpeta_id=resolved_carpeta_id,
                    codigo_f03=None,
                    tiene_hermanos=len(nnas_input) > 1,
                    cant_hermanos=len(nnas_input) - 1,
                )

                if es_borrador:
                    caso_input.estado = "BORRADOR"
                else:
                    caso_input.estado = "PENDIENTE"

                caso = await self._caso_repo.create(
                    nna_id=nna.id,
                    codigo_caso=codigo_caso,
                    caso_input=caso_input,
                )

            resultado.append({"nna": nna, "caso": caso})

        return resultado
