# Manual Técnico y Funcional: Sistema de Gestión para el Servicio de Educadores de Calle
**Referencia Normativa:** RDE N° 069-2021-INABIF
**Versión del Sistema:** 1.0.0

Este documento detalla la arquitectura de procesos, variables, interoperabilidad y flujos de información implementados en el sistema, alineados estrictamente a la Directiva del Servicio de Educadores de Calle.

---

## 1. Macroproceso del Servicio

El sistema informatiza las tres etapas fundamentales de la intervención en calle, transformando los formatos físicos (Anexos) en flujos digitales.

### Fases de Intervención:

1.  **FASE I: Identificación y Contacto (Calle)**
    *   *Objetivo:* Localizar zonas de concentración y establecer el primer vínculo.
    *   *Instrumento Digital:* **Módulo de Mapeo y Conteo** (basado en Formato 1).
    *   *Salida:* Reporte de "Puntos Focalizados" y estimación de población.

2.  **FASE II: Vinculación y Atención (Empadronamiento)**
    *   *Objetivo:* Ingreso formal al servicio y diagnóstico situacional.
    *   *Instrumento Digital:* **Ficha de Inscripción Única** (basado en Formato 3).
    *   *Validaciones:* Cruce con RENIEC (manual/automático) para verificar identidad.
    *   *Salida:* Expediente Digital del NNA abierto con estado "En Evaluación".

3.  **FASE III: Desarrollo y Mantenimiento**
    *   *Objetivo:* Ejecución del Plan de Trabajo Individual (PTI) para la restitución de derechos.
    *   *Instrumentos Digitales:*
        *   Registro de Atenciones (Diario de Campo Digital).
        *   Ficha de Seguimiento Escolar y de Salud.
        *   Módulo de Derivaciones (Formato de Referencia).

4.  **FASE IV: Egreso / Cierre**
    *   *Criterios:* Cumplimiento de Edad (18 años), Reinserción Familiar exitosa, o Derivación a CAR (Protección Especial).

---

## 2. Definición de Perfiles y Actores

### A. Perfiles de Usuario del Sistema

| Perfil | Rol en el Sistema | Alcance de Datos |
| :--- | :--- | :--- |
| **EDUCADOR DE CALLE** | Operador de Campo | **Escritura/Lectura:** Solo de sus casos asignados y zonas. Registra fichas, visitas y novedades diaria. |
| **COORDINADOR** | Supervisor Zonal | **Lectura Total / Escritura Parcial:** Visualiza todos los casos de su zona. Aprueba derivaciones y cierres de casos. Valida calidad de fichas. |
| **EQUIPO TÉCNICO** | Psicólogo / T.Social | **Especializado:** Registra informes de evaluación especializada y seguimientos específicos de su área. |
| **ADMINISTRADOR** | Gestión TI | **Configuración:** ABM de usuarios, catálogos, y auditoría del sistema. |

### B. Perfiles del Beneficiario (NNA)
El sistema clasifica automáticamente al NNA según la "Actividad en Calle" registrada:

1.  **Trabajo Infantil:** NNA que realiza actividades económicas (venta ambulatoria, limpieza de autos, etc.).
2.  **Mendicidad:** NNA que solicita dádivas en vía pública, acompañado o solo.
3.  **Vida en Calle:** NNA que pernocta en la calle (sin vínculo familiar o vínculo debilitado). Riesgo Alto.

---

## 3. Variables e Indicadores Clave

El sistema estructura la data para medir los siguientes indicadores de desempeño:

### A. Variables de Identificación
*   **Documentación:** DNI, Cédula (Extranjeros), Partida de Nacimiento, Sin Documento (NN).
*   **Datos Biométricos:** Fotografía actual (obligatoria para NNA sin DNI para facilitar búsqueda).

### B. Variables de Restitución de Derechos (Semáforos)
El Dashboard muestra alertas basadas en:

*   **🔴 Salud:** ¿Tiene SIS/Seguro Activo? ¿Tiene vacunas completas? ¿Discapacidad certificada?
*   **🔴 Educación:** ¿Está matriculado? ¿Asiste regularmente? ¿Nivel acorde a edad (Rezago escolar)?
*   **🔴 Identidad:** ¿Cuenta con DNI físico?

### C. Variables de Situación de Calle
*   **Horarios:** Diurno / Nocturno / Mixto.
*   **Intensidad:** Horas por día / Días por semana.
*   **Compañía:** Solo, Pares, Adultos (Posible Trata/Explotación).

---

## 4. Estructura de Formularios e Instrumentos

### Ficha de Inscripción (Formato 3) - *Implementado*
Es el núcleo de la base de datos.
*   **Sección I:** Datos Personales (Mapeado a tabla `Nna`).
*   **Sección II:** Vivienda y Familia Contextual (Mapeado a campos `domicilio`, `viveCon`).
*   **Sección III:** Situación Educativa y Salud.
*   **Sección IV:** Perfil de Calle (Actividad, Lugar, Horario - Mapeado a tabla `Caso`).

