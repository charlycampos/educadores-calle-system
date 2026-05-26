-- ============================================================
-- MIGRACIÓN 006 — Usuarios de prueba para Sede 2: Huaral (LIM-02)
-- Propósito: Pruebas multi-sede — equipo completo en Sede 2
-- Contraseña universal: password123
-- Hash bcrypt (10 rounds): $2b$10$9rVAn/Cya3W0H4GhslahCe44LzYC7yvFDUT9lIyiYx0BGA2wkc1z6
-- Ejecutar conectado como: sec_user (o hacer SET CURRENT_SCHEMA)
-- ============================================================
ALTER SESSION SET CURRENT_SCHEMA = SEC_USER;

-- ─────────────────────────────────────────────────────────────
-- SEDE 2 = Huaral (LIM-02) — ya existe: Roberto Salas Quispe
-- como ADMIN_SEDE. Agregamos el equipo operativo completo.
-- ─────────────────────────────────────────────────────────────

-- 1. COORDINADOR – Sede Huaral
MERGE INTO SEC_USUARIO t
USING (SELECT
    'Carmen Rojas Villanueva'                                         AS nombre_completo,
    'coordinador.huaral@educadores.gob.pe'                           AS email,
    '$2b$10$9rVAn/Cya3W0H4GhslahCe44LzYC7yvFDUT9lIyiYx0BGA2wkc1z6' AS password_hash,
    (SELECT id FROM SEC_ROL WHERE nombre = 'COORDINADOR')            AS rol_id,
    2                                                                AS sede_id,
    'Huaral - Zona Centro'                                           AS zona_asignada
FROM DUAL) s
ON (t.email = s.email)
WHEN NOT MATCHED THEN INSERT
    (nombre_completo, email, password_hash, rol_id, sede_id, zona_asignada, activo)
VALUES
    (s.nombre_completo, s.email, s.password_hash, s.rol_id, s.sede_id, s.zona_asignada, 1);

-- 2. EDUCADOR – Sede Huaral
MERGE INTO SEC_USUARIO t
USING (SELECT
    'Luis Mendez Paredes'                                             AS nombre_completo,
    'educador.huaral@educadores.gob.pe'                              AS email,
    '$2b$10$9rVAn/Cya3W0H4GhslahCe44LzYC7yvFDUT9lIyiYx0BGA2wkc1z6' AS password_hash,
    (SELECT id FROM SEC_ROL WHERE nombre = 'EDUCADOR')               AS rol_id,
    2                                                                AS sede_id,
    'Huaral - Mercado Central'                                       AS zona_asignada
FROM DUAL) s
ON (t.email = s.email)
WHEN NOT MATCHED THEN INSERT
    (nombre_completo, email, password_hash, rol_id, sede_id, zona_asignada, activo)
VALUES
    (s.nombre_completo, s.email, s.password_hash, s.rol_id, s.sede_id, s.zona_asignada, 1);

-- 3. PSICÓLOGO – Sede Huaral
MERGE INTO SEC_USUARIO t
USING (SELECT
    'Rosa Quispe Mamani'                                              AS nombre_completo,
    'psicologo.huaral@educadores.gob.pe'                             AS email,
    '$2b$10$9rVAn/Cya3W0H4GhslahCe44LzYC7yvFDUT9lIyiYx0BGA2wkc1z6' AS password_hash,
    (SELECT id FROM SEC_ROL WHERE nombre = 'PSICOLOGO')              AS rol_id,
    2                                                                AS sede_id,
    'Huaral'                                                         AS zona_asignada
FROM DUAL) s
ON (t.email = s.email)
WHEN NOT MATCHED THEN INSERT
    (nombre_completo, email, password_hash, rol_id, sede_id, zona_asignada, activo)
VALUES
    (s.nombre_completo, s.email, s.password_hash, s.rol_id, s.sede_id, s.zona_asignada, 1);

-- 4. TRABAJADOR SOCIAL – Sede Huaral
MERGE INTO SEC_USUARIO t
USING (SELECT
    'Jorge Huaman Torres'                                             AS nombre_completo,
    'tsocial.huaral@educadores.gob.pe'                               AS email,
    '$2b$10$9rVAn/Cya3W0H4GhslahCe44LzYC7yvFDUT9lIyiYx0BGA2wkc1z6' AS password_hash,
    (SELECT id FROM SEC_ROL WHERE nombre = 'TRABAJADOR_SOCIAL')      AS rol_id,
    2                                                                AS sede_id,
    'Huaral'                                                         AS zona_asignada
FROM DUAL) s
ON (t.email = s.email)
WHEN NOT MATCHED THEN INSERT
    (nombre_completo, email, password_hash, rol_id, sede_id, zona_asignada, activo)
VALUES
    (s.nombre_completo, s.email, s.password_hash, s.rol_id, s.sede_id, s.zona_asignada, 1);

-- 5. ABOGADO – Sede Huaral
MERGE INTO SEC_USUARIO t
USING (SELECT
    'Elena Castro Flores'                                             AS nombre_completo,
    'abogado.huaral@educadores.gob.pe'                               AS email,
    '$2b$10$9rVAn/Cya3W0H4GhslahCe44LzYC7yvFDUT9lIyiYx0BGA2wkc1z6' AS password_hash,
    (SELECT id FROM SEC_ROL WHERE nombre = 'ABOGADO')                AS rol_id,
    2                                                                AS sede_id,
    'Huaral'                                                         AS zona_asignada
FROM DUAL) s
ON (t.email = s.email)
WHEN NOT MATCHED THEN INSERT
    (nombre_completo, email, password_hash, rol_id, sede_id, zona_asignada, activo)
VALUES
    (s.nombre_completo, s.email, s.password_hash, s.rol_id, s.sede_id, s.zona_asignada, 1);

COMMIT;

-- ============================================================
-- VERIFICACIÓN — ejecutar después para confirmar
-- ============================================================
SELECT
    u.id,
    u.nombre_completo,
    u.email,
    r.nombre   AS rol,
    s.nombre   AS sede,
    u.zona_asignada,
    u.activo
FROM   SEC_USUARIO u
JOIN   SEC_ROL  r ON r.id = u.rol_id
JOIN   SEC_SEDE s ON s.id = u.sede_id
WHERE  u.sede_id = 2
ORDER  BY r.id;
