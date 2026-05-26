-- Migration 003: Agregar columna DATOS_F03 CLOB a tabla NNA
-- Guarda el JSON completo del formulario F03 (campos no normalizados)
-- Ejecutar como SEC_USER en DBeaver

BEGIN
    EXECUTE IMMEDIATE 'ALTER TABLE SEC_USER.NNA ADD (DATOS_F03 CLOB)';
    DBMS_OUTPUT.PUT_LINE('Columna DATOS_F03 agregada correctamente.');
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE = -1430 THEN
            DBMS_OUTPUT.PUT_LINE('DATOS_F03 ya existe, se omite.');
        ELSE
            RAISE;
        END IF;
END;
/
