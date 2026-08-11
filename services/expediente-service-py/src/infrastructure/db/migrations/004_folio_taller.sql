-- ============================================================
-- Migración 004: vincular folios del expediente con su taller
--
-- Motivo (reunión SEC 05/08/2026): la lista de asistencia firmada
-- y las fotos del taller deben archivarse en el expediente digital
-- de cada participante. Un mismo archivo genera N folios, uno por
-- participante.
--
-- TALLER_ID permite responder "¿qué evidencia ya subí de este
-- taller?" sin duplicar el registro en otra tabla: el folio sigue
-- siendo la única fuente de verdad del expediente.
--
-- Queda NULL en todos los folios que no provienen de un taller.
--
-- Ejecutar como SEC_USER, o con el prefijo si estás conectado
-- como SYSTEM (ver versión _DBEAVER).
-- ============================================================

ALTER TABLE EXP_FOLIO ADD (TALLER_ID NUMBER);

CREATE INDEX IDX_FOLIO_TALLER ON EXP_FOLIO(TALLER_ID);

COMMENT ON COLUMN EXP_FOLIO.TALLER_ID
    IS 'Taller que originó este folio (evidencia F10/F11 o fotos). NULL si no proviene de un taller';

COMMIT;

-- Verificación: debe aparecer TALLER_ID
SELECT COLUMN_NAME, DATA_TYPE, NULLABLE
  FROM USER_TAB_COLUMNS
 WHERE TABLE_NAME = 'EXP_FOLIO'
 ORDER BY COLUMN_ID;
