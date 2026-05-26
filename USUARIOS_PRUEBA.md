# 👥 Usuarios de Prueba - Sistema Educadores de Calle

## Credenciales de Acceso

**IMPORTANTE:** Todos los usuarios usan la misma contraseña para facilitar las pruebas.

### 🔑 Contraseña Universal
```
password123
```

---

## 🏢 SEDE 1 — Lima Metropolitana (LIM-01)

### 👑 ADMINISTRADOR NACIONAL
- **Email:** `admin@educadores.gob.pe`
- **Rol:** ADMIN_NACIONAL
- **Acceso:** Ve TODAS las sedes, usuarios y casos del sistema
- **Módulos extra:** Dashboard Nacional, Gestión de Sedes

---

### 🏠 ADMIN DE SEDE (Sede 1 - Lima Metropolitana)
- **Email:** `admin.nacional@educadores.gob.pe`
- **Nombre:** Diana Flores Mendoza
- **Rol:** ADMIN_NACIONAL (alterna con admin@)

---

### 👩‍💼 COORDINADORA
- **Email:** `coordinador@educadores.gob.pe`
- **Nombre:** María Coordinadora Pérez
- **Zona:** Lima Metropolitana - Zona Norte
- **Acceso:** Ve todos los casos de su sede

---

### 🚶 EDUCADOR DE CALLE
- **Email:** `educador@educadores.gob.pe`
- **Nombre:** Juan Educador García
- **Zona:** Lima Metropolitana - Jr. de la Unión
- **Acceso:** Sus propios casos

---

### 🧠 PSICÓLOGA
- **Email:** `psicologo@educadores.gob.pe`
- **Nombre:** Ana Psicóloga Rodríguez
- **Zona:** Lima Metropolitana
- **Acceso:** Casos derivados a ella

---

### 👨‍⚕️ TRABAJADOR SOCIAL
- **Email:** `tsocial@educadores.gob.pe`
- **Nombre:** Carlos Trabajador Social López
- **Zona:** Lima Metropolitana

---

### ⚖️ ABOGADA
- **Email:** `abogado@educadores.gob.pe`
- **Nombre:** Patricia Abogada Vega
- **Zona:** Lima Metropolitana

---

## 🏢 SEDE 2 — Huaral (LIM-02)

> **Script SQL:** `services/auth-service/src/infrastructure/db/migrations/006_seed_usuarios_sede2_huaral.sql`
> Ejecutar en SQL*Plus o DBeaver conectado como `sec_user`.

### 🏠 ADMIN DE SEDE (Sede 2 - Huaral)
- **Email:** `admin.sede@educadores.gob.pe`
- **Nombre:** Roberto Salas Quispe
- **Rol:** ADMIN_SEDE
- **Acceso:** Gestiona usuarios y casos solo de la sede Huaral

---

### 👩‍💼 COORDINADORA
- **Email:** `coordinador.huaral@educadores.gob.pe`
- **Nombre:** Carmen Rojas Villanueva
- **Zona:** Huaral - Zona Centro

---

### 🚶 EDUCADOR
- **Email:** `educador.huaral@educadores.gob.pe`
- **Nombre:** Luis Méndez Paredes
- **Zona:** Huaral - Mercado Central

---

### 🧠 PSICÓLOGA
- **Email:** `psicologo.huaral@educadores.gob.pe`
- **Nombre:** Rosa Quispe Mamani
- **Zona:** Huaral

---

### 👨‍⚕️ TRABAJADOR SOCIAL
- **Email:** `tsocial.huaral@educadores.gob.pe`
- **Nombre:** Jorge Huamán Torres
- **Zona:** Huaral

---

### ⚖️ ABOGADA
- **Email:** `abogado.huaral@educadores.gob.pe`
- **Nombre:** Elena Castro Flores
- **Zona:** Huaral

---

## 🏢 SEDE CENTRAL (Sede Central Nacional)

### 🕵️‍♂️ MONITOR NACIONAL (Sectorista Central)
- **Email:** `monitor@educadores.gob.pe`
- **Nombre:** Mario Monitor Central
- **Rol:** MONITOR
- **Zona:** Sede Central Nacional
- **Acceso:** Supervisa a nivel nacional la calidad y el correcto llenado de expedientes (Lectura de casos, sin edición ni creación), aprueba transferencias externas de casos entre departamentos.

---

### 📊 ESTADÍSTICO/A (Métricas Nacionales)
- **Email:** `estadistico@educadores.gob.pe`
- **Nombre:** Elena Estadistica Torres
- **Rol:** ESTADISTICO
- **Zona:** Sede Central Nacional
- **Acceso:** Visualiza métricas nacionales consolidadas, descarga reportes nacionales (Sin edición ni creación).

---

## 🔄 Flujos de Prueba

### Escenario 1: Vista Multi-Sede (Admin Nacional)
1. Login como `admin@educadores.gob.pe`
2. Ir a **Gestión de Sedes** (módulo nuevo en el menú)
3. Ver las 24 sedes del programa con sus equipos
4. Hacer clic en **Lima Metropolitana** → ver su equipo completo
5. Hacer clic en **Huaral** → ver el equipo de esa sede
6. Ir a **Gestión de Usuarios** → filtrar por sede con el selector

### Escenario 2: Vista de Admin de Sede (Huaral)
1. Login como `admin.sede@educadores.gob.pe`
2. Dashboard de sede → métricas solo de Huaral
3. Gestión de Usuarios → ve SOLO el equipo de Huaral
4. Crear nuevo usuario → se asigna automáticamente a Sede 2

### Escenario 3: Flujo Operativo en Sede 2
1. Login como `educador.huaral@educadores.gob.pe`
2. Registrar un NNA nuevo → queda asociado a Sede 2
3. Derivar a `psicologo.huaral@educadores.gob.pe`
4. Login como psicóloga → verifica que recibe el caso

### Escenario 4: Aislamiento de Sedes
1. Login como `educador@educadores.gob.pe` (Sede 1)
2. Ver lista de NNA → solo ve los de Sede 1
3. Login como `educador.huaral@educadores.gob.pe` (Sede 2)
4. Ver lista de NNA → solo ve los de Sede 2

---

## 📋 Cómo Ejecutar el Script de Usuarios Sede 2

Desde **DBeaver** o **SQL Developer** conectado como `sec_user`:

```sql
-- Abrir y ejecutar completo:
006_seed_usuarios_sede2_huaral.sql
```

**Última actualización:** 2026-05-14
