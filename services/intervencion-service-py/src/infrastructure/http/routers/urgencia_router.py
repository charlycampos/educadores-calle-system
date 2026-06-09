import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from src.domain.entities.urgencia import UrgenciaF15Create, UrgenciaF15Response
from src.infrastructure.db.repositories.oracle_urgencia_repository import OracleUrgenciaRepository
from src.infrastructure.http.middleware.jwt_middleware import get_current_user

logger = logging.getLogger("urgencia_router")

router = APIRouter(prefix="/api/urgencias", tags=["Atencion de Urgencia (F15)"])

def get_repository():
    return OracleUrgenciaRepository()

@router.post("", response_model=UrgenciaF15Response, status_code=status.HTTP_201_CREATED)
async def registrar_urgencia(
    data: UrgenciaF15Create,
    request: Request,
    repo: OracleUrgenciaRepository = Depends(get_repository),
    current_user: dict = Depends(get_current_user)
):
    # Obtener educador_id y sede_id desde los states del request (JWTMiddleware)
    educador_id = getattr(request.state, "user_id", None)
    sede_id = getattr(request.state, "sede_id", None)
    
    if not educador_id or not sede_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Informacion de usuario/sede no encontrada en el token"
        )
        
    try:
        return await repo.create_urgencia(data, educador_id, sede_id)
    except Exception as e:
        logger.error(f"Error al registrar F15: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno al guardar la urgencia: {str(e)}"
        )

@router.get("", response_model=list[UrgenciaF15Response])
async def listar_urgencias_sede(
    request: Request,
    repo: OracleUrgenciaRepository = Depends(get_repository),
    current_user: dict = Depends(get_current_user)
):
    sede_id = getattr(request.state, "sede_id", None)
    if not sede_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sede no identificada"
        )
    return await repo.list_by_sede(sede_id)

@router.get("/{id}", response_model=UrgenciaF15Response)
async def obtener_urgencia(
    id: int,
    repo: OracleUrgenciaRepository = Depends(get_repository),
    current_user: dict = Depends(get_current_user)
):
    urg = await repo.get_by_id(id)
    if not urg:
        raise HTTPException(status_code=404, detail="Ficha de urgencia no encontrada")
    return urg

@router.put("/{id}", response_model=UrgenciaF15Response)
async def actualizar_urgencia(
    id: int,
    data: UrgenciaF15Create,
    repo: OracleUrgenciaRepository = Depends(get_repository),
    current_user: dict = Depends(get_current_user)
):
    urg = await repo.update_urgencia(id, data)
    if not urg:
        raise HTTPException(status_code=404, detail="No se pudo actualizar, ficha no encontrada")
    return urg

