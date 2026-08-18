-- ============================================================
-- Migración 014: el estado del F04 sale del CLOB y pasa a columna
--
-- QUÉ ARREGLA
--
-- Si la Ficha de Diagnóstico Social es un borrador o está terminada se sabía
-- únicamente mirando `datos_extra.es_borrador`, una clave dentro del CLOB JSON.
-- Ninguna consulta SQL puede leer eso, así que SIETE lugares del sistema
-- contaban los borradores como F04 completos:
--
--   * expediente_service.py — ABRÍA EL EXPEDIENTE DIGITAL con un borrador
--   * nna_router.py — generaba el código de carpeta
--   * caso_router.py — el conteo N_F04 de la bandeja del coordinador
--   * oracle_dashboard_repository.py (x4) — alertas y reparto de Fase I
--   * statistics_router.py — el KPI de eficiencia y la alerta "Sin Diagnóstico"
--
-- El más grave es el primero: un borrador a medio llenar disparaba la apertura
-- del expediente y la generación del código de carpeta, que son irreversibles.
--
--
-- ESTADOS
--
--   BORRADOR — el educador la está llenando; el F04 aún no cuenta
--   COMPLETO — finalizada; abre expediente y suma en los reportes
--
-- El F04 se llena progresivamente durante toda la Fase I, así que un borrador
-- puede durar semanas. Por eso importa distinguirlos.
--
--
-- Idempotente: se puede ejecutar más de una vez.
-- Ejecutar como SEC_USER, o con el prefijo si estás conectado como SYSTEM.
-- Sin comandos SQL*Plus: sirve igual en DBeaver.
-- ============================================================

DECLARE
    v_existe NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_existe
      FROM ALL_TAB_COLUMNS
     WHERE OWNER = 'SEC_USER' AND TABLE_NAME = 'DIAGNOSTICO_SOCIAL'
       AND COLUMN_NAME = 'ESTADO';

    IF v_existe = 0 THEN
        -- Por defecto COMPLETO: las fichas que ya existen se crearon antes de
        -- que hubiera borradores, y marcarlas todas como borrador sacaría del
        -- conteo casos que ya están cerrados y con expediente abierto.
        EXECUTE IMMEDIATE
            'ALTER TABLE SEC_USER.DIAGNOSTICO_SOCIAL
                 ADD (ESTADO VARCHAR2(20) DEFAULT ''COMPLETO'' NOT NULL)';
    END IF;
END;
/

COMMENT ON COLUMN SEC_USER.DIAGNOSTICO_SOCIAL.ESTADO IS
    'BORRADOR mientras se llena / COMPLETO al finalizar. Solo las COMPLETO abren expediente y cuentan en reportes';


-- ── Backfill desde el JSON ──────────────────────────────────────────────────
-- Las fichas que hoy tienen es_borrador:true en su CLOB pasan a BORRADOR.
--
-- Se busca el texto directamente: el CLOB no es JSON nativo de Oracle, así que
-- no se puede usar JSON_VALUE de forma fiable en todas las versiones. El patrón
-- cubre las variantes que produce json.dumps de Python, con y sin espacios.
DECLARE
    v_afectadas NUMBER := 0;
BEGIN
    UPDATE SEC_USER.DIAGNOSTICO_SOCIAL
       SET ESTADO = 'BORRADOR'
     WHERE DATOS_EXTRA IS NOT NULL
       AND (
            DBMS_LOB.INSTR(DATOS_EXTRA, '"es_borrador": true') > 0
         OR DBMS_LOB.INSTR(DATOS_EXTRA, '"es_borrador":true')  > 0
         OR DBMS_LOB.INSTR(DATOS_EXTRA, '"esBorrador": true')  > 0
         OR DBMS_LOB.INSTR(DATOS_EXTRA, '"esBorrador":true')   > 0
       );
    v_afectadas := SQL%ROWCOUNT;
    COMMIT;
    DBMS_OUTPUT.PUT_LINE('Fichas marcadas como BORRADOR: ' || v_afectadas);
END;
/


-- ── El CHECK, al final ──────────────────────────────────────────────────────
DECLARE
    v_nombre VARCHAR2(128);
BEGIN
    UPDATE SEC_USER.DIAGNOSTICO_SOCIAL
       SET ESTADO = 'COMPLETO'
     WHERE ESTADO IS NULL OR ESTADO NOT IN ('BORRADOR', 'COMPLETO');
    COMMIT;

    FOR c IN (
        SELECT CONSTRAINT_NAME
          FROM ALL_CONSTRAINTS
         WHERE OWNER = 'SEC_USER'
           AND TABLE_NAME = 'DIAGNOSTICO_SOCIAL'
           AND CONSTRAINT_TYPE = 'C'
           AND UPPER(SEARCH_CONDITION_VC) LIKE '%ESTADO%'
           AND UPPER(SEARCH_CONDITION_VC) NOT LIKE '%NOT NULL%'
    ) LOOP
        v_nombre := c.CONSTRAINT_NAME;
        EXECUTE IMMEDIATE
            'ALTER TABLE SEC_USER.DIAGNOSTICO_SOCIAL DROP CONSTRAINT ' || v_nombre;
    END LOOP;

    EXECUTE IMMEDIATE
        'ALTER TABLE SEC_USER.DIAGNOSTICO_SOCIAL ADD CONSTRAINT CK_DIAG_ESTADO
             CHECK (ESTADO IN (''BORRADOR'', ''COMPLETO''))';
END;
/


-- ============================================================
-- VERIFICACIÓN
-- ============================================================

-- 1. La columna y su CHECK
SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, NULLABLE, DATA_DEFAULT
  FROM ALL_TAB_COLUMNS
 WHERE OWNER = 'SEC_USER' AND TABLE_NAME = 'DIAGNOSTICO_SOCIAL'
   AND COLUMN_NAME = 'ESTADO';

-- 2. Reparto actual
SELECT ESTADO, COUNT(*) AS CANTIDAD
  FROM SEC_USER.DIAGNOSTICO_SOCIAL
 GROUP BY ESTADO
 ORDER BY CANTIDAD DESC;

-- 3. Borradores que YA abrieron expediente.
--    Son los que se colaron con el comportamiento anterior. Si aparecen, hay
--    que revisarlos a mano: el expediente ya está abierto y no se revierte.
SELECT d.ID, d.CODIGO_FICHA_04, n.NOMBRES || ' ' || n.APELLIDO_PATERNO AS NNA,
       c.CODIGO_CASO
  FROM SEC_USER.DIAGNOSTICO_SOCIAL d
  JOIN SEC_USER.NNA n      ON n.ID = d.NNA_ID
  LEFT JOIN SEC_USER.NNA_CASO c ON c.NNA_ID = n.ID
 WHERE d.ESTADO = 'BORRADOR'
   AND n.CARPETA_ID IS NOT NULL;
