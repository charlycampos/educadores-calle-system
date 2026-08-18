-- ============================================================================
-- DIAGNÓSTICO DE FASES — Etapa 0
--
-- Antes de tocar nada, saber qué hay realmente en la base. Estas consultas
-- SOLO LEEN: ningún INSERT, UPDATE ni DELETE. Es seguro correrlas en producción.
--
-- Corre cada bloque por separado en DBeaver (Ctrl+Enter sobre cada uno) y
-- pásame los resultados. Con eso ajusto el backfill de la Etapa 2.
--
-- Contexto: hoy la "fase" de un NNA está representada en 5 lugares distintos
-- que no se hablan entre sí. Estas consultas miden el desfase real.
-- ============================================================================


-- ── 1. ¿Qué estados existen realmente? ──────────────────────────────────────
-- El código Python declara ESTADOS_VALIDOS = CAPTACION, EN_EVALUACION,
-- INTERVENCION, SEGUIMIENTO, DERIVADO, CERRADO. Pero los dashboards traducen
-- PRE_EGRESO, que el dominio nunca produce. Y hay estados BORRADOR/PENDIENTE
-- del ciclo de registro mezclados en la misma columna.
--
-- Lo que busco: si aparece PRE_EGRESO (alguien lo metió a mano) y cuántos
-- casos hay en cada estado.
SELECT ESTADO, COUNT(*) AS CANTIDAD
FROM SEC_USER.NNA_CASO
GROUP BY ESTADO
ORDER BY CANTIDAD DESC;


-- ── 2. ¿Qué tiene la columna FASE? ──────────────────────────────────────────
-- La hipótesis es que TODAS dicen 'CONTACTO_INICIAL', porque el INSERT la
-- escribe hardcodeada y no existe ningún UPDATE en el código.
--
-- Si aparece cualquier otro valor, significa que alguien la actualizó por
-- fuera del sistema y hay que averiguar con qué criterio antes del backfill.
SELECT FASE, COUNT(*) AS CANTIDAD
FROM SEC_USER.NNA_CASO
GROUP BY FASE
ORDER BY CANTIDAD DESC;


-- ── 3. La fase real, según el F05 ───────────────────────────────────────────
-- Esta es la fase de verdad: la que el educador cerró en la Ficha de Proceso
-- de Logros. Es exactamente el criterio que usará el backfill de la Etapa 2.
SELECT
    CASE
        WHEN F3_FIN IS NOT NULL THEN 'III (F3 cerrada)'
        WHEN F2_FIN IS NOT NULL THEN 'II  (F2 cerrada)'
        WHEN F1_FIN IS NOT NULL THEN 'II  (F1 cerrada, pasa a II)'
        ELSE                          'I   (ninguna cerrada)'
    END AS FASE_SEGUN_F05,
    COUNT(*) AS CANTIDAD
FROM SEC_USER.PROCESO_LOGROS
GROUP BY
    CASE
        WHEN F3_FIN IS NOT NULL THEN 'III (F3 cerrada)'
        WHEN F2_FIN IS NOT NULL THEN 'II  (F2 cerrada)'
        WHEN F1_FIN IS NOT NULL THEN 'II  (F1 cerrada, pasa a II)'
        ELSE                          'I   (ninguna cerrada)'
    END
ORDER BY 1;


-- ── 4. ¿Cuántos casos ni siquiera tienen F05? ───────────────────────────────
-- El backfill los dejará en Fase I. Si son muchos casos antiguos, hay que
-- avisarle al coordinador antes de que vea el tablero cambiar.
SELECT
    COUNT(*)                                                   AS TOTAL_CASOS,
    SUM(CASE WHEN p.ID IS NULL THEN 1 ELSE 0 END)              AS SIN_F05,
    SUM(CASE WHEN p.ID IS NOT NULL THEN 1 ELSE 0 END)          AS CON_F05
FROM SEC_USER.NNA_CASO c
LEFT JOIN SEC_USER.PROCESO_LOGROS p ON p.CASO_ID = c.ID;


-- ── 5. EL DESFASE: estado del caso vs. fase real del F05 ────────────────────
-- Esta es la consulta que muestra el problema de frente. Cada fila donde el
-- ESTADO no concuerda con la fase cerrada en el F05 es un caso que el tablero
-- está reportando mal HOY.
--
-- Ejemplo de lo que espero ver: casos con la Fase III cerrada que siguen
-- figurando como EN_EVALUACION, o sea "Fase 1: Diagnóstico" en el dashboard.
SELECT
    c.ESTADO,
    CASE
        WHEN p.F3_FIN IS NOT NULL THEN 'III'
        WHEN p.F2_FIN IS NOT NULL THEN 'II'
        WHEN p.F1_FIN IS NOT NULL THEN 'II'
        WHEN p.ID     IS NOT NULL THEN 'I'
        ELSE                           'sin F05'
    END AS FASE_REAL_F05,
    COUNT(*) AS CANTIDAD
