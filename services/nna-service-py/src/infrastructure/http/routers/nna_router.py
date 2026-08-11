import unicodedata
from difflib import SequenceMatcher
import logging
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks, Request
from pydantic import BaseModel

logger = logging.getLogger("nna_router")

from src.domain.use_cases.registrar_nna_use_case import (
    RegistrarNnaUseCase, NnaInput, CasoInput, ConflictError
)
from src.infrastructure.db.repositories.oracle_nna_repository import (
    OracleNnaRepository, OracleCarpetaRepository
)
from src.infrastructure.db.repositories.oracle_caso_repository import OracleCasoRepository, OracleHistorialRepository
from src.infrastructure.db.repositories.oracle_familiar_repository import OracleFamiliarRepository
from src.infrastructure.db.repositories.oracle_parametro_repository import OracleParametroRepository
from src.infrastructure.http.middleware.jwt_middleware import get_current_user

router = APIRouter(prefix="/nna", tags=["nna"])


# ─── Modelos de entrada ────────────────────────────────────────────────────────

class FamiliarItem(BaseModel):
    nombres:    str
    parentesco: str
    dni:        Optional[str] = None
    telefono:   Optional[str] = None
    ocupacion:  Optional[str] = None
    viveCon:    str = "NO"


class FamiliaresRequest(BaseModel):
    familiares: list[FamiliarItem]


class NnaItemRequest(BaseModel):
    id: Optional[int] = None
    carpeta_id: Optional[int] = None
    nombres: str
    apellido_paterno: str
    apellido_materno: Optional[str] = None
    tipo_doc: Optional[str] = "SIN_DOC"
    numero_doc: Optional[str] = None
    fecha_nacimiento: Optional[datetime] = None
    sexo: Optional[str] = None
    nacionalidad: Optional[str] = "PERUANA"
    tiene_partida_nacimiento: bool = True
    detalle_sin_doc: Optional[str] = None

    # Ubicación Nacimiento
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
    estudia_actualmente: int = 0
    nivel_educativo: Optional[str] = None
    grado_estudio: Optional[str] = None
    institucion_educativa: Optional[str] = None
    modalidad_estudio: Optional[str] = None
    detalle_no_estudia: Optional[str] = None

    # Edad
    edad: Optional[int] = None
    unidad_edad: Optional[str] = "ANIOS"  # ANIOS | MESES | DIAS

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

    # Otros
    actividades_tiempo_libre: Optional[str] = None
    caracteristicas: Optional[str] = None

    # CLOB de respaldo (ya no es requerido, pero se acepta por compatibilidad)
    datos_f03: Optional[str] = None


class RegistrarNnaRequest(BaseModel):
    nnas: list[NnaItemRequest]
    perfil: Optional[str] = "SIN_PERFIL"
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
    crear_nueva_carpeta: Optional[bool] = True
    carpeta_id: Optional[int] = None
    familiares: Optional[list[FamiliarItem]] = None
    es_borrador: Optional[bool] = False


class VerificarDuplicadosRequest(BaseModel):
    nombres: str
    apellido_paterno: str
    apellido_materno: Optional[str] = None
    tipo_doc: str
    numero_doc: Optional[str] = None


# --- endpoints ---

@router.post("/verificar-duplicados")
async def verificar_duplicados(body: VerificarDuplicadosRequest, user: dict = Depends(get_current_user)):
    rol = user.get("rol", "")
    if rol == "ESTADISTICO":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")
    repo = OracleNnaRepository()
    try:
        coincidencias = await repo.find_duplicates(
            nombres=body.nombres,
            apellido_paterno=body.apellido_paterno,
            apellido_materno=body.apellido_materno,
            numero_doc=body.numero_doc,
            tipo_doc=body.tipo_doc
        )
        return {
            "hayDuplicados": len(coincidencias) > 0,
            "coincidencias": coincidencias
        }
    except Exception as e:
        logger.error(f"Error al verificar duplicados: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{carpeta_id}/familiares")
async def listar_familiares(carpeta_id: int, user: dict = Depends(get_current_user)):
    rol = user.get("rol", "")
    if rol == "ESTADISTICO":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado a esta información")
    repo = OracleFamiliarRepository()
    familiares = await repo.list_by_carpeta(carpeta_id)
    return [_familiar_to_dict(f) for f in familiares]


@router.post("/{carpeta_id}/familiares", status_code=status.HTTP_200_OK)
async def guardar_familiares(
    carpeta_id: int,
    body: FamiliaresRequest,
    user: dict = Depends(get_current_user)
):
    rol = user.get("rol", "")
    if rol == "ESTADISTICO":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")
    if rol == "MONITOR":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos de escritura")
    repo = OracleFamiliarRepository()
    datos = [f.model_dump() for f in body.familiares]
    await repo.replace_by_carpeta(carpeta_id, datos)
    familiares = await repo.list_by_carpeta(carpeta_id)
    return [_familiar_to_dict(f) for f in familiares]


