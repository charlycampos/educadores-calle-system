-- Migration 006: Estructurar ACCION_PTI con columnas propias AREA y OBJETIVO.
-- Antes todo iba concatenado en DESCRIPCION como 'AREA | objetivo | actividad',
-- lo que se corrompía si el usuario escribía '|' y no permitía reportes por área.

ALTER TABLE ACCION_PTI ADD (AREA VARCHAR2(30) NULL, OBJETIVO VARCHAR2(600) NULL);

-- Backfill: separar los registros legacy con formato 'AREA | objetivo | actividad'
UPDATE ACCION_PTI SET
    AREA       = NVL(TRIM(REGEXP_SUBSTR(DESCRIPCION, '^[^|]+')), 'OTROS'),
    OBJETIVO   = TRIM(REGEXP_SUBSTR(DESCRIPCION, '[^|]+', 1, 2)),
    DESCRIPCION = NVL(TRIM(REGEXP_SUBSTR(DESCRIPCION, '[^|]+', 1, 3)), ' ')
WHERE INSTR(DESCRIPCION, '|') > 0 AND AREA IS NULL;

COMMIT;
