-- Migration 005: Añadir columna INFORME_AMPLIACION (JSON como CLOB) a PLAN_TRABAJO
-- Guarda el Informe Técnico de Ampliación de Fase: {antecedentes, analisis, sustento, conclusiones, fecha}

ALTER TABLE PLAN_TRABAJO ADD (INFORME_AMPLIACION CLOB NULL);
