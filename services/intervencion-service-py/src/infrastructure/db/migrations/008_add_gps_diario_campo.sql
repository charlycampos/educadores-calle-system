-- Migration 008: Coordenadas GPS opcionales en el diario de campo.
-- Capturadas desde el dispositivo del educador al registrar; NULL si no hay permiso/señal.

ALTER TABLE DIARIO_CAMPO ADD (LATITUD NUMBER(10,7) NULL, LONGITUD NUMBER(10,7) NULL);

COMMIT;
