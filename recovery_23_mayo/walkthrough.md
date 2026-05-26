# Walkthrough de Implementación: Páginas Dedicadas para el Monitor Central

Hemos culminado con éxito el rediseño y separación modular de las interfaces del **Monitor Central Nacional**, logrando una experiencia de usuario (UX) súper premium y ordenada que evita la sobrecarga cognitiva y la redundancia en la navegación.

---

## 🛠️ Resumen de Cambios

### 1. Páginas Nuevas Creadas (Arquitectura Desacoplada)

* **[MonitorAuditoriaPage.tsx](file:///D:/Usuarios/ccampos/Documents/Python%20Scripts/Educadores_calle/educadores-calle-system/client/src/features/dashboard/MonitorAuditoriaPage.tsx):**
  * **Propósito:** Control de calidad de expedientes y checklist documental.
  * **Características:**
    * Indicadores clave (KPIs) en la parte superior: *Expedientes Críticos*, *Con Advertencias*, *Óptimos*.
    * Buscador dinámico de expedientes en tiempo real por nombre, carpeta o sede.
    * Matriz de control visual de documentos obligatorios (**F03, F04, SIS, DNI**) con colores curados y semaforización de calidad (`ÓPTIMO`, `ADVERTENCIA`, `CRÍTICO`).
    * Enlace al expediente digital individual para cada NNA.
* **[MonitorTrasladosPage.tsx](file:///D:/Usuarios/ccampos/Documents/Python%20Scripts/Educadores_calle/educadores-calle-system/client/src/features/dashboard/MonitorTrasladosPage.tsx):**
  * **Propósito:** Bandeja nacional de aprobación de traslados inter-departamentales.
  * **Características:**
    * KPIs de traslados pendientes y aprobados en el mes.
    * Tarjetas de solicitudes de traslados que visualizan claramente:
      * Información del NNA (nombre, edad).
      * Sentido del traslado: **Sede de Origen ➔ Sede de Destino**.
      * Profesional solicitante y fecha de ingreso.
      * Cuadro de texto destacado con el **Motivo / Justificación Técnica** del traslado.
    * Acciones dinámicas en caliente: **Aprobar** (simula emitir Oficio con correlativo) y **Rechazar** (solicita detallar motivo técnico).

---

### 2. Refactorizaciones e Integraciones

* **[AdminNacionalDashboard.tsx](file:///D:/Usuarios/ccampos/Documents/Python%20Scripts/Educadores_calle/educadores-calle-system/client/src/features/dashboard/AdminNacionalDashboard.tsx):**
  * Se removieron por completo las bandejas inferiores del monitor, transformándolo en un panel analítico consolidador nacional de alto rendimiento (KPIs nacionales, semáforo de sedes, ranking de NNA, distribución por fases y alertas).
* **[MainMenu.tsx](file:///D:/Usuarios/ccampos/Documents/Python%20Scripts/Educadores_calle/educadores-calle-system/client/src/features/dashboard/MainMenu.tsx):**
  * Se implementó un **bypass de landing (redirección directa) para el rol MONITOR**. Al iniciar sesión o entrar a la raíz (`/`), el sistema los transfiere de forma transparente e inmediata al **Dashboard Nacional** (`/dashboard-nacional`), evitando tener que interactuar con un menú de tarjetas intermedio redundante.
* **[MainLayout.tsx](file:///D:/Usuarios/ccampos/Documents/Python%20Scripts/Educadores_calle/educadores-calle-system/client/src/components/layout/MainLayout.tsx):**
  * Se modificó el sidebar (menú lateral) para que genere sus items de forma **dinámica según el rol del usuario**. Ahora los monitores y administradores nacionales tienen accesos directos a "Dashboard Nacional", "Auditoría de Calidad" y "Bandeja de Traslados" integrados perfectamente en el menú lateral.
* **[App.tsx](file:///D:/Usuarios/ccampos/Documents/Python%20Scripts/Educadores_calle/educadores-calle-system/client/src/App.tsx):**
  * Registro e importación de las nuevas rutas protegidas `/monitor/auditoria`, `/monitor/traslados` y `/coordinador/derivaciones`.

---

## 👥 Refactorización para el Coordinador y Admin de Sede

Aplicando los mismos principios exitosos del Monitor, hemos desacoplado la vista de Sede para los roles `COORDINADOR` y `ADMIN_SEDE`:

* **Nueva Página Especializada (`CoordinadorDerivacionesPage.tsx`):**
  * **Propósito:** Bandeja local de sede para autorizar derivaciones de educadores a especialistas internos (Psicología, Legal) o externos (DEMUNA, UPE).
  * **Características:** KPIs de solicitudes de la sede, tabla interactiva de revisión y acciones directas de Aprobar y Rechazar.
* **Nueva Página Especializada de Control Metodológico (`CoordinadorCasosPage.tsx`):**
  * **Propósito:** Tablero interactivo de control para reasignación de educadores, plazos de fases metodológicas (semáforo de alertas), y aprobación territorial.
  * **Características:**
    * **Asignación Inteligente y Ratios de Sede:** Permite reasignar educadores en caliente con validación estricta de carga laboral máxima (30 NNA para Vida en Calle / 60 NNA para Trabajo Infantil).
    * **Semáforo de Plazos Metodológicos:** Supervisa tiempos del protocolo (Fase 1: 90 días). Si hay desfases, bloquea el caso y emite alertas críticas. Permite registrar Resoluciones Jefaturales/Informes Técnicos de Sede para autorizar una **ampliación excepcional de 30 días**.
    * **Aprobación de Zonas de Intervención (F01):** El coordinador evalúa y aprueba/rechaza formalmente cuadrantes de abordaje callejero propuestos por su equipo de educadores.
* **Bypass de Landing en Menú Principal (`MainMenu.tsx`):**
  * Al iniciar sesión con roles de Sede (`COORDINADOR` y `ADMIN_SEDE`), el sistema los redirige de forma directa y transparente al **Dashboard de Sede** (`/dashboard`), ahorrando clics y pantallas innecesarias.
* **Sidebar Dinámico Lateral (`MainLayout.tsx`):**
  * El sidebar ahora incluye automáticamente "Bandeja Derivaciones" (`/coordinador/derivaciones`) y "Casos NNA" enlazado al Tablero de Control Metodológico (`/coordinador/casos`) para facilitar la navegación ágil entre el dashboard estadístico y la bandeja de aprobaciones de la sede. Asimismo, se removió por completo la opción "Talleres" para los roles de Coordinador y Admin de Sede, ya que no ejecutan talleres grupalmente (responsabilidad del Educador).

---

## 🌐 Potenciación del Monitor Central (DGNNA - Nivel Nacional y Sectorización)

Para consolidar el rol del Monitor como un sectorista de la sede central con visibilidad "desde arriba", se implementaron las siguientes mejoras en la arquitectura:

* **Corrección de Reportes (Backend taller_router.py y Frontend)**:
  * **Solución del Bloqueo**: Se corrigió la lógica restrictiva del listado de talleres en el microservicio en Python. Ahora, si el usuario tiene rol `MONITOR`, `ADMIN_NACIONAL` o `ESTADISTICO`, el servicio devuelve de manera consolidada **todos los talleres a nivel nacional** en vez de buscar registros bajo su propia cuenta (lo cual causaba vacíos de datos y fallos en reportes).
  * **Descargas Segmentadas**: El Monitor ya puede cargar la bandeja de reportes de manera exitosa y aplicar descargas de bases de datos de NNA, talleres e historial unificados a nivel nacional o segmentados por una sede regional particular.
* **Filtros Dinámicos por Sede en Casos NNA (`NnaListPage.tsx`)**:
  * **Selector superior**: Se implementó una lista desplegable de sedes de forma interactiva en la barra de búsqueda para que el Monitor pueda aislar los casos de una sede específica o verlos consolidados.
  * **Badge Identificador**: Cada fila de beneficiario ahora visualiza un badge premium (`Sede X`) al lado del nombre completo, facilitando al supervisor la atribución regional a simple vista.
* **Auditoría Sectorizada por Región (`MonitorAuditoriaPage.tsx`)**:
  * Se agregó un selector de sedes en la parte superior para segmentar el control y checklist de consistencia de expedientes por sede regional de forma aislada.
* **Bandeja de Traslados con Segmentación Geográfica (`MonitorTrasladosPage.tsx`)**:
  * Se introdujeron selectores independientes para **Sede de Origen** y **Sede de Destino**, permitiendo filtrar y dictaminar solicitudes inter-regionales bajo criterios de desplazamiento ordenados.

---

## 🛢️ Integración Activa de Base de Datos (Oracle Backend)

Hemos desacoplado la capa de presentación de datos ficticios y enlazado directamente las interfaces a llamadas REST dinámicas conectadas al backend en Python y la base de datos Oracle:

* **Auditoría Dinámica de Expedientes (`MonitorAuditoriaPage.tsx`)**:
  * Realiza una llamada síncrona a `/api/nna` para cargar en caliente el padrón de beneficiarios.
  * Computa dinámicamente el checklist documental comprobando la existencia física de `codigoFicha03`, el avance de fases metodológicas (`fase` diferente de contacto inicial) para el Formato 04, y la presencia del DNI (`numeroDoc`) y SIS (`afiliadoSIS`) reales en el expediente de la base de datos.
* **Aprobaciones de Traslado Integradas (`MonitorTrasladosPage.tsx`)**:
  * Realiza una consulta `GET` a `/api/traslados/pendientes` que ejecuta un `JOIN` dinámico de la tabla `NNA_TRASLADO` con la tabla `NNA` en la base de datos Oracle para retornar el nombre completo y la edad del beneficiario.
  * Las acciones de **Aprobar** y **Rechazar** realizan llamadas `PATCH` directas al endpoint `/api/traslados/{id}/responder` actualizando en tiempo real el registro y emitiendo el Oficio correspondiente en la base de datos.
* **Tablero Metodológico del Coordinador (`CoordinadorCasosPage.tsx`)**:
  * Obtiene la carga laboral y casos asignados de la sede llamando a `/api/casos`.
  * Llama a `getUsers()` del servicio de autenticación y filtra a los profesionales con rol `EDUCADOR` para poblar en caliente el selector de reasignaciones.
  * La acción de **Reasignación** realiza un patch a `/api/casos/{caso_id}/reasignar`, actualizando al profesional a cargo en la tabla `NNA_CASO` y guardando la bitácora histórica en `NNA_HISTORIAL_ESTADO`.

---

## 🔬 Verificación de Calidad

* **Eliminación de Redundancia:** Las tarjetas de navegación redundantes en el menú principal han sido eludidas completamente mediante redirecciones nativas de alta eficiencia.
* **Flujos Metodológicos Verificados:** Se comprobó de extremo a extremo el flujo de reasignación con límites de carga de trabajo, la autorización de ampliaciones de plazo con registro de sustento formal, y la aprobación rápida de zonas propuestas (F01).
* **Consistencia Nacional Asegurada:** Se reparó la llamada a la API en el backend para reportes de talleres nacionales, eliminando las restricciones de listado para perfiles centralizados y dotándolos de selectores de sectorización por sede a nivel transversal.
* **Integración Activa de BD Confirmada**: Se eliminaron los mocks duros de datos reactivos por consultas directas a los endpoints correspondientes de Python y Oracle SQL, garantizando el flujo de extremo a extremo del sistema.
* **Bypass de Menú e Interfaz Directa para Educadores y Especialistas**: Configurado el bypass inmediato al iniciar sesión para `EDUCADOR`, `PSICOLOGO`, `TRABAJADOR_SOCIAL` y `ABOGADO` hacia `/dashboard` (Mi Tablero), removiendo a su vez la opción "Menú Principal" del sidebar footer para evitar comportamientos cíclicos.
* **Cohesión Estética:** Se mantuvieron los mismos estándares visuales premium (colores HSL curados, cards limpias de glassmorphism y transiciones suaves) alineados con la estética gubernamental del SEC.
