# Referencia Técnica del Protocolo SEC — Sistema de Educadores de Calle
## Síntesis de: datos detalle.md + Protocolo Mapa Operacional + SEC Operational Blueprint

**Base Legal:** RDE N° 069-2021-INABIF/DE  
**Objetivo:** Estandarizar la intervención para la restitución de derechos de NNA en situación de calle.  
**Alcance:** Educadores, Coordinadores y equipos técnicos de la USPNNA.

---

## 1. PERFILES DE LA POBLACIÓN OBJETIVO (NNA)

El sistema debe manejar 4 perfiles distintos, cada uno con dinámica e indicadores propios:

| Perfil | Dinámica | Vínculo Familiar | Riesgo |
|--------|----------|-----------------|--------|
| **Trabajo en Calle** | Ambulante o informal (mañana, tarde, madrugada). Pernoctan en domicilio. Familia permisiva (jefatura femenina/migrante). | Mantiene vínculo | Dificultades en rendimiento escolar. |
| **Mendicidad** | Solicitud persistente con humillación. Sin transacción económica. Higiene descuidada. | Aparente manipulación. Posible explotación por terceros. | EXTREMO — Pueden ser alquilados o prestados para explotación. |
| **Vida en Calle (con vínculo)** | Ausencia del domicilio 2-3 días. Vínculo familiar muy débil. | Débil | Consumo experimental de psicoactivos, pares adultos. |
| **Vida en Calle (sin vínculo)** | Calle como único hogar. Duermen en puentes, parques. | Ruptura total | Consumo habitual de psicoactivos, promiscuidad, rechazo a la familia. |

---

## 2. ROLES Y ACTORES

| Actor | Código | Descripción |
|-------|--------|-------------|
| Coordinador/a | COORD | Supervisión y aprobación. Valida zonas, aprueba informes, asigna casos, suscribe convenios, aprueba egresos. Uno por sede. |
| Educador/a de Calle | EDUC | Rol operativo principal. Conteo en calle, diagnóstico, seguimiento, talleres, registro de logros. |
| Psicólogo/a | PSIC | Evaluación psicológica, diagnóstico clínico, informe. |
| Trabajador/a Social | TSOC | Diagnóstico social (F04), seguimiento familiar, consejería. |
| Abogado/a | ABOG | Apoyo legal, derivaciones a Fiscalía, Reniec. |
| Instituciones externas | EXT | DEMUNA, UPE, Fiscalía, Reniec, SIS, PNP, Comedores. (Lectura/interoperabilidad vía API) |

---

## 3. ARQUITECTURA DE 3 MÓDULOS DE ATENCIÓN

### MÓDULO 1: Atención Básica (Flujo principal)

El módulo central del sistema, dividido en etapas y fases.

#### ETAPA 1 — Identificación de la Zona (Mapeo)

```
Paso 1: Recopilación de información (Educador)
        └── Fuentes oficiales (INEI), mapeo de ONG, mercados, terminales, espacios de riesgo

Paso 2: Elaboración de Propuesta (Educador)
        └── Definición de zonas potenciales usando Tabla de Valoración

Paso 3: Validación Inicial (Coordinador)
        └── Coordinador autoriza la visita de campo

Paso 4: Visita de Campo y Conteo (Educador)
        └── Observación en diferentes horarios
        └── [INSTRUMENTO] Formato N°01: Ficha de Conteo

Paso 5: Informe de Identificación (Educador)
        └── Evaluación de datos recolectados

Paso 6: Validación Final (Coordinador)
        └── Aprobación formal de la zona de intervención
```

#### ETAPA 2 — Instalación del Servicio y Redes

```
- Mapeo de aliados estratégicos (RENIEC, Salud, PNP, Comedores)
- [INSTRUMENTO] Formato N°02: Directorio Institucional
- Búsqueda de espacio físico para Centro de Referencia (CR)
  ¿Es posible cesión de uso? → SI: Firma de Convenio
                              → NO: Gestión de Alquiler
- Sensibilización a actores para planes de acción conjunta
- Red de actores: Educadores, DEMUNA, Centro de Referencia,
                  Comunidad, Salud, Policía
- Instalación y funcionamiento del CR
  (agua, luz, internet → control de convenios e inventario)
```

