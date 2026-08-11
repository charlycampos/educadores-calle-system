-- ============================================================
-- MIGRACIÓN 006 — expediente-service: Informe Situacional v2
-- Motor: Oracle 12c+
--
-- Alinea EXP_INFORME_SITUACIONAL con el modelo real que usan los educadores
-- (ver "05 SITUACIONAL HNOS RUIZ CULQUI.pdf", informe de 5 hermanos):
--
--   I    Datos generales      → se arman solos desde el NNA (no se guardan)
--   II   Antecedentes         → ANTECEDENTES        (ya existía)
--   III  Acciones realizadas  → ESTRATEGIAS         (ya existía, se renombra en la UI)
--   IV   Situación familiar   → SITUACION_FAMILIAR  (ya existía, ahora texto único)
--   V    Indicadores          → INDICADORES_VULNERAB   (nueva)
--   VI   PII por fases        → PII_FASE1/2/3          (nuevas)
--   VII  Apreciación prof.    → CONCLUSIONES        (ya existía, se renombra en la UI)
--   VIII Recomendación        → RECOMENDACIONES     (ya existía)
--
-- SITUACION_SALUD y SITUACION_EDUCATIVA quedan sin uso: la sección IV pasó a ser
-- un solo texto. No se borran para no perder lo ya escrito en informes viejos.
--
-- Idempotente: se puede correr varias veces sin romper nada.
-- ============================================================

-- ── 1. Varios informes por caso ─────────────────────────────
-- El informe se rehace a lo largo del proceso (el modelo es de Fase II, no de
-- Fase I) y cada uno se archiva como folio propio en el expediente digital.
-- La restricción UNIQUE(CASO_ID) permitía uno solo.
BEGIN
  EXECUTE IMMEDIATE 'ALTER TABLE SEC_USER.EXP_INFORME_SITUACIONAL DROP CONSTRAINT UQ_INF_SIT_CASO';
EXCEPTION WHEN OTHERS THEN
  IF SQLCODE = -2443 THEN NULL;  -- la restricción ya no existe
  ELSE RAISE; END IF;
END;
/

-- ── 2. Secciones nuevas ─────────────────────────────────────
BEGIN
  EXECUTE IMMEDIATE '
    ALTER TABLE SEC_USER.EXP_INFORME_SITUACIONAL ADD (
      INDICADORES_VULNERAB CLOB,
      PII_FASE1            CLOB,
      PII_FASE2            CLOB,
      PII_FASE3            CLOB,
      CORRELATIVO          NUMBER,
      ANIO                 NUMBER
    )';
EXCEPTION WHEN OTHERS THEN
  IF SQLCODE = -1430 THEN NULL;  -- las columnas ya existen
  ELSE RAISE; END IF;
END;
/

-- ── 3. A qué NNA cubre cada informe ─────────────────────────
-- "Cuando son hermanos, se hace un solo informe de todos los hermanos" (Luis).
-- El expediente sigue siendo individual; lo que se comparte es el informe.
BEGIN
  EXECUTE IMMEDIATE '
    CREATE TABLE SEC_USER.EXP_INFORME_NNA (
      ID          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      INFORME_ID  NUMBER NOT NULL,
      NNA_ID      NUMBER NOT NULL,
      CASO_ID     NUMBER,
      ORDEN       NUMBER DEFAULT 1 NOT NULL,
      CONSTRAINT FK_INF_NNA_INFORME FOREIGN KEY (INFORME_ID)
        REFERENCES SEC_USER.EXP_INFORME_SITUACIONAL (ID) ON DELETE CASCADE,
      CONSTRAINT UQ_INF_NNA UNIQUE (INFORME_ID, NNA_ID)
    )';
EXCEPTION WHEN OTHERS THEN
  IF SQLCODE = -955 THEN NULL;   -- la tabla ya existe
  ELSE RAISE; END IF;
END;
/

BEGIN
  EXECUTE IMMEDIATE 'CREATE INDEX IDX_INF_NNA_NNA ON SEC_USER.EXP_INFORME_NNA (NNA_ID)';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/

-- ── 4. Los informes que ya existen cubren a su propio NNA ────
-- Sin esto, un informe anterior a la migración aparecería sin ningún NNA.
BEGIN
  EXECUTE IMMEDIATE '
    INSERT INTO SEC_USER.EXP_INFORME_NNA (INFORME_ID, NNA_ID, CASO_ID)
    SELECT i.ID, c.NNA_ID, c.ID
      FROM SEC_USER.EXP_INFORME_SITUACIONAL i
      JOIN SEC_USER.NNA_CASO c ON c.ID = i.CASO_ID
     WHERE NOT EXISTS (
       SELECT 1 FROM SEC_USER.EXP_INFORME_NNA x WHERE x.INFORME_ID = i.ID
     )';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/

COMMIT;
