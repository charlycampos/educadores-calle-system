import inspect
import oracledb
import json
import re
import uuid
from datetime import datetime, date
from src.infrastructure.db.connection import get_pool
from src.domain.entities.diagnostico import DiagnosticoSocialCreate

class DiagnosticoSocialAlreadyExistsError(ValueError):
    """El NNA ya cuenta con su única Ficha de Diagnóstico Social F04."""


def _resumen(valor, largo: int = 500):
    """
    Deja un texto en condiciones de entrar en una columna corta.

    Los campos largos del F04 se capturan con dictado por voz y guardan HTML:
    "motivo de su situación de calle" o "actividad que realiza" pueden ser tres
    frases con viñetas. Esas dos van a columnas VARCHAR2(500), así que un texto
    normal reventaba el guardado con ORA-12899 y el educador perdía toda la
    sesión de captura viendo solo "ocurrió un error al guardar".

    El texto íntegro no se pierde: viaja completo en DATOS_EXTRA, que es un CLOB.
    Estas columnas son la copia corta para consultar por SQL.
    """
    if valor is None:
        return None
    texto = str(valor)
    # Sin etiquetas: 500 bytes se van rápido en <p><b></b></p>, y el HTML no
    # aporta nada a una columna que solo se lee en reportes.
    texto = re.sub(r"<br\s*/?>|</p>|</li>|</div>", " ", texto, flags=re.I)
    texto = re.sub(r"<[^>]+>", "", texto)
    texto = (texto.replace("&nbsp;", " ").replace("&amp;", "&")
                  .replace("&lt;", "<").replace("&gt;", ">"))
    texto = " ".join(texto.split())
    # El corte se mide en BYTES: la columna es VARCHAR2(500) en bytes y una
    # tilde ocupa dos en AL32UTF8.
    codificado = texto.encode("utf-8")
    if len(codificado) <= largo:
        return texto or None
    return codificado[:largo - 3].decode("utf-8", errors="ignore").rstrip() + "..."


def _estado_desde(datos_extra) -> str:
    """
    BORRADOR o COMPLETO, leído del payload.

    El estado también sigue viajando dentro del CLOB porque el formulario lo
    usa, pero la columna es la que vale para el resto del sistema: las
    consultas SQL no pueden mirar dentro del JSON, y por eso los borradores
    llegaban a abrir el expediente digital.
    """
    if datos_extra and (datos_extra.get("es_borrador") or datos_extra.get("esBorrador")):
        return "BORRADOR"
    return "COMPLETO"