**ENTIDAD: Centro de Referencia (CR)** — actualmente NO modelada en el sistema:
- Ubicación física (local)
- Horarios de mayor concentración de NNA
- Mapa de actores locales
- Control de convenios (cesión de uso / alquiler)
- Pago de servicios (luz, agua, internet)
- Inventario de materiales

#### ETAPA 3 — Prestación del Servicio (Expediente Digital del NNA)

**REGLA DE NEGOCIO CRÍTICA:** El sistema debe bloquear el paso a la siguiente fase si no se cumplen los requisitos o si expiran los plazos.

---

### FASE I — Contacto e Integración (Máx. 3 meses + 1 mes de ampliación)

```
CAMPO (Educador)                    OFICINA (Coordinador)
─────────────────                   ──────────────────────
1. Abordaje en calle                1. Asignación de caso
2. Registro en Cuaderno de Campo    2. Revisión Ficha de Inscripción
3. Llenado Ficha de Inscripción     3. SELLO de aprobación
4. [Si hay indicios de delito]      4. Oficio a autoridad competente
   → Educador informa               → (UPE o DEMUNA)
   → Coordinador gestiona

CIERRE DE FASE I:
- Diagnóstico Social completo (F04)
  → Datos de vulnerabilidad (Salud, Educación)
  → Tabla de "Acciones a Desarrollar"
- Copia del Cuaderno de Campo
- Validación de Logros: Formato N°05 (Sección Fase I)
```

**Instrumentos de Fase I:**
- F03 Ficha de Inscripción y Compromiso (firma digital o biométrica)
- F04 Ficha de Diagnóstico Social ← corazón del perfil del NNA
- F05 Ficha de Proceso de Logros (Sección Fase I)
- F06 Ficha de Derivación (si aplica)

---

### FASE II — Desarrollo e Intervención (Máx. 1 año y 3 meses + 1 mes de ampliación)

```
RESTITUCIÓN DE DERECHOS:
- Reinserción escolar
- Becas técnico-ocupacionales (mayores de 14 años)
- Plan de Intervención Individual (PII) ← generado del diagnóstico F04

DESARROLLO FORMATIVO:
- Seguimiento de "Acciones a Desarrollar" marcadas en Fase I
- Talleres grupales e individuales
- Gestión de derivaciones: DNI, SIS, salud mental, nivelación escolar

INTERVENCIÓN FAMILIAR Y COMUNITARIA:
- Jornadas de integración social
- Salidas de esparcimiento
- Celebración de fechas significativas
- Fortalecer el rol protector de la familia

INSTRUMENTOS FASE II:
- F07 Formato de Planificación de Talleres Socioeducativos
- F08 Formato de Evaluación de Talleres Socioeducativos
- F09 Compromisos (autorizaciones para actividades)
- F10 Registro de Asistencia (NNA)
- F11 Registro de Asistencia (Familia)
- F12 Ficha de Seguimiento Familiar / Consejería
- F14 Autorizaciones (salidas a eventos)
```

---

### FASE III — Seguimiento y Egreso (Máx. 6 meses)

```
- Programación de visitas domiciliarias y escolares
- Cierre de logros
- Generación de Acta de Egreso
- F05 Ficha de Proceso de Logros (Sección Fase III)
- F13 Ficha de Egreso/Retiro
```

**Causales de Egreso (el caso pasa a solo lectura):**
1. Culminación exitosa de los logros (fin Fase III)
2. Derivación a CAR por la UPE
3. Mayoría de edad (18 años)
4. Fallecimiento
5. Abandono: 1 mes inubicable + sin éxito tras 3 intentos documentados

---

### MÓDULO 2: Atención Especializada (CAR — Centros de Acogimiento Residencial)

Aplica para NNA con consumo de sustancias o casos complejos. Actualmente **NO implementado** en el sistema.

```
Derivación a UPE (Unidad de Protección Especial)
    ↓
Fases del CAR:
  - Adaptación    → hasta 6 meses
  - Recuperación  → hasta 12 meses
  - Reintegración → hasta 3 meses

Referencia: CAR San Ricardo (u otro)
```

---

### MÓDULO 3: Atención de Urgencia

Actualmente **NO implementado** en el sistema.

```
ENTRADAS:
- Reportes de Línea 100
- Reportes de CEM (Centro Emergencia Mujer)
- Reportes de DEMUNA

ACCIONES EXPRÉS:
1. Generación rápida de F15 (Ficha de Atención Inmediata)
2. Gestión urgente de DNI/SIS
3. Derivación al Módulo de Atención Básica

INSTRUMENTO:
- F15 Ficha de Atención Inmediata (formato reducido para emergencias
  nocturnas o denuncias)
```

