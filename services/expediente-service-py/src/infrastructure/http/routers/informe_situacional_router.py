from typing import Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from src.infrastructure.db.repositories.oracle_informe_situacional_repository import OracleInformeSituacionalRepository
from src.infrastructure.http.middleware.jwt_middleware import get_current_user, verificar_token, verificar_token_descarga

import os
from fastapi.responses import FileResponse
from src.infrastructure.services.pdf_generator_f09 import generate_f09_pdf

router = APIRouter(prefix="/api/informe-situacional", tags=["informe-situacional"])


class InformeSituacionalSaveRequest(BaseModel):
    fecha_informe: Optional[str] = None
    destinatario: str
    asunto: str
    antecedentes: Optional[str] = None
    estrategias: Optional[str] = None
    situacion_salud: Optional[str] = None
    situacion_educativa: Optional[str] = None
    situacion_familiar: Optional[str] = None
    conclusiones: Optional[str] = None
    recomendaciones: Optional[str] = None
    estado: Optional[str] = 'BORRADOR'


def _serialize(inf):
    return {
        "id": inf.id,
        "caso_id": inf.caso_id,
        "fecha_informe": str(inf.fecha_informe)[:10],
        "destinatario": inf.destinatario,
        "asunto": inf.asunto,
        "antecedentes": inf.antecedentes,
        "estrategias": inf.estrategias,
        "situacion_salud": inf.situacion_salud,
        "situacion_educativa": inf.situacion_educativa,
        "situacion_familiar": inf.situacion_familiar,
        "conclusiones": inf.conclusiones,
        "recomendaciones": inf.recomendaciones,
        "creado_por_id": inf.creado_por_id,
        "estado": inf.estado,
    }


@router.get("/caso/{caso_id}")
async def get_informe_situacional(caso_id: int, user: dict = Depends(get_current_user)):
    repo = OracleInformeSituacionalRepository()
    inf = await repo.find_by_caso(caso_id)
    if not inf:
        return None
    return _serialize(inf)


@router.post("/caso/{caso_id}")
async def save_informe_situacional(
    caso_id: int,
    body: InformeSituacionalSaveRequest,
    user: dict = Depends(get_current_user)
):
    repo = OracleInformeSituacionalRepository()
    informe = await repo.save(caso_id, body.model_dump(), user["userId"])
    
    # Registrar en el expediente digital (EXP_FOLIO) si no existe y está FINALIZADO
    if informe.estado == "FINALIZADO":
        from src.infrastructure.db.repositories.oracle_folio_repository import OracleFolioRepository
        folio_repo = OracleFolioRepository()
        folios = await folio_repo.list_by_caso(caso_id)
        tipo_doc = "INFORME_SITUACIONAL"
        existe_folio = any(f.tipo_documento == tipo_doc for f in folios)
        if not existe_folio:
            siguiente_folio = await folio_repo.get_next_numero_folio(caso_id)
            await folio_repo.create(
                caso_id=caso_id,
                sede_id=user.get("sedeId", 1),
                numero_folio=siguiente_folio,
                tipo_documento=tipo_doc,
                titulo="Informe Situacional",
                archivo_url=f"/api/informe-situacional/caso/{caso_id}/pdf",
                hash_documento=None,
                creado_por_id=user["userId"]
            )
        
        # Generar e introducir el PDF inmediatamente en el repositorio de archivos
        try:
            nna = await repo.get_nna_by_caso(caso_id)
            repositorio_dir = os.path.abspath("./repositorio_archivos/informes_situacionales")
            os.makedirs(repositorio_dir, exist_ok=True)
            pdf_path = os.path.join(repositorio_dir, f"informe_situacional_{caso_id}.pdf")
            informe_dict = _serialize(informe)
            generate_f09_pdf(informe_dict, nna, pdf_path)
        except Exception as e:
            print(f"Error generando PDF de Informe Situacional en guardado: {e}")
            
    return _serialize(informe)


@router.delete("/caso/{caso_id}")
async def delete_informe_situacional(caso_id: int, user: dict = Depends(get_current_user)):
    repo = OracleInformeSituacionalRepository()
    deleted = await repo.delete(caso_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No existe informe situacional para eliminar"
        )
    return {"status": "ok", "message": "Informe situacional eliminado"}


@router.get("/caso/{caso_id}/pdf")
async def exportar_pdf_informe_situacional(
    caso_id: int,
    token: Optional[str] = None,
    user: Optional[dict] = Depends(get_current_user)
):
    if not user:
        if not token:
            raise HTTPException(status_code=401, detail="No autorizado")
        try:
            user = verificar_token_descarga(token)
        except Exception:
            raise HTTPException(status_code=401, detail="Token inválido")
            
    repo = OracleInformeSituacionalRepository()
    inf = await repo.find_by_caso(caso_id)
    if not inf:
        raise HTTPException(status_code=404, detail="Informe no encontrado")
        
    nna = await repo.get_nna_by_caso(caso_id)
    
    # Generar PDF en el repositorio de archivos
    repositorio_dir = os.path.abspath("./repositorio_archivos/informes_situacionales")
    os.makedirs(repositorio_dir, exist_ok=True)
    pdf_path = os.path.join(repositorio_dir, f"informe_situacional_{caso_id}.pdf")
    
    informe_dict = {
        "fecha_informe": inf.fecha_informe,
        "destinatario": inf.destinatario,
        "asunto": inf.asunto,
        "antecedentes": inf.antecedentes,
        "estrategias": inf.estrategias,
        "situacion_salud": inf.situacion_salud,
        "situacion_educativa": inf.situacion_educativa,
        "situacion_familiar": inf.situacion_familiar,
        "conclusiones": inf.conclusiones,
        "recomendaciones": inf.recomendaciones
    }
    
    generate_f09_pdf(informe_dict, nna, pdf_path)
    
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename="Informe_Situacional.pdf",
        headers={"Content-Disposition": "inline; filename=Informe_Situacional.pdf"}
    )


