"""
Repositorio Oracle para NNA y Carpeta — raw SQL sin ORM.
"""
from typing import Optional
from datetime import datetime
import unicodedata

from src.domain.entities.nna import Nna
from src.infrastructure.db.connection import get_pool


_nna_columns_exist = None

async def _check_columns_cached() -> bool:
    global _nna_columns_exist
    if _nna_columns_exist is not None:
        return _nna_columns_exist
    try:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("""
                    SELECT 1 FROM USER_TAB_COLS 
                    WHERE TABLE_NAME = 'NNA' AND COLUMN_NAME = 'LEN_MAT_NNA'
                """)
                row = await cur.fetchone()
                _nna_columns_exist = (row is not None)
    except Exception as e:
        import logging
        logging.getLogger("oracle_nna_repository").warning(
            f"[DB] Error checking NNA socio-demographic columns: {e}. Falling back to CLOB JSON."
        )
        _nna_columns_exist = False
    return _nna_columns_exist


def _get_select_query(has_cols: bool) -> str:
    datos_f03_select = "DATOS_F03"
    socio_cols = ""
    if has_cols:
        socio_cols = """, LEN_MAT_NNA, LEN_MAT_ESP_NNA, AUT_IDE_ET_NNA, AUT_IDE_ET_ESP_NNA, CERT_DISCAP_NNA"""
    else:
        socio_cols = """, CAST(NULL AS VARCHAR2(100)) AS LEN_MAT_NNA, 
                          CAST(NULL AS VARCHAR2(255)) AS LEN_MAT_ESP_NNA, 
                          CAST(NULL AS VARCHAR2(100)) AS AUT_IDE_ET_NNA, 
                          CAST(NULL AS VARCHAR2(255)) AS AUT_IDE_ET_ESP_NNA, 
                          CAST(NULL AS VARCHAR2(100)) AS CERT_DISCAP_NNA"""

    return f"""
        SELECT ID, NOMBRES, APELLIDO_PATERNO, APELLIDO_MATERNO, TIPO_DOC, NUMERO_DOC,
               FECHA_NACIMIENTO, TIENE_PARTIDA_NACIMIENTO, DETALLE_SIN_DOC,
               DEPARTAMENTO_NAC, PROVINCIA_NAC, DISTRITO_NAC, SEXO, NACIONALIDAD,
               CARPETA_ID, DOMICILIO_ACTUAL, REFERENCIA_DOMICILIO,
               DEPARTAMENTO_DOM, PROVINCIA_DOM, DISTRITO_DOM, TELEFONO_CONTACTO,
               NOMBRE_TUTOR, VIVE_CON, DETALLE_VIVE_CON, TIENE_HERMANOS, CANT_HERMANOS,
               DETALLES_HERMANOS, LUGAR_PERNOCTE, DETALLE_LUGAR_PERNOCTE,
               TIENE_ANTECEDENTE_ALBERGUE, DETALLE_ANTECEDENTE_ALBERGUE,
               AFILIADO_SIS, AFILIADO_OTRO_SEGURO, DETALLE_OTRO_SEGURO,
               SUFRE_ENFERMEDAD, DETALLE_ENFERMEDAD, OBSERVACIONES_SALUD,
               TIENE_DISCAPACIDAD, TIPO_DISCAPACIDAD, DETALLE_DISCAPACIDAD,
               ESTUDIA_ACTUALMENTE, NIVEL_EDUCATIVO, GRADO_ESTUDIO, INSTITUCION_EDUCATIVA,
               MODALIDAD_ESTUDIO, DETALLE_NO_ESTUDIA, ACTIVIDADES_TIEMPO_LIBRE,
               FOTO_URL, CARACTERISTICAS, CREATED_AT, UPDATED_AT, EDAD, UNIDAD_EDAD,
               {datos_f03_select},
               CODIGO_FICHA03,
               TIENE_TUTOR_APO, PRI_APE_TUT_APO, SEG_APE_TUT_APO, NOM_APE_TUT_APO,
               SEXO_APO, FECHA_NAC_APO, NACIONALIDAD_APO, TIP_DOC_TUT_APO,
               NRO_DOC_TUT_APO, VIN_TUT_USU, LEN_MAT_APO, LEN_MAT_ESP_APO,
               AUT_IDE_ET_APO, AUT_IDE_ET_ESP_APO, TIPO_DISCAP_APO, CERT_DISCAP_APO
               {socio_cols}
        FROM NNA
    """


# Mantenemos esta variable global estática inicial para que los imports directos no fallen antes del primer query,
# pero en tiempo de ejecución las consultas usarán la función dinámica.
_SELECT = _get_select_query(False)


