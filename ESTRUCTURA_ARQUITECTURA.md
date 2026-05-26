# Estructura de Arquitectura — Sistema SEC
## Hexagonal + Microservicios + Oracle + Multi-sede (23 sedes)

---

## 1. VISIÓN GENERAL DEL PROYECTO

```
educadores-calle-system/
│
├── client/                        ← Frontend React + TypeScript (existente, se refactoriza)
├── services/                      ← Los 6 microservicios (NUEVO)
│   ├── auth-service/
│   ├── nna-service/
│   ├── intervencion-service/
│   ├── derivacion-service/
│   ├── talleres-service/
│   └── expediente-service/
├── gateway/                       ← API Gateway con Nginx (NUEVO)
├── shared/                        ← Tipos y utilidades compartidas (NUEVO)
├── docker-compose.yml             ← Orquestación para OGTI (NUEVO)
└── docs/                          ← Documentación y análisis (existente)
```

---

## 2. ESTRUCTURA DEL API GATEWAY

```
gateway/
├── nginx.conf                     ← Configuración principal de enrutamiento
├── ssl/                           ← Certificados HTTPS
│   ├── cert.pem
│   └── key.pem
└── logs/                          ← Logs de acceso por sede
```

**Reglas de enrutamiento en nginx.conf:**
```nginx
/api/auth/*        → auth-service:3001
/api/usuarios/*    → auth-service:3001
/api/sedes/*       → auth-service:3001
/api/nna/*         → nna-service:3002
/api/casos/*       → nna-service:3002
/api/traslados/*   → nna-service:3002
/api/diario/*      → intervencion-service:3003
/api/pti/*         → intervencion-service:3003
/api/diagnostico/* → intervencion-service:3003
/api/seguimiento/* → intervencion-service:3003
/api/derivaciones/*→ derivacion-service:3004
/api/talleres/*    → talleres-service:3005
/api/expediente/*  → expediente-service:3006
/api/cierre/*      → expediente-service:3006
/api/estadisticas/*→ expediente-service:3006
```

---

## 3. LIBRERÍA COMPARTIDA (shared/)

Código que usan TODOS los microservicios. Se instala como dependencia local.

```
shared/
├── src/
│   ├── types/
│   │   ├── roles.types.ts         ← Enum de roles: ADMIN_NACIONAL, COORDINADOR, etc.
│   │   ├── sede.types.ts          ← Tipos de sede y región
│   │   ├── jwt.types.ts           ← Interface del payload JWT
│   │   └── response.types.ts      ← Formato estándar de respuestas API
│   │
│   ├── middlewares/
│   │   ├── auth.middleware.ts     ← Verificación del JWT (todos los servicios lo usan)
│   │   ├── sede.middleware.ts     ← Inyecta filtro de sede según rol
│   │   └── role.middleware.ts     ← Autorización por rol
│   │
│   ├── utils/
│   │   ├── codigos.util.ts        ← Generación de códigos: CAS-2026-0001, F03-2026-0001
│   │   ├── hash.util.ts           ← SHA-256 para integridad de documentos
│   │   └── fecha.util.ts          ← Manejo de fechas compatible con Oracle
│   │
│   └── errors/
│       ├── AppError.ts            ← Clase base de errores de dominio
│       ├── NotFoundError.ts
│       ├── UnauthorizedError.ts
│       └── ValidationError.ts
│
└── package.json
```

**Ejemplo del payload JWT compartido (jwt.types.ts):**
```typescript
export interface JwtPayload {
  userId:      number;
  email:       string;
  rol:         Rol;           // 'ADMIN_NACIONAL' | 'COORDINADOR' | 'EDUCADOR' | ...
  sedeId:      number;        // ID de la sede (LIM-01 = 1, etc.)
  sedeCodigo:  string;        // 'LIM-01'
  regionId:    number;        // Para validar traslados internos
  iat:         number;
  exp:         number;
}
```

---

