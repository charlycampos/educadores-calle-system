-- ============================================================
-- ALTER TABLE: PROCESO_LOGROS
-- Agrega columnas para controlar el cierre oficial de cada fase
-- Ejecutar después de create_proceso_logros.sql
-- ============================================================

ALTER TABLE PROCESO_LOGROS ADD F1_CERRADA NUMBER(1) DEFAULT 0 NOT NULL;
ALTER TABLE PROCESO_LOGROS ADD F2_CERRADA NUMBER(1) DEFAULT 0 NOT NULL;
ALTER TABLE PROCESO_LOGROS ADD F3_CERRADA NUMBER(1) DEFAULT 0 NOT NULL;

COMMENT ON COLUMN PROCESO_LOGROS.F1_CERRADA IS '1 = Fase I cerrada y registrada en expediente. 0 = abierta.';
COMMENT ON COLUMN PROCESO_LOGROS.F2_CERRADA IS '1 = Fase II cerrada y registrada en expediente. 0 = abierta.';
COMMENT ON COLUMN PROCESO_LOGROS.F3_CERRADA IS '1 = Fase III cerrada y registrada en expediente. 0 = abierta.';