def _row_to_nna(row) -> Nna:
    clob_val = None
    if row[53]:
        try:
            clob_val = row[53].read() if hasattr(row[53], "read") else row[53]
        except Exception:
            clob_val = str(row[53])

    socio_json = {}
    if clob_val:
        try:
            import json
            socio_json = json.loads(clob_val)
        except Exception:
            pass

    len_mat_nna = row[71] if len(row) > 71 and row[71] is not None else socio_json.get("len_mat_nna")
    len_mat_esp_nna = row[72] if len(row) > 72 and row[72] is not None else socio_json.get("len_mat_esp_nna")
    aut_ide_et_nna = row[73] if len(row) > 73 and row[73] is not None else socio_json.get("aut_ide_et_nna")
    aut_ide_et_esp_nna = row[74] if len(row) > 74 and row[74] is not None else socio_json.get("aut_ide_et_esp_nna")
    cert_discap_nna = row[75] if len(row) > 75 and row[75] is not None else socio_json.get("cert_discap_nna")

    return Nna(
        id=row[0],
        nombres=row[1],
        apellido_paterno=row[2],
        apellido_materno=row[3],
        tipo_doc=row[4],
        numero_doc=row[5],
        fecha_nacimiento=row[6],
        tiene_partida_nacimiento=bool(row[7]),
        detalle_sin_doc=row[8],
        departamento_nac=row[9],
        provincia_nac=row[10],
        distrito_nac=row[11],
        sexo=row[12],
        nacionalidad=row[13],
        carpeta_id=row[14],
        domicilio_actual=row[15],
        referencia_domicilio=row[16],
        departamento_dom=row[17],
        provincia_dom=row[18],
        distrito_dom=row[19],
        telefono_contacto=row[20],
        nombre_tutor=row[21],
        vive_con=row[22],
        detalle_vive_con=row[23],
        tiene_hermanos=bool(row[24]),
        cant_hermanos=row[25],
        detalles_hermanos=row[26],
        lugar_pernocte=row[27],
        detalle_lugar_pernocte=row[28],
        tiene_antecedente_albergue=bool(row[29]),
        detalle_antecedente_albergue=row[30],
        afiliado_sis=row[31],
        afiliado_otro_seguro=row[32],
        detalle_otro_seguro=row[33],
        sufre_enfermedad=bool(row[34]),
        detalle_enfermedad=row[35],
        observaciones_salud=row[36],
        tiene_discapacidad=bool(row[37]),
        tipo_discapacidad=row[38],
        detalle_discapacidad=row[39],
        estudia_actualmente=bool(row[40]),
        nivel_educativo=row[41],
        grado_estudio=row[42],
        institucion_educativa=row[43],
        modalidad_estudio=row[44],
        detalle_no_estudia=row[45],
        actividades_tiempo_libre=row[46],
        foto_url=row[47],
        caracteristicas=row[48],
        created_at=row[49],
        updated_at=row[50],
        edad=row[51],
        unidad_edad=row[52],
        datos_f03=clob_val,
        codigo_ficha03=row[54],
        tiene_tutor_apo=row[55] if len(row) > 55 else 0,
        pri_ape_tut_apo=row[56] if len(row) > 56 else None,
        seg_ape_tut_apo=row[57] if len(row) > 57 else None,
        nom_ape_tut_apo=row[58] if len(row) > 58 else None,
        sexo_apo=row[59] if len(row) > 59 else None,
        fecha_nac_apo=row[60] if len(row) > 60 else None,
        nacionalidad_apo=row[61] if len(row) > 61 else "PERUANA",
        tip_doc_tut_apo=row[62] if len(row) > 62 else None,
        nro_doc_tut_apo=row[63] if len(row) > 63 else None,
        vin_tut_usu=row[64] if len(row) > 64 else None,
        len_mat_apo=row[65] if len(row) > 65 else None,
        len_mat_esp_apo=row[66] if len(row) > 66 else None,
        aut_ide_et_apo=row[67] if len(row) > 67 else None,
        aut_ide_et_esp_apo=row[68] if len(row) > 68 else None,
        tipo_discap_apo=row[69] if len(row) > 69 else None,
        cert_discap_apo=row[70] if len(row) > 70 else None,
        len_mat_nna=len_mat_nna,
        len_mat_esp_nna=len_mat_esp_nna,
        aut_ide_et_nna=aut_ide_et_nna,
        aut_ide_et_esp_nna=aut_ide_et_esp_nna,
        cert_discap_nna=cert_discap_nna,
    )


