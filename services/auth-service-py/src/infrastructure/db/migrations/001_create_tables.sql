-- ============================================================
-- MIGRACIÓN 001 — Tablas base del auth-service
-- Motor: Oracle 12c+ (compatible 19c, 21c)
-- Ejecutar con usuario que tenga privilegios CREATE TABLE
-- ============================================================

-- ── SEC_SEDE ─────────────────────────────────────────────────
BEGIN
  EXECUTE IMMEDIATE '
    CREATE TABLE SEC_SEDE (
      id           NUMBER GENERATED AS IDENTITY PRIMARY KEY,
      codigo       VARCHAR2(10)  NOT NULL,
      nombre       VARCHAR2(100) NOT NULL,
      region_id    NUMBER        NOT NULL,
      region       VARCHAR2(20)  NOT NULL,
      departamento VARCHAR2(60)  NOT NULL,
      provincia    VARCHAR2(60)  NOT NULL,
      direccion    VARCHAR2(200),
      telefono     VARCHAR2(20),
      activo       NUMBER(1)     DEFAULT 1 NOT NULL,
      created_at   TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL,
      CONSTRAINT uq_sede_codigo UNIQUE (codigo)
    )
  ';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE = -955 THEN NULL; -- tabla ya existe, ignorar
    ELSE RAISE;
    END IF;
END;
/

-- ── SEC_ROL ──────────────────────────────────────────────────
BEGIN
  EXECUTE IMMEDIATE '
    CREATE TABLE SEC_ROL (
      id          NUMBER GENERATED AS IDENTITY PRIMARY KEY,
      nombre      VARCHAR2(30)  NOT NULL,
      descripcion VARCHAR2(200),
      created_at  TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL,
      CONSTRAINT uq_rol_nombre UNIQUE (nombre)
    )
  ';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE = -955 THEN NULL;
    ELSE RAISE;
    END IF;
END;
/

-- ── SEC_USUARIO ───────────────────────────────────────────────
BEGIN
  EXECUTE IMMEDIATE '
    CREATE TABLE SEC_USUARIO (
      id              NUMBER GENERATED AS IDENTITY PRIMARY KEY,
      nombre_completo VARCHAR2(150) NOT NULL,
      email           VARCHAR2(100) NOT NULL,
      password_hash   VARCHAR2(255) NOT NULL,
      rol_id          NUMBER        NOT NULL,
      sede_id         NUMBER        NOT NULL,
      zona_asignada   VARCHAR2(100),
      activo          NUMBER(1)     DEFAULT 1 NOT NULL,
      created_at      TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL,
      updated_at      TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL,
      CONSTRAINT uq_usuario_email  UNIQUE (email),
      CONSTRAINT fk_usuario_rol    FOREIGN KEY (rol_id)  REFERENCES SEC_ROL(id),
      CONSTRAINT fk_usuario_sede   FOREIGN KEY (sede_id) REFERENCES SEC_SEDE(id)
    )
  ';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE = -955 THEN NULL;
    ELSE RAISE;
    END IF;
END;
/

-- ── Índices ───────────────────────────────────────────────────
BEGIN
  EXECUTE IMMEDIATE 'CREATE INDEX idx_usuario_sede  ON SEC_USUARIO(sede_id)';
EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN
  EXECUTE IMMEDIATE 'CREATE INDEX idx_usuario_rol   ON SEC_USUARIO(rol_id)';
EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN
  EXECUTE IMMEDIATE 'CREATE INDEX idx_usuario_email ON SEC_USUARIO(email)';
EXCEPTION WHEN OTHERS THEN NULL; END;
/
