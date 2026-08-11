-- El Formato 04 es una ficha única por NNA, incluyendo su etapa de borrador.
-- Esta sentencia no elimina duplicados existentes: si los hubiera, la migración
-- se detendrá para que sean revisados y consolidados antes de volver a ejecutarla.
CREATE UNIQUE INDEX UQ_DIAGNOSTICO_SOCIAL_NNA
    ON DIAGNOSTICO_SOCIAL (NNA_ID);
