-- Migration 009: Modelo de roles según definición operativa (reunión SEC).
-- 1) El educador es el único perfil de sede; su especialidad (psicólogo, abogado,
--    trabajador social) es un ATRIBUTO del usuario, no un rol.
-- 2) La trabajadora social supervisora es un cargo de la sede central con alcance
--    nacional: revisa expedientes en solo lectura y devuelve correcciones.
-- Los roles PSICOLOGO/TRABAJADOR_SOCIAL/ABOGADO se conservan por compatibilidad
-- con usuarios existentes, pero ya no se ofrecen al crear usuarios nuevos.

ALTER TABLE SEC_USUARIO ADD (PROFESION VARCHAR2(60) NULL);

MERGE INTO SEC_ROL t
USING (SELECT 'SUPERVISOR_EXPEDIENTES' AS nombre,
              'Sede central. Supervisa expedientes a nivel nacional en solo lectura y devuelve observaciones a los educadores.' AS descripcion
       FROM DUAL) s
ON (t.nombre = s.nombre)
WHEN NOT MATCHED THEN INSERT (nombre, descripcion) VALUES (s.nombre, s.descripcion);

COMMIT;