---

## 4. ÁRBOL DE DECISIONES — DERIVACIÓN

```
¿Cuál es la situación del NNA?
│
├─ Trabajan (Con vínculo familiar)
│   └─ → Atención en Centro de Referencia
│         Fortalecimiento familiar, refuerzo escolar
│
├─ Mendicidad / Con vínculo + Explotado
│   └─ → Coordinación con UPE/DEMUNA para medida de protección
│         Derivación inmediata a UPE, Fiscalía o DEMUNA
│         *** ALERTA AUTOMÁTICA DEL SISTEMA ***
│
├─ Vida en calle (Con vínculo familiar débil)
│   └─ → Motivación de retiro voluntario
│         Activar red local, coordinar con UPE/Fiscalía
│
└─ Vida en calle (Sin vínculo familiar)
    └─ → Derivación del caso a UPE/DEMUNA
          Activar protocolo de medida de protección

INSTRUMENTO para todos: F06 Ficha de Derivación
```

---

## 5. LOS 15 FORMATOS (F01–F15)

| # | Formato | Módulo/Fase | Descripción |
|---|---------|------------|-------------|
| F01 | Ficha de Conteo | Etapa 1 | Levantamiento de data en calle. Campo y mapeo territorial. |
| F02 | Directorio Institucional | Etapa 2 | Base de datos de aliados locales (DEMUNA, Salud, PNP, etc.) |
| F03 | Ficha de Inscripción y Compromiso | Fase I | Registro del NNA. Firma digital o biométrica si es posible. |
| F04 | Ficha de Diagnóstico Social | Fase I | Corazón del perfil del NNA. Alerta sobre situaciones críticas. |
| F05 | Ficha de Proceso de Logros | Fase I y III | Panel de control de indicadores por fase (Sí / No / En Proceso). |
| F06 | Ficha de Derivación | Todas | Generador de oficios a instituciones externas. |
| F07 | Planificación de Talleres | Fase II | Planificación de talleres socioeducativos. |
| F08 | Evaluación de Talleres | Fase II | Evaluación individual por NNA participante. |
| F09 | Compromisos | Fase II | Compromisos y autorizaciones de actividades. |
| F10 | Registro de Asistencia NNA | Fase II | Control de asistencia de NNA a talleres/actividades. |
| F11 | Registro de Asistencia Familia | Fase II | Control de asistencia de familiares a talleres. |
| F12 | Seguimiento Familiar / Consejería | Fase II | Historial de visitas domiciliarias y reportes. |
| F13 | Ficha de Egreso / Retiro | Fase III | Cierre de caso por éxito, mayoría de edad, abandono u otras causales. |
| F14 | Autorizaciones | Fase II | Autorización de salida o asistencia a eventos. |
| F15 | Ficha de Atención Inmediata | Urgencias | Formato reducido para emergencias nocturnas o denuncias. |

---

## 6. REGLAS DE NEGOCIO CRÍTICAS (CANDADOS DEL SISTEMA)

### 6.1 Validación de Carga Laboral — Ratio Educador/NNA

```
Si NNA es perfil "Trabajo en Calle"
→ Máximo 60 NNA por Educador
→ El sistema NO debe permitir asignar más

Si NNA es perfil "Vida en Calle" o "Mendicidad"
→ Máximo 30 NNA por Educador
→ El sistema NO debe permitir asignar más
```

### 6.2 Alarmas de Tiempo y Plazos

```
Fase I:   Máx. 3 meses + 1 mes de ampliación (4 total)
Fase II:  Máx. 1 año 3 meses + 1 mes de ampliación (~16 meses total)
Fase III: Máx. 6 meses
─────────────────────────────────────────
TOTAL MÁXIMO DE INTERVENCIÓN: 24 meses (2 años)
─────────────────────────────────────────

Si una fase expira:
→ El sistema BLOQUEA los botones de avance
→ Solicita "Informe Técnico" sustentado al Educador
→ Solo al aprobarlo, habilita el botón de "Ampliación"

Alerta al Coordinador cuando:
→ Educador se acerca al límite de los 3 meses de Fase I
→ Faltan reportes de logros mensuales
```