## 4. LOS 6 MICROSERVICIOS — ESTRUCTURA HEXAGONAL

Todos los servicios siguen la misma estructura interna. Aquí está explicado en detalle con el patrón completo.

---

### 4.1 AUTH-SERVICE (:3001)

Gestiona: Login, Usuarios, Roles, Sedes

```
auth-service/
├── src/
│   │
│   ├── domain/                            ← NÚCLEO PURO (sin dependencias externas)
│   │   │
│   │   ├── entities/
│   │   │   ├── Usuario.ts                 ← Entidad con reglas de negocio
│   │   │   │     - validarPassword()
│   │   │   │     - estaActivo()
│   │   │   │     - puedeGestionarSede(sedeId)
│   │   │   ├── Sede.ts
│   │   │   │     - esSedeSecundaria()      ← Huaral, Jaén
│   │   │   │     - mismаRegion(otraSede)   ← Para validar traslados internos
│   │   │   └── Rol.ts
│   │   │
│   │   ├── repositories/                  ← PUERTOS (interfaces)
│   │   │   ├── IUsuarioRepository.ts      ← findByEmail, findById, save, update
│   │   │   └── ISedeRepository.ts         ← findAll, findById, findByRegion
│   │   │
│   │   └── use-cases/
│   │       ├── LoginUseCase.ts            ← Valida credenciales, genera JWT
│   │       ├── CrearUsuarioUseCase.ts     ← Crea usuario en una sede
│   │       ├── ActualizarUsuarioUseCase.ts
│   │       ├── DesactivarUsuarioUseCase.ts
│   │       └── ListarUsuariosPorSedeUseCase.ts
│   │
│   ├── application/                       ← ORQUESTACIÓN
│   │   └── services/
│   │       ├── AuthApplicationService.ts  ← Orquesta LoginUseCase
│   │       └── UsuarioApplicationService.ts
│   │
│   └── infrastructure/                    ← TODO LO EXTERNO
│       │
│       ├── db/
│       │   ├── oracle.config.ts           ← Conexión TypeORM a Oracle
│       │   ├── entities/                  ← Entidades TypeORM (decoradores)
│       │   │   ├── UsuarioEntity.ts       ← @Entity('USUARIO') @Column...
│       │   │   ├── SedeEntity.ts          ← @Entity('SEDE')
│       │   │   └── RolEntity.ts           ← @Entity('ROL')
│       │   ├── repositories/              ← ADAPTADORES (implementan los puertos)
│       │   │   ├── OracleUsuarioRepository.ts
│       │   │   └── OracleSedeRepository.ts
│       │   └── migrations/
│       │       ├── 001_create_sede.sql
│       │       ├── 002_create_rol.sql
│       │       ├── 003_create_usuario.sql
│       │       └── 004_seed_sedes.sql     ← Las 23 sedes precargadas
│       │
│       ├── http/
│       │   ├── routes/
│       │   │   ├── auth.routes.ts         ← POST /api/auth/login
│       │   │   ├── usuario.routes.ts      ← GET/POST/PUT /api/usuarios
│       │   │   └── sede.routes.ts         ← GET /api/sedes
│       │   ├── controllers/
│       │   │   ├── auth.controller.ts     ← Solo maneja HTTP, llama al AppService
│       │   │   ├── usuario.controller.ts
│       │   │   └── sede.controller.ts
│       │   └── middlewares/               ← Importados desde shared/
│       │       └── index.ts               ← Re-exporta auth, sede, role middleware
│       │
│       └── config/
│           ├── jwt.config.ts              ← JWT_SECRET, expiración (8h)
│           └── server.config.ts           ← Puerto 3001, CORS
│
├── main.ts                                ← Punto de entrada
├── package.json
├── tsconfig.json
└── .env                                   ← ORACLE_URL, JWT_SECRET, PORT=3001
```

---

### 4.2 NNA-SERVICE (:3002)

Gestiona: NNA, Casos, Carpetas, Historial de estados, Traslados

