-- ============================================================
-- Tabla NNA_HERMANO: vínculo entre NNA que son hermanos
--
-- Motivo: el informe situacional se hace por familia — "cuando son
-- hermanos, se hace un solo informe de todos los hermanos" (Luis
-- Gutiérrez, reunión SEC 05/08/2026) — pero los expedientes son
-- individuales: cada NNA tiene su propia carpeta y su propio file.
-- Hacía falta saber quiénes son hermanos sin mezclar expedientes.
--
-- El vínculo lo confirma SIEMPRE el educador. El sistema solo sugiere,
-- a partir de dos señales que ya existen en los datos:
--   * un integrante registrado con parentesco "Hermano/a" cuyo nombre
--     coincide con un NNA del servicio;
--   * un padre o madre con el mismo DNI en dos NNA distintos — esto
--     detecta hermanos de distinto apellido, el caso de "tres hermanas
--     de diferentes padres y el mismo apellido de la mamá".
--
-- ESTADO:
--   CONFIRMADO  el educador dijo que sí son hermanos
--   DESCARTADO  dijo que no; sirve para no volver a preguntar por ese par
--
-- El vínculo es bidireccional: se guarda una sola fila con el par
-- ordenado (menor, mayor) y las consultas miran ambas columnas. Así no
-- puede quedar A→B sin B→A.
--
-- Ejecutar como SEC_USER, o con el prefijo si estás conectado como
-- SYSTEM. Sin comandos SQL*Plus: sirve igual en DBeaver.
-- ============================================================

CREATE TABLE SEC_USER.NNA_HERMANO (
    ID              NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    NNA_ID_MENOR    NUMBER        NOT NULL,
    NNA_ID_MAYOR    NUMBER        NOT NULL,
    ESTADO          VARCHAR2(12)  DEFAULT 'CONFIRMADO' NOT NULL,
    ORIGEN          VARCHAR2(20)  NOT NULL,
    CONFIRMADO_POR  NUMBER,
    CREATED_AT      TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT CK_HERMANO_ESTADO CHECK (ESTADO IN ('CONFIRMADO', 'DESCARTADO')),
    CONSTRAINT CK_HERMANO_ORIGEN CHECK (ORIGEN IN ('PARENTESCO', 'DNI_PADRE', 'MANUAL')),
    -- El par siempre se guarda ordenado, así (A,B) y (B,A) son la misma fila
    CONSTRAINT CK_HERMANO_ORDEN  CHECK (NNA_ID_MENOR < NNA_ID_MAYOR),
    CONSTRAINT UX_HERMANO_PAR    UNIQUE (NNA_ID_MENOR, NNA_ID_MAYOR),
    CONSTRAINT FK_HERMANO_MENOR  FOREIGN KEY (NNA_ID_MENOR) REFERENCES SEC_USER.NNA(ID) ON DELETE CASCADE,
    CONSTRAINT FK_HERMANO_MAYOR  FOREIGN KEY (NNA_ID_MAYOR) REFERENCES SEC_USER.NNA(ID) ON DELETE CASCADE
);

CREATE INDEX SEC_USER.IDX_HERMANO_MENOR ON SEC_USER.NNA_HERMANO(NNA_ID_MENOR);
CREATE INDEX SEC_USER.IDX_HERMANO_MAYOR ON SEC_USER.NNA_HERMANO(NNA_ID_MAYOR);

COMMENT ON TABLE  SEC_USER.NNA_HERMANO
    IS 'Hermanos entre NNA del servicio. Los expedientes siguen siendo individuales; esto solo agrupa para el informe situacional';
COMMENT ON COLUMN SEC_USER.NNA_HERMANO.ESTADO
    IS 'CONFIRMADO o DESCARTADO. El descarte evita volver a sugerir el mismo par';
COMMENT ON COLUMN SEC_USER.NNA_HERMANO.ORIGEN
    IS 'Cómo se detectó: PARENTESCO (familiar registrado como hermano/a), DNI_PADRE (mismo DNI de padre o madre) o MANUAL';
COMMENT ON COLUMN SEC_USER.NNA_HERMANO.CONFIRMADO_POR
    IS 'Usuario que confirmó o descartó el vínculo. El sistema nunca vincula solo';

COMMIT;

-- Verificación
SELECT COLUMN_NAME, DATA_TYPE, NULLABLE
  FROM ALL_TAB_COLUMNS
 WHERE OWNER = 'SEC_USER' AND TABLE_NAME = 'NNA_HERMANO'
 ORDER BY COLUMN_ID;
