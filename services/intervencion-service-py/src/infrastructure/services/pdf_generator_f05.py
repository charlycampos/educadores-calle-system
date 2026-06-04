import os
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.units import inch


# ── Ítems del protocolo ───────────────────────────────────────────────────────

ITEMS_FASE_1 = [
    "El/la NNA se integra y colabora con otras/os NNA.",
    "El/la NNA participa regularmente de las actividades del servicio de educadores de calle.",
    "El adulto responsable muestra interés en cubrir necesidades básicas urgentes (identidad, salud y educación).",
    "El/la NNA y adulto responsable muestran interés en cubrir sus necesidades básicas urgentes.",
    "Muestra interés en acercarse a la comunidad a través de los actores sociales más próximos.",
]

ITEMS_FASE_2 = [
    "El NNA tiene cubierto y ejerce su derecho a la educación.",
    "El NNA tiene cubierto y ejerce su derecho a la salud.",
    "El NNA tiene cubierto y ejerce su derecho a la identidad.",
    "El NNA tiene cubierto y ejerce su derecho a la alimentación.",
    "El/la NNA deja o reduce la situación de calle según perfil.",
    "El adulto responsable no ejerce violencia física ni psicológica en sus pautas de crianza.",
    "Aumentaron su participación en actividades de desarrollo integral (deportivas, recreativas, culturales, productivas).",
    "Acceso a servicios especializados (salud mental, adicciones, acceso a la justicia, entre otros).",
    "El/la NNA incorpora conductas de autocuidado personal, aseo, higiene y presentación.",
    "El/la NNA y su familia construye un proyecto o plan de vida por áreas de desarrollo.",
]

ITEMS_FASE_3 = [
    "NNA dejan la situación de calle ejerciendo permanentemente sus derechos (identidad, salud, alimentación, educación, recreación).",
    "Las/os NNA desarrollan capacidades de autoprotección y habilidades para la vida.",
    "Las/os NNA hacen uso de programas y servicios que restituyen el ejercicio de sus derechos.",
    "Persona adulta responsable presenta capacidades para garantizar la protección integral de las/os NNA.",
    "Las/os NNA y sus familias presentan y desarrollan sus proyectos de vida con algunas metas cumplidas.",
]

STATUS_LABELS = {"SI": "SÍ", "NO": "NO", "PROCESO": "EN PROCESO"}
STATUS_COLORS = {
    "SI":      colors.HexColor("#15803D"),
    "NO":      colors.HexColor("#B91C1C"),
    "PROCESO": colors.HexColor("#B45309"),
}


