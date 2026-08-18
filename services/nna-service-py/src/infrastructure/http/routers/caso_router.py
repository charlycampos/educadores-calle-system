from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel

from src.domain.use_cases.cambiar_estado_caso_use_case import (
    CambiarEstadoCasoUseCase, CambiarEstadoInput,
    TransicionInvalidaError, NotFoundError
)
from src.infrastructure.db.repositories.oracle_caso_repository import (
    OracleCasoRepository, OracleHistorialRepository
)
from src.infrastructure.http.middleware.jwt_middleware import get_current_user

router = APIRouter(prefix="/casos", tags=["casos"])


class CambiarEstadoRequest(BaseModel):
    nuevo_estado: str
    motivo: Optional[str] = None


class ReasignarRequest(BaseModel):
    nuevo_responsable_id: int
    motivo: Optional[str] = None


@router.get("/")
async def list_casos(user: dict = Depends(get_current_user)):
    repo = OracleCasoRepository()
    rol = user.get("rol")
    sede_id = user.get("sedeId")
    user_id = user.get("userId")

    if rol == "ESTADISTICO":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado a esta información",
        )

    if rol in ("ADMIN_NACIONAL",):
        casos = await repo.list_by_sede(sede_id=sede_id, solo_activos=False)
    elif rol == "MONITOR":
        casos = await repo.list_all(solo_activos=True)
    elif rol == "COORDINADOR":
        casos = await repo.list_by_sede(sede_id=sede_id)
    else:
        casos = await repo.list_by_responsable(responsable_id=user_id)

    return [
        {
            "id": c.id, "codigo_caso": c.codigo_caso,
            "nna_id": c.nna_id,
            "nna_nombre": f"{c.nna_nombres or ''} {c.nna_apellidos or ''}".strip(),
            "estado": c.estado, "perfil": c.perfil,
            "nivel_riesgo": c.nivel_riesgo,
            "zona_intervencion": c.zona_intervencion,
            "fecha_apertura": str(c.fecha_apertura) if c.fecha_apertura else None,
        }
        for c in casos
    ]


# Fases del servicio (RDE 069-2021). Ver GUIA_OPERATIVA_SEC.md y
# services/intervencion-service-py/src/domain/fases.py.
_FASE_NOMBRE = {
    "I":   "Contacto e Integración",
    "II":  "Restitución de Derechos",
    "III": "Seguimiento y Egreso",
}

# Plazo de cada fase en días, para los casos sin tracking abierto.
_PLAZO_DIAS = {"I": 90, "II": 450, "III": 180}


