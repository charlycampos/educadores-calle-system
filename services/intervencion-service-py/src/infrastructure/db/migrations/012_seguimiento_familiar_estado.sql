-- ─────────────────────────────────────────────────────────────────────────────
-- 012 · SEGUIMIENTO_FAMILIAR (F12): estado de borrador y columnas del formato
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Dos cosas:
--
-- 1. `ESTADO` — permite guardar la ficha como BORRADOR, igual que el F13. Sin
--    esto el educador que empieza a llenar en campo y no puede terminar pierde
--    lo escrito, que es justo lo que se pidió evitar en la reunión del
--    11/08/2026.
--
-- 2. Las columnas del formato oficial que el servicio ya escribe
--    (ZONA … NOMBRE_EDUCADOR, FECHA_TERMINO) pero que **no estaban en ninguna
--    migración**: se crearon a mano en la base de desarrollo. En un despliegue
--    limpio —el servidor de OGTI— el F12 fallaría al guardar. Aquí quedan
--    versionadas.
--
-- Idempotente: cada columna se agrega solo si falta, así que correrlo dos veces
-- o sobre la base actual no rompe nada.
--
-- Ejecutar como SYSTEM o como SEC_USER.
-- ─────────────────────────────────────────────────────────────────────────────

SET SERVEROUTPUT ON

DECLARE
    PROCEDURE agregar_columna(p_columna VARCHAR2, p_definicion VARCHAR2) IS
        v_existe NUMBER;
    BEGIN
        SELECT COUNT(*)
          INTO v_existe
          FROM ALL_TAB_COLUMNS
         WHERE OWNER       = 'SEC_USER'
           AND TABLE_NAME  = 'SEGUIMIENTO_FAMILIAR'
           AND COLUMN_NAME = p_columna;

        IF v_existe = 0 THEN
            EXECUTE IMMEDIATE
                'ALTER TABLE SEC_USER.SEGUIMIENTO_FAMILIAR ADD (' ||
                p_columna || ' ' || p_definicion || ')';
            DBMS_OUTPUT.PUT_LINE('[012] Agregada  : ' || p_columna);
        ELSE
            DBMS_OUTPUT.PUT_LINE('[012] Ya existía: ' || p_columna);
        END IF;
    END;
BEGIN
    -- Datos generales de la visita (Anexo 10)
    agregar_columna('ZONA',              'VARCHAR2(200)');
    agregar_columna('ENTREVISTADO',      'VARCHAR2(200)');
    agregar_columna('PARENTESCO',        'VARCHAR2(50)');
    agregar_columna('TELEFONO',          'VARCHAR2(50)');
    agregar_columna('LUGAR_SEGUIMIENTO', 'VARCHAR2(50)');
    agregar_columna('DIRECCION',         'VARCHAR2(500)');
    agregar_columna('HORA',              'VARCHAR2(10)');

    -- Contenido de la ficha
    agregar_columna('ANTECEDENTES',      'VARCHAR2(4000)');
    agregar_columna('DESCRIPCION',       'VARCHAR2(4000)');
    agregar_columna('OBSERVACIONES',     'VARCHAR2(4000)');
    agregar_columna('NOMBRE_EDUCADOR',   'VARCHAR2(200)');

    -- Columna histórica: el formulario ya no la usa, pero las fichas cargadas
    -- antes de agosto de 2026 tienen datos aquí y no se borran.
    agregar_columna('FECHA_TERMINO',     'TIMESTAMP');

    -- Borrador. Las fichas existentes quedan como FINALIZADA para que sigan
    -- comportándose igual que hasta ahora.
    agregar_columna('ESTADO',            'VARCHAR2(20) DEFAULT ''FINALIZADA'' NOT NULL');
END;
/

-- Verificación
SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, NULLABLE, DATA_DEFAULT
FROM   ALL_TAB_COLUMNS
WHERE  OWNER = 'SEC_USER'
AND    TABLE_NAME = 'SEGUIMIENTO_FAMILIAR'
ORDER  BY COLUMN_ID;
