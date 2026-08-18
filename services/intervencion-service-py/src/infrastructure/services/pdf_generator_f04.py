import os
import json
from html import escape
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.units import inch
from src.infrastructure.services.texto_rico import html_a_reportlab


# ── Catálogos (mismos values/labels que usa el formulario F04 en el frontend) ──

MAP_SEXO = {"1": "Masculino", "2": "Femenino"}

MAP_TIPO_DOC = {"1": "DNI", "2": "Carné de extranjería", "3": "Pasaporte", "7": "No tiene"}

MAP_VINCULO = {
    "1": "Padre o madre", "2": "Tío/a", "3": "Abuelo/a", "4": "Hermano/a",
    "5": "Otro familiar", "6": "Otro no familiar",
}

MAP_LENGUA = {
    "1": "Quechua", "2": "Aimara", "3": "Asháninka", "4": "Awajún/Aguaruna",
    "5": "Shipibo-Conibo", "6": "Shawi/Chayahuita", "7": "Matsigenka/Machiguenga",
    "8": "Achuar", "9": "Otra lengua indígena u originaria", "10": "Castellano",
    "11": "Portugués", "12": "Otra lengua extranjera", "13": "Lengua de señas peruana",
    "14": "No escucha ni habla", "16": "No responde / No sabe", "99": "No aplica",
}

MAP_ETNIA = {
    "1": "Quechua", "2": "Aimara", "3": "Indígena u originario de la Amazonía",
    "4": "Parte de otro pueblo indígena", "5": "Afrodescendiente", "6": "Blanco",
    "7": "Mestizo", "8": "Otro",
}

MAP_DISCAP = {
    "1": "Motriz o física", "2": "Sensorial", "3": "Cognitivo-intelectual",
    "4": "Psicosocial o psíquica", "5": "Más de una discapacidad", "6": "Ninguna",
}

MAP_CERT_CONADIS = {
    "1": "Sí, tiene Certificado", "2": "Sí tiene, pero no lo porta",
    "3": "No cuenta con Certificado", "4": "En trámite", "99": "No aplica",
}

MAP_EDU_ESTUDIA = {
    "SI": "Sí (con ficha de matrícula)", "NO": "No (no matriculado)",
    "PROCESO": "En proceso de matrícula", "NO_APLICA": "No aplica",
}

MAP_EDU_NIVEL = {
    "1": "Sin nivel", "2": "Inicial", "3": "Primaria Incompleta", "4": "Primaria Completa",
    "5": "Secundaria Incompleta", "6": "Secundaria Completa",
    "7": "Superior No Universitaria Incompleta", "8": "Superior No Universitaria Completa",
    "9": "Superior Universitario Incompleto", "10": "Superior Universitario Completo",
    "11": "Básica Especial",
}

MAP_EDU_GRADO = {
    "1": "Inicial", "2": "1ro primaria", "3": "2do primaria", "4": "3ro primaria",
    "5": "4to primaria", "6": "5to primaria", "7": "6to primaria",
    "8": "1ro secundaria", "9": "2do secundaria", "10": "3ro secundaria",
    "11": "4to secundaria", "12": "5to secundaria",
    "13": "Ciclo I (EBA)", "14": "Ciclo II (EBA)", "15": "Ciclo III (EBA)",
    "16": "Ciclo IV (EBA)", "17": "Ciclo V (EBA)", "18": "Ciclo VI (EBA)",
    "19": "Ciclo VII (EBA)", "20": "Ciclo VIII (EBA)", "21": "Ciclo IX (EBA)",
    "22": "Ciclo X (EBA)", "99": "No aplica",
}

MAP_EDU_MODALIDAD = {
    "1": "Básica / regular (EBR)", "2": "Alternativa (EBA)", "3": "Especial (EBE)",
    "4": "Superior Técnica", "5": "Superior Universitaria", "6": "CETPRO",
}

MAP_SI_NO_AVECES = {"SI": "Sí", "NO": "No", "A_VECES": "A veces", "A VECES": "A veces"}

DIAS_LABEL = {
    "lunes": "Lun", "martes": "Mar", "miercoles": "Mié", "jueves": "Jue",
    "viernes": "Vie", "sabado": "Sáb", "domingo": "Dom",
}

# Orden de la semana: los diccionarios de la agenda no garantizan que los días
# vengan en orden, y "Mié, Lun, Vie" en un documento oficial se lee mal.
_ORDEN_DIAS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"]


