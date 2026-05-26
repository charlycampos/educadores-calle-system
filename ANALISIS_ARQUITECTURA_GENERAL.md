# Sistema de Gestión de Educadores de Calle — DGNNA / INABIF
## Análisis General de Arquitectura y Rediseño — v3.0

**Versión:** 3.0  
**Fecha:** Mayo 2026  
**Tecnología aprobada:** Node.js + TypeORM + Oracle  
**Arquitectura:** Hexagonal + Microservicios + Multi-sede  
**Infraestructura:** Centralizada en OGTI — acceso vía navegador web

---

## 1. VISIÓN GENERAL

El sistema gestiona la atención integral de Niños, Niñas y Adolescentes (NNA) en situación de calle a nivel nacional, a través de **23 sedes** distribuidas en **21 regiones** del Perú. Los equipos de campo (educadores, psicólogos, trabajadores sociales y abogados) registran todo el proceso de intervención en tres fases. Todo está centralizado en OGTI y los usuarios acceden vía navegador web desde cada sede.

---

## 2. LAS 23 SEDES EN 21 REGIONES

Dos regiones tienen 2 sedes cada una. Las transferencias entre sedes de la misma región se consideran **traslado interno**. Las transferencias entre regiones distintas son **traslado externo**.

| # | Código | Sede | Región | Tipo |
|---|--------|------|--------|------|
| 1 | LIM-01 | Lima Metropolitana | Lima | Sede principal |
| 2 | LIM-02 | Huaral | Lima | Sede secundaria |
| 3 | CAL-01 | Callao | Callao | Sede única |
| 4 | AQP-01 | Arequipa | Arequipa | Sede única |
| 5 | LAL-01 | Trujillo | La Libertad | Sede única |
| 6 | LAM-01 | Chiclayo | Lambayeque | Sede única |
| 7 | PIU-01 | Piura | Piura | Sede única |
| 8 | TUM-01 | Tumbes | Tumbes | Sede única |
| 9 | CAJ-01 | Cajamarca | Cajamarca | Sede principal |
| 10 | CAJ-02 | Jaén | Cajamarca | Sede secundaria |
| 11 | CUS-01 | Cusco | Cusco | Sede única |
| 12 | PUN-01 | Puno | Puno | Sede única |
| 13 | TAC-01 | Tacna | Tacna | Sede única |
| 14 | ICA-01 | Ica | Ica | Sede única |
| 15 | AYA-01 | Ayacucho | Ayacucho | Sede única |
| 16 | APU-01 | Abancay | Apurímac | Sede única |
| 17 | JUN-01 | Huancayo | Junín | Sede única |
| 18 | HUA-01 | Huánuco | Huánuco | Sede única |
| 19 | ANC-01 | Chimbote | Áncash | Sede única |
| 20 | LOR-01 | Iquitos | Loreto | Sede única |
| 21 | UCY-01 | Pucallpa | Ucayali | Sede única |
| 22 | SAM-01 | Tarapoto | San Martín | Sede única |
| 23 | AMA-01 | Chachapoyas | Amazonas | Sede única |

**Regiones con 2 sedes (traslado interno entre ellas):**
- **Lima:** LIM-01 (Lima Metropolitana) ↔ LIM-02 (Huaral)
- **Cajamarca:** CAJ-01 (Cajamarca) ↔ CAJ-02 (Jaén)

---

## 3. ROLES Y USUARIOS

### 3.1 Roles del sistema

El término **"Educador"** es el nombre de la profesión de campo. El equipo profesional dentro de cada sede está compuesto por diferentes especialidades, todas bajo ese paraguas:

| Rol | Código | Descripción |
|-----|--------|-------------|
| `ADMIN_NACIONAL` | — | OGTI/DGNNA central. Ve y gestiona todo el sistema sin filtro de sede. |
| `COORDINADOR` | COORD | **Uno por sede.** Supervisa al equipo, aprueba derivaciones, gestiona traslados, ve todos los casos de su sede. |
| `EDUCADOR` | EDUC | Educador de calle. Registra atenciones, diario de campo, talleres. Ve solo sus casos. |
| `PSICOLOGO` | PSIC | Evaluación psicológica, diagnóstico, informe. Ve solo sus casos. |
| `TRABAJADOR_SOCIAL` | TSOC | Diagnóstico social (F04), seguimiento familiar. Ve solo sus casos. |
| `ABOGADO` | ABOG | Apoyo legal al NNA y familia, derivaciones a Fiscalía. Ve solo sus casos. |

