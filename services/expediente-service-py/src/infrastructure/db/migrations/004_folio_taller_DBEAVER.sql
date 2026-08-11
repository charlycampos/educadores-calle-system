-- ============================================================
-- Migración 004 (versión DBeaver / SQL Developer / DataGrip)
--
-- Todo calificado con SEC_USER. — si estás conectado como SYSTEM,
-- sin el prefijo Oracle busca la tabla en tu propio esquema y da
-- ORA-00942.
--
-- Ejecutar una sentencia por vez con Ctrl+Enter, en orden.
-- Si alguna falla con "ya existe" (ORA-01430 / ORA-00955), esa
-- parte ya estaba aplicada: continúa con la siguiente.
-- ============================================================


-- PASO 0 — Estado actual (no modifica nada)
SELECT COLUMN_NAME, DATA_TYPE, NULLABLE
  FROM ALL_TAB_COLUMNS
 WHERE OWNER = 'SEC_USER'
   AND TABLE_NAME = 'EXP_FOLIO'
 ORDER BY COLUMN_ID;


-- PASO 1 — Columna TALLER_ID
-- Vincula el folio con el taller que lo originó (evidencia F10/F11
-- o fotos). NULL en todos los folios que no vienen de un taller.
ALTER TABLE SEC_USER.EXP_FOLIO ADD (TALLER_ID NUMBER);


-- PASO 2 — Índice para listar la evidencia de un taller
CREATE INDEX SEC_USER.IDX_FOLIO_TALLER ON SEC_USER.EXP_FOLIO(TALLER_ID);


-- PASO 3 — Documentación
COMMENT ON COLUMN SEC_USER.EXP_FOLIO.TALLER_ID
    IS 'Taller que originó este folio (evidencia F10/F11 o fotos). NULL si no proviene de un taller';


-- PASO 4 — Confirmar
COMMIT;


-- PASO 5 — Verificación: debe aparecer TALLER_ID
SELECT COLUMN_NAME, DATA_TYPE, NULLABLE
  FROM ALL_TAB_COLUMNS
 WHERE OWNER = 'SEC_USER'
   AND TABLE_NAME = 'EXP_FOLIO'
 ORDER BY COLUMN_ID;
