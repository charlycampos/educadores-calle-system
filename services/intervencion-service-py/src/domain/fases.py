"""
Catálogo de fases del servicio — fuente única de nombres y plazos.

Los nombres y las duraciones salen de la RDE 069-2021, recogidos en
GUIA_OPERATIVA_SEC.md (Etapa 3 — Prestación del Servicio):

    FASE I   — Contacto e Integración .................  3 meses (+1 extensión)
    FASE II  — Desarrollo e Intervención para la
               Restitución de Derechos ................ 15 meses (+1 extensión)
    FASE III — Seguimiento y Egreso ...................  6 meses
                                                        ─────────
                                               total    24 meses

La extensión de 1 mes de las fases I y II requiere Informe Técnico que la
sustente. La Fase III no admite extensión.

Este módulo NO decide promociones. El avance de fase lo decide el educador
cerrando la fase en el F05; aquí solo viven el vocabulario y los plazos con
los que se calcula el semáforo.
"""

FASES = ("I", "II", "III")

NOMBRE = {
    "I":   "Contacto e Integración",
    "II":  "Desarrollo e Intervención para la Restitución de Derechos",
    "III": "Seguimiento y Egreso",
}

# Nombre corto para tableros y chips, donde el oficial no entra.
NOMBRE_CORTO = {
    "I":   "Contacto e Integración",
    "II":  "Restitución de Derechos",
    "III": "Seguimiento y Egreso",
}

PLAZO_MESES = {"I": 3, "II": 15, "III": 6}

# Meses de extensión que admite cada fase con Informe Técnico.
EXTENSION_MAXIMA = {"I": 1, "II": 1, "III": 0}

SIGUIENTE = {"I": "II", "II": "III", "III": None}

# Valor de NNA_CASO.FASE cuando el NNA ya egresó. No es una fase transitable:
# no vive en CASO_FASE, lo declara el F13 al finalizarse.
EGRESADO = "EGRESADO"


def numero(fase: str) -> int:
    """'II' → 2. Útil para ordenar y para las columnas Fn_FIN del F05."""
    return FASES.index(fase) + 1


def desde_numero(fase_num: int) -> str:
    """2 → 'II'. El F05 trabaja con números de fase."""
    if fase_num not in (1, 2, 3):
        raise ValueError(f"Número de fase inválido: {fase_num}. Debe ser 1, 2 ó 3.")
    return FASES[fase_num - 1]


def etiqueta(fase: str) -> str:
    """'II' → 'Fase II: Restitución de Derechos'."""
    if fase == EGRESADO:
        return "Egresados"
    return f"Fase {fase}: {NOMBRE_CORTO.get(fase, fase)}"
