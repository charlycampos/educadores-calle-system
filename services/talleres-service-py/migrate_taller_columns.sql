-- Migración: Agregar columnas faltantes a la tabla TALLER
-- Ejecutar en Oracle una sola vez

ALTER TABLE TALLER ADD (
    LUGAR                    VARCHAR2(300),
    DIRIGIDO_A               VARCHAR2(50),
    NUM_PERSONAS_PLANIFICADAS NUMBER(5),
    ACCIONES_PREVIAS         VARCHAR2(2000),
    INICIO_TIEMPO            VARCHAR2(50),
    INICIO_MATERIALES        VARCHAR2(1000),
    PROCESO_TIEMPO           VARCHAR2(50),
    PROCESO_MATERIALES       VARCHAR2(1000),
    CIERRE_TIEMPO            VARCHAR2(50),
    CIERRE_MATERIALES        VARCHAR2(1000)
);

COMMIT;