```
nna-service/
├── src/
│   │
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── Nna.ts
│   │   │   │     - calcularEdad()
│   │   │   │     - esMayorDeEdad()          ← Causal de egreso automático
│   │   │   │     - tieneCasoActivo()
│   │   │   ├── Caso.ts
│   │   │   │     - avanzarFase()            ← Valida prerequisitos antes de avanzar
│   │   │   │     - puedeAgregarFolio()
│   │   │   │     - estaActivo()
│   │   │   │     - diasEnFaseActual()       ← Para alertas de plazo
│   │   │   ├── Carpeta.ts
│   │   │   └── TrasladoNna.ts
│   │   │         - esInterno(sedeOrigen, sedeDestino)  ← misma región
│   │   │         - esExterno(sedeOrigen, sedeDestino)  ← diferente región
│   │   │
│   │   ├── repositories/
│   │   │   ├── INnaRepository.ts
│   │   │   ├── ICasoRepository.ts
│   │   │   ├── ICarpetaRepository.ts
│   │   │   └── ITrasladoRepository.ts
│   │   │
│   │   └── use-cases/
│   │       ├── RegistrarNnaUseCase.ts       ← Crea NNA + abre Caso + genera F03
│   │       ├── AbrirCasoUseCase.ts
│   │       ├── BuscarNnaUseCase.ts          ← Búsqueda por DNI, nombre, código
│   │       ├── ActualizarNnaUseCase.ts      ← Actualiza ficha, domicilio, ubigeo
│   │       ├── AvanzarFaseCasoUseCase.ts    ← Fase I → II → III con validaciones
│   │       ├── SolicitarTrasladoInternoUseCase.ts
│   │       ├── SolicitarTrasladoExternoUseCase.ts
│   │       └── AceptarRechazarTrasladoUseCase.ts
│   │
│   ├── application/
│   │   └── services/
│   │       ├── NnaApplicationService.ts
│   │       ├── CasoApplicationService.ts
│   │       └── TrasladoApplicationService.ts
│   │
│   └── infrastructure/
│       ├── db/
│       │   ├── entities/
│       │   │   ├── NnaEntity.ts
│       │   │   ├── CasoEntity.ts
│       │   │   ├── CarpetaEntity.ts
│       │   │   ├── HistorialEstadoCasoEntity.ts
│       │   │   └── TrasladoNnaEntity.ts
│       │   ├── repositories/
│       │   │   ├── OracleNnaRepository.ts
│       │   │   ├── OracleCasoRepository.ts
│       │   │   └── OracleTrasladoRepository.ts
│       │   └── migrations/
│       │       ├── 001_create_carpeta.sql
│       │       ├── 002_create_nna.sql
│       │       ├── 003_create_caso.sql
│       │       ├── 004_create_historial_estado.sql
│       │       └── 005_create_traslado_nna.sql
│       │
│       └── http/
│           ├── routes/
│           │   ├── nna.routes.ts            ← GET/POST/PUT /api/nna
│           │   ├── caso.routes.ts           ← GET/POST/PUT /api/casos
│           │   └── traslado.routes.ts       ← POST/PUT /api/traslados
│           └── controllers/
│               ├── nna.controller.ts
│               ├── caso.controller.ts
│               └── traslado.controller.ts
│
├── main.ts
└── .env                                     ← PORT=3002
```

---

### 4.3 INTERVENCION-SERVICE (:3003)

Gestiona: Diario de Campo, PTI/PII, Diagnóstico Social (F04), Seguimiento Familiar