@router.get("/caso/{caso_id}/vista", response_class=HTMLResponse)
async def vista_informe_situacional(
    caso_id: int,
    token: Optional[str] = None,
    user: Optional[dict] = Depends(get_current_user)
):
    if not user:
        if not token:
            raise HTTPException(status_code=401, detail="No autorizado")
        try:
            user = verificar_token_descarga(token)
        except Exception:
            raise HTTPException(status_code=401, detail="Token inválido")

    repo = OracleInformeSituacionalRepository()
    inf = await repo.find_by_caso(caso_id)
    if not inf:
        raise HTTPException(status_code=404, detail="Informe no encontrado")

    fecha_str = str(inf.fecha_informe)[:10]
    try:
        d = datetime.strptime(fecha_str, "%Y-%m-%d")
        fecha_str = d.strftime("%d/%m/%Y")
    except Exception:
        pass

    def campo(valor):
        return valor if valor else '—'

    html = f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Informe Situacional</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; padding: 40px 48px; max-width: 860px; margin: 0 auto; }}
  .header {{ text-align: center; margin-bottom: 28px; }}
  .header h1 {{ font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.06em; }}
  .header p {{ font-size: 11px; color: #555; margin-top: 4px; }}
  .seccion {{ border: 1px solid #d0d0d0; border-radius: 6px; overflow: hidden; margin-bottom: 14px; }}
  .seccion-title {{ background: #f0f0f0; padding: 7px 14px; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em; color: #444; }}
  .seccion-body {{ padding: 14px; }}
  .grid-2 {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }}
  .grid-3 {{ display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }}
  .field {{ margin-bottom: 8px; }}
  .field-label {{ font-size: 10px; font-weight: bold; color: #666; margin-bottom: 3px; text-transform: uppercase; }}
  .field-value {{ background: #f7f7f7; border: 1px solid #e0e0e0; border-radius: 4px; padding: 7px 10px; font-size: 13px; min-height: 34px; }}
  .field-value.multiline {{ white-space: pre-wrap; min-height: 60px; line-height: 1.6; }}
  .firmas {{ display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-top: 60px; }}
  .firma {{ text-align: center; }}
  .firma-linea {{ border-top: 1px solid #333; padding-top: 6px; font-size: 13px; font-weight: bold; }}
  .firma-sub {{ font-size: 11px; color: #666; margin-top: 3px; }}
  .badge {{ display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: bold; text-transform: uppercase; }}
  .badge-finalizado {{ background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }}
  .badge-borrador {{ background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }}
</style>
</head>
<body>
<div class="header">
  <h1>Servicio de Educadores de Calle — DGNNA</h1>
  <p>Informe Situacional — Formato 09 &nbsp;|&nbsp; {fecha_str} &nbsp;|&nbsp;
    <span class="badge {'badge-finalizado' if inf.estado == 'FINALIZADO' else 'badge-borrador'}">{inf.estado}</span>
  </p>
</div>

<div class="seccion">
  <div class="seccion-title">I. Datos de Identificación</div>
  <div class="seccion-body">
    <div class="grid-2">
      <div class="field"><div class="field-label">Dirigido a</div><div class="field-value">{campo(inf.destinatario)}</div></div>
      <div class="field"><div class="field-label">Fecha del Informe</div><div class="field-value">{fecha_str}</div></div>
    </div>
    <div class="field" style="margin-top:8px"><div class="field-label">Asunto</div><div class="field-value">{campo(inf.asunto)}</div></div>
  </div>
</div>

<div class="seccion">
  <div class="seccion-title">II. Antecedentes y Circunstancias del Hallazgo</div>
  <div class="seccion-body">
    <div class="field-value multiline">{campo(inf.antecedentes)}</div>
  </div>
</div>

<div class="seccion">
  <div class="seccion-title">III. Estrategias de Acercamiento</div>
  <div class="seccion-body">
    <div class="field-value multiline">{campo(inf.estrategias)}</div>
  </div>
</div>

<div class="seccion">
  <div class="seccion-title">IV. Análisis de la Situación</div>
  <div class="seccion-body">
    <div class="field" style="margin-bottom:10px"><div class="field-label">4.1 Situación de Salud</div><div class="field-value multiline">{campo(inf.situacion_salud)}</div></div>
    <div class="field" style="margin-bottom:10px"><div class="field-label">4.2 Situación Educativa</div><div class="field-value multiline">{campo(inf.situacion_educativa)}</div></div>
    <div class="field"><div class="field-label">4.3 Situación Familiar y Social</div><div class="field-value multiline">{campo(inf.situacion_familiar)}</div></div>
  </div>
</div>

<div class="seccion">
  <div class="seccion-title">V. Conclusiones y Recomendaciones</div>
  <div class="seccion-body">
    <div class="field" style="margin-bottom:10px"><div class="field-label">Conclusiones</div><div class="field-value multiline">{campo(inf.conclusiones)}</div></div>
    <div class="field"><div class="field-label">Se recomienda</div><div class="field-value multiline">{campo(inf.recomendaciones)}</div></div>
  </div>
</div>

<div class="firmas">
  <div class="firma"><div class="firma-linea">Educador/a de Calle</div><div class="firma-sub">Responsable del Caso</div></div>
  <div class="firma"><div class="firma-linea">Coordinador/a</div><div class="firma-sub">V° B°</div></div>
</div>
</body>
</html>"""

    return HTMLResponse(content=html)