def generate_f05_pdf(logros_data: dict, nna_data: dict, output_path: str) -> str:
    """
    Genera el PDF de la Ficha de Proceso de Logros F05.

    :param logros_data: dict con columnas de PROCESO_LOGROS
    :param nna_data:    dict con nombre, apellidos, DNI del NNA
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
    SUCCESS  = colors.HexColor("#15803D")
    DANGER   = colors.HexColor("#B91C1C")
    WARNING  = colors.HexColor("#B45309")
    TEXT     = colors.HexColor("#1F2937")
    BG_LIGHT = colors.HexColor("#F9FAFB")
    BG_FASE1 = colors.HexColor("#FFFBEB")
    BG_FASE2 = colors.HexColor("#EEF2FF")
    BG_FASE3 = colors.HexColor("#F0FDF4")
    BORDER   = colors.HexColor("#E5E7EB")

    title_style    = ParagraphStyle("T",   parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=14, textColor=PRIMARY,   alignment=1, spaceAfter=2)
    subtitle_style = ParagraphStyle("S",   parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=9,  textColor=colors.HexColor("#7C3AED"), alignment=1, spaceAfter=8)
    section_style  = ParagraphStyle("Sec", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=10, textColor=colors.white)
    label_style    = ParagraphStyle("L",   parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=8,  textColor=colors.HexColor("#374151"), leading=10)
    value_style    = ParagraphStyle("V",   parent=styles["Normal"], fontName="Helvetica",      fontSize=8,  textColor=TEXT,       leading=10)
    item_style     = ParagraphStyle("I",   parent=styles["Normal"], fontName="Helvetica",      fontSize=7.5, textColor=TEXT,      leading=10)
    obs_style      = ParagraphStyle("O",   parent=styles["Normal"], fontName="Helvetica",      fontSize=7.5, textColor=colors.HexColor("#4B5563"), leading=10)
    footer_style   = ParagraphStyle("F",   parent=styles["Normal"], fontName="Helvetica",      fontSize=7,  textColor=colors.grey, alignment=1)
    firma_style    = ParagraphStyle("Fi",  parent=styles["Normal"], fontName="Helvetica",      fontSize=8,  alignment=1)

    def c(val, default="-"):
        if val is None or str(val).strip() in ("", "None", "null"):
            return default
        return str(val).strip()

    def L(text): return Paragraph(c(text), label_style)
    def V(text): return Paragraph(c(text), value_style)

    def sec_header(text, bg=None):
        p = Paragraph(text.upper(), section_style)
        t = Table([[p]], colWidths=[doc.width])
        t.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), bg or PRIMARY),
            ("TOPPADDING",    (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ]))
        return t

    def make_info_table(rows):
        n = len(rows[0])
        cw = [doc.width / n] * n
        t = Table(rows, colWidths=cw)
        label_cols = list(range(0, n, 2))
        cmds = [
            ("GRID",    (0, 0), (-1, -1), 0.4, BORDER),
            ("PADDING", (0, 0), (-1, -1), 4),
            ("VALIGN",  (0, 0), (-1, -1), "MIDDLE"),
        ]
        for col in label_cols:
            cmds.append(("BACKGROUND", (col, 0), (col, -1), BG_LIGHT))
        t.setStyle(TableStyle(cmds))
        return t

    def format_date(val):
        if not val:
            return "-"
        s = str(val)[:10]
        try:
            d = datetime.strptime(s, "%Y-%m-%d")
            return d.strftime("%d/%m/%Y")
        except Exception:
            return s

    def status_paragraph(val):
        label = STATUS_LABELS.get(val, "-") if val else "-"
        color = STATUS_COLORS.get(val, colors.grey) if val else colors.grey
        return Paragraph(f"<b>{label}</b>", ParagraphStyle(
            "St", parent=styles["Normal"],
            fontName="Helvetica-Bold", fontSize=8,
            textColor=color, alignment=1
        ))

    def make_logros_table(items, fase, bg_fase):
        header_row = [[
            Paragraph("N°",          label_style),
            Paragraph("Indicador de Logro", label_style),
            Paragraph("Estado",      label_style),
        ]]
        rows = []
        for i, texto in enumerate(items, start=1):
            key = f"f{fase}_i{i}"
            val = logros_data.get(key)
            rows.append([
                Paragraph(str(i), ParagraphStyle("N", parent=styles["Normal"],
                    fontName="Helvetica-Bold", fontSize=8, textColor=TEXT, alignment=1)),
                Paragraph(texto, item_style),
                status_paragraph(val),
            ])

        w = doc.width
        t = Table(header_row + rows, colWidths=[w * 0.06, w * 0.76, w * 0.18])
        cmds = [
            ("GRID",           (0, 0), (-1, -1), 0.4, BORDER),
            ("BACKGROUND",     (0, 0), (-1,  0), PRIMARY),
            ("TEXTCOLOR",      (0, 0), (-1,  0), colors.white),
            ("FONTNAME",       (0, 0), (-1,  0), "Helvetica-Bold"),
            ("FONTSIZE",       (0, 0), (-1, -1), 8),
            ("PADDING",        (0, 0), (-1, -1), 5),
            ("VALIGN",         (0, 0), (-1, -1), "MIDDLE"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, bg_fase]),
        ]
        t.setStyle(TableStyle(cmds))
        return t

    # ── CABECERA ──────────────────────────────────────────────────────────────
    codigo     = c(logros_data.get("codigo_f05"), "F05-BORRADOR")
    nna_nombre = f"{c(nna_data.get('nombres'))} {c(nna_data.get('apellidoPaterno'))} {c(nna_data.get('apellidoMaterno'))}".strip(" -")

    story.append(Paragraph("SISTEMA DE GESTIÓN DE CASOS — SEC / INABIF", title_style))
    story.append(Paragraph(f"FICHA DE PROCESO DE LOGROS F05 · Nº {codigo}", subtitle_style))

    # ── I. DATOS DEL NNA ─────────────────────────────────────────────────────
    story.append(sec_header("I. Datos del NNA"))
    story.append(Spacer(1, 4))

    fi = format_date(logros_data.get("fecha_ingreso"))
    info_rows = [
        [L("NNA:"),           V(nna_nombre),                              L("DNI / Doc:"),    V(nna_data.get("numeroDoc"))],
        [L("Perfil:"),        V(logros_data.get("perfil_usuario")),        L("Fecha Ingreso:"), V(fi)],
        [L("Educador/a:"),    V(logros_data.get("educador_responsable")), L("Código F05:"),    V(codigo)],
    ]
    story.append(make_info_table(info_rows))
    story.append(Spacer(1, 10))

    # ── FASE I ────────────────────────────────────────────────────────────────
    fase1_color = colors.HexColor("#B45309")
    story.append(sec_header("II. Fase I — Contacto e Integración (Plazo: 3 meses)", bg=fase1_color))
    story.append(Spacer(1, 2))

    f1_fecha = format_date(logros_data.get("f1_fecha"))
    story.append(Paragraph(f"Fecha de evaluación: <b>{f1_fecha}</b>", obs_style))
    story.append(Spacer(1, 4))
    story.append(make_logros_table(ITEMS_FASE_1, 1, BG_FASE1))

    f1_obs = c(logros_data.get("f1_obs"), "")
    if f1_obs:
        story.append(Spacer(1, 4))
        story.append(Paragraph("<b>Observaciones:</b>", label_style))
        story.append(Paragraph(f1_obs, obs_style))
    story.append(Spacer(1, 10))

    # ── FASE II ───────────────────────────────────────────────────────────────
    fase2_color = colors.HexColor("#3730A3")
    story.append(sec_header("III. Fase II — Desarrollo e Intervención (Plazo: 15 meses)", bg=fase2_color))
    story.append(Spacer(1, 2))

    f2_fecha = format_date(logros_data.get("f2_fecha"))
    story.append(Paragraph(f"Fecha de evaluación: <b>{f2_fecha}</b>", obs_style))
    story.append(Spacer(1, 4))
    story.append(make_logros_table(ITEMS_FASE_2, 2, BG_FASE2))

    f2_obs = c(logros_data.get("f2_obs"), "")
    if f2_obs:
        story.append(Spacer(1, 4))
        story.append(Paragraph("<b>Observaciones:</b>", label_style))
        story.append(Paragraph(f2_obs, obs_style))
    story.append(Spacer(1, 10))

    # ── FASE III ──────────────────────────────────────────────────────────────
    fase3_color = colors.HexColor("#15803D")
    story.append(sec_header("IV. Fase III — Seguimiento y Egreso (Plazo: 6 meses)", bg=fase3_color))
    story.append(Spacer(1, 2))

    f3_fecha = format_date(logros_data.get("f3_fecha"))
    story.append(Paragraph(f"Fecha de evaluación: <b>{f3_fecha}</b>", obs_style))
    story.append(Spacer(1, 4))
    story.append(make_logros_table(ITEMS_FASE_3, 3, BG_FASE3))

    f3_obs = c(logros_data.get("f3_obs"), "")
    if f3_obs:
        story.append(Spacer(1, 4))
        story.append(Paragraph("<b>Observaciones:</b>", label_style))
        story.append(Paragraph(f3_obs, obs_style))
    story.append(Spacer(1, 20))

    # ── FIRMAS ────────────────────────────────────────────────────────────────
    firmas = [[
        Paragraph("___________________________________<br/><b>Educador/a de Calle</b><br/>Firma y Sello Oficial", firma_style),
        Paragraph("___________________________________<br/><b>Coordinador/a del Servicio</b><br/>Firma y Sello Oficial", firma_style),
    ]]
    ft = Table(firmas, colWidths=[doc.width / 2, doc.width / 2])
    ft.setStyle(TableStyle([("ALIGN", (0, 0), (-1, -1), "CENTER"), ("VALIGN", (0, 0), (-1, -1), "BOTTOM")]))
    story.append(ft)
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        f"Generado el {datetime.now().strftime('%d/%m/%Y %H:%M')} — Sistema SEC / INABIF · {codigo}",
        footer_style,
    ))

    doc.build(story)
    return output_path


def generate_f05_fase_pdf(logros_data: dict, nna_data: dict, fase_num: int, output_path: str) -> str:
    """Genera el PDF de una sola fase del F05 (1, 2 ó 3)."""
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

    FASE_CONFIG = {
        1: {"label": "I",   "titulo": "Contacto e Integración",        "plazo": "3 meses",  "bg_header": colors.HexColor("#B45309"), "bg_row": colors.HexColor("#FFFBEB"),  "items": ITEMS_FASE_1},
        2: {"label": "II",  "titulo": "Desarrollo e Intervención",     "plazo": "15 meses", "bg_header": colors.HexColor("#3730A3"), "bg_row": colors.HexColor("#EEF2FF"),  "items": ITEMS_FASE_2},
        3: {"label": "III", "titulo": "Seguimiento y Egreso",           "plazo": "6 meses",  "bg_header": colors.HexColor("#15803D"), "bg_row": colors.HexColor("#F0FDF4"),  "items": ITEMS_FASE_3},
    }
    fc = FASE_CONFIG[fase_num]

    title_style    = ParagraphStyle("T",   parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=13, textColor=PRIMARY,   alignment=1, spaceAfter=2)
    subtitle_style = ParagraphStyle("S",   parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=9,  textColor=colors.HexColor("#7C3AED"), alignment=1, spaceAfter=8)
    section_style  = ParagraphStyle("Sec", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=10, textColor=colors.white)
    label_style    = ParagraphStyle("L",   parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=8,  textColor=colors.HexColor("#374151"), leading=10)
    value_style    = ParagraphStyle("V",   parent=styles["Normal"], fontName="Helvetica",      fontSize=8,  textColor=TEXT,       leading=10)
    item_style     = ParagraphStyle("I",   parent=styles["Normal"], fontName="Helvetica",      fontSize=7.5, textColor=TEXT,      leading=10)
    obs_style      = ParagraphStyle("O",   parent=styles["Normal"], fontName="Helvetica",      fontSize=7.5, textColor=colors.HexColor("#4B5563"), leading=10)
    footer_style   = ParagraphStyle("F",   parent=styles["Normal"], fontName="Helvetica",      fontSize=7,  textColor=colors.grey, alignment=1)
    firma_style    = ParagraphStyle("Fi",  parent=styles["Normal"], fontName="Helvetica",      fontSize=8,  alignment=1)

    def c(val, default="-"):
        if val is None or str(val).strip() in ("", "None", "null"):
            return default
        return str(val).strip()

    def L(text): return Paragraph(c(text), label_style)
    def V(text): return Paragraph(c(text), value_style)

    def sec_header(text, bg=None):
        p = Paragraph(text.upper(), section_style)
        t = Table([[p]], colWidths=[doc.width])
        t.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), bg or PRIMARY),
            ("TOPPADDING",    (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ]))
        return t

    def format_date(val):
        if not val:
            return "-"
        s = str(val)[:10]
        try:
            d = datetime.strptime(s, "%Y-%m-%d")
            return d.strftime("%d/%m/%Y")
        except Exception:
            return s

    def status_paragraph(val):
        label = STATUS_LABELS.get(val, "-") if val else "-"
        color = STATUS_COLORS.get(val, colors.grey) if val else colors.grey
        return Paragraph(f"<b>{label}</b>", ParagraphStyle(
            "St", parent=styles["Normal"],
            fontName="Helvetica-Bold", fontSize=8,
            textColor=color, alignment=1
        ))

    codigo = c(logros_data.get("codigo_f05"), "F05-BORRADOR")
    nna_nombre = f"{c(nna_data.get('nombres'))} {c(nna_data.get('apellidoPaterno'))} {c(nna_data.get('apellidoMaterno'))}".strip(" -")

    story.append(Paragraph("SISTEMA DE GESTIÓN DE CASOS — SEC / INABIF", title_style))
    story.append(Paragraph(f"FICHA DE LOGROS F05 · FASE {fc['label']} — {fc['titulo']} · Nº {codigo}", subtitle_style))

    # Datos del NNA
    story.append(sec_header("I. Datos del NNA"))
    story.append(Spacer(1, 4))
    n = len([L(""), V(""), L(""), V("")])
    cw = [doc.width / 4] * 4
    t = Table([
        [L("NNA:"),       V(nna_nombre),                              L("DNI / Doc:"),    V(nna_data.get("numeroDoc"))],
        [L("Perfil:"),    V(logros_data.get("perfil_usuario")),        L("Fecha Ingreso:"), V(format_date(logros_data.get("fecha_ingreso")))],
        [L("Educador/a:"), V(logros_data.get("educador_responsable")), L("Código F05:"),   V(codigo)],
    ], colWidths=cw)
    t.setStyle(TableStyle([
        ("GRID",    (0, 0), (-1, -1), 0.4, BORDER),
        ("PADDING", (0, 0), (-1, -1), 4),
        ("VALIGN",  (0, 0), (-1, -1), "MIDDLE"),
        ("BACKGROUND", (0, 0), (0, -1), BG_LIGHT),
        ("BACKGROUND", (2, 0), (2, -1), BG_LIGHT),
    ]))
    story.append(t)
    story.append(Spacer(1, 10))

    # Sección de fase
    story.append(sec_header(f"II. Fase {fc['label']} — {fc['titulo']} (Plazo: {fc['plazo']})", bg=fc["bg_header"]))
    story.append(Spacer(1, 2))

    fecha_key = f"f{fase_num}_fecha"
    story.append(Paragraph(f"Fecha de evaluación: <b>{format_date(logros_data.get(fecha_key))}</b>", obs_style))
    story.append(Spacer(1, 4))

    # Tabla de ítems
    header_row = [[
        Paragraph("N°", label_style),
        Paragraph("Indicador de Logro", label_style),
        Paragraph("Estado", label_style),
    ]]
    rows = []
    for i, texto in enumerate(fc["items"], start=1):
        key = f"f{fase_num}_i{i}"
        val = logros_data.get(key)
        rows.append([
            Paragraph(str(i), ParagraphStyle("N", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=8, textColor=TEXT, alignment=1)),
            Paragraph(texto, item_style),
            status_paragraph(val),
        ])
    w = doc.width
    tbl = Table(header_row + rows, colWidths=[w * 0.06, w * 0.76, w * 0.18])
    tbl.setStyle(TableStyle([
        ("GRID",           (0, 0), (-1, -1), 0.4, BORDER),
        ("BACKGROUND",     (0, 0), (-1,  0), PRIMARY),
        ("TEXTCOLOR",      (0, 0), (-1,  0), colors.white),
        ("FONTNAME",       (0, 0), (-1,  0), "Helvetica-Bold"),
        ("FONTSIZE",       (0, 0), (-1, -1), 8),
        ("PADDING",        (0, 0), (-1, -1), 5),
        ("VALIGN",         (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, fc["bg_row"]]),
    ]))
    story.append(tbl)

    obs_key = f"f{fase_num}_obs"
    obs = c(logros_data.get(obs_key), "")
    if obs:
        story.append(Spacer(1, 4))
        story.append(Paragraph("<b>Observaciones:</b>", label_style))
        story.append(Paragraph(obs, obs_style))
    story.append(Spacer(1, 20))

    # Firmas
    firmas = [[
        Paragraph("___________________________________<br/><b>Educador/a de Calle</b><br/>Firma y Sello Oficial", firma_style),
        Paragraph("___________________________________<br/><b>Coordinador/a del Servicio</b><br/>Firma y Sello Oficial", firma_style),
    ]]
    ft = Table(firmas, colWidths=[doc.width / 2, doc.width / 2])
    ft.setStyle(TableStyle([("ALIGN", (0, 0), (-1, -1), "CENTER"), ("VALIGN", (0, 0), (-1, -1), "BOTTOM")]))
    story.append(ft)
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        f"Generado el {datetime.now().strftime('%d/%m/%Y %H:%M')} — Sistema SEC / INABIF · {codigo} · Fase {fc['label']}",
        footer_style,
    ))

    doc.build(story)
    return output_path