@router.get("/supervision/sede")
async def supervision_sede(user: dict = Depends(get_current_user)):
    """Bandeja del coordinador: semáforo metodológico con datos reales
    (días transcurridos, F04, PTI activo) y carga real por educador."""
    rol = user.get("rol")
    if rol not in ("COORDINADOR", "ADMIN_SEDE", "ADMIN_NACIONAL", "MONITOR"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")
    sede_id = user.get("sedeId")

    from src.infrastructure.db.connection import get_pool
    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            # Casos activos con indicadores reales.
            #
            # Las dos subconsultas a CASO_FASE se intentan primero y, si la
            # tabla no existe todavía (migración 013 sin ejecutar), se repite
            # la consulta sin ellas. Una bandeja de coordinador caída es peor
            # que una bandeja con el semáforo calculado a la antigua.
            _SQL_FASE = """,
                          c.FASE,
                          -- Días que lleva en la fase ACTUAL, no desde la
                          -- apertura del caso: un NNA en Fase III con 20 meses
                          -- encima no está retrasado, está donde debe estar.
                          (SELECT TRUNC(SYSDATE - f.FECHA_INICIO)
                             FROM CASO_FASE f
                            WHERE f.CASO_ID = c.ID AND f.FECHA_FIN IS NULL
                              AND ROWNUM = 1) AS DIAS_EN_FASE,
                          (SELECT (f.PLAZO_MESES + f.MESES_EXTENSION) * 30
                             FROM CASO_FASE f
                            WHERE f.CASO_ID = c.ID AND f.FECHA_FIN IS NULL
                              AND ROWNUM = 1) AS PLAZO_FASE_DIAS"""
            _SQL_SIN_FASE = ", c.FASE, NULL AS DIAS_EN_FASE, NULL AS PLAZO_FASE_DIAS"

            _SQL_BASE = """SELECT c.ID, c.CODIGO_CASO, c.PERFIL, c.RESPONSABLE_ID,
                          u.NOMBRE_COMPLETO AS RESPONSABLE_NOMBRE,
                          TRIM(n.NOMBRES || ' ' || n.APELLIDO_PATERNO || ' ' || NVL(n.APELLIDO_MATERNO, '')) AS NNA_NOMBRE,
                          n.EDAD, n.ID AS NNA_ID, n.CARPETA_ID,
                          TRUNC(SYSDATE - CAST(c.FECHA_APERTURA AS DATE)) AS DIAS,
                          (SELECT COUNT(*) FROM DIAGNOSTICO_SOCIAL d WHERE d.NNA_ID = n.ID AND d.ESTADO = 'COMPLETO') AS N_F04,
                          (SELECT COUNT(*) FROM PLAN_TRABAJO p WHERE p.CASO_ID = c.ID AND p.ESTADO = 'ACTIVO') AS N_PTI,
                          (SELECT MAX(NVL(p.VIGENCIA_DIAS, 90)) FROM PLAN_TRABAJO p WHERE p.CASO_ID = c.ID AND p.ESTADO = 'ACTIVO') AS PTI_VIGENCIA,
                          (SELECT MAX(p.ID) FROM PLAN_TRABAJO p WHERE p.CASO_ID = c.ID AND p.ESTADO = 'ACTIVO') AS PTI_ID{fase}
                     FROM NNA_CASO c
                     JOIN NNA n ON n.ID = c.NNA_ID
                     LEFT JOIN SEC_USUARIO u ON u.ID = c.RESPONSABLE_ID
                    WHERE c.SEDE_ID = :sede AND c.ESTADO != 'CERRADO'
                    ORDER BY c.FECHA_APERTURA ASC
                    FETCH FIRST 500 ROWS ONLY"""

            try:
                await cur.execute(_SQL_BASE.format(fase=_SQL_FASE), {"sede": sede_id})
            except Exception as e:
                print(f"CASO_FASE no disponible (¿falta la migración 013?): {e}")
                await cur.execute(_SQL_BASE.format(fase=_SQL_SIN_FASE), {"sede": sede_id})
            casos = []
            for r in await cur.fetchall():
                (cid, codigo, perfil, resp_id, resp_nombre, nna_nombre,
                 edad, nna_id, carpeta_id, dias, n_f04, n_pti, pti_vig, pti_id,
                 fase_cod, dias_en_fase, plazo_fase) = r
                dias = int(dias or 0)
                tiene_pti = (n_pti or 0) > 0

                # La fase sale de NNA_CASO.FASE, que escribe el cierre de fase
                # del F05. Antes se deducía de si el caso tenía PTI activo, un
                # proxy que además contradecía al resto del sistema: el mismo
                # NNA podía verse en Fase 2 aquí y en Fase 1 en su expediente.
                fase_cod = fase_cod if fase_cod in _FASE_NOMBRE else "I"
                fase = f"Fase {fase_cod}: {_FASE_NOMBRE[fase_cod]}"

                # El semáforo mide el plazo de la FASE ACTUAL, no la antigüedad
                # del caso. Con el criterio viejo, todo NNA con más de 90 días
                # salía en rojo aunque estuviera en la Fase II, que dura 15
                # meses por norma.
                dias = int(dias_en_fase) if dias_en_fase is not None else dias
                dias_limite = int(plazo_fase) if plazo_fase else _PLAZO_DIAS.get(fase_cod, 90)
                pct = dias / dias_limite if dias_limite else 0
                estado_plazo = "CRÍTICO" if pct >= 1 else "ADVERTENCIA" if pct >= 0.8 else "ÓPTIMO"
                casos.append({
                    "id": cid, "codigo_caso": codigo, "perfil": perfil,
                    "responsable_id": resp_id, "responsable_nombre": resp_nombre,
                    "nna_id": nna_id, "carpeta_id": carpeta_id,
                    "nna_nombre": nna_nombre, "edad": edad,
                    "dias_transcurridos": dias, "dias_limite": dias_limite,
                    "tiene_f04": (n_f04 or 0) > 0, "tiene_pti": tiene_pti,
                    "fase": fase, "estado_plazo": estado_plazo,
                    "pti_id": pti_id,
                })

            # Carga real por educador de la sede
            await cur.execute(
                """SELECT u.ID, u.NOMBRE_COMPLETO, COUNT(c.ID) AS CARGA
                     FROM SEC_USUARIO u
                     JOIN SEC_ROL r ON r.ID = u.ROL_ID
                     LEFT JOIN NNA_CASO c ON c.RESPONSABLE_ID = u.ID AND c.ESTADO != 'CERRADO'
                    WHERE u.SEDE_ID = :sede AND u.ACTIVO = 1 AND UPPER(r.NOMBRE) = 'EDUCADOR'
                    GROUP BY u.ID, u.NOMBRE_COMPLETO
                    ORDER BY u.NOMBRE_COMPLETO""",
                {"sede": sede_id},
            )
            educadores = [
                {"id": r[0], "nombre": r[1], "carga": int(r[2] or 0), "max": 30}
                for r in await cur.fetchall()
            ]

    return {"casos": casos, "educadores": educadores}


@router.get("/{caso_id}")
async def get_caso(caso_id: int, user: dict = Depends(get_current_user)):
    rol = user.get("rol")
    if rol == "ESTADISTICO":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado a esta información",
        )
    repo = OracleCasoRepository()
    caso = await repo.find_by_id(caso_id)
    if not caso:
        raise HTTPException(status_code=404, detail="Caso no encontrado")
    return {
        "id": caso.id, "codigo_caso": caso.codigo_caso,
        "nna_id": caso.nna_id,
        "nna_nombre": f"{caso.nna_nombres or ''} {caso.nna_apellidos or ''}".strip(),
        "sede_id": caso.sede_id, "responsable_id": caso.responsable_id,
        "estado": caso.estado, "perfil": caso.perfil,
        "nivel_riesgo": caso.nivel_riesgo,
        "zona_intervencion": caso.zona_intervencion,
        "actividad_realizada": caso.actividad_realizada,
        "condicion": caso.condicion,
        "fecha_apertura": str(caso.fecha_apertura) if caso.fecha_apertura else None,
        "fecha_cierre": str(caso.fecha_cierre) if caso.fecha_cierre else None,
    }


