-- ============================================================
-- Migración 003: admitir el estado EVALUADO en TALLER
--
-- La migración 001 creó el CHECK con tres valores:
--     PLANIFICADO | EJECUTADO | CANCELADO
--
-- Pero el frontend filtra, agrupa y colorea por un cuarto estado,
-- EVALUADO, que la base rechaza con ORA-02290. Hoy no revienta
-- porque nadie lo persiste — la evaluación vive dentro del texto
-- de PARTICIPANTE_TALLER.EVALUACION — pero es una bomba de tiempo
-- para lo primero que intente escribirlo.
--
-- El CHECK original se creó inline en el CREATE TABLE, así que
-- tiene nombre generado (SYS_Cnnnnn). Este script lo localiza por
-- su condición en vez de asumir un nombre.
--
-- IDEMPOTENTE: se puede volver a ejecutar sin error.
-- Sirve para SQL*Plus y para clientes JDBC (DBeaver, SQL Developer,
-- DataGrip): no usa comandos SET ni PROMPT.
-- ============================================================

DECLARE
    v_constraint  USER_CONSTRAINTS.CONSTRAINT_NAME%TYPE;
    v_existe      NUMBER;
BEGIN
    -- 1. Localizar el CHECK viejo por su contenido, no por su nombre
    BEGIN
        SELECT CONSTRAINT_NAME
          INTO v_constraint
          FROM ALL_CONSTRAINTS
         WHERE OWNER = 'SEC_USER'
           AND TABLE_NAME = 'TALLER'
           AND CONSTRAINT_TYPE = 'C'
           AND SEARCH_CONDITION_VC LIKE '%PLANIFICADO%'
           AND SEARCH_CONDITION_VC NOT LIKE '%EVALUADO%'
           AND ROWNUM = 1;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            v_constraint := NULL;
    END;

    IF v_constraint IS NOT NULL THEN
        EXECUTE IMMEDIATE 'ALTER TABLE SEC_USER.TALLER DROP CONSTRAINT ' || v_constraint;
        DBMS_OUTPUT.PUT_LINE('[003] CHECK anterior eliminado: ' || v_constraint);
    ELSE
        DBMS_OUTPUT.PUT_LINE('[003] omitido - no se encontró el CHECK anterior (¿ya migrado?)');
    END IF;

    -- 2. Crear el CHECK nuevo con los cuatro estados
    SELECT COUNT(*) INTO v_existe
      FROM ALL_CONSTRAINTS
     WHERE OWNER = 'SEC_USER'
       AND CONSTRAINT_NAME = 'CK_TALLER_ESTADO';

    IF v_existe = 0 THEN
        EXECUTE IMMEDIATE '
            ALTER TABLE SEC_USER.TALLER
                ADD CONSTRAINT CK_TALLER_ESTADO
                CHECK (ESTADO IN (''PLANIFICADO'', ''EJECUTADO'', ''EVALUADO'', ''CANCELADO''))';
        DBMS_OUTPUT.PUT_LINE('[003] CK_TALLER_ESTADO creado con 4 estados');
    ELSE
        DBMS_OUTPUT.PUT_LINE('[003] omitido - CK_TALLER_ESTADO ya existe');
    END IF;

    COMMIT;
    DBMS_OUTPUT.PUT_LINE('[003] MIGRACION COMPLETADA');
END;
/

-- Verificación: la condición debe incluir EVALUADO
SELECT CONSTRAINT_NAME, SEARCH_CONDITION_VC
  FROM ALL_CONSTRAINTS
 WHERE OWNER = 'SEC_USER'
   AND TABLE_NAME = 'TALLER'
   AND CONSTRAINT_TYPE = 'C';
