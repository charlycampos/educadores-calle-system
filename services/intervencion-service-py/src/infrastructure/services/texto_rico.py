"""
Adaptación del texto con formato de los formularios al dialecto de reportlab.

Los campos largos del sistema —observaciones, descripciones, compromisos— se
capturan con negrita, cursiva, subrayado y viñetas, y se guardan como HTML
acotado. Reportlab entiende ``<b>``, ``<i>``, ``<u>`` y ``<br/>``, pero no
listas, y **aborta la generación entera del PDF** si encuentra una etiqueta que
no conoce: sin esta conversión la ficha impresa no solo saldría con "<ul><li>"
en medio del párrafo, sino que podría no generarse.

Vive aquí, y no dentro de cada generador, porque lo necesitan el F05, el F12 y
los que vengan.
"""

import re


def html_a_reportlab(valor, vacio: str = "") -> str:
    texto = "" if valor is None else str(valor).strip()
    if not texto or "<" not in texto:
        return texto or vacio

    # Cada elemento de lista se convierte en una línea con viñeta.
    texto = re.sub(r"<\s*li\s*>", "<br/>• ", texto, flags=re.I)
    texto = re.sub(r"<\s*ul[^>]*>", "", texto, flags=re.I)
    # El cierre de la lista o del párrafo sí lleva salto: sin él, lo que sigue
    # se pega al último ítem.
    texto = re.sub(r"</\s*(ul|p|div)\s*>", "<br/>", texto, flags=re.I)
    texto = re.sub(r"</\s*li\s*>", "", texto, flags=re.I)
    texto = re.sub(r"<\s*(p|div)[^>]*>", "", texto, flags=re.I)

    # reportlab usa las etiquetas cortas.
    texto = re.sub(r"<\s*strong\s*>", "<b>", texto, flags=re.I)
    texto = re.sub(r"</\s*strong\s*>", "</b>", texto, flags=re.I)
    texto = re.sub(r"<\s*em\s*>", "<i>", texto, flags=re.I)
    texto = re.sub(r"</\s*em\s*>", "</i>", texto, flags=re.I)
    texto = re.sub(r"<\s*ins\s*>", "<u>", texto, flags=re.I)
    texto = re.sub(r"</\s*ins\s*>", "</u>", texto, flags=re.I)

    # Cualquier otra etiqueta se descarta.
    texto = re.sub(r"<(?!/?(b|i|u|br)\b)[^>]*>", "", texto, flags=re.I)
    texto = re.sub(r"(<br/>){3,}", "<br/><br/>", texto, flags=re.I)
    texto = re.sub(r"^(<br/>)+", "", texto).strip()

    return texto or vacio
