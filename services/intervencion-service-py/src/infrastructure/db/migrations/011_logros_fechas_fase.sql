-- ============================================================
-- Migración 011: fecha de inicio y término por fase en el F05
--
-- Motivo (reunión SEC 05/08/2026, min 12:13 a 19:42).
--
-- La ficha solo tenía una fecha por fase, la de evaluación. María del Carmen
-- lo señaló como un vacío de su propia ficha física:
--
--   "No hay fecha de término porque todos entendemos que son tres meses nada
--    más. (...) esa es una de las debilidades que se ha tenido: no tener ahí
--    plasmado en esta ficha las fechas."
--
-- Acuerdos que implementa esta migración:
--
--   * Dos fechas por fase: inicio y término. Nada más — cuando se ofreció
--     agregar días transcurridos, Luis respondió: "No, solamente fecha de
--     inicio y fecha de culminado".
--   * Para las tres fases: "Para cada una de las fases. Para la tercera
--     también".
--   * El inicio de la Fase I es la fecha de inscripción del NNA: "en esta
--     primera fase, inicio sería el día que se inscribe al usuario".
--   * El inicio de cada fase siguiente es el DÍA SIGUIENTE al término de la
--     anterior: "Supongamos que terminó el 30 de agosto la fase 1, la fase 2
--     tendría que empezar el primero de septiembre" (María del Carmen).
--
-- La columna FN_FECHA existente era la fecha de evaluación, que es el mismo
-- dato que el término: el día en que se evalúa la fase es el día en que se
-- cierra. Se migra a FN_FIN y se conserva la original por si hiciera falta
-- revisarla; el código ya no la usa.
--
-- Ejecutar como SEC_USER, o con el prefijo si estás conectado como SYSTEM.
-- Sin comandos SQL*Plus: sirve igual en DBeaver.
-- ============================================================

ALTER TABLE SEC_USER.PROCESO_LOGROS ADD (
    F1_INICIO DATE,
    F1_FIN    DATE,
    F2_INICIO DATE,
    F2_FIN    DATE,
    F3_INICIO DATE,
    F3_FIN    DATE
);

COMMENT ON COLUMN SEC_USER.PROCESO_LOGROS.F1_INICIO
    IS 'Inicio de la Fase I. Se toma de la fecha de inscripción del NNA';
COMMENT ON COLUMN SEC_USER.PROCESO_LOGROS.F1_FIN
    IS 'Término de la Fase I. Se sella al cerrarla';
COMMENT ON COLUMN SEC_USER.PROCESO_LOGROS.F2_INICIO
    IS 'Inicio de la Fase II: día siguiente al término de la Fase I';
COMMENT ON COLUMN SEC_USER.PROCESO_LOGROS.F3_INICIO
    IS 'Inicio de la Fase III: día siguiente al término de la Fase II';

-- Backfill de los F05 existentes -------------------------------------------
-- La fecha de evaluación pasa a ser el término de su fase.
UPDATE SEC_USER.PROCESO_LOGROS
   SET F1_FIN = F1_FECHA
 WHERE F1_FECHA IS NOT NULL AND F1_FIN IS NULL;

UPDATE SEC_USER.PROCESO_LOGROS
   SET F2_FIN = F2_FECHA
 WHERE F2_FECHA IS NOT NULL AND F2_FIN IS NULL;

UPDATE SEC_USER.PROCESO_LOGROS
   SET F3_FIN = F3_FECHA
 WHERE F3_FECHA IS NOT NULL AND F3_FIN IS NULL;

-- El inicio de la Fase I es la fecha de inscripción registrada en el propio F05.
UPDATE SEC_USER.PROCESO_LOGROS
   SET F1_INICIO = FECHA_INGRESO
 WHERE FECHA_INGRESO IS NOT NULL AND F1_INICIO IS NULL;

-- Las fases siguientes arrancan el día después del término de la anterior.
UPDATE SEC_USER.PROCESO_LOGROS
   SET F2_INICIO = F1_FIN + 1
 WHERE F1_FIN IS NOT NULL AND F2_INICIO IS NULL;

UPDATE SEC_USER.PROCESO_LOGROS
   SET F3_INICIO = F2_FIN + 1
 WHERE F2_FIN IS NOT NULL AND F3_INICIO IS NULL;

COMMIT;

-- Verificación: deben aparecer las 6 columnas nuevas
SELECT COLUMN_NAME, DATA_TYPE, NULLABLE
  FROM ALL_TAB_COLUMNS
 WHERE OWNER = 'SEC_USER'
   AND TABLE_NAME = 'PROCESO_LOGROS'
   AND (COLUMN_NAME LIKE 'F_%INICIO' OR COLUMN_NAME LIKE 'F_%FIN')
 ORDER BY COLUMN_ID;