```
intervencion-service/
├── src/
│   │
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── DiarioCampo.ts
│   │   │   ├── PlanTrabajo.ts              ← PTI / PII
│   │   │   │     - calcularPorcentajeAvance()
│   │   │   │     - accionesCompletadas()
│   │   │   ├── AccionPTI.ts
│   │   │   ├── DiagnosticoSocial.ts
│   │   │   │     - tieneAlertaCritica()    ← Detecta violencia/trata/explotación
│   │   │   │     - requiereDerivacionUPE()
│   │   │   └── SeguimientoFamiliar.ts
│   │   │
│   │   ├── repositories/
│   │   │   ├── IDiarioCampoRepository.ts
│   │   │   ├── IPlanTrabajoRepository.ts
│   │   │   ├── IDiagnosticoRepository.ts
│   │   │   └── ISeguimientoRepository.ts
│   │   │
│   │   └── use-cases/
│   │       ├── RegistrarDiarioCampoUseCase.ts
│   │       ├── CrearPlanTrabajoUseCase.ts   ← Genera PII desde diagnóstico F04
│   │       ├── ActualizarAccionPTIUseCase.ts
│   │       ├── GuardarDiagnosticoSocialUseCase.ts ← F04
│   │       └── RegistrarSeguimientoFamiliarUseCase.ts ← F12
│   │
│   ├── application/
│   │   └── services/
│   │       ├── DiarioApplicationService.ts
│   │       ├── PtiApplicationService.ts
│   │       ├── DiagnosticoApplicationService.ts
│   │       └── SeguimientoApplicationService.ts
│   │
│   └── infrastructure/
│       ├── db/
│       │   ├── entities/
│       │   │   ├── DiarioCampoEntity.ts
│       │   │   ├── PlanTrabajoEntity.ts
│       │   │   ├── AccionPTIEntity.ts
│       │   │   ├── DiagnosticoSocialEntity.ts  ← campos JSON → CLOB Oracle
│       │   │   └── SeguimientoFamiliarEntity.ts
│       │   └── migrations/
│       │       ├── 001_create_diario_campo.sql
│       │       ├── 002_create_plan_trabajo.sql
│       │       ├── 003_create_accion_pti.sql
│       │       ├── 004_create_diagnostico_social.sql
│       │       └── 005_create_seguimiento_familiar.sql
│       │
│       └── http/
│           ├── routes/
│           │   ├── diario.routes.ts         ← /api/diario
│           │   ├── pti.routes.ts            ← /api/pti
│           │   ├── diagnostico.routes.ts    ← /api/diagnostico
│           │   └── seguimiento.routes.ts    ← /api/seguimiento
│           └── controllers/
│               ├── diario.controller.ts
│               ├── pti.controller.ts
│               ├── diagnostico.controller.ts
│               └── seguimiento.controller.ts
│
├── main.ts
└── .env                                     ← PORT=3003
```

---

### 4.4 DERIVACION-SERVICE (:3004)

Gestiona: Derivaciones internas (entre profesionales) y externas (DEMUNA, UPE, Fiscalía)

```
derivacion-service/
├── src/
│   │
│   ├── domain/
│   │   ├── entities/
│   │   │   └── Derivacion.ts
│   │   │         - esInterna()             ← A otro profesional de la misma sede
│   │   │         - esExterna()             ← A DEMUNA, UPE, Fiscalía, etc.
│   │   │         - estaVencida()           ← Sin respuesta > 72h = urgente
│   │   │
│   │   ├── repositories/
│   │   │   └── IDerivacionRepository.ts
│   │   │
│   │   └── use-cases/
│   │       ├── CrearDerivacionInternaUseCase.ts
│   │       ├── CrearDerivacionExternaUseCase.ts
│   │       ├── ResponderDerivacionUseCase.ts   ← ACEPTAR / RECHAZAR
│   │       └── ListarDerivacionesPendientesUseCase.ts
│   │
│   ├── application/
│   │   └── services/
│   │       └── DerivacionApplicationService.ts
│   │
│   └── infrastructure/
│       ├── db/
│       │   ├── entities/
│       │   │   └── DerivacionEntity.ts
│       │   └── migrations/
│       │       └── 001_create_derivacion.sql
│       │
│       └── http/
│           ├── routes/
│           │   └── derivacion.routes.ts    ← /api/derivaciones
│           └── controllers/
│               └── derivacion.controller.ts
│
├── main.ts
└── .env                                    ← PORT=3004
```

