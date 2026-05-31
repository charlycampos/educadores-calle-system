"""
Repositorio Oracle para Caso, HistorialEstado y Traslado — raw SQL.
"""
from typing import Optional
from datetime import datetime

from src.domain.entities.caso import Caso
from src.domain.entities.traslado import Traslado
from src.infrastructure.db.connection import get_pool

_SELECT_CASO = """
    SELECT
        c.ID,                       -- 0
        c.CODIGO_CASO,              -- 1
        c.NNA_ID,                   -- 2
        c.SEDE_ID,                  -- 3
        c.RESPONSABLE_ID,           -- 4
        c.PERFIL,                   -- 5
        c.ESTADO,                   -- 6
        c.ZONA_INTERVENCION,        -- 7
        c.DISTRITO_INTERVENCION,    -- 8
        c.ACTIVIDAD_REALIZADA,      -- 9
        c.TIEMPO_EN_CALLE,          -- 10
        c.CONDICION,                -- 11
        c.NIVEL_RIESGO,             -- 12
        c.SITUACION_CALLE,          -- 13
        c.HORARIO_INICIO,           -- 14
        c.HORARIO_FIN,              -- 15
        c.HORARIO_INICIO2,          -- 16
        c.HORARIO_FIN2,             -- 17
        c.DIAS_TRABAJO,             -- 18
        c.FECHA_APERTURA,           -- 19
        c.FECHA_CIERRE,             -- 20
        c.FECHA_ABORDAJE,           -- 21
        c.FECHA_INGRESO,            -- 22
        c.FECHA_REINGRESO,          -- 23
        n.NOMBRES || ' ' || n.APELLIDO_PATERNO AS NNA_NOMBRE,  -- 24
        n.APELLIDO_MATERNO AS NNA_APELLIDO_M,                  -- 25
        c.FASE,                                                -- 26
        u.NOMBRE_COMPLETO AS RESP_NOMBRE,                      -- 27
        c.VICTIMA_EXPLOTACION                                  -- 28
    FROM NNA_CASO c
    JOIN NNA n ON n.ID = c.NNA_ID
    LEFT JOIN SEC_USUARIO u ON u.ID = c.RESPONSABLE_ID
"""


def _row_to_caso(row) -> Caso:
    return Caso(
        id=row[0], codigo_caso=row[1], nna_id=row[2], sede_id=row[3],
        responsable_id=row[4], perfil=row[5], estado=row[6],
        zona_intervencion=row[7], distrito_intervencion=row[8],
        actividad_realizada=row[9], tiempo_en_calle=row[10], condicion=row[11],
        nivel_riesgo=row[12], situacion_calle=row[13],
        horario_inicio=row[14], horario_fin=row[15],
        horario_inicio2=row[16], horario_fin2=row[17],
        dias_trabajo=row[18],
        fecha_apertura=row[19], fecha_cierre=row[20],
        fecha_abordaje=row[21], fecha_ingreso=row[22],
        fecha_reingreso=row[23],
        nna_nombres=row[24], nna_apellidos=row[25],
        fase=row[26],
        responsable_nombre=row[27],
        victima_explotacion=row[28] if len(row) > 28 else "NO",
    )


