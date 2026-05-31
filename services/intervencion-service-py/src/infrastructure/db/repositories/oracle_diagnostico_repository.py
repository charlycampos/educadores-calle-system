import oracledb
import json
import uuid
from datetime import datetime
from src.infrastructure.db.connection import get_pool
from src.domain.entities.diagnostico import DiagnosticoSocialCreate

class OracleDiagnosticoRepository:
    def _row_to_dict(self, row, columns) -> dict:
        d = dict(zip(columns, row))
        if 'datos_extra' in d and d['datos_extra']:
            try:
                # Si es un LOB, hay que leerlo
                if hasattr(d['datos_extra'], 'read'):
                    extra_data = json.loads(d['datos_extra'].read())
                else:
                    extra_data = json.loads(d['datos_extra'])
            except:
                extra_data = {}
            
            # Combinar datos extra directamente al nivel raíz para el frontend
            if isinstance(extra_data, dict):
                merged = {}
                merged.update(extra_data)
                # Conservar metadatos del nivel raíz (sobreescribir si colisionan)
                for k, v in d.items():
                    if k != 'datos_extra':
                        merged[k] = v
                merged['datos_extra'] = extra_data
                return merged
        return d

    async def create_diagnostico(self, nna_id: int, data: DiagnosticoSocialCreate) -> dict:
        pool = get_pool()
        codigo_f04 = f"F04-{datetime.now().year}-{uuid.uuid4().hex[:6].upper()}"
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                sql = """
                    INSERT INTO DIAGNOSTICO_SOCIAL (
                        CODIGO_FICHA_04, NNA_ID, SITUACION_CALLE, TIEMPO_EN_CALLE, MOTIVO_INGRESO, LUGAR_PERNOTA,
                        ACTIVIDAD_CALLE, CONSUMO_SUSTANCIAS, NOMBRE_TUTOR, DNI_TUTOR, DIRECCION_TUTOR, TELEFONO_TUTOR, DATOS_EXTRA
                    )
                    VALUES (:1, :2, :3, :4, :5, :6, :7, :8, :9, :10, :11, :12, :13)
                    RETURNING ID, CREATED_AT, UPDATED_AT INTO :14, :15, :16
                """
                id_var = cur.var(int)
                created_var = cur.var(oracledb.DB_TYPE_TIMESTAMP)
                updated_var = cur.var(oracledb.DB_TYPE_TIMESTAMP)
                
                datos_extra_str = json.dumps(data.datos_extra) if data.datos_extra else None

                await cur.execute(sql, [
                    codigo_f04, nna_id, data.situacion_calle, data.tiempo_en_calle, data.motivo_ingreso, data.lugar_pernota,
                    data.actividad_calle, 1 if data.consumo_sustancias else 0, data.nombre_tutor, data.dni_tutor,
                    data.direccion_tutor, data.telefono_tutor, datos_extra_str,
                    id_var, created_var, updated_var
                ])
                await conn.commit()
                
                result = data.model_dump()
                result["id"] = id_var.getvalue()[0]
                result["codigo_ficha_04"] = codigo_f04
                result["created_at"] = created_var.getvalue()[0]
                result["updated_at"] = updated_var.getvalue()[0]
                return result

    async def get_by_id(self, diag_id: int) -> dict:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT * FROM DIAGNOSTICO_SOCIAL WHERE ID = :1", [diag_id])
                row = await cur.fetchone()
                if not row:
                    return None
                columns = [col[0].lower() for col in cur.description]
                return self._row_to_dict(row, columns)

    async def get_by_nna(self, nna_id: int) -> list[dict]:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                # Paso A: Buscar si ya existe registro en DIAGNOSTICO_SOCIAL
                await cur.execute("SELECT * FROM DIAGNOSTICO_SOCIAL WHERE NNA_ID = :1 ORDER BY CREATED_AT DESC", [nna_id])
                rows = await cur.fetchall()
                if rows:
                    columns = [col[0].lower() for col in cur.description]
                    return [self._row_to_dict(r, columns) for r in rows]
                return []

    async def get_prefilled_by_nna(self, nna_id: int) -> dict:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                # Paso B & C: precargar por cortesía desde NNA (F03)
                # Obtenemos los datos cualitativos e identificadores de la F03
                sql_nna = """
                    SELECT n.NOMBRES, n.APELLIDO_PATERNO, n.APELLIDO_MATERNO, n.NUMERO_DOC, n.TIPO_DOC,
                           n.FECHA_NACIMIENTO, n.DOMICILIO_ACTUAL, n.REFERENCIA_DOMICILIO, n.DEPARTAMENTO_DOM,
                           n.PROVINCIA_DOM, n.DISTRITO_DOM, n.TELEFONO_CONTACTO, n.NOMBRE_TUTOR, n.VIVE_CON,
                           n.LUGAR_PERNOCTE, n.DETALLE_LUGAR_PERNOCTE, n.TIENEN_HERMANOS, n.CANT_HERMANOS,
                           n.AFILIADO_SIS, n.AFILIADO_OTRO_SEGURO, n.DETALLE_OTRO_SEGURO, n.TIENE_DISCAPACIDAD,
                           n.TIPO_DISCAPACIDAD, n.DETALLE_DISCAPACIDAD, n.SUFRE_ENFERMEDAD, n.DETALLE_ENFERMEDAD,
                           n.OBSERVACIONES_SALUD, n.ESTUDIA_ACTUALMENTE, n.NIVEL_EDUCATIVO, n.GRADO_ESTUDIO,
                           n.INSTITUCION_EDUCATIVA, n.MODALIDAD_ESTUDIO, n.DETALLE_NO_ESTUDIA, n.DATOS_F03, n.EDAD,
                           n.PRI_APE_TUT_APO, n.SEG_APE_TUT_APO, n.NOM_APE_TUT_APO, n.SEXO_APO, n.FECHA_NAC_APO,
                           n.NACIONALIDAD_APO, n.TIP_DOC_TUT_APO, n.NRO_DOC_TUT_APO, n.VIN_TUT_USU, n.LEN_MAT_APO,
                           n.AUT_IDE_ET_APO, n.TIPO_DISCAP_APO, n.CERT_DISCAP_APO, n.CARPETA_ID
                    FROM NNA n
                    WHERE n.ID = :1
                """
                # Nota: Algunos nombres de columna pueden variar levemente en la BD (ej. TIENE_HERMANOS vs TIENEN_HERMANOS)
                # Por seguridad intentamos leer la tabla NNA de forma tolerante.
                try:
                    await cur.execute(sql_nna, [nna_id])
                except Exception as e:
                    # Fallback si TIENEN_HERMANOS u otra columna fallara
                    sql_nna_fallback = """
                        SELECT n.NOMBRES, n.APELLIDO_PATERNO, n.APELLIDO_MATERNO, n.NUMERO_DOC, n.TIPO_DOC,
                               n.FECHA_NACIMIENTO, n.DOMICILIO_ACTUAL, n.REFERENCIA_DOMICILIO, n.DEPARTAMENTO_DOM,
                               n.PROVINCIA_DOM, n.DISTRITO_DOM, n.TELEFONO_CONTACTO, n.NOMBRE_TUTOR, n.VIVE_CON,
                               n.LUGAR_PERNOCTE, n.DETALLE_LUGAR_PERNOCTE, 0 as TIENEN_HERMANOS, 0 as CANT_HERMANOS,
                               n.AFILIADO_SIS, n.AFILIADO_OTRO_SEGURO, n.DETALLE_OTRO_SEGURO, n.TIENE_DISCAPACIDAD,
                               n.TIPO_DISCAPACIDAD, n.DETALLE_DISCAPACIDAD, n.SUFRE_ENFERMEDAD, n.DETALLE_ENFERMEDAD,
                               n.OBSERVACIONES_SALUD, n.ESTUDIA_ACTUALMENTE, n.NIVEL_EDUCATIVO, n.GRADO_ESTUDIO,
                               n.INSTITUCION_EDUCATIVA, n.MODALIDAD_ESTUDIO, n.DETALLE_NO_ESTUDIA, n.DATOS_F03, n.EDAD,
                               n.PRI_APE_TUT_APO, n.SEG_APE_TUT_APO, n.NOM_APE_TUT_APO, n.SEXO_APO, n.FECHA_NAC_APO,
                               n.NACIONALIDAD_APO, n.TIP_DOC_TUT_APO, n.NRO_DOC_TUT_APO, n.VIN_TUT_USU, n.LEN_MAT_APO,
                               n.AUT_IDE_ET_APO, n.TIPO_DISCAP_APO, n.CERT_DISCAP_APO, n.CARPETA_ID
                        FROM NNA n
                        WHERE n.ID = :1
                    """
                    await cur.execute(sql_nna_fallback, [nna_id])

                nna_row = await cur.fetchone()
                if not nna_row:
                    return {}
                
                ncolumns = [col[0].lower() for col in cur.description]
                nna_dict = dict(zip(ncolumns, nna_row))
                
                # Obtener el caso activo o más reciente del NNA para extraer información de calle
                await cur.execute("""
                    SELECT PERFIL, SITUACION_CALLE, TIEMPO_EN_CALLE, ACTIVIDAD_REALIZADA, ZONA_INTERVENCION, CONDICION, VICTIMA_EXPLOTACION
                    FROM NNA_CASO
                    WHERE NNA_ID = :1 AND ESTADO <> 'CERRADO'
                    ORDER BY ID DESC
                """, [nna_id])
                caso_row = await cur.fetchone()
                if not caso_row:
                    await cur.execute("""
                        SELECT PERFIL, SITUACION_CALLE, TIEMPO_EN_CALLE, ACTIVIDAD_REALIZADA, ZONA_INTERVENCION, CONDICION, VICTIMA_EXPLOTACION
                        FROM NNA_CASO
                        WHERE NNA_ID = :1
                        ORDER BY ID DESC
                    """, [nna_id])
                    caso_row = await cur.fetchone()
                
                caso_dict = {}
                if caso_row:
                    ccolumns = [col[0].lower() for col in cur.description]
                    caso_dict = dict(zip(ccolumns, caso_row))
                
                # Cargar variables cualitativas del Tutor desde columnas principales de NNA
                tutor_pri_ape = nna_dict.get('pri_ape_tut_apo') or ''
                tutor_seg_ape = nna_dict.get('seg_ape_tut_apo') or ''
                tutor_nombres = nna_dict.get('nom_ape_tut_apo') or nna_dict.get('nombre_tutor') or ''
                tutor_sexo = nna_dict.get('sexo_apo') or ''
                tutor_dni = nna_dict.get('nro_doc_tut_apo') or ''
                tutor_tip_doc = nna_dict.get('tip_doc_tut_apo') or '1'
                
                tutor_fecha_nac = nna_dict.get('fecha_nac_apo')
                if tutor_fecha_nac:
                    if hasattr(tutor_fecha_nac, 'isoformat'):
                        tutor_fecha_nac = tutor_fecha_nac.isoformat()
                    else:
                        tutor_fecha_nac = str(tutor_fecha_nac)
                else:
                    tutor_fecha_nac = ''

                tutor_nacionalidad = nna_dict.get('nacionalidad_apo') or 'PERUANA'
                tutor_parentesco = nna_dict.get('vin_tut_usu') or nna_dict.get('vive_con') or ''
                tutor_ocupacion = ''
                tutor_vive_con = 'SI'
                tutor_lengua = nna_dict.get('len_mat_apo') or '10'
                tutor_etnia = nna_dict.get('aut_ide_et_apo') or '7'
                tutor_tipo_discap = nna_dict.get('tipo_discap_apo') or ''
                tutor_discapacidad = 'SI' if (tutor_tipo_discap and tutor_tipo_discap != '6') else 'NO'
                tutor_cert_conadis = nna_dict.get('cert_discap_apo') or '99'
                tutor_conadis = 'SI' if tutor_cert_conadis in ['1', '2'] else 'NO'
                tutor_telefono = nna_dict.get('telefono_contacto') or ''

                # Consultar la tabla NNA_FAMILIAR para obtener ocupación y vive_con del tutor y lista completa de familiares
                carpeta_id = nna_dict.get('carpeta_id')
                db_familiares = []
                if carpeta_id:
                    await cur.execute("""
                        SELECT NOMBRES, PARENTESCO, DNI, TELEFONO, OCUPACION, VIVE_CON
                        FROM NNA_FAMILIAR
                        WHERE CARPETA_ID = :1
                    """, [carpeta_id])
                    fam_rows = await cur.fetchall()
                    for f_row in fam_rows:
                        f_nombres = f_row[0] or ''
                        f_parentesco = f_row[1] or ''
                        f_dni = f_row[2] or ''
                        f_telefono = f_row[3] or ''
                        f_ocupacion = f_row[4] or ''
                        f_vive_con = f_row[5] or 'NO'
                        
                        is_match = False
                        if tutor_dni and f_dni and f_dni.strip() == tutor_dni.strip():
                            is_match = True
                        elif f_nombres and tutor_nombres and (f_nombres.strip().upper() in tutor_nombres.strip().upper() or tutor_nombres.strip().upper() in f_nombres.strip().upper()):
                            is_match = True
                        elif not tutor_dni and f_parentesco in ['Madre', 'Padre', '1: Padre o madre']:
                            is_match = True
                            
                        if is_match or not tutor_ocupacion:
                            tutor_ocupacion = f_ocupacion or tutor_ocupacion
                            tutor_vive_con = f_vive_con or tutor_vive_con

                        # Mapear nombres: separamos en primer/segundo apellido y nombres
                        f_parts = f_nombres.strip().split(' ')
                        f_pri_ape = f_parts[0] if len(f_parts) > 0 else ''
                        f_seg_ape = f_parts[1] if len(f_parts) > 1 else ''
                        f_nom_only = ' '.join(f_parts[2:]) if len(f_parts) > 2 else f_nombres

                        db_familiares.append({
                            "primerApellido": f_pri_ape,
                            "segundoApellido": f_seg_ape,
                            "nombres": f_nom_only,
                            "parentesco": f_parentesco,
                            "edad": "",
                            "sexo": tutor_sexo if is_match else "",
                            "estadoCivil": "",
                            "gradoInstruccion": "",
                            "ocupacion": f_ocupacion,
                            "priApeTutApo": f_pri_ape,
                            "segApeTutApo": f_seg_ape,
                            "nomApeTutApo": f_nombres,
                            "sexoApo": tutor_sexo if is_match else "",
                            "fechaNacApo": tutor_fecha_nac if is_match else "",
                            "nacionalidadApo": tutor_nacionalidad if is_match else "PERUANA",
                            "tipDocTutApo": tutor_tip_doc if is_match else ("1" if f_dni else ""),
                            "nroDocTutApo": f_dni,
                            "vinTutUsu": f_parentesco,
                            "lenMatApo": tutor_lengua if is_match else "10",
                            "lenMatEspApo": "",
                            "autIdeEtApo": tutor_etnia if is_match else "7",
                            "autIdeEtEspApo": "",
                            "tipoDiscapApo": tutor_tipo_discap if is_match else "6",
                            "certDiscapApo": tutor_cert_conadis if is_match else "99",
                            "viveCon": f_vive_con,
                            "telefono": f_telefono,
                            "esTutorPrincipal": "true" if is_match else "false"
                        })

                familiares_list = []
                
                datos_f03_val = nna_dict.get('datos_f03')
                if datos_f03_val:
                    try:
                        if hasattr(datos_f03_val, 'read'):
                            res_read = datos_f03_val.read()
                            import inspect
                            if inspect.isawaitable(res_read):
                                f03_str = await res_read
                            else:
                                f03_str = res_read
                        else:
                            f03_str = str(datos_f03_val)
                        f03_json = json.loads(f03_str)
                        
                        # Extraer familiares para el apartado de familia
                        if 'familiares' in f03_json and isinstance(f03_json['familiares'], list):
                            familiares_list = f03_json['familiares']
                            
                            # Encontrar tutor principal por flag explicito primero
                            tutor = next((f for f in familiares_list if f.get('esTutorPrincipal') in [True, 'true', 'SI']), None)
                            if not tutor:
                                # Fallback a madre/padre/tutor legal
                                tutor = next((f for f in familiares_list if f.get('parentesco') in ['Madre', 'Padre', 'Tutor legal']), None)
                            if not tutor and familiares_list:
                                tutor = familiares_list[0]
                                
                            if tutor:
                                tutor_pri_ape = tutor_pri_ape or tutor.get('priApeTutApo') or tutor.get('primerApellido') or ''
                                tutor_seg_ape = tutor_seg_ape or tutor.get('segApeTutApo') or tutor.get('segundoApellido') or ''
                                tutor_nombres = tutor_nombres or tutor.get('nomApeTutApo') or tutor.get('nombres') or ''
                                tutor_sexo = tutor_sexo or tutor.get('sexoApo') or tutor.get('sexo') or ''
                                tutor_dni = tutor_dni or tutor.get('nroDocTutApo') or tutor.get('dni') or ''
                                tutor_tip_doc = tutor_tip_doc or tutor.get('tipDocTutApo') or tutor.get('tipoDoc') or '1'
                                tutor_fecha_nac = tutor_fecha_nac or tutor.get('fechaNacApo') or tutor.get('fechaNacimiento') or ''
                                tutor_nacionalidad = tutor_nacionalidad or tutor.get('nacionalidadApo') or tutor.get('nacionalidad') or 'PERUANA'
                                tutor_parentesco = tutor_parentesco or tutor.get('vinTutUsu') or tutor.get('parentesco') or ''
                                tutor_ocupacion = tutor_ocupacion or tutor.get('ocupacion') or ''
                                tutor_vive_con = tutor_vive_con or tutor.get('viveCon') or 'SI'
                                tutor_lengua = tutor_lengua or tutor.get('lenMatApo') or '10'
                                tutor_etnia = tutor_etnia or tutor.get('autIdeEtApo') or '7'
                                tutor_tipo_discap = tutor_tipo_discap or tutor.get('tipoDiscapApo') or ''
                                tutor_discapacidad = 'SI' if (tutor_tipo_discap and tutor_tipo_discap != '6') else 'NO'
                                tutor_cert_conadis = tutor_cert_conadis or tutor.get('certDiscapApo') or '99'
                                tutor_conadis = 'SI' if tutor_cert_conadis in ['1', '2'] else 'NO'
                                tutor_telefono = tutor_telefono or tutor.get('telefono') or ''
                    except Exception as pe:
                        print(f"[F04 COURTESY PREFILL] Error parsing JSON CLOB: {pe}")

                if not familiares_list and db_familiares:
                    familiares_list = db_familiares

                # Construir objeto cortesía con la firma de datos de Diagnóstico Social (F04)
                courtesy_f04 = {
                    "id": None,
                    "codigo_ficha_04": "F04-NUEVO-PRELLENADO",
                    "nna_id": nna_id,
                    "situacion_calle": caso_dict.get('situacion_calle') or 'TRANSITO_CALLE',
                    "tiempo_en_calle": caso_dict.get('tiempo_en_calle') or '',
                    "motivo_ingreso": '',
                    "lugar_pernota": nna_dict.get('lugar_pernocte') or '',
                    "actividad_calle": caso_dict.get('actividad_realizada') or '',
                    "consumo_sustancias": 0,
                    "nombre_tutor": f"{tutor_pri_ape} {tutor_seg_ape} {tutor_nombres}".strip() or tutor_nombres,
                    "dni_tutor": tutor_dni,
                    "direccion_tutor": nna_dict.get('domicilio_actual') or '',
                    "telefono_tutor": tutor_telefono,
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat(),
                    "datos_extra": {
                        "noTieneDNI": not bool(nna_dict.get('numero_doc')),
                        "edad": str(nna_dict.get('edad') or ''),
                        "unidadEdad": "ANIOS",
                        "direccionActual": nna_dict.get('domicilio_actual') or '',
                        "ubigeoDepto": nna_dict.get('departamento_dom') or '',
                        "ubigeoProvinc": nna_dict.get('provincia_dom') or '',
                        "ubigeoDistrito": nna_dict.get('distrito_dom') or '',
                        "referenciaDireccion": nna_dict.get('referencia_domicilio') or '',
                        "telefonoContacto": nna_dict.get('telefono_contacto') or '',
                        "tiempoEnCalle": caso_dict.get('tiempo_en_calle') or '',
                        "puntoConcentracion": caso_dict.get('zona_intervencion') or '',
                        "actividadEconomica": caso_dict.get('actividad_realizada') or '',
                        "tutorPrimerApellido": tutor_pri_ape,
                        "tutorSegundoApellido": tutor_seg_ape,
                        "tutorNombre": tutor_nombres,
                        "tutorSexo": tutor_sexo,
                        "tutorDNI": tutor_dni,
                        "tutorTipoDocumento": tutor_tip_doc,
                        "tutorFechaNacimiento": tutor_fecha_nac,
                        "tutorNacionalidad": tutor_nacionalidad,
                        "tutorParentesco": tutor_parentesco,
                        "tutorOcupacion": tutor_ocupacion,
                        "tutorViveConNna": tutor_vive_con,
                        "tutorLenguaMaterna": tutor_lengua,
                        "tutorEtnia": tutor_etnia,
                        "tutorTipoDiscapacidad": tutor_tipo_discap,
                        "tutorDiscapacidad": tutor_discapacidad,
                        "tutorCertificadoConadis": tutor_cert_conadis,
                        "tutorConadis": tutor_conadis,
                        "tutorTelefono": tutor_telefono,
                        "lugarPernocte": nna_dict.get('lugar_pernocte') or '',
                        "detalleLugarPernocte": nna_dict.get('detalle_lugar_pernocte') or '',
                        "duermeConQuien": nna_dict.get('vive_con') or '',
                        "tieneAntecedenteAlbergue": bool(nna_dict.get('tiene_antecedente_albergue') or nna_dict.get('tiene_antecedente_albergue') == 1),
                        "detalleAntecedenteAlbergue": nna_dict.get('detalle_antecedente_albergue') or '',
                        "eduNivel": nna_dict.get('nivel_educativo') or '',
                        "eduGrado": nna_dict.get('grado_estudio') or '',
                        "eduModalidad": nna_dict.get('modalidad_estudio') or '',
                        "eduEstudia": "SI" if nna_dict.get('estudia_currently') or nna_dict.get('estudia_actualmente') == 1 else "NO",
                        "eduInstitucion": nna_dict.get('institucion_educativa') or '',
                        "eduMotivoNoEstudia": nna_dict.get('detalle_no_estudia') or '',
                        "afiliadoSIS": nna_dict.get('afiliado_sis') or 'NO',
                        "afiliadoOtroSeguro": nna_dict.get('afiliado_otro_seguro') or 'NO',
                        "detalleOtroSeguro": nna_dict.get('detalle_otro_seguro') or '',
                        "tieneDiscapacidad": bool(nna_dict.get('tiene_discapacidad') or nna_dict.get('tiene_discapacidad') == 1),
                        "tipoDiscapacidad": nna_dict.get('tipo_discapacidad') or '',
                        "detalleDiscapacidad": nna_dict.get('detalle_discapacidad') or '',
                        "enfermedadCronica": bool(nna_dict.get('sufre_enfermedad') or nna_dict.get('sufre_enfermedad') == 1),
                        "detalleEnfermedadCronica": nna_dict.get('detalle_enfermedad') or '',
                        "observacionesSalud": nna_dict.get('observaciones_salud') or '',
                        "familiares": [
                            {
                                "primerApellido": f.get('priApeTutApo') or f.get('primerApellido') or (f.get('nombres', '').split(' ')[0] if f.get('nombres') else ''),
                                "segundoApellido": f.get('segApeTutApo') or f.get('segundoApellido') or (f.get('nombres', '').split(' ')[1] if f.get('nombres') and len(f.get('nombres', '').split(' ')) > 1 else ''),
                                "nombres": f.get('nomApeTutApo') or f.get('nombres') or (' '.join(f.get('nombres', '').split(' ')[2:]) if f.get('nombres') and len(f.get('nombres', '').split(' ')) > 2 else ''),
                                "parentesco": f.get('vinTutUsu') or f.get('parentesco') or '',
                                "edad": f.get('edad') or '',
                                "sexo": f.get('sexoApo') or f.get('sexo') or '',
                                "estadoCivil": f.get('estadoCivil') or '',
                                "gradoInstruccion": f.get('gradoInstruccion') or f.get('grado_estudio') or '',
                                "ocupacion": f.get('ocupacion') or '',
                                "priApeTutApo": f.get('priApeTutApo') or f.get('primerApellido') or '',
                                "segApeTutApo": f.get('segApeTutApo') or f.get('segundoApellido') or '',
                                "nomApeTutApo": f.get('nomApeTutApo') or f.get('nombres') or '',
                                "sexoApo": f.get('sexoApo') or f.get('sexo') or '',
                                "fechaNacApo": f.get('fechaNacApo') or f.get('fechaNacimiento') or '',
                                "nacionalidadApo": f.get('nacionalidadApo') or f.get('nacionalidad') or '',
                                "tipDocTutApo": f.get('tipDocTutApo') or f.get('tipoDoc') or '',
                                "nroDocTutApo": f.get('nroDocTutApo') or f.get('dni') or '',
                                "vinTutUsu": f.get('vinTutUsu') or f.get('parentesco') or '',
                                "lenMatApo": f.get('lenMatApo') or '',
                                "lenMatEspApo": f.get('lenMatEspApo') or '',
                                "autIdeEtApo": f.get('autIdeEtApo') or '',
                                "autIdeEtEspApo": f.get('autIdeEtEspApo') or '',
                                "tipoDiscapApo": f.get('tipoDiscapApo') or '',
                                "certDiscapApo": f.get('certDiscapApo') or '',
                                "viveCon": f.get('viveCon') or '',
                                "telefono": f.get('telefono') or '',
                                "esTutorPrincipal": f.get('esTutorPrincipal') or ''
                            } for f in familiares_list
                        ]
                    }
                }
                
                # Combinamos los datos en el nivel raíz para compatibilidad con _row_to_dict
                merged_courtesy = {}
                merged_courtesy.update(courtesy_f04["datos_extra"])
                for k, v in courtesy_f04.items():
                    if k != "datos_extra":
                        merged_courtesy[k] = v
                merged_courtesy["datos_extra"] = courtesy_f04["datos_extra"]
                
                return merged_courtesy

    async def update_diagnostico(self, diag_id: int, data: DiagnosticoSocialCreate) -> dict:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                sql = """
                    UPDATE DIAGNOSTICO_SOCIAL
                    SET SITUACION_CALLE = :1,
                        TIEMPO_EN_CALLE = :2,
                        MOTIVO_INGRESO = :3,
                        LUGAR_PERNOTA = :4,
                        ACTIVIDAD_CALLE = :5,
                        CONSUMO_SUSTANCIAS = :6,
                        NOMBRE_TUTOR = :7,
                        DNI_TUTOR = :8,
                        DIRECCION_TUTOR = :9,
                        TELEFONO_TUTOR = :10,
                        DATOS_EXTRA = :11,
                        UPDATED_AT = SYSTIMESTAMP
                    WHERE ID = :12
                    RETURNING UPDATED_AT INTO :13
                """
                updated_var = cur.var(oracledb.DB_TYPE_TIMESTAMP)
                datos_extra_str = json.dumps(data.datos_extra) if data.datos_extra else None
                
                await cur.execute(sql, [
                    data.situacion_calle, data.tiempo_en_calle, data.motivo_ingreso, data.lugar_pernota,
                    data.actividad_calle, 1 if data.consumo_sustancias else 0, data.nombre_tutor, data.dni_tutor,
                    data.direccion_tutor, data.telefono_tutor, datos_extra_str,
                    diag_id, updated_var
                ])
                await conn.commit()
                
                updated_time = updated_var.getvalue()[0]
                result = data.model_dump()
                result["id"] = diag_id
                result["updated_at"] = updated_time
                return result

    async def delete_diagnostico(self, diag_id: int) -> bool:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("DELETE FROM DIAGNOSTICO_SOCIAL WHERE ID = :1", [diag_id])
                await conn.commit()
                return cur.rowcount > 0