@router.post("")
@router.post("/")
async def registrar_nna(body: RegistrarNnaRequest, background_tasks: BackgroundTasks, user: dict = Depends(get_current_user)):
    rol = user.get("rol", "")
    if rol == "ESTADISTICO":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")
    if rol == "MONITOR":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos de escritura")
    logger.info(f"[registrar_nna] Registrando {len(body.nnas)} NNA(s) | perfil={body.perfil!r} | user={user.get('userId')}")
    use_case = RegistrarNnaUseCase(
        OracleNnaRepository(),
        OracleCasoRepository(),
        OracleCarpetaRepository()
    )

    try:
        nnas_input = []
        for n in body.nnas:
            is_dict = isinstance(n, dict)
            def _get(key, default=None):
                if is_dict:
                    return n.get(key, default)
                return getattr(n, key, default)

            nnas_input.append(
                NnaInput(
                    id=_get("id"),
                    carpeta_id=_get("carpeta_id"),
                    nombres=_get("nombres"),
                    apellido_paterno=_get("apellido_paterno"),
                    apellido_materno=_get("apellido_materno"),
                    tipo_doc=_get("tipo_doc"),
                    numero_doc=_get("numero_doc"),
                    fecha_nacimiento=_get("fecha_nacimiento"),
                    sexo=_get("sexo"),
                    nacionalidad=_get("nacionalidad", "PERUANA"),
                    tiene_partida_nacimiento=_get("tiene_partida_nacimiento", True),
                    detalle_sin_doc=_get("detalle_sin_doc"),
                    departamento_nac=_get("departamento_nac"),
                    provincia_nac=_get("provincia_nac"),
                    distrito_nac=_get("distrito_nac"),
                    domicilio_actual=_get("domicilio_actual"),
                    referencia_domicilio=_get("referencia_domicilio"),
                    departamento_dom=_get("departamento_dom"),
                    provincia_dom=_get("provincia_dom"),
                    distrito_dom=_get("distrito_dom"),
                    telefono_contacto=_get("telefono_contacto"),
                    nombre_tutor=_get("nombre_tutor"),
                    vive_con=_get("vive_con"),
                    detalle_vive_con=_get("detalle_vive_con"),
                    lugar_pernocte=_get("lugar_pernocte"),
                    detalle_lugar_pernocte=_get("detalle_lugar_pernocte"),
                    tiene_antecedente_albergue=_get("tiene_antecedente_albergue", False),
                    detalle_antecedente_albergue=_get("detalle_antecedente_albergue"),
                    afiliado_sis=_get("afiliado_sis"),
                    afiliado_otro_seguro=_get("afiliado_otro_seguro"),
                    detalle_otro_seguro=_get("detalle_otro_seguro"),
                    sufre_enfermedad=_get("sufre_enfermedad", False),
                    detalle_enfermedad=_get("detalle_enfermedad"),
                    observaciones_salud=_get("observaciones_salud"),
                    tiene_discapacidad=_get("tiene_discapacidad", False),
                    tipo_discapacidad=_get("tipo_discapacidad"),
                    detalle_discapacidad=_get("detalle_discapacidad"),
                    estudia_actualmente=_get("estudia_actualmente", False),
                    nivel_educativo=_get("nivel_educativo"),
                    grado_estudio=_get("grado_estudio"),
                    institucion_educativa=_get("institucion_educativa"),
                    modalidad_estudio=_get("modalidad_estudio"),
                    detalle_no_estudia=_get("detalle_no_estudia"),
                    edad=_get("edad"),
                    unidad_edad=_get("unidad_edad", "ANIOS"),
                    actividades_tiempo_libre=_get("actividades_tiempo_libre"),
                    caracteristicas=_get("caracteristicas"),
                    tiene_tutor_apo=_get("tiene_tutor_apo", 0),
                    pri_ape_tut_apo=_get("pri_ape_tut_apo"),
                    seg_ape_tut_apo=_get("seg_ape_tut_apo"),
                    nom_ape_tut_apo=_get("nom_ape_tut_apo"),
                    sexo_apo=_get("sexo_apo"),
                    fecha_nac_apo=_get("fecha_nac_apo"),
                    nacionalidad_apo=_get("nacionalidad_apo", "PERUANA"),
                    tip_doc_tut_apo=_get("tip_doc_tut_apo"),
                    nro_doc_tut_apo=_get("nro_doc_tut_apo"),
                    vin_tut_usu=_get("vin_tut_usu"),
                    len_mat_apo=_get("len_mat_apo"),
                    len_mat_esp_apo=_get("len_mat_esp_apo"),
                    aut_ide_et_apo=_get("aut_ide_et_apo"),
                    aut_ide_et_esp_apo=_get("aut_ide_et_esp_apo"),
                    tipo_discap_apo=_get("tipo_discap_apo"),
                    cert_discap_apo=_get("cert_discap_apo"),
                    len_mat_nna=_get("len_mat_nna"),
                    len_mat_esp_nna=_get("len_mat_esp_nna"),
                    aut_ide_et_nna=_get("aut_ide_et_nna"),
                    aut_ide_et_esp_nna=_get("aut_ide_et_esp_nna"),
                    cert_discap_nna=_get("cert_discap_nna"),
                    datos_f03=_get("datos_f03"),
                )
            )

        sede_id_usuario = user.get("sedeId")
        if not sede_id_usuario:
            raise HTTPException(
                status_code=400,
                detail="La cuenta no tiene sede asignada. Contacte al administrador para configurar su sede."
            )
        caso_input = CasoInput(
            sede_id=sede_id_usuario,
            responsable_id=user.get("userId"),
            perfil=body.perfil,
            zona_intervencion=body.zona_intervencion,
            distrito_intervencion=body.distrito_intervencion,
            departamento_intervencion=body.departamento_intervencion,
            provincia_intervencion=body.provincia_intervencion,
            situacion_calle=body.situacion_calle,
            actividad_realizada=body.actividad_realizada,
            tiempo_en_calle=body.tiempo_en_calle,
            condicion=body.condicion,
            fecha_abordaje=body.fecha_abordaje,
            fecha_ingreso=body.fecha_ingreso or datetime.now(),
            fecha_reingreso=body.fecha_reingreso,
            fecha_cambio_perfil=body.fecha_cambio_perfil,
            horario_inicio=body.horario_inicio,
            horario_fin=body.horario_fin,
            horario_inicio2=body.horario_inicio2,
            horario_fin2=body.horario_fin2,
            dias_trabajo=body.dias_trabajo,
            victima_explotacion=body.victima_explotacion or "NO",
        )

        resultado = await use_case.execute(
            nnas_input=nnas_input,
            caso_input=caso_input,
            carpeta_id=body.carpeta_id,
            crear_nueva_carpeta=body.crear_nueva_carpeta if body.crear_nueva_carpeta is not None else True,
            es_borrador=body.es_borrador if body.es_borrador is not None else False,
        )

        # Si hay carpeta_id, podemos guardar familiares
        if resultado and len(resultado) > 0:
            carpeta_id = resultado[0]["nna"].carpeta_id
            if hasattr(body, 'familiares') and body.familiares:
                fam_repo = OracleFamiliarRepository()
                await fam_repo.save_bulk(carpeta_id, [f.model_dump() for f in body.familiares])

        # Encolar generación de PDF en segundo plano
        for r in resultado:
            nna_obj = r.get("nna")
            if nna_obj and getattr(nna_obj, "id", None):
                background_tasks.add_task(trigger_pdf_generation, nna_obj.id)

        return [{
            "nna": _nna_to_dict(r["nna"]),
            "caso": _caso_to_dict(r["caso"])
        } for r in resultado]

    except ConflictError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except Exception as e:
        logger.error(f"Error en registro: {e}", exc_info=True)
        err_msg = str(e)
        if "ORA-01438" in err_msg:
            user_friendly = "Uno de los valores numéricos supera el tamaño permitido en la base de datos. Verifique que las migraciones del sistema estén actualizadas."
        elif "ORA-01400" in err_msg:
            user_friendly = "Error de validación de datos obligatorio: Intenta ingresar un campo vacío que es requerido por el sistema."
        elif "ORA-00001" in err_msg:
            user_friendly = "Registro duplicado: El número de documento o código de ficha ingresado ya existe en la base de datos."
        elif "ORA-02291" in err_msg:
            user_friendly = "Error de integridad referencial: Una de las claves foráneas (como la sede o responsable) no es válida."
        elif "ORA-" in err_msg:
            user_friendly = f"Error interno de base de datos (Oracle). Por favor contacte al administrador del sistema SEC."
        else:
            user_friendly = f"Error al procesar el registro: {err_msg}"
        raise HTTPException(status_code=400, detail=user_friendly)


