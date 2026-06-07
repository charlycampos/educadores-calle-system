-- ============================================================
-- MIGRACIÓN 007 — Usuarios para Sede 9: Piura (406)
-- Contraseña universal: password123
-- Hash bcrypt (10 rounds): $2b$10$9rVAn/Cya3W0H4GhslahCe44LzYC7yvFDUT9lIyiYx0BGA2wkc1z6
-- ============================================================
ALTER SESSION SET CURRENT_SCHEMA = SEC_USER;

-- 1. COORDINADOR – Sede Piura
MERGE INTO SEC_USUARIO t
USING (SELECT
    'Sofía Guerrero Delgado'                                         AS nombre_completo,
    'coordinador.piura@educadores.gob.pe'                           AS email,
    '$2b$10$9rVAn/Cya3W0H4GhslahCe44LzYC7yvFDUT9lIyiYx0BGA2wkc1z6' AS password_hash,
    (SELECT id FROM SEC_ROL WHERE nombre = 'COORDINADOR')            AS rol_id,
    9                                                                AS sede_id,
    'Piura'                                                          AS zona_asignada
FROM DUAL) s
ON (t.email = s.email)
WHEN NOT MATCHED THEN INSERT
    (nombre_completo, email, password_hash, rol_id, sede_id, zona_asignada, activo)
VALUES
    (s.nombre_completo, s.email, s.password_hash, s.rol_id, s.sede_id, s.zona_asignada, 1);

-- 2. EDUCADOR – Sede Piura
MERGE INTO SEC_USUARIO t
USING (SELECT
    'Martin Chunga Fiestas'                                           AS nombre_completo,
    'educador.piura@educadores.gob.pe'                              AS email,
    '$2b$10$9rVAn/Cya3W0H4GhslahCe44LzYC7yvFDUT9lIyiYx0BGA2wkc1z6' AS password_hash,
    (SELECT id FROM SEC_ROL WHERE nombre = 'EDUCADOR')               AS rol_id,
    9                                                                AS sede_id,
    'Piura - Centro Histórico'                                       AS zona_asignada
FROM DUAL) s
ON (t.email = s.email)
WHEN NOT MATCHED THEN INSERT
    (nombre_completo, email, password_hash, rol_id, sede_id, zona_asignada, activo)
VALUES
    (s.nombre_completo, s.email, s.password_hash, s.rol_id, s.sede_id, s.zona_asignada, 1);

-- 3. PSICÓLOGO – Sede Piura
MERGE INTO SEC_USUARIO t
USING (SELECT
    'Diana Zapata Neyra'                                              AS nombre_completo,
    'psicologo.piura@educadores.gob.pe'                             AS email,
    '$2b$10$9rVAn/Cya3W0H4GhslahCe44LzYC7yvFDUT9lIyiYx0BGA2wkc1z6' AS password_hash,
    (SELECT id FROM SEC_ROL WHERE nombre = 'PSICOLOGO')              AS rol_id,
    9                                                                AS sede_id,
    'Piura'                                                         AS zona_asignada
FROM DUAL) s
ON (t.email = s.email)
WHEN NOT MATCHED THEN INSERT
    (nombre_completo, email, password_hash, rol_id, sede_id, zona_asignada, activo)
VALUES
    (s.nombre_completo, s.email, s.password_hash, s.rol_id, s.sede_id, s.zona_asignada, 1);

-- 4. TRABAJADOR SOCIAL – Sede Piura
MERGE INTO SEC_USUARIO t
USING (SELECT
    'César Seminario Ramos'                                             AS nombre_completo,
    'tsocial.piura@educadores.gob.pe'                               AS email,
    '$2b$10$9rVAn/Cya3W0H4GhslahCe44LzYC7yvFDUT9lIyiYx0BGA2wkc1z6' AS password_hash,
    (SELECT id FROM SEC_ROL WHERE nombre = 'TRABAJADOR_SOCIAL')      AS rol_id,
    9                                                                AS sede_id,
    'Piura'                                                         AS zona_asignada
FROM DUAL) s
ON (t.email = s.email)
WHEN NOT MATCHED THEN INSERT
    (nombre_completo, email, password_hash, rol_id, sede_id, zona_asignada, activo)
VALUES
    (s.nombre_completo, s.email, s.password_hash, s.rol_id, s.sede_id, s.zona_asignada, 1);

-- 5. ABOGADO – Sede Piura
MERGE INTO SEC_USUARIO t
USING (SELECT
    'Patricia Alva Ruiz'                                             AS nombre_completo,
    'abogado.piura@educadores.gob.pe'                               AS email,
    '$2b$10$9rVAn/Cya3W0H4GhslahCe44LzYC7yvFDUT9lIyiYx0BGA2wkc1z6' AS password_hash,
    (SELECT id FROM SEC_ROL WHERE nombre = 'ABOGADO')                AS rol_id,
    9                                                                AS sede_id,
    'Piura'                                                         AS zona_asignada
FROM DUAL) s
ON (t.email = s.email)
WHEN NOT MATCHED THEN INSERT
    (nombre_completo, email, password_hash, rol_id, sede_id, zona_asignada, activo)
VALUES
    (s.nombre_completo, s.email, s.password_hash, s.rol_id, s.sede_id, s.zona_asignada, 1);

-- 6. ADMINISTRADOR DE SEDE – Sede Piura
MERGE INTO SEC_USUARIO t
USING (SELECT
    'Gonzalo Vilela Juárez'                                           AS nombre_completo,
    'admin.piura@educadores.gob.pe'                                 AS email,
    '$2b$10$9rVAn/Cya3W0H4GhslahCe44LzYC7yvFDUT9lIyiYx0BGA2wkc1z6' AS password_hash,
    (SELECT id FROM SEC_ROL WHERE nombre = 'ADMIN_SEDE')             AS rol_id,
    9                                                                AS sede_id,
    'Piura'                                                         AS zona_asignada
FROM DUAL) s
ON (t.email = s.email)
WHEN NOT MATCHED THEN INSERT
    (nombre_completo, email, password_hash, rol_id, sede_id, zona_asignada, activo)
VALUES
    (s.nombre_completo, s.email, s.password_hash, s.rol_id, s.sede_id, s.zona_asignada, 1);

COMMIT;
