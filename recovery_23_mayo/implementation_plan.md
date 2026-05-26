# Plan de Implementación: Páginas Dedicadas para el Monitor Central (Opción 1)

Este plan detalla el desacoplamiento de la pantalla `/dashboard-nacional` en tres interfaces independientes y altamente especializadas: **Dashboard Estadístico Nacional**, **Bandeja de Auditoría de Calidad** y **Bandeja de Traslados Nacionales**. Esto optimizará de gran manera la experiencia de usuario (UX) para los roles `MONITOR` y `ADMIN_NACIONAL`.

---

## Cambios Propuestos

### 1. Creación de Nuevas Páginas Dedicadas (Frontend React)

#### [NEW] [MonitorAuditoriaPage.tsx](file:///D:/Usuarios/ccampos/Documents/Python%20Scripts/Educadores_calle/educadores-calle-system/client/src/features/dashboard/MonitorAuditoriaPage.tsx)
Creará una página exclusiva para el control de calidad de expedientes del NNA.
* **Componentes visuales:** Buscador de expedientes por nombre/carpeta familiar, tabla interactiva de auditoría (F03, F04, SIS, DNI), semáforo de calidad (`ÓPTIMO`, `ADVERTENCIA`, `CRÍTICO`) y acceso directo al expediente digital.
* **Consumo de API:** Cargará y filtrará los beneficiarios nacionales mediante llamadas al microservicio correspondiente.

#### [NEW] [MonitorTrasladosPage.tsx](file:///D:/Usuarios/ccampos/Documents/Python%20Scripts/Educadores_calle/educadores-calle-system/client/src/features/dashboard/MonitorTrasladosPage.tsx)
Creará una bandeja de entrada exclusiva para la gestión de traslados inter-regionales.
* **Componentes visuales:** Tarjetas de traslados en cola con nombre del NNA, edad, origen/destino de sedes, justificación y botones de acción rápida (**Aprobar** con generación de oficio lógico, o **Rechazar** con justificación).
* **Consumo de API:** Integración con los endpoints de aprobación/rechazo de traslados.

---

### 2. Refactorización de Componentes Existentes

#### [MODIFY] [AdminNacionalDashboard.tsx](file:///D:/Usuarios/ccampos/Documents/Python%20Scripts/Educadores_calle/educadores-calle-system/client/src/features/dashboard/AdminNacionalDashboard.tsx)
* **Objetivo:** Remover el panel inferior de "Bandejas del Monitor Central" que contenía las pestañas de Auditoría y Traslados.
* **Resultado:** La pantalla será un panel analítico nacional puro (KPIs consolidados, semáforo de sedes, distribución por fases y regiones, alertas críticas a nivel nacional y rankings de sedes operativas).

#### [MODIFY] [MainMenu.tsx](file:///D:/Usuarios/ccampos/Documents/Python%20Scripts/Educadores_calle/educadores-calle-system/client/src/features/dashboard/MainMenu.tsx)
* **Objetivo:** Actualizar el listado de módulos/cards en el menú principal para los roles de `MONITOR` y `ADMIN_NACIONAL`.
* **Configuración de Módulos:**
  1. **Dashboard Nacional:** Redirige a `/dashboard-nacional` (solo métricas).
  2. **Auditoría de Calidad (NUEVA CARD):** Redirige a `/monitor/auditoria` (exclusivo para monitor e informador nacional).
  3. **Bandeja de Traslados:** Redirige a `/monitor/traslados` (exclusivo para monitor e informador nacional).
  4. **Reportes y Descargas:** Redirige a `/reportes` (sin cambios).
  5. **Gestión de Casos:** Redirige a `/nna` (vista de lectura para monitor).

#### [MODIFY] [MainLayout.tsx](file:///D:/Usuarios/ccampos/Documents/Python%20Scripts/Educadores_calle/educadores-calle-system/client/src/components/layout/MainLayout.tsx)
* **Objetivo:** Modificar el menú de navegación lateral (Sidebar) para renderizar dinámicamente opciones según el rol.
* **Para MONITOR y ADMIN_NACIONAL:** Mostrar enlaces directos a "Dashboard Nacional", "Auditoría de Calidad" y "Bandeja de Traslados" de forma que no tengan que regresar al menú principal para alternar entre sus tareas diarias.

#### [MODIFY] [App.tsx](file:///D:/Usuarios/ccampos/Documents/Python%20Scripts/Educadores_calle/educadores-calle-system/client/src/App.tsx)
* **Objetivo:** Registrar las dos nuevas rutas protegidas:
  * `/monitor/auditoria` -> `MonitorAuditoriaPage`
  * `/monitor/traslados` -> `MonitorTrasladosPage`

---

## Plan de Verificación

### Pruebas Manuales
1. **Acceso como Monitor (`monitor@educadores.gob.pe`):**
   * Verificar que en el menú principal ahora se muestren por separado: "Dashboard Nacional", "Auditoría de Calidad", "Bandeja de Traslados" y "Reportes".
   * Dar clic en cada tarjeta y comprobar que dirigen a interfaces independientes y limpias.
2. **Navegación Lateral (Sidebar):**
   * Comprobar que en cualquier página interna, la barra lateral muestra los accesos a "Dashboard Nacional", "Auditoría de Calidad" y "Bandeja de Traslados" para el monitor.
3. **Flujos Operativos:**
   * **Auditoría:** Filtrar NNA y hacer clic en "Auditar" para verificar la transición a su expediente digital.
   * **Traslados:** Aprobar/rechazar traslados nacionales y verificar que los estados se actualicen en caliente de forma aislada en su propia página.