class OracleNnaRepository:
    async def get_select_query(self) -> str:
        has_cols = await _check_columns_cached()
        return _get_select_query(has_cols)

    async def find_by_id(self, nna_id: int) -> Optional[Nna]:
        pool = get_pool()
        select_query = await self.get_select_query()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(f"{select_query} WHERE ID = :id", {"id": nna_id})
                row = await cur.fetchone()
                return _row_to_nna(row) if row else None

    async def find_by_doc(self, numero_doc):
        pool = get_pool()
        select_query = await self.get_select_query()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(f"{select_query} WHERE NUMERO_DOC = :doc", {"doc": numero_doc})
                row = await cur.fetchone()
                return _row_to_nna(row) if row else None

    async def list_all(self, limit=100, offset=0):
        pool = get_pool()
        select_query = await self.get_select_query()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    f"{select_query} ORDER BY CREATED_AT DESC OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY",
                    {"offset": offset, "limit": limit},
                )
                return [_row_to_nna(r) for r in await cur.fetchall()]

    async def list_by_responsable(self, responsable_id: int, limit=100, offset=0):
        """NNAs cuyo caso activo tiene RESPONSABLE_ID = responsable_id (para roles de campo)."""
        pool = get_pool()
        select_query = await self.get_select_query()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    f"""{select_query}
                    WHERE ID IN (
                        SELECT NNA_ID FROM NNA_CASO
                        WHERE RESPONSABLE_ID = :resp AND ESTADO != 'CERRADO'
                    )
                    ORDER BY CREATED_AT DESC
                    OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY""",
                    {"resp": responsable_id, "offset": offset, "limit": limit},
                )
                return [_row_to_nna(r) for r in await cur.fetchall()]

    async def list_by_sede(self, sede_id: int, limit=100, offset=0):
        """NNAs con al menos un caso activo en la sede (para coordinadores y admin de sede)."""
        pool = get_pool()
        select_query = await self.get_select_query()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    f"""{select_query}
                    WHERE ID IN (
                        SELECT NNA_ID FROM NNA_CASO
                        WHERE SEDE_ID = :sede AND ESTADO != 'CERRADO'
                    )
                    ORDER BY CREATED_AT DESC
                    OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY""",
                    {"sede": sede_id, "offset": offset, "limit": limit},
                )
                return [_row_to_nna(r) for r in await cur.fetchall()]

    async def get_next_codigo_f03(self):
        anio = datetime.now().year
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "SELECT COUNT(*) FROM NNA WHERE CODIGO_FICHA03 LIKE :patron",
                    {"patron": f"F03-{anio}-%"},
                )
                row = await cur.fetchone()
                return (row[0] or 0) + 1

    async def create(self, nna_data, carpeta_id, codigo_f03, tiene_hermanos, cant_hermanos):
        is_dict = isinstance(nna_data, dict)
        def _get(key, default=None):
            if is_dict:
                if key in nna_data:
                    return nna_data[key]
                if key == "afiliado_sis" and "afiliadoSIS" in nna_data:
                    return nna_data["afiliadoSIS"]
                camel_key = "".join(word.capitalize() if i > 0 else word for i, word in enumerate(key.split("_")))
                if camel_key in nna_data:
                    return nna_data[camel_key]
                return default
            return getattr(nna_data, key, default)

        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                out_id = cur.var(int)
                nombres_val = _get("nombres")
                num_doc_val = _get("numero_doc")
                print("=" * 60)
                print(f"[NNA INSERT] nombres={nombres_val} | doc={num_doc_val}")
                print(f"[NNA INSERT] carpeta_id={carpeta_id} | f03={codigo_f03}")
                print(f"[NNA INSERT] afiliado_sis={_get('afiliado_sis')} | sufre_enfermedad={_get('sufre_enfermedad')}")
                print(f"[NNA INSERT] act_libre={_get('actividades_tiempo_libre')}")
                print("=" * 60)
                try:
                    tutor_nom = _get("nombre_tutor")
                    tutor_paterno = _get("pri_ape_tut_apo")
                    tutor_materno = _get("seg_ape_tut_apo")
                    tutor_nombres = _get("nom_ape_tut_apo")
                    if tutor_paterno or tutor_materno or tutor_nombres:
                        partes = [tutor_paterno or "", tutor_materno or "", tutor_nombres or ""]
                        tutor_nom = " ".join(p.strip() for p in partes if p.strip()).strip() or None

                    has_cols = await _check_columns_cached()

                    # Preparar el CLOB JSON de respaldo
                    existing_datos = _get("datos_f03")
                    import json
                    datos_json = {}
                    if existing_datos:
                        try:
                            datos_json = json.loads(existing_datos)
                        except Exception:
                            pass

                    # Inyectar variables socio-demográficas del NNA en el JSON
                    datos_json["len_mat_nna"] = _get("len_mat_nna")
                    datos_json["len_mat_esp_nna"] = _get("len_mat_esp_nna")
                    datos_json["aut_ide_et_nna"] = _get("aut_ide_et_nna")
                    datos_json["aut_ide_et_esp_nna"] = _get("aut_ide_et_esp_nna")
                    datos_json["cert_discap_nna"] = _get("cert_discap_nna")

                    datos_f03_str = json.dumps(datos_json, ensure_ascii=False)

                    columns_list = [
                        "CODIGO_FICHA03", "NOMBRES", "APELLIDO_PATERNO", "APELLIDO_MATERNO",
                        "TIPO_DOC", "NUMERO_DOC", "FECHA_NACIMIENTO", "SEXO", "NACIONALIDAD",
                        "CARPETA_ID", "TIENE_PARTIDA_NACIMIENTO", "DETALLE_SIN_DOC",
                        "DEPARTAMENTO_NAC", "PROVINCIA_NAC", "DISTRITO_NAC",
                        "DOMICILIO_ACTUAL", "REFERENCIA_DOMICILIO",
                        "DEPARTAMENTO_DOM", "PROVINCIA_DOM", "DISTRITO_DOM", "TELEFONO_CONTACTO",
                        "NOMBRE_TUTOR", "VIVE_CON", "DETALLE_VIVE_CON",
                        "TIENE_HERMANOS", "CANT_HERMANOS",
                        "LUGAR_PERNOCTE", "DETALLE_LUGAR_PERNOCTE",
                        "TIENE_ANTECEDENTE_ALBERGUE", "DETALLE_ANTECEDENTE_ALBERGUE",
                        "AFILIADO_SIS", "AFILIADO_OTRO_SEGURO", "DETALLE_OTRO_SEGURO",
                        "SUFRE_ENFERMEDAD", "DETALLE_ENFERMEDAD", "OBSERVACIONES_SALUD",
                        "TIENE_DISCAPACIDAD", "TIPO_DISCAPACIDAD", "DETALLE_DISCAPACIDAD",
                        "ESTUDIA_ACTUALMENTE", "NIVEL_EDUCATIVO",
                        "GRADO_ESTUDIO", "INSTITUCION_EDUCATIVA", "MODALIDAD_ESTUDIO", "DETALLE_NO_ESTUDIA",
                        "EDAD", "UNIDAD_EDAD",
                        "ACTIVIDADES_TIEMPO_LIBRE", "CARACTERISTICAS",
                        "TIENE_TUTOR_APO", "PRI_APE_TUT_APO", "SEG_APE_TUT_APO", "NOM_APE_TUT_APO",
                        "SEXO_APO", "FECHA_NAC_APO", "NACIONALIDAD_APO", "TIP_DOC_TUT_APO",
                        "NRO_DOC_TUT_APO", "VIN_TUT_USU", "LEN_MAT_APO", "LEN_MAT_ESP_APO",
                        "AUT_IDE_ET_APO", "AUT_IDE_ET_ESP_APO", "TIPO_DISCAP_APO", "CERT_DISCAP_APO",
                        "DATOS_F03"
                    ]

                    placeholders_list = [
                        ":f03", ":nombres", ":ap", ":am",
                        ":tipo_doc", ":num_doc", ":fnac", ":sexo", ":nac",
                        ":carpeta", ":partida", ":det_sin_doc",
                        ":dep_nac", ":prov_nac", ":dist_nac",
                        ":dom", ":ref_dom", ":dep_dom", ":prov_dom", ":dist_dom", ":tel",
                        ":tutor", ":vive_con", ":det_vive_con",
                        ":hermanos", ":cant_h",
                        ":pernocte", ":det_pernocte",
                        ":antec_alb", ":det_antec_alb",
                        ":sis", ":otro_seg", ":det_otro_seg",
                        ":enfermedad", ":det_enf", ":obs_salud",
                        ":discap", ":tipo_discap", ":det_discap",
                        ":estudia", ":nivel",
                        ":grado", ":institucion", ":modalidad", ":det_no_estudia",
                        ":edad", ":unidad_edad",
                        ":act_libre", ":caract",
                        ":tiene_tutor_apo", ":pri_ape_tut_apo", ":seg_ape_tut_apo", ":nom_ape_tut_apo",
                        ":sexo_apo", ":fecha_nac_apo", ":nacionalidad_apo", ":tip_doc_tut_apo",
                        ":nro_doc_tut_apo", ":vin_tut_usu", ":len_mat_apo", ":len_mat_esp_apo",
                        ":aut_ide_et_apo", ":aut_ide_et_esp_apo", ":tipo_discap_apo", ":cert_discap_apo",
                        ":datos_f03"
                    ]

                    params = {
                        "f03":           codigo_f03,
                        "nombres":       _get("nombres"),
                        "ap":            _get("apellido_paterno"),
                        "am":            _get("apellido_materno"),
                        "tipo_doc":      _get("tipo_doc") or "SIN_DOC",
                        "num_doc":       _get("numero_doc"),
                        "fnac":          _get("fecha_nacimiento"),
                        "sexo":          _get("sexo"),
                        "nac":           _get("nacionalidad") or "PERUANA",
                        "carpeta":       carpeta_id,
                        "partida":       1 if _get("tiene_partida_nacimiento") else 0,
                        "det_sin_doc":   _get("detalle_sin_doc"),
                        "dep_nac":       _get("departamento_nac"),
                        "prov_nac":      _get("provincia_nac"),
                        "dist_nac":      _get("distrito_nac"),
                        "dom":           _get("domicilio_actual"),
                        "ref_dom":       _get("referencia_domicilio"),
                        "dep_dom":       _get("departamento_dom"),
                        "prov_dom":      _get("provincia_dom"),
                        "dist_dom":      _get("distrito_dom"),
                        "tel":           _get("telefono_contacto"),
                        "tutor":         tutor_nom,
                        "vive_con":      _get("vive_con"),
                        "det_vive_con":  _get("detalle_vive_con"),
                        "hermanos":      1 if tiene_hermanos else 0,
                        "cant_h":        cant_hermanos,
                        "pernocte":      _get("lugar_pernocte"),
                        "det_pernocte":  _get("detalle_lugar_pernocte"),
                        "antec_alb":     1 if _get("tiene_antecedente_albergue") else 0,
                        "det_antec_alb": _get("detalle_antecedente_albergue"),
                        "sis":           _get("afiliado_sis"),
                        "otro_seg":      _get("afiliado_otro_seguro"),
                        "det_otro_seg":  _get("detalle_otro_seguro"),
                        "enfermedad":    1 if _get("sufre_enfermedad") else 0,
                        "det_enf":       _get("detalle_enfermedad"),
                        "obs_salud":     _get("observaciones_salud"),
                        "discap":        1 if _get("tiene_discapacidad") else 0,
                        "tipo_discap":   _get("tipo_discapacidad"),
                        "det_discap":    _get("detalle_discapacidad"),
                        "estudia":       1 if _get("estudia_actualmente") else 0,
                        "nivel":         _get("nivel_educativo"),
                        "grado":         _get("grado_estudio"),
                        "institucion":   _get("institucion_educativa"),
                        "modalidad":     _get("modalidad_estudio"),
                        "det_no_estudia":_get("detalle_no_estudia"),
                        "edad":          _get("edad"),
                        "unidad_edad":   _get("unidad_edad") or "ANIOS",
                        "act_libre":     _get("actividades_tiempo_libre"),
                        "caract":        _get("caracteristicas"),
                        "tiene_tutor_apo": 1 if _get("tiene_tutor_apo") else 0,
                        "pri_ape_tut_apo": _get("pri_ape_tut_apo"),
                        "seg_ape_tut_apo": _get("seg_ape_tut_apo"),
                        "nom_ape_tut_apo": _get("nom_ape_tut_apo"),
                        "sexo_apo":        _get("sexo_apo"),
                        "fecha_nac_apo":   _get("fecha_nac_apo"),
                        "nacionalidad_apo": _get("nacionalidad_apo") or "PERUANA",
                        "tip_doc_tut_apo": _get("tip_doc_tut_apo"),
                        "nro_doc_tut_apo": _get("nro_doc_tut_apo"),
                        "vin_tut_usu":     _get("vin_tut_usu"),
                        "len_mat_apo":     _get("len_mat_apo"),
                        "len_mat_esp_apo": _get("len_mat_esp_apo"),
                        "aut_ide_et_apo":  _get("aut_ide_et_apo"),
                        "aut_ide_et_esp_apo": _get("aut_ide_et_esp_apo"),
                        "tipo_discap_apo": _get("tipo_discap_apo"),
                        "cert_discap_apo": _get("cert_discap_apo"),
                        "datos_f03":     datos_f03_str,
                        "out_id":        out_id,
                    }

                    if has_cols:
                        columns_list.extend([
                            "LEN_MAT_NNA", "LEN_MAT_ESP_NNA", "AUT_IDE_ET_NNA", "AUT_IDE_ET_ESP_NNA", "CERT_DISCAP_NNA"
                        ])
                        placeholders_list.extend([
                            ":len_mat_nna", ":len_mat_esp_nna", ":aut_ide_et_nna", ":aut_ide_et_esp_nna", ":cert_discap_nna"
                        ])
                        params["len_mat_nna"] = _get("len_mat_nna")
                        params["len_mat_esp_nna"] = _get("len_mat_esp_nna")
                        params["aut_ide_et_nna"] = _get("aut_ide_et_nna")
                        params["aut_ide_et_esp_nna"] = _get("aut_ide_et_esp_nna")
                        params["cert_discap_nna"] = _get("cert_discap_nna")

                    cols_str = ", ".join(columns_list)
                    placeholders_str = ", ".join(placeholders_list)
                    sql = f"INSERT INTO NNA ({cols_str}) VALUES ({placeholders_str}) RETURNING ID INTO :out_id"

                    await cur.execute(sql, params)
                    await conn.commit()
                    new_id = out_id.getvalue()[0]
                    print(f"[NNA INSERT] OK - nuevo ID={new_id}")
                    print("=" * 60)
                except Exception as e:
                    print("=" * 60)
                    print(f"[NNA INSERT] ERROR ORACLE: {e}")
                    print("=" * 60)
                    raise
        return await self.find_by_id(new_id)

    async def update(self, nna_id: int, nna_data) -> None:
        """Actualiza todos los campos editables de un NNA existente."""
        is_dict = isinstance(nna_data, dict)
        def _get(key, default=None):
            if is_dict:
                if key in nna_data:
                    return nna_data[key]
                if key == "afiliado_sis" and "afiliadoSIS" in nna_data:
                    return nna_data["afiliadoSIS"]
                camel_key = "".join(word.capitalize() if i > 0 else word for i, word in enumerate(key.split("_")))
                if camel_key in nna_data:
                    return nna_data[camel_key]
                return default
            return getattr(nna_data, key, default)

        tutor_nom = _get("nombre_tutor")
        tutor_paterno = _get("pri_ape_tut_apo")
        tutor_materno = _get("seg_ape_tut_apo")
        tutor_nombres = _get("nom_ape_tut_apo")
        if tutor_paterno or tutor_materno or tutor_nombres:
            partes = [tutor_paterno or "", tutor_materno or "", tutor_nombres or ""]
            tutor_nom = " ".join(p.strip() for p in partes if p.strip()).strip() or None

        pool = get_pool()

        # Obtenemos primero los DATOS_F03 actuales para mezclarlos y no perder información previa
        existing_datos = None
        try:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute("SELECT DATOS_F03 FROM NNA WHERE ID = :id", {"id": nna_id})
                    row = await cur.fetchone()
                    if row and row[0]:
                        existing_datos = row[0].read() if hasattr(row[0], "read") else row[0]
        except Exception as e:
            print(f"[NNA UPDATE] Error reading existing DATOS_F03: {e}")

        import json
        datos_json = {}
        if existing_datos:
            try:
                datos_json = json.loads(existing_datos)
            except Exception:
                pass

        # Mezclar dinámicamente cualquier JSON de datos_f03 enviado en la petición para no perder campos dinámicos
        req_datos = _get("datos_f03")
        if req_datos:
            try:
                req_json = json.loads(req_datos) if isinstance(req_datos, str) else req_datos
                if isinstance(req_json, dict):
                    datos_json.update(req_json)
            except Exception:
                pass

        # Inyectar variables socio-demográficas del NNA en el JSON
        datos_json["len_mat_nna"] = _get("len_mat_nna")
        datos_json["len_mat_esp_nna"] = _get("len_mat_esp_nna")
        datos_json["aut_ide_et_nna"] = _get("aut_ide_et_nna")
        datos_json["aut_ide_et_esp_nna"] = _get("aut_ide_et_esp_nna")
        datos_json["cert_discap_nna"] = _get("cert_discap_nna")

        datos_f03_str = json.dumps(datos_json, ensure_ascii=False)

        has_cols = await _check_columns_cached()

        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                update_sets = [
                    "NOMBRES=:nombres", "APELLIDO_PATERNO=:ap", "APELLIDO_MATERNO=:am",
                    "TIPO_DOC=:tipo_doc", "NUMERO_DOC=:num_doc",
                    "FECHA_NACIMIENTO=:fnac", "SEXO=:sexo", "NACIONALIDAD=:nac",
                    "TIENE_PARTIDA_NACIMIENTO=:partida", "DETALLE_SIN_DOC=:det_sin_doc",
                    "DEPARTAMENTO_NAC=:dep_nac", "PROVINCIA_NAC=:prov_nac", "DISTRITO_NAC=:dist_nac",
                    "DOMICILIO_ACTUAL=:dom", "REFERENCIA_DOMICILIO=:ref_dom",
                    "DEPARTAMENTO_DOM=:dep_dom", "PROVINCIA_DOM=:prov_dom", "DISTRITO_DOM=:dist_dom",
                    "TELEFONO_CONTACTO=:tel",
                    "NOMBRE_TUTOR=:tutor", "VIVE_CON=:vive_con", "DETALLE_VIVE_CON=:det_vive_con",
                    "LUGAR_PERNOCTE=:pernocte", "DETALLE_LUGAR_PERNOCTE=:det_pernocte",
                    "TIENE_ANTECEDENTE_ALBERGUE=:antec_alb", "DETALLE_ANTECEDENTE_ALBERGUE=:det_antec_alb",
                    "AFILIADO_SIS=:sis", "AFILIADO_OTRO_SEGURO=:otro_seg", "DETALLE_OTRO_SEGURO=:det_otro_seg",
                    "SUFRE_ENFERMEDAD=:enfermedad", "DETALLE_ENFERMEDAD=:det_enf", "OBSERVACIONES_SALUD=:obs_salud",
                    "TIENE_DISCAPACIDAD=:discap", "TIPO_DISCAPACIDAD=:tipo_discap", "DETALLE_DISCAPACIDAD=:det_discap",
                    "ESTUDIA_ACTUALMENTE=:estudia", "NIVEL_EDUCATIVO=:nivel",
                    "GRADO_ESTUDIO=:grado", "INSTITUCION_EDUCATIVA=:institucion",
                    "MODALIDAD_ESTUDIO=:modalidad", "DETALLE_NO_ESTUDIA=:det_no_estudia",
                    "EDAD=:edad", "UNIDAD_EDAD=:unidad_edad",
                    "ACTIVIDADES_TIEMPO_LIBRE=:act_libre", "CARACTERISTICAS=:caract",
                    "TIENE_TUTOR_APO=:tiene_tutor_apo", "PRI_APE_TUT_APO=:pri_ape_tut_apo",
                    "SEG_APE_TUT_APO=:seg_ape_tut_apo", "NOM_APE_TUT_APO=:nom_ape_tut_apo",
                    "SEXO_APO=:sexo_apo", "FECHA_NAC_APO=:fecha_nac_apo",
                    "NACIONALIDAD_APO=:nacionalidad_apo", "TIP_DOC_TUT_APO=:tip_doc_tut_apo",
                    "NRO_DOC_TUT_APO=:nro_doc_tut_apo", "VIN_TUT_USU=:vin_tut_usu",
                    "LEN_MAT_APO=:len_mat_apo", "LEN_MAT_ESP_APO=:len_mat_esp_apo",
                    "AUT_IDE_ET_APO=:aut_ide_et_apo", "AUT_IDE_ET_ESP_APO=:aut_ide_et_esp_apo",
                    "TIPO_DISCAP_APO=:tipo_discap_apo", "CERT_DISCAP_APO=:cert_discap_apo",
                    "DATOS_F03=:datos_f03",
                    "UPDATED_AT=SYSTIMESTAMP"
                ]

                params = {
                    "nna_id":        nna_id,
                    "nombres":       _get("nombres"),
                    "ap":            _get("apellido_paterno"),
                    "am":            _get("apellido_materno"),
                    "tipo_doc":      _get("tipo_doc") or "SIN_DOC",
                    "num_doc":       _get("numero_doc"),
                    "fnac":          _get("fecha_nacimiento"),
                    "sexo":          _get("sexo"),
                    "nac":           _get("nacionalidad") or "PERUANA",
                    "partida":       1 if _get("tiene_partida_nacimiento") else 0,
                    "det_sin_doc":   _get("detalle_sin_doc"),
                    "dep_nac":       _get("departamento_nac"),
                    "prov_nac":      _get("provincia_nac"),
                    "dist_nac":      _get("distrito_nac"),
                    "dom":           _get("domicilio_actual"),
                    "ref_dom":       _get("referencia_domicilio"),
                    "dep_dom":       _get("departamento_dom"),
                    "prov_dom":      _get("provincia_dom"),
                    "dist_dom":      _get("distrito_dom"),
                    "tel":           _get("telefono_contacto"),
                    "tutor":         tutor_nom,
                    "vive_con":      _get("vive_con"),
                    "det_vive_con":  _get("detalle_vive_con"),
                    "pernocte":      _get("lugar_pernocte"),
                    "det_pernocte":  _get("detalle_lugar_pernocte"),
                    "antec_alb":     1 if _get("tiene_antecedente_albergue") else 0,
                    "det_antec_alb": _get("detalle_antecedente_albergue"),
                    "sis":           _get("afiliado_sis"),
                    "otro_seg":      _get("afiliado_otro_seguro"),
                    "det_otro_seg":  _get("detalle_otro_seguro"),
                    "enfermedad":    1 if _get("sufre_enfermedad") else 0,
                    "det_enf":       _get("detalle_enfermedad"),
                    "obs_salud":     _get("observaciones_salud"),
                    "discap":        1 if _get("tiene_discapacidad") else 0,
                    "tipo_discap":   _get("tipo_discapacidad"),
                    "det_discap":    _get("detalle_discapacidad"),
                    "estudia":       1 if _get("estudia_actualmente") else 0,
                    "nivel":         _get("nivel_educativo"),
                    "grado":         _get("grado_estudio"),
                    "institucion":   _get("institucion_educativa"),
                    "modalidad":     _get("modalidad_estudio"),
                    "det_no_estudia":_get("detalle_no_estudia"),
                    "edad":          _get("edad"),
                    "unidad_edad":   _get("unidad_edad") or "ANIOS",
                    "act_libre":     _get("actividades_tiempo_libre"),
                    "caract":        _get("caracteristicas"),
                    "tiene_tutor_apo": 1 if _get("tiene_tutor_apo") else 0,
                    "pri_ape_tut_apo": _get("pri_ape_tut_apo"),
                    "seg_ape_tut_apo": _get("seg_ape_tut_apo"),
                    "nom_ape_tut_apo": _get("nom_ape_tut_apo"),
                    "sexo_apo":        _get("sexo_apo"),
                    "fecha_nac_apo":   _get("fecha_nac_apo"),
                    "nacionalidad_apo": _get("nacionalidad_apo") or "PERUANA",
                    "tip_doc_tut_apo": _get("tip_doc_tut_apo"),
                    "nro_doc_tut_apo": _get("nro_doc_tut_apo"),
                    "vin_tut_usu":     _get("vin_tut_usu"),
                    "len_mat_apo":     _get("len_mat_apo"),
                    "len_mat_esp_apo": _get("len_mat_esp_apo"),
                    "aut_ide_et_apo":  _get("aut_ide_et_apo"),
                    "aut_ide_et_esp_apo": _get("aut_ide_et_esp_apo"),
                    "tipo_discap_apo": _get("tipo_discap_apo"),
                    "cert_discap_apo": _get("cert_discap_apo"),
                    "datos_f03":     datos_f03_str,
                }

                if has_cols:
                    update_sets.extend([
                        "LEN_MAT_NNA=:len_mat_nna",
                        "LEN_MAT_ESP_NNA=:len_mat_esp_nna",
                        "AUT_IDE_ET_NNA=:aut_ide_et_nna",
                        "AUT_IDE_ET_ESP_NNA=:aut_ide_et_esp_nna",
                        "CERT_DISCAP_NNA=:cert_discap_nna"
                    ])
                    params["len_mat_nna"] = _get("len_mat_nna")
                    params["len_mat_esp_nna"] = _get("len_mat_esp_nna")
                    params["aut_ide_et_nna"] = _get("aut_ide_et_nna")
                    params["aut_ide_et_esp_nna"] = _get("aut_ide_et_esp_nna")
                    params["cert_discap_nna"] = _get("cert_discap_nna")

                sets_str = ", ".join(update_sets)
                sql = f"UPDATE NNA SET {sets_str} WHERE ID=:nna_id"

                await cur.execute(sql, params)
                await conn.commit()

    async def delete(self, nna_id: int) -> None:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("DELETE FROM NNA WHERE ID = :id", {"id": nna_id})
                await conn.commit()

    async def find_duplicates(self, nombres: str, apellido_paterno: str, apellido_materno: str = None, numero_doc: str = None, tipo_doc: str = None):
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                def clean_param(s):
                    if not s:
                        return ""
                    import unicodedata
                    s = "".join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')
                    return s.replace(" ", "").upper()

                nom_clean = clean_param(nombres)
                ap_clean = clean_param(apellido_paterno)
                am_clean = clean_param(apellido_materno) if apellido_materno else ""

                sql = """
                    SELECT 
                      n.ID, 
                      n.CODIGO_FICHA03, 
                      n.NOMBRES, 
                      n.APELLIDO_PATERNO, 
                      n.APELLIDO_MATERNO, 
                      n.TIPO_DOC, 
                      n.NUMERO_DOC, 
                      n.SEXO, 
                      n.CARPETA_ID,
                      c.CODIGO_CASO,
                      c.ESTADO AS ESTADO_CASO
                    FROM NNA n
                    LEFT JOIN (
                      SELECT NNA_ID, CODIGO_CASO, ESTADO,
                             ROW_NUMBER() OVER (PARTITION BY NNA_ID ORDER BY ID DESC) as rn
                      FROM NNA_CASO
                    ) c ON n.ID = c.NNA_ID AND c.rn = 1
                    WHERE (
                      REPLACE(TRANSLATE(UPPER(n.NOMBRES), 'ÁÉÍÓÚÄËÏÖÜÑ', 'AEIOUAEIOUN'), ' ', '') = :nom
                      AND REPLACE(TRANSLATE(UPPER(n.APELLIDO_PATERNO), 'ÁÉÍÓÚÄËÏÖÜÑ', 'AEIOUAEIOUN'), ' ', '') = :ap
                      AND (
                        (:am_is_null = 1 AND (n.APELLIDO_MATERNO IS NULL OR REPLACE(TRANSLATE(UPPER(n.APELLIDO_MATERNO), 'ÁÉÍÓÚÄËÏÖÜÑ', 'AEIOUAEIOUN'), ' ', '') IS NULL))
                        OR REPLACE(TRANSLATE(UPPER(n.APELLIDO_MATERNO), 'ÁÉÍÓÚÄËÏÖÜÑ', 'AEIOUAEIOUN'), ' ', '') = :am
                      )
                    )
                """
                params = {
                    "nom": nom_clean,
                    "ap": ap_clean,
                    "am": am_clean if am_clean else None,
                    "am_is_null": 1 if not am_clean else 0
                }

                if numero_doc and tipo_doc != "SIN_DOC":
                    sql += " OR (n.NUMERO_DOC = :doc AND n.TIPO_DOC <> 'SIN_DOC')"
                    params["doc"] = numero_doc.strip()

                await cur.execute(sql, params)
                rows = await cur.fetchall()
                return [
                    {
                        "id": r[0],
                        "codigoFicha03": r[1],
                        "nombres": r[2],
                        "apellidoPaterno": r[3],
                        "apellidoMaterno": r[4],
                        "tipoDoc": r[5],
                        "numeroDoc": r[6],
                        "sexo": r[7],
                        "carpetaId": r[8],
                        "codigoCaso": r[9],
                        "estadoCaso": r[10]
                    }
                    for r in rows
                ]