### Plan de Trabajo Individual (PTI) - *Pendiente*
Formulario dinámico donde se establecen metas:
*   *Meta:* Obtención de DNI -> *Plazo:* 30 días -> *Responsable:* Educador.

### Ficha de Derivación e Interoperabilidad
Módulo para registrar la articulación con otros entes:

1.  **Interna (INABIF):** Derivación a CAR (Centros de Acogida Residencial) o CEDIF.
2.  **Externa (Protección):**
    *   **UPE (Unidad de Protección Especial):** Para casos de desprotección familiar (Abandono/Riesgo severo).
    *   **DEMUNA:** Riesgo leve/moderado.
    *   **Fiscalía de Familia:** Casos penales o de riesgo inminente.
3.  **Servicios Complementarios:**
    *   **MINSA:** Atención médica física/mental.
    *   **MINEDU:** Gestión de vacantes escolares.

### Formato de Compromiso (Formato 9)
Documento legal que firma el adulto responsable o el NNA (adolescente) al ingresar al programa. El sistema permite subir este documento escaneado (PDF/JPG) al Expediente Digital.

---

## 5. Flujo de Derivaciones (Lógica del Sistema)

1.  **Detección de Riesgo:** El Educador marca en la ficha un indicador de riesgo alto (ej: "Pernocta en calle" o "Presunta Explotación").
2.  **Alerta Automática:** El sistema genera una notificación al Coordinador.
3.  **Generación de Ficha de Derivación:** Se precargan los datos del NNA.
4.  **Envío Digital:**
    *   Se genera un PDF oficial de "Oficio de Derivación".
    *   Se registra la entidad receptora (UPE, Comisaría).
5.  **Seguimiento:** El caso cambia de estado a "DERIVADO - EN SEGUIMIENTO" hasta recibir respuesta oficial.

---

## 6. Diccionario de Datos (Resumen Técnico)

*   **Tabla `Nna`:** Maestro de beneficiarios únicos. Clave única: `numeroDoc` (o ID interno generado si no tiene doc).
*   **Tabla `Caso`:** Instancia de intervención. Un NNA puede tener múltiples casos históricos (reingresos).
*   **Tabla `HistorialDerivacion`:** Trazabilidad de cada intento de articulación institucional.
*   **Tabla `ExpedienteFolio`:** Repositorio documental (Blob storage o links a archivos locales).

---
## 7. Matriz de Responsabilidades y Trazabilidad (Flujo de Trabajo)

Para asegurar la calidad de la intervención, el sistema asigna roles específicos a cada instrumento según la Fase del Protocolo:

### A. Distribución de Roles por Fase

| FASE | INSTRUMENTO / ACCIÓN | RESPONSABLE (Ejecuta) | VALIDADOR (Supervisa/Aprueba) |
| :--- | :--- | :--- | :--- |
| **1. IDENTIFICACIÓN** | **Mapeo de Puntos:** Identificación de zonas de riesgo. | **Educador de Calle** | Coordinador Zonal |
| | **Ficha de Inscripción (F3):** Registro inicial del NNA. | **Educador de Calle** | Coordinador Zonal |
| **2. DESARROLLO** | **Evaluación Social / Psicológica:** Diagnóstico profundo. | **Trabajador Social / Psicólogo** | Coordinador Zonal |
| | **Plan de Trabajo (PTI):** Definición de metas (DNI, Escuela, Salud). | **Educador** (Articula con Técnico) | **Coordinador** (Debe aprobar el PTI) |
| | **Cuaderno de Campo:** Registro diario de visitas y atenciones. | **Educador de Calle** | Coordinador (Monitoreo aleatorio) |
| | **Derivaciones:** Gestión con DEMUNA/Salud/Escuelas. | **Educador** o **T. Social** | Coordinador |
| **3. EGRESO** | **Informe de Egreso:** Propuesta de cierre de caso. | **Educador de Calle** | **Coordinador** (Cierra el caso definitivamente) |

### B. Sistema de Trazabilidad (Auditoría)

El sistema garantiza la trazabilidad mediante:

1.  **Huella Digital de Registro:**
    *   Cada Ficha o Informe guarda automáticamente: `{ CreadoPor: ID_Usuario, Fecha: Timestamp, IP: Origen }`.
    *   Si se edita un dato sensible, se guarda una copia en el historial ("Versioando").

2.  **Estados del Expediente (Semáforo de Flujo):**
    *   `BORRADOR`: Cuando el Educador está llenando la ficha. Solo él la ve.
    *   `EN_REVISION`: Cuando el Educador la envía. El Coordinador recibe alerta.
    *   `APROBADO`: El Coordinador valida. El caso pasa oficialmente a "Activo".
    *   `OBSERVADO`: Si falta información (ej: falta foto o DNI incorrecto), el Coordinador devuelve la ficha al Educador con comentarios.

3.  **Permisos de Visualización:**
    *   El **Educador** solo ve sus casos.
    *   El **Equipo Técnico** ve los casos donde ha sido asignado para intervenir.
    *   El **Coordinador** ve todos los casos de su zona.

