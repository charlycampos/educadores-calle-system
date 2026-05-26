Especificación de Requerimientos: Sistema Web SEC (Servicio de Educadores de Calle)
Este documento detalla la estructura lógica, los actores, los flujos de estado y las reglas de negocio extraídas del Protocolo Operativo del INABIF para su digitalización en una plataforma web.
1. Roles y Permisos (Control de Acceso)
El sistema debe manejar un esquema de roles (RBAC) con los siguientes actores principales:
Coordinador/a: Rol de supervisión y aprobación. Revisa y valida propuestas de zonas
, aprueba informes de identificación
, asigna casos a educadores
, suscribe convenios institucionales
, y aprueba informes de egreso
.
Educador/a de Calle: Rol operativo principal. Realiza el conteo en calle
, llena los formatos de diagnóstico y seguimiento
, ejecuta talleres
 y registra logros
.
Personal de Instituciones Externas (Lectura/Interoperabilidad): Actores como DEMUNA, UPE, Fiscalía, Reniec, SIS
. (Ideal para un módulo de consulta externa o envío de alertas mediante API).
2. Modelado de Entidades Principales (Base de Datos)
A. Entidad NNA (Niña, Niño o Adolescente)
Perfiles (Condición): Trabajo en calle, Mendicidad, Vida en calle (con vínculo familiar), Vida en calle (sin vínculo familiar)
.
Datos Clave: Nombres, DNI/Documento, perfil, ubicación o zona de permanencia, datos de salud y educación
.
Estado en el sistema: Identificado, Abordado, En Intervención (Fase 1, 2 o 3), Derivado, Egresado.
B. Entidad Zona de Intervención / Centro de Referencia (CR)
Atributos: Ubicación, horarios de mayor concentración, mapa de actores locales
.
Unidades físicas vinculadas: Locales del CR, que requieren control de convenios, pago de servicios (luz, agua) e inventario
.
C. Entidad Familia / Adulto Responsable
Atributos: Parentesco, datos de contacto, nivel de compromiso, asistencia a talleres parentales
.

--------------------------------------------------------------------------------
3. Módulos y Flujo del Sistema (Máquina de Estados)
El sistema debe estructurarse en tres grandes módulos de atención
:
MÓDULO 1: Atención Básica (Flujo Principal)
Módulo 1.1: Identificación e Instalación (Gestión Territorial)
Recopilación de Datos: El Educador cruza datos con fuentes oficiales (INEI, etc.)
.
Mapeo y Conteo: El Educador registra la Ficha de Conteo en campo
.
Aprobación de Zona: El Coordinador valida la zona de intervención en el sistema
.
Gestión de Redes: Creación de un "Directorio Institucional" digital de la zona
.
Módulo 1.2: Prestación del Servicio (Expediente Digital del NNA) El sistema debe bloquear el paso a la siguiente fase si no se cumplen los requisitos de la fase anterior o si expiran los plazos.
Fase 1: Contacto e Integración (Máx. 3 meses + 1 mes de ampliación)
Asignación de Educador al caso
.
Suscripción de Inscripción y Compromiso
.
Llenado del Diagnóstico Social
.
Entregable del sistema: Generación automática del "Plan de Intervención Individual" basado en el diagnóstico
.
Fase 2: Desarrollo e Intervención (Máx. 1 año y 3 meses + 1 mes de ampliación)
Seguimiento de "Acciones a Desarrollar" marcadas en Fase 1
.
Módulo de agendamiento y control de asistencia a Talleres
.
Gestión de derivaciones para DNI, SIS, salud mental o nivelación escolar
.
Fase 3: Seguimiento y Egreso (Máx. 6 meses)
Programación de visitas domiciliarias y escolares
.
Cierre de logros y generación de Acta de Egreso
.
MÓDULO 2: Atención Especializada (Centros de Acogimiento Residencial - CAR)
Aplica para NNA con consumo de sustancias o casos complejos
.
El sistema debe contemplar un flujo de derivación a la UPE (Unidad de Protección Especial)
.
Fases del módulo: Adaptación (hasta 6 meses)
, Recuperación (hasta 12 meses)
, Reintegración (hasta 3 meses)
.
MÓDULO 3: Atención de Urgencia
Bandeja de Entrada: Recepción de reportes de Línea 100, CEM, DEMUNA
.
Acciones Exprés: Generación rápida de ficha de atención inmediata, gestión urgente de DNI/SIS y derivación al módulo de Atención Básica
.