---

### 4.5 TALLERES-SERVICE (:3005)

Gestiona: Planificación (F07), Ejecución, Asistencia (F10/F11), Evaluación (F08)

```
talleres-service/
├── src/
│   │
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── Taller.ts
│   │   │   │     - estaEjecutado()
│   │   │   │     - puedeAgregarParticipante()
│   │   │   │     - calcularAsistencia()    ← % asistencia total
│   │   │   └── ParticipanteTaller.ts
│   │   │         - aprobado()              ← Basado en logros y asistencia
│   │   │
│   │   ├── repositories/
│   │   │   ├── ITallerRepository.ts
│   │   │   └── IParticipanteRepository.ts
│   │   │
│   │   └── use-cases/
│   │       ├── PlanificarTallerUseCase.ts      ← F07
│   │       ├── EjecutarTallerUseCase.ts
│   │       ├── RegistrarAsistenciaNnaUseCase.ts ← F10
│   │       ├── RegistrarAsistenciaFamiliaUseCase.ts ← F11
│   │       └── EvaluarParticipanteUseCase.ts   ← F08
│   │
│   ├── application/
│   │   └── services/
│   │       └── TalleresApplicationService.ts
│   │
│   └── infrastructure/
│       ├── db/
│       │   ├── entities/
│       │   │   ├── TallerEntity.ts
│       │   │   └── ParticipanteTallerEntity.ts
│       │   └── migrations/
│       │       ├── 001_create_taller.sql
│       │       └── 002_create_participante_taller.sql
│       │
│       └── http/
│           ├── routes/
│           │   └── talleres.routes.ts      ← /api/talleres
│           └── controllers/
│               └── talleres.controller.ts
│
├── main.ts
└── .env                                    ← PORT=3005
```

---

### 4.6 EXPEDIENTE-SERVICE (:3006)

Gestiona: Foliado digital, Generación y almacenamiento de PDFs, Informe de Cierre, Estadísticas

```
expediente-service/
├── src/
│   │
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── ExpedienteFolio.ts
│   │   │   │     - siguienteNumeroFolio()  ← Correlativo por caso
│   │   │   │     - verificarIntegridad()   ← Compara hash SHA-256
│   │   │   └── InformeCierre.ts
│   │   │
│   │   ├── repositories/
│   │   │   ├── IExpedienteRepository.ts
│   │   │   └── IInformeCierreRepository.ts
│   │   │
│   │   └── use-cases/
│   │       ├── AgregarFolioUseCase.ts      ← Registra doc + guarda PDF + asigna folio
│   │       ├── ObtenerExpedienteUseCase.ts ← Lista todos los folios de un caso
│   │       ├── GenerarPdfUseCase.ts        ← Genera PDF desde template HTML
│   │       ├── DescargarFolioUseCase.ts    ← Devuelve PDF por URL segura
│   │       ├── CrearInformeCierreUseCase.ts
│   │       └── ObtenerEstadisticasUseCase.ts
│   │
│   ├── application/
│   │   └── services/
│   │       ├── ExpedienteApplicationService.ts
│   │       ├── PdfApplicationService.ts
│   │       └── EstadisticasApplicationService.ts
│   │
│   └── infrastructure/
│       ├── db/
│       │   ├── entities/
│       │   │   ├── ExpedienteFolioEntity.ts
│       │   │   └── InformeCierreEntity.ts
│       │   └── migrations/
│       │       ├── 001_create_expediente_folio.sql
│       │       └── 002_create_informe_cierre.sql
│       │
│       ├── pdf/
│       │   ├── PdfGenerator.ts             ← Genera PDFs en el servidor (puppeteer/pdfkit)
│       │   ├── FileStorage.ts              ← Guarda/lee PDFs del file server
│       │   └── templates/                  ← Templates HTML de cada formato
│       │       ├── F03_inscripcion.html
│       │       ├── F04_diagnostico.html
│       │       ├── F07_taller_plan.html
│       │       ├── F08_taller_eval.html
│       │       ├── PII_plan_intervencion.html
│       │       └── INF_cierre.html
│       │
│       └── http/
│           ├── routes/
│           │   ├── expediente.routes.ts    ← /api/expediente
│           │   ├── cierre.routes.ts        ← /api/cierre
│           │   └── estadisticas.routes.ts  ← /api/estadisticas
│           └── controllers/
│               ├── expediente.controller.ts
│               ├── cierre.controller.ts
│               └── estadisticas.controller.ts
│
├── main.ts
└── .env                                    ← PORT=3006, FILE_STORAGE_PATH
```

