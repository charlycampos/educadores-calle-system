-- Migration 007: Ciclo de vida del Plan de Intervención Individual.
-- VIGENCIA_DIAS: duración del plan (antes 90 fijo en el frontend); se amplía con el Informe de Ampliación.
-- FECHA_CIERRE / OBSERVACION_CIERRE: cierre formal del plan.

ALTER TABLE PLAN_TRABAJO ADD (
    VIGENCIA_DIAS NUMBER DEFAULT 90 NOT NULL,
    FECHA_CIERRE TIMESTAMP NULL,
    OBSERVACION_CIERRE VARCHAR2(1000) NULL
);

COMMIT;