@router.get("/parametros")
async def get_parametros(user: dict = Depends(get_current_user)):
    rol = user.get("rol", "")
    if rol == "ESTADISTICO":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")
    repo = OracleParametroRepository()
    try:
        parametros = await repo.list_active_parametros()
        result = {}
        for p in parametros:
            grupo = p.grupo
            if grupo not in result:
                result[grupo] = []
            result[grupo].append({
                "value": p.codigo,
                "label": p.descripcion
            })
        return result
    except Exception as e:
        logger.error(f"Error al obtener parametros: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/carpeta/{carpeta_id}/generar-codigo")
async def generar_codigo_expediente(carpeta_id: int, user: dict = Depends(get_current_user)):
    """
    Genera y asigna el número de expediente a una carpeta.
    Se llama cuando F03 + F04 + F05 existen para el NNA
    (según Modelo Operacional Actividad 5004954).
    """
    try:
        carpeta_repo = OracleCarpetaRepository()
        codigo = await carpeta_repo.generar_codigo_carpeta(carpeta_id)
        return {"ok": True, "carpeta_id": carpeta_id, "codigo": codigo}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error generando código de expediente carpeta {carpeta_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/next-code")
async def get_next_code(user: dict = Depends(get_current_user)):
    rol = user.get("rol", "")
    if rol == "ESTADISTICO":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")
    repo = OracleNnaRepository()
    sede_id = user.get("sedeId")
    code = await repo.get_next_codigo_ficha03(sede_id)
    return {"code": code}


def _similitud(a: str, b: str) -> int:
    """
    Parecido entre dos textos, de 0 a 100.

    Se calcula en Python y no en SQL para no depender de UTL_MATCH, que puede no
    estar disponible según cómo se haya instalado la base.
    """
    if not a or not b:
        return 0
    if a == b:
        return 100
    return int(SequenceMatcher(None, a, b).ratio() * 100)


@router.get("/buscar-duplicados")
async def buscar_duplicados(
    nombres: Optional[str] = None,
    apellido_paterno: Optional[str] = None,
    apellido_materno: Optional[str] = None,
    numero_doc: Optional[str] = None,
    fecha_nacimiento: Optional[str] = None,
    excluir_id: Optional[int] = None,
    user: dict = Depends(get_current_user),
):
    """
    Busca coincidencias por SIMILITUD, no por igualdad exacta.

    Los nombres se recogen en la calle, muchas veces de oído: "VERGARA" puede
    quedar escrito "BERGARA", con o sin tilde, con el apellido materno primero.
    Una comparación exacta deja pasar esos duplicados, que es justo lo que hay
    que evitar.

    Cada candidato viene con un puntaje y el motivo por el que aparece, para que
    el educador decida. El sistema no descarta ni bloquea nada.

    Reglas:
      * mismo documento              -> crítico
      * apellidos y nombre similares -> alto
      * misma fecha de nacimiento    -> sube el puntaje
      * apellidos invertidos         -> medio
    """
    from src.infrastructure.db.connection import get_pool

    def normalizar(txt: Optional[str]) -> str:
        """Sin tildes, sin dobles espacios, en mayúsculas."""
        if not txt:
            return ""
        t = unicodedata.normalize("NFD", txt.strip().upper())
        t = "".join(c for c in t if unicodedata.category(c) != "Mn")
        return " ".join(t.split())

    n_doc = (numero_doc or "").strip()
    ap_pat = normalizar(apellido_paterno)
    ap_mat = normalizar(apellido_materno)
    nom = normalizar(nombres)

    # Con cualquier dato se busca: antes se exigía apellido paterno.
    if not n_doc and not ap_pat and not ap_mat and not nom:
        return {"status": "unique", "message": "Ingresa un documento o un nombre para verificar.", "matches": []}

    try:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                # Una sola pasada: el DNI ya no corta la búsqueda de homónimos,
                # porque un mismo NNA puede estar registrado con otro documento.
                await cur.execute(
                    """
                    SELECT n.ID, n.NOMBRES, n.APELLIDO_PATERNO, n.APELLIDO_MATERNO,
                           n.TIPO_DOC, n.NUMERO_DOC, n.SEXO, n.FECHA_NACIMIENTO,
                           n.CODIGO_FICHA03, n.CARPETA_ID,
                           (SELECT MIN(s.NOMBRE)
                              FROM NNA_CASO c
                              JOIN SEC_SEDE s ON s.ID = c.SEDE_ID
                             WHERE c.NNA_ID = n.ID AND c.ESTADO <> 'CERRADO') AS SEDE
                      FROM NNA n
                     WHERE (:excluir IS NULL OR n.ID <> :excluir)
                    """,
                    {"excluir": excluir_id},
                )
                filas = await cur.fetchall()

        candidatos = []
        for r in filas:
            c_nom = normalizar(r[1])
            c_pat = normalizar(r[2])
            c_mat = normalizar(r[3])
            c_doc = (r[5] or "").strip()
            c_fnac = r[7].strftime("%Y-%m-%d") if r[7] else None

            puntaje = 0
            motivos = []

            if n_doc and c_doc and n_doc == c_doc:
                puntaje += 100
                motivos.append("Mismo documento")

            sim_pat = _similitud(ap_pat, c_pat)
            sim_mat = _similitud(ap_mat, c_mat)
            sim_nom = _similitud(nom, c_nom)

            if ap_pat and sim_pat >= 80:
                puntaje += 25
            if ap_mat and sim_mat >= 80:
                puntaje += 20
            if nom and sim_nom >= 80:
                puntaje += 25

            if ap_pat and nom and sim_pat >= 80 and sim_nom >= 80:
                motivos.append(f"Nombre y apellido {min(sim_pat, sim_nom)}% similares")
            elif ap_pat and sim_pat >= 80:
                motivos.append(f"Apellido paterno {sim_pat}% similar")
            elif nom and sim_nom >= 80:
                motivos.append(f"Nombre {sim_nom}% similar")

            # Apellidos invertidos: se anotan al revés con frecuencia
            if ap_pat and ap_mat and _similitud(ap_pat, c_mat) >= 85 and _similitud(ap_mat, c_pat) >= 85:
                puntaje += 35
                motivos.append("Apellidos en orden invertido")

            if fecha_nacimiento and c_fnac and fecha_nacimiento[:10] == c_fnac:
                puntaje += 30
                motivos.append("Misma fecha de nacimiento")

            if puntaje >= 45:
                candidatos.append({
                    "id": r[0],
                    "nombres": r[1],
                    "apellidoPaterno": r[2],
                    "apellidoMaterno": r[3],
                    "tipoDoc": r[4],
                    "numeroDoc": r[5],
                    "sexo": r[6],
                    "fechaNacimiento": c_fnac,
                    "codigoFicha03": r[8],
                    "carpetaId": r[9],
                    "sede": r[10] or "Sin sede activa",
                    "puntaje": min(puntaje, 100),
                    "motivo": " · ".join(motivos) or "Datos parecidos",
                })

        candidatos.sort(key=lambda c: c["puntaje"], reverse=True)
        candidatos = candidatos[:10]

        if not candidatos:
            return {"status": "unique", "message": "No se encontraron coincidencias en el sistema nacional.", "matches": []}

        if candidatos[0]["puntaje"] >= 100:
            estado = "duplicate"
            mensaje = f"Ya existe un NNA con el mismo documento, en la sede {candidatos[0]['sede']}."
        elif candidatos[0]["puntaje"] >= 70:
            estado = "duplicate"
            mensaje = f"Hay {len(candidatos)} registro(s) muy parecido(s). Revísalos antes de continuar."
        else:
            estado = "homonym"
            mensaje = f"Hay {len(candidatos)} registro(s) con datos parecidos."

        return {"status": estado, "message": mensaje, "matches": candidatos}

    except Exception as e:
        logger.error(f"Error al buscar coincidencias: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al buscar coincidencias")


@router.put("/{carpeta_id}")
async def actualizar_expediente(carpeta_id: int, body: dict, background_tasks: BackgroundTasks, user: dict = Depends(get_current_user)):
    """Actualiza todos los NNA y familiares de una carpeta."""
    from src.infrastructure.db.connection import get_pool
    pool = None
    rol = user.get("rol", "")
    if rol == "ESTADISTICO":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")
    if rol == "MONITOR":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos de escritura")
    nna_repo = OracleNnaRepository()
    caso_repo = OracleCasoRepository()
    fam_repo = OracleFamiliarRepository()

    try:
        # 1. Actualizar datos de los NNA
        if "nnas" in body:
            es_borrador = body.get("es_borrador", False)
            for n_data in body["nnas"]:
                nna_id = n_data.get("id")
                if nna_id:
                    n_data["es_borrador"] = es_borrador
                    # Extraer campos de salud para formateo si vienen como booleanos
                    if "sufreEnfermedad" in n_data:
                        val = n_data["sufreEnfermedad"]
                        n_data["sufre_enfermedad"] = 1 if (val == 'SI' or val is True) else 0
                    
                    await nna_repo.update(nna_id, n_data)

        # 2. Actualizar datos del caso (perfil, etc) de la carpeta
        await caso_repo.update_caso_by_carpeta(carpeta_id, user.get("sedeId"), body, user.get("userId"))

        # Si es_borrador se establece en False (promover/registrar borrador), actualizamos el estado de los casos a PENDIENTE
        if "es_borrador" in body:
            es_borrador = body["es_borrador"]
            if not es_borrador:
                pool = get_pool()
                async with pool.acquire() as conn:
                    async with conn.cursor() as cur:
                        await cur.execute(
                            """UPDATE NNA_CASO SET ESTADO = 'PENDIENTE', UPDATED_AT = SYSTIMESTAMP 
                               WHERE NNA_ID IN (SELECT ID FROM NNA WHERE CARPETA_ID = :cid) AND ESTADO = 'BORRADOR'""",
                            {"cid": carpeta_id}
                        )
                        await conn.commit()

        # 3. Actualizar familiares
        if "familiares" in body:
            await fam_repo.save_bulk(carpeta_id, body["familiares"])

        # 4. Encolar regeneración del PDF para cada NNA actualizado
        if "nnas" in body:
            for n_data in body["nnas"]:
                nna_id = n_data.get("id")
                if nna_id:
                    background_tasks.add_task(trigger_pdf_generation, nna_id)

        # 5. Verificar apertura del expediente de forma síncrona
        carpeta_repo = OracleCarpetaRepository()
        if "nnas" in body:
            for n_data in body["nnas"]:
                nna_id = n_data.get("id")
                if nna_id:
                    await _verificar_apertura_expediente(nna_id, carpeta_id, carpeta_repo)

        return {"ok": True}

    except Exception as e:
        logger.error(f"Error en actualizar_expediente: {e}", exc_info=True)
        err_msg = str(e)
        if "ORA-01438" in err_msg:
            user_friendly = "Uno de los valores numéricos supera el tamaño permitido en la base de datos. Verifique que las migraciones del sistema estén actualizadas."
        elif "ORA-01400" in err_msg:
            user_friendly = "Error de validación de datos obligatorio: Intenta actualizar con un campo vacío que es requerido por el sistema."
        elif "ORA-00001" in err_msg:
            user_friendly = "Registro duplicado: El número de documento o código de ficha ingresado ya existe en la base de datos."
        elif "ORA-02291" in err_msg:
            user_friendly = "Error de integridad referencial: Una de las claves foráneas (como la sede o responsable) no es válida o no existe."
        elif "ORA-" in err_msg:
            user_friendly = f"Error interno de base de datos (Oracle). Por favor contacte al administrador del sistema SEC."
        else:
            user_friendly = f"Error al actualizar el expediente: {err_msg}"
        raise HTTPException(status_code=400, detail=user_friendly)


async def _verificar_apertura_expediente(nna_id: int, carpeta_id: int, carpeta_repo) -> None:
    """Genera el código de expediente si se cumplen F03 + F04 + F05."""
    from src.infrastructure.db.connection import get_pool
    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute("SELECT CODIGO_FICHA03 FROM NNA WHERE ID = :1", [nna_id])
            row = await cur.fetchone()
        if not row or not row[0]:
            return
        async with conn.cursor() as cur:
            await cur.execute("SELECT CODIGO FROM NNA_CARPETA WHERE ID = :1", [carpeta_id])
            crow = await cur.fetchone()
        if not crow or crow[0]:
            return
        async with conn.cursor() as cur:
            await cur.execute("SELECT COUNT(1) FROM DIAGNOSTICO_SOCIAL WHERE NNA_ID = :1", [nna_id])
            f04 = (await cur.fetchone())[0]
        if f04 == 0:
            return
        async with conn.cursor() as cur:
            await cur.execute(
                """SELECT COUNT(1) FROM PROCESO_LOGROS
                   WHERE NNA_ID = :1
                   AND F1_I1='SI' AND F1_I2='SI' AND F1_I3='SI' AND F1_I4='SI' AND F1_I5='SI'""",
                [nna_id],
            )
            f05 = (await cur.fetchone())[0]
        if f05 == 0:
            return
        codigo = await carpeta_repo.generar_codigo_carpeta(carpeta_id)
        logger.info(f"Expediente generado al cargar: NNA {nna_id} → {codigo}")


@router.get("/{nna_id}/expediente")
async def get_expediente(nna_id: int, user: dict = Depends(get_current_user)):
    rol = user.get("rol", "")
    if rol == "ESTADISTICO":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado a esta información")
    # 1. Intentar obtener el carpeta_id a partir del nna_id
    from src.infrastructure.db.connection import get_pool
    pool = get_pool()
    carpeta_id = nna_id
    try:
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT CARPETA_ID FROM NNA WHERE ID = :nid", {"nid": nna_id})
                row = await cur.fetchone()
                if row and row[0] is not None:
                    carpeta_id = row[0]
                    logger.info(f"Traducido nna_id {nna_id} a carpeta_id {carpeta_id} para cargar expediente")
    except Exception as e:
        logger.error(f"Error al traducir nna_id a carpeta_id: {e}", exc_info=True)
        # En caso de error, dejamos carpeta_id = nna_id por compatibilidad

    # JIT verification of expediente code generation synchronously
    try:
        carpeta_repo = OracleCarpetaRepository()
        await _verificar_apertura_expediente(nna_id, carpeta_id, carpeta_repo)
    except Exception as e:
        logger.error(f"Error en JIT verificar_apertura_expediente para NNA {nna_id}: {e}", exc_info=True)
        
    return await _get_expediente(carpeta_id, user)


@router.get("")
@router.get("/")
async def listar_nna(
    limit: int = 50,
    offset: int = 0,
    user: dict = Depends(get_current_user)
):
    nna_repo = OracleNnaRepository()
    caso_repo = OracleCasoRepository()
    carpeta_repo = OracleCarpetaRepository()

    rol = user.get("rol", "")
    user_id = user.get("userId")
    sede_id = user.get("sedeId")

    if rol == "ESTADISTICO":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado a esta información"
        )

    if rol in {"EDUCADOR", "PSICOLOGO", "TRABAJADOR_SOCIAL", "ABOGADO"}:
        nnas = await nna_repo.list_by_responsable(user_id, limit=limit, offset=offset)
    elif rol in {"COORDINADOR", "ADMIN_SEDE"}:
        nnas = await nna_repo.list_by_sede(sede_id, limit=limit, offset=offset)
    elif rol == "MONITOR":
        nnas = await nna_repo.list_all(limit=limit, offset=offset)
    else:
        nnas = await nna_repo.list_all(limit=limit, offset=offset)

    carpeta_ids = list({nna.carpeta_id for nna in nnas if nna.carpeta_id})
    carpetas = await carpeta_repo.find_by_ids(carpeta_ids)

    result = []
    for nna in nnas:
        casos = await caso_repo.find_by_nna_id(nna.id)
        carpeta_obj = carpetas.get(nna.carpeta_id)
        nna_dict = _nna_to_dict(nna)
        nna_dict["carpeta"] = (
            {"id": carpeta_obj.id, "codigo": carpeta_obj.codigo}
            if carpeta_obj else None
        )
        nna_dict["casos"] = [_caso_to_dict(c) for c in casos]
        result.append(nna_dict)
    return result


