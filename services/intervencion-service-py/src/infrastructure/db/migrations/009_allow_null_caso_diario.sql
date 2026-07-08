-- Migration 009: Permitir caso_id NULL en DIARIO_CAMPO para coordinaciones generales/institucionales.
ALTER TABLE DIARIO_CAMPO MODIFY (CASO_ID NUMBER NULL);
COMMIT;
