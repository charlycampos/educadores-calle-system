import logging
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends
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
    nombres: str
    apellido_paterno: str
    apellido_materno: Optional[str] = None
    tipo_doc: str
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
    estudia_actualmente: bool = False
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
    crear_nueva_carpeta: Optional[bool] = True
    familiares: Optional[list[FamiliarItem]] = None


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
async def registrar_nna(body: RegistrarNnaRequest, user: dict = Depends(get_current_user)):
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

        caso_input = CasoInput(
            sede_id=user.get("sedeId", 1),
            responsable_id=user.get("userId"),
            perfil=body.perfil,
            zona_intervencion=body.zona_intervencion,
            distrito_intervencion=body.distrito_intervencion,
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
        )

        resultado = await use_case.execute(
            nnas_input=nnas_input,
            caso_input=caso_input,
            crear_nueva_carpeta=body.crear_nueva_carpeta if body.crear_nueva_carpeta is not None else True,
        )

        # Si hay carpeta_id, podemos guardar familiares
        if resultado and len(resultado) > 0:
            carpeta_id = resultado[0]["nna"].carpeta_id
            if hasattr(body, 'familiares') and body.familiares:
                fam_repo = OracleFamiliarRepository()
                await fam_repo.save_bulk(carpeta_id, [f.model_dump() for f in body.familiares])

        return [{
            "nna": _nna_to_dict(r["nna"]),
            "caso": _caso_to_dict(r["caso"])
        } for r in resultado]

    except ConflictError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except Exception as e:
        logger.error(f"Error en registro: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


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


@router.get("/next-code")
async def get_next_code(user: dict = Depends(get_current_user)):
    rol = user.get("rol", "")
    if rol == "ESTADISTICO":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")
    repo = OracleNnaRepository()
    code = await repo.get_next_codigo_ficha03()
    return {"code": code}


@router.get("/buscar-duplicados")
async def buscar_duplicados(
    nombres: Optional[str] = None,
    apellido_paterno: Optional[str] = None,
    apellido_materno: Optional[str] = None,
    numero_doc: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Busca coincidencias exactas por DNI u homónimos por apellidos y nombres en todo el país (cruzando sedes)."""
    from src.infrastructure.db.connection import get_pool
    pool = get_pool()
    matches = []
    
    # Normalizar valores para la búsqueda
    n_doc = (numero_doc or "").strip()
    ap_pat = (apellido_paterno or "").strip().upper()
    ap_mat = (apellido_materno or "").strip().upper()
    nom = (nombres or "").strip().upper()

    if not n_doc and not ap_pat:
        return {"status": "unique", "matches": []}

    try:
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                # 1. Búsqueda exacta por número de documento si se proporciona
                if n_doc:
                    query = """
                        SELECT n.ID, n.NOMBRES, n.APELLIDO_PATERNO, n.APELLIDO_MATERNO, n.TIPO_DOC, n.NUMERO_DOC, n.SEXO, s.NOMBRE AS SEDE
                        FROM NNA n
                        LEFT JOIN NNA_CASO c ON c.NNA_ID = n.ID AND c.ESTADO <> 'CERRADO'
                        LEFT JOIN SEC_SEDE s ON s.ID = c.SEDE_ID
                        WHERE n.NUMERO_DOC = :doc
                    """
                    await cur.execute(query, {"doc": n_doc})
                    rows = await cur.fetchall()
                    for r in rows:
                        matches.append({
                            "id": r[0],
                            "nombres": r[1],
                            "apellidoPaterno": r[2],
                            "apellidoMaterno": r[3],
                            "tipoDoc": r[4],
                            "numeroDoc": r[5],
                            "sexo": r[6],
                            "sede": r[7] or "Sin Sede Activa"
                        })
                    
                    if matches:
                        return {
                            "status": "duplicate",
                            "message": f"CRÍTICO: Se encontró un NNA registrado con el mismo número de documento en la sede: {matches[0]['sede']}",
                            "matches": matches
                        }

                # 2. Búsqueda de homónimos por nombres y apellidos
                if ap_pat and nom:
                    # Encontrar coincidencias similares en la BD
                    query = """
                        SELECT n.ID, n.NOMBRES, n.APELLIDO_PATERNO, n.APELLIDO_MATERNO, n.TIPO_DOC, n.NUMERO_DOC, n.SEXO, s.NOMBRE AS SEDE
                        FROM NNA n
                        LEFT JOIN NNA_CASO c ON c.NNA_ID = n.ID AND c.ESTADO <> 'CERRADO'
                        LEFT JOIN SEC_SEDE s ON s.ID = c.SEDE_ID
                        WHERE UPPER(n.APELLIDO_PATERNO) = :ap_pat
                          AND (:ap_mat IS NULL OR UPPER(n.APELLIDO_MATERNO) = :ap_mat)
                          AND UPPER(n.NOMBRES) LIKE :nom
                    """
                    await cur.execute(query, {
                        "ap_pat": ap_pat,
                        "ap_mat": ap_mat if ap_mat else None,
                        "nom": f"%{nom}%"
                    })
                    rows = await cur.fetchall()
                    for r in rows:
                        # Evitar duplicar si ya se agregó por DNI
                        if not any(m["id"] == r[0] for m in matches):
                            matches.append({
                                "id": r[0],
                                "nombres": r[1],
                                "apellidoPaterno": r[2],
                                "apellidoMaterno": r[3],
                                "tipoDoc": r[4],
                                "numeroDoc": r[5],
                                "sexo": r[6],
                                "sede": r[7] or "Sin Sede Activa"
                            })

                    if matches:
                        return {
                            "status": "homonym",
                            "message": f"ADVERTENCIA: Se encontraron {len(matches)} posible(s) homónimo(s) en el sistema nacional.",
                            "matches": matches
                        }

    except Exception as e:
        logger.error(f"Error al verificar duplicados: {e}")
        raise HTTPException(status_code=500, detail="Error en la verificación de duplicados")

    return {"status": "unique", "message": "NNA Único: No se encontraron coincidencias.", "matches": []}


@router.get("/debug-loaded/show")
async def debug_loaded():
    import sys
    import inspect
    return {
        "sys_path": sys.path,
        "nna_router_file": __file__,
        "_nna_to_dict_source": inspect.getsource(_nna_to_dict)
    }


@router.put("/{carpeta_id}")
async def actualizar_expediente(carpeta_id: int, body: dict, user: dict = Depends(get_current_user)):
    """Actualiza todos los NNA y familiares de una carpeta."""
    rol = user.get("rol", "")
    if rol == "ESTADISTICO":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")
    if rol == "MONITOR":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos de escritura")
    nna_repo = OracleNnaRepository()
    caso_repo = OracleCasoRepository()
    fam_repo = OracleFamiliarRepository()

    # 1. Actualizar datos de los NNA
    if "nnas" in body:
        for n_data in body["nnas"]:
            nna_id = n_data.get("id")
            if nna_id:
                # Extraer campos de salud para formateo si vienen como booleanos
                if "sufreEnfermedad" in n_data:
                    val = n_data["sufreEnfermedad"]
                    n_data["sufre_enfermedad"] = 1 if (val == 'SI' or val is True) else 0
                
                await nna_repo.update(nna_id, n_data)

    # 2. Actualizar datos del caso (perfil, etc) de la carpeta
    await caso_repo.update_caso_by_carpeta(carpeta_id, user.get("sedeId"), body)

    # 3. Actualizar familiares
    if "familiares" in body:
        await fam_repo.save_bulk(carpeta_id, body["familiares"])

    return {"ok": True}


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
    }
