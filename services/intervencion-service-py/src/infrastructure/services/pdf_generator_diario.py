import os
import json
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage
from reportlab.lib.units import inch


def _repositorio_dir() -> str:
    return os.getenv("REPOSITORIO_DIARIO_PDFS", "./repositorio_archivos/diarios_campo")


def get_foto_path(diario_id: int) -> str:
    return os.path.join(_repositorio_dir(), f"foto_{diario_id}.jpg")


def get_firma_path(diario_id: int) -> str:
    return os.path.join(_repositorio_dir(), f"firma_{diario_id}.png")


TIPO_LABELS = {
    "CONSEJERIA":   "Consejería Individual",
    "COORDINACION": "Coordinación Institucional",
    "VISITA":       "Visita Domiciliaria",
    "RECORRIDO":    "Abordaje / Campo",
}
ESTADO_LABELS = {
    "REALIZADA":    "Realizada",
    "PENDIENTE":    "Pendiente",
    "REPROGRAMADA": "Reprogramada",
    "NO_REALIZADA": "No Realizada",
}


def generate_diario_pdf(diario_data: dict, nna_data: dict, educador_nombre: str, output_path: str) -> str:
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

    title_style    = ParagraphStyle("T",   parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=13, textColor=PRIMARY,                          alignment=1, spaceAfter=2)
    subtitle_style = ParagraphStyle("S",   parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=9,  textColor=colors.HexColor("#7C3AED"),        alignment=1, spaceAfter=10)
    section_style  = ParagraphStyle("Sec", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=9,  textColor=colors.white)
    label_style    = ParagraphStyle("L",   parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=8,  textColor=colors.HexColor("#374151"),        leading=10)
    value_style    = ParagraphStyle("V",   parent=styles["Normal"], fontName="Helvetica",      fontSize=8,  textColor=TEXT,                             leading=11)
    body_style     = ParagraphStyle("B",   parent=styles["Normal"], fontName="Helvetica",      fontSize=8,  textColor=TEXT,                             leading=12, spaceAfter=2)
    footer_style   = ParagraphStyle("F",   parent=styles["Normal"], fontName="Helvetica",      fontSize=7,  textColor=colors.grey,                      alignment=1)
    firma_label    = ParagraphStyle("Fi",  parent=styles["Normal"], fontName="Helvetica",      fontSize=8,  alignment=1)

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

    def text_block(content, min_height=50):
        safe = content if (content and str(content).strip() not in ("", "None", "null", "undefined", "-")) else "—"
        t = Table([[Paragraph(str(safe), body_style)]], colWidths=[doc.width])
        t.setStyle(TableStyle([
            ("GRID",         (0, 0), (-1, -1), 0.4, BORDER),
            ("PADDING",      (0, 0), (-1, -1), 6),
            ("MINROWHEIGHT", (0, 0), (-1, -1), min_height),
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

    # ── Parsear OBSERVACIONES ────────────────────────────────────────────────────
    obs_raw = diario_data.get("observaciones") or diario_data.get("OBSERVACIONES") or ""
    obs: dict = {}
    if obs_raw:
        try:
            parsed = json.loads(obs_raw)
            if isinstance(parsed, dict):
                obs = parsed
        except Exception:
            pass

    tipo_actividad      = obs.get("tipoActividad", "CONSEJERIA")
    estado_actividad    = obs.get("estadoActividad", "")
    hora_inicio         = obs.get("horaInicio", "")
    hora_fin            = obs.get("horaFin", "")
    actividad_programada = obs.get("actividadProgramada", "")
    resultados          = obs.get("resultadosObtenidos", "")
    obs_texto           = obs.get("observacionesTexto", "")
    es_institucional    = obs.get("esInstitucional", False)
    nombre_institucion  = obs.get("nombreInstitucion", "")
    tipo_institucion    = obs.get("tipoInstitucion", "")
    contacto_institucion = obs.get("contactoInstitucion", "")

    # ── Datos básicos ────────────────────────────────────────────────────────────
    nna_nombre = f"{c(nna_data.get('nombres'))} {c(nna_data.get('apellidoPaterno'))} {c(nna_data.get('apellidoMaterno', ''))}".strip(" -")
    nna_doc    = f"{c(nna_data.get('tipoDoc'))}: {c(nna_data.get('numeroDoc'))}" if nna_data.get("numeroDoc") else "-"

    fecha_raw = diario_data.get("fecha") or diario_data.get("FECHA") or ""
    fecha_str = str(fecha_raw)[:10] if fecha_raw else datetime.now().strftime("%Y-%m-%d")
    try:
        fecha_str = datetime.strptime(fecha_str, "%Y-%m-%d").strftime("%d/%m/%Y")
    except Exception:
        pass

    diario_id  = diario_data.get("id") or diario_data.get("ID")
    foto_path  = get_foto_path(diario_id) if diario_id else None
    firma_path = get_firma_path(diario_id) if diario_id else None
    has_foto   = bool(foto_path and os.path.exists(foto_path))
    has_firma  = bool(firma_path and os.path.exists(firma_path))

    lat = diario_data.get("latitud") or diario_data.get("LATITUD")
    lng = diario_data.get("longitud") or diario_data.get("LONGITUD")
    gps_str = f"Lat: {lat}, Lng: {lng}" if lat and lng else "-"

    # ── Cabecera ─────────────────────────────────────────────────────────────────
    story.append(Paragraph("SISTEMA DE GESTIÓN DE CASOS — SEC / INABIF", title_style))
    story.append(Paragraph("DIARIO DE CAMPO · EVIDENCIA DE INTERVENCIÓN INDIVIDUAL", subtitle_style))

    # ── I. Datos de Identificación ───────────────────────────────────────────────
    story.append(sec_header("I. Datos de Identificación"))
    story.append(Spacer(1, 4))

    w4 = doc.width / 4
    sec1 = [
        [L("NNA:"),             V(nna_nombre if not es_institucional else "Actividad Institucional"),
         L("Documento NNA:"),   V(nna_doc if not es_institucional else "-")],
        [L("Fecha de Diario:"), V(fecha_str),
         L("Educador:"),        V(educador_nombre)],
        [L("Ubicación:"),       V(diario_data.get("ubicacion") or diario_data.get("UBICACION")),
         L("ID Caso:"),         V(str(diario_data.get("caso_id") or diario_data.get("CASO_ID") or ""))],
    ]
    if es_institucional and nombre_institucion:
        sec1.append([
            L("Institución:"), V(f"{tipo_institucion} — {nombre_institucion}"),
            L("Contacto:"),    V(contacto_institucion),
        ])
    story.append(make_table(sec1, [w4, w4, w4, w4]))
    story.append(Spacer(1, 8))

    # ── II. Registro de la Actividad ─────────────────────────────────────────────
    story.append(sec_header("II. Registro de la Actividad"))
    story.append(Spacer(1, 4))

    horas_str = f"{hora_inicio} — {hora_fin}" if hora_inicio and hora_fin else c(hora_inicio or hora_fin)
    sec2 = [
        [L("Tipo de Actividad:"),  V(TIPO_LABELS.get(tipo_actividad, tipo_actividad)),
         L("Estado:"),             V(ESTADO_LABELS.get(estado_actividad, estado_actividad))],
        [L("Hora Inicio — Fin:"),  V(horas_str),
         L("Coordenadas GPS:"),    V(gps_str)],
        [L("Estado Físico NNA:"),  V(diario_data.get("estado_fisico") or diario_data.get("ESTADO_FISICO")),
         L("Estado Anímico NNA:"), V(diario_data.get("estado_animo") or diario_data.get("ESTADO_ANIMO"))],
    ]
    story.append(make_table(sec2, [w4, w4, w4, w4]))
    story.append(Spacer(1, 8))

    # ── III. Desarrollo de la Intervención ──────────────────────────────────────
    story.append(sec_header("III. Desarrollo de la Intervención"))
    story.append(Spacer(1, 4))

    narr = diario_data.get("actividad") or diario_data.get("ACTIVIDAD") or ""
    if narr and narr != "(Pendiente de ejecución)":
        story.append(Paragraph("Narración / Descripción de la Actividad:", label_style))
        story.append(Spacer(1, 2))
        story.append(text_block(narr, min_height=60))
        story.append(Spacer(1, 6))

    if actividad_programada:
        story.append(Paragraph("Actividad Programada (Planificación Previa):", label_style))
        story.append(Spacer(1, 2))
        story.append(text_block(actividad_programada, min_height=40))
        story.append(Spacer(1, 6))

    if resultados:
        story.append(Paragraph("Resultados Obtenidos / Acuerdos Establecidos:", label_style))
        story.append(Spacer(1, 2))
        story.append(text_block(resultados, min_height=40))
        story.append(Spacer(1, 6))

    if obs_texto:
        story.append(Paragraph("Observaciones Adicionales:", label_style))
        story.append(Spacer(1, 2))
        story.append(text_block(obs_texto, min_height=30))
        story.append(Spacer(1, 6))

    # ── IV. Evidencias ───────────────────────────────────────────────────────────
    if has_foto or has_firma:
        story.append(sec_header("IV. Evidencias"))
        story.append(Spacer(1, 6))

        w_half = doc.width / 2 - 10

        cells = []
        labels = []

        if has_foto:
            try:
                img = RLImage(foto_path, width=w_half, height=130, kind="proportional")
                cells.append(img)
                labels.append(Paragraph("Foto / Documento Evidencia", firma_label))
            except Exception:
                cells.append(Paragraph("(imagen no disponible)", body_style))
                labels.append(Paragraph("Foto Evidencia", firma_label))

        if has_firma:
            try:
                img = RLImage(firma_path, width=w_half * 0.7, height=80, kind="proportional")
                cells.append(img)
                labels.append(Paragraph("Firma Digital", firma_label))
            except Exception:
                cells.append(Paragraph("(firma no disponible)", body_style))
                labels.append(Paragraph("Firma Digital", firma_label))

        if len(cells) == 2:
            col_w = [doc.width / 2, doc.width / 2]
        else:
            col_w = [doc.width]

        ev_t = Table([cells, labels], colWidths=col_w)
        ev_t.setStyle(TableStyle([
            ("ALIGN",   (0, 0), (-1, -1), "CENTER"),
            ("VALIGN",  (0, 0), (- 1, 0), "MIDDLE"),
            ("VALIGN",  (0, 1), (-1, 1),  "TOP"),
            ("GRID",    (0, 0), (-1, -1), 0.4, BORDER),
            ("PADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(ev_t)
        story.append(Spacer(1, 8))

    # ── Firmas manuscritas ───────────────────────────────────────────────────────
    story.append(Spacer(1, 20))
    nna_label = nna_nombre if not es_institucional else "Responsable Institucional"
    firmas_t = Table([[
        Paragraph(f"___________________________________<br/><b>Firma del Educador</b><br/>{educador_nombre}", firma_label),
        Paragraph(f"___________________________________<br/><b>{'Huella / Firma del NNA' if not es_institucional else 'Sello / Firma Institucional'}</b><br/>{nna_label}", firma_label),
    ]], colWidths=[doc.width / 2, doc.width / 2])
    firmas_t.setStyle(TableStyle([
        ("ALIGN",  (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
    ]))
    story.append(firmas_t)
    story.append(Spacer(1, 16))
    story.append(Paragraph(
        f"Generado el {datetime.now().strftime('%d/%m/%Y %H:%M')} — Sistema SEC / INABIF",
        footer_style,
    ))

    doc.build(story)
    return output_path