---

## 5. FRONTEND — CLIENT (React refactorizado)

```
client/
├── src/
│   ├── main.tsx
│   ├── App.tsx                            ← Router principal
│   │
│   ├── core/                              ← Configuración central
│   │   ├── api/
│   │   │   ├── api.client.ts             ← Axios con interceptor JWT + sedeId
│   │   │   └── endpoints.ts              ← URLs de cada microservicio vía Gateway
│   │   ├── auth/
│   │   │   ├── auth.store.ts             ← Zustand: token, usuario, sedeId
│   │   │   └── PrivateRoute.tsx          ← Protección por rol
│   │   └── types/
│   │       └── index.ts                  ← Tipos compartidos con el backend
│   │
│   ├── features/                          ← Un folder por módulo funcional
│   │   │
│   │   ├── auth/
│   │   │   └── LoginPage.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   ├── DashboardPage.tsx         ← Cards según rol
│   │   │   ├── cards/
│   │   │   │   ├── CardRegistroNna.tsx
│   │   │   │   ├── CardExpediente.tsx
│   │   │   │   ├── CardGestionUsuarios.tsx
│   │   │   │   ├── CardDiagnostico.tsx
│   │   │   │   ├── CardPlanIntervención.tsx
│   │   │   │   ├── CardDiarioCampo.tsx
│   │   │   │   ├── CardSeguimientoFamiliar.tsx
│   │   │   │   ├── CardDerivaciones.tsx
│   │   │   │   ├── CardTalleres.tsx
│   │   │   │   ├── CardTraslados.tsx
│   │   │   │   ├── CardCierre.tsx
│   │   │   │   └── CardEstadisticas.tsx
│   │   │   └── hooks/
│   │   │       └── useDashboardCards.ts  ← Filtra cards según rol del JWT
│   │   │
│   │   ├── nna/                          ← Registro y gestión de NNA
│   │   │   ├── NnaListPage.tsx
│   │   │   ├── NnaCreatePage.tsx
│   │   │   ├── NnaFichaPage.tsx
│   │   │   ├── NnaCaseManagementPage.tsx
│   │   │   ├── ExpedientePage.tsx        ← Vista del expediente digital foliado
│   │   │   └── components/
│   │   │       ├── formats/              ← Los 13 formatos como componentes
│   │   │       │   ├── Formato03.tsx     ← Ficha Inscripción
│   │   │       │   ├── Formato04.tsx     ← Diagnóstico Social
│   │   │       │   ├── Formato05.tsx     ← Logros
│   │   │       │   ├── Formato06.tsx     ← Derivación
│   │   │       │   ├── Formato07.tsx     ← Plan Taller
│   │   │       │   ├── Formato08.tsx     ← Evaluación Taller
│   │   │       │   ├── Formato09.tsx     ← Compromisos
│   │   │       │   ├── Formato10.tsx     ← Asistencia NNA
│   │   │       │   ├── Formato11.tsx     ← Asistencia Familia
│   │   │       │   ├── Formato12.tsx     ← Seguimiento Familiar
│   │   │       │   ├── Formato13.tsx     ← Egreso
│   │   │       │   ├── FormularioPII.tsx ← Plan Intervención Individual
│   │   │       │   └── InformeCierre.tsx
│   │   │       └── traslados/
│   │   │           └── TrasladoModal.tsx ← Interno / Externo
│   │   │
│   │   ├── usuarios/                     ← Gestión de usuarios (ADMIN/COORD)
│   │   │   ├── UserListPage.tsx
│   │   │   ├── UserFormPage.tsx
│   │   │   └── UserProfilePage.tsx
│   │   │
│   │   ├── diario/
│   │   │   └── DiarioCampoPage.tsx
│   │   │
│   │   ├── pti/
│   │   │   └── PlanIntervencionPage.tsx
│   │   │
│   │   ├── diagnostico/
│   │   │   └── DiagnosticoSocialPage.tsx
│   │   │
│   │   ├── seguimiento/
│   │   │   └── SeguimientoFamiliarPage.tsx
│   │   │
│   │   ├── derivaciones/
│   │   │   └── DerivacionesPage.tsx
│   │   │
│   │   ├── talleres/
│   │   │   ├── TalleresPage.tsx
│   │   │   └── components/
│   │   │       └── WorkshopCalendar.tsx
│   │   │
│   │   ├── traslados/
│   │   │   └── TrasladosPage.tsx         ← Solo COORDINADOR
│   │   │
│   │   ├── cierre/
│   │   │   └── CierrePage.tsx
│   │   │
│   │   └── estadisticas/
│   │       └── EstadisticasPage.tsx      ← Solo ADMIN/COORDINADOR
│   │
│   └── components/                        ← Componentes UI reutilizables
│       ├── layout/
│       │   ├── MainLayout.tsx            ← Sidebar + Header con sede activa
│       │   └── SedeBadge.tsx             ← Muestra "LIM-01 Lima" en el header
│       └── ui/
│           ├── FormFields.tsx
│           ├── Modal.tsx
│           └── Badge.tsx                 ← Para estados de caso y fases
│
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 6. BASE DE DATOS ORACLE — ESQUEMA COMPLETO

### Tablas por microservicio

```
AUTH-SERVICE
├── SEDE               (23 registros precargados)
├── ROL                (6 roles)
└── USUARIO            (sede_id FK)

