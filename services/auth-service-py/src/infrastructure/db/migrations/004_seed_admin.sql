-- ============================================================
-- MIGRACIÓN 004 — Usuario ADMIN_NACIONAL inicial
-- Oracle: MERGE para idempotencia
-- Password: Admin2026* (bcrypt hash, 10 salt rounds)
-- CAMBIAR EN PRODUCCIÓN inmediatamente después del primer login
-- ============================================================

MERGE INTO SEC_USUARIO t
USING (
  SELECT
    'Administrador Nacional'                                        AS nombre_completo,
    'admin@inabif.gob.pe'                                          AS email,
    '$2b$10$XtNVAJsX2M7rkUqmRYh1A.OuEnimyxoDWPFz7QS4gSHZ6UT7fyd02' AS password_hash,
    (SELECT id FROM SEC_ROL  WHERE nombre = 'ADMIN_NACIONAL')      AS rol_id,
    (SELECT id FROM SEC_SEDE WHERE codigo  = '404')                AS sede_id,
    1                                                              AS activo
  FROM DUAL
) s
ON (t.email = s.email)
WHEN NOT MATCHED THEN
  INSERT (nombre_completo, email, password_hash, rol_id, sede_id, zona_asignada, activo)
  VALUES (s.nombre_completo, s.email, s.password_hash, s.rol_id, s.sede_id, NULL, s.activo);

COMMIT;

-- Verificación:
-- SELECT id, nombre_completo, email FROM SEC_USUARIO WHERE email = 'admin@inabif.gob.pe';