--------------------------------------------------------------------------------
4. Digitalización de Instrumentos (Módulo de Formularios)
Tu sistema necesitará convertir los 15 anexos del protocolo en formularios web interactivos. Aquí está el mapeo de dónde va cada uno
:
Fase Inicial / Territorial:
F01 Ficha de conteo: Para levantar data en la calle
.
F02 Directorio Institucional: Base de datos de aliados locales
.
Gestión del Expediente del NNA (Gestión de Casos):
F03 Ficha de inscripción y compromiso: (Firma digital o registro biométrico si es posible)
.
F04 Ficha de diagnóstico social: El corazón del perfil del NNA. Debe alertar sobre situaciones críticas
.
F05 Ficha de proceso de logros: Panel de control de indicadores por fase (Sí / No / En Proceso)
.
F06 Ficha de derivación: Generador de oficios a instituciones
.
Módulo de Actividades y Talleres:
F07 Formato de planificación de talleres socioeducativos:
.
F08 Formato de evaluación de talleres socioeducativos:
.
F10 Registro de asistencia (NNA) y F11 Registro de asistencia (Familia):
.
F09 y F14 Autorizaciones y Compromisos: De salida o asistencia a eventos
.
Seguimiento y Cierre:
F12 Ficha de seguimiento familiar - consejería: Historial de visitas y reportes
.
F13 Ficha de egreso/retiro: Cierre de caso por éxito, límite de edad, abandono u otras causales
.
Urgencias:
F15 Ficha de atención inmediata: Formato reducido para emergencias nocturnas o denuncias
.

--------------------------------------------------------------------------------
5. Reglas de Negocio Estrictas (Validaciones de Backend)
Tu lógica de programación debe incluir los siguientes "Candados":
Validación de Carga Laboral (Ratio Educador/NNA):
Si NNA es "Trabajador", el sistema no debe permitir asignar más de 60 NNA a un mismo Educador
.
Si NNA es "En situación de calle" o "Mendicidad", el límite es de 30 NNA por Educador
.
Alarmas de Tiempo y Plazos Totales:
La intervención máxima en el sistema no puede superar los 2 años (24 meses)
.
Si una fase expira, el sistema debe solicitar un "Informe Técnico" sustentado al Educador para habilitar los botones de "Ampliación"
.
Lógica de Derivaciones Críticas:
Si en el Formato 04 se marca (Violencia, Trata, Explotación, Abandono total), el sistema debe generar automáticamente una Alerta de Derivación a la UPE, Fiscalía o Policía, bloqueando el seguimiento regular hasta que la autoridad dicte protección
.
En caso de consumo crónico de drogas (SPA), debe forzarse la derivación al módulo de "Atención Especializada" (CAR San Ricardo u otro)
.
Causales de Egreso (Cierre de Caso): El caso debe pasar a inactivo (solo lectura) si se registra
:
Culminación exitosa de los logros (Fin Fase 3).
Derivación a CAR por la UPE.
Mayoría de edad (18 años).
Fallecimiento.
Abandono (1 mes inubicable y sin éxito en reincorporación tras 3 intentos mínimos documentados).
6. Recomendaciones Técnicas para la Arquitectura Web
Módulo Offline: Dado que los Educadores de Calle llenan el "Cuaderno de Campo" in situ (mercados, plazas, parques)
, el sistema web debería ser una PWA (Progressive Web App) que permita llenar el Formato 01, 04 y 10 sin conexión a internet y sincronizar la base de datos al recuperar la señal.
Sistema de Alertas (Notificaciones Push/Email): Configurar alertas automáticas al Coordinador cuando un Educador se acerque al límite de los 3 meses de la Fase 1 o falten reportes de logros mensuales
.
Tablero de Mando (Dashboard): El sistema debe generar reportes mensuales automatizados con estadísticas que faciliten la toma de decisiones, tal como exige el protocolo
.