def formatear_agenda(agenda: dict) -> str:
    """La agenda semanal, legible.

    Cada día llega como {'activo': True, 'turno1Inicio': '08:00', ...}. El PDF
    lo imprimía tal cual, así que en el documento salía el diccionario de
    Python entero. Acá se traduce a "Lun 08:00-12:00" y se omiten los días
    inactivos, que son ruido en una ficha que se imprime y se archiva.
    """
    if not isinstance(agenda, dict):
        return ""

    partes = []
    for dia in _ORDEN_DIAS + [d for d in agenda if d not in _ORDEN_DIAS]:
        datos = agenda.get(dia)
        if not datos:
            continue
        etiqueta = DIAS_LABEL.get(dia, str(dia).capitalize())

        # Formas antiguas: lista de rangos o texto suelto.
        if isinstance(datos, list):
            if datos:
                partes.append(f"{etiqueta} {', '.join(map(str, datos))}")
            continue
        if not isinstance(datos, dict):
            partes.append(f"{etiqueta} {datos}")
            continue

        if not datos.get("activo"):
            continue
        turnos = []
        for ini, fin in (("turno1Inicio", "turno1Fin"), ("turno2Inicio", "turno2Fin")):
            desde, hasta = (datos.get(ini) or "").strip(), (datos.get(fin) or "").strip()
            if desde and hasta:
                turnos.append(f"{desde}-{hasta}")
            elif desde:
                turnos.append(f"desde {desde}")
        partes.append(f"{etiqueta} {' y '.join(turnos)}".strip() if turnos else etiqueta)

    return " · ".join(partes)


