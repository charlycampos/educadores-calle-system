import inspect
from typing import Optional
from datetime import datetime
from src.domain.entities.informe_situacional import InformeSituacional
from src.infrastructure.db.connection import get_pool

# Columnas de la migración 006. Mientras no se ejecute, el servicio tiene que
# seguir funcionando con el esquema viejo: desplegar código que exige columnas
# nuevas tumba el módulo entero para todos.
_SELECT_BASE = """
    SELECT ID, CASO_ID, FECHA_INFORME, DESTINATARIO, ASUNTO, ANTECEDENTES, ESTRATEGIAS,
           SITUACION_SALUD, SITUACION_EDUCATIVA, SITUACION_FAMILIAR,
           CONCLUSIONES, RECOMENDACIONES, CREADO_POR_ID, CREATED_AT, ESTADO, UPDATED_AT,
           CODIGO_INFORME
"""

_SELECT_V2 = _SELECT_BASE + """,
           INDICADORES_VULNERAB, PII_FASE1, PII_FASE2, PII_FASE3, CORRELATIVO, ANIO
    FROM EXP_INFORME_SITUACIONAL
"""

_SELECT_LEGACY = _SELECT_BASE + """
    FROM EXP_INFORME_SITUACIONAL
"""

# Solo se cachea el resultado positivo: si la migración corre con el servicio
# arriba, un False cacheado obligaría a reiniciar para que se entere.
_v2 = False


async def migracion_006_aplicada() -> bool:
    global _v2
    if _v2:
        return True
    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """SELECT COUNT(*) FROM ALL_TAB_COLUMNS
                    WHERE TABLE_NAME = 'EXP_INFORME_SITUACIONAL'
                      AND COLUMN_NAME = 'INDICADORES_VULNERAB'"""
            )
            row = await cur.fetchone()
    if row and row[0]:
        _v2 = True
    return _v2


async def _row_to_informe(row) -> InformeSituacional:
    # CLOB reading helper
    async def read_clob(val):
        if val is None:
            return None
        if hasattr(val, "read"):
            res = val.read()
            if inspect.isawaitable(res):
                return await res
            return res
        return val

    return InformeSituacional(
        id=row[0],
        caso_id=row[1],
        fecha_informe=row[2],
        destinatario=row[3],
        asunto=row[4],
        antecedentes=await read_clob(row[5]),
        estrategias=await read_clob(row[6]),
        situacion_salud=await read_clob(row[7]),
        situacion_educativa=await read_clob(row[8]),
        situacion_familiar=await read_clob(row[9]),
        conclusiones=await read_clob(row[10]),
        recomendaciones=await read_clob(row[11]),
        creado_por_id=row[12],
        created_at=row[13],
        estado=row[14] or 'BORRADOR',
        updated_at=row[15],
        codigo_informe=row[16] if len(row) > 16 else None,
        indicadores_vulnerab=await read_clob(row[17]) if len(row) > 17 else None,
        pii_fase1=await read_clob(row[18]) if len(row) > 18 else None,
        pii_fase2=await read_clob(row[19]) if len(row) > 19 else None,
        pii_fase3=await read_clob(row[20]) if len(row) > 20 else None,
        correlativo=row[21] if len(row) > 21 else None,
        anio=row[22] if len(row) > 22 else None,
    )


