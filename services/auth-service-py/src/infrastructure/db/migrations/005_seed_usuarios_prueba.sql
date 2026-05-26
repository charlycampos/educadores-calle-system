-- ============================================================
-- MIGRACIÓN 005 — Usuarios de prueba para todos los roles
-- Contraseña universal: password123
-- Hash bcrypt (10 rounds): $2b$10$9rVAn/Cya3W0H4GhslahCe44LzYC7yvFDUT9lIyiYx0BGA2wkc1z6
-- ============================================================
-- Apunta al schema SEC_USER aunque estés conectado como SYSTEM
-- ============================================================
ALTER SESSION SET CURRENT_SCHEMA = SEC_USER;

-- Sede principal (cualquier sede activa disponible)
-- Sede secundaria (segunda sede, para probar multi-sede)
-- Si solo hay una sede, ambos usuarios quedan en la misma.

-- 1. ADMIN_NACIONAL
MERGE INTO SEC_USUARIO t
USING (SELECT
    'Diana Flores Mendoza'                                            AS nombre_completo,
    'admin.nacional@educadores.gob.pe'                               AS email,
    '$2b$10$9rVAn/Cya3W0H4GhslahCe44LzYC7yvFDUT9lIyiYx0BGA2wkc1z6' AS password_hash,
    (SELECT id FROM SEC_ROL WHERE nombre = 'ADMIN_NACIONAL')         AS rol_id,
    (SELECT MIN(id) FROM SEC_SEDE)                                   AS sede_id,
    'Sede Central'                                                   AS zona_asignada
FROM DUAL) s
ON (t.email = s.email)
WHEN NOT MATCHED THEN INSERT (nombre_completo, email, password_hash, rol_id, sede_id, zona_asignada, activo)
     VALUES (s.nombre_completo, s.email, s.password_hash, s.rol_id, s.sede_id, s.zona_asignada, 1);

-- 2. ADMIN_SEDE
MERGE INTO SEC_USUARIO t
USING (SELECT
    'Roberto Salas Quispe'                                            AS nombre_completo,
    'admin.sede@educadores.gob.pe'                                   AS email,
    '$2b$10$9rVAn/Cya3W0H4GhslahCe44LzYC7yvFDUT9lIyiYx0BGA2wkc1z6' AS password_hash,
    (SELECT id FROM SEC_ROL WHERE nombre = 'ADMIN_SEDE')             AS rol_id,
    (SELECT MIN(id) FROM SEC_SEDE WHERE id != (SELECT MIN(id) FROM SEC_SEDE)) AS sede_id,
    'Sede Secundaria'                                                AS zona_asignada
FROM DUAL) s
ON (t.email = s.email)
WHEN NOT MATCHED THEN INSERT (nombre_completo, email, password_hash, rol_id, sede_id, zona_asignada, activo)
     VALUES (s.nombre_completo, s.email, s.password_hash, s.rol_id, NVL(s.sede_id, (SELECT MIN(id) FROM SEC_SEDE)), s.zona_asignada, 1);

-- 3. COORDINADOR
MERGE INTO SEC_USUARIO t
USING (SELECT
    'Maria Coordinadora Perez'                                        AS nombre_completo,
    'coordinador@educadores.gob.pe'                                  AS email,
    '$2b$10$9rVAn/Cya3W0H4GhslahCe44LzYC7yvFDUT9lIyiYx0BGA2wkc1z6' AS password_hash,
    (SELECT id FROM SEC_ROL WHERE nombre = 'COORDINADOR')            AS rol_id,
    (SELECT MIN(id) FROM SEC_SEDE)                                   AS sede_id,
    'Lima Metropolitana - Zona Norte'                                AS zona_asignada
FROM DUAL) s
ON (t.email = s.email)
WHEN NOT MATCHED THEN INSERT (nombre_completo, email, password_hash, rol_id, sede_id, zona_asignada, activo)
     VALUES (s.nombre_completo, s.email, s.password_hash, s.rol_id, s.sede_id, s.zona_asignada, 1);

-- 4. EDUCADOR
MERGE INTO SEC_USUARIO t
USING (SELECT
    'Juan Educador Garcia'                                            AS nombre_completo,
    'educador@educadores.gob.pe'                                     AS email,
    '$2b$10$9rVAn/Cya3W0H4GhslahCe44LzYC7yvFDUT9lIyiYx0BGA2wkc1z6' AS password_hash,
    (SELECT id FROM SEC_ROL WHERE nombre = 'EDUCADOR')               AS rol_id,
    (SELECT MIN(id) FROM SEC_SEDE)                                   AS sede_id,
    'Lima Metropolitana - Jr. de la Union'                           AS zona_asignada
FROM DUAL) s
ON (t.email = s.email)
WHEN NOT MATCHED THEN INSERT (nombre_completo, email, password_hash, rol_id, sede_id, zona_asignada, activo)
     VALUES (s.nombre_completo, s.email, s.password_hash, s.rol_id, s.sede_id, s.zona_asignada, 1);

