-- ============================================================
-- Migración 005: número de páginas del documento foliado
--
-- El expediente digital folia hoja por hoja: ordena los documentos
-- por fecha y acumula páginas para calcular el rango (001-003).
-- Pero EXP_FOLIO nunca guardó cuántas páginas tiene el archivo, así
-- que el cliente asumía 1 para todo documento subido.
--
-- Consecuencia: una lista de asistencia de 3 hojas se foliaba como
-- una sola y corría el rango de todos los documentos posteriores
-- de ese NNA — justo lo que un expediente foliado no admite.
--
-- /expediente/upload ya cuenta las páginas con pypdf; solo faltaba
-- dónde guardarlas.
--
-- DEFAULT 1 mantiene el comportamiento actual para las filas
-- existentes, que es exactamente lo que el cliente ya asumía.
--
-- Ejecutar como SEC_USER, o con el prefijo si estás conectado como
-- SYSTEM. Sin comandos SQL*Plus: sirve igual en DBeaver.
-- ============================================================

ALTER TABLE SEC_USER.EXP_FOLIO ADD (PAGINAS NUMBER DEFAULT 1);

COMMENT ON COLUMN SEC_USER.EXP_FOLIO.PAGINAS
    IS 'Hojas del documento. Alimenta el foliado correlativo del expediente digital';

COMMIT;

-- Verificación: debe aparecer PAGINAS
SELECT COLUMN_NAME, DATA_TYPE, DATA_DEFAULT, NULLABLE
  FROM ALL_TAB_COLUMNS
 WHERE OWNER = 'SEC_USER'
   AND TABLE_NAME = 'EXP_FOLIO'
 ORDER BY COLUMN_ID;