@router.patch("/{caso_id}/estado")
async def cambiar_estado(
    caso_id: int,
    body: CambiarEstadoRequest,
    user: dict = Depends(get_current_user),
):
    rol = user.get("rol")
    if rol == "ESTADISTICO":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")
    if rol == "MONITOR":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos de escritura")
    caso_repo = OracleCasoRepository()
    hist_repo = OracleHistorialRepository()
    use_case = CambiarEstadoCasoUseCase(caso_repo, hist_repo)
    try:
        return await use_case.execute(
            CambiarEstadoInput(
                caso_id=caso_id,
                nuevo_estado=body.nuevo_estado,
                usuario_id=user["userId"],
                motivo=body.motivo,
            )
        )
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except TransicionInvalidaError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))


@router.patch("/{caso_id}/reasignar")
async def reasignar_caso(
    caso_id: int,
    body: ReasignarRequest,
    user: dict = Depends(get_current_user),
):
    """Reasigna el responsable del caso (usado en derivaciones internas)."""
    rol = user.get("rol")
    if rol == "ESTADISTICO":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")
    if rol == "MONITOR":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos de escritura")
    caso_repo = OracleCasoRepository()
    hist_repo = OracleHistorialRepository()
    caso = await caso_repo.find_by_id(caso_id)
    if not caso:
        raise HTTPException(status_code=404, detail="Caso no encontrado")
    responsable_anterior = caso.responsable_id
    await caso_repo.update_responsable(caso_id, body.nuevo_responsable_id)
    await hist_repo.create(
        caso_id=caso_id,
        estado_anterior=caso.estado,
        estado_nuevo=caso.estado,
        usuario_id=user["userId"],
        motivo=body.motivo or f"Reasignación por derivación interna",
        tipo_cambio="REASIGNACION",
    )
    return {"ok": True, "caso_id": caso_id, "nuevo_responsable_id": body.nuevo_responsable_id}


@router.get("/{caso_id}/historial")
async def get_historial(caso_id: int, user: dict = Depends(get_current_user)):
    rol = user.get("rol")
    if rol == "ESTADISTICO":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado a esta información",
        )
    repo = OracleHistorialRepository()
    return await repo.list_by_caso(caso_id)
