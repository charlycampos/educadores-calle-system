"""
Crea y actualiza la Ficha de Egreso (F13).

NO egresa al NNA ni asigna correlativo: las dos cosas ocurren cuando el
coordinador firma (ver `cierre_router.firmar_coordinador`). Aquí solo se
guarda la ficha y, al finalizarla, se crea su folio en el expediente.

La ficha es editable en BORRADOR, OBSERVADO y FINALIZADO. Queda bloqueada
mientras espera la firma del coordinador y una vez firmada.
"""
from dataclasses import dataclass
from typing import Optional
from datetime import datetime


@dataclass
class CerrarCasoInput:
    caso_id: int
    sede_id: int
    motivo_egreso: str
    creado_por_id: int
    fecha_egreso: Optional[datetime] = None
    situacion_familiar: Optional[str] = None
    situacion_educativa: Optional[str] = None
    logros_alcanzados: Optional[str] = None
    recomendaciones: Optional[str] = None
    archivo_url: Optional[str] = None
    estado: str = "FINALIZADO"
    detalles: Optional[str] = None


class CasoYaCerradoError(Exception):
    pass


class AccesoNoAutorizadoError(Exception):
    pass


class CerrarCasoUseCase:
    def __init__(self, informe_repo, folio_repo):
        self._informe_repo = informe_repo
        self._folio_repo = folio_repo

    async def execute(self, input: CerrarCasoInput):
        caso_sede_id = await self._informe_repo.get_caso_sede_id(input.caso_id)
        if caso_sede_id is None:
            raise ValueError(f"El caso {input.caso_id} no existe")
        if caso_sede_id != input.sede_id:
            raise AccesoNoAutorizadoError(
                f"El caso {input.caso_id} no pertenece a su sede"
            )

        # Verificar en qué estado está el informe de cierre
        #
        # Editable en BORRADOR y en OBSERVADO. Lo segundo es el arreglo del
        # circuito: cuando el coordinador devolvía una ficha con observaciones,
        # el educador recibía 409 al intentar guardar la corrección. Solo podía
        # volver a firmar la misma ficha sin cambiar nada, que es justo lo
        # contrario de lo que se acordó traer desde Zimbra.
        existente = await self._informe_repo.find_by_caso(input.caso_id)
        if existente:
            if existente.estado in ("PEND_COORDINADOR", "FIRMADO"):
                raise CasoYaCerradoError(
                    "La ficha está en revisión del coordinador y no se puede modificar"
                    if existente.estado == "PEND_COORDINADOR"
                    else f"El caso {input.caso_id} ya tiene informe de cierre firmado"
                )
            elif existente.estado in ("BORRADOR", "OBSERVADO", "FINALIZADO"):
                informe = await self._informe_repo.update(
                    id=existente.id,
                    motivo_egreso=input.motivo_egreso,
                    fecha_egreso=input.fecha_egreso or datetime.now(),
                    situacion_familiar=input.situacion_familiar,
                    situacion_educativa=input.situacion_educativa,
                    logros_alcanzados=input.logros_alcanzados,
                    recomendaciones=input.recomendaciones,
                    archivo_url=input.archivo_url,
                    estado=input.estado,
                    detalles=input.detalles,
                )
            else:
                raise CasoYaCerradoError(f"Estado de informe no reconocido: {existente.estado}")
        else:
            # SIN correlativo todavía.
            #
            # Antes se asignaba aquí, en el primer guardado: un borrador que el
            # educador abría y descartaba se llevaba un número para siempre, y
            # la numeración quedaba con huecos. El correlativo se asigna al
            # firmar el coordinador (ver cierre_router.firmar_coordinador), que
            # es cuando la ficha pasa a ser un documento oficial.
            informe = await self._informe_repo.create(
                caso_id=input.caso_id,
                codigo_informe=None,
                motivo_egreso=input.motivo_egreso,
                fecha_egreso=input.fecha_egreso or datetime.now(),
                situacion_familiar=input.situacion_familiar,
                situacion_educativa=input.situacion_educativa,
                logros_alcanzados=input.logros_alcanzados,
                recomendaciones=input.recomendaciones,
                archivo_url=input.archivo_url,
                creado_por_id=input.creado_por_id,
                estado=input.estado,
                detalles=input.detalles,
            )


        # El folio INF se crea al finalizar, sin correlativo todavía: es el
        # comprobante de que la ficha existe en el expediente. Su título se
        # completa con el correlativo cuando el coordinador firma.
        #
        # `existe_folio_inf` evita duplicarlo si el educador finaliza, el
        # coordinador observa y el educador vuelve a finalizar.
        if input.estado == "FINALIZADO":
            if not await self._folio_repo.existe_folio_inf(input.caso_id):
                siguiente_folio = await self._folio_repo.get_next_numero_folio(input.caso_id)
                await self._folio_repo.create(
                    caso_id=input.caso_id,
                    sede_id=input.sede_id,
                    numero_folio=siguiente_folio,
                    tipo_documento="INF",
                    titulo=f"Informe de Cierre — {informe.codigo_informe or 'pendiente de firma'}",
                    archivo_url=input.archivo_url or "",
                    hash_documento=None,
                    creado_por_id=input.creado_por_id,
                )

        # El NNA NO egresa aquí.
        #
        # El egreso lo declara la firma del coordinador, no el educador al
        # finalizar. Antes se cerraba el caso en este punto y producía un estado
        # imposible: el educador finalizaba, el NNA salía de todos los tableros,
        # y si después el coordinador observaba la ficha, quedaba un caso
        # cerrado con un informe en corrección.
        #
        # Ahora el chico sigue contándose en la carga de su educador hasta que
        # su egreso está aprobado, que es lo que pasa en la realidad.
        # Ver cierre_router.firmar_coordinador.

        return informe
