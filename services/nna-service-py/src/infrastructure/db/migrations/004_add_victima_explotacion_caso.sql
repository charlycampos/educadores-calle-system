-- ============================================================
-- MIGRACIÓN 004 — Agrega VICTIMA_EXPLOTACION a tabla NNA_CASO
-- Motor: Oracle 12c+  |  Ejecutar como SEC_USER
-- ============================================================

BEGIN
    EXECUTE IMMEDIATE 'ALTER TABLE NNA_CASO ADD (
        VICTIMA_EXPLOTACION VARCHAR2(3) DEFAULT ''NO''
    )';
    DBMS_OUTPUT.PUT_LINE('Columna VICTIMA_EXPLOTACION agregada correctamente a NNA_CASO.');
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE = -1430 THEN
            DBMS_OUTPUT.PUT_LINE('La columna VICTIMA_EXPLOTACION ya existe, se omite.');
        ELSE
            RAISE;
        END IF;
END;
/