class OracleCarpetaRepository:
    async def find_by_id(self, carpeta_id: int):
        """Devuelve la carpeta por su ID, o None si no existe."""
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "SELECT ID, CODIGO, ANIO, CORRELATIVO FROM NNA_CARPETA WHERE ID = :cid",
                    {"cid": carpeta_id},
                )
                row = await cur.fetchone()
                if not row:
                    return None
                class _Carpeta:
                    pass
                c = _Carpeta()
                c.id, c.codigo, c.anio, c.correlativo = row
                return c

    async def find_by_ids(self, carpeta_ids: list) -> dict:
        """Devuelve un dict {id: carpeta} para una lista de IDs (para evitar N+1 en el listado)."""
        if not carpeta_ids:
            return {}
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                placeholders = ", ".join(f":id{i}" for i in range(len(carpeta_ids)))
                params = {f"id{i}": cid for i, cid in enumerate(carpeta_ids)}
                await cur.execute(
                    f"SELECT ID, CODIGO, ANIO, CORRELATIVO FROM NNA_CARPETA WHERE ID IN ({placeholders})",
                    params,
                )
                rows = await cur.fetchall()
                result = {}
                for row in rows:
                    class _Carpeta:
                        pass
                    c = _Carpeta()
                    c.id, c.codigo, c.anio, c.correlativo = row
                    result[c.id] = c
                return result

    async def find_by_id(self, carpeta_id: int):
        """Devuelve una carpeta por ID o None si no existe."""
        result = await self.find_by_ids([carpeta_id])
        return result.get(carpeta_id)

    async def create_nueva(self, sede_id: int = None) -> int:
        """Crea una nueva carpeta y devuelve su ID."""
        pool = get_pool()
        
        sede_name = "DESCONOCIDO"
        if sede_id:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute("SELECT NOMBRE FROM SEC_SEDE WHERE ID = :id", {"id": sede_id})
                    row = await cur.fetchone()
                    if row and row[0]:
                        sede_name = str(row[0]).upper().strip()

        suffix = f"-SEC.{sede_name}"
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                anio = __import__('datetime').datetime.now().year
                out_id = cur.var(int)
                await cur.execute(
                    """INSERT INTO NNA_CARPETA (ANIO, CORRELATIVO, CODIGO, SEDE_ID)
                       VALUES (:anio,
                               (SELECT NVL(MAX(CORRELATIVO),0)+1 FROM NNA_CARPETA 
                                WHERE ANIO=:anio2 AND (SEDE_ID=:sede_id OR (SEDE_ID IS NULL AND :sede_id_is_null = 1))),
                               (SELECT LPAD(NVL(MAX(CORRELATIVO),0)+1,5,'0')||'-'||:anio3||:suffix FROM NNA_CARPETA 
                                WHERE ANIO=:anio4 AND (SEDE_ID=:sede_id2 OR (SEDE_ID IS NULL AND :sede_id_is_null2 = 1))),
                               :sede_id3)
                       RETURNING ID INTO :out_id""",
                    {
                        "anio": anio,
                        "anio2": anio,
                        "anio3": anio,
                        "anio4": anio,
                        "suffix": suffix,
                        "sede_id": sede_id,
                        "sede_id2": sede_id,
                        "sede_id3": sede_id,
                        "sede_id_is_null": 1 if sede_id is None else 0,
                        "sede_id_is_null2": 1 if sede_id is None else 0,
                        "out_id": out_id
                    },
                )
                await conn.commit()
                return out_id.getvalue()[0]