async def _get_expediente(carpeta_id: int, user: dict):
    from src.infrastructure.db.connection import get_pool
    from src.infrastructure.db.repositories.oracle_nna_repository import _row_to_nna

    pool = get_pool()
    nna_repo = OracleNnaRepository()
    caso_repo = OracleCasoRepository()
    familiar_repo = OracleFamiliarRepository()

    select_query = await nna_repo.get_select_query()

    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(f"{select_query} WHERE CARPETA_ID = :cid ORDER BY ID ASC", {"cid": carpeta_id})
            rows = await cur.fetchall()

    if not rows:
        raise HTTPException(status_code=404, detail="Expediente no encontrado")

    nnas = [_row_to_nna(r) for r in rows]
    carpeta_repo = OracleCarpetaRepository()
    carpeta = await carpeta_repo.find_by_id(carpeta_id)
    familiares = await familiar_repo.list_by_carpeta(carpeta_id)
    familiares_dict = [_familiar_to_dict(f) for f in familiares]

    result = []
    for nna in nnas:
        casos = await caso_repo.find_by_nna_id(nna.id)
        d = _nna_to_dict(nna)
        d["carpeta"] = {"id": carpeta.id, "codigo": carpeta.codigo} if carpeta else None
        d["casos"] = [_caso_to_dict(c) for c in casos]
        d["familiares"] = familiares_dict
        result.append(d)

    return result