### 3.2 Reglas de visibilidad

| Nivel | Quién | Qué ve |
|-------|-------|--------|
| Nacional | ADMIN_NACIONAL | Todas las sedes, todos los casos |
| Sede | COORDINADOR | Todos los casos de su sede (sin importar responsable) |
| Personal | EDUCADOR, PSICOLOGO, TSOC, ABOGADO | Solo los casos donde está asignado |

### 3.3 El Coordinador

Hay exactamente **un Coordinador por sede**. Sus responsabilidades exclusivas son:
- Asignar y reasignar casos a los profesionales de su equipo
- Aprobar derivaciones externas (a otra sede o entidad)
- Autorizar y gestionar traslados de NNA (internos y externos)
- Ver el expediente completo de todos los casos de su sede
- Acceder a estadísticas de su sede

---

## 4. LAS TRES FASES DE INTERVENCIÓN

El proceso de atención de cada NNA se estructura en tres fases. El estado del caso avanza según esta progresión:

```
FASE I — Captación y Evaluación
├── Estado: CAPTACION
│   └── Primer contacto, registro de NNA (Formato 3)
├── Estado: EN_EVALUACION
│   └── Diagnóstico social (F04), evaluación psicológica
│   └── Determinación de nivel de riesgo (BAJO / MEDIO / ALTO)
│   └── Apertura de Expediente Digital (Folio 1)
└── → Decisión: ¿Intervenir? ¿Derivar? ¿Trasladar?

FASE II — Intervención
├── Estado: INTERVENCION
│   └── Plan de Intervención Individual - PII (Formato PII)
│   └── Diario de Campo (atenciones diarias)
│   └── Talleres grupales e individuales (F07, F08)
│   └── Seguimiento familiar (F10)
│   └── Informes mensuales (F11)
│   └── Apoyo legal si se requiere (ABOGADO)
└── → Decisión: ¿Cerrar? ¿Derivar? ¿Trasladar?

FASE III — Seguimiento y Egreso
├── Estado: SEGUIMIENTO
│   └── Informe situacional (F09)
│   └── Monitoreo post-intervención
└── Estado: CERRADO / DERIVADO
    └── Informe de cierre (INF)
    └── Informe de egreso (F12)
    └── Cierre del expediente digital
```

---

## 5. TRASLADOS Y MIGRACIÓN DE NNA

Este es uno de los puntos más críticos del sistema. Se distinguen tres escenarios:

### 5.1 Cambio de distrito del NNA (mismo caso, misma sede)

El NNA cambia su domicilio a otro distrito pero sigue siendo atendido por la misma sede. Solo se actualiza la dirección y el ubigeo en su ficha. No hay cambio de responsable ni de expediente.

```
NNA: Juan Pérez — Sede Lima Metropolitana (LIM-01)
Antes: Distrito San Juan de Lurigancho, Zona Norte
Después: Distrito Ate, Zona Este
→ Se actualiza domicilio en ficha
→ El caso y expediente continúan igual
→ Puede cambiar de educador asignado si las zonas tienen responsables distintos
```

### 5.2 Traslado interno (entre sedes de la misma región)

El NNA pasa de una sede a otra dentro de la misma región. Solo el Coordinador puede autorizar este traslado.

**Regiones con traslado interno disponible:**
- Lima: LIM-01 (Lima Metropolitana) ↔ LIM-02 (Huaral)
- Cajamarca: CAJ-01 (Cajamarca) ↔ CAJ-02 (Jaén)

```
Flujo de traslado interno:
1. Coordinador origen inicia traslado (motivo obligatorio)
2. Sistema crea registro de traslado con fecha y estado PENDIENTE
3. Coordinador destino recibe notificación y acepta/rechaza
4. Si acepta:
   - El caso pasa a la sede destino (se actualiza sede_id)
   - El expediente digital se transfiere (todos los folios)
   - Se asigna nuevo responsable en sede destino
   - Se registra evento en historial del caso: "TRASLADO_INTERNO"
5. El NNA conserva su ficha original (misma persona)
6. El código de caso NO cambia: CAS-2026-0001 sigue igual
```

### 5.3 Traslado externo (entre sedes de distintas regiones)

El NNA pasa de una sede a otra de diferente región (ej. Lima → Cajamarca). Requiere mayor formalidad.