class OracleCasoRepository:

    async def find_by_id(self, caso_id: int) -> Optional[Caso]:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(f"{_SELECT_CASO} WHERE c.ID = :id", {"id": caso_id})
                row = await cur.fetchone()
                return _row_to_caso(row) if row else None

    async def list_by_sede(self, sede_id: int, solo_activos: bool = True) -> list[Caso]:
        pool = get_pool()
        where = "WHERE c.SEDE_ID = :sede_id"
        if solo_activos:
            where += " AND c.ESTADO != 'CERRADO'"
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    f"{_SELECT_CASO} {where} ORDER BY c.FECHA_APERTURA DESC",
                    {"sede_id": sede_id},
                )
                return [_row_to_caso(r) for r in await cur.fetchall()]

    async def list_all(self, solo_activos: bool = True) -> list[Caso]:
        pool = get_pool()
        where = ""
        if solo_activos:
            where = "WHERE c.ESTADO != 'CERRADO'"
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    f"{_SELECT_CASO} {where} ORDER BY c.FECHA_APERTURA DESC"
                )
                return [_row_to_caso(r) for r in await cur.fetchall()]

    async def list_by_responsable(self, responsable_id: int, solo_activos: bool = True) -> list[Caso]:
        pool = get_pool()
        where = "WHERE c.RESPONSABLE_ID = :resp_id"
        if solo_activos:
            where += " AND c.ESTADO != 'CERRADO'"
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    f"{_SELECT_CASO} {where} ORDER BY c.FECHA_APERTURA DESC",
                    {"resp_id": responsable_id},
                )
                return [_row_to_caso(r) for r in await cur.fetchall()]

    async def get_next_codigo_caso(self) -> str:
        anio = datetime.now().year
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "SELECT NVL(MAX(ID), 0) + 1 FROM NNA_CASO WHERE EXTRACT(YEAR FROM FECHA_APERTURA) = :anio",
                    {"anio": anio},
                )
                row = await cur.fetchone()
                return f"CAS-{anio}-{row[0]:05d}"

    async def find_by_nna_id(self, nna_id: int) -> list[Caso]:
        """Devuelve todos los casos de un NNA ordenados del más reciente al más antiguo."""
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    f"{_SELECT_CASO} WHERE c.NNA_ID = :nna_id ORDER BY c.ID DESC",
                    {"nna_id": nna_id},
                )
                rows = await cur.fetchall()
                return [_row_to_caso(r) for r in rows]

    async def create(self, nna_id: int, codigo_caso: str, caso_input) -> Caso:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                out_id = cur.var(int)
                params = {
                    "codigo":          codigo_caso,
                    "nna_id":          nna_id,
                    "sede_id":         caso_input.sede_id,
                    "resp_id":         caso_input.responsable_id,
                    "perfil":          caso_input.perfil,
                    "zona":            caso_input.zona_intervencion,
                    "distrito":        caso_input.distrito_intervencion,
                    "situacion_calle": caso_input.situacion_calle,
                    "actividad":       caso_input.actividad_realizada,
                    "tiempo":          caso_input.tiempo_en_calle,
                    "condicion":       caso_input.condicion,
                    "horario_inicio":  caso_input.horario_inicio,
                    "horario_fin":     caso_input.horario_fin,
                    "horario_inicio2": caso_input.horario_inicio2,
                    "horario_fin2":    caso_input.horario_fin2,
                    "dias_trabajo":    caso_input.dias_trabajo,
                    "abordaje":        caso_input.fecha_abordaje,
                    "fecha_ingreso":   caso_input.fecha_ingreso,
                    "fecha_reingreso": caso_input.fecha_reingreso,
                    "fecha_cambio_p":  caso_input.fecha_cambio_perfil,
                    "victima_explotacion": caso_input.victima_explotacion or "NO",
                    "out_id":          out_id,
                }
                print("=" * 60)
                print(f"[NNA_CASO INSERT] nna_id={nna_id} | codigo={codigo_caso}")
                print(f"[NNA_CASO INSERT] perfil={caso_input.perfil} | situacion_calle={caso_input.situacion_calle}")
                print(f"[NNA_CASO INSERT] sede_id={caso_input.sede_id} | responsable_id={caso_input.responsable_id}")
                print(f"[NNA_CASO INSERT] fecha_ingreso={caso_input.fecha_ingreso} | horario_inicio={caso_input.horario_inicio}")
                print("=" * 60)
                try:
                    await cur.execute(
                        """INSERT INTO NNA_CASO (
                            CODIGO_CASO, NNA_ID, SEDE_ID, RESPONSABLE_ID,
                            PERFIL, ESTADO, FASE,
                            ZONA_INTERVENCION, DISTRITO_INTERVENCION,
                            SITUACION_CALLE,
                            ACTIVIDAD_REALIZADA, TIEMPO_EN_CALLE, CONDICION,
                            HORARIO_INICIO, HORARIO_FIN, HORARIO_INICIO2, HORARIO_FIN2,
                            DIAS_TRABAJO,
                            FECHA_ABORDAJE, FECHA_INGRESO, FECHA_REINGRESO, FECHA_CAMBIO_PERFIL,
                            VICTIMA_EXPLOTACION
                        ) VALUES (
                            :codigo, :nna_id, :sede_id, :resp_id,
                            :perfil, 'EN_EVALUACION', 'CONTACTO_INICIAL',
                            :zona, :distrito,
                            :situacion_calle,
                            :actividad, :tiempo, :condicion,
                            :horario_inicio, :horario_fin, :horario_inicio2, :horario_fin2,
                            :dias_trabajo,
                            :abordaje, :fecha_ingreso, :fecha_reingreso, :fecha_cambio_p,
                            :victima_explotacion
                        ) RETURNING ID INTO :out_id""",

                        params,
                    )
                    await conn.commit()
                    new_id = out_id.getvalue()[0]
                    print(f"[NNA_CASO INSERT] OK - nuevo ID={new_id}")
                    print("=" * 60)
                except Exception as e:
                    print("=" * 60)
                    print(f"[NNA_CASO INSERT] ERROR ORACLE: {e}")
                    print("=" * 60)
                    raise
        return await self.find_by_id(new_id)

    async def update_estado(self, caso_id: int, nuevo_estado: str) -> None:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                extra = ", FECHA_CIERRE = SYSTIMESTAMP" if nuevo_estado == "CERRADO" else ""
                await cur.execute(
                    f"UPDATE NNA_CASO SET ESTADO = :estado{extra}, UPDATED_AT = SYSTIMESTAMP WHERE ID = :id",
                    {"estado": nuevo_estado, "id": caso_id},
                )
                await conn.commit()

    async def update_responsable(self, caso_id: int, nuevo_responsable_id: int) -> None:
        """Reasigna el caso a otro profesional (derivación interna)."""
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "UPDATE NNA_CASO SET RESPONSABLE_ID = :resp, UPDATED_AT = SYSTIMESTAMP WHERE ID = :id",
                    {"resp": nuevo_responsable_id, "id": caso_id},
                )
                await conn.commit()

    async def update_sede(self, caso_id: int, nueva_sede_id: int) -> None:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "UPDATE NNA_CASO SET SEDE_ID = :sede, UPDATED_AT = SYSTIMESTAMP WHERE ID = :id",
                    {"sede": nueva_sede_id, "id": caso_id},
                )
                await conn.commit()

    async def update_by_nna_id(self, nna_id: int, data: dict) -> None:
        """Actualiza campos del caso más reciente vinculado a un NNA."""
        if not data:
            return
        sets = ", ".join(f"{k} = :{k}" for k in data)
        data["nna_id"] = nna_id
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    f"""UPDATE NNA_CASO SET {sets}, UPDATED_AT = SYSTIMESTAMP
                        WHERE NNA_ID = :nna_id
                          AND ID = (SELECT MAX(ID) FROM NNA_CASO WHERE NNA_ID = :nna_id)""",
                    data,
                )
                await conn.commit()

    async def update_caso_by_carpeta(
        self, carpeta_id: int, sede_id: int, data: dict
    ) -> None:
        """
        Actualiza el caso activo (no CERRADO) de todos los NNA en una carpeta.
        Mapea claves camelCase o snake_case del payload a columnas Oracle.
        """
        if not data:
            return

        # Mapa de nombre de campo Python/JSON → columna Oracle
        CAMPO_A_COLUMNA = {
            "perfil":              "PERFIL",
            "zona_intervencion":   "ZONA_INTERVENCION",
            "distrito_intervencion": "DISTRITO_INTERVENCION",
            "situacion_calle":     "SITUACION_CALLE",
            "actividad_realizada": "ACTIVIDAD_REALIZADA",
            "tiempo_en_calle":     "TIEMPO_EN_CALLE",
            "condicion":           "CONDICION",
            "horario_inicio":      "HORARIO_INICIO",
            "horario_fin":         "HORARIO_FIN",
            "horario_inicio2":     "HORARIO_INICIO2",
            "horario_fin2":        "HORARIO_FIN2",
            "dias_trabajo":        "DIAS_TRABAJO",
            "fecha_abordaje":      "FECHA_ABORDAJE",
            "fecha_ingreso":       "FECHA_INGRESO",
            "fecha_reingreso":     "FECHA_REINGRESO",
            "fecha_cambio_perfil": "FECHA_CAMBIO_PERFIL",
            "victima_explotacion": "VICTIMA_EXPLOTACION",
        }

        bind = {}
        set_clauses = []
        for campo, valor in data.items():
            col = CAMPO_A_COLUMNA.get(campo)
            if col and valor is not None:
                bind_key = f"p_{campo}"
                set_clauses.append(f"{col} = :{bind_key}")
                bind[bind_key] = valor

        if not set_clauses:
            return

        bind["carpeta_id"] = carpeta_id
        sets_sql = ", ".join(set_clauses)

        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    f"""UPDATE NNA_CASO
                        SET {sets_sql}, UPDATED_AT = SYSTIMESTAMP
                        WHERE ESTADO != 'CERRADO'
                          AND NNA_ID IN (
                              SELECT ID FROM NNA WHERE CARPETA_ID = :carpeta_id
                          )""",
                    bind,
                )
                await conn.commit()


