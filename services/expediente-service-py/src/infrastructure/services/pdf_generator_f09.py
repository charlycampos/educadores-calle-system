import os
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.units import inch

def generate_f09_pdf(informe_data: dict, nna_data: dict, output_path: str) -> str:
    """
    Genera el PDF del Informe Situacional Formato 09.
    
    :param informe_data: dict con campos del informe situacional
    :param nna_data:     dict con nombres, apellidos, dni, etc., del NNA
    :param output_path:  ruta donde se guardará el PDF
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
    
    PRIMARY  = colors.HexColor("#3B82F6") # Blue
    TEXT     = colors.HexColor("#1F2937")
    BG_LIGHT = colors.HexColor("#F9FAFB")
    BORDER   = colors.HexColor("#E5E7EB")
    
    title_style    = ParagraphStyle("T",   parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=14, textColor=PRIMARY,   alignment=1, spaceAfter=2)
    subtitle_style = ParagraphStyle("S",   parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=9,  textColor=colors.HexColor("#4B5563"), alignment=1, spaceAfter=12)
    section_style  = ParagraphStyle("Sec", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=9, textColor=colors.white)
    label_style    = ParagraphStyle("L",   parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=8,  textColor=colors.HexColor("#4B5563"), leading=10)
    value_style    = ParagraphStyle("V",   parent=styles["Normal"], fontName="Helvetica",      fontSize=8.5, textColor=TEXT,       leading=11)
    body_style     = ParagraphStyle("B",   parent=styles["Normal"], fontName="Helvetica",      fontSize=8.5, textColor=TEXT,       leading=12)
    firma_style    = ParagraphStyle("Fi",  parent=styles["Normal"], fontName="Helvetica",      fontSize=8,  alignment=1)
    
    def c(val, default="-"):
        if val is None or str(val).strip() in ("", "None", "null"):
            return default
        import html
        return html.escape(str(val).strip()).replace("\n", "<br/>")
        
    def L(text): return Paragraph(c(text), label_style)
    def V(text): return Paragraph(c(text), value_style)
    def B(text): return Paragraph(c(text), body_style)
    
    def sec_header(text):
        p = Paragraph(text.upper(), section_style)
        t = Table([[p]], colWidths=[540])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), PRIMARY),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ]))
        return t

    # 1. Cabecera
    story.append(Paragraph("SERVICIO DE EDUCADORES DE CALLE", title_style))
    fecha_inf = informe_data.get("fecha_informe")
    if isinstance(fecha_inf, datetime):
        fecha_str = fecha_inf.strftime("%d/%m/%Y")
    elif isinstance(fecha_inf, str):
        fecha_str = fecha_inf[:10]
    else:
        fecha_str = datetime.now().strftime("%d/%m/%Y")
    story.append(Paragraph(f"INFORME SITUACIONAL — FORMATO 09 &nbsp;|&nbsp; FECHA: {fecha_str}", subtitle_style))
    story.append(Spacer(1, 4))
    
    # 2. Datos de Identificación (Sección I)
    story.append(sec_header("I. Datos de Identificación"))
    story.append(Spacer(1, 4))
    
    nna_nom = f"{nna_data.get('nombres', '')} {nna_data.get('apellido_paterno', '')} {nna_data.get('apellido_materno', '')}".strip()
    
    ident_data = [
        [L("DIRIGIDO A:"), V(informe_data.get("destinatario")), L("NNA:"), V(nna_nom)],
        [L("ASUNTO:"), V(informe_data.get("asunto")), L("NRO DOC:"), V(nna_data.get("numero_doc"))]
    ]
    t_ident = Table(ident_data, colWidths=[90, 180, 70, 200])
    t_ident.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, BORDER),
        ('BACKGROUND', (0,0), (0,-1), BG_LIGHT),
        ('BACKGROUND', (2,0), (2,-1), BG_LIGHT),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_ident)
    story.append(Spacer(1, 10))
    
    # 3. Antecedentes (Sección II)
    story.append(sec_header("II. Antecedentes y Circunstancias del Hallazgo"))
    story.append(Spacer(1, 4))
    t_antec = Table([[B(informe_data.get("antecedentes"))]], colWidths=[540])
    t_antec.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 0.5, BORDER),
        ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(t_antec)
    story.append(Spacer(1, 10))
    
    # Secciones III a VIII, alineadas con el modelo oficial y con el Word.
    ESTILO_BLOQUE = TableStyle([
        ('BOX', (0,0), (-1,-1), 0.5, BORDER),
        ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ])

    def bloque(titulo, contenido):
        story.append(sec_header(titulo))
        story.append(Spacer(1, 4))
        t = Table([[B(contenido)]], colWidths=[540])
        t.setStyle(ESTILO_BLOQUE)
        story.append(t)
        story.append(Spacer(1, 10))

    bloque("III. Acciones Realizadas", informe_data.get("estrategias"))
    bloque("IV. Situación Familiar", informe_data.get("situacion_familiar"))
    bloque("V. Indicadores de Vulnerabilidad", informe_data.get("indicadores_vulnerab"))

    # VI. El PII va dentro del informe, una fila por fase.
    story.append(sec_header("VI. Plan de Intervención Individual"))
    story.append(Spacer(1, 4))
    pii_data = [
        [L(f"FASE {n} ({meses} MESES):"), B(informe_data.get(f"pii_fase{n}"))]
        for n, meses in ((1, 3), (2, 15), (3, 6))
    ]
    t_pii = Table(pii_data, colWidths=[130, 410])
    t_pii.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, BORDER),
        ('BACKGROUND', (0,0), (0,-1), BG_LIGHT),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_pii)
    story.append(Spacer(1, 10))

    bloque("VII. Apreciación Profesional", informe_data.get("conclusiones"))

    story.append(sec_header("VIII. Recomendación"))
    story.append(Spacer(1, 4))
    t_concl = Table([[B(informe_data.get("recomendaciones"))]], colWidths=[540])
    t_concl.setStyle(ESTILO_BLOQUE)
    story.append(t_concl)
    story.append(Spacer(1, 35))
    
    # 7. Firmas
    firma_data = [
        [Paragraph("___________________________________<br/><b>Educador/a de Calle</b><br/>Responsable del Caso", firma_style),
         Paragraph("___________________________________<br/><b>Coordinador/a</b><br/>V° B°", firma_style)]
    ]
    t_firmas = Table(firma_data, colWidths=[270, 270])
    t_firmas.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_firmas)
    
    doc.build(story)
    return output_path
