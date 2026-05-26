"""
Crea el informe de cierre y marca el caso como CERRADO.
Genera automáticamente el folio INF en el expediente.
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


class CasoYaCerradoError(Exception):
    pass


class CerrarCasoUseCase:
    def __init__(self, informe_repo, folio_repo):
        self._informe_repo = informe_repo
        self._folio_repo = folio_repo

    async def execute(self, input: CerrarCasoInput):
        # Verificar que no exista ya un informe de cierre
        existente = await self._informe_repo.find_by_caso(input.caso_id)
        if existente:
            raise CasoYaCerradoError(f"El caso {input.caso_id} ya tiene informe de cierre")

        anio = datetime.now().year
        siguiente_inf = await self._informe_repo.get_next_correlativo(anio)
        codigo_informe = f"INF-{anio}-{siguiente_inf:04d}"

        informe = await self._informe_repo.create(
            caso_id=input.caso_id,
            codigo_informe=codigo_informe,
            motivo_egreso=input.motivo_egreso,
            fecha_egreso=input.fecha_egreso or datetime.now(),
            situacion_familiar=input.situacion_familiar,
            situacion_educativa=input.situacion_educativa,
            logros_alcanzados=input.logros_alcanzados,
            recomendaciones=input.recomendaciones,
            archivo_url=input.archivo_url,
            creado_por_id=input.creado_por_id,
        )

        # Agregar folio INF al expediente automáticamente
        siguiente_folio = await self._folio_repo.get_next_numero_folio(input.caso_id)
        await self._folio_repo.create(
            caso_id=input.caso_id,
            sede_id=input.sede_id,
            numero_folio=siguiente_folio,
            tipo_documento="INF",
            titulo=f"Informe de Cierre — {codigo_informe}",
            archivo_url=input.archivo_url or "",
            hash_documento=None,
            creado_por_id=input.creado_por_id,
        )

        return informe