```
Flujo de traslado externo:
1. Coordinador origen solicita traslado externo con justificación
2. Sistema genera Oficio de Derivación (documento formal)
3. Coordinador destino recibe solicitud formal
4. Si acepta:
   - Mismo flujo que traslado interno pero con registro de:
     "TRASLADO_EXTERNO" en historial
   - Se genera folio adicional en el expediente:
     "Oficio de Traslado Externo — Lima → Cajamarca"
5. El expediente digital completo está disponible para ambas sedes
   durante el proceso de traslado
```

### 5.4 Modelo de datos del traslado

```sql
CREATE TABLE TRASLADO_NNA (
  ID                  NUMBER GENERATED AS IDENTITY PRIMARY KEY,
  CASO_ID             NUMBER        NOT NULL,
  NNA_ID              NUMBER        NOT NULL,
  TIPO                VARCHAR2(20)  NOT NULL,  -- INTERNO | EXTERNO
  SEDE_ORIGEN_ID      NUMBER        NOT NULL,
  SEDE_DESTINO_ID     NUMBER        NOT NULL,
  COORDINADOR_ORIGEN  NUMBER        NOT NULL,
  COORDINADOR_DESTINO NUMBER,
  MOTIVO              VARCHAR2(500) NOT NULL,
  ESTADO              VARCHAR2(20)  DEFAULT 'PENDIENTE',
  -- PENDIENTE | ACEPTADO | RECHAZADO
  FECHA_SOLICITUD     TIMESTAMP     DEFAULT SYSTIMESTAMP,
  FECHA_RESPUESTA     TIMESTAMP,
  OBSERVACIONES       VARCHAR2(500),
  FOLIO_OFICIO_ID     NUMBER  -- referencia al folio del oficio generado
);
```

---

## 6. MENÚ PRINCIPAL — CARDS POR ROL

Al ingresar al sistema cada usuario ve un panel de tarjetas adaptado a su rol:

```
┌──────────────────────────────────────────────────────────────────────┐
│  DGNNA — Sistema de Educadores de Calle          [LIM-01 Lima]  [X] │
│  Bienvenido, María Quispe          Rol: Trabajadora Social           │
├──────────────┬──────────────┬──────────────┬──────────────┬──────────┤
│              │              │              │              │          │
│   REGISTRO   │  EXPEDIENTE  │  DIAGNÓSTICO │    PLAN DE   │ TRASLADO │
│    DE NNA    │   DIGITAL    │   SOCIAL     │ INTERVENCIÓN │   NNA    │
│              │              │              │              │          │
│  Ingresar y  │  Folios y    │  Formato 4   │  PTI / PII   │ Solicitar│
│  buscar NNA  │  documentos  │  completo    │  y acciones  │ traslado │
│              │              │              │              │          │
├──────────────┼──────────────┼──────────────┼──────────────┼──────────┤
│              │              │              │              │          │
│   DIARIO     │  SEGUIMIENTO │ DERIVACIONES │   TALLERES   │  CIERRE  │
│   DE CAMPO   │   FAMILIAR   │              │              │  EGRESO  │
│              │              │              │              │          │
│  Registro    │  Visitas     │  Internas y  │  Planificar  │ Informe  │
│  diario      │  familiares  │  externas    │  y ejecutar  │ y cierre │
│              │              │              │              │          │
└──────────────┴──────────────┴──────────────┴──────────────┴──────────┘
```

### Tarjetas visibles según rol

| Módulo (Card) | ADMIN | COORD | EDUC | PSIC | TSOC | ABOG |
|---------------|-------|-------|------|------|------|------|
| Registro de NNA | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Gestión de Usuarios | ✓ | ✓ | — | — | — | — |
| Expediente Digital | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Diagnóstico Social | ✓ | ✓ | — | ✓ | ✓ | — |
| Plan de Intervención (PII) | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Diario de Campo | ✓ | ✓ | ✓ | — | — | — |
| Seguimiento Familiar | ✓ | ✓ | ✓ | — | ✓ | — |
| Derivaciones | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Talleres | ✓ | ✓ | ✓ | — | — | — |
| Traslado de NNA | ✓ | ✓ | — | — | — | — |
| Apoyo Legal | ✓ | ✓ | — | — | — | ✓ |
| Cierre / Egreso | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Reportes / Estadísticas | ✓ | ✓ | — | — | — | — |

---

## 7. MÓDULO: GESTIÓN DE USUARIOS

### 7.1 Funciones por rol

