import json
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel

from src.domain.use_cases.cerrar_caso_use_case import (
    CerrarCasoUseCase, CerrarCasoInput, CasoYaCerradoError, AccesoNoAutorizadoError
)
from src.infrastructure.db.repositories.oracle_folio_repository import OracleFolioRepository
from src.infrastructure.db.repositories.oracle_informe_repository import OracleInformeRepository
from src.infrastructure.http.middleware.jwt_middleware import get_current_user

router = APIRouter(prefix="/api/cierre", tags=["cierre"])


class CerrarCasoRequest(BaseModel):
    motivo_egreso: str
    fecha_egreso: Optional[datetime] = None
    situacion_familiar: Optional[str] = None
    situacion_educativa: Optional[str] = None
    logros_alcanzados: Optional[str] = None
    recomendaciones: Optional[str] = None
    archivo_url: Optional[str] = None
    estado: Optional[str] = "FINALIZADO"
    detalles: Optional[str] = None


@router.post("/caso/{caso_id}", status_code=status.HTTP_201_CREATED)
async def cerrar_caso(
    caso_id: int,
    body: CerrarCasoRequest,
    user: dict = Depends(get_current_user),
):
    informe_repo = OracleInformeRepository()
    folio_repo = OracleFolioRepository()
    use_case = CerrarCasoUseCase(informe_repo, folio_repo)
    try:
        informe = await use_case.execute(
            CerrarCasoInput(
                caso_id=caso_id,
                sede_id=user["sedeId"],
                motivo_egreso=body.motivo_egreso,
                creado_por_id=user["userId"],
                fecha_egreso=body.fecha_egreso,
                situacion_familiar=body.situacion_familiar,
                situacion_educativa=body.situacion_educativa,
                logros_alcanzados=body.logros_alcanzados,
                recomendaciones=body.recomendaciones,
                archivo_url=body.archivo_url,
                estado=body.estado or "FINALIZADO",
                detalles=body.detalles,
            )
        )
        return {
            "id":               informe.id,
            "codigo_informe":   informe.codigo_informe,
            "caso_id":          informe.caso_id,
            "motivo_egreso":    informe.motivo_egreso,
            "fecha_egreso":     str(informe.fecha_egreso) if informe.fecha_egreso else None,
            "estado":           informe.estado,
            "detalles":         informe.detalles,
        }
    except AccesoNoAutorizadoError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except CasoYaCerradoError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


# ── Circuito de firma ─────────────────────────────────────────────────────────
#
# La ficha de egreso la firman dos personas en momentos distintos: primero el
# educador que la llenó y después el coordinador de la sede, que es quien
# "firma y sella" según lo acordado en la reunión del 11/08/2026. Entre medio,
# el coordinador puede observarla y devolverla para que el educador la corrija.
#
#   BORRADOR ──firmar──► PEND_COORDINADOR ──firmar──► FIRMADO
#                              │
#                              └──observar──► OBSERVADO ──(corrige y reenvía)
#
# Las firmas y las observaciones se guardan dentro de `DETALLES`, el CLOB donde
# ya vive el resto del formulario: son parte de la ficha y no requieren
# columnas nuevas.

ESTADO_BORRADOR   = "BORRADOR"
ESTADO_FINALIZADO = "FINALIZADO"
ESTADO_PENDIENTE  = "PEND_COORDINADOR"
ESTADO_FIRMADO    = "FIRMADO"
ESTADO_OBSERVADO  = "OBSERVADO"


class FirmaRequest(BaseModel):
    """Trazo de la firma en PNG base64, tal como sale del panel de firmas."""
    firma: str


class ObservacionRequest(BaseModel):
    observacion: str


def _detalles_dict(informe) -> dict:
    """
    Los detalles son un JSON con la ficha completa.

    Una ficha vacía parte de {}, pero un JSON ilegible **aborta**: si se
    devolviera {} y luego se reescribiera con solo la firma, la firma borraría
    toda la ficha en silencio. Mejor negarse a firmar y que alguien lo mire.
    """
    if not informe.detalles:
        return {}
    try:
        return json.loads(informe.detalles)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=409,
            detail="Los datos de la ficha no se pueden leer. Avise al administrador "
                   "antes de firmar: continuar borraría el contenido.",
        )


async def _cargar_para_firma(informe_id: int, user: dict):
    repo = OracleInformeRepository()
    informe = await repo.find_by_id(informe_id)
    if not informe:
        raise HTTPException(status_code=404, detail="Ficha de egreso no encontrada")

    sede_caso = await repo.get_caso_sede_id(informe.caso_id)
    if sede_caso and user.get("sedeId") and sede_caso != user["sedeId"]:
        raise HTTPException(status_code=403, detail="La ficha pertenece a otra sede")

    return repo, informe


