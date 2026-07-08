from fastapi import APIRouter, Depends, Request, HTTPException
from typing import List
from src.domain.entities.diario import DiarioCampoCreate, DiarioCampoResponse
from src.infrastructure.db.repositories.oracle_diario_repository import OracleDiarioRepository
from src.domain.use_cases.diario_use_case import DiarioUseCase

router = APIRouter(prefix="/api/diario", tags=["Diario Campo"])

def get_repository():
    return OracleDiarioRepository()

@router.post("", response_model=DiarioCampoResponse)
async def registrar_diario(data: DiarioCampoCreate, request: Request, repo: OracleDiarioRepository = Depends(get_repository)):
    use_case = DiarioUseCase(repo)
    return await use_case.registrar_diario(data, request.state.user_id)

@router.get("/caso/{caso_id}", response_model=List[DiarioCampoResponse])
async def listar_por_caso(caso_id: int, repo: OracleDiarioRepository = Depends(get_repository)):
    use_case = DiarioUseCase(repo)
    return await use_case.listar_por_caso(caso_id)

@router.get("/stats/sede")
async def stats_diarios_sede(request: Request):
    """Estadísticas reales de diarios de campo de la sede del usuario:
    totales, evidencias, distribución por tipo, progreso por educador y recientes."""
    sede_id = request.state.sede_id
    from src.infrastructure.db.connection import get_pool
    import json as _json

    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            # Totales y evidencias (las evidencias viajan como JSON en OBSERVACIONES)
            await cur.execute(
                """SELECT COUNT(*),
                          SUM(CASE WHEN TRUNC(CAST(d.FECHA AS DATE)) = TRUNC(SYSDATE) THEN 1 ELSE 0 END),
                          SUM(CASE WHEN d.OBSERVACIONES LIKE '%"firma"%' THEN 1 ELSE 0 END),
                          SUM(CASE WHEN d.OBSERVACIONES LIKE '%"foto"%' THEN 1 ELSE 0 END),
                          SUM(CASE WHEN d.OBSERVACIONES LIKE '%CONSEJERIA%' THEN 1 ELSE 0 END),
                          SUM(CASE WHEN d.OBSERVACIONES LIKE '%VISITA%' THEN 1 ELSE 0 END),
                          SUM(CASE WHEN d.OBSERVACIONES LIKE '%COORDINACION%' THEN 1 ELSE 0 END),
                          SUM(CASE WHEN d.OBSERVACIONES LIKE '%RECORRIDO%' THEN 1 ELSE 0 END)
                     FROM DIARIO_CAMPO d
                     LEFT JOIN NNA_CASO c ON c.ID = d.CASO_ID
                     LEFT JOIN SEC_USUARIO u ON u.ID = d.CREADO_POR_ID
                    WHERE c.SEDE_ID = :sede OR u.SEDE_ID = :sede""",
                {"sede": sede_id},
            )
            t = await cur.fetchone()
            total, hoy, con_firma, con_foto, n_consej, n_visita, n_coord, n_recorr = [int(x or 0) for x in t]

            # Progreso de hoy por educador (todos los educadores activos de la sede)
            await cur.execute(
                """SELECT u.ID, u.NOMBRE_COMPLETO,
                          (SELECT COUNT(*) FROM DIARIO_CAMPO d
                            WHERE d.CREADO_POR_ID = u.ID
                              AND TRUNC(CAST(d.FECHA AS DATE)) = TRUNC(SYSDATE)) AS HOY,
                          (SELECT COUNT(*) FROM DIARIO_CAMPO d WHERE d.CREADO_POR_ID = u.ID) AS TOTAL
                     FROM SEC_USUARIO u
                     JOIN SEC_ROL r ON r.ID = u.ROL_ID
                    WHERE u.SEDE_ID = :sede AND u.ACTIVO = 1 AND UPPER(r.NOMBRE) = 'EDUCADOR'
                    ORDER BY u.NOMBRE_COMPLETO""",
                {"sede": sede_id},
            )
            educadores = [
                {"id": r[0], "nombre": r[1], "registrados": int(r[2] or 0), "totalHistorico": int(r[3] or 0)}
                for r in await cur.fetchall()
            ]

            # Diarios recientes con nombres
            await cur.execute(
                """SELECT d.ID, d.CASO_ID, d.FECHA, d.UBICACION, d.ACTIVIDAD, d.OBSERVACIONES,
                          d.ESTADO_FISICO, d.ESTADO_ANIMO, d.LATITUD, d.LONGITUD,
                          u.NOMBRE_COMPLETO AS EDUCADOR_NOMBRE,
                          TRIM(n.NOMBRES || ' ' || n.APELLIDO_PATERNO || ' ' || NVL(n.APELLIDO_MATERNO, '')) AS NNA_NOMBRE,
                          d.CREADO_POR_ID
                     FROM DIARIO_CAMPO d
                     LEFT JOIN NNA_CASO c ON c.ID = d.CASO_ID
                     LEFT JOIN NNA n ON n.ID = c.NNA_ID
                     LEFT JOIN SEC_USUARIO u ON u.ID = d.CREADO_POR_ID
                    WHERE c.SEDE_ID = :sede OR u.SEDE_ID = :sede
                    ORDER BY d.FECHA DESC
                    FETCH FIRST 50 ROWS ONLY""",
                {"sede": sede_id},
            )
            recientes = []
            for r in await cur.fetchall():
                obs = r[5]
                lat, lng = r[8], r[9]
                tipo, foto, firma = "CONSEJERIA", None, None
                if obs:
                    try:
                        p = _json.loads(obs)
                        if isinstance(p, dict):
                            tipo = p.get("tipoActividad") or "CONSEJERIA"
                            foto = p.get("foto")
                            firma = p.get("firma")
                    except Exception:
                        pass
                recientes.append({
                    "id": r[0], "casoId": r[1],
                    "fecha": r[2].isoformat() if hasattr(r[2], "isoformat") else str(r[2]),
                    "ubicacion": r[3], "actividad": r[4],
                    "estadoFisico": r[6], "estadoAnimo": r[7],
                    "latitud": float(lat) if lat is not None else None,
                    "longitud": float(lng) if lng is not None else None,
                    "educadorNombre": r[10], "nnaNombre": r[11],
                    "tipoActividad": tipo, "foto": foto, "firma": firma,
                    "creadoPorId": r[12],
                    "observaciones": obs,
                })

    return {
        "totalDiarios": total, "totalHoy": hoy,
        "totalConFirma": con_firma, "totalConFoto": con_foto,
        "porcentajeEvidencia": round(100 * (con_firma + con_foto) / (2 * total)) if total else 0,
        "distribucionTipo": [
            {"tipo": "CONSEJERIA", "cantidad": n_consej},
            {"tipo": "VISITA", "cantidad": n_visita},
            {"tipo": "COORDINACION", "cantidad": n_coord},
            {"tipo": "RECORRIDO", "cantidad": n_recorr},
        ],
        "educadores": educadores,
        "recientes": recientes,
    }


