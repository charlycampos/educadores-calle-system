-- ============================================================
-- Diagnóstico: por qué no aparecen padres/tutores en un taller
--
-- Uso: reemplaza &TALLER_ID por el ID del taller y ejecuta.
-- Los familiares NO cuelgan del NNA, cuelgan de la CARPETA:
--     NNA.CARPETA_ID -> NNA_CARPETA.ID <- NNA_FAMILIAR.CARPETA_ID
-- La cadena se corta en el primer paso que devuelva 0.
-- ============================================================

SET SERVEROUTPUT ON
SET LINESIZE 200
SET PAGESIZE 100

-- PASO 0: ¿está aplicada la migración 002?
PROMPT ===== PASO 0: columnas TIPO y FAMILIAR_ID =====
SELECT COLUMN_NAME, DATA_TYPE, NULLABLE
  FROM USER_TAB_COLUMNS
 WHERE TABLE_NAME = 'PARTICIPANTE_TALLER'
   AND COLUMN_NAME IN ('TIPO', 'FAMILIAR_ID');
-- Esperado: 2 filas. Si sale vacío, ejecuta 002_participante_familiar.sql

-- PASO 1: participantes inscritos en el taller
PROMPT ===== PASO 1: participantes del taller =====
SELECT pt.ID, pt.NNA_ID, n.NOMBRES, n.APELLIDO_PATERNO, n.CARPETA_ID
  FROM PARTICIPANTE_TALLER pt
  LEFT JOIN NNA n ON n.ID = pt.NNA_ID
 WHERE pt.TALLER_ID = &TALLER_ID;
-- Si CARPETA_ID viene NULL, ese NNA nunca traerá familiares.

-- PASO 2: ¿esas carpetas tienen familiares registrados?
PROMPT ===== PASO 2: familiares por carpeta =====
SELECT n.CARPETA_ID,
       COUNT(f.ID) AS familiares_registrados
  FROM PARTICIPANTE_TALLER pt
  JOIN NNA n ON n.ID = pt.NNA_ID
  LEFT JOIN NNA_FAMILIAR f ON f.CARPETA_ID = n.CARPETA_ID
 WHERE pt.TALLER_ID = &TALLER_ID
 GROUP BY n.CARPETA_ID;
-- Si da 0, hay que capturar los familiares en la ficha F03 del expediente.

-- PASO 3: la consulta real que usa el endpoint
PROMPT ===== PASO 3: candidatos que devolvería el sistema =====
SELECT f.ID,
       MIN(f.NOMBRES)    AS nombres,
       MIN(f.PARENTESCO) AS parentesco,
       MIN(f.DNI)        AS dni,
       MIN(n.APELLIDO_PATERNO || ' ' || n.NOMBRES) AS nna_relacionado
  FROM PARTICIPANTE_TALLER pt
  JOIN NNA n          ON n.ID = pt.NNA_ID
  JOIN NNA_FAMILIAR f ON f.CARPETA_ID = n.CARPETA_ID
 WHERE pt.TALLER_ID = &TALLER_ID
   AND pt.TIPO = 'NNA'
 GROUP BY f.ID
 ORDER BY MIN(f.NOMBRES);

-- PASO 4: panorama general (¿hay familiares en el sistema?)
PROMPT ===== PASO 4: totales del sistema =====
SELECT (SELECT COUNT(*) FROM NNA_FAMILIAR)                        AS total_familiares,
       (SELECT COUNT(*) FROM NNA WHERE CARPETA_ID IS NULL)        AS nna_sin_carpeta,
       (SELECT COUNT(DISTINCT CARPETA_ID) FROM NNA_FAMILIAR)      AS carpetas_con_familiares
  FROM DUAL;
