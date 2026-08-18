-- ============================================================
-- Migración 004: la evaluación F08 pasa a ser del TALLER
--
-- QUÉ ESTABA MAL
--
-- El Formato N° 08 —"Evaluación de Talleres Socioeducativos"— es UNA
-- evaluación por taller. Sus campos lo dicen:
--
--   4. Personas asistentes ... un número, no una lista
--   5. Logros ................ los cambios obtenidos tras el taller
--   6. Limitaciones .......... las dificultades EN FUNCIÓN A LA PLANIFICACIÓN
--   7. Sugerencias ........... recomendaciones para la próxima vez
--   9. Educador responsable .. firma y fecha del informe
--
-- Los puntos 1, 2, 3, 8 y 9 son idénticos al Formato 07: se heredan de la
-- planificación, no se vuelven a escribir.
--
-- El sistema, en cambio, guardaba la evaluación en PARTICIPANTE_TALLER: una
-- por asistente. Con quince participantes el educador tenía que redactar
-- quince textos, y ninguno respondía lo que el formato pregunta. Es
-- exactamente la queja de la reunión del 05/08/2026 (María del Carmen):
--
--   "Esas dos cosas yo creo que serían ahí manejable. Pero ya estar colocando
--    nombre por nombre, me hago bolas."
--
--
-- QUÉ HACE ESTA MIGRACIÓN
--
-- Agrega a TALLER las tres columnas del formato y la fecha de evaluación.
-- A partir de aquí, esa es la evaluación oficial del taller.
--
-- NO borra ni vacía PARTICIPANTE_TALLER.EVALUACION. Esa columna cambia de
-- significado: pasa a ser la evaluación PERSONALIZADA de un participante
-- concreto, para los talleres individualizados que los educadores describieron
-- —"lo hacemos en su casa o en el parque cuando lo encontramos"—, donde sí
-- tiene sentido anotar algo propio de un chico.
--
-- Regla de lectura: si un participante tiene EVALUACION propia, se usa esa;
-- si no, hereda la del taller. Ningún dato ya cargado se pierde.
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
     WHERE OWNER = 'SEC_USER'
       AND TABLE_NAME = 'TALLER'
       AND COLUMN_NAME = 'EVAL_LOGROS';

    IF v_existe = 0 THEN
        EXECUTE IMMEDIATE '
            ALTER TABLE SEC_USER.TALLER ADD (
                EVAL_LOGROS       VARCHAR2(2000),
                EVAL_LIMITACIONES VARCHAR2(2000),
                EVAL_SUGERENCIAS  VARCHAR2(2000),
                EVAL_FECHA        TIMESTAMP(6),
                EVAL_POR_ID       NUMBER
            )';
    END IF;
END;
/

COMMENT ON COLUMN SEC_USER.TALLER.EVAL_LOGROS IS
    'F08 punto 5: cambios obtenidos luego de recibir el taller';
COMMENT ON COLUMN SEC_USER.TALLER.EVAL_LIMITACIONES IS
    'F08 punto 6: dificultades encontradas en funcion a la planificacion';
COMMENT ON COLUMN SEC_USER.TALLER.EVAL_SUGERENCIAS IS
    'F08 punto 7: sugerencias y recomendaciones';
COMMENT ON COLUMN SEC_USER.TALLER.EVAL_FECHA IS
    'F08 punto 9: fecha del informe de evaluacion';
COMMENT ON COLUMN SEC_USER.TALLER.EVAL_POR_ID IS
    'F08 punto 9: educador responsable que firma la evaluacion';

COMMENT ON COLUMN SEC_USER.PARTICIPANTE_TALLER.EVALUACION IS
    'Evaluacion PERSONALIZADA de este participante. Si esta vacia, hereda la del taller (TALLER.EVAL_*)';


-- ── Backfill ────────────────────────────────────────────────────────────────
-- Si todos los participantes de un taller tienen EXACTAMENTE el mismo texto,
-- esa era ya la evaluación del taller escrita quince veces: se sube a TALLER
-- y se limpian las copias, que dejan de ser "personalizadas".
--
-- Solo se toca cuando hay UN único texto distinto en todo el taller. Si hay
-- variedad, se respeta: son evaluaciones realmente distintas y se quedan como
-- personalizadas.
UPDATE SEC_USER.TALLER t
   SET EVAL_LOGROS = (
        SELECT MAX(pt.EVALUACION)
          FROM SEC_USER.PARTICIPANTE_TALLER pt
         WHERE pt.TALLER_ID = t.ID AND pt.EVALUACION IS NOT NULL
   ),
       EVAL_FECHA = NVL(t.FECHA_EJECUCION, t.FECHA_PROGRAMADA),
       EVAL_POR_ID = t.EDUCADOR_ID
 WHERE t.EVAL_LOGROS IS NULL
   AND EXISTS (
        SELECT 1 FROM SEC_USER.PARTICIPANTE_TALLER pt
         WHERE pt.TALLER_ID = t.ID AND pt.EVALUACION IS NOT NULL
   )
   AND (
        SELECT COUNT(DISTINCT pt.EVALUACION)
          FROM SEC_USER.PARTICIPANTE_TALLER pt
         WHERE pt.TALLER_ID = t.ID AND pt.EVALUACION IS NOT NULL
   ) = 1;

-- Las copias idénticas ya no aportan nada: se vacían para que el participante
-- herede del taller. El texto no se pierde — está arriba, en TALLER.
UPDATE SEC_USER.PARTICIPANTE_TALLER pt
   SET EVALUACION = NULL
 WHERE pt.EVALUACION IS NOT NULL
   AND EXISTS (
        SELECT 1 FROM SEC_USER.TALLER t
         WHERE t.ID = pt.TALLER_ID
           AND t.EVAL_LOGROS = pt.EVALUACION
   );

COMMIT;


-- ============================================================
-- VERIFICACIÓN
-- ============================================================

-- 1. Las cinco columnas nuevas
SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH
  FROM ALL_TAB_COLUMNS
 WHERE OWNER = 'SEC_USER' AND TABLE_NAME = 'TALLER'
   AND COLUMN_NAME LIKE 'EVAL%'
 ORDER BY COLUMN_ID;

-- 2. Cuántos talleres quedaron con evaluación propia
SELECT COUNT(*) AS TALLERES_CON_EVALUACION
  FROM SEC_USER.TALLER WHERE EVAL_LOGROS IS NOT NULL;

-- 3. Participantes que conservan evaluación personalizada.
--    Estos son los casos donde el texto era realmente distinto por chico.
SELECT t.TEMA, COUNT(*) AS PERSONALIZADAS
  FROM SEC_USER.PARTICIPANTE_TALLER pt
  JOIN SEC_USER.TALLER t ON t.ID = pt.TALLER_ID
 WHERE pt.EVALUACION IS NOT NULL
 GROUP BY t.TEMA
 ORDER BY PERSONALIZADAS DESC;
