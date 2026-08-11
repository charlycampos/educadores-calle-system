-- ============================================================
-- Migración 002: participantes familiares en talleres
--
-- Motivo (reunión SEC 05/08/2026): existen talleres de padres y
-- la asistencia de familias se registra en el Formato 11. Hasta
-- ahora PARTICIPANTE_TALLER solo admitía NNA_ID, por lo que el
-- F11 se imprimía en blanco y los padres se llenaban a mano.
--
-- La tabla pasa a ser polimórfica: cada fila es un NNA o un
-- familiar, nunca ambos. Los familiares ya existen en
-- NNA_FAMILIAR (capturados en la ficha F03), así que no se
-- vuelve a digitar ningún nombre.
--
-- IDEMPOTENTE: se puede volver a ejecutar sin error. Cada paso
-- verifica el diccionario de datos antes de aplicar el cambio.
-- ============================================================

SET SERVEROUTPUT ON

DECLARE
    v_existe NUMBER;

    PROCEDURE log_paso(p_mensaje VARCHAR2) IS
    BEGIN
        DBMS_OUTPUT.PUT_LINE('[002] ' || p_mensaje);
    END;

    PROCEDURE ejecutar(p_sql VARCHAR2, p_descripcion VARCHAR2) IS
    BEGIN
        EXECUTE IMMEDIATE p_sql;
        log_paso('OK - ' || p_descripcion);
    END;