-- 5. PSICOLOGO
MERGE INTO SEC_USUARIO t
USING (SELECT
    'Ana Psicologa Rodriguez'                                         AS nombre_completo,
    'psicologo@educadores.gob.pe'                                    AS email,
    '$2b$10$9rVAn/Cya3W0H4GhslahCe44LzYC7yvFDUT9lIyiYx0BGA2wkc1z6' AS password_hash,
    (SELECT id FROM SEC_ROL WHERE nombre = 'PSICOLOGO')              AS rol_id,
    (SELECT MIN(id) FROM SEC_SEDE)                                   AS sede_id,
    'Lima Metropolitana'                                             AS zona_asignada
FROM DUAL) s
ON (t.email = s.email)
WHEN NOT MATCHED THEN INSERT (nombre_completo, email, password_hash, rol_id, sede_id, zona_asignada, activo)
     VALUES (s.nombre_completo, s.email, s.password_hash, s.rol_id, s.sede_id, s.zona_asignada, 1);

-- 6. TRABAJADOR_SOCIAL
MERGE INTO SEC_USUARIO t
USING (SELECT
    'Carlos Trabajador Social Lopez'                                  AS nombre_completo,
    'tsocial@educadores.gob.pe'                                      AS email,
    '$2b$10$9rVAn/Cya3W0H4GhslahCe44LzYC7yvFDUT9lIyiYx0BGA2wkc1z6' AS password_hash,
    (SELECT id FROM SEC_ROL WHERE nombre = 'TRABAJADOR_SOCIAL')      AS rol_id,
    (SELECT MIN(id) FROM SEC_SEDE)                                   AS sede_id,
    'Lima Metropolitana'                                             AS zona_asignada
FROM DUAL) s
ON (t.email = s.email)
WHEN NOT MATCHED THEN INSERT (nombre_completo, email, password_hash, rol_id, sede_id, zona_asignada, activo)
     VALUES (s.nombre_completo, s.email, s.password_hash, s.rol_id, s.sede_id, s.zona_asignada, 1);

-- 7. ABOGADO
MERGE INTO SEC_USUARIO t
USING (SELECT
    'Patricia Abogada Vega'                                           AS nombre_completo,
    'abogado@educadores.gob.pe'                                      AS email,
    '$2b$10$9rVAn/Cya3W0H4GhslahCe44LzYC7yvFDUT9lIyiYx0BGA2wkc1z6' AS password_hash,
    (SELECT id FROM SEC_ROL WHERE nombre = 'ABOGADO')                AS rol_id,
    (SELECT MIN(id) FROM SEC_SEDE)                                   AS sede_id,
    'Lima Metropolitana'                                             AS zona_asignada
FROM DUAL) s
ON (t.email = s.email)
WHEN NOT MATCHED THEN INSERT (nombre_completo, email, password_hash, rol_id, sede_id, zona_asignada, activo)
     VALUES (s.nombre_completo, s.email, s.password_hash, s.rol_id, s.sede_id, s.zona_asignada, 1);

-- 8. MONITOR
MERGE INTO SEC_USUARIO t
USING (SELECT
    'Mario Monitor Central'                                           AS nombre_completo,
    'monitor@educadores.gob.pe'                                      AS email,
    '$2b$10$9rVAn/Cya3W0H4GhslahCe44LzYC7yvFDUT9lIyiYx0BGA2wkc1z6' AS password_hash,
    (SELECT id FROM SEC_ROL WHERE nombre = 'MONITOR')                AS rol_id,
    (SELECT MIN(id) FROM SEC_SEDE)                                   AS sede_id,
    'Sede Central Nacional'                                          AS zona_asignada
FROM DUAL) s
ON (t.email = s.email)
WHEN NOT MATCHED THEN INSERT (nombre_completo, email, password_hash, rol_id, sede_id, zona_asignada, activo)
     VALUES (s.nombre_completo, s.email, s.password_hash, s.rol_id, s.sede_id, s.zona_asignada, 1);

-- 9. ESTADISTICO
MERGE INTO SEC_USUARIO t
USING (SELECT
    'Elena Estadistica Torres'                                        AS nombre_completo,
    'estadistico@educadores.gob.pe'                                  AS email,
    '$2b$10$9rVAn/Cya3W0H4GhslahCe44LzYC7yvFDUT9lIyiYx0BGA2wkc1z6' AS password_hash,
    (SELECT id FROM SEC_ROL WHERE nombre = 'ESTADISTICO')            AS rol_id,
    (SELECT MIN(id) FROM SEC_SEDE)                                   AS sede_id,
    'Sede Central Nacional'                                          AS zona_asignada
FROM DUAL) s
ON (t.email = s.email)
WHEN NOT MATCHED THEN INSERT (nombre_completo, email, password_hash, rol_id, sede_id, zona_asignada, activo)
     VALUES (s.nombre_completo, s.email, s.password_hash, s.rol_id, s.sede_id, s.zona_asignada, 1);

COMMIT;

-- ============================================================
-- VERIFICACIÓN — copiar y ejecutar después
-- ============================================================
-- SELECT u.id, u.nombre_completo, u.email, r.nombre AS rol
-- FROM   SEC_USUARIO u
-- JOIN   SEC_ROL r ON r.id = u.rol_id
-- ORDER  BY u.id;