class OracleHistorialRepository:

    async def create(self, caso_id, estado_anterior, estado_nuevo, usuario_id, motivo, tipo_cambio) -> None:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """INSERT INTO NNA_HISTORIAL_ESTADO
                       (CASO_ID, ESTADO_ANTERIOR, ESTADO_NUEVO, USUARIO_ID, MOTIVO, TIPO_CAMBIO)
                       VALUES (:caso, :ant, :nuevo, :usr, :motivo, :tipo)""",
                    {
                        "caso":   caso_id,
                        "ant":    estado_anterior,
                        "nuevo":  estado_nuevo,
                        "usr":    usuario_id,
                        "motivo": motivo,
                        "tipo":   tipo_cambio,
                    },
                )
                await conn.commit()

    async def list_by_caso(self, caso_id: int) -> list[dict]:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """SELECT h.ID, h.ESTADO_ANTERIOR, h.ESTADO_NUEVO, h.USUARIO_ID,
                              h.FECHA_CAMBIO, h.MOTIVO, h.TIPO_CAMBIO,
                              u.NOMBRE_COMPLETO AS USUARIO_NOMBRE
                       FROM NNA_HISTORIAL_ESTADO h
                       LEFT JOIN SEC_USUARIO u ON u.ID = h.USUARIO_ID
                       WHERE h.CASO_ID = :caso ORDER BY h.FECHA_CAMBIO DESC""",
                    {"caso": caso_id},
                )
                rows = await cur.fetchall()
                return [
                    {
                        "id": r[0], "estado_anterior": r[1], "estado_nuevo": r[2],
                        "usuario_id": r[3], "fecha_cambio": str(r[4]),
                        "motivo": r[5], "tipo_cambio": r[6],
                        "usuario_nombre": r[7],
                    }
                    for r in rows
                ]