@router.delete("/{entrada_id}", status_code=204)
async def eliminar_entrada(entrada_id: int, repo: OracleDiarioRepository = Depends(get_repository)):
    use_case = DiarioUseCase(repo)
    ok = await use_case.eliminar_diario(entrada_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Entrada de diario no encontrada")

@router.put("/{entrada_id}", response_model=DiarioCampoResponse)
async def actualizar_diario(entrada_id: int, data: DiarioCampoCreate, repo: OracleDiarioRepository = Depends(get_repository)):
    use_case = DiarioUseCase(repo)
    try:
        res = await use_case.actualizar_diario(entrada_id, data)
        if not res:
            raise HTTPException(status_code=404, detail="Entrada de diario no encontrada")
        return res
    except Exception as e:
        import traceback
        with open("D:/Usuarios/ccampos/Documents/Python Scripts/Educadores_calle/educadores-calle-system/diario_error.log", "w", encoding="utf-8") as f:
            f.write(f"Exception: {str(e)}\n")
            traceback.print_exc(file=f)
        raise e


import os
from typing import Optional
from fastapi.responses import FileResponse

def _get_pdf_path(diario_id: int) -> str:
    repositorio_dir = os.getenv("REPOSITORIO_DIARIO_PDFS", "./repositorio_archivos/diarios_campo")
    return os.path.join(repositorio_dir, f"diario_{diario_id}.pdf")

async def _get_nna_and_educador_for_diario(caso_id: int, creado_por_id: int) -> tuple:
    from src.infrastructure.db.connection import get_pool
    pool = get_pool()
    nna_data = {}
    educador_nombre = "Educador Responsable"
    try:
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                # NNA
                await cur.execute(
                    """SELECT n.NOMBRES, n.APELLIDO_PATERNO, n.APELLIDO_MATERNO, n.NUMERO_DOC, n.TIPO_DOC
                       FROM NNA n
                       JOIN NNA_CASO c ON c.NNA_ID = n.ID
                       WHERE c.ID = :1""",
                    [caso_id]
                )
                row = await cur.fetchone()
                if row:
                    nna_data = {
                        "nombres": row[0] or "",
                        "apellidoPaterno": row[1] or "",
                        "apellidoMaterno": row[2] or "",
                        "numeroDoc": row[3] or "",
                        "tipoDoc": row[4] or "",
                    }
                # Educador
                await cur.execute(
                    "SELECT NOMBRE_COMPLETO FROM SEC_USUARIO WHERE ID = :1",
                    [creado_por_id]
                )
                row_edu = await cur.fetchone()
                if row_edu:
                    educador_nombre = row_edu[0] or "Educador Responsable"
    except Exception as e:
        pass
    return nna_data, educador_nombre

@router.get("/{id}/pdf")
async def get_diario_pdf(id: int, repo: OracleDiarioRepository = Depends(get_repository)):
    from src.infrastructure.services.pdf_generator_diario import generate_diario_pdf
    diario = await repo.get_by_id(id)
    if not diario:
        raise HTTPException(status_code=404, detail="Diario de campo no encontrado")

    nna_data, educador_nombre = await _get_nna_and_educador_for_diario(
        diario.get("caso_id") or diario.get("CASO_ID"),
        diario.get("creado_por_id") or diario.get("CREADO_POR_ID")
    )
    filepath = _get_pdf_path(id)
    try:
        generate_diario_pdf(diario, nna_data, educador_nombre, filepath)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando PDF del diario: {str(e)}")

    return FileResponse(
        filepath,
        media_type="application/pdf",
        filename=f"diario_{id}.pdf"
    )

@router.post("/{id}/evidencias")
async def guardar_evidencias(id: int, request: Request):
    """Guarda foto y firma del diario como archivos en disco."""
    import base64
    body = await request.json()
    repositorio_dir = os.getenv("REPOSITORIO_DIARIO_PDFS", "./repositorio_archivos/diarios_campo")
    os.makedirs(repositorio_dir, exist_ok=True)

    saved = []

    foto_b64 = body.get("foto_b64")
    if foto_b64:
        data = foto_b64.split(",", 1)[1] if "," in foto_b64 else foto_b64
        with open(os.path.join(repositorio_dir, f"foto_{id}.jpg"), "wb") as f:
            f.write(base64.b64decode(data))
        saved.append("foto")

    firma_b64 = body.get("firma_b64")
    if firma_b64:
        data = firma_b64.split(",", 1)[1] if "," in firma_b64 else firma_b64
        with open(os.path.join(repositorio_dir, f"firma_{id}.png"), "wb") as f:
            f.write(base64.b64decode(data))
        saved.append("firma")

    return {"saved": saved}


@router.get("/{id}/pdf/pages")
async def get_diario_pdf_pages(id: int, repo: OracleDiarioRepository = Depends(get_repository)):
    from pypdf import PdfReader
    from src.infrastructure.services.pdf_generator_diario import generate_diario_pdf
    diario = await repo.get_by_id(id)
    if not diario:
        raise HTTPException(status_code=404, detail="Diario de campo no encontrado")

    nna_data, educador_nombre = await _get_nna_and_educador_for_diario(
        diario.get("caso_id") or diario.get("CASO_ID"),
        diario.get("creado_por_id") or diario.get("CREADO_POR_ID")
    )
    filepath = _get_pdf_path(id)
    try:
        if not os.path.exists(filepath):
            generate_diario_pdf(diario, nna_data, educador_nombre, filepath)
        reader = PdfReader(filepath)
        return {"pages": len(reader.pages)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al contar páginas del PDF: {str(e)}")