BEGIN
    ------------------------------------------------------------
    -- 1. Columna TIPO
    ------------------------------------------------------------
    SELECT COUNT(*) INTO v_existe
      FROM USER_TAB_COLUMNS
     WHERE TABLE_NAME = 'PARTICIPANTE_TALLER' AND COLUMN_NAME = 'TIPO';

    IF v_existe = 0 THEN
        ejecutar('ALTER TABLE PARTICIPANTE_TALLER ADD (TIPO VARCHAR2(10) DEFAULT ''NNA'' NOT NULL)',
                 'columna TIPO agregada');
    ELSE
        log_paso('omitido - la columna TIPO ya existe');
    END IF;

    ------------------------------------------------------------
    -- 2. Columna FAMILIAR_ID
    ------------------------------------------------------------
    SELECT COUNT(*) INTO v_existe
      FROM USER_TAB_COLUMNS
     WHERE TABLE_NAME = 'PARTICIPANTE_TALLER' AND COLUMN_NAME = 'FAMILIAR_ID';

    IF v_existe = 0 THEN
        ejecutar('ALTER TABLE PARTICIPANTE_TALLER ADD (FAMILIAR_ID NUMBER)',
                 'columna FAMILIAR_ID agregada');
    ELSE
        log_paso('omitido - la columna FAMILIAR_ID ya existe');
    END IF;

    ------------------------------------------------------------
    -- 3. NNA_ID deja de ser obligatorio (un familiar no tiene NNA_ID)
    ------------------------------------------------------------
    SELECT COUNT(*) INTO v_existe
      FROM USER_TAB_COLUMNS
     WHERE TABLE_NAME = 'PARTICIPANTE_TALLER'
       AND COLUMN_NAME = 'NNA_ID'
       AND NULLABLE = 'N';

    IF v_existe > 0 THEN
        ejecutar('ALTER TABLE PARTICIPANTE_TALLER MODIFY (NNA_ID NULL)',
                 'NNA_ID ahora admite NULL');
    ELSE
        log_paso('omitido - NNA_ID ya admite NULL');
    END IF;

    ------------------------------------------------------------
    -- 4. Restricciones
    ------------------------------------------------------------
    SELECT COUNT(*) INTO v_existe
      FROM USER_CONSTRAINTS WHERE CONSTRAINT_NAME = 'CK_PT_TIPO';

    IF v_existe = 0 THEN
        ejecutar('ALTER TABLE PARTICIPANTE_TALLER ADD CONSTRAINT CK_PT_TIPO ' ||
                 'CHECK (TIPO IN (''NNA'', ''FAMILIAR''))',
                 'CK_PT_TIPO creada');
    ELSE
        log_paso('omitido - CK_PT_TIPO ya existe');
    END IF;

    -- Exactamente una de las dos referencias debe venir informada
    SELECT COUNT(*) INTO v_existe
      FROM USER_CONSTRAINTS WHERE CONSTRAINT_NAME = 'CK_PT_REFERENCIA';

    IF v_existe = 0 THEN
        ejecutar('ALTER TABLE PARTICIPANTE_TALLER ADD CONSTRAINT CK_PT_REFERENCIA CHECK (' ||
                 '(TIPO = ''NNA''      AND NNA_ID      IS NOT NULL AND FAMILIAR_ID IS NULL) OR ' ||
                 '(TIPO = ''FAMILIAR'' AND FAMILIAR_ID IS NOT NULL AND NNA_ID      IS NULL))',
                 'CK_PT_REFERENCIA creada');
    ELSE
        log_paso('omitido - CK_PT_REFERENCIA ya existe');
    END IF;

    SELECT COUNT(*) INTO v_existe
      FROM USER_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_PT_FAMILIAR';

    IF v_existe = 0 THEN
        ejecutar('ALTER TABLE PARTICIPANTE_TALLER ADD CONSTRAINT FK_PT_FAMILIAR ' ||
                 'FOREIGN KEY (FAMILIAR_ID) REFERENCES NNA_FAMILIAR(ID) ON DELETE CASCADE',
                 'FK_PT_FAMILIAR creada');
    ELSE
        log_paso('omitido - FK_PT_FAMILIAR ya existe');
    END IF;

    ------------------------------------------------------------
    -- 5. Unicidad por taller
    -- Índices basados en función: cuando la referencia es NULL todas
    -- las columnas indexadas quedan NULL y Oracle no indexa la fila,
    -- de modo que N familiares del mismo taller no colisionan.
    ------------------------------------------------------------
    SELECT COUNT(*) INTO v_existe
      FROM USER_INDEXES WHERE INDEX_NAME = 'UX_PT_TALLER_NNA';

    IF v_existe = 0 THEN
        ejecutar('CREATE UNIQUE INDEX UX_PT_TALLER_NNA ON PARTICIPANTE_TALLER (' ||
                 'CASE WHEN NNA_ID IS NOT NULL THEN TALLER_ID END, NNA_ID)',
                 'UX_PT_TALLER_NNA creado');
    ELSE
        log_paso('omitido - UX_PT_TALLER_NNA ya existe');
    END IF;

    SELECT COUNT(*) INTO v_existe
      FROM USER_INDEXES WHERE INDEX_NAME = 'UX_PT_TALLER_FAMILIAR';

    IF v_existe = 0 THEN
        ejecutar('CREATE UNIQUE INDEX UX_PT_TALLER_FAMILIAR ON PARTICIPANTE_TALLER (' ||
                 'CASE WHEN FAMILIAR_ID IS NOT NULL THEN TALLER_ID END, FAMILIAR_ID)',
                 'UX_PT_TALLER_FAMILIAR creado');
    ELSE
        log_paso('omitido - UX_PT_TALLER_FAMILIAR ya existe');
    END IF;

    SELECT COUNT(*) INTO v_existe
      FROM USER_INDEXES WHERE INDEX_NAME = 'IDX_PT_FAMILIAR';

    IF v_existe = 0 THEN
        ejecutar('CREATE INDEX IDX_PT_FAMILIAR ON PARTICIPANTE_TALLER(FAMILIAR_ID)',
                 'IDX_PT_FAMILIAR creado');
    ELSE
        log_paso('omitido - IDX_PT_FAMILIAR ya existe');
    END IF;

    ------------------------------------------------------------
    -- 6. Backfill: las filas previas a esta migración son todas NNA
    ------------------------------------------------------------
    UPDATE PARTICIPANTE_TALLER SET TIPO = 'NNA' WHERE TIPO IS NULL;
    log_paso('backfill aplicado a ' || SQL%ROWCOUNT || ' fila(s)');

    COMMIT;
    log_paso('MIGRACION 002 COMPLETADA');
END;
/

-- Comentarios de documentación (se pueden repetir sin error)
COMMENT ON COLUMN PARTICIPANTE_TALLER.TIPO
    IS 'NNA (Formato 10 - usuarios) o FAMILIAR (Formato 11 - familias)';
COMMENT ON COLUMN PARTICIPANTE_TALLER.FAMILIAR_ID
    IS 'FK a NNA_FAMILIAR. Informado solo cuando TIPO = FAMILIAR';

-- Verificación final: debe listar TIPO y FAMILIAR_ID
SELECT COLUMN_NAME, DATA_TYPE, NULLABLE
  FROM USER_TAB_COLUMNS
 WHERE TABLE_NAME = 'PARTICIPANTE_TALLER'
 ORDER BY COLUMN_ID;
