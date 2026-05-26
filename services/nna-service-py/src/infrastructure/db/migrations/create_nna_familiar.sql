-- ============================================================
-- Migración: tabla NNA_FAMILIAR
-- Los familiares del F03 pertenecen a una CARPETA (expediente),
-- no a un NNA individual, porque son datos compartidos entre
-- hermanos de la misma carpeta.
-- ============================================================

CREATE TABLE NNA_FAMILIAR (
    ID          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    CARPETA_ID  NUMBER        NOT NULL,
    NOMBRES     VARCHAR2(200) NOT NULL,
    PARENTESCO  VARCHAR2(50)  NOT NULL,
    DNI         VARCHAR2(15),
    TELEFONO    VARCHAR2(20),
    OCUPACION   VARCHAR2(100),
    VIVE_CON    CHAR(2)       DEFAULT 'NO' CHECK (VIVE_CON IN ('SI','NO')),
    CREATED_AT  TIMESTAMP     DEFAULT SYSTIMESTAMP,
    CONSTRAINT FK_FAMILIAR_CARPETA FOREIGN KEY (CARPETA_ID)
        REFERENCES NNA_CARPETA(ID) ON DELETE CASCADE
);

CREATE INDEX IDX_FAMILIAR_CARPETA ON NNA_FAMILIAR(CARPETA_ID);

-- Comentarios de columnas
COMMENT ON TABLE  NNA_FAMILIAR               IS 'Familiares/responsables registrados en la Ficha F03';
COMMENT ON COLUMN NNA_FAMILIAR.CARPETA_ID    IS 'FK a NNA_CARPETA — familiares compartidos por todos los NNA del expediente';
COMMENT ON COLUMN NNA_FAMILIAR.NOMBRES       IS 'Apellidos y nombres del familiar';
COMMENT ON COLUMN NNA_FAMILIAR.PARENTESCO    IS 'Relación con el NNA: Madre, Padre, Abuelo/a, Tío/a, etc.';
COMMENT ON COLUMN NNA_FAMILIAR.DNI           IS 'DNI del familiar (opcional)';
COMMENT ON COLUMN NNA_FAMILIAR.TELEFONO      IS 'Celular o teléfono de contacto';
COMMENT ON COLUMN NNA_FAMILIAR.OCUPACION     IS 'Ocupación o trabajo del familiar';
COMMENT ON COLUMN NNA_FAMILIAR.VIVE_CON      IS 'SI si convive con el NNA, NO en caso contrario';