NNA-SERVICE
├── CARPETA            (sede_id FK)
├── NNA                (sin sede_id — entidad nacional)
├── CASO               (sede_id FK, nna_id FK)
├── HISTORIAL_ESTADO   (caso_id FK)
└── TRASLADO_NNA       (caso_id, sede_origen_id, sede_destino_id)

INTERVENCION-SERVICE
├── DIARIO_CAMPO       (caso_id FK, sede_id FK)
├── PLAN_TRABAJO       (caso_id FK)
├── ACCION_PTI         (plan_trabajo_id FK)
├── DIAGNOSTICO_SOCIAL (nna_id FK, sede_id FK)
└── SEGUIMIENTO_FAMI   (caso_id FK, sede_id FK)

DERIVACION-SERVICE
└── DERIVACION         (caso_id FK, sede_id FK, remitente_id, destinatario_id)

TALLERES-SERVICE
├── TALLER             (sede_id FK, educador_id FK)
└── PARTICIPANTE_TALLER(taller_id FK, nna_id FK)

EXPEDIENTE-SERVICE
├── EXPEDIENTE_FOLIO   (caso_id FK, sede_id FK) — 13 tipos de documento
└── INFORME_CIERRE     (caso_id FK, sede_id FK)
```

---

## 7. DOCKER-COMPOSE (Despliegue en OGTI)

```yaml
# docker-compose.yml
services:

  gateway:
    image: nginx:alpine
    ports: ["443:443", "80:80"]
    volumes: ["./gateway/nginx.conf:/etc/nginx/nginx.conf"]
    depends_on: [auth-service, nna-service, ...]

  auth-service:
    build: ./services/auth-service
    ports: ["3001:3001"]
    environment:
      - ORACLE_URL=${ORACLE_URL}
      - JWT_SECRET=${JWT_SECRET}

  nna-service:
    build: ./services/nna-service
    ports: ["3002:3002"]
    environment:
      - ORACLE_URL=${ORACLE_URL}
      - JWT_SECRET=${JWT_SECRET}

  intervencion-service:
    build: ./services/intervencion-service
    ports: ["3003:3003"]

  derivacion-service:
    build: ./services/derivacion-service
    ports: ["3004:3004"]

  talleres-service:
    build: ./services/talleres-service
    ports: ["3005:3005"]

  expediente-service:
    build: ./services/expediente-service
    ports: ["3006:3006"]
    volumes:
      - ./file-storage:/app/storage   ← PDFs del expediente digital

  client:
    build: ./client
    ports: ["80:80"]                  ← Servido por Nginx estático
