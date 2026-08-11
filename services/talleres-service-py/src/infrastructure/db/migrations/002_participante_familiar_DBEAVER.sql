-- ============================================================
-- Migración 002 (versión para DBeaver / SQL Developer / DataGrip)
--
-- Dos diferencias con 002_participante_familiar.sql:
--   1. Sin comandos SQL*Plus (SET / PROMPT), que en un cliente
--      JDBC producen ORA-00922.
--   2. Todo calificado con SEC_USER. — si estás conectado como
--      SYSTEM (o cualquier otro usuario), sin el prefijo Oracle
--      busca la tabla en tu propio esquema y da ORA-00942.
--
-- CÓMO EJECUTAR: una sentencia por vez con Ctrl+Enter, en orden.
-- Si alguna falla con "ya existe" (ORA-01430 / ORA-01451 /
-- ORA-02275 / ORA-00955), esa parte ya estaba aplicada:
-- continúa con la siguiente.
-- ============================================================


-- PASO 0 — Ver el estado actual (no modifica nada)
SELECT COLUMN_NAME, DATA_TYPE, NULLABLE
  FROM ALL_TAB_COLUMNS
 WHERE OWNER = 'SEC_USER'
   AND TABLE_NAME = 'PARTICIPANTE_TALLER'
 ORDER BY COLUMN_ID;


-- PASO 1 — Columna TIPO
-- (ORA-01430 = ya existe, ignorar)
ALTER TABLE SEC_USER.PARTICIPANTE_TALLER ADD (TIPO VARCHAR2(10) DEFAULT 'NNA' NOT NULL);


-- PASO 2 — Columna FAMILIAR_ID
ALTER TABLE SEC_USER.PARTICIPANTE_TALLER ADD (FAMILIAR_ID NUMBER);


-- PASO 3 — NNA_ID pasa a admitir NULL (un familiar no tiene NNA_ID)
-- (ORA-01451 = ya era nullable, ignorar)
ALTER TABLE SEC_USER.PARTICIPANTE_TALLER MODIFY (NNA_ID NULL);


-- PASO 4 — El tipo solo admite dos valores
ALTER TABLE SEC_USER.PARTICIPANTE_TALLER
    ADD CONSTRAINT CK_PT_TIPO CHECK (TIPO IN ('NNA', 'FAMILIAR'));


-- PASO 5 — Exactamente una referencia informada según el tipo
ALTER TABLE SEC_USER.PARTICIPANTE_TALLER
    ADD CONSTRAINT CK_PT_REFERENCIA CHECK (
        (TIPO = 'NNA'      AND NNA_ID      IS NOT NULL AND FAMILIAR_ID IS NULL)
     OR (TIPO = 'FAMILIAR' AND FAMILIAR_ID IS NOT NULL AND NNA_ID      IS NULL)
    );


-- PASO 6 — FK hacia los familiares de la ficha F03
ALTER TABLE SEC_USER.PARTICIPANTE_TALLER
    ADD CONSTRAINT FK_PT_FAMILIAR FOREIGN KEY (FAMILIAR_ID)
        REFERENCES SEC_USER.NNA_FAMILIAR(ID) ON DELETE CASCADE;


-- PASO 7 — Unicidad de NNA por taller
-- Índice basado en función: si NNA_ID es NULL todas las columnas
-- indexadas quedan NULL y Oracle no indexa la fila, así N
-- familiares del mismo taller no colisionan entre sí.
CREATE UNIQUE INDEX SEC_USER.UX_PT_TALLER_NNA
    ON SEC_USER.PARTICIPANTE_TALLER (
        CASE WHEN NNA_ID IS NOT NULL THEN TALLER_ID END,
        NNA_ID
    );


-- PASO 8 — Unicidad de familiar por taller
CREATE UNIQUE INDEX SEC_USER.UX_PT_TALLER_FAMILIAR
    ON SEC_USER.PARTICIPANTE_TALLER (
        CASE WHEN FAMILIAR_ID IS NOT NULL THEN TALLER_ID END,
        FAMILIAR_ID
    );


-- PASO 9 — Índice de apoyo
CREATE INDEX SEC_USER.IDX_PT_FAMILIAR ON SEC_USER.PARTICIPANTE_TALLER(FAMILIAR_ID);


-- PASO 10 — Confirmar
COMMIT;


-- PASO 11 — Verificación: deben aparecer TIPO y FAMILIAR_ID
SELECT COLUMN_NAME, DATA_TYPE, NULLABLE
  FROM ALL_TAB_COLUMNS
 WHERE OWNER = 'SEC_USER'
   AND TABLE_NAME = 'PARTICIPANTE_TALLER'
 ORDER BY COLUMN_ID;


-- PASO 12 — Prueba de la consulta de padres para un taller concreto
-- (reemplaza 141 por el ID del taller que estés probando)
SELECT f.ID,
       MIN(f.NOMBRES)    AS nombres,
       MIN(f.PARENTESCO) AS parentesco,
       MIN(f.DNI)        AS dni,
       MIN(n.APELLIDO_PATERNO || ' ' || n.NOMBRES) AS nna_relacionado
  FROM SEC_USER.PARTICIPANTE_TALLER pt
  JOIN SEC_USER.NNA n          ON n.ID = pt.NNA_ID
  JOIN SEC_USER.NNA_FAMILIAR f ON f.CARPETA_ID = n.CARPETA_ID
 WHERE pt.TALLER_ID = 141
   AND pt.TIPO = 'NNA'
 GROUP BY f.ID
 ORDER BY MIN(f.NOMBRES);