**ADMIN_NACIONAL:**
- Crear/editar/desactivar usuarios en cualquier sede
- Crear Coordinadores de sede
- Ver listado de usuarios por sede, rol, estado
- Resetear contraseñas
- Ver auditoría de accesos

**COORDINADOR (de su sede):**
- Crear/editar usuarios de su equipo (EDUCADOR, PSICOLOGO, TSOC, ABOGADO)
- No puede crear otro COORDINADOR ni ADMIN
- Desactivar usuarios de su sede
- Ver disponibilidad del equipo (carga de casos por profesional)

### 7.2 Pantallas del módulo

```
Lista de Usuarios
├── Filtros: Sede | Rol | Estado (activo/inactivo)
├── Columnas: Nombre | Rol | Sede | Zona asignada | Casos activos | Estado
└── Acciones: Ver | Editar | Activar/Desactivar | Ver carga de trabajo

Formulario Crear/Editar Usuario
├── Datos personales (nombre, email)
├── Rol asignado
├── Sede asignada
├── Zona de intervención (campo de trabajo)
└── Estado (activo/inactivo)

Perfil de Usuario
├── Datos del profesional
├── Casos activos asignados
├── Historial de atenciones registradas
└── Talleres ejecutados
```

---

## 8. EXPEDIENTE DIGITAL (FOLIADO)

Cada caso tiene un expediente digital con todos sus documentos ordenados y numerados correlativamente. Es el registro oficial e inmutable del proceso de atención.

### 8.1 Tipos de documentos por fase

**FASE I — Captación y Evaluación**
| Folio | Código | Documento |
|-------|--------|-----------|
| 1 | F03 | Ficha de Inscripción / Registro NNA |
| 2 | F04 | Diagnóstico Social |
| 3 | EVAL_PSIC | Evaluación Psicológica |
| 4 | F06 | Ficha de Derivación (si aplica) |

**FASE II — Intervención**
| Folio | Código | Documento |
|-------|--------|-----------|
| 5 | PII | Plan de Intervención Individual |
| 6+ | DC | Diarios de Campo (uno por atención) |
| n | F07 | Plan de Taller |
| n | F08 | Ejecución y Evaluación de Taller |
| n | F10 | Seguimiento Familiar |
| n | F11 | Informe Mensual |
| n | LEG | Informe Legal / Apoyo Legal (si aplica) |

**FASE III — Seguimiento y Egreso**
| Folio | Código | Documento |
|-------|--------|-----------|
| n | F09 | Informe Situacional |
| n | F12 | Informe de Egreso |
| n | F05 | Logros y Actividades |
| n | INF | Informe de Cierre |
| n | OFIC | Oficio de Traslado (si aplica) |

### 8.2 Vista del expediente digital

```
EXPEDIENTE DIGITAL — CAS-2026-0001
NNA: Juan Alberto Pérez Gómez | Sede: Lima Metropolitana
─────────────────────────────────────────────────────────────
Folio  Fecha        Documento                   Responsable    PDF
────────────────────────────────────────────────────────────────────
01     15-01-2026   Ficha Inscripción (F03)     M. Torres      [Ver]
02     20-01-2026   Diagnóstico Social (F04)    C. Quispe      [Ver]
03     22-01-2026   Evaluación Psicológica      R. Mendoza     [Ver]
04     25-01-2026   Plan Intervención (PII)     M. Torres      [Ver]
05     01-02-2026   Diario de Campo             M. Torres      [Ver]
06     08-02-2026   Diario de Campo             M. Torres      [Ver]
07     10-02-2026   Plan de Taller (F07)        M. Torres      [Ver]
08     10-02-2026   Ejecución Taller (F08)      M. Torres      [Ver]
09     01-03-2026   Informe Mensual (F11)       C. Quispe      [Ver]
10     15-05-2026   Informe de Cierre (INF)     M. Torres      [Ver]
─────────────────────────────────────────────────────────────
Total folios: 10        Estado: CERRADO
```

Cada folio: número correlativo, fecha, tipo, responsable, URL del PDF en servidor, hash SHA-256 (integridad — no se puede alterar).

---

## 9. ARQUITECTURA TÉCNICA

### 9.1 Despliegue en OGTI