```

---

## 8. FLUJO COMPLETO — UNA PETICIÓN DE EXTREMO A EXTREMO

```
Trabajadora Social de Arequipa registra Diagnóstico Social (F04)
          │
          ▼
React → POST https://sec.inabif.gob.pe/api/diagnostico
          │
          ▼
Nginx (Gateway)
  → Valida que el path sea /api/diagnostico/*
  → Reenvía a intervencion-service:3003
          │
          ▼
intervencion-service
  → auth.middleware:  verifica JWT → { userId:42, rol:'TRABAJADOR_SOCIAL', sedeId:6 }
  → sede.middleware:  inyecta filtro { sedeId:6, responsableId:42 }
  → diagnostico.controller: extrae body, llama al AppService
  → DiagnosticoApplicationService
  → GuardarDiagnosticoSocialUseCase
      → valida que el caso pertenece a sedeId:6
      → guarda en Oracle (DIAGNOSTICO_SOCIAL con sede_id=6)
      → retorna el diagnóstico guardado
          │
          ▼
  → diagnostico.controller: responde 201 Created
          │
          ▼
expediente-service (llamada interna)
  → AgregarFolioUseCase:
      → Genera PDF del F04 desde template HTML
      → Guarda PDF en /storage/AQP-01/CAS-2026-0045/folio-02.pdf
      → Calcula hash SHA-256
      → Registra en EXPEDIENTE_FOLIO (folio 2, tipo DIAGNOSTICO_SOCIAL)
          │
          ▼
React recibe { success: true, folioNumero: 2 }
→ El expediente digital muestra el nuevo folio
```

---

## 9. RESUMEN — CONTEO DE ARCHIVOS A CREAR

| Componente | Archivos nuevos |
|-----------|----------------|
| shared/ | ~15 archivos |
| auth-service | ~25 archivos |
| nna-service | ~30 archivos |
| intervencion-service | ~30 archivos |
| derivacion-service | ~15 archivos |
| talleres-service | ~20 archivos |
| expediente-service | ~25 archivos |
| gateway/ | 2 archivos |
| client/ (refactor) | ~50 archivos modificados/nuevos |
| Migraciones SQL Oracle | ~20 scripts |
| **TOTAL ESTIMADO** | **~230 archivos** |

---

## 10. ORDEN DE IMPLEMENTACIÓN RECOMENDADO

```
Sprint 1 (Semana 1-2)
├── shared/ — tipos, middlewares, utilidades
├── auth-service — completo con las 23 sedes
└── Login funcional con sedeId en JWT ✓

Sprint 2 (Semana 3-4)
├── nna-service — NNA, casos, fases, traslados
└── Dashboard con cards por rol ✓

Sprint 3 (Semana 5-6)
├── intervencion-service — Diario, PTI/PII, F04, Seguimiento
└── Expediente con folios de Fase I y II ✓

Sprint 4 (Semana 7)
├── derivacion-service
└── talleres-service ✓

Sprint 5 (Semana 8-9)
├── expediente-service — Generación PDF + foliado completo
└── Cierre de caso ✓

Sprint 6 (Semana 10)
├── Gateway Nginx
├── Docker-compose
└── Deploy en OGTI ✓
```

---

*Estructura lista para comenzar implementación — Fase 1: shared/ + auth-service*