def _nna_to_dict(nna) -> dict:
    return {
        "id": nna.id,
        "codigoFicha03": nna.codigo_ficha03,
        "nombres": nna.nombres,
        "apellidoPaterno": nna.apellido_paterno,
        "apellidoMaterno": nna.apellido_materno,
        "tipoDoc": nna.tipo_doc,
        "numeroDoc": nna.numero_doc,
        "fechaNacimiento": nna.fecha_nacimiento.isoformat() if nna.fecha_nacimiento else None,
        "sexo": nna.sexo,
        "nacionalidad": nna.nacionalidad,
        "carpetaId": nna.carpeta_id,
        "tienePartidaNacimiento": nna.tiene_partida_nacimiento,
        "detalleSinDoc": nna.detalle_sin_doc,
        "departamentoNac": nna.departamento_nac,
        "provinciaNac": nna.provincia_nac,
        "distritoNac": nna.distrito_nac,
        "domicilioActual": nna.domicilio_actual,
        "referenciaDomicilio": nna.referencia_domicilio,
        "departamentoDom": nna.departamento_dom,
        "provinciaDom": nna.provincia_dom,
        "distritoDom": nna.distrito_dom,
        "telefonoContacto": nna.telefono_contacto,
        "nombreTutor": nna.nombre_tutor,
        "viveCon": nna.vive_con,
        "detalleViveCon": nna.detalle_vive_con,
        "tieneHermanos": nna.tiene_hermanos,
        "cantHermanos": nna.cant_hermanos,
        "lugarPernocte": nna.lugar_pernocte,
        "detalleLugarPernocte": nna.detalle_lugar_pernocte,
        "tieneAntecedenteAlbergue": nna.tiene_antecedente_albergue,
        "detalleAntecedenteAlbergue": nna.detalle_antecedente_albergue,
        "afiliadoSIS": nna.afiliado_sis,
        "afiliadoOtroSeguro": nna.afiliado_otro_seguro,
        "detalleOtroSeguro": nna.detalle_otro_seguro,
        "sufreEnfermedad": "SI" if nna.sufre_enfermedad else "NO",
        "detalleEnfermedad": nna.detalle_enfermedad,
        "observacionesSalud": nna.observaciones_salud,
        "tieneDiscapacidad": nna.tiene_discapacidad,
        "tipoDiscapacidad": nna.tipo_discapacidad,
        "detalleDiscapacidad": nna.detalle_discapacidad,
        "estudiaActualmente": nna.estudia_actualmente,
        "nivelEducativo": nna.nivel_educativo,
        "gradoEstudio": nna.grado_estudio,
        "institucionEducativa": nna.institucion_educativa,
        "modalidadEstudio": nna.modalidad_estudio,
        "detalleNoEstudia": nna.detalle_no_estudia,
        "edad": nna.edad,
        "unidadEdad": nna.unidad_edad,
        "actividadesTiempoLibre": nna.actividades_tiempo_libre,
        "caracteristicas": nna.caracteristicas,
        "fotoUrl": nna.foto_url,
        "tieneTutorApo": nna.tiene_tutor_apo,
        "priApeTutApo": nna.pri_ape_tut_apo,
        "segApeTutApo": nna.seg_ape_tut_apo,
        "nomApeTutApo": nna.nom_ape_tut_apo,
        "sexoApo": nna.sexo_apo,
        "fechaNacApo": nna.fecha_nac_apo.isoformat() if nna.fecha_nac_apo else None,
        "nacionalidadApo": nna.nacionalidad_apo,
        "tipDocTutApo": nna.tip_doc_tut_apo,
        "nroDocTutApo": nna.nro_doc_tut_apo,
        "vinTutUsu": nna.vin_tut_usu,
        "lenMatApo": nna.len_mat_apo,
        "lenMatEspApo": nna.len_mat_esp_apo,
        "autIdeEtApo": nna.aut_ide_et_apo,
        "autIdeEtEspApo": nna.aut_ide_et_esp_apo,
        "tipoDiscapApo": nna.tipo_discap_apo,
        "certDiscapApo": nna.cert_discap_apo,
        "lenMatNna": nna.len_mat_nna,
        "lenMatEspNna": nna.len_mat_esp_nna,
        "autIdeEtNna": nna.aut_ide_et_nna,
        "autIdeEtEspNna": nna.aut_ide_et_esp_nna,
        "certDiscapNna": nna.cert_discap_nna,
        "createdAt": nna.created_at.isoformat() if nna.created_at else None,
        "datosF03": nna.datos_f03,
    }


