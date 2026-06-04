-- ============================================================
-- MIGRACIÓN 003 — expediente-service: ESTADO en EXP_INFORME_SITUACIONAL
-- Motor: Oracle 12c+
-- ============================================================

BEGIN EXECUTE IMMEDIATE '
  ALTER TABLE EXP_INFORME_SITUACIONAL
  ADD (ESTADO VARCHAR2(20) DEFAULT ''BORRADOR'' NOT NULL)
'; EXCEPTION WHEN OTHERS THEN IF SQLCODE = -1430 THEN NULL; ELSE RAISE; END IF; END;
/
