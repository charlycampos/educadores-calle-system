-- ============================================================
-- Migración 007: versionar el circuito de firma del F13
--
-- QUÉ ARREGLA
--
-- `ESTADO` y `DETALLES` se agregaron a mano en la base cuando se construyó el
-- circuito de firma, pero nunca quedaron en una migración. Consecuencia: un
-- despliegue limpio arranca con la Ficha de Egreso rota (ORA-00904) y sin
-- circuito de firma, y nadie sabría por qué.
--
-- Esta migración las versiona y, sobre todo, declara el CHECK con los cinco
-- estados del circuito. Sin él, un CHECK creado a mano con solo
-- ('BORRADOR','FINALIZADO') haría fallar la firma en producción.
--
--
-- LOS CINCO ESTADOS
--
--   BORRADOR ......... el educador redacta; se puede eliminar
--   FINALIZADO ....... ficha terminada, lista para firmar
--   PEND_COORDINADOR . firmada por el educador, en la bandeja del coordinador
--   OBSERVADO ........ devuelta con observación; vuelve a ser editable
--   FIRMADO .......... firmada por ambos; el NNA queda egresado
--
--
-- SITUACION_FAMILIAR pasa a 2000
--
-- Era VARCHAR2(100). El formulario escribía ahí `observacionesMayoriaEdad`, que
-- se captura con dictado y emite HTML: con una frase normal se pasaba de 100 y
-- el guardado moría con ORA-12899, mostrando al educador solo "Error al guardar
-- borrador".
--
-- El código deja de escribir esa columna (el dato vive en DETALLES), pero se
-- amplía igual: hay filas históricas y la columna sigue siendo parte del
-- formato. Lo mismo con RECOMENDACIONES.
--
--
-- Idempotente: se puede ejecutar más de una vez.
-- Ejecutar como SEC_USER, o con el prefijo si estás conectado como SYSTEM.
-- Sin comandos SQL*Plus: sirve igual en DBeaver.
-- ============================================================

-- ── 1. ESTADO y DETALLES ────────────────────────────────────────────────────
DECLARE
    v_existe NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_existe
      FROM ALL_TAB_COLUMNS
     WHERE OWNER = 'SEC_USER' AND TABLE_NAME = 'EXP_INFORME_CIERRE'
       AND COLUMN_NAME = 'ESTADO';
    IF v_existe = 0 THEN
        EXECUTE IMMEDIATE
            'ALTER TABLE SEC_USER.EXP_INFORME_CIERRE
                 ADD (ESTADO VARCHAR2(20) DEFAULT ''BORRADOR'' NOT NULL)';
    END IF;

    SELECT COUNT(*) INTO v_existe
      FROM ALL_TAB_COLUMNS
     WHERE OWNER = 'SEC_USER' AND TABLE_NAME = 'EXP_INFORME_CIERRE'
       AND COLUMN_NAME = 'DETALLES';
    IF v_existe = 0 THEN
        EXECUTE IMMEDIATE
            'ALTER TABLE SEC_USER.EXP_INFORME_CIERRE ADD (DETALLES CLOB)';
    END IF;
END;
/

COMMENT ON COLUMN SEC_USER.EXP_INFORME_CIERRE.ESTADO IS
    'BORRADOR / FINALIZADO / PEND_COORDINADOR / OBSERVADO / FIRMADO';
COMMENT ON COLUMN SEC_USER.EXP_INFORME_CIERRE.DETALLES IS
    'JSON con la ficha completa del F13, las firmas y la observacion del coordinador';


-- ── 2. El correlativo pasa a ser opcional ───────────────────────────────────
-- Se asigna cuando el coordinador firma, no al primer guardado.
--
-- Antes se gastaba un número por cada borrador: si el educador abría la ficha,
-- guardaba y se arrepentía, ese número quedaba muerto. Una numeración con
-- huecos es una observación de auditoría difícil de explicar cuando 23 sedes
-- reportan a la DGNNA.
DECLARE
    v_nullable VARCHAR2(1);
BEGIN
    SELECT NULLABLE INTO v_nullable
      FROM ALL_TAB_COLUMNS
     WHERE OWNER = 'SEC_USER' AND TABLE_NAME = 'EXP_INFORME_CIERRE'
       AND COLUMN_NAME = 'CODIGO_INFORME';
    IF v_nullable = 'N' THEN
        EXECUTE IMMEDIATE
            'ALTER TABLE SEC_USER.EXP_INFORME_CIERRE MODIFY (CODIGO_INFORME NULL)';
    END IF;
END;
/

COMMENT ON COLUMN SEC_USER.EXP_INFORME_CIERRE.CODIGO_INFORME IS
    'Correlativo INF-SEDE-ANIO-NNNN. Se asigna al firmar el coordinador: antes de eso la ficha no es un documento oficial y no debe consumir numero';


-- Índice único sobre el correlativo: red de seguridad contra números
-- repetidos. En Oracle un índice único ignora los NULL, así que conviven sin
-- problema las fichas que todavía no tienen número asignado.
DECLARE
    v_existe NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_existe
      FROM ALL_INDEXES
     WHERE OWNER = 'SEC_USER' AND INDEX_NAME = 'UX_INF_CIERRE_CODIGO';
    IF v_existe = 0 THEN
        EXECUTE IMMEDIATE
            'CREATE UNIQUE INDEX SEC_USER.UX_INF_CIERRE_CODIGO
                 ON SEC_USER.EXP_INFORME_CIERRE (CODIGO_INFORME)';
    END IF;