def generate_f04_pdf(diag_data: dict, nna_data: dict, output_path: str) -> str:
    """
    Genera el PDF de la Ficha de Diagnóstico Social F04 con TODAS las secciones
    del formulario (I-IX), traduciendo los códigos a sus etiquetas de catálogo.

    :param diag_data: dict con columnas de DIAGNOSTICO_SOCIAL + datos_extra ya parseado como dict
    :param nna_data:  dict con nombre, apellidos, DNI, fecha nacimiento del NNA
    :param output_path: ruta física donde se guarda el PDF
    :return: ruta del PDF generado
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        leftMargin=36, rightMargin=36,
        topMargin=36, bottomMargin=36,
    )

    story = []
    styles = getSampleStyleSheet()

    PRIMARY  = colors.HexColor("#4F46E5")
    TEXT     = colors.HexColor("#1F2937")
    BG_LIGHT = colors.HexColor("#F9FAFB")
    BORDER   = colors.HexColor("#E5E7EB")

    title_style    = ParagraphStyle("T",   parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=14, textColor=PRIMARY,              alignment=1, spaceAfter=2)
    subtitle_style = ParagraphStyle("S",   parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=9,  textColor=colors.HexColor("#7C3AED"), alignment=1, spaceAfter=10)
    section_style  = ParagraphStyle("Sec", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=10, textColor=colors.white)
    label_style    = ParagraphStyle("L",   parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=8,  textColor=colors.HexColor("#374151"), leading=10)
    value_style    = ParagraphStyle("V",   parent=styles["Normal"], fontName="Helvetica",      fontSize=8,  textColor=TEXT,                       leading=10)
    footer_style   = ParagraphStyle("F",   parent=styles["Normal"], fontName="Helvetica",      fontSize=7,  textColor=colors.grey,                alignment=1)
    firma_style    = ParagraphStyle("Fi",  parent=styles["Normal"], fontName="Helvetica",      fontSize=8,  alignment=1)

    # ── helpers ──────────────────────────────────────────────────────────

    def sec_header(text):
        p = Paragraph(text.upper(), section_style)
        t = Table([[p]], colWidths=[doc.width])
        t.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), PRIMARY),
            ("TOPPADDING",    (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ]))
        return t

    def make_table(rows, col_widths=None):
        if not col_widths:
            n = len(rows[0])
            col_widths = [doc.width / n] * n
        t = Table(rows, colWidths=col_widths)
        label_cols = list(range(0, len(rows[0]), 2))
        style_cmds = [
            ("GRID",    (0, 0), (-1, -1), 0.4, BORDER),
            ("PADDING", (0, 0), (-1, -1), 4),
            ("VALIGN",  (0, 0), (-1, -1), "MIDDLE"),
        ]
        for col in label_cols:
            style_cmds.append(("BACKGROUND", (col, 0), (col, -1), BG_LIGHT))
        t.setStyle(TableStyle(style_cmds))
        return t

    def grid_table(hdr_texts, data_rows, col_widths):
        hdr = [[Paragraph(h, label_style) for h in hdr_texts]]
        t = Table(hdr + data_rows, colWidths=col_widths)
        t.setStyle(TableStyle([
            ("GRID",           (0, 0), (-1, -1), 0.4, BORDER),
            ("BACKGROUND",     (0, 0), (-1,  0), PRIMARY),
            ("TEXTCOLOR",      (0, 0), (-1,  0), colors.white),
            ("FONTNAME",       (0, 0), (-1,  0), "Helvetica-Bold"),
            ("FONTSIZE",       (0, 0), (-1, -1), 8),
            ("PADDING",        (0, 0), (-1, -1), 4),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
        ]))
        return t

    def c(val, default="-"):
        if val is None or str(val).strip() in ("", "None", "null", "undefined"):
            return default
        return str(val).strip()

    def tr(val, mapa, default="-"):
        """Traduce un código de catálogo a su etiqueta. Si no está en el mapa, muestra el valor tal cual."""
        s = c(val, "")
        if not s:
            return default
        # tolerar valores tipo '1: DNI' guardados por versiones antiguas
        code = s.split(":")[0].strip()
        return mapa.get(code, s)

    def yesno(val):
        if val is True or str(val).upper() in ("SI", "TRUE", "1", "YES", "SÍ"):
            return "SÍ"
        return "NO"

    def sino_nd(val):
        """
        SÍ / NO / — para las preguntas que admiten "no se sabe".

        `yesno` devuelve "NO" ante `None`, y en un documento oficial eso
        convierte "nadie respondió" en una negación afirmada. Con explotación
        sexual eso es especialmente grave: el PDF declaraba que el NNA no es
        víctima cuando en realidad nunca se preguntó.
        """
        if val is None or val == "":
            return "—"
        return yesno(val)

    def sina(val):
        """SI / NO / A VECES."""
        s = c(val, "")
        if s == "":
            return "-"
        if isinstance(val, bool):
            return "SÍ" if val else "NO"
        return MAP_SI_NO_AVECES.get(s.upper(), s)

    def fecha(val):
        s = c(val, "")
        if not s:
            return "-"
        s = s[:10]
        try:
            return datetime.strptime(s, "%Y-%m-%d").strftime("%d/%m/%Y")
        except Exception:
            return s

    def marcas(dic, etiquetas):
        """Convierte un dict de checkboxes {clave: bool} en 'Etiqueta1, Etiqueta2'."""
        dic = dic or {}
        res = [etiquetas.get(k, k.capitalize()) for k, v in dic.items() if v]
        return ", ".join(res) or "-"

    def L(text):
        return Paragraph(c(text), label_style)

    def V(text, default="-"):
        # Pasa por el conversor porque varios campos del F04 —actividad en
        # calle, motivo, observaciones de salud— se capturan con formato y se
        # guardan como HTML. Reportlab aborta el PDF entero con una etiqueta que
        # no conoce; los valores sin etiquetas salen intactos.
        return Paragraph(html_a_reportlab(c(text, default)), value_style)

    # ── datos_extra ───────────────────────────────────────────────────────
    extra = diag_data.get("datos_extra") or {}
    if isinstance(extra, str):
        try:
            extra = json.loads(extra)
        except Exception:
            extra = {}

    # ── cabecera ──────────────────────────────────────────────────────────
    codigo     = c(diag_data.get("codigo_ficha_04"), "F04-BORRADOR")
    nna_nombre = f"{c(nna_data.get('nombres'))} {c(nna_data.get('apellidoPaterno'))} {c(nna_data.get('apellidoMaterno'))}".strip(" -")

    story.append(Paragraph("SISTEMA DE GESTIÓN DE CASOS — SEC / INABIF", title_style))
    story.append(Paragraph(f"FICHA DE DIAGNÓSTICO SOCIAL F04 · Nº {codigo}", subtitle_style))

    # ── I. Datos Generales ────────────────────────────────────────────────
    story.append(sec_header("I. Datos Generales del NNA"))
    story.append(Spacer(1, 4))

    ubigeo = " / ".join(filter(lambda x: x != "-", [
        c(extra.get("ubigeoDepto")), c(extra.get("ubigeoProvinc")), c(extra.get("ubigeoDistrito"))
    ])) or "-"

    fn = extra.get("fechaNacimiento") or nna_data.get("fechaNacimiento") or ""

    partida = extra.get("tienePartidaNacimiento")
    partida_str = "SÍ" if partida in (True, "true", "SI", 1) else ("NO" if partida in (False, "false", "NO", 0) else "-")
    if partida_str == "NO" and c(extra.get("detalleSinDoc"), ""):
        partida_str += f" — {c(extra.get('detalleSinDoc'))}"

    w4 = doc.width / 4

    sec1 = [
        [L("Apellidos y Nombres:"), V(nna_nombre),                          L("Sexo:"),               V(tr(extra.get("sexo"), MAP_SEXO))],
        [L("Tipo Doc / Nº:"),       V(f"{tr(extra.get('tipoDoc') or nna_data.get('tipoDoc'), MAP_TIPO_DOC)} — {c(extra.get('numeroDoc') or nna_data.get('numeroDoc'))}"),
                                                                             L("Partida Nacimiento:"), V(partida_str)],
        [L("Fecha Nacimiento:"),    V(fecha(fn)),                           L("Edad:"),               V(f"{c(extra.get('edad'))} {c(extra.get('unidadEdad', 'años')).lower()}")],
        [L("Dirección:"),           V(extra.get("direccionActual")),        L("Referencia:"),         V(extra.get("referenciaDireccion"))],
        [L("Ubigeo:"),              V(ubigeo),                              L("Teléfono:"),           V(extra.get("telefonoContacto"))],
        [L("Inicio Aplicación:"),   V(fecha(extra.get("fechaInicioAplicacion"))),
                                                                             L("Fin Aplicación:"),     V(fecha(extra.get("fechaFinAplicacion")))],
    ]
    story.append(make_table(sec1, [w4, w4, w4, w4]))
    story.append(Spacer(1, 8))

    # ── II. Situación de Calle ────────────────────────────────────────────
    story.append(sec_header("II. Situación de Calle"))
    story.append(Spacer(1, 4))

    det    = extra.get("situacionCalleDetalle") or {}
    perfil = det.get("perfil") or {}
    tiempo = det.get("tiempo") or {}
    consumo= det.get("consumo") or {}
    oblig  = det.get("obligado") or {}
    escap  = det.get("escapoCasa") or {}
    acomp  = det.get("acompanamiento") or {}

    perfil_str = (
        "Trabajo Infantil" if perfil.get("trabajoInfantil") else
        "Mendicidad"       if perfil.get("mendicidad")       else
        "Vida en Calle (Tránsito)"    if perfil.get("transito")      else
        "Vida en Calle (Convivencia)" if perfil.get("convivencia")   else
        "Vida en Calle"    if perfil.get("vidaEnCalle")      else
        c(diag_data.get("situacion_calle"))
    )

    tiempo_calle = f"{c(tiempo.get('cantidad'))} {c(tiempo.get('unidad'))}".strip("- ")
    if not tiempo_calle or tiempo_calle == "- -":
        tiempo_calle = c(diag_data.get("tiempo_en_calle"))

    modal_str = marcas(det.get("modalidadTrabajo"), {"puestoFijo": "Puesto Fijo", "ambulante": "Ambulante", "recorre": "Recorre"})
    horarios_str   = marcas(det.get("horarios"),   {"manana": "Mañana", "tarde": "Tarde", "noche": "Noche", "madrugada": "Madrugada"})
    frecuencia_str = marcas(det.get("frecuencia"), {"diario": "Diario", "interdiario": "Interdiario", "finesSemana": "Fines de semana", "temporadas": "Temporadas"})
    uso_dinero_str = marcas(det.get("usoDinero"),  {"gastosFamiliares": "Gastos familiares", "gastosPropios": "Gastos propios", "entregaOtraPersona": "Entrega a otra persona"})

    acomp_str = marcas(acomp, {"solo": "Solo", "acompanado": "Acompañado", "acompanadoFamiliar": "Acompañado por familiar", "quien": ""})
    if c(acomp.get("quien"), ""):
        acomp_str = (acomp_str + f" — {c(acomp.get('quien'))}").strip("- ")

    consumo_tiempo = f"{c(consumo.get('tiempo'))} {c(consumo.get('unidadTiempo'))}".strip("- ")

    sec2 = [
        [L("Perfil:"),            V(perfil_str),                          L("Tiempo en Calle:"),     V(tiempo_calle)],
        [L("Motivo:"),            V(det.get("motivo") or diag_data.get("motivo_ingreso")),
                                                                            L("Lugar / Zona:"),         V(det.get("lugar") or diag_data.get("lugar_pernota"))],
        [L("Actividad:"),         V(det.get("actividad") or extra.get("actividadEconomica") or diag_data.get("actividad_calle")),
                                                                            L("Punto Concentración:"),  V(extra.get("puntoConcentracion"))],
        [L("Horarios:"),          V(horarios_str),                         L("Frecuencia:"),           V(frecuencia_str)],
        [L("Ingreso Semanal:"),   V(f"S/ {c(det.get('ingresoSemanal'))}"), L("Uso del Dinero:"),       V(uso_dinero_str)],
        [L("Modalidad Trabajo:"), V(modal_str),                            L("Acompañamiento:"),       V(acomp_str)],
        [L("Víctima Explotación:"), V(sino_nd(det.get("explotacionSexual"))), L("¿Obligado?:"),        V(f"{sino_nd(oblig.get('si'))} — {c(oblig.get('quien'))}".strip("- "))],
        [L("¿Escapó de casa?:"),  V(f"{yesno(escap.get('si'))} — {c(escap.get('veces'))} veces" if escap.get("si") else yesno(escap.get("si"))),
                                                                            L("Consumo Sustancias:"),   V(yesno(consumo.get("si")))],
        [L("Tipo Sustancia:"),    V(consumo.get("tipo")),                  L("Frec. / Tiempo:"),       V(f"{c(consumo.get('frecuencia'))} — {consumo_tiempo}".strip("- "))],
    ]
    story.append(make_table(sec2, [w4, w4, w4, w4]))
    story.append(Spacer(1, 4))

    # Grilla de actividades en calle (desglosadas)
    actividades = extra.get("actividadesCalle") or []
    if actividades:
        act_rows = []
        for a in actividades:
            nombre = a.get("actividad") or ""
            if str(nombre).upper().startswith("OTRO") and a.get("actividadEspecifique"):
                nombre = a["actividadEspecifique"]
            permanencia = a.get("permanencia") or a.get("tiempo")
            if not permanencia and a.get("tiempoValor"):
                permanencia = f'{a.get("tiempoValor")} {str(a.get("tiempoUnidad") or "").lower()}'.strip()
            act_rows.append([
                Paragraph(c(str(nombre).replace("_", " ")), value_style),
                Paragraph(c(a.get("acompanamiento") or a.get("acompanado")), value_style),
                Paragraph(c(permanencia), value_style),
                Paragraph(c(formatear_agenda(a.get("agenda") or {})), value_style),
            ])
        c4 = doc.width / 4
        story.append(grid_table(
            ["Actividad / Trabajo", "Acompañamiento", "Permanencia", "Agenda Semanal"],
            act_rows,
            [c4 * 1.1, c4 * 0.7, c4 * 0.7, c4 * 1.5],
        ))
    story.append(Spacer(1, 8))

    # ── III. Tutor / Apoderado ────────────────────────────────────────────
    story.append(sec_header("III. Tutor / Familiar Responsable"))
    story.append(Spacer(1, 4))

    tutor_nombre = " ".join(filter(lambda x: x not in ("-", ""), [
        c(extra.get("tutorPrimerApellido")),
        c(extra.get("tutorSegundoApellido")),
        c(extra.get("tutorNombre")),
    ])).strip() or c(diag_data.get("nombre_tutor"))

    discap_tutor = tr(extra.get("tutorTipoDiscapacidad"), MAP_DISCAP, "Ninguna")
    conadis_str  = tr(extra.get("tutorCertificadoConadis"), MAP_CERT_CONADIS)

    sec3 = [
        [L("Apellidos y Nombres:"), V(tutor_nombre),                                    L("Vínculo con NNA:"),   V(tr(extra.get("tutorParentesco"), MAP_VINCULO))],
        [L("Tipo Doc / Nº:"),       V(f"{tr(extra.get('tutorTipoDocumento'), MAP_TIPO_DOC)} — {c(extra.get('tutorDNI') or diag_data.get('dni_tutor'))}"),
                                                                                          L("Teléfono:"),          V(extra.get("tutorTelefono") or diag_data.get("telefono_tutor"))],
        [L("Sexo:"),                V(tr(extra.get("tutorSexo"), MAP_SEXO)),             L("Fecha Nacimiento:"),  V(fecha(extra.get("tutorFechaNacimiento")))],
        [L("Nacionalidad:"),        V(extra.get("tutorNacionalidad")),                   L("Ocupación:"),         V(extra.get("tutorOcupacion"))],
        [L("Lengua Materna:"),      V(tr(extra.get("tutorLenguaMaterna"), MAP_LENGUA)),  L("Autoident. Étnica:"), V(tr(extra.get("tutorEtnia"), MAP_ETNIA))],
        [L("Grado Instrucción:"),   V(c(extra.get("tutorGradoInstruccion")).replace("_", " ").capitalize()),
                                                                                          L("Estado Civil:"),      V(extra.get("tutorEstadoCivil"))],
        [L("¿Vive con NNA?:"),      V(sina(extra.get("tutorViveConNna"))),               L("Ingreso Semanal:"),   V(f"S/ {c(extra.get('tutorIngreso'))}")],
        [L("Discapacidad:"),        V(discap_tutor),                                      L("Cert. CONADIS:"),     V(conadis_str)],
        [L("Consumo Drogas:"),      V(sina(extra.get("tutorConsumoDrogas"))),            L("Recibe Apoyo Alim.:"),V(sina(extra.get("tutorRecibeApoyo")))],
        [L("Demanda Alimentos:"),   V(sina(extra.get("tutorDeseaDemanda"))),             L(""),                   V("", "")],
    ]
    story.append(make_table(sec3, [w4, w4, w4, w4]))
    story.append(Spacer(1, 8))

    # ── IV. Composición Familiar ──────────────────────────────────────────
    familiares = extra.get("familiares") or []
    if familiares:
        story.append(sec_header("IV. Composición Familiar"))
        story.append(Spacer(1, 4))

        rows = []
        for f in familiares:
            full = " ".join(filter(lambda x: x not in ("-", ""), [
                c(f.get("primerApellido")), c(f.get("segundoApellido")), c(f.get("nombres"))
            ])).strip()
            rows.append([
                Paragraph(full, value_style),
                Paragraph(tr(f.get("parentesco") or f.get("vinTutUsu"), MAP_VINCULO), value_style),
                Paragraph(c(f.get("edad")),                              value_style),
                Paragraph(tr(f.get("sexo") or f.get("sexoApo"), MAP_SEXO), value_style),
                Paragraph(c(f.get("nroDocTutApo") or f.get("dni")),     value_style),
                Paragraph(c(f.get("ocupacion")),                         value_style),
                Paragraph(sina(f.get("viveCon")),                        value_style),
            ])

        c7 = doc.width / 7
        story.append(grid_table(
            ["Apellidos y Nombres", "Parentesco", "Edad", "Sexo", "DNI", "Ocupación", "Vive c/ NNA"],
            rows,
            [c7 * 1.9, c7 * 1.0, c7 * 0.5, c7 * 0.7, c7 * 0.8, c7 * 1.3, c7 * 0.8],
        ))
        story.append(Spacer(1, 4))

    din = extra.get("dinamicaFamiliar") or {}
    if din:
        din_rows = [
            [L("Contacto Familiar:"), V(sina(din.get("contacto"))), L("Frecuencia:"),    V(c(din.get("frecuencia")).replace("_", " ").capitalize())],
            [L("Rol Protector:"),     V(sina(din.get("rolProtector"))), L("Rol Proveedor:"), V(sina(din.get("rolProveedor")))],
        ]
        story.append(make_table(din_rows, [w4, w4, w4, w4]))
    story.append(Spacer(1, 8))

    # ── V. Vivienda ───────────────────────────────────────────────────────
    story.append(sec_header("V. Vivienda"))
    story.append(Spacer(1, 4))

    servicios = marcas(extra.get("serviciosBasicos"), {"agua": "Agua", "luz": "Luz", "desague": "Desagüe", "otros": "Otros"})

    duerme_det = sina(extra.get("duermeCama"))
    if c(extra.get("duermeSoloAcompanado"), "") and duerme_det == "SÍ":
        duerme_det += f" — {c(extra.get('duermeSoloAcompanado')).capitalize()}"

    albergue = yesno(extra.get("tieneAntecedenteAlbergue"))
    albergue_det = f"{c(extra.get('tiempoAlbergue'))} — {c(extra.get('detalleAntecedenteAlbergue'))}".strip("- ") or "-"

    sec5 = [
        [L("Material:"),          V(c(extra.get("materialVivienda")).capitalize()), L("Nº Ambientes:"),      V(extra.get("numeroAmbientes"))],
        [L("Propiedad:"),         V(c(extra.get("propiedadVivienda")).capitalize()),L("Inscrita en SISFOH:"),V(sina(extra.get("viviendaSisfoh")))],
        [L("Servicios Básicos:"), V(servicios),                                     L("Higiene domicilio:"), V(c(extra.get("higieneDomicilio")).capitalize())],
        [L("Duerme en cama:"),    V(duerme_det),                                    L("Duerme con quién:"),  V(extra.get("duermeConQuien"))],
        [L("Lugar de Pernocte:"), V(f"{c(extra.get('lugarPernocte'))} {c(extra.get('detalleLugarPernocte'), '')}".strip("- ")),
                                                                                     L("Antec. Albergue:"),   V(f"{albergue} — {albergue_det}".strip("- ") if albergue == "SÍ" else albergue)],
    ]
    story.append(make_table(sec5, [w4, w4, w4, w4]))
    story.append(Spacer(1, 8))

    # ── VI. Educación ─────────────────────────────────────────────────────
    story.append(sec_header("VI. Educación"))
    story.append(Spacer(1, 4))

    atraso = yesno(extra.get("presentaAtraso"))
    if atraso == "SÍ":
        atraso += f" — {c(extra.get('tiempoAtraso'))} / {c(extra.get('motivoAtraso')).replace('_', ' ').capitalize()}".strip("- /")

    conducta = yesno(extra.get("problemasConducta"))
    if conducta == "SÍ" and c(extra.get("intensidadConducta"), ""):
        conducta += f" ({c(extra.get('intensidadConducta')).capitalize()})"

    expulsado = yesno(extra.get("expulsado"))
    if expulsado == "SÍ" and c(extra.get("vecesExpulsado"), ""):
        expulsado += f" — {c(extra.get('vecesExpulsado'))} veces"

    situacion_educativa = c(extra.get("eduEstudia"))
    if situacion_educativa in ("SI", "PROCESO"):
        sec6 = [
            [L("¿Estudia? / Matrícula:"), V(tr(situacion_educativa, MAP_EDU_ESTUDIA)), L("Nivel Educativo:"),  V(tr(extra.get("eduNivel"), MAP_EDU_NIVEL))],
            [L("Grado / Año:"),           V(tr(extra.get("eduGrado"), MAP_EDU_GRADO)),L("Modalidad:"),        V(tr(extra.get("eduModalidad"), MAP_EDU_MODALIDAD))],
            [L("Institución Ed.:"),       V(extra.get("eduInstitucion")),             L("Turno:"),            V(c(extra.get("eduTurno")).capitalize())],
            [L("Tipo de I.E.:"),          V(c(extra.get("eduTipoIE")).capitalize()),  L("Motivo no estudia:"),V(extra.get("eduMotivoNoEstudia"))],
            [L("Atraso escolar:"),        V(atraso),                                   L("Prob. Aprendizaje:"),V(yesno(extra.get("problemasAprendizaje")))],
            [L("Prob. Conducta:"),        V(conducta),                                 L("Ha sido expulsado:"),V(expulsado)],
            [L("Faltas/Tardanzas:"),      V(yesno(extra.get("faltasTardanzas"))),      L("Se duerme en clase:"),V(yesno(extra.get("seDuermeClase")))],
            [L("Sufre Bullying:"),        V(yesno(extra.get("sufreBullying"))),        L("Tutor conversa c/ docente:"), V(yesno(extra.get("tutorConversaDocente")))],
        ]
    else:
        sec6 = [[
            L("¿Estudia? / Matrícula:"), V(tr(situacion_educativa, MAP_EDU_ESTUDIA)),
            L("Motivo no estudia:"),     V(extra.get("eduMotivoNoEstudia")),
        ]]
    story.append(make_table(sec6, [w4, w4, w4, w4]))
    story.append(Spacer(1, 8))

    # ── VII. Salud – Alimentación – Higiene ───────────────────────────────
    story.append(sec_header("VII. Salud – Alimentación – Higiene"))
    story.append(Spacer(1, 4))

    prob_salud = marcas(extra.get("problemasSaludTipo"), {
        "piel": "Piel", "desnutricion": "Desnutrición", "respiratorios": "Respiratorios",
        "its": "ITS", "otros": "Otros",
    })
    if c(extra.get("problemasSaludOtroDetalle"), ""):
        prob_salud += f" — {c(extra.get('problemasSaludOtroDetalle'))}"

    otro_seguro = sina(extra.get("afiliadoOtroSeguro"))
    if c(extra.get("detalleOtroSeguro"), ""):
        otro_seguro += f" — {c(extra.get('detalleOtroSeguro'))}"

    discap_nna = yesno(extra.get("tieneDiscapacidad"))
    enf = yesno(extra.get("enfermedadCronica"))
    if enf == "SÍ":
        enf += f" — {c(extra.get('detalleEnfermedadCronica'))}".strip("- ")
        enf += f" (Tratamiento: {yesno(extra.get('recibeTratamientoEnfermedad'))})"

    psico = yesno(extra.get("problemaPsicologico"))
    indicadores = marcas(extra.get("tipoIndicadorPsicologico"), {
        "autoestimaBaja": "Autoestima baja", "depresion": "Depresión",
        "ansiedad": "Ansiedad", "impulsividad": "Impulsividad",
    })
    if psico == "SÍ" and indicadores != "-":
        psico += f" — {indicadores}"

    sustancias = yesno(extra.get("consumeSustancias"))
    if sustancias == "SÍ":
        sustancias += f" — {c(extra.get('tipoSustancias'))} (Tratamiento: {yesno(extra.get('adiccionRecibeTratamiento'))})"

    violencia = yesno(extra.get("violenciaCorrectiva"))
    if violencia == "SÍ":
        tipo_v = marcas(extra.get("tipoViolencia"), {"fisica": "Física", "psicologica": "Psicológica"})
        violencia += f" — {tipo_v} — Quién: {c(extra.get('quienEjerceViolencia'))}"

    sec7 = [
        [L("Afiliado SIS:"),        V(sina(extra.get("afiliadoSIS"))),           L("Otro Seguro:"),         V(otro_seguro)],
        [L("Prob. de Salud en:"),   V(prob_salud),                               L("Enf. Crónica:"),        V(enf)],
        [L("Discapacidad NNA:"),    V(discap_nna),                               L("Tipo Discapacidad:"),   V(extra.get("tipoDiscapacidad"))],
        [L("Detalle Discapacidad:"),V(extra.get("detalleDiscapacidad")),         L("Carnet Discapacidad:"), V(yesno(extra.get("certificadoDiscapacidad")))],
        [L("Dónde trata Discap.:"), V(c(extra.get("dondeTratamientoDiscapacidad")).replace("_", " ").capitalize()),
                                                                                  L("Prob. Psicológico:"),   V(psico)],
        [L("Detalle Psicológico:"), V(extra.get("detalleProblemaPsicologico")),  L("Consume Sustancias:"),  V(sustancias)],
        [L("¿Gestando?:"),          V(yesno(extra.get("seEncuentraGestando"))),  L("Madre/Padre Adolesc.:"),V(yesno(extra.get("esMadrePadreAdolescente")))],
        [L("Ha sufrido aborto:"),   V(yesno(extra.get("haSufridoAborto"))),      L("Víctima Abuso Sexual:"),V(yesno(extra.get("victimaAbusoSexual")))],
        [L("3 alimentos/día:"),     V(yesno(extra.get("recibeTresAlimentos"))),  L("Aparenta bien alim.:"), V(yesno(extra.get("aparentaBienAlimentado")))],
        [L("Dónde se alimenta:"),   V(c(extra.get("dondeAlimenta")).replace("_", " ").capitalize()),
                                                                                  L("Quién lo alimenta:"),   V(c(extra.get("quienAlimenta")).replace("_", " ").capitalize())],
        [L("Higiene adecuada:"),    V(sina(extra.get("higieneAdecuada"))),       L("Ropas limpias:"),       V(sina(extra.get("ropasLimpias")))],
        [L("Normas higiene comer:"),V(sina(extra.get("normasHigieneComer"))),    L("Cabello/uñas limpias:"),V(sina(extra.get("cabelloUnasLimpias")))],
        [L("Violencia correctiva:"),V(violencia),                                L("Obs. Salud:"),          V(extra.get("observacionesSalud"))],
    ]
    story.append(make_table(sec7, [w4, w4, w4, w4]))
    story.append(Spacer(1, 8))

    # ── VIII. Recreación ──────────────────────────────────────────────────
    story.append(sec_header("VIII. Recreación e Intereses"))
    story.append(Spacer(1, 4))

    juega = yesno(extra.get("tiempoParaJugar"))
    if juega == "SÍ" and c(extra.get("vecesJuegaSemana"), ""):
        juega += f" — {c(extra.get('vecesJuegaSemana'))} veces/semana"

    lugar_juego = c(extra.get("lugarJuego")).replace("_", " ").capitalize()
    if c(extra.get("lugarJuegoOtroDetalle"), ""):
        lugar_juego += f" — {c(extra.get('lugarJuegoOtroDetalle'))}"

    participa = sina(extra.get("recreacionParticipaInstitucion"))
    tipo_inst = f"{c(extra.get('recreacionTipoInstitucion'), '')} {c(extra.get('recreacionInstitucionDetalle'), '')}".strip() or "-"

    deporte = yesno(extra.get("interesesDeportivos"))
    if c(extra.get("recreacionInteresDeporte"), ""):
        deporte += f" — {c(extra.get('recreacionInteresDeporte'))}"
    arte = yesno(extra.get("interesesArtisticos"))
    if c(extra.get("recreacionInteresArte"), ""):
        arte += f" — {c(extra.get('recreacionInteresArte'))}"

    sec8 = [
        [L("Tiempo para jugar:"),     V(juega),        L("Lugar donde juega:"),   V(lugar_juego)],
        [L("Interés Deportivo:"),     V(deporte),      L("Interés Artístico:"),   V(arte)],
        [L("Activ. con Familia:"),    V(sina(extra.get("recreacionActividadFamilia"))),
                                                        L("Participa Institución:"), V(f"{participa} — {tipo_inst}".strip("- ") if participa == "Sí" else participa)],
    ]
    story.append(make_table(sec8, [w4, w4, w4, w4]))
    story.append(Spacer(1, 8))

    # ── IX. Necesidades ───────────────────────────────────────────────────
    necesidades = extra.get("necesidades") or []
    if necesidades:
        story.append(sec_header("IX. Necesidades Identificadas y Plan de Acción"))
        story.append(Spacer(1, 4))

        def phase_items(value):
            lines = [line.strip() for line in c(value, "").splitlines() if line.strip()]
            return Paragraph("<br/>".join(f"- {escape(line)}" for line in lines) if lines else "-", value_style)

        nec_rows = []
        for n in necesidades:
            nec_rows.append([
                Paragraph(c(n.get("categoria")),  value_style),
                phase_items(n.get("faseI") or n.get("descripcion")),
                phase_items(n.get("faseII")),
                phase_items(n.get("faseIII")),
            ])
        c4 = doc.width / 4
        story.append(grid_table(
            ["Categoría", "Fase I", "Fase II", "Fase III"],
            nec_rows,
            [c4 * 0.8, c4 * 1.1, c4 * 1.1, c4],
        ))
        story.append(Spacer(1, 8))

    # ── Firmas ────────────────────────────────────────────────────────────
    story.append(Spacer(1, 25))
    firmas = [[
        Paragraph("___________________________________<br/><b>Trabajador/a Social</b><br/>Firma y Sello Oficial", firma_style),
        Paragraph("___________________________________<br/><b>Familiar / Tutor Responsable</b><br/>Firma o Huella Digital", firma_style),
    ]]
    firmas_t = Table(firmas, colWidths=[doc.width / 2, doc.width / 2])
    firmas_t.setStyle(TableStyle([("ALIGN", (0, 0), (-1, -1), "CENTER"), ("VALIGN", (0, 0), (-1, -1), "BOTTOM")]))
    story.append(firmas_t)
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        f"Generado el {datetime.now().strftime('%d/%m/%Y %H:%M')} — Sistema SEC / INABIF · {c(diag_data.get('codigo_ficha_04'))}",
        footer_style,
    ))

    doc.build(story)
    return output_path