def _familiar_to_dict(f) -> dict:
    return {
        "id":         f.id,
        "carpetaId":  f.carpeta_id,
        "nombres":    f.nombres,
        "parentesco": f.parentesco,
        "dni":        f.dni,
        "telefono":   f.telefono,
        "ocupacion":  f.ocupacion,
        "viveCon":    f.vive_con,
    }


def _caso_to_dict(caso) -> dict:
    if caso is None:
        return None
    def iso(v):
        return v.isoformat() if v else None
    return {
        "id": caso.id,
        "codigoCaso": caso.codigo_caso,
        "nnaId": caso.nna_id,
        "sedeId": caso.sede_id,
        "responsableId": caso.responsable_id,
        "perfil": caso.perfil,
        "zonaIntervencion": caso.zona_intervencion,
        "distritoIntervencion": caso.distrito_intervencion,
        "departamentoIntervencion": caso.departamento_intervencion,
        "provinciaIntervencion": caso.provincia_intervencion,
        "situacionCalle": caso.situacion_calle,
        "actividadRealizada": caso.actividad_realizada,
        "tiempoEnCalle": caso.tiempo_en_calle,
        "condicion": caso.condicion,
        "antecedenteInstitucional": caso.antecedente_institucional,
        "horarioInicio": caso.horario_inicio,
        "horarioFin": caso.horario_fin,
        "horarioInicio2": caso.horario_inicio2,
        "horarioFin2": caso.horario_fin2,
        "diasTrabajo": caso.dias_trabajo,
        "fechaAbordaje": iso(caso.fecha_abordaje),
        "fechaIngreso": iso(caso.fecha_ingreso),
        "fechaReingreso": iso(caso.fecha_reingreso),
        "estado": caso.estado,
        "fase": caso.fase,
        "nivelRiesgo": caso.nivel_riesgo,
        "responsableNombre": caso.responsable_nombre,
        "fechaApertura": iso(caso.fecha_apertura),
        "victimaExplotacion": caso.victima_explotacion or "NO",
    }


