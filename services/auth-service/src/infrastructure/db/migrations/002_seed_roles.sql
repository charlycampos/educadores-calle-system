-- ============================================================
-- MIGRACIÓN 002 — Seed de roles del sistema SEC
-- Oracle: usa MERGE para evitar duplicados (equivale a ON CONFLICT DO NOTHING)
-- ============================================================

MERGE INTO SEC_ROL t
USING (SELECT 'ADMIN_NACIONAL' AS nombre, 'OGTI/DGNNA central. Acceso total a todas las sedes.' AS descripcion FROM DUAL) s
ON (t.nombre = s.nombre)
WHEN NOT MATCHED THEN INSERT (nombre, descripcion) VALUES (s.nombre, s.descripcion);

MERGE INTO SEC_ROL t
USING (SELECT 'ADMIN_SEDE' AS nombre, 'Administra usuarios y configuracion de su sede.' AS descripcion FROM DUAL) s
ON (t.nombre = s.nombre)
WHEN NOT MATCHED THEN INSERT (nombre, descripcion) VALUES (s.nombre, s.descripcion);

MERGE INTO SEC_ROL t
USING (SELECT 'COORDINADOR' AS nombre, 'Supervisa su sede. Aprueba derivaciones y traslados. Uno por sede.' AS descripcion FROM DUAL) s
ON (t.nombre = s.nombre)
WHEN NOT MATCHED THEN INSERT (nombre, descripcion) VALUES (s.nombre, s.descripcion);

MERGE INTO SEC_ROL t
USING (SELECT 'EDUCADOR' AS nombre, 'Educador de calle. Registro, diario de campo, talleres.' AS descripcion FROM DUAL) s
ON (t.nombre = s.nombre)
WHEN NOT MATCHED THEN INSERT (nombre, descripcion) VALUES (s.nombre, s.descripcion);

MERGE INTO SEC_ROL t
USING (SELECT 'PSICOLOGO' AS nombre, 'Evaluacion psicologica y diagnostico.' AS descripcion FROM DUAL) s
ON (t.nombre = s.nombre)
WHEN NOT MATCHED THEN INSERT (nombre, descripcion) VALUES (s.nombre, s.descripcion);

MERGE INTO SEC_ROL t
USING (SELECT 'TRABAJADOR_SOCIAL' AS nombre, 'Diagnostico social (F04) y seguimiento familiar.' AS descripcion FROM DUAL) s
ON (t.nombre = s.nombre)
WHEN NOT MATCHED THEN INSERT (nombre, descripcion) VALUES (s.nombre, s.descripcion);

MERGE INTO SEC_ROL t
USING (SELECT 'ABOGADO' AS nombre, 'Apoyo legal al NNA y derivaciones a Fiscalia.' AS descripcion FROM DUAL) s
ON (t.nombre = s.nombre)
WHEN NOT MATCHED THEN INSERT (nombre, descripcion) VALUES (s.nombre, s.descripcion);

COMMIT;