class OracleTrasladoRepository:

    async def find_by_id(self, traslado_id: int) -> Optional[Traslado]:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """SELECT ID, CASO_ID, NNA_ID, TIPO, SEDE_ORIGEN_ID, SEDE_DESTINO_ID,
                              COORDINADOR_ORIGEN_ID, COORDINADOR_DEST_ID, MOTIVO, ESTADO,
                              FECHA_SOLICITUD, FECHA_RESPUESTA, OBSERVACIONES
                       FROM NNA_TRASLADO WHERE ID = :id""",
                    {"id": traslado_id},
                )
                row = await cur.fetchone()
                if not row:
                    return None
                return Traslado(
                    id=row[0], caso_id=row[1], nna_id=row[2], tipo=row[3],
                    sede_origen_id=row[4], sede_destino_id=row[5],
                    coordinador_origen_id=row[6], coordinador_dest_id=row[7],
                    motivo=row[8], estado=row[9],
                    fecha_solicitud=row[10], fecha_respuesta=row[11],
                    observaciones=row[12],
                )

    async def create(self, caso_id, nna_id, tipo, sede_origen_id, sede_destino_id, coordinador_origen_id, motivo) -> Traslado:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                out_id = cur.var(int)
                await cur.execute(
                    """INSERT INTO NNA_TRASLADO
                       (CASO_ID, NNA_ID, TIPO, SEDE_ORIGEN_ID, SEDE_DESTINO_ID,
                        COORDINADOR_ORIGEN_ID, MOTIVO)
                       VALUES (:caso, :nna, :tipo, :origen, :destino, :coord, :motivo)
                       RETURNING ID INTO :out_id""",
                    {
                        "caso": caso_id, "nna": nna_id, "tipo": tipo,
                        "origen": sede_origen_id, "destino": sede_destino_id,
                        "coord": coordinador_origen_id, "motivo": motivo,
                        "out_id": out_id,
                    },
                )
                await conn.commit()
                new_id = out_id.getvalue()[0]
        return await self.find_by_id(new_id)

    async def update_estado(self, traslado_id, estado, coordinador_dest_id, observaciones) -> None:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """UPDATE NNA_TRASLADO
                       SET ESTADO = :estado, COORDINADOR_DEST_ID = :coord,
                           OBSERVACIONES = :obs, FECHA_RESPUESTA = SYSTIMESTAMP
                       WHERE ID = :id""",
                    {"estado": estado, "coord": coordinador_dest_id,
                     "obs": observaciones, "id": traslado_id},
                )
                await conn.commit()

    async def list_pendientes_por_sede(self, sede_id: int) -> list[dict]:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """SELECT t.ID, t.CASO_ID, t.NNA_ID, t.TIPO, t.SEDE_ORIGEN_ID, t.SEDE_DESTINO_ID,
                              t.MOTIVO, t.ESTADO, t.FECHA_SOLICITUD,
                              n.NOMBRES || ' ' || n.APELLIDO_PATERNO AS NNA_NOMBRE,
                              n.EDAD
                       FROM NNA_TRASLADO t
                       JOIN NNA n ON n.ID = t.NNA_ID
                       WHERE t.SEDE_DESTINO_ID = :sede AND t.ESTADO = 'PENDIENTE'
                       ORDER BY t.FECHA_SOLICITUD DESC""",
                    {"sede": sede_id},
                )
                rows = await cur.fetchall()
                return [
                    {"id": r[0], "caso_id": r[1], "nna_id": r[2], "tipo": r[3],
                     "sede_origen_id": r[4], "sede_destino_id": r[5], "motivo": r[6], "estado": r[7],
                     "fecha_solicitud": str(r[8]), "nnaNombre": r[9], "edad": r[10]}
                    for r in rows
                ]

    async def list_all_pendientes(self) -> list[dict]:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """SELECT t.ID, t.CASO_ID, t.NNA_ID, t.TIPO, t.SEDE_ORIGEN_ID, t.SEDE_DESTINO_ID,
                              t.MOTIVO, t.ESTADO, t.FECHA_SOLICITUD,
                              n.NOMBRES || ' ' || n.APELLIDO_PATERNO AS NNA_NOMBRE,
                              n.EDAD
                       FROM NNA_TRASLADO t
                       JOIN NNA n ON n.ID = t.NNA_ID
                       WHERE t.ESTADO = 'PENDIENTE'
                       ORDER BY t.FECHA_SOLICITUD DESC"""
                )
                rows = await cur.fetchall()
                return [
                    {"id": r[0], "caso_id": r[1], "nna_id": r[2], "tipo": r[3],
                     "sede_origen_id": r[4], "sede_destino_id": r[5], "motivo": r[6], "estado": r[7],
                     "fecha_solicitud": str(r[8]), "nnaNombre": r[9], "edad": r[10]}
                    for r in rows
                ]