### 6.3 Derivaciones Críticas — Alertas Automáticas

```
Si en F04 se marca:
  - Violencia
  - Trata de personas
  - Explotación
  - Abandono total

→ Sistema genera ALERTA AUTOMÁTICA de derivación a UPE, Fiscalía o Policía
→ BLOQUEA el seguimiento regular hasta que la autoridad dicte protección
→ El caso NO puede avanzar normalmente hasta resolver la alerta

Si en F04 se marca consumo crónico de SPA (drogas):
→ FUERZA la derivación al Módulo de Atención Especializada (CAR)
```

### 6.4 Causales de Egreso

El caso pasa a estado **SOLO LECTURA** (inactivo) ante:

1. Culminación exitosa de logros (fin Fase III)
2. Derivación a CAR por la UPE
3. Mayoría de edad (18 años cumplidos)
4. Fallecimiento
5. Abandono: 1 mes inubicable + 3 intentos de reincorporación documentados sin éxito

---

## 7. GAPS DETECTADOS — LO QUE FALTA IMPLEMENTAR

Comparando el protocolo oficial con el sistema actual, estos elementos **no están implementados**:

| Elemento | Estado actual | Prioridad |
|----------|--------------|-----------|
| F01 — Ficha de Conteo | No existe | Alta |
| F02 — Directorio Institucional | No existe | Alta |
| F09 — Compromisos / Autorizaciones | No existe | Media |
| F11 — Asistencia de Familia | No existe | Media |
| F14 — Autorizaciones de salida | No existe | Media |
| F15 — Ficha de Atención Inmediata | No existe | Alta |
| Módulo 2 — Atención Especializada (CAR) | No existe | Alta |
| Módulo 3 — Atención de Urgencia | No existe | Alta |
| Centro de Referencia (CR) como entidad | No modelado | Alta |
| Ratio máximo Educador/NNA (30 y 60) | Sin validación | Alta |
| Plazos por fase con bloqueo automático | Sin implementar | Alta |
| Alerta automática por casos críticos (F04) | Sin implementar | Crítica |
| Módulo offline / PWA | Sin implementar | Media |
| Dashboard con reportes mensuales automáticos | Básico | Media |

---

## 8. RECOMENDACIONES TÉCNICAS DEL PROTOCOLO

### 8.1 PWA (Progressive Web App)
Los Educadores llenan el Cuaderno de Campo **en campo** (mercados, plazas, parques) donde puede no haber internet. El sistema debería funcionar offline para:
- F01 — Ficha de Conteo (en campo)
- F04 — Diagnóstico Social (en campo)
- F12 — Seguimiento Familiar (en visita domiciliaria)

Y sincronizar automáticamente al recuperar señal.

### 8.2 Sistema de Alertas (Notificaciones)
- Push/Email al Coordinador cuando un caso se acerca al límite de fase
- Alerta cuando faltan reportes de logros mensuales
- Alerta crítica automática para casos de violencia/trata/explotación

### 8.3 Dashboard de Mando
Reportes mensuales automatizados con estadísticas para toma de decisiones, incluyendo:
- NNA por perfil y por fase
- Carga laboral por educador
- Casos próximos a vencer plazos
- Derivaciones pendientes de respuesta

### 8.4 Interoperabilidad Externa
Módulo de consulta o API para instituciones externas:
- DEMUNA
- UPE (Unidad de Protección Especial)
- Fiscalía
- RENIEC
- SIS

---

## 9. ESTADOS DEL NNA EN EL SISTEMA

```
IDENTIFICADO
    ↓
ABORDADO
    ↓
EN INTERVENCIÓN — FASE I  (máx. 4 meses)
    ↓
EN INTERVENCIÓN — FASE II (máx. 16 meses)
    ↓
EN INTERVENCIÓN — FASE III (máx. 6 meses)
    ↓
EGRESADO ─┬─ Exitoso (logros cumplidos)
           ├─ Derivado CAR
           ├─ Mayoría de edad
           ├─ Fallecimiento
           └─ Abandono

(En cualquier fase) → DERIVADO EXTERNO (UPE, Fiscalía, DEMUNA)
```

---

*Fuentes: datos detalle.md + Protocolo_Educadores_de_Calle_Un_Mapa_Operacional.pdf + SEC_Operational_Blueprint.pdf*  
*RDE N° 069-2021-INABIF/DE*
