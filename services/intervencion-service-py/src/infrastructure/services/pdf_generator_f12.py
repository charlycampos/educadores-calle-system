import os
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.units import inch


def generate_f12_pdf(seg_data: dict, nna_data: dict, output_path: str) -> str:
    """
    Genera el PDF de la Ficha de Seguimiento Familiar F12 (Formato 12).

    :param seg_data: dict con columnas de SEGUIMIENTO_FAMILIAR
    :param nna_data: dict con nombre, apellidos del NNA
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

    title_style    = ParagraphStyle("T",   parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=13, textColor=PRIMARY,              alignment=1, spaceAfter=2)
    subtitle_style = ParagraphStyle("S",   parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=9,  textColor=colors.HexColor("#7C3AED"), alignment=1, spaceAfter=10)
    section_style  = ParagraphStyle("Sec", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=9,  textColor=colors.white)
    label_style    = ParagraphStyle("L",   parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=8,  textColor=colors.HexColor("#374151"), leading=10)
    value_style    = ParagraphStyle("V",   parent=styles["Normal"], fontName="Helvetica",      fontSize=8,  textColor=TEXT,                       leading=11)
    body_style     = ParagraphStyle("B",   parent=styles["Normal"], fontName="Helvetica",      fontSize=8,  textColor=TEXT,                       leading=12, spaceAfter=2)
    footer_style   = ParagraphStyle("F",   parent=styles["Normal"], fontName="Helvetica",      fontSize=7,  textColor=colors.grey,                alignment=1)
    firma_style    = ParagraphStyle("Fi",  parent=styles["Normal"], fontName="Helvetica",      fontSize=8,  alignment=1)

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
        cmds = [
            ("GRID",    (0, 0), (-1, -1), 0.4, BORDER),
            ("PADDING", (0, 0), (-1, -1), 4),
            ("VALIGN",  (0, 0), (-1, -1), "MIDDLE"),
        ]
        for col in label_cols:
            cmds.append(("BACKGROUND", (col, 0), (col, -1), BG_LIGHT))
        t.setStyle(TableStyle(cmds))
        return t

    def text_block(content):
        """Tabla de una celda que ocupa todo el ancho, ideal para textos largos."""
        t = Table([[Paragraph(c(content), body_style)]], colWidths=[doc.width])
        t.setStyle(TableStyle([
            ("GRID",    (0, 0), (-1, -1), 0.4, BORDER),
            ("PADDING", (0, 0), (-1, -1), 6),
            ("MINROWHEIGHT", (0, 0), (-1, -1), 50),
        ]))
        return t

    def c(val, default="-"):
        if val is None or str(val).strip() in ("", "None", "null", "undefined"):
            return default
        return str(val).strip()

    def L(text):
        return Paragraph(c(text), label_style)

    def V(text, default="-"):
        return Paragraph(c(text, default), value_style)

    # ── Datos básicos ─────────────────────────────────────────────────────────
    nna_nombre = f"{c(nna_data.get('nombres'))} {c(nna_data.get('apellidoPaterno'))} {c(nna_data.get('apellidoMaterno',''))}".strip(" -")

    lugar_map = {
        'DOMICILIO':         'Domicilio',
        'TRABAJO':           'Trabajo',
        'CENTRO_REFERENCIA': 'Centro de Referencia',
        'CALLE':             'Calle',
    }
    lugar_raw  = c(seg_data.get('lugar_seguimiento') or seg_data.get('LUGAR_SEGUIMIENTO'), 'DOMICILIO').upper()
    lugar_text = lugar_map.get(lugar_raw, lugar_raw.replace('_', ' ').title())

    # El parentesco se guarda como código del catálogo OPCIONES_VINCULO_TUTOR_2026
    # (el mismo que usa la familia del F03). Sin traducir, la ficha impresa
    # saldría con un "1" en la casilla Parentesco.
    # Las fichas antiguas guardaron el texto directo: si no es un código
    # conocido, se imprime tal cual.
    vinculo_map = {
        '1': 'Padre/Madre',
        '2': 'Tío/a',
        '3': 'Abuelo/a',
        '4': 'Hermano/a',
        '5': 'Otro familiar',
        '6': 'Otro no familiar',
    }
    parentesco_raw  = str(seg_data.get('parentesco') or seg_data.get('PARENTESCO') or '').strip()
    parentesco_text = vinculo_map.get(parentesco_raw, parentesco_raw)

    fecha_raw = seg_data.get('fecha') or seg_data.get('FECHA') or ''
    fecha_str = str(fecha_raw)[:10] if fecha_raw else datetime.now().strftime('%Y-%m-%d')
    try:
        fecha_str = datetime.strptime(fecha_str, '%Y-%m-%d').strftime('%d/%m/%Y')
    except Exception:
        pass

    # ── Cabecera ──────────────────────────────────────────────────────────────
    story.append(Paragraph("SISTEMA DE GESTIÓN DE CASOS — SEC / INABIF", title_style))
    story.append(Paragraph(f"FORMATO 12 · FICHA DE SEGUIMIENTO FAMILIAR - CONSEJERÍA", subtitle_style))

    # ── I. Datos Generales ────────────────────────────────────────────────────
    story.append(sec_header("I. Datos Generales"))
    story.append(Spacer(1, 4))

    w4 = doc.width / 4
    sec1 = [
        [L("Zona de Intervención:"), V(seg_data.get('zona') or seg_data.get('ZONA')),
         L("Fecha:"), V(fecha_str)],
        [L("NNA:"), V(nna_nombre),
         L("Hora:"), V(seg_data.get('hora') or seg_data.get('HORA'))],
        [L("Entrevistado:"), V(seg_data.get('entrevistado') or seg_data.get('ENTREVISTADO')),
         L("Parentesco:"), V(parentesco_text)],
        [L("Lugar:"), V(lugar_text),
         L("Teléfono:"), V(seg_data.get('telefono') or seg_data.get('TELEFONO'))],
        [L("Dirección:"), Paragraph(c(seg_data.get('direccion') or seg_data.get('DIRECCION')), value_style),
         L("Educador:"), V(seg_data.get('nombre_educador') or seg_data.get('NOMBRE_EDUCADOR'))],
    ]
    story.append(make_table(sec1, [w4, w4, w4, w4]))
    story.append(Spacer(1, 8))

    # ── II. Referencia ────────────────────────────────────────────────────────
    story.append(sec_header("II. Referencia — Antecedentes / Motivo de la Visita"))
    story.append(Spacer(1, 4))
    story.append(text_block(seg_data.get('antecedentes') or seg_data.get('ANTECEDENTES')))
    story.append(Spacer(1, 8))

    # ── III. Descripción de la Visita ─────────────────────────────────────────
    story.append(sec_header("III. Descripción de la Visita"))
    story.append(Spacer(1, 4))
    story.append(text_block(seg_data.get('descripcion') or seg_data.get('DESCRIPCION')))
    story.append(Spacer(1, 8))

    # ── IV. Resultados / Compromisos ──────────────────────────────────────────
    story.append(sec_header("IV. Resultados / Compromisos"))
    story.append(Spacer(1, 4))
    story.append(text_block(seg_data.get('acuerdos') or seg_data.get('ACUERDOS')))
    story.append(Spacer(1, 8))

    # ── V. Observaciones ─────────────────────────────────────────────────────
    story.append(sec_header("V. Observaciones"))
    story.append(Spacer(1, 4))
    story.append(text_block(seg_data.get('observaciones') or seg_data.get('OBSERVACIONES')))
    story.append(Spacer(1, 8))

    # ── VI. Evaluación ────────────────────────────────────────────────────────
    eval_map = {
        'FAVORABLE':    'Favorable — Progreso positivo detectado',
        'EN_PROCESO':   'En Proceso — Visita de seguimiento regular',
        'DESFAVORABLE': 'Desfavorable — Retroceso o alertas críticas',
        'SIN_CAMBIOS':  'Sin Cambios — Estable sin cambios reportados',
    }
    eval_val  = c(seg_data.get('evaluacion') or seg_data.get('EVALUACION'), 'EN_PROCESO').upper()
    eval_text = eval_map.get(eval_val, eval_val)

    proxima_raw = seg_data.get('proxima_visita') or seg_data.get('PROXIMA_VISITA') or ''
    proxima_str = str(proxima_raw)[:10] if proxima_raw else '-'
    try:
        proxima_str = datetime.strptime(proxima_str, '%Y-%m-%d').strftime('%d/%m/%Y')
    except Exception:
        pass

    termino_raw = seg_data.get('fecha_termino') or seg_data.get('FECHA_TERMINO') or ''
    termino_str = str(termino_raw)[:10] if termino_raw else '-'
    try:
        termino_str = datetime.strptime(termino_str, '%Y-%m-%d').strftime('%d/%m/%Y')
    except Exception:
        pass

    story.append(sec_header("VI. Cierre y Evaluación"))
    story.append(Spacer(1, 4))

    sec6 = [
        [L("Evaluación de la Visita:"), V(eval_text),
         L("Próxima Visita:"),          V(proxima_str)],
        [L("Fecha de Término:"),        V(termino_str),
         L("Zona:"),                    V(seg_data.get('zona') or seg_data.get('ZONA'))],
    ]
    story.append(make_table(sec6, [w4, w4, w4, w4]))
    story.append(Spacer(1, 4))

    story.append(Paragraph(
        "Nota: ficha aplicada en el desarrollo estructurado de consejería a la familia/tutor del usuario/a del servicio.",
        ParagraphStyle("note", parent=styles["Normal"], fontName="Helvetica-Oblique", fontSize=7, textColor=colors.grey, spaceAfter=16)
    ))

    # ── Firmas ────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 20))
    firmas = [[
        Paragraph("___________________________________<br/><b>Nombre y firma del entrevistado</b>", firma_style),
        Paragraph("___________________________________<br/><b>Nombre y firma del usuario/a</b><br/>" + nna_nombre, firma_style),
        Paragraph("___________________________________<br/><b>Nombre y firma del educador/a</b><br/>" + c(seg_data.get('nombre_educador') or seg_data.get('NOMBRE_EDUCADOR')), firma_style),
    ]]
    firmas_t = Table(firmas, colWidths=[doc.width / 3, doc.width / 3, doc.width / 3])
    firmas_t.setStyle(TableStyle([
        ("ALIGN",  (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
    ]))
    story.append(firmas_t)
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        f"Generado el {datetime.now().strftime('%d/%m/%Y %H:%M')} — Sistema SEC / INABIF",
        footer_style,
    ))

    doc.build(story)
    return output_path
