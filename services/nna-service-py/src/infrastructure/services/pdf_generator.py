import os
import json
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.units import inch

def generate_f03_pdf(nna_data: dict, output_path: str) -> str:
    """
    Genera un archivo PDF profesional para la Ficha F03 de un NNA.
    
    :param nna_data: Diccionario con la información del NNA (cruzada con casos y familiares)
    :param output_path: Ruta de salida física donde se guardará el archivo PDF
    :return: Ruta completa del archivo PDF generado
    """
    # Asegurar que el directorio de destino existe
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Configuración del documento con márgenes de 0.5 pulgadas para aprovechar el espacio
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        leftMargin=36, rightMargin=36,
        topMargin=36, bottomMargin=36
    )
    
    story = []
    
    # ─── Estilos ──────────────────────────────────────────────────────────────
    styles = getSampleStyleSheet()
    
    # Paleta de colores SEC 2026 (Púrpuras y Azules profesionales)
    PRIMARY_COLOR = colors.HexColor("#4F46E5")  # Indigo
    SECONDARY_COLOR = colors.HexColor("#7C3AED") # Purple
    TEXT_COLOR = colors.HexColor("#1F2937")      # Gray-800
    BG_LIGHT = colors.HexColor("#F9FAFB")        # Gray-50
    BORDER_COLOR = colors.HexColor("#E5E7EB")    # Gray-200
    
    # Definición de estilos de texto
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        textColor=PRIMARY_COLOR,
        alignment=1, # Center
        spaceAfter=4
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        textColor=SECONDARY_COLOR,
        alignment=1, # Center
        spaceAfter=15
    )
    
    section_title_style = ParagraphStyle(
        'SectionTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        textColor=colors.white,
        spaceBefore=0,
        spaceAfter=0
    )
    
    label_style = ParagraphStyle(
        'Label',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        textColor=colors.HexColor("#374151"), # Gray-700
        leading=10
    )
    
    value_style = ParagraphStyle(
        'Value',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        textColor=TEXT_COLOR,
        leading=10
    )
    
    bold_value_style = ParagraphStyle(
        'BoldValue',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        textColor=TEXT_COLOR,
        leading=10
    )

    # ─── Helpers ──────────────────────────────────────────────────────────────
    def make_section_header(title_text):
        p = Paragraph(title_text.upper(), section_title_style)
        t = Table([[p]], colWidths=[doc.width])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), PRIMARY_COLOR),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ]))
        return t

    def format_bool(val):
        if val is True or val == 1 or str(val).upper() in ['SI', 'TRUE', '1']:
            return "SÍ"
        return "NO"

    def clean_str(val, default="-"):
        if val is None or str(val).strip() == "" or str(val) == "None":
            return default
        return str(val).strip()

    # ─── Cabecera ─────────────────────────────────────────────────────────────
    story.append(Paragraph("SISTEMA DE GESTIÓN DE CASOS - SEC", title_style))
    ficha_nro = clean_str(nna_data.get("codigoFicha03"), "NUEVO REGISTRO")
    story.append(Paragraph(f"FICHA DE INSCRIPCIÓN Y REGISTRO F03 (SEC 2026) · Nº {ficha_nro}", subtitle_style))
    
    # ─── Sección 1: Datos de Intervención ──────────────────────────────────────
    story.append(make_section_header("I. DATOS GENERALES DE LA INTERVENCIÓN"))
    story.append(Spacer(1, 4))
    
    casos = nna_data.get("casos") or []
    caso_activo = next((c for c in casos if c.get("estado") != "CERRADO"), casos[0] if casos else {})
    
    fecha_ab = "-"
    if caso_activo.get("fechaAbordaje"):
        try:
            dt = datetime.fromisoformat(caso_activo.get("fechaAbordaje").replace("Z", ""))
            fecha_ab = dt.strftime("%d/%m/%Y")
        except:
            fecha_ab = str(caso_activo.get("fechaAbordaje"))[:10]
            
    fecha_ing = "-"
    if caso_activo.get("fechaIngreso"):
        try:
            dt = datetime.fromisoformat(caso_activo.get("fechaIngreso").replace("Z", ""))
            fecha_ing = dt.strftime("%d/%m/%Y")
        except:
            fecha_ing = str(caso_activo.get("fechaIngreso"))[:10]

    sec1_data = [
        [
            Paragraph("Zona de Intervención:", label_style),
            Paragraph(clean_str(caso_activo.get("zonaIntervencion")), value_style),
            Paragraph("Distrito Intervención:", label_style),
            Paragraph(clean_str(caso_activo.get("distritoIntervencion")), value_style),
        ],
        [
            Paragraph("Sede / Unidad:", label_style),
            Paragraph(f"Sede {clean_str(caso_activo.get('sedeId'))}", value_style),
            Paragraph("Educador de Calle:", label_style),
            Paragraph(clean_str(caso_activo.get("responsableNombre"), "Responsable de Registro"), value_style),
        ],
        [
            Paragraph("Perfil Identificado:", label_style),
            Paragraph(clean_str(caso_activo.get("perfil")).replace("_", " "), bold_value_style),
            Paragraph("Situación de Calle:", label_style),
            Paragraph(clean_str(caso_activo.get("situacionCalle")).replace("_", " "), value_style),
        ],
        [
            Paragraph("Fecha de Abordaje:", label_style),
            Paragraph(fecha_ab, value_style),
            Paragraph("Fecha de Ingreso:", label_style),
            Paragraph(fecha_ing, value_style),
        ]
    ]
    
    col_w = doc.width / 4.0
    sec1_table = Table(sec1_data, colWidths=[col_w, col_w, col_w, col_w])
    sec1_table.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('BACKGROUND', (0,0), (0,-1), BG_LIGHT),
        ('BACKGROUND', (2,0), (2,-1), BG_LIGHT),
        ('PADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    
    story.append(sec1_table)
    story.append(Spacer(1, 10))

    # ─── Sección 2: Identidad del Beneficiario ───────────────────────────────
    story.append(make_section_header("II. DATOS PERSONALES DEL BENEFICIARIO (NNA)"))
    story.append(Spacer(1, 4))
    
    sexo_val = clean_str(nna_data.get("sexo"))
    if sexo_val == "1" or sexo_val == "M":
        sexo_desc = "Hombre"
    elif sexo_val == "2" or sexo_val == "F":
        sexo_desc = "Mujer"
    else:
        sexo_desc = sexo_val

    sec2_data = [
        [
            Paragraph("Apellido Paterno:", label_style),
            Paragraph(clean_str(nna_data.get("apellidoPaterno")), bold_value_style),
            Paragraph("Apellido Materno:", label_style),
            Paragraph(clean_str(nna_data.get("apellidoMaterno")), bold_value_style),
            Paragraph("Nombres:", label_style),
            Paragraph(clean_str(nna_data.get("nombres")), bold_value_style),
        ],
        [
            Paragraph("Tipo Documento:", label_style),
            Paragraph(clean_str(nna_data.get("tipoDoc")), value_style),
            Paragraph("Nº Documento / DNI:", label_style),
            Paragraph(clean_str(nna_data.get("numeroDoc")), bold_value_style),
            Paragraph("Sexo:", label_style),
            Paragraph(sexo_desc, value_style),
        ],
        [
            Paragraph("Edad:", label_style),
            Paragraph(f"{clean_str(nna_data.get('edad'))} {clean_str(nna_data.get('unidadEdad')).lower()}", value_style),
            Paragraph("Nacionalidad:", label_style),
            Paragraph(clean_str(nna_data.get("nacionalidad")), value_style),
            Paragraph("Tiene Partida:", label_style),
            Paragraph(format_bool(nna_data.get("tienePartidaNacimiento")), value_style),
        ],
        [
            Paragraph("Ubicación Nacimiento:", label_style),
            Paragraph(f"{clean_str(nna_data.get('departamentoNac'))} / {clean_str(nna_data.get('provinciaNac'))} / {clean_str(nna_data.get('distritoNac'))}", value_style),
            Paragraph("Lengua Materna:", label_style),
            Paragraph(clean_str(nna_data.get("lenMatNna"), "Castellano"), value_style),
            Paragraph("Autoidentificación:", label_style),
            Paragraph(clean_str(nna_data.get("autIdeEtNna"), "Mestizo"), value_style),
        ],
        [
            Paragraph("Domicilio Actual:", label_style),
            Paragraph(clean_str(nna_data.get("domicilioActual")), value_style),
            Paragraph("Referencia:", label_style),
            Paragraph(clean_str(nna_data.get("referenciaDomicilio")), value_style),
            Paragraph("Teléfono:", label_style),
            Paragraph(clean_str(nna_data.get("telefonoContacto")), value_style),
        ]
    ]
    
    col_w2 = doc.width / 6.0
    sec2_table = Table(sec2_data, colWidths=[col_w2, col_w2, col_w2, col_w2, col_w2, col_w2])
    sec2_table.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('BACKGROUND', (0,0), (0,-1), BG_LIGHT),
        ('BACKGROUND', (2,0), (2,-1), BG_LIGHT),
        ('BACKGROUND', (4,0), (4,-1), BG_LIGHT),
        ('SPAN', (1, 4), (3, 4)), # Span domicilio
        ('PADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    
    story.append(sec2_table)
    story.append(Spacer(1, 10))

    # ─── Sección 3: Familiar Responsable (Tutor) ─────────────────────────────
    story.append(make_section_header("III. FAMILIAR / ADULTO RESPONSABLE (SEC 2026)"))
    story.append(Spacer(1, 4))
    
    familiares = nna_data.get("familiares") or []
    tutor_principal = next((f for f in familiares if f.get("viveCon") == "SI" or f.get("parentesco") in ["Padre o madre", "Tutor"]), familiares[0] if familiares else {})
    
    sec3_data = [
        [
            Paragraph("Nombres y Apellidos:", label_style),
            Paragraph(f"{clean_str(tutor_principal.get('nombres'), 'No registra')}", bold_value_style),
            Paragraph("Vínculo / Parentesco:", label_style),
            Paragraph(clean_str(tutor_principal.get("parentesco")), value_style),
        ],
        [
            Paragraph("DNI / Documento:", label_style),
            Paragraph(clean_str(tutor_principal.get("dni")), value_style),
            Paragraph("Teléfono de Contacto:", label_style),
            Paragraph(clean_str(tutor_principal.get("telefono")), value_style),
        ],
        [
            Paragraph("Ocupación Principal:", label_style),
            Paragraph(clean_str(tutor_principal.get("ocupacion")), value_style),
            Paragraph("¿Vive con el NNA?:", label_style),
            Paragraph(clean_str(tutor_principal.get("viveCon"), "NO"), value_style),
        ]
    ]
    
    sec3_table = Table(sec3_data, colWidths=[col_w, col_w, col_w, col_w])
    sec3_table.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('BACKGROUND', (0,0), (0,-1), BG_LIGHT),
        ('BACKGROUND', (2,0), (2,-1), BG_LIGHT),
        ('PADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(sec3_table)
    story.append(Spacer(1, 10))

    # ─── Sección 4: Salud y Educación ───────────────────────────────────────
    story.append(make_section_header("IV. SITUACIÓN DE SALUD Y EDUCACIÓN"))
    story.append(Spacer(1, 4))
    
    sec4_data = [
        [
            Paragraph("Afiliado a SIS:", label_style),
            Paragraph(clean_str(nna_data.get("afiliadoSIS")), value_style),
            Paragraph("Afiliado a Otro Seguro:", label_style),
            Paragraph(clean_str(nna_data.get("afiliadoOtroSeguro"), "Ninguno"), value_style),
        ],
        [
            Paragraph("Sufre Enfermedad:", label_style),
            Paragraph(clean_str(nna_data.get("sufreEnfermedad")), value_style),
            Paragraph("Tiene Discapacidad:", label_style),
            Paragraph(format_bool(nna_data.get("tieneDiscapacidad")), value_style),
        ],
        [
            Paragraph("Estudia Actualmente:", label_style),
            Paragraph(format_bool(nna_data.get("estudiaActualmente")), bold_value_style),
            Paragraph("Nivel Educativo:", label_style),
            Paragraph(clean_str(nna_data.get("nivelEducativo")), value_style),
        ],
        [
            Paragraph("Grado de Estudio:", label_style),
            Paragraph(clean_str(nna_data.get("gradoEstudio")), value_style),
            Paragraph("Institución Educativa:", label_style),
            Paragraph(clean_str(nna_data.get("institucionEducativa")), value_style),
        ]
    ]
    
    sec4_table = Table(sec4_data, colWidths=[col_w, col_w, col_w, col_w])
    sec4_table.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('BACKGROUND', (0,0), (0,-1), BG_LIGHT),
        ('BACKGROUND', (2,0), (2,-1), BG_LIGHT),
        ('PADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(sec4_table)
    story.append(Spacer(1, 10))

    # ─── Sección 5: Actividades y Características del Entorno ──────────────
    story.append(make_section_header("V. ACTIVIDADES DE TIEMPO LIBRE Y USO DEL TIEMPO"))
    story.append(Spacer(1, 4))
    
    actividades = clean_str(nna_data.get("actividadesTiempoLibre"), "No registra actividades evaluadas.")
    caract = clean_str(nna_data.get("caracteristicas"), "No registra observaciones especiales.")
    
    sec5_data = [
        [
            Paragraph("Evaluación de Actividades y Uso del Tiempo (SEC 2026):", label_style),
        ],
        [
            Paragraph(actividades, value_style),
        ],
        [
            Paragraph("Características Generales y Observaciones de Abordaje:", label_style),
        ],
        [
            Paragraph(caract, value_style),
        ]
    ]
    
    sec5_table = Table(sec5_data, colWidths=[doc.width])
    sec5_table.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('BACKGROUND', (0,0), (0,0), BG_LIGHT),
        ('BACKGROUND', (0,2), (0,2), BG_LIGHT),
        ('PADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(sec5_table)
    
    # ─── Firmas de Compromiso ─────────────────────────────────────────────────
    story.append(Spacer(1, 45))
    
    firmas_data = [
        [
            Paragraph("___________________________________<br/><b>Firma del Educador de Calle</b><br/>Programa Nacional Yachay", ParagraphStyle('Firma1', parent=styles['Normal'], alignment=1, fontSize=8)),
            Paragraph("___________________________________<br/><b>Firma del Familiar / Tutor</b><br/>Huella / Firma de Responsabilidad", ParagraphStyle('Firma2', parent=styles['Normal'], alignment=1, fontSize=8))
        ]
    ]
    
    firmas_table = Table(firmas_data, colWidths=[doc.width/2.0, doc.width/2.0])
    firmas_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'BOTTOM'),
    ]))
    story.append(firmas_table)

    # ─── Construir PDF ────────────────────────────────────────────────────────
    doc.build(story)
    
    return output_path
