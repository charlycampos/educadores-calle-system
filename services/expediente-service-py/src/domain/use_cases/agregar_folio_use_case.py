"""
Agrega un folio al expediente digital de un caso.
El número de folio es correlativo por caso (inmutable una vez creado).
"""
import hashlib
from dataclasses import dataclass
from typing import Optional


@dataclass
class AgregarFolioInput:
    caso_id: int
    sede_id: int
    tipo_documento: str
    titulo: str
    archivo_url: str
    creado_por_id: int
    contenido_hash: Optional[str] = None  # SHA-256 del archivo si se provee


class TipoDocumentoInvalidoError(Exception):
    pass


class AgregarFolioUseCase:
    def __init__(self, folio_repo):
        self._repo = folio_repo

    async def execute(self, input: AgregarFolioInput):
        from src.domain.entities.folio import TIPOS_DOCUMENTO
        if input.tipo_documento not in TIPOS_DOCUMENTO:
            raise TipoDocumentoInvalidoError(
                f"Tipo '{input.tipo_documento}' no válido. Válidos: {TIPOS_DOCUMENTO}"
            )

        # Siguiente número de folio para este caso
        siguiente = await self._repo.get_next_numero_folio(input.caso_id)

        folio = await self._repo.create(
            caso_id=input.caso_id,
            sede_id=input.sede_id,
            numero_folio=siguiente,
            tipo_documento=input.tipo_documento,
            titulo=input.titulo,
            archivo_url=input.archivo_url,
            hash_documento=input.contenido_hash,
            creado_por_id=input.creado_por_id,
        )
        return folio
