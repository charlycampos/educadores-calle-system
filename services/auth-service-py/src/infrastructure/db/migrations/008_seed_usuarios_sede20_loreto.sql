-- ============================================================
-- MIGRACIÓN 008 — Usuarios para Sede 20: Loreto (401)
-- Contraseña universal: password123
-- Hash bcrypt (10 rounds): $2b$10$9rVAn/Cya3W0H4GhslahCe44LzYC7yvFDUT9lIyiYx0BGA2wkc1z6
-- ============================================================
ALTER SESSION SET CURRENT_SCHEMA = SEC_USER;

-- 1. COORDINADOR – Sede Loreto
MERGE INTO SEC_USUARIO t
USING (SELECT
    'Rosa Pinedo Arévalo'                                              AS nombre_completo,
    'coordinador.loreto@educadores.gob.pe'                            AS email,
    '$2b$10$9rVAn/Cya3W0H4GhslahCe44LzYC7yvFDUT9lIyiYx0BGA2wkc1z6'  AS password_hash,
    (SELECT id FROM SEC_ROL WHERE nombre = 'COORDINADOR')             AS rol_id,
    20                                                                AS sede_id,
    'Iquitos'                                                         AS zona_asignada
FROM DUAL) s
ON (t.email = s.email)
WHEN NOT MATCHED THEN INSERT
    (nombre_completo, email, password_hash, rol_id, sede_id, zona_asignada, activo)
VALUES
    (s.nombre_completo, s.email, s.password_hash, s.rol_id, s.sede_id, s.zona_asignada, 1);

-- 2. EDUCADOR – Sede Loreto
MERGE INTO SEC_USUARIO t
USING (SELECT
    'Carlos Vásquez Tapullima'                                         AS nombre_completo,
    'educador.loreto@educadores.gob.pe'                               AS email,
    '$2b$10$9rVAn/Cya3W0H4GhslahCe44LzYC7yvFDUT9lIyiYx0BGA2wkc1z6'  AS password_hash,
    (SELECT id FROM SEC_ROL WHERE nombre = 'EDUCADOR')                AS rol_id,
    20                                                                AS sede_id,
    'Iquitos - Belén'                                                 AS zona_asignada
FROM DUAL) s
ON (t.email = s.email)
WHEN NOT MATCHED THEN INSERT
    (nombre_completo, email, password_hash, rol_id, sede_id, zona_asignada, activo)
VALUES
    (s.nombre_completo, s.email, s.password_hash, s.rol_id, s.sede_id, s.zona_asignada, 1);

COMMIT;