@router.get("/{nna_id}/pdf")
async def get_nna_pdf(nna_id: int, request: Request, token: Optional[str] = None):
    from fastapi.responses import FileResponse
    from src.infrastructure.services.pdf_generator import generate_f03_pdf
    from src.infrastructure.http.middleware.jwt_middleware import verificar_token, verificar_token_descarga
    import os

    # Extraer token del header o query param
    actual_token = None
    auth_header = request.headers.get("authorization")
    es_query_token = False
    if auth_header and auth_header.startswith("Bearer "):
        actual_token = auth_header.split(" ")[1]
    elif token:
        actual_token = token
        es_query_token = True  # por query param solo se acepta token de descarga

    if not actual_token:
        raise HTTPException(status_code=401, detail="No autorizado: Token faltante")

    try:
        user = verificar_token_descarga(actual_token) if es_query_token else verificar_token(actual_token)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="No autorizado: Token inválido")

    nna_repo = OracleNnaRepository()
    nna = await nna_repo.find_by_id(nna_id)
    if not nna:
        raise HTTPException(status_code=404, detail="Beneficiario NNA no encontrado")

    carpeta_repo = OracleCarpetaRepository()
    carpeta = await carpeta_repo.find_by_id(nna.carpeta_id) if nna.carpeta_id else None
    codigo_archivo = nna.codigo_ficha03 if nna.codigo_ficha03 else ((carpeta.codigo if carpeta and carpeta.codigo else None) or f"ID_{nna_id}")
    # Sanitizar nombre del archivo
    codigo_archivo = "".join(c for c in codigo_archivo if c.isalnum() or c in ("-", "_", ".")).strip()

    # Ruta del repositorio físico local
    repositorio_dir = os.getenv("REPOSITORIO_PDFS", "./repositorio_archivos/fichas_f03")
    filename = f"{codigo_archivo}.pdf"
    filepath = os.path.join(repositorio_dir, filename)

    # Si no existe el PDF físicamente en disco, lo generamos en caliente
    if not os.path.exists(filepath):
        caso_repo = OracleCasoRepository()
        fam_repo = OracleFamiliarRepository()

        casos = await caso_repo.find_by_nna_id(nna.id)
        familiares = await fam_repo.list_by_carpeta(nna.carpeta_id) if nna.carpeta_id else []

        nna_dict = _nna_to_dict(nna)
        nna_dict["casos"] = [_caso_to_dict(c) for c in casos]
        nna_dict["familiares"] = [_familiar_to_dict(f) for f in familiares]

        try:
            generate_f03_pdf(nna_dict, filepath)
        except Exception as e:
            logger.error(f"Error generando PDF para NNA {nna_id}: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Error generando PDF: {str(e)}")

    return FileResponse(
        filepath,
        media_type="application/pdf",
        filename=filename,
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )


@router.get("/{nna_id}/pdf/pages")
async def get_nna_pdf_pages_count(nna_id: int, request: Request, token: Optional[str] = None):
    """Genera la ficha F03 si no existe, cuenta las páginas exactas con pypdf, y las devuelve."""
    from src.infrastructure.services.pdf_generator import generate_f03_pdf
    from src.infrastructure.http.middleware.jwt_middleware import verificar_token, verificar_token_descarga
    from pypdf import PdfReader
    import os

    actual_token = None
    auth_header = request.headers.get("authorization")
    es_query_token = False
    if auth_header and auth_header.startswith("Bearer "):
        actual_token = auth_header.split(" ")[1]
    elif token:
        actual_token = token
        es_query_token = True  # por query param solo se acepta token de descarga

    if not actual_token:
        raise HTTPException(status_code=401, detail="No autorizado: Token faltante")

    try:
        user = verificar_token_descarga(actual_token) if es_query_token else verificar_token(actual_token)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="No autorizado: Token inválido")

    nna_repo = OracleNnaRepository()
    nna = await nna_repo.find_by_id(nna_id)
    if not nna:
        raise HTTPException(status_code=404, detail="Beneficiario NNA no encontrado")

    carpeta_repo = OracleCarpetaRepository()
    carpeta = await carpeta_repo.find_by_id(nna.carpeta_id) if nna.carpeta_id else None
    codigo_archivo = nna.codigo_ficha03 if nna.codigo_ficha03 else ((carpeta.codigo if carpeta and carpeta.codigo else None) or f"ID_{nna_id}")
    codigo_archivo = "".join(c for c in codigo_archivo if c.isalnum() or c in ("-", "_", ".")).strip()

    repositorio_dir = os.getenv("REPOSITORIO_PDFS", "./repositorio_archivos/fichas_f03")
    filename = f"{codigo_archivo}.pdf"
    filepath = os.path.join(repositorio_dir, filename)

    if not os.path.exists(filepath):
        caso_repo = OracleCasoRepository()
        fam_repo = OracleFamiliarRepository()
        casos = await caso_repo.find_by_nna_id(nna.id)
        familiares = await fam_repo.list_by_carpeta(nna.carpeta_id) if nna.carpeta_id else []
        nna_dict = _nna_to_dict(nna)
        nna_dict["casos"] = [_caso_to_dict(c) for c in casos]
        nna_dict["familiares"] = [_familiar_to_dict(f) for f in familiares]
        try:
            generate_f03_pdf(nna_dict, filepath)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error generando PDF: {str(e)}")

    try:
        reader = PdfReader(filepath)
        page_count = len(reader.pages)
    except Exception:
        page_count = 1

    return {"pages": page_count}