```
[Navegadores — 23 Sedes vía Internet]
              │ HTTPS
              ▼
┌─────────────────────────────────────────────────────┐
│                  OGTI - Sede Central                 │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │        Frontend React (archivos estáticos)   │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │           API Gateway (Nginx)                │    │
│  │  Enrutamiento · JWT · Rate limiting · Logs   │    │
│  └────────────────────┬─────────────────────────┘    │
│                       │                              │
│  ┌────────────────────▼─────────────────────────┐    │
│  │              Microservicios                  │    │
│  │  :3001  auth-service                        │    │
│  │  :3002  nna-service                         │    │
│  │  :3003  intervencion-service                │    │
│  │  :3004  derivacion-service                  │    │
│  │  :3005  talleres-service                    │    │
│  │  :3006  expediente-service                  │    │
│  └────────────────────┬─────────────────────────┘    │
│                       │                              │
│  ┌────────────────────▼─────────────────────────┐    │
│  │           Oracle Database (OGTI)             │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │     File Server — PDFs del Expediente        │    │
│  │   /expedientes/{sede}/{caso}/folio-XX.pdf    │    │
│  └──────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

### 9.2 Los 6 Microservicios

| Servicio | Puerto | Responsabilidad |
|----------|--------|----------------|
| `auth-service` | 3001 | Login, JWT, usuarios, roles, sedes |
| `nna-service` | 3002 | NNA, casos, carpetas, historial de estados, traslados |
| `intervencion-service` | 3003 | Diario campo, PTI/PII, diagnóstico social, seguimiento familiar, apoyo legal |
| `derivacion-service` | 3004 | Derivaciones internas y externas |
| `talleres-service` | 3005 | Talleres, participantes, asistencia, evaluación |
| `expediente-service` | 3006 | Foliado digital, informes cierre, estadísticas |

### 9.3 Multi-tenancy — sede_id en el JWT

```typescript
// Payload del JWT al hacer login
{
  userId: 42,
  email: "mquispe@inabif.gob.pe",
  rol: "TRABAJADOR_SOCIAL",
  sedeId: 1,           // LIM-01
  sedeCodigo: "LIM-01",
  regionId: 15         // Para validar traslados internos
}

// sede.middleware.ts — se aplica en cada request
if (rol === 'ADMIN_NACIONAL') {
  req.sedeFilter = null;            // Ve todo
} else if (rol === 'COORDINADOR') {
  req.sedeFilter = { sedeId };      // Ve toda su sede
} else {
  req.sedeFilter = { sedeId, responsableId: userId }; // Solo sus casos
}
```

### 9.4 Estructura hexagonal por microservicio

```
nna-service/
├── src/
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── Nna.ts              ← Entidad pura (reglas de negocio)
│   │   │   ├── Caso.ts
│   │   │   └── Traslado.ts
│   │   ├── repositories/
│   │   │   ├── INnaRepository.ts   ← Puerto (interfaz)
│   │   │   └── ICasoRepository.ts
│   │   └── use-cases/
│   │       ├── RegistrarNnaUseCase.ts
│   │       ├── AbrirCasoUseCase.ts
│   │       ├── SolicitarTrasladoUseCase.ts
│   │       └── AceptarTrasladoUseCase.ts
│   │
│   ├── application/
│   │   └── services/
│   │       ├── NnaApplicationService.ts
│   │       └── TrasladoApplicationService.ts
│   │
│   └── infrastructure/
│       ├── db/
│       │   ├── entities/           ← Entidades TypeORM para Oracle
│       │   └── repositories/       ← Implementaciones Oracle
│       ├── http/
│       │   ├── routes/
│       │   ├── controllers/
│       │   └── middlewares/
│       │       └── sede.middleware.ts
│       └── config/
│           └── oracle.config.ts
```

---

## 10. BASE DE DATOS ORACLE — ENTIDADES PRINCIPALES

### Tablas con sede_id (datos multi-sede)

```
SEDE              → entidad raíz de multi-tenancy
USUARIO           → sede_id (a qué sede pertenece)
CASO              → sede_id (en qué sede se atiende)
CARPETA           → sede_id
TALLER            → sede_id
EXPEDIENTE_FOLIO  → sede_id
TRASLADO_NNA      → sede_origen_id + sede_destino_id
```

### El NNA: entidad nacional sin sede_id

```
NNA  → SIN sede_id (es una persona única a nivel nacional)
     → Se identifica por DNI o código único nacional
     → Puede tener CASOS en múltiples sedes si fue trasladado
     → Su dirección/ubigeo se actualiza sin afectar el expediente
