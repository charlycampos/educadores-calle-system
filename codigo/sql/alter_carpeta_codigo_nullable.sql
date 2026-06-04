-- ============================================================
-- Hace CODIGO nullable en NNA_CARPETA.
-- El número de expediente se genera solo cuando existen
-- F03 + F04 + F05 para el NNA (según MO Actividad 5004954).
-- Los registros existentes no se ven afectados.
-- ============================================================
ALTER TABLE NNA_CARPETA MODIFY CODIGO VARCHAR2(50) NULL;