@router.post("/informe/{informe_id}/firmar-educador")
async def firmar_educador(
    informe_id: int,
    body: FirmaRequest,
    user: dict = Depends(get_current_user),
):
    """Firma del educador. Deja la ficha esperando al coordinador."""
    repo, informe = await _cargar_para_firma(informe_id, user)

    # Firma quien redactó la ficha, o el responsable del caso.
    #
    # Antes solo se validaba la sede: cualquiera —incluido el coordinador o un
    # practicante— podía firmar en lugar del educador, y el nombre que quedaba
    # estampado era el suyo. La firma de un documento oficial no puede ser
    # delegable por accidente.
    #
    # Los roles de gestión quedan fuera a propósito: si el coordinador firmara
    # como educador, después se estaría firmando a sí mismo.
    responsable_id = await repo.get_caso_responsable_id(informe.caso_id)
    if user["userId"] not in (informe.creado_por_id, responsable_id):
        raise HTTPException(
            status_code=403,
            detail="Solo el educador que redactó la ficha o el responsable del caso pueden firmarla",
        )

    # Solo se firma una ficha terminada o una devuelta con observación.
    #
    # Antes solo se bloqueaba si ya estaba FIRMADO, así que desde BORRADOR se
    # podía llegar a FIRMADO sin PDF, sin folio y sin cerrar el caso — y una vez
    # ahí, ya no había forma de cerrarlo. El frontend ocultaba el botón, pero el
    # endpoint quedaba alcanzable.
    if informe.estado not in (ESTADO_FINALIZADO, ESTADO_OBSERVADO):
        raise HTTPException(
            status_code=409,
            detail=(
                "La ficha ya está firmada." if informe.estado in (ESTADO_PENDIENTE, ESTADO_FIRMADO)
                else "Finalice la ficha antes de firmarla."
            ),
        )

    detalles = _detalles_dict(informe)
    detalles["firmaEducador"] = {
        "imagen":  body.firma,
        "nombre":  await repo.get_nombre_usuario(user["userId"]),
        "usuario": user["userId"],
        "fecha":   datetime.now().isoformat(timespec="seconds"),
    }
    # Al reenviar una ficha observada, la observación anterior deja de aplicar.
    detalles.pop("observacionCoordinador", None)

    await repo.set_estado_y_detalles(informe_id, ESTADO_PENDIENTE, json.dumps(detalles, ensure_ascii=False))
    return {"id": informe_id, "estado": ESTADO_PENDIENTE}


@router.post("/informe/{informe_id}/firmar-coordinador")
async def firmar_coordinador(
    informe_id: int,
    body: FirmaRequest,
    user: dict = Depends(get_current_user),
):
    """Firma del coordinador. Cierra el circuito."""
    if user.get("rol") not in ("COORDINADOR", "ADMIN_SEDE", "ADMIN_NACIONAL"):
        raise HTTPException(status_code=403, detail="Solo el coordinador puede firmar la ficha")

    repo, informe = await _cargar_para_firma(informe_id, user)

    if informe.estado != ESTADO_PENDIENTE:
        raise HTTPException(
            status_code=409,
            detail="La ficha debe estar firmada por el educador antes de que el coordinador la firme",
        )

    detalles = _detalles_dict(informe)
    detalles["firmaCoordinador"] = {
        "imagen":  body.firma,
        "nombre":  await repo.get_nombre_usuario(user["userId"]),
        "usuario": user["userId"],
        "fecha":   datetime.now().isoformat(timespec="seconds"),
    }

    # ── El correlativo se asigna AQUÍ ───────────────────────────────────────
    #
    # Antes se gastaba al primer guardado, incluso en borrador: si el educador
    # abría la ficha, guardaba y se arrepentía, el número quedaba muerto. Una
    # numeración con huecos es una observación de auditoría difícil de explicar
    # con 23 sedes reportando a la DGNNA.
    #
    # Un informe observado tampoco es un documento oficial, así que tampoco
    # debe consumir número. Recién al firmar el coordinador la ficha es
    # definitiva, y su correlativo lleva la fecha de esa firma.
    #
    # ESTE ES EL ÚNICO PUNTO DE ASIGNACIÓN. Si mañana el número lo pone el SGD,
    # se reemplaza esta llamada y nada más.
    codigo = informe.codigo_informe
    if not codigo:
        try:
            sede_id = await repo.get_caso_sede_id(informe.caso_id)
            # El código de sede primero: el correlativo se calcula sobre la
            # serie ya emitida de esa sede y ese año.
            sede_codigo = await repo.get_sede_codigo(sede_id)
            anio = datetime.now().year
            siguiente = await repo.get_next_correlativo(anio, sede_codigo)
            codigo = f"INF-{sede_codigo}-{anio}-{siguiente:04d}"
        except ValueError as e:
            raise HTTPException(
                status_code=409,
                detail=f"No se puede numerar la ficha: {e}",
            )

    await repo.set_estado_y_detalles(
        informe_id, ESTADO_FIRMADO, json.dumps(detalles, ensure_ascii=False),
        codigo_informe=codigo,
    )

    # Y AQUÍ egresa el NNA: ESTADO='CERRADO', FASE='EGRESADO' y se cierra su
    # fase en curso. El egreso lo declara la firma del coordinador, no el
    # educador al finalizar — si no, un chico podía quedar egresado con su
    # ficha todavía en corrección.
    await repo.marcar_caso_egresado(
        caso_id=informe.caso_id,
        fecha_egreso=informe.fecha_egreso or datetime.now(),
        usuario_id=user["userId"],
    )

    # El folio se creó al finalizar sin correlativo; ahora que existe, se
    # completa su título para que el expediente muestre el número real.
    try:
        await repo.actualizar_titulo_folio_inf(informe.caso_id, codigo)
    except Exception as e:
        print(f"No se pudo actualizar el título del folio INF del caso {informe.caso_id}: {e}")

    return {"id": informe_id, "estado": ESTADO_FIRMADO, "codigoInforme": codigo}


