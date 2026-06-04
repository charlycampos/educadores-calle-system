-- ============================================================
-- Tabla: PROCESO_LOGROS
-- Descripción: Ficha de Proceso de Logros F05 (una por NNA)
-- Protocolo SEC - RDE 069-2021 INABIF
-- Patrón: igual a DIAGNOSTICO_SOCIAL del mismo servicio
-- ============================================================

CREATE TABLE PROCESO_LOGROS (
    ID                   NUMBER GENERATED AS IDENTITY PRIMARY KEY,
    CODIGO_F05           VARCHAR2(50)  UNIQUE,
    NNA_ID               NUMBER        NOT NULL,
    CASO_ID              NUMBER,
    PERFIL_USUARIO       VARCHAR2(100),
    FECHA_INGRESO        DATE,
    EDUCADOR_RESPONSABLE VARCHAR2(255),

    -- Fase I: Contacto e Integración (5 ítems, plazo 3 meses)
    F1_FECHA  DATE,
    F1_I1     VARCHAR2(10),   -- El/la NNA se integra y colabora con otras/os NNA
    F1_I2     VARCHAR2(10),   -- El/la NNA participa regularmente de las actividades
    F1_I3     VARCHAR2(10),   -- El adulto responsable muestra interés en necesidades básicas urgentes
    F1_I4     VARCHAR2(10),   -- El/la NNA y adulto responsable muestran interés en necesidades básicas
    F1_I5     VARCHAR2(10),   -- Muestra interés en acercarse a la comunidad
    F1_OBS    CLOB,

    -- Fase II: Desarrollo e Intervención (10 ítems, plazo 15 meses)
    F2_FECHA  DATE,
    F2_I1     VARCHAR2(10),   -- NNA ejerce derecho a la educación
    F2_I2     VARCHAR2(10),   -- NNA ejerce derecho a la salud
    F2_I3     VARCHAR2(10),   -- NNA ejerce derecho a la identidad
    F2_I4     VARCHAR2(10),   -- NNA ejerce derecho a la alimentación
    F2_I5     VARCHAR2(10),   -- NNA deja o reduce la situación de calle
    F2_I6     VARCHAR2(10),   -- Adulto responsable no ejerce violencia
    F2_I7     VARCHAR2(10),   -- Aumentó participación en actividades de desarrollo integral
    F2_I8     VARCHAR2(10),   -- Acceso a servicios especializados
    F2_I9     VARCHAR2(10),   -- NNA incorpora conductas de autocuidado
    F2_I10    VARCHAR2(10),   -- NNA construye proyecto/plan de vida
    F2_OBS    CLOB,

    -- Fase III: Seguimiento y Egreso (5 ítems, plazo 6 meses)
    F3_FECHA  DATE,
    F3_I1     VARCHAR2(10),   -- NNA deja situación de calle ejerciendo sus derechos permanentemente
    F3_I2     VARCHAR2(10),   -- NNA desarrolla capacidades de autoprotección
    F3_I3     VARCHAR2(10),   -- NNA hace uso de programas y servicios
    F3_I4     VARCHAR2(10),   -- Adulto responsable garantiza protección integral
    F3_I5     VARCHAR2(10),   -- NNA presenta y desarrolla proyecto de vida
    F3_OBS    CLOB,

    CREATED_AT TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    UPDATED_AT TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
);

CREATE INDEX IDX_PROCESO_LOGROS_NNA  ON PROCESO_LOGROS(NNA_ID);
CREATE INDEX IDX_PROCESO_LOGROS_CASO ON PROCESO_LOGROS(CASO_ID);