def trigger_pdf_generation(nna_id: int):
    import asyncio
    from src.infrastructure.db.repositories.oracle_nna_repository import OracleNnaRepository
    from src.infrastructure.db.repositories.oracle_caso_repository import OracleCasoRepository
    from src.infrastructure.db.repositories.oracle_familiar_repository import OracleFamiliarRepository
    from src.infrastructure.services.pdf_generator import generate_f03_pdf
    import os

    async def _run():
        nna_repo = OracleNnaRepository()
        nna = await nna_repo.find_by_id(nna_id)
        if not nna:
            return
        
        carpeta_repo = OracleCarpetaRepository()
        carpeta = await carpeta_repo.find_by_id(nna.carpeta_id) if nna.carpeta_id else None
        codigo_archivo = nna.codigo_ficha03 if nna.codigo_ficha03 else (carpeta.codigo if carpeta else f"ID_{nna_id}")
        codigo_archivo = "".join(c for c in codigo_archivo if c.isalnum() or c in ("-", "_", ".")).strip()

        repositorio_dir = os.getenv("REPOSITORIO_PDFS", "./repositorio_archivos/fichas_f03")
        filepath = os.path.join(repositorio_dir, f"{codigo_archivo}.pdf")

        # Regenerar siempre para tener la versión más fresca
        caso_repo = OracleCasoRepository()
        fam_repo = OracleFamiliarRepository()

        casos = await caso_repo.find_by_nna_id(nna.id)
        familiares = await fam_repo.list_by_carpeta(nna.carpeta_id) if nna.carpeta_id else []

        nna_dict = _nna_to_dict(nna)
        nna_dict["casos"] = [_caso_to_dict(c) for c in casos]
        nna_dict["familiares"] = [_familiar_to_dict(f) for f in familiares]

        try:
            generate_f03_pdf(nna_dict, filepath)
        except Exception:
            pass

    try:
        # Si ya hay un event loop corriendo, lo disparamos como tarea
        loop = asyncio.get_running_loop()
        loop.create_task(_run())
    except RuntimeError:
        asyncio.run(_run())



# ── Hermanos ──────────────────────────────────────────────────────────────────
# El informe situacional es común a los hermanos, pero los expedientes son
# individuales. Estos endpoints resuelven quiénes son hermanos sin mezclar
# expedientes: el sistema sugiere y el educador confirma.

class DetectarHermanosRequest(BaseModel):
    """Datos del familiar que el educador acaba de registrar en el F03 o F04."""
    parentesco: Optional[str] = None     # código de OPCIONES_VINCULO_TUTOR_2026
    nombres: Optional[str] = None        # nombre del familiar registrado
    dni: Optional[str] = None            # su documento


class VincularHermanoRequest(BaseModel):
    hermanoId: int
    origen: str = "MANUAL"               # PARENTESCO | DNI_PADRE | MANUAL
    confirmado: bool = True              # False = el educador dijo que no son hermanos


@router.get("/{nna_id}/hermanos")
async def listar_hermanos(nna_id: int, user: dict = Depends(get_current_user)):
    """Hermanos confirmados de un NNA, para armar el informe situacional."""
    from src.infrastructure.db.repositories.oracle_hermano_repository import OracleHermanoRepository
    return await OracleHermanoRepository().list_by_nna(nna_id)


@router.post("/{nna_id}/hermanos/detectar")
async def detectar_hermanos(
    nna_id: int,
    body: DetectarHermanosRequest,
    user: dict = Depends(get_current_user),
):
    """
    Busca posibles hermanos a partir del familiar recién registrado.

    Dos señales:
      * parentesco "Hermano/a" -> se busca ese nombre entre los NNA del servicio;
      * padre o madre -> se busca su DNI entre los familiares de otros NNA, lo
        que detecta hermanos de distinto apellido.

    Si el parentesco es hermano/a y NO aparece ningún NNA, se devuelve
    `requiereRegistro`: ese hermano existe pero no está en el sistema, y sin
    ficha propia no tiene caso que mencionar en el informe.
    """
    from src.infrastructure.db.repositories.oracle_hermano_repository import (
        OracleHermanoRepository, PARENTESCO_HERMANO, PARENTESCO_PADRE_MADRE,
    )
    repo = OracleHermanoRepository()

    candidatos: list = []
    if body.parentesco == PARENTESCO_HERMANO and body.nombres:
        candidatos = await repo.buscar_por_nombre(nna_id, body.nombres)
    elif body.parentesco == PARENTESCO_PADRE_MADRE and body.dni:
        candidatos = await repo.buscar_por_dni_padre(nna_id, body.dni)

    # No repreguntar por pares que el educador ya resolvió
    resueltos = await repo.pares_ya_resueltos(nna_id)
    candidatos = [c for c in candidatos if c["nnaId"] not in resueltos]

    requiere_registro = (
        body.parentesco == PARENTESCO_HERMANO
        and bool(body.nombres)
        and not candidatos
    )

    return {
        "candidatos": candidatos,
        "requiereRegistro": requiere_registro,
        "nombreHermano": body.nombres if requiere_registro else None,
    }


@router.post("/{nna_id}/hermanos")
async def vincular_hermano(
    nna_id: int,
    body: VincularHermanoRequest,
    user: dict = Depends(get_current_user),
):
    """Confirma o descarta que dos NNA son hermanos. Siempre lo decide el educador."""
    from src.infrastructure.db.repositories.oracle_hermano_repository import OracleHermanoRepository
    if body.hermanoId == nna_id:
        raise HTTPException(status_code=400, detail="Un NNA no puede ser hermano de sí mismo.")
    return await OracleHermanoRepository().vincular(
        nna_id, body.hermanoId, body.origen, user.get("userId"),
        "CONFIRMADO" if body.confirmado else "DESCARTADO",
    )


@router.delete("/{nna_id}/hermanos/{hermano_id}")
async def desvincular_hermano(
    nna_id: int, hermano_id: int, user: dict = Depends(get_current_user)
):
    """Deshace el vínculo, para corregir una confirmación errónea."""
    from src.infrastructure.db.repositories.oracle_hermano_repository import OracleHermanoRepository
    if not await OracleHermanoRepository().desvincular(nna_id, hermano_id):
        raise HTTPException(status_code=404, detail="No existe ese vínculo de hermanos.")
    return {"message": "Vínculo eliminado"}