class OracleInformeSituacionalRepository:

    async def find_by_caso(self, caso_id: int) -> Optional[InformeSituacional]:
        """El informe mas reciente del caso.

        Desde la migracion 006 un caso puede tener varios informes (se rehace a
        lo largo del proceso). Se conserva este metodo devolviendo el ultimo
        para no romper a quien ya lo llamaba.
        """
        v2 = await migracion_006_aplicada()
        select = _SELECT_V2 if v2 else _SELECT_LEGACY
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    f"{select} WHERE CASO_ID = :caso ORDER BY ID DESC FETCH FIRST 1 ROW ONLY",
                    {"caso": caso_id},
                )
                row = await cur.fetchone()
                if not row:
                    return None
                inf = await _row_to_informe(row)
                inf.nna_ids = await self.get_nna_ids(inf.id)
                return inf

    async def find_by_id(self, informe_id: int) -> Optional[InformeSituacional]:
        v2 = await migracion_006_aplicada()
        select = _SELECT_V2 if v2 else _SELECT_LEGACY
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(f"{select} WHERE ID = :id", {"id": informe_id})
                row = await cur.fetchone()
                if not row:
                    return None
                inf = await _row_to_informe(row)
                inf.nna_ids = await self.get_nna_ids(inf.id)
                return inf

    async def list_by_caso(self, caso_id: int) -> list:
        v2 = await migracion_006_aplicada()
        select = _SELECT_V2 if v2 else _SELECT_LEGACY
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    f"{select} WHERE CASO_ID = :caso ORDER BY ID DESC", {"caso": caso_id}
                )
                rows = await cur.fetchall()
        informes = []
        for row in rows:
            inf = await _row_to_informe(row)
            inf.nna_ids = await self.get_nna_ids(inf.id)
            informes.append(inf)
        return informes

    async def get_nna_ids(self, informe_id: int) -> list:
        if not await migracion_006_aplicada():
            return []
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "SELECT NNA_ID FROM EXP_INFORME_NNA WHERE INFORME_ID = :id ORDER BY ORDEN, ID",
                    {"id": informe_id},
                )
                return [r[0] for r in (await cur.fetchall() or [])]

    async def get_sede_codigo(self, sede_id: int) -> str:
        if not sede_id:
            raise ValueError("La cuenta no tiene sede asignada. No se puede generar el código del informe.")
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT NOMBRE FROM SEC_SEDE WHERE ID = :sede_id", {"sede_id": sede_id})
                row = await cur.fetchone()
                if not row:
                    raise ValueError(f"No se encontró la sede con ID {sede_id} en la base de datos.")
                nombre = row[0]
                nom = nombre.upper().strip()
                mapping = {
                    "LIMA": "LIM",
                    "SEDE CENTRAL LIMA": "LIM",
                    "HUARAL": "HUA",
                    "HUANCAYO": "HYO",
                    "JUNÍN": "HYO",
                    "JUNIN": "HYO",
                    "AREQUIPA": "ARE",
                    "LA LIBERTAD": "TRU",
                    "TRUJILLO": "TRU",
                    "LAMBAYEQUE": "CHI",
                    "CHICLAYO": "CHI",
                    "CAJAMARCA": "CAJ",
                    "JAÉN": "JAE",
                    "JAEN": "JAE",
                    "PIURA": "PIU",
                    "TUMBES": "TUM",
                    "CUSCO": "CUS",
                    "PUNO": "PUN",
                    "TACNA": "TAC",
                    "ICA": "ICA",
                    "AYACUCHO": "AYA",
                    "APURÍMAC": "APU",
                    "APURIMAC": "APU",
                    "HUÁNUCO": "HCO",
                    "HUANUCO": "HCO",
                    "ANCASH": "ANC",
                    "LORETO": "IQU",
                    "IQUITOS": "IQU",
                    "UCAYALI": "PUC",
                    "PUCALLPA": "PUC",
                    "HUANCAVELICA": "HVC",
                    "MOQUEGUA": "MOQ",
                    "PASCO": "PAS",
                    "CALLAO": "CAL",
                    "TARAPOTO": "TAR",
                    "CHACHAPOYAS": "CHA"
                }
                return mapping.get(nom, nom[:3])

    async def get_next_correlativo(self, anio: int, educador_id: int) -> int:
        """Correlativo por educador y año.

        "Nosotros lo hacemos manual. Si es el primer usuario, uno. Si es el
        segundo, dos. Cada uno maneja su numeración" (Luis). Antes se contaba
        por sede, que daba un número distinto al que el educador escribe a mano.

        Se toma el máximo y no el conteo: si se borra un informe, el siguiente
        no debe reutilizar un número ya usado en un documento enviado.
        """
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                if await migracion_006_aplicada():
                    await cur.execute(
                        "SELECT NVL(MAX(CORRELATIVO), 0) FROM EXP_INFORME_SITUACIONAL "
                        "WHERE ANIO = :anio AND CREADO_POR_ID = :educador",
                        {"anio": anio, "educador": educador_id},
                    )
                else:
                    # Sin la columna CORRELATIVO se cuenta por año de creación.
                    await cur.execute(
                        "SELECT COUNT(*) FROM EXP_INFORME_SITUACIONAL "
                        "WHERE EXTRACT(YEAR FROM CREATED_AT) = :anio AND CREADO_POR_ID = :educador",
                        {"anio": anio, "educador": educador_id},
                    )
                row = await cur.fetchone()
                return (row[0] or 0) + 1

    async def get_iniciales(self, usuario_id: int) -> str:
        """MCAG, de "María del Carmen Apestigue García".

        Se descartan las partículas ("del", "de", "la") porque no aparecen en
        las siglas del modelo. Si no se puede resolver, se devuelve vacío y el
        número sale sin la barra final en vez de con una sigla inventada.
        """
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "SELECT NOMBRE_COMPLETO FROM SEC_USUARIO WHERE ID = :id", {"id": usuario_id}
                )
                row = await cur.fetchone()
        if not row or not row[0]:
            return ""
        particulas = {"DE", "DEL", "LA", "LAS", "LOS", "Y"}
        palabras = [w for w in str(row[0]).upper().split() if w not in particulas]
        return "".join(w[0] for w in palabras if w)[:5]

    async def _armar_numero(self, cur, caso_id: int, educador_id: int):
        """Número del informe con el formato del modelo oficial:
        N°005-2025-INABIF-IQU/MCAG
        """
        await cur.execute("SELECT SEDE_ID FROM NNA_CASO WHERE ID = :caso", {"caso": caso_id})
        sede_row = await cur.fetchone()
        sede_id = sede_row[0] if sede_row else None
        sede_codigo = await self.get_sede_codigo(sede_id)
        anio = datetime.now().year
        correlativo = await self.get_next_correlativo(anio, educador_id)
        iniciales = await self.get_iniciales(educador_id)
        numero = f"N°{str(correlativo).zfill(3)}-{anio}-INABIF-{sede_codigo}"
        if iniciales:
            numero += f"/{iniciales}"
        return numero, correlativo, anio

    # Columnas que solo existen despues de la migracion 006.
    _SET_V2 = """,
                                  INDICADORES_VULNERAB = :indic,
                                  PII_FASE1 = :pii1,
                                  PII_FASE2 = :pii2,
                                  PII_FASE3 = :pii3"""

    async def save(self, caso_id: int, data: dict, creado_por_id: int) -> InformeSituacional:
        """Crea o actualiza un informe.

        Con la migracion 006 aplicada, un caso puede tener varios informes y
        `data["id"]` decide cual se actualiza. Sin ella, el comportamiento es el
        de antes: un unico informe por caso.
        """
        v2 = await migracion_006_aplicada()
        pool = get_pool()

        fecha_inf = data.get("fecha_informe")
        if isinstance(fecha_inf, str):
            fecha_inf = datetime.strptime(fecha_inf[:10], "%Y-%m-%d")
        elif not fecha_inf:
            fecha_inf = datetime.now()

        campos = {
            "fecha": fecha_inf,
            "dest": data.get("destinatario"),
            "asunto": data.get("asunto"),
            "antec": data.get("antecedentes"),
            "estrat": data.get("estrategias"),
            "salud": data.get("situacion_salud"),
            "edu": data.get("situacion_educativa"),
            "fam": data.get("situacion_familiar"),
            "concl": data.get("conclusiones"),
            "recom": data.get("recomendaciones"),
            "estado": data.get("estado", "BORRADOR"),
        }
        if v2:
            campos.update({
                "indic": data.get("indicadores_vulnerab"),
                "pii1": data.get("pii_fase1"),
                "pii2": data.get("pii_fase2"),
                "pii3": data.get("pii_fase3"),
            })

        informe_id = data.get("id") if v2 else None
        if not informe_id and not v2:
            existente = await self.find_by_caso(caso_id)
            informe_id = existente.id if existente else None

        set_extra = self._SET_V2 if v2 else ""
        cols_extra = ", INDICADORES_VULNERAB, PII_FASE1, PII_FASE2, PII_FASE3, CORRELATIVO, ANIO" if v2 else ""
        vals_extra = ", :indic, :pii1, :pii2, :pii3, :correl, :anio" if v2 else ""

        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                if informe_id:
                    await cur.execute(
                        f"""UPDATE EXP_INFORME_SITUACIONAL
                               SET FECHA_INFORME = :fecha,
                                   DESTINATARIO = :dest,
                                   ASUNTO = :asunto,
                                   ANTECEDENTES = :antec,
                                   ESTRATEGIAS = :estrat,
                                   SITUACION_SALUD = :salud,
                                   SITUACION_EDUCATIVA = :edu,
                                   SITUACION_FAMILIAR = :fam,
                                   CONCLUSIONES = :concl,
                                   RECOMENDACIONES = :recom,
                                   ESTADO = :estado,
                                   UPDATED_AT = SYSTIMESTAMP{set_extra}
                             WHERE ID = :id""",
                        {**campos, "id": informe_id},
                    )
                else:
                    numero, correlativo, anio = await self._armar_numero(cur, caso_id, creado_por_id)
                    if v2:
                        campos.update({"correl": correlativo, "anio": anio})
                    id_var = cur.var(int)
                    await cur.execute(
                        f"""INSERT INTO EXP_INFORME_SITUACIONAL
                            (CASO_ID, FECHA_INFORME, DESTINATARIO, ASUNTO, ANTECEDENTES, ESTRATEGIAS,
                             SITUACION_SALUD, SITUACION_EDUCATIVA, SITUACION_FAMILIAR,
                             CONCLUSIONES, RECOMENDACIONES,
                             CREADO_POR_ID, ESTADO, CODIGO_INFORME{cols_extra})
                            VALUES (:caso, :fecha, :dest, :asunto, :antec, :estrat,
                                    :salud, :edu, :fam, :concl, :recom,
                                    :usr, :estado, :codigo{vals_extra})
                            RETURNING ID INTO :new_id""",
                        {**campos, "caso": caso_id, "usr": creado_por_id,
                         "codigo": numero, "new_id": id_var},
                    )
                    valor = id_var.getvalue()
                    informe_id = valor[0] if isinstance(valor, list) else valor

                if v2:
                    # Se reescribe la lista entera: es la forma simple de
                    # reflejar que el educador agrego o quito un hermano.
                    await cur.execute(
                        "DELETE FROM EXP_INFORME_NNA WHERE INFORME_ID = :id", {"id": informe_id}
                    )
                    for orden, nna_id in enumerate(data.get("nna_ids") or [], start=1):
                        await cur.execute(
                            """INSERT INTO EXP_INFORME_NNA (INFORME_ID, NNA_ID, CASO_ID, ORDEN)
                               VALUES (:inf, :nna, :caso, :orden)""",
                            {"inf": informe_id, "nna": nna_id, "caso": caso_id, "orden": orden},
                        )

                await conn.commit()

        return await self.find_by_id(informe_id)

    async def delete(self, caso_id: int) -> bool:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("DELETE FROM EXP_INFORME_SITUACIONAL WHERE CASO_ID = :caso", {"caso": caso_id})
                deleted = cur.rowcount > 0
                await cur.execute("DELETE FROM EXP_FOLIO WHERE CASO_ID = :caso AND TIPO_DOCUMENTO IN ('F09', 'INFORME_SITUACIONAL')", {"caso": caso_id})
                await conn.commit()
                return deleted

    _DATOS_NNA = """
        SELECT n.ID, n.NOMBRES, n.APELLIDO_PATERNO, n.APELLIDO_MATERNO, n.NUMERO_DOC,
               n.TIPO_DOC, n.SEXO, n.FECHA_NACIMIENTO, n.NIVEL_EDUCATIVO, n.GRADO_ESTUDIO,
               n.DEPARTAMENTO_NAC, n.DISTRITO_NAC, n.DOMICILIO_ACTUAL,
               n.REFERENCIA_DOMICILIO, n.NOMBRE_TUTOR, n.TELEFONO_CONTACTO
          FROM NNA n
    """

    @staticmethod
    def _fila_a_nna(row) -> dict:
        return {
            "id": row[0],
            "nombre_completo": f"{row[1] or ''} {row[2] or ''} {row[3] or ''}".strip(),
            "numero_doc": row[4] or "S/D",
            "tipo_doc": row[5],
            "sexo": row[6],
            "fecha_nacimiento": row[7],
            "nivel_educativo": row[8],
            "grado_estudio": row[9],
            "departamento_nac": row[10],
            "distrito_nac": row[11],
            "domicilio_actual": row[12],
            "referencia_domicilio": row[13],
            "nombre_tutor": row[14],
            "telefono_contacto": row[15],
        }

    async def get_nnas_del_informe(self, informe_id: int, caso_id: int) -> list:
        """Los NNA que cubre el informe.

        Si la migración 006 no está aplicada —o el informe es anterior a ella—
        se cae al único NNA del caso, que es como funcionaba antes.
        """
        ids = await self.get_nna_ids(informe_id)
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                if ids:
                    marcas = ", ".join(f":id{i}" for i in range(len(ids)))
                    await cur.execute(
                        f"{self._DATOS_NNA} WHERE n.ID IN ({marcas})",
                        {f"id{i}": v for i, v in enumerate(ids)},
                    )
                else:
                    await cur.execute(
                        f"{self._DATOS_NNA} JOIN NNA_CASO c ON n.ID = c.NNA_ID WHERE c.ID = :caso",
                        {"caso": caso_id},
                    )
                rows = await cur.fetchall() or []
        datos = [self._fila_a_nna(r) for r in rows]
        # Se respeta el orden en que el educador los seleccionó.
        if ids:
            posicion = {v: i for i, v in enumerate(ids)}
            datos.sort(key=lambda d: posicion.get(d["id"], 99))
        return datos

    async def get_perfil_caso(self, caso_id: int) -> str:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT PERFIL FROM NNA_CASO WHERE ID = :caso", {"caso": caso_id})
                row = await cur.fetchone()
        return (row[0] if row else "") or ""

    async def get_educador(self, usuario_id: int) -> dict:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "SELECT NOMBRE_COMPLETO, EMAIL, PROFESION FROM SEC_USUARIO WHERE ID = :id",
                    {"id": usuario_id},
                )
                row = await cur.fetchone()
        if not row:
            return {}
        return {"nombre": row[0], "correo": row[1], "cargo": row[2] or "Educador/a de calle"}

    async def get_nna_by_caso(self, caso_id: int) -> dict:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """SELECT n.NOMBRES, n.APELLIDO_PATERNO, n.APELLIDO_MATERNO, n.NUMERO_DOC, n.SEXO, n.FECHA_NACIMIENTO
                       FROM NNA n
                       JOIN NNA_CASO c ON n.ID = c.NNA_ID
                       WHERE c.ID = :caso""",
                    {"caso": caso_id}
                )
                row = await cur.fetchone()
                if row:
                    return {
                        "nombres": row[0],
                        "apellido_paterno": row[1],
                        "apellido_materno": row[2] or "",
                        "numero_doc": row[3] or "S/D",
                        "sexo": row[4] or "",
                        "fecha_nacimiento": row[5]
                    }
                return {}
