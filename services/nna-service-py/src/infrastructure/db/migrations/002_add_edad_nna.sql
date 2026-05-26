-- ============================================================
-- MIGRACIÓN 002 — Agrega EDAD y UNIDAD_EDAD a tabla NNA
-- Motor: Oracle 12c+  |  Ejecutar como SEC_USER
-- ============================================================

-- Agregar columnas de edad al NNA
-- EDAD: número entero (días, meses o años según UNIDAD_EDAD)
-- UNIDAD_EDAD: 'ANIOS', 'MESES', 'DIAS'
BEGIN
    EXECUTE IMMEDIATE 'ALTER TABLE SEC_USER.NNA ADD (
        EDAD        NUMBER(4),
        UNIDAD_EDAD VARCHAR2(10) DEFAULT ''ANIOS''
    )';
    DBMS_OUTPUT.PUT_LINE('Columnas EDAD y UNIDAD_EDAD agregadas correctamente.');
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE = -1430 THEN
            DBMS_OUTPUT.PUT_LINE('Las columnas ya existen, se omite la migración.');
        ELSE
            RAISE;
        END IF;
END;
/

-- Verificar
SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, DATA_DEFAULT
FROM ALL_TAB_COLUMNS
WHERE TABLE_NAME = 'NNA'
  AND OWNER = 'SEC_USER'
  AND COLUMN_NAME IN ('EDAD', 'UNIDAD_EDAD')
ORDER BY COLUMN_ID;
