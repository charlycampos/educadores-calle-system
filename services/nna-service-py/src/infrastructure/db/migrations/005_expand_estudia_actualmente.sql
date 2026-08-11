-- ============================================================
-- MIGRACIÓN 005 — Permite el código 99 (No aplica) en matrícula
-- Motor: Oracle 12c+  |  Ejecutar como SEC_USER
-- ============================================================

WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK;

-- La columna original NUMBER(1) admite 0, 1 y 3, pero no el código
-- oficial 99 usado para "No aplica". La ampliación no pierde datos.
ALTER TABLE SEC_USER.NNA MODIFY (ESTUDIA_ACTUALMENTE NUMBER(2) DEFAULT 0);

-- Verificar que DATA_PRECISION sea 2.
SELECT COLUMN_NAME, DATA_TYPE, DATA_PRECISION, DATA_SCALE, DATA_DEFAULT
FROM ALL_TAB_COLUMNS
WHERE TABLE_NAME = 'NNA'
  AND OWNER = 'SEC_USER'
  AND COLUMN_NAME = 'ESTUDIA_ACTUALMENTE';

EXIT SUCCESS;