```

### Cambios de PostgreSQL a Oracle

| Prisma/PostgreSQL | TypeORM/Oracle | Nota |
|-------------------|---------------|------|
| `@id @default(autoincrement())` | `NUMBER GENERATED AS IDENTITY` | Oracle 12c+ |
| `String` sin longitud | `VARCHAR2(255)` | Obligatorio definir tamaño |
| `Json` | `CLOB` con `IS JSON` check | Oracle 12c+ |
| `Boolean` | `NUMBER(1)` (0/1) | No existe BOOLEAN en Oracle SQL |
| `DateTime` | `TIMESTAMP` | Más preciso que DATE |
| `new PrismaClient()` en cada controller | Una sola conexión TypeORM por servicio | Anti-patrón actual a corregir |

---

## 11. PLAN DE MIGRACIÓN EN 3 FASES

### FASE 1 — Refactorización a Hexagonal + Sedes (sin cambiar BD)

Objetivo: Ordenar el código actual, agregar el modelo de sedes y las tres fases de intervención. El sistema sigue corriendo en PostgreSQL.

- Crear estructura hexagonal: `domain/`, `application/`, `infrastructure/`
- Eliminar múltiples `new PrismaClient()` (unificar en un singleton)
- Agregar modelo `Sede` con las 23 sedes
- Agregar `sedeId` a tablas correspondientes
- Agregar rol `ABOGADO` y `ADMIN_NACIONAL`
- Agregar modelo `TrasladoNna` (interno y externo)
- Ampliar tipos de documento en `ExpedienteFolio` (13 tipos)
- Rediseñar el dashboard con cards por rol
- Agregar las tres fases al flujo del caso

**Resultado:** Sistema ordenado, con soporte de sedes, traslados y nuevos roles.

### FASE 2 — Migración a TypeORM + Oracle

Objetivo: Reemplazar Prisma por TypeORM y conectarse a Oracle de OGTI.

- Instalar TypeORM + driver `oracledb` oficial de Oracle
- Reescribir cada entidad Prisma → decoradores TypeORM
- Crear transformer JSON → CLOB para campos complejos
- Scripts de migración de datos PostgreSQL → Oracle
- Pruebas de integración con el Oracle de OGTI
- Validar tiempos de respuesta con 23 sedes conectadas

**Resultado:** Sistema corriendo sobre Oracle, administrado por OGTI.

### FASE 3 — Separación en Microservicios

Objetivo: Extraer los 6 microservicios uno por uno, sin downtime.

Orden de extracción:
1. `auth-service` (más independiente, sin dependencias de negocio)
2. `nna-service` (núcleo del sistema)
3. `expediente-service` (foliado + PDF)
4. `derivacion-service`
5. `talleres-service`
6. `intervencion-service` (más complejo, múltiples sub-módulos)

- Configurar API Gateway con Nginx
- Deploy con Docker Compose en servidor OGTI
- Configurar HTTPS con certificado SSL
- Configurar backups automáticos Oracle
- Capacitación al equipo de OGTI

**Resultado:** Sistema en producción nacional, 23 sedes activas.

---

## 12. RESUMEN EJECUTIVO DE CAMBIOS

| Aspecto | Sistema Actual | Sistema Nuevo |
|---------|---------------|---------------|
| ORM | Prisma | TypeORM |
| Base de datos | PostgreSQL | Oracle (OGTI) |
| Arquitectura | Monolito MVC | Hexagonal + 6 Microservicios |
| Sedes | Campo texto libre | 23 sedes en 21 regiones |
| Roles | 5 roles | 6 roles + ADMIN_NACIONAL |
| Equipo profesional | Sin Abogado | Educador, Psicólogo, T. Social, Abogado |
| Coordinador | Sin definir | 1 por sede, rol central |
| Traslados | No contemplado | Interno (misma región) y Externo |
| NNA migra de distrito | Solo actualiza campo | Historial de domicilios |
| Fases de intervención | Estados sueltos | 3 fases formales (I, II, III) |
| Expediente digital | Parcial (3 tipos doc.) | Foliado completo (13 tipos) |
| Generación PDF | Solo navegador | Servidor + almacenamiento + foliado |
| Dashboard | Por rol básico | Cards dinámicas con 13 módulos |
| Gestión de usuarios | Básica | CRUD por sede con carga de trabajo |

---

*Documento de análisis — v3.0*
*Próximo paso: Fase 1 — Diseño del auth-service con arquitectura hexagonal y modelo de Sede.*