@router.post("/informe/{informe_id}/observar")
async def observar_informe(
    informe_id: int,
    body: ObservacionRequest,
    user: dict = Depends(get_current_user),
):
    """
    Devuelve la ficha al educador con una observación.

    Hasta ahora esto se hacía por correo o por Zimbra —"te estoy devolviendo el
    informe, he puesto en rojo estas observaciones"—; el acuerdo fue traerlo al
    sistema para que el educador corrija y reenvíe sin salir de él.
    """
    if user.get("rol") not in ("COORDINADOR", "ADMIN_SEDE", "ADMIN_NACIONAL"):
        raise HTTPException(status_code=403, detail="Solo el coordinador puede observar la ficha")

    if not body.observacion.strip():
        raise HTTPException(status_code=400, detail="Indique el motivo de la observación")

    repo, informe = await _cargar_para_firma(informe_id, user)

    # Solo se observa lo que está esperando firma del coordinador.
    #
    # Sin este guard se podía observar una ficha ya FIRMADA: el NNA quedaba
    # egresado y el caso cerrado, pero el informe volvía a "observado" — un
    # estado que los reportes excluyen. Caso cerrado con informe en corrección.
    if informe.estado != ESTADO_PENDIENTE:
        raise HTTPException(
            status_code=409,
            detail="Solo se pueden observar las fichas que están esperando su firma",
        )

    detalles = _detalles_dict(informe)
    detalles["observacionCoordinador"] = {
        "texto":  body.observacion.strip(),
        "nombre": await repo.get_nombre_usuario(user["userId"]),
        "fecha":  datetime.now().isoformat(timespec="seconds"),
    }
    # Se descartan AMBAS firmas: la ficha va a cambiar, así que ninguna firma
    # anterior ampara lo que quedará escrito.
    detalles.pop("firmaEducador", None)
    detalles.pop("firmaCoordinador", None)

    await repo.set_estado_y_detalles(informe_id, ESTADO_OBSERVADO, json.dumps(detalles, ensure_ascii=False))
    return {"id": informe_id, "estado": ESTADO_OBSERVADO}


@router.get("/pendientes-firma")
async def listar_pendientes_firma(user: dict = Depends(get_current_user)):
    """Bandeja del coordinador: fichas de su sede esperando su firma."""
    if user.get("rol") not in ("COORDINADOR", "ADMIN_SEDE", "ADMIN_NACIONAL"):
        raise HTTPException(status_code=403, detail="No autorizado")

    repo = OracleInformeRepository()
    return await repo.list_pendientes_firma(user["sedeId"])


@router.get("/caso/{caso_id}")
async def get_informe_cierre(caso_id: int, user: dict = Depends(get_current_user)):
    repo = OracleInformeRepository()
    informe = await repo.find_by_caso(caso_id)
    if not informe:
        return None
    return {
        "id":                 informe.id,
        "codigo_informe":     informe.codigo_informe,
        "motivo_egreso":      informe.motivo_egreso,
        "fecha_egreso":       str(informe.fecha_egreso) if informe.fecha_egreso else None,
        "situacion_familiar": informe.situacion_familiar,
        "situacion_educativa":informe.situacion_educativa,
        "logros_alcanzados":  informe.logros_alcanzados,
        "recomendaciones":    informe.recomendaciones,
        "archivo_url":        informe.archivo_url,
        "estado":             informe.estado,
        "detalles":           informe.detalles,
    }