FROM SEC_USER.NNA_CASO c
LEFT JOIN SEC_USER.PROCESO_LOGROS p ON p.CASO_ID = c.ID
GROUP BY
    c.ESTADO,
    CASE
        WHEN p.F3_FIN IS NOT NULL THEN 'III'
        WHEN p.F2_FIN IS NOT NULL THEN 'II'
        WHEN p.F1_FIN IS NOT NULL THEN 'II'
        WHEN p.ID     IS NOT NULL THEN 'I'
        ELSE                           'sin F05'
    END
ORDER BY c.ESTADO, FASE_REAL_F05;


-- ── 6. Egresados que el sistema sigue contando como activos ─────────────────
-- Casos con Informe de Cierre FINALIZADO cuyo ESTADO no es CERRADO.
-- Este es el bug de la Etapa 1: cerrar el F13 nunca cerró el caso.
--
-- Cada fila aquí es un NNA que ya egresó pero sigue sumando en la carga de
-- su educador y en los reportes a la DGNNA.
SELECT
    c.ID          AS CASO_ID,
    c.CODIGO_CASO,
    c.ESTADO      AS ESTADO_ACTUAL,
    i.CODIGO_INFORME,
    i.FECHA_EGRESO
FROM SEC_USER.NNA_CASO c
JOIN SEC_USER.EXP_INFORME_CIERRE i ON i.CASO_ID = c.ID
WHERE i.ESTADO IN ('FINALIZADO', 'FIRMADO', 'PEND_COORDINADOR')
  AND c.ESTADO <> 'CERRADO'
ORDER BY i.FECHA_EGRESO DESC;


-- ── 7. Total de egresados mal contados (el resumen de la 6) ─────────────────
SELECT COUNT(*) AS EGRESADOS_CONTADOS_COMO_ACTIVOS
FROM SEC_USER.NNA_CASO c
JOIN SEC_USER.EXP_INFORME_CIERRE i ON i.CASO_ID = c.ID
WHERE i.ESTADO IN ('FINALIZADO', 'FIRMADO', 'PEND_COORDINADOR')
  AND c.ESTADO <> 'CERRADO';


-- ── 8. ¿Se está usando el historial de estados? ─────────────────────────────
-- Existe la tabla NNA_HISTORIAL_ESTADO. Si tiene registros, ya hay una
-- bitácora de cambios que conviene alimentar también con los cambios de fase
-- (así el tracking queda auditable: quién movió qué y cuándo).
SELECT
    TIPO_CAMBIO,
    ESTADO_ANTERIOR,
    ESTADO_NUEVO,
    COUNT(*) AS CANTIDAD
FROM SEC_USER.NNA_HISTORIAL_ESTADO
GROUP BY TIPO_CAMBIO, ESTADO_ANTERIOR, ESTADO_NUEVO
ORDER BY CANTIDAD DESC;


-- ── 9. Fases cerradas sin fecha sellada ─────────────────────────────────────
-- El botón "Cerrar fase" genera el PDF pero NO sella Fn_FIN. La fecha solo se
-- guarda si además el educador vuelve a guardar el formulario completo.
--
-- Esta consulta cuenta los F05 que tienen indicadores evaluados de una fase
-- pero sin fecha de término: son fases cerradas de facto que el sistema no
-- puede reconocer.
SELECT
    SUM(CASE WHEN F1_I1 IS NOT NULL AND F1_FIN IS NULL THEN 1 ELSE 0 END) AS F1_EVALUADA_SIN_FIN,
    SUM(CASE WHEN F2_I1 IS NOT NULL AND F2_FIN IS NULL THEN 1 ELSE 0 END) AS F2_EVALUADA_SIN_FIN,
    SUM(CASE WHEN F3_I1 IS NOT NULL AND F3_FIN IS NULL THEN 1 ELSE 0 END) AS F3_EVALUADA_SIN_FIN
FROM SEC_USER.PROCESO_LOGROS;


-- ── 10. Folios de fase cerrada (la 4.ª fuente de verdad) ────────────────────
-- El frontend infiere "fase cerrada" mirando si existe un folio F05-FASE-N.
-- Comparar este conteo con el de la consulta 3 muestra cuánto se desviaron
-- las dos fuentes entre sí.
SELECT TIPO_DOCUMENTO, COUNT(*) AS CANTIDAD
FROM SEC_USER.EXP_FOLIO
WHERE TIPO_DOCUMENTO LIKE 'F05-FASE%'
GROUP BY TIPO_DOCUMENTO
ORDER BY TIPO_DOCUMENTO;