class OracleDiagnosticoRepository:

    # Datos del F04 que pertenecen al Resumen del Caso.
    #
    # Regla del proyecto (PRINCIPIO_RESUMEN_DEL_CASO.md): si una ficha captura
    # un dato que otras van a necesitar, ese dato SUBE al Resumen. El F04
    # corregía cuarenta datos reutilizables y solo devolvía seis: el resto
    # quedaba encerrado en el CLOB, invisible para el informe situacional, para
    # los formatos impresos y para la ficha siguiente.
    #
    # Solo se suben los campos NO vacíos: el F04 se llena progresivamente
    # durante toda la Fase I y un guardado intermedio no debe borrar en el
    # Resumen lo que ya estaba.
    CAMPOS_A_NNA = {
        # Identidad
        'apellidoPaterno':           'APELLIDO_PATERNO',
        'apellidoMaterno':           'APELLIDO_MATERNO',
        'nombres':                   'NOMBRES',
        'numeroDoc':                 'NUMERO_DOC',
        'tipoDoc':                   'TIPO_DOC',
        'detalleSinDoc':             'DETALLE_SIN_DOC',
        'sexo':                      'SEXO',
        # Domicilio y contacto
        'direccionActual':           'DOMICILIO_ACTUAL',
        'referenciaDireccion':       'REFERENCIA_DOMICILIO',
        'telefonoContacto':          'TELEFONO_CONTACTO',
        # Educación
        'eduNivel':                  'NIVEL_EDUCATIVO',
        'eduGrado':                  'GRADO_ESTUDIO',
        'eduModalidad':              'MODALIDAD_ESTUDIO',
        'eduInstitucion':            'INSTITUCION_EDUCATIVA',
        # Salud
        'afiliadoSIS':               'AFILIADO_SIS',
        'afiliadoOtroSeguro':        'AFILIADO_OTRO_SEGURO',
        'tipoDiscapacidad':          'TIPO_DISCAPACIDAD',
        'observacionesSalud':        'OBSERVACIONES_SALUD',
        # Pernocte y antecedentes
        'lugarPernocte':             'LUGAR_PERNOCTE',
        'detalleLugarPernocte':      'DETALLE_LUGAR_PERNOCTE',
        'detalleAntecedenteAlbergue': 'DETALLE_ANTECEDENTE_ALBERGUE',
    }

    async def _sync_nna_datos_basicos(self, cur, nna_id: int, datos_extra: dict):
        """Sincroniza al Resumen del Caso los datos que el F04 corrige."""
        if not datos_extra or not nna_id:
            return

        fields = {}
        for clave, columna in self.CAMPOS_A_NNA.items():
            valor = datos_extra.get(clave)
            if valor not in (None, '', []):
                fields[columna] = _resumen(valor, 500)
        if datos_extra.get('fechaNacimiento'):
            try:
                fecha = datetime.strptime(datos_extra['fechaNacimiento'], '%Y-%m-%d').date()
                fields['FECHA_NACIMIENTO'] = fecha
                # NNA.EDAD NO se toca cuando hay fecha de nacimiento: esa
                # columna guarda la edad **con la que el NNA ingresó** al
                # servicio, que es un dato histórico y no se recupera si se
                # pisa. La edad actual se calcula desde la fecha cada vez que
                # hace falta; no se almacena.
            except Exception:
                pass
        elif datos_extra.get('edad'):
            # Sin fecha de nacimiento la edad es el único dato que hay, y en el
            # diagnóstico el educador la está precisando: ahí sí se corrige.
            try:
                fields['EDAD'] = int(str(datos_extra['edad']).strip())
                fields['UNIDAD_EDAD'] = str(datos_extra.get('unidadEdad') or 'ANIOS')
            except Exception:
                pass

        if not fields:
            return

        cols = list(fields.keys())
        vals = list(fields.values())
        set_clause = ', '.join([f"{col} = :{i+1}" for i, col in enumerate(cols)])
        vals.append(nna_id)
        await cur.execute(
            f"UPDATE NNA SET {set_clause}, UPDATED_AT = SYSTIMESTAMP WHERE ID = :{len(vals)}",
            vals
        )

    async def _sync_caso(self, cur, nna_id: int, datos_extra: dict):
        """
        Sube al caso el perfil y la situación de calle corregidos en el F04.

        Sin esto, el Resumen del Caso seguía mostrando el perfil con el que se
        inscribió al NNA mientras el F04 y el informe situacional mostraban otro
        — el mismo chico con dos perfiles distintos según dónde se mirara.
        """
        det = (datos_extra or {}).get('situacionCalleDetalle') or {}
        perfil = det.get('perfil') or {}
        if not perfil:
            return

        # El perfil se captura como casillas; el caso guarda un código.
        codigo = None
        if perfil.get('trabajoInfantil'):
            codigo = 'TRABAJO_INFANTIL'
        elif perfil.get('mendicidad'):
            codigo = 'MENDICIDAD'
        elif perfil.get('vidaEnCalle'):
            codigo = 'VIDA_EN_CALLE'
        if not codigo:
            return

        await cur.execute(
            """
            UPDATE NNA_CASO
               SET PERFIL = :perfil, UPDATED_AT = SYSTIMESTAMP
             WHERE NNA_ID = :nna AND ESTADO <> 'CERRADO'
            """,
            {"perfil": codigo, "nna": nna_id},
        )

    async def _sync_familiares(self, cur, nna_id: int, datos_extra: dict):
        """
        Guarda en la familia del NNA los integrantes que el F04 registró.

        Antes se quedaban solo en el CLOB: el educador los cargaba y la ficha
        siguiente se los volvía a pedir. Es el caso más claro de la regla del
        Resumen del Caso — un dato reutilizable capturado en una ficha tiene que
        subir para que las demás lo jalen.

        Se emparejan por DNI, y por nombre completo cuando no hay documento.
        Nunca se borra nada: solo se agregan los que faltan.
        """
        familiares = (datos_extra or {}).get('familiares') or []
        if not familiares:
            return

        await cur.execute("SELECT CARPETA_ID FROM NNA WHERE ID = :1", [nna_id])
        fila = await cur.fetchone()
        carpeta_id = fila[0] if fila else None
        if not carpeta_id:
            return  # sin carpeta todavía; se sincronizará al volver a guardar

        await cur.execute(
            "SELECT UPPER(TRIM(NOMBRES)), TRIM(DNI) FROM NNA_FAMILIAR WHERE CARPETA_ID = :1",
            [carpeta_id],
        )
        existentes = await cur.fetchall()
        nombres_previos = {r[0] for r in existentes if r[0]}
        dnis_previos = {r[1] for r in existentes if r[1]}

        for f in familiares:
            nombre = " ".join(str(x or "").strip() for x in (
                f.get('primerApellido'), f.get('segundoApellido'), f.get('nombres')
            )).strip()
            nombre = " ".join(nombre.split())
            dni = str(f.get('dni') or '').strip()
            if not nombre:
                continue
            if (dni and dni in dnis_previos) or nombre.upper() in nombres_previos:
                continue

            try:
                await cur.execute(
                    """
                    INSERT INTO NNA_FAMILIAR
                        (CARPETA_ID, NOMBRES, PARENTESCO, DNI, TELEFONO, OCUPACION, VIVE_CON)
                    VALUES (:carpeta, :nombres, :parentesco, :dni, :telefono, :ocupacion, :vive)
                    """,
                    {
                        "carpeta":    carpeta_id,
                        "nombres":    _resumen(nombre, 200),
                        "parentesco": _resumen(f.get('parentesco') or 'OTRO', 50),
                        "dni":        _resumen(dni, 20) if dni else None,
                        "telefono":   _resumen(f.get('telefono'), 50),
                        "ocupacion":  _resumen(f.get('ocupacion'), 100),
                        "vive":       '1' if f.get('viveConNna') else '0',
                    },
                )
                nombres_previos.add(nombre.upper())
                if dni:
                    dnis_previos.add(dni)
            except Exception as e:
                # Un familiar que no entra no debe tumbar el guardado de la
                # ficha entera: el dato sigue en el CLOB.
                print(f"No se pudo subir el familiar '{nombre}' del NNA {nna_id}: {e}")

    async def _row_to_dict(self, row, columns) -> dict:
        d = dict(zip(columns, row))
        if 'datos_extra' in d and d['datos_extra']:
            try:
                if hasattr(d['datos_extra'], 'read'):
                    raw = d['datos_extra'].read()
                    if inspect.isawaitable(raw):
                        raw = await raw
                    extra_data = json.loads(raw)
                else:
                    extra_data = json.loads(d['datos_extra'])
            except (json.JSONDecodeError, TypeError, ValueError) as exc:
                # NO se devuelve la ficha con {} — ahí está el 90% de los datos.
                #
                # Antes se seguía adelante con un diccionario vacío: el
                # formulario se rehidrataba con solo las 15 columnas base y el
                # siguiente "Guardar" sobrescribía el CLOB con el formulario en
                # blanco. Pérdida total y silenciosa de la ficha.
                #
                # Mejor fallar y que alguien lo mire: el dato sigue en la base.
                raise ValueError(
                    f"Los datos de la ficha F04 (id {d.get('id')}) no se pueden leer: {exc}. "
                    "No se cargó nada para no arriesgar sobrescribirla."
                )
            
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
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                # El F04 es una ficha única por NNA. Tanto un borrador como una
                # ficha completa deben actualizarse; nunca se crea una segunda.
                await cur.execute(
                    "SELECT MIN(ID) FROM DIAGNOSTICO_SOCIAL WHERE NNA_ID = :1",
                    [nna_id]
                )
                existing_row = await cur.fetchone()
                if existing_row and existing_row[0]:
                    raise DiagnosticoSocialAlreadyExistsError(
                        f"El NNA ya cuenta con el Diagnóstico Social F04 ID {existing_row[0]}."
                    )

                # Resolve active case's sede_id
                await cur.execute(
                    "SELECT SEDE_ID FROM NNA_CASO WHERE NNA_ID = :1 ORDER BY ID DESC",
                    [nna_id]
                )
                row = await cur.fetchone()
                sede_id = row[0] if row else None
                if not sede_id:
                    raise ValueError("El NNA no tiene un caso con sede asignada. No se puede generar el código F04.")

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

                # Count existing F04s for this Sede to get the next number
                anio = datetime.now().year
                patron = f"F04-{sede_codigo}-{anio}-%"
                try:
                    # MAX del sufijo numérico (no COUNT): si se elimina un registro,
                    # COUNT baja y el siguiente código se duplicaría.
                    await cur.execute(
                        "SELECT MAX(TO_NUMBER(REGEXP_SUBSTR(CODIGO_FICHA_04, '[0-9]+$'))) "
                        "FROM DIAGNOSTICO_SOCIAL WHERE CODIGO_FICHA_04 LIKE :patron",
                        {"patron": patron}
                    )
                    row = await cur.fetchone()
                    num = (row[0] or 0) + 1
                except Exception as e:
                    print(f"Error obteniendo correlativo F04: {e}")
                    num = 1

                codigo_f04 = f"F04-{sede_codigo}-{anio}-{num:04d}"
                sql = """
                    INSERT INTO DIAGNOSTICO_SOCIAL (
                        CODIGO_FICHA_04, NNA_ID, ESTADO,
                        SITUACION_CALLE, TIEMPO_EN_CALLE, MOTIVO_INGRESO, LUGAR_PERNOTA,
                        ACTIVIDAD_CALLE, CONSUMO_SUSTANCIAS, NOMBRE_TUTOR, DNI_TUTOR,
                        DIRECCION_TUTOR, TELEFONO_TUTOR, DATOS_EXTRA
                    )
                    VALUES (:codigo, :nna, :estado,
                            :situacion, :tiempo, :motivo, :lugar,
                            :actividad, :consumo, :tutor, :dni,
                            :direccion, :telefono, :extra)
                    RETURNING ID, CREATED_AT, UPDATED_AT INTO :id_out, :created, :updated
                """
                id_var = cur.var(int)
                created_var = cur.var(oracledb.DB_TYPE_TIMESTAMP)
                updated_var = cur.var(oracledb.DB_TYPE_TIMESTAMP)
                
                datos_extra_str = json.dumps(data.datos_extra) if data.datos_extra else None

                consumo_val = None if data.consumo_sustancias is None else (1 if data.consumo_sustancias else 0)

                try:
                    # Mismo criterio que en el UPDATE: las columnas cortas
                    # reciben el resumen y el texto íntegro va en datos_extra.
                    await cur.execute(sql, {
                        "codigo":    codigo_f04,
                        "nna":       nna_id,
                        "estado":    _estado_desde(data.datos_extra),
                        "situacion": _resumen(data.situacion_calle, 100),
                        "tiempo":    _resumen(data.tiempo_en_calle, 100),
                        "motivo":    _resumen(data.motivo_ingreso, 500),
                        "lugar":     _resumen(data.lugar_pernota, 500),
                        "actividad": _resumen(data.actividad_calle, 500),
                        "consumo":   consumo_val,
                        "tutor":     _resumen(data.nombre_tutor, 200),
                        "dni":       _resumen(data.dni_tutor, 20),
                        "direccion": _resumen(data.direccion_tutor, 500),
                        "telefono":  _resumen(data.telefono_tutor, 50),
                        "extra":     datos_extra_str,
                        "id_out":    id_var,
                        "created":   created_var,
                        "updated":   updated_var,
                    })
                except oracledb.IntegrityError as exc:
                    if "UQ_DIAGNOSTICO_SOCIAL_NNA" in str(exc):
                        raise DiagnosticoSocialAlreadyExistsError(
                            "El NNA ya cuenta con un Diagnóstico Social F04."
                        ) from exc
                    raise
                # El F04 devuelve al Resumen del Caso lo reutilizable que
                # capturó: datos del NNA, el perfil del caso y los familiares
                # nuevos. Antes se quedaba todo encerrado en el CLOB.
                await self._sync_nna_datos_basicos(cur, nna_id, data.datos_extra)
                await self._sync_caso(cur, nna_id, data.datos_extra)
                await self._sync_familiares(cur, nna_id, data.datos_extra)
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
                return await self._row_to_dict(row, columns)

    async def get_by_nna(self, nna_id: int) -> list[dict]:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                # Paso A: Buscar si ya existe registro en DIAGNOSTICO_SOCIAL
                await cur.execute("SELECT * FROM DIAGNOSTICO_SOCIAL WHERE NNA_ID = :1 ORDER BY CREATED_AT DESC", [nna_id])
                rows = await cur.fetchall()
                if rows:
                    columns = [col[0].lower() for col in cur.description]
                    result = []
                    for r in rows:
                        result.append(await self._row_to_dict(r, columns))
                    return result
                return []

    async def get_prefilled_by_nna(self, nna_id: int) -> dict:
        def remove_accents(input_str):
            if not input_str:
                return ""
            import unicodedata
            nfkd_form = unicodedata.normalize('NFKD', str(input_str))
            return "".join([c for c in nfkd_form if not unicodedata.combining(c)]).upper().strip()

        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                # Paso B & C: precargar por cortesía desde NNA (F03)
                # Obtenemos los datos cualitativos e identificadores de la F03
                sql_nna = """
                    SELECT n.NOMBRES, n.APELLIDO_PATERNO, n.APELLIDO_MATERNO, n.NUMERO_DOC, n.TIPO_DOC,
                           n.FECHA_NACIMIENTO, n.DOMICILIO_ACTUAL, n.REFERENCIA_DOMICILIO, n.DEPARTAMENTO_DOM,
                           n.PROVINCIA_DOM, n.DISTRITO_DOM, n.TELEFONO_CONTACTO, n.NOMBRE_TUTOR, n.VIVE_CON,
                           n.LUGAR_PERNOCTE, n.DETALLE_LUGAR_PERNOCTE, n.TIENE_HERMANOS, n.CANT_HERMANOS,
                           n.AFILIADO_SIS, n.AFILIADO_OTRO_SEGURO, n.DETALLE_OTRO_SEGURO, n.TIENE_DISCAPACIDAD,
                           n.TIPO_DISCAPACIDAD, n.DETALLE_DISCAPACIDAD, n.SUFRE_ENFERMEDAD, n.DETALLE_ENFERMEDAD,
                           n.OBSERVACIONES_SALUD, n.ESTUDIA_ACTUALMENTE, n.NIVEL_EDUCATIVO, n.GRADO_ESTUDIO,
                           n.INSTITUCION_EDUCATIVA, n.MODALIDAD_ESTUDIO, n.DETALLE_NO_ESTUDIA, n.DATOS_F03, n.EDAD,
                           n.PRI_APE_TUT_APO, n.SEG_APE_TUT_APO, n.NOM_APE_TUT_APO, n.SEXO_APO, n.FECHA_NAC_APO,
                           n.NACIONALIDAD_APO, n.TIP_DOC_TUT_APO, n.NRO_DOC_TUT_APO, n.VIN_TUT_USU, n.LEN_MAT_APO,
                           n.AUT_IDE_ET_APO, n.TIPO_DISCAP_APO, n.CERT_DISCAP_APO, n.CARPETA_ID,
                           n.TIENE_ANTECEDENTE_ALBERGUE, n.DETALLE_ANTECEDENTE_ALBERGUE
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
                               n.LUGAR_PERNOCTE, n.DETALLE_LUGAR_PERNOCTE, 0 as TIENE_HERMANOS, 0 as CANT_HERMANOS,
                               n.AFILIADO_SIS, n.AFILIADO_OTRO_SEGURO, n.DETALLE_OTRO_SEGURO, n.TIENE_DISCAPACIDAD,
                               n.TIPO_DISCAPACIDAD, n.DETALLE_DISCAPACIDAD, n.SUFRE_ENFERMEDAD, n.DETALLE_ENFERMEDAD,
                               n.OBSERVACIONES_SALUD, n.ESTUDIA_ACTUALMENTE, n.NIVEL_EDUCATIVO, n.GRADO_ESTUDIO,
                               n.INSTITUCION_EDUCATIVA, n.MODALIDAD_ESTUDIO, n.DETALLE_NO_ESTUDIA, n.DATOS_F03, n.EDAD,
                               n.PRI_APE_TUT_APO, n.SEG_APE_TUT_APO, n.NOM_APE_TUT_APO, n.SEXO_APO, n.FECHA_NAC_APO,
                               n.NACIONALIDAD_APO, n.TIP_DOC_TUT_APO, n.NRO_DOC_TUT_APO, n.VIN_TUT_USU, n.LEN_MAT_APO,
                               n.AUT_IDE_ET_APO, n.TIPO_DISCAP_APO, n.CERT_DISCAP_APO, n.CARPETA_ID,
                               n.TIENE_ANTECEDENTE_ALBERGUE, n.DETALLE_ANTECEDENTE_ALBERGUE
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
                        "ubigeoDepto": remove_accents(nna_dict.get('departamento_dom')),
                        "ubigeoProvinc": remove_accents(nna_dict.get('provincia_dom')),
                        "ubigeoDistrito": remove_accents(nna_dict.get('distrito_dom')),
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
                        # El código crudo, sin colapsar a SI/NO.
                        #
                        # Antes todo lo que no fuera 1 o SI se convertía en "NO",
                        # y eso perdía dos estados que el formulario sí entiende:
                        # PROCESO (en trámite de matrícula) y NO_APLICA (menor de
                        # 3 años). Un NNA en trámite llegaba al F04 como "no
                        # matriculado", que es otra cosa.
                        "eduEstudia": str(nna_dict.get('estudia_actualmente') or '').strip().upper(),
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
                # A qué NNA pertenece REALMENTE esta ficha.
                #
                # La sincronización de datos básicos escribe sobre la tabla NNA
                # —apellidos, nombres, documento, fecha de nacimiento, edad— y
                # antes usaba el `nnaId` que mandaba el navegador, sin verificar
                # que fuera el de la ficha. Un id equivocado sobrescribía la
                # identidad de OTRO chico, en silencio y sin dejar rastro.
                #
                # No es hipotético: este sistema ya tuvo una confusión entre el
                # id de carpeta y el id de NNA.
                await cur.execute(
                    "SELECT NNA_ID FROM DIAGNOSTICO_SOCIAL WHERE ID = :1", [diag_id]
                )
                fila = await cur.fetchone()
                if not fila:
                    raise ValueError(f"No existe el diagnóstico {diag_id}")
                nna_id_real = fila[0]

                if data.nna_id and data.nna_id != nna_id_real:
                    raise ValueError(
                        f"La ficha {diag_id} pertenece al NNA {nna_id_real}, "
                        f"no al {data.nna_id}. No se guardó nada."
                    )

                # El estado va a columna propia, no solo dentro del CLOB: las
                # consultas SQL no pueden leer el JSON, y por eso siete lugares
                # del sistema contaban los borradores como F04 terminados —entre
                # ellos el que abre el expediente digital.
                estado = _estado_desde(data.datos_extra)

                # Binds por nombre: con 13 posiciones, agregar una columna en el
                # medio desplazaba todas las siguientes en silencio.
                sql = """
                    UPDATE DIAGNOSTICO_SOCIAL
                    SET ESTADO             = :estado,
                        SITUACION_CALLE    = :situacion,
                        TIEMPO_EN_CALLE    = :tiempo,
                        MOTIVO_INGRESO     = :motivo,
                        LUGAR_PERNOTA      = :lugar,
                        ACTIVIDAD_CALLE    = :actividad,
                        CONSUMO_SUSTANCIAS = :consumo,
                        NOMBRE_TUTOR       = :tutor,
                        DNI_TUTOR          = :dni,
                        DIRECCION_TUTOR    = :direccion,
                        TELEFONO_TUTOR     = :telefono,
                        DATOS_EXTRA        = :extra,
                        UPDATED_AT         = SYSTIMESTAMP
                    WHERE ID = :diag_id
                    RETURNING UPDATED_AT INTO :updated
                """
                updated_var = cur.var(oracledb.DB_TYPE_TIMESTAMP)
                datos_extra_str = json.dumps(data.datos_extra) if data.datos_extra else None
                
                consumo_val = None if data.consumo_sustancias is None else (1 if data.consumo_sustancias else 0)
                
                # Las columnas de texto pasan por _resumen: son VARCHAR2 cortas
                # y reciben campos dictados sin tope. El texto completo ya viaja
                # en datos_extra.
                await cur.execute(sql, {
                    "estado":    estado,
                    "situacion": _resumen(data.situacion_calle, 100),
                    "tiempo":    _resumen(data.tiempo_en_calle, 100),
                    "motivo":    _resumen(data.motivo_ingreso, 500),
                    "lugar":     _resumen(data.lugar_pernota, 500),
                    "actividad": _resumen(data.actividad_calle, 500),
                    "consumo":   consumo_val,
                    "tutor":     _resumen(data.nombre_tutor, 200),
                    "dni":       _resumen(data.dni_tutor, 20),
                    "direccion": _resumen(data.direccion_tutor, 500),
                    "telefono":  _resumen(data.telefono_tutor, 50),
                    "extra":     datos_extra_str,
                    "diag_id":   diag_id,
                    "updated":   updated_var,
                })
                # Se sincroniza contra el NNA de la ficha, nunca contra el que
                # venga en el payload.
                await self._sync_nna_datos_basicos(cur, nna_id_real, data.datos_extra)
                await self._sync_caso(cur, nna_id_real, data.datos_extra)
                await self._sync_familiares(cur, nna_id_real, data.datos_extra)
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
