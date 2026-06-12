import oracledb
from src.infrastructure.db.connection import get_pool
from src.domain.entities.pti import PlanTrabajoCreate
from datetime import datetime
import uuid

class OraclePTIRepository:
    def _row_to_dict(self, row, columns) -> dict:
        d = dict(zip(columns, row))
        # Aliases camelCase para compatibilidad con el frontend
        for src, dst in [("objetivo_general", "objetivoGeneral"), ("codigo_pti", "codigoPti"),
                         ("caso_id", "casoId"), ("plan_trabajo_id", "planTrabajoId"),
                         ("informe_ampliacion", "informeAmpliacion"),
                         ("vigencia_dias", "vigenciaDias"),
                         ("observacion_cierre", "observacionCierre")]:
            if src in d:
                d[dst] = d[src]
        for col in ("fecha_inicio", "fecha_revision", "fecha_cierre", "created_at", "updated_at"):
            if col in d and d[col] is not None:
                val = d[col]
                camel = "".join(w.capitalize() if i else w for i, w in enumerate(col.split("_")))
                d[camel] = val.isoformat() if hasattr(val, "isoformat") else str(val)
        return d

    async def update_accion(self, accion_id: int, data: dict) -> dict | None:
        COLS = {"estado": "ESTADO", "descripcion": "DESCRIPCION",
                "meta": "META", "plazo": "PLAZO", "responsable": "RESPONSABLE",
                "area": "AREA", "objetivo": "OBJETIVO"}
        updates = {k: v for k, v in data.items() if k in COLS}
        if not updates:
            return None
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                set_clause = ", ".join(f"{COLS[k]} = :{k}" for k in updates)
                await cur.execute(
                    f"UPDATE ACCION_PTI SET {set_clause}, UPDATED_AT = SYSDATE WHERE ID = :accion_id",
                    {**updates, "accion_id": accion_id}
                )
                await conn.commit()
                await cur.execute("SELECT * FROM ACCION_PTI WHERE ID = :1", [accion_id])
                row = await cur.fetchone()
                if not row:
                    return None
                columns = [col[0].lower() for col in cur.description]
                return self._row_to_dict(row, columns)

    async def cerrar_pti(self, pti_id: int, observacion: str | None) -> bool:
        """Cierra formalmente el plan (solo si está ACTIVO)."""
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """UPDATE PLAN_TRABAJO
                       SET ESTADO = 'CERRADO', FECHA_CIERRE = SYSTIMESTAMP,
                           OBSERVACION_CIERRE = :1, UPDATED_AT = SYSDATE
                       WHERE ID = :2 AND ESTADO = 'ACTIVO'""",
                    [observacion, pti_id]
                )
                await conn.commit()
                return cur.rowcount > 0

    async def ampliar_vigencia(self, pti_id: int, dias: int) -> bool:
        """Amplía la vigencia del plan (Informe de Ampliación de Fase)."""
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """UPDATE PLAN_TRABAJO
                       SET VIGENCIA_DIAS = NVL(VIGENCIA_DIAS, 90) + :1, UPDATED_AT = SYSDATE
                       WHERE ID = :2 AND ESTADO = 'ACTIVO'""",
                    [dias, pti_id]
                )
                await conn.commit()
                return cur.rowcount > 0

    async def update_informe_ampliacion(self, pti_id: int, informe_json: str) -> bool:
        """Guarda el Informe de Ampliación (JSON) en el plan."""
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "UPDATE PLAN_TRABAJO SET INFORME_AMPLIACION = :1, UPDATED_AT = SYSDATE WHERE ID = :2",
                    [informe_json, pti_id]
                )
                await conn.commit()
                return cur.rowcount > 0

    async def update_pti(self, pti_id: int, objetivo_general: str, acciones: list) -> dict | None:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "UPDATE PLAN_TRABAJO SET OBJETIVO_GENERAL = :1, UPDATED_AT = SYSDATE WHERE ID = :2",
                    [objetivo_general, pti_id]
                )
                if cur.rowcount == 0:
                    return None
                await cur.execute("DELETE FROM ACCION_PTI WHERE PLAN_TRABAJO_ID = :1", [pti_id])
                if acciones:
                    sql_accion = """
                        INSERT INTO ACCION_PTI (PLAN_TRABAJO_ID, AREA, OBJETIVO, DESCRIPCION, META, PLAZO, RESPONSABLE, ESTADO)
                        VALUES (:1, :2, :3, :4, :5, :6, :7, :8)
                    """
                    await cur.executemany(sql_accion, [
                        (pti_id, a.get("area", "OTROS"), a.get("objetivo"),
                         a.get("descripcion") or " ", a.get("meta"), a.get("plazo"),
                         a.get("responsable"), a.get("estado", "PENDIENTE"))
                        for a in acciones
                    ])
                await conn.commit()
        pool2 = get_pool()
        async with pool2.acquire() as conn2:
            async with conn2.cursor() as cur2:
                await cur2.execute("SELECT * FROM PLAN_TRABAJO WHERE ID = :1", [pti_id])
                row = await cur2.fetchone()
                if not row:
                    return None
                columns = [col[0].lower() for col in cur2.description]
                pti = self._row_to_dict(row, columns)
                await cur2.execute("SELECT * FROM ACCION_PTI WHERE PLAN_TRABAJO_ID = :1 ORDER BY CREATED_AT ASC", [pti_id])
                acc_columns = [col[0].lower() for col in cur2.description]
                pti["acciones"] = [self._row_to_dict(r, acc_columns) for r in await cur2.fetchall()]
                return pti

    async def create_pti(self, caso_id: int, data: PlanTrabajoCreate) -> dict:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                # Resolve active case's sede_id
                await cur.execute("SELECT SEDE_ID FROM NNA_CASO WHERE ID = :1", [caso_id])
                row = await cur.fetchone()
                sede_id = row[0] if row else None
                if not sede_id:
                    raise ValueError("El caso no tiene sede asignada. No se puede generar el código PII.")

                # Resolve Sede initials
                await cur.execute("SELECT NOMBRE FROM SEC_SEDE WHERE ID = :1", [sede_id])
                row = await cur.fetchone()
                if not row or not row[0]:
                    raise ValueError(f"No se encontró la sede con ID {sede_id} en la base de datos.")
                nombre = row[0]
                nom = nombre.upper().strip()
                mapping = {
                    "LIMA": "LIM", "SEDE CENTRAL LIMA": "LIM",
                    "HUARAL": "HUA", "HUANCAYO": "HYO", "JUNÍN": "HYO", "JUNIN": "HYO",
                    "AREQUIPA": "ARE", "LA LIBERTAD": "TRU", "TRUJILLO": "TRU",
                    "LAMBAYEQUE": "CHI", "CHICLAYO": "CHI", "CAJAMARCA": "CAJ",
                    "JAÉN": "JAE", "JAEN": "JAE", "PIURA": "PIU", "TUMBES": "TUM",
                    "CUSCO": "CUS", "PUNO": "PUN", "TACNA": "TAC", "ICA": "ICA",
                    "AYACUCHO": "AYA", "APURÍMAC": "APU", "APURIMAC": "APU",
                    "HUÁNUCO": "HCO", "HUANUCO": "HCO", "ANCASH": "ANC",
                    "LORETO": "IQU", "IQUITOS": "IQU", "UCAYALI": "PUC", "PUCALLPA": "PUC",
                    "HUANCAVELICA": "HVC", "MOQUEGUA": "MOQ", "PASCO": "PAS",
                    "CALLAO": "CAL", "TARAPOTO": "TAR", "CHACHAPOYAS": "CHA"
                }
                sede_codigo = mapping.get(nom, nom[:3])

                # Count existing PTIs for this Sede to get the next number
                anio = datetime.now().year
                patron = f"PII-{sede_codigo}-{anio}-%"
                try:
                    await cur.execute(
                        "SELECT COUNT(*) FROM PLAN_TRABAJO p "
                        "JOIN NNA_CASO c ON c.ID = p.CASO_ID "
                        "WHERE p.CODIGO_PTI LIKE :patron",
                        {"patron": patron}
                    )
                    row = await cur.fetchone()
                    num = (row[0] or 0) + 1
                except Exception as e:
                    print(f"Error counting PTI records: {e}")
                    num = 1

                codigo_pti = f"PII-{sede_codigo}-{anio}-{num:04d}"
                # 1. Crear PTI
                sql_pti = """
                    INSERT INTO PLAN_TRABAJO (CODIGO_PTI, CASO_ID, OBJETIVO_GENERAL)
                    VALUES (:1, :2, :3)
                    RETURNING ID, FECHA_INICIO, ESTADO, CREATED_AT, UPDATED_AT INTO :4, :5, :6, :7, :8
                """
                id_var = cur.var(int)
                fecha_var = cur.var(oracledb.DB_TYPE_TIMESTAMP)
                estado_var = cur.var(str)
                created_var = cur.var(oracledb.DB_TYPE_TIMESTAMP)
                updated_var = cur.var(oracledb.DB_TYPE_TIMESTAMP)

                await cur.execute(sql_pti, [
                    codigo_pti, caso_id, data.objetivo_general,
                    id_var, fecha_var, estado_var, created_var, updated_var
                ])
                
                plan_id = id_var.getvalue()[0]

                # 2. Crear Acciones
                if data.acciones:
                    sql_accion = """
                        INSERT INTO ACCION_PTI (PLAN_TRABAJO_ID, AREA, OBJETIVO, DESCRIPCION, META, PLAZO, RESPONSABLE)
                        VALUES (:1, :2, :3, :4, :5, :6, :7)
                    """
                    acciones_data = [
                        (plan_id, acc.area or "OTROS", acc.objetivo,
                         acc.descripcion or " ", acc.meta, acc.plazo, acc.responsable)
                        for acc in data.acciones
                    ]
                    await cur.executemany(sql_accion, acciones_data)

                await conn.commit()
                return await self.get_last_pti(caso_id)

    async def get_all_ptis(self, caso_id: int) -> list:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT * FROM PLAN_TRABAJO WHERE CASO_ID = :1 ORDER BY CREATED_AT DESC", [caso_id])
                rows = await cur.fetchall()
                if not rows:
                    return []
                columns = [col[0].lower() for col in cur.description]
                plans = []
                for row in rows:
                    pti = self._row_to_dict(row, columns)
                    await cur.execute("SELECT * FROM ACCION_PTI WHERE PLAN_TRABAJO_ID = :1 ORDER BY CREATED_AT ASC", [pti["id"]])
                    acc_columns = [col[0].lower() for col in cur.description]
                    pti["acciones"] = [self._row_to_dict(r, acc_columns) for r in await cur.fetchall()]
                    plans.append(pti)
                return plans

    async def get_last_pti(self, caso_id: int) -> dict:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT * FROM PLAN_TRABAJO WHERE CASO_ID = :1 ORDER BY CREATED_AT DESC FETCH FIRST 1 ROWS ONLY", [caso_id])
                row = await cur.fetchone()
                if not row:
                    return None

                columns = [col[0].lower() for col in cur.description]
                pti = self._row_to_dict(row, columns)

                await cur.execute("SELECT * FROM ACCION_PTI WHERE PLAN_TRABAJO_ID = :1 ORDER BY CREATED_AT ASC", [pti["id"]])
                acc_columns = [col[0].lower() for col in cur.description]
                pti["acciones"] = [self._row_to_dict(r, acc_columns) for r in await cur.fetchall()]

                return pti
