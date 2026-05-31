import os
import json
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.units import inch


def generate_f04_pdf(diag_data: dict, nna_data: dict, output_path: str) -> str:
    """
    Genera el PDF de la Ficha de Diagnóstico Social F04.

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

    def c(val, default="-"):
        if val is None or str(val).strip() in ("", "None", "null", "undefined"):
            return default
        return str(val).strip()

    def yesno(val):
        if val is True or str(val).upper() in ("SI", "TRUE", "1", "YES"):
            return "SÍ"
        return "NO"

    def L(text):
        return Paragraph(c(text), label_style)

    def V(text, default="-"):
        return Paragraph(c(text, default), value_style)

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

    fn = nna_data.get("fechaNacimiento") or ""
    fn_str = str(fn)[:10] if fn else "-"

    sec1 = [
        [L("NNA:"),           V(nna_nombre),                     L("DNI / Doc:"),      V(nna_data.get("numeroDoc"))],
        [L("Edad:"),          V(f"{c(extra.get('edad'))} {c(extra.get('unidadEdad','años')).lower()}"),
                                                                  L("Fecha Nacimiento:"), V(fn_str)],
        [L("Dirección:"),     V(extra.get("direccionActual")),    L("Referencia:"),     V(extra.get("referenciaDireccion"))],
        [L("Ubigeo:"),        V(ubigeo),                         L("Teléfono:"),        V(extra.get("telefonoContacto"))],
    ]
    story.append(make_table(sec1))
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

    modalidad = det.get("modalidadTrabajo") or {}
    modal_str = ", ".join(k.capitalize() for k, v in modalidad.items() if v) or "-"

    sec2 = [
        [L("Perfil:"),            V(perfil_str),                          L("Tiempo en Calle:"),     V(tiempo_calle)],
        [L("Motivo:"),            V(det.get("motivo") or diag_data.get("motivo_ingreso")),
                                                                            L("Lugar / Zona:"),         V(det.get("lugar") or diag_data.get("lugar_pernota"))],
        [L("Ingreso Semanal:"),   V(f"S/ {c(det.get('ingresoSemanal'))}"), L("Víctima Explotación:"), V(yesno(det.get("explotacionSexual")))],
        [L("Modalidad Trabajo:"), V(modal_str),                            L("¿Obligado?:"),           V(f"{yesno(oblig.get('si'))} — {c(oblig.get('quien'))}")],
        [L("¿Escapó de casa?:"),  V(f"{yesno(escap.get('si'))} — {c(escap.get('veces'))} veces"),
                                                                            L("Consumo Sustancias:"),   V(yesno(consumo.get("si")))],
        [L("Tipo Sustancia:"),    V(consumo.get("tipo")),                  L("Frec. Consumo:"),        V(consumo.get("frecuencia"))],
    ]
    w4 = doc.width / 4
    story.append(make_table(sec2, [w4, w4, w4, w4]))
    story.append(Spacer(1, 8))

    # ── III. Tutor / Apoderado ────────────────────────────────────────────
    story.append(sec_header("III. Tutor / Familiar Responsable"))
    story.append(Spacer(1, 4))

    tutor_nombre = " ".join(filter(lambda x: x not in ("-", ""), [
        c(extra.get("tutorPrimerApellido")),
        c(extra.get("tutorSegundoApellido")),
        c(extra.get("tutorNombre")),
    ])).strip() or c(diag_data.get("nombre_tutor"))

    sec3 = [
        [L("Apellidos y Nombres:"), V(tutor_nombre),                                    L("Vínculo con NNA:"),   V(extra.get("tutorParentesco"))],
        [L("Tipo Doc / Nº:"),       V(f"{c(extra.get('tutorTipoDocumento'))} — {c(extra.get('tutorDNI') or diag_data.get('dni_tutor'))}"),
                                                                                          L("Teléfono:"),          V(extra.get("tutorTelefono") or diag_data.get("telefono_tutor"))],
        [L("Sexo / F. Nac.:"),      V(f"{c(extra.get('tutorSexo'))} — {c(extra.get('tutorFechaNacimiento'))}"),
                                                                                          L("Ocupación:"),         V(extra.get("tutorOcupacion"))],
        [L("Lengua / Etnia:"),      V(f"{c(extra.get('tutorLenguaMaterna'))} / {c(extra.get('tutorEtnia'))}"),
                                                                                          L("¿Vive con NNA?:"),    V(extra.get("tutorViveConNna", "SI"))],
        [L("Grado Instrucción:"),   V(extra.get("tutorGradoInstruccion")),               L("Estado Civil:"),      V(extra.get("tutorEstadoCivil"))],
        [L("Discapacidad:"),        V(extra.get("tutorTipoDiscapacidad", "Ninguna")),    L("Consumo Drogas:"),    V(extra.get("tutorConsumoDrogas", "NO"))],
        [L("Ingreso Semanal:"),     V(f"S/ {c(extra.get('tutorIngreso'))}"),             L("Demanda Alimentos:"), V(extra.get("tutorDeseaDemanda", "NO"))],
    ]
    story.append(make_table(sec3, [w4, w4, w4, w4]))
    story.append(Spacer(1, 8))

    # ── IV. Composición Familiar ──────────────────────────────────────────
    familiares = extra.get("familiares") or []
    if familiares:
        story.append(sec_header("IV. Composición Familiar"))
        story.append(Spacer(1, 4))

        hdr = [[
            Paragraph("Apellidos y Nombres", label_style),
            Paragraph("Parentesco",         label_style),
            Paragraph("Edad",               label_style),
            Paragraph("DNI",                label_style),
            Paragraph("Ocupación",          label_style),
            Paragraph("Vive c/ NNA",        label_style),
        ]]
        rows = []
        for f in familiares:
            full = " ".join(filter(lambda x: x not in ("-", ""), [
                c(f.get("primerApellido")), c(f.get("segundoApellido")), c(f.get("nombres"))
            ])).strip()
            rows.append([
                Paragraph(full, value_style),
                Paragraph(c(f.get("parentesco") or f.get("vinTutUsu")), value_style),
                Paragraph(c(f.get("edad")),                              value_style),
                Paragraph(c(f.get("nroDocTutApo") or f.get("dni")),     value_style),
                Paragraph(c(f.get("ocupacion")),                         value_style),
                Paragraph(c(f.get("viveCon")),                           value_style),
            ])

        c6 = doc.width / 6
        ft = Table(hdr + rows, colWidths=[c6 * 1.8, c6 * 0.9, c6 * 0.6, c6 * 0.8, c6 * 0.9, c6 * 0.5])  # type: ignore
        ft.setStyle(TableStyle([
            ("GRID",           (0, 0), (-1, -1), 0.4, BORDER),
            ("BACKGROUND",     (0, 0), (-1,  0), PRIMARY),
            ("TEXTCOLOR",      (0, 0), (-1,  0), colors.white),
            ("FONTNAME",       (0, 0), (-1,  0), "Helvetica-Bold"),
            ("FONTSIZE",       (0, 0), (-1, -1), 8),
            ("PADDING",        (0, 0), (-1, -1), 4),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
        ]))
        story.append(ft)
        story.append(Spacer(1, 4))

    din = extra.get("dinamicaFamiliar") or {}
    if din:
        din_rows = [
            [L("Contacto Familiar:"), V(din.get("contacto")), L("Frecuencia:"),    V(din.get("frecuencia"))],
            [L("Rol Protector:"),     V(din.get("rolProtector")), L("Rol Proveedor:"), V(din.get("rolProveedor"))],
        ]
        story.append(make_table(din_rows, [w4, w4, w4, w4]))
    story.append(Spacer(1, 8))

    # ── V. Vivienda ───────────────────────────────────────────────────────
    story.append(sec_header("V. Vivienda"))
    story.append(Spacer(1, 4))

    srv      = extra.get("serviciosBasicos") or {}
    servicios = ", ".join(k.capitalize() for k, v in srv.items() if v) or "-"

    sec5 = [
        [L("Material:"),        V(extra.get("materialVivienda")),      L("Ambientes:"),       V(extra.get("numeroAmbientes"))],
        [L("Propiedad:"),       V(extra.get("propiedadVivienda")),      L("SISFOH:"),          V(extra.get("viviendaSisfoh"))],
        [L("Servicios Básicos:"),V(servicios),                          L("Higiene domicilio:"),V(extra.get("higieneDomicilio"))],
        [L("Duerme en cama:"),  V(extra.get("duermeCama")),             L("Duerme con quién:"),V(extra.get("duermeConQuien"))],
        [L("Antec. Albergue:"), V(yesno(extra.get("tieneAntecedenteAlbergue"))),
                                                                         L("Motivo/Tiempo:"),   V(f"{c(extra.get('tiempoAlbergue'))} — {c(extra.get('detalleAntecedenteAlbergue'))}")],
    ]
    story.append(make_table(sec5, [w4, w4, w4, w4]))
    story.append(Spacer(1, 8))

    # ── VI. Educación ─────────────────────────────────────────────────────
    story.append(sec_header("VI. Educación"))
    story.append(Spacer(1, 4))

    sec6 = [
        [L("¿Estudia?:"),         V(extra.get("eduEstudia")),       L("Nivel Educativo:"), V(extra.get("eduNivel"))],
        [L("Grado / Año:"),       V(extra.get("eduGrado")),         L("Modalidad:"),       V(extra.get("eduModalidad"))],
        [L("Institución Ed.:"),   V(extra.get("eduInstitucion")),   L("Turno:"),           V(extra.get("eduTurno"))],
        [L("Motivo no estudia:"), V(extra.get("eduMotivoNoEstudia")), L("Atraso escolar:"), V(yesno(extra.get("presentaAtraso")))],
        [L("Prob. Aprendizaje:"), V(yesno(extra.get("problemasAprendizaje"))), L("Prob. Conducta:"), V(yesno(extra.get("problemasConducta")))],
    ]
    story.append(make_table(sec6, [w4, w4, w4, w4]))
    story.append(Spacer(1, 8))

    # ── VII. Salud ────────────────────────────────────────────────────────
    story.append(sec_header("VII. Salud"))
    story.append(Spacer(1, 4))

    sec7 = [
        [L("Afiliado SIS:"),     V(extra.get("afiliadoSIS")),            L("Otro Seguro:"),       V(extra.get("afiliadoOtroSeguro"))],
        [L("Discapacidad NNA:"), V(yesno(extra.get("tieneDiscapacidad"))), L("Tipo Discapacidad:"), V(extra.get("tipoDiscapacidad"))],
        [L("Enf. Crónica:"),     V(yesno(extra.get("enfermedadCronica"))), L("Detalle:"),           V(extra.get("detalleEnfermedadCronica"))],
        [L("Prob. Psicológico:"),V(yesno(extra.get("problemaPsicologico"))), L("Tipo/Detalle:"),    V(extra.get("detalleProblemaPsicologico"))],
        [L("3 alimentos/día:"),  V(yesno(extra.get("recibeTresAlimentos"))), L("Higiene adecuada:"), V(yesno(extra.get("higieneAdecuada")))],
        [L("Obs. Salud:"),       Paragraph(c(extra.get("observacionesSalud")), value_style), L(""), Paragraph("", value_style)],
    ]
    story.append(make_table(sec7, [w4, w4, w4, w4]))
    story.append(Spacer(1, 8))

    # ── VIII. Recreación ──────────────────────────────────────────────────
    story.append(sec_header("VIII. Recreación y Tiempo Libre"))
    story.append(Spacer(1, 4))

    sec8 = [
        [L("Tiempo para jugar:"),    V(yesno(extra.get("tiempoParaJugar"))),  L("Interés Deporte:"), V(extra.get("recreacionInteresDeporte"))],
        [L("Interés Arte:"),         V(extra.get("recreacionInteresArte")),   L("Activ. Familia:"),  V(extra.get("recreacionActividadFamilia"))],
        [L("Participa Institución:"),V(extra.get("recreacionParticipaInstitucion")), L("Tipo Institución:"), V(extra.get("recreacionTipoInstitucion"))],
    ]
    story.append(make_table(sec8, [w4, w4, w4, w4]))
    story.append(Spacer(1, 8))

    # ── IX. Necesidades ───────────────────────────────────────────────────
    necesidades = extra.get("necesidades") or []
    if necesidades:
        story.append(sec_header("IX. Necesidades Identificadas"))
        story.append(Spacer(1, 4))

        nec_hdr = [[
            Paragraph("Categoría",   label_style),
            Paragraph("Descripción", label_style),
            Paragraph("Fase I",      label_style),
            Paragraph("Fase II",     label_style),
            Paragraph("Fase III",    label_style),
        ]]
        nec_rows = []
        for n in necesidades:
            nec_rows.append([
                Paragraph(c(n.get("categoria")),  value_style),
                Paragraph(c(n.get("descripcion")), value_style),
                Paragraph(c(n.get("faseI")),       value_style),
                Paragraph(c(n.get("faseII")),      value_style),
                Paragraph(c(n.get("faseIII")),     value_style),
            ])
        c5 = doc.width / 5
        nt = Table(nec_hdr + nec_rows, colWidths=[c5, c5, c5, c5, c5])
        nt.setStyle(TableStyle([
            ("GRID",           (0, 0), (-1, -1), 0.4, BORDER),
            ("BACKGROUND",     (0, 0), (-1,  0), PRIMARY),
            ("TEXTCOLOR",      (0, 0), (-1,  0), colors.white),
            ("FONTNAME",       (0, 0), (-1,  0), "Helvetica-Bold"),
            ("FONTSIZE",       (0, 0), (-1, -1), 8),
            ("PADDING",        (0, 0), (-1, -1), 4),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
        ]))
        story.append(nt)
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