EXCEPTION
    -- ORA-01452: ya hay códigos repetidos de antes. Se avisa y se sigue: la
    -- migración no debe fallar por datos históricos, pero hay que limpiarlos.
    WHEN OTHERS THEN
        IF SQLCODE = -1452 THEN
            DBMS_OUTPUT.PUT_LINE(
                'AVISO: hay correlativos duplicados en EXP_INFORME_CIERRE. '
                || 'El indice unico no se creo. Revise con la consulta 4 de la verificacion.');
        ELSE
            RAISE;
        END IF;
END;
/


-- ── 3. Ampliar los campos de texto que se quedaron cortos ───────────────────
DECLARE
    PROCEDURE ampliar(p_col VARCHAR2, p_largo NUMBER) IS
        v_len NUMBER;
    BEGIN
        SELECT DATA_LENGTH INTO v_len
          FROM ALL_TAB_COLUMNS
         WHERE OWNER = 'SEC_USER' AND TABLE_NAME = 'EXP_INFORME_CIERRE'
           AND COLUMN_NAME = p_col;
        IF v_len < p_largo THEN
            EXECUTE IMMEDIATE 'ALTER TABLE SEC_USER.EXP_INFORME_CIERRE MODIFY ('
                              || p_col || ' VARCHAR2(' || p_largo || '))';
        END IF;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN NULL;  -- la columna no existe en esta base
    END;
BEGIN
    ampliar('SITUACION_FAMILIAR',  2000);
    ampliar('SITUACION_EDUCATIVA', 2000);
    ampliar('RECOMENDACIONES',     2000);
    ampliar('LOGROS_ALCANZADOS',   2000);
END;
/


-- ── 4. El CHECK de los cinco estados ────────────────────────────────────────
--
-- Todo en un solo bloque PL/SQL: primero se normaliza lo que haya para que
-- ninguna fila viole el CHECK, y recién después se crea.
--
-- Va como bloque y no como sentencias sueltas a propósito: así se ejecuta
-- entero de una vez y no depende de cómo el cliente SQL separe los statements.
DECLARE
    v_nombre VARCHAR2(128);
BEGIN
    -- Cualquier valor fuera del vocabulario pasa a BORRADOR.
    UPDATE SEC_USER.EXP_INFORME_CIERRE
       SET ESTADO = 'BORRADOR'
     WHERE ESTADO IS NULL
        OR ESTADO NOT IN ('BORRADOR','FINALIZADO','PEND_COORDINADOR','OBSERVADO','FIRMADO');
    COMMIT;

    -- Se elimina cualquier CHECK previo sobre ESTADO —puede haberse creado a
    -- mano con solo dos estados— buscándolo por su condición y no por su nombre.
    FOR c IN (
        SELECT CONSTRAINT_NAME
          FROM ALL_CONSTRAINTS
         WHERE OWNER = 'SEC_USER'
           AND TABLE_NAME = 'EXP_INFORME_CIERRE'
           AND CONSTRAINT_TYPE = 'C'
           AND UPPER(SEARCH_CONDITION_VC) LIKE '%ESTADO%'
           AND UPPER(SEARCH_CONDITION_VC) NOT LIKE '%NOT NULL%'
    ) LOOP
        v_nombre := c.CONSTRAINT_NAME;
        EXECUTE IMMEDIATE
            'ALTER TABLE SEC_USER.EXP_INFORME_CIERRE DROP CONSTRAINT ' || v_nombre;
    END LOOP;

    EXECUTE IMMEDIATE
        'ALTER TABLE SEC_USER.EXP_INFORME_CIERRE ADD CONSTRAINT CK_INF_CIERRE_ESTADO
             CHECK (ESTADO IN (''BORRADOR'',''FINALIZADO'',''PEND_COORDINADOR'',''OBSERVADO'',''FIRMADO''))';
END;
/


-- ============================================================
-- VERIFICACIÓN
-- ============================================================

-- 1. Las dos columnas del circuito y las longitudes ampliadas
SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, NULLABLE
  FROM ALL_TAB_COLUMNS
 WHERE OWNER = 'SEC_USER' AND TABLE_NAME = 'EXP_INFORME_CIERRE'
   AND COLUMN_NAME IN ('ESTADO','DETALLES','CODIGO_INFORME',
                       'SITUACION_FAMILIAR','SITUACION_EDUCATIVA',
                       'RECOMENDACIONES','LOGROS_ALCANZADOS')
 ORDER BY COLUMN_NAME;

-- 2. Debe quedar solo CK_INF_CIERRE_ESTADO, con los cinco estados
SELECT CONSTRAINT_NAME, SEARCH_CONDITION_VC
  FROM ALL_CONSTRAINTS
 WHERE OWNER = 'SEC_USER' AND TABLE_NAME = 'EXP_INFORME_CIERRE'
   AND CONSTRAINT_TYPE = 'C'
   AND UPPER(SEARCH_CONDITION_VC) LIKE '%ESTADO%';

-- 3. Reparto actual de estados
SELECT ESTADO, COUNT(*) AS CANTIDAD
  FROM SEC_USER.EXP_INFORME_CIERRE
 GROUP BY ESTADO
 ORDER BY CANTIDAD DESC;

-- 4. Correlativos duplicados. Debe devolver CERO filas.
--    Si devuelve algo, el índice único del paso 2 no se creó y hay que
--    renumerar esas fichas antes de volver a ejecutar la migración.
SELECT CODIGO_INFORME, COUNT(*) AS VECES
  FROM SEC_USER.EXP_INFORME_CIERRE
 WHERE CODIGO_INFORME IS NOT NULL
 GROUP BY CODIGO_INFORME
HAVING COUNT(*) > 1;