@router.patch("/{id}/estado")
async def cambiar_estado(
    id: int,
    payload: dict,
    repo: OracleUrgenciaRepository = Depends(get_repository),
    current_user: dict = Depends(get_current_user)
):
    estado = payload.get("estado")
    nna_id = payload.get("nna_id")
    if not estado:
        raise HTTPException(status_code=400, detail="El campo 'estado' es requerido")
        
    ok = await repo.update_estado(id, estado, nna_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Ficha de urgencia no encontrada")
    return {"message": "Estado actualizado correctamente", "id": id, "estado": estado, "nna_id": nna_id}

@router.get("/{id}/prefill-f03")
async def obtener_prellenado_f03(
    id: int,
    repo: OracleUrgenciaRepository = Depends(get_repository),
    current_user: dict = Depends(get_current_user)
):
    """
    Retorna el payload pre-formateado con la estructura que NnaCreatePage (F03)
    espera recibir para autocompletar el formulario de registro.
    """
    urg = await repo.get_by_id(id)
    if not urg:
        raise HTTPException(status_code=404, detail="Ficha de urgencia no encontrada")
        
    datos_extra = urg.get("datos_extra") or {}
    
    # Extraer información estructurada de datos_extra o fallback a columnas planas de NNA_URGENCIA_F15
    nombres = datos_extra.get("nombres") or urg.get("nombre_referido") or ""
    apellido_paterno = datos_extra.get("apellido_paterno") or ""
    apellido_materno = datos_extra.get("apellido_materno") or ""
    sexo = datos_extra.get("sexo") or ""
    fecha_nacimiento = datos_extra.get("fecha_nacimiento") or ""
    edad = datos_extra.get("edad") or None
    unidad_edad = datos_extra.get("unidad_edad") or "ANIOS"
    
    domicilio_actual = datos_extra.get("domicilio_actual") or urg.get("direccion_referida") or ""
    departamento_dom = datos_extra.get("departamento_dom") or ""
    provincia_dom = datos_extra.get("provincia_dom") or ""
    distrito_dom = datos_extra.get("distrito_dom") or ""
    
    tipo_doc = datos_extra.get("tipo_doc") or ("1" if urg.get("tiene_dni") else "7")
    numero_doc = datos_extra.get("numero_doc") or ""
    
    estudia_actualmente = datos_extra.get("asiste_escuela_situacion")
    if estudia_actualmente is None:
        estudia_actualmente = 1 if urg.get("asiste_escuela") else 0
    elif estudia_actualmente == "SI" or estudia_actualmente == "1":
        estudia_actualmente = 1
    elif estudia_actualmente == "NO" or estudia_actualmente == "0":
        estudia_actualmente = 0
    else:
        estudia_actualmente = 0

    institucion_educativa = datos_extra.get("institucion_educativa") or urg.get("escuela_detalle") or ""
    grado_estudio = datos_extra.get("grado_estudio") or urg.get("grado_escuela") or ""
    nivel_educativo = datos_extra.get("nivel_educativo") or ""
    modalidad_estudio = datos_extra.get("modalidad_estudio") or ""
    
    afiliado_sis = datos_extra.get("afiliado_sis") or ("SI" if urg.get("tiene_sis") else "NO_SABE")
    afiliado_otro_seguro = datos_extra.get("afiliado_otro_seguro") or "NO"
    detalle_otro_seguro = datos_extra.get("detalle_otro_seguro") or ""
    
    lugar_pernocte = datos_extra.get("lugar_pernocte") or ""
    detalle_lugar_pernocte = datos_extra.get("detalle_lugar_pernocte") or ""
    
    tutor_nombre = datos_extra.get("tutor_nombre") or ""
    tutor_parentesco = datos_extra.get("tutor_parentesco") or ""
    tutor_dni = datos_extra.get("tutor_dni") or ""
    tutor_telefono = datos_extra.get("tutor_telefono") or ""
    personas_vive = datos_extra.get("personas_vive") or urg.get("familiares_vive") or ""
    vive_con = datos_extra.get("vive_con") or "3"
    detalle_vive_con = datos_extra.get("detalle_vive_con") or ""

    dias_trabajo = datos_extra.get("dias_trabajo") or []
    if isinstance(dias_trabajo, list):
        dias_trabajo_str = ",".join(dias_trabajo)
    else:
        dias_trabajo_str = str(dias_trabajo)
    
    actividades_detalle = datos_extra.get("actividades_detalle") or urg.get("actividades_realiza") or ""

    return {
        "nombres": nombres,
        "apellido_paterno": apellido_paterno,
        "apellido_materno": apellido_materno,
        "sexo": sexo,
        "fecha_nacimiento": fecha_nacimiento,
        "edad": edad,
        "unidad_edad": unidad_edad,
        "tiene_partida_nacimiento": True if tipo_doc == "1" else False,
        "tipo_doc": tipo_doc,
        "numero_doc": numero_doc,
        "domicilio_actual": domicilio_actual,
        "departamento_dom": departamento_dom,
        "provincia_dom": provincia_dom,
        "distrito_dom": distrito_dom,
        "lugar_pernocte": lugar_pernocte,
        "detalle_lugar_pernocte": detalle_lugar_pernocte,
        "afiliado_sis": afiliado_sis,
        "afiliado_otro_seguro": afiliado_otro_seguro,
        "detalle_otro_seguro": detalle_otro_seguro,
        "estudia_actualmente": estudia_actualmente,
        "institucion_educativa": institucion_educativa,
        "nivel_educativo": nivel_educativo,
        "grado_estudio": grado_estudio,
        "modalidad_estudio": modalidad_estudio,
        "detalle_no_estudia": datos_extra.get("detalle_no_estudia") or "",
        "caracteristicas": actividades_detalle,
        "observaciones_salud": urg.get("riesgo_salud") or "",
        "urgencia_id": id,
        "perfil": urg.get("perfil") or "",
        "situacion_calle": datos_extra.get("situacion_calle") or "",
        "dias_trabajo": dias_trabajo_str,
        "tutor_nombre": tutor_nombre,
        "tutor_parentesco": tutor_parentesco,
        "tutor_dni": tutor_dni,
        "tutor_telefono": tutor_telefono,
        "personas_vive": personas_vive,
        "vive_con": vive_con,
        "detalle_vive_con": detalle_vive_con,
        "datos_extra": datos_extra
    }
