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
                     JOIN NNA_CASO c ON c.ID = d.CASO_ID
                    WHERE c.SEDE_ID = :sede""",
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
                          d.ESTADO_FISICO, d.ESTADO_ANIMO,
                          u.NOMBRE_COMPLETO AS EDUCADOR_NOMBRE,
                          TRIM(n.NOMBRES || ' ' || n.APELLIDO_PATERNO || ' ' || NVL(n.APELLIDO_MATERNO, '')) AS NNA_NOMBRE
                     FROM DIARIO_CAMPO d
                     JOIN NNA_CASO c ON c.ID = d.CASO_ID
                     JOIN NNA n ON n.ID = c.NNA_ID
                     LEFT JOIN SEC_USUARIO u ON u.ID = d.CREADO_POR_ID
                    WHERE c.SEDE_ID = :sede
                    ORDER BY d.FECHA DESC
                    FETCH FIRST 50 ROWS ONLY""",
                {"sede": sede_id},
            )
            recientes = []
            for r in await cur.fetchall():
                obs = r[5]
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
                    "educadorNombre": r[8], "nnaNombre": r[9],
                    "tipoActividad": tipo, "foto": foto, "firma": firma,
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
