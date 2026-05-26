# Lista de Tareas: Tablero de Control Metodológico y Asignaciones (Coordinador)

- `[x]` Crear la página del Tablero de Control Metodológico y Asignaciones (`CoordinadorCasosPage.tsx`)
- `[x]` Refactorizar el sidebar lateral (`MainLayout.tsx`) para enlazar "Casos NNA" a `/coordinador/casos` para Coordinador y Admin Sede
- `[x]` Registrar la nueva ruta `/coordinador/casos` en `App.tsx`
- `[x]` Verificar de extremo a extremo el funcionamiento de las reasignaciones y alertas metodológicas

# Lista de Tareas: Vista Nacional y Sectorización para el Monitor Central (DGNNA)

- `[x]` Corregir y potenciar endpoint backend Python de listado de talleres (`taller_router.py`) para soportar `MONITOR` y roles nacionales, resolviendo el bloqueo de ingreso a reportes.
- `[x]` Implementar el filtro dinámico de sedes y el badge visual identificador de Sede por fila en la gestión de casos (`NnaListPage.tsx`).
- `[x]` Agregar segmentación regional de expedientes por Sede en la bandeja de Auditoría de Calidad (`MonitorAuditoriaPage.tsx`).
- `[x]` Integrar filtrado por Sede de Origen y Sede de Destino para solicitudes de traslados inter-departamentales (`MonitorTrasladosPage.tsx`).

# Lista de Tareas: Integración Activa de Base de Datos (Oracle Backend)

- `[x]` Enlazar bandeja de traslados nacionales (`MonitorTrasladosPage.tsx`) con endpoints reales en backend Python y Base de Datos Oracle.
- `[x]` Enlazar panel de auditoría de consistencia de expedientes (`MonitorAuditoriaPage.tsx`) para computar dinámicamente el checklist (F03, F04, SIS, DNI) con datos de NNA reales.
- `[x]` Enlazar tablero metodológico del coordinador (`CoordinadorCasosPage.tsx`) para cargar casos reales de la sede, listar educadores reales activos del sistema, y realizar reasignaciones en caliente contra la DB Oracle.

# Lista de Tareas: Bypass del Menú Principal para el Educador y Equipo Técnico (Vida en Calle / Trabajo Infantil)

- `[x]` Configurar la redirección automática (bypass) en `MainMenu.tsx` para redireccionar de inmediato a los roles `EDUCADOR`, `PSICOLOGO`, `TRABAJADOR_SOCIAL` y `ABOGADO` a `/dashboard` (Mi Tablero).
- `[x]` Ocultar la opción "Menú Principal" del sidebar footer (`MainLayout.tsx`) para los roles con bypass directo, mostrándola exclusivamente para roles administradores y estadísticos nacionales que la requieren.
