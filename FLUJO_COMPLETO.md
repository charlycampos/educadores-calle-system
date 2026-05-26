# 📋 Flujo Completo de Trabajo - Sistema Educadores de Calle

## 🎯 Proceso de Atención según RDE 069-2021

Este documento describe paso a paso cómo usar el sistema desde el registro inicial hasta el cierre de casos.

---

## FASE I: Identificación y Contacto

### 📍 Paso 1: Mapeo de Zona (Pendiente implementación)
- El educador identifica puntos focalizados de concentración de NNA en calle
- Registra conteos y estimaciones de población

---

## FASE II: Vinculación y Atención

### 📝 Paso 2: Registro de Ficha de Inscripción

**Usuario:** Educador de Calle (`educador@educadores.gob.pe`)

**Acciones:**
1. Login al sistema
2. Dashboard → **"Registrar Nuevo NNA"**
3. Completar formulario con:
   - **Sección I:** Datos personales del NNA
   - **Sección II:** Datos de familia (domicilio, con quién vive)
   - **Sección III:** Situación educativa y salud
   - **Sección IV:** Perfil de calle (actividad, horario, lugar)

**Resultado:** 
- Se crea un **Expediente Digital** (Carpeta familiar)
- Se abre un **Caso** automáticamente con estado `ACTIVO`
- El caso queda **asignado al educador** que lo registró

**Ruta:** `/nna/create`

---

## FASE III: Desarrollo y Mantenimiento

### 🔄 Paso 3: Derivación del Caso

**Escenario A: Derivación INTERNA (a especialista del equipo)**

**Cuándo:** El educador detecta que el caso requiere evaluación especializada (psicológica o social)

**Acciones:**
1. En la lista de NNA → Click en botón **"Derivar"** (ícono de flecha)
2. Seleccionar tipo: **INTERNA**
3. Seleccionar destinatario:
   - Ana Psicóloga Rodríguez (para evaluación psicológica)
   - Carlos Trabajador Social López (para evaluación social/familiar)
4. Indicar:
   - Prioridad: NORMAL / URGENTE
   - Motivo de la derivación
   - Documento de referencia (opcional)
5. Click en **"Derivar Caso"**

**Resultado:**
- El caso se **REASIGNA** al profesional seleccionado
- El caso **desaparece** de la lista del educador
- El caso **aparece** en la lista del profesional destinatario
- Estado del caso: sigue `ACTIVO`

---

**Escenario B: Derivación EXTERNA (a entidad de protección)**

**Cuándo:** El caso presenta riesgo alto y requiere intervención de protección especial

**Acciones:**
1. En la lista de NNA → Click en botón **"Derivar"**
2. Seleccionar tipo: **EXTERNA**
3. Seleccionar entidad:
   - **UPE:** Desprotección familiar severa
   - **DEMUNA:** Riesgo leve/moderado
   - **Fiscalía de Familia:** Casos penales o riesgo inminente
   - **MINSA:** Atención médica urgente
   - **Comisaría PNP:** Casos de explotación/trata
   - **CEM:** Violencia familiar
   - **CAR:** Requiere acogimiento residencial
4. Indicar motivo y documento de referencia
5. Click en **"Derivar Caso"**

**Resultado:**
- Estado del caso cambia a `DERIVADO`
- Se genera registro en historial de derivaciones
- El caso entra en seguimiento (ya no es responsabilidad directa del servicio)

**Ruta:** Modal desde `/nna` (lista)

---

### 🧠 Paso 4: Trabajo del Especialista (Psicólogo/Trabajador Social)

**Usuario:** Psicólogo (`psicologo@educadores.gob.pe`) o T. Social (`tsocial@educadores.gob.pe`)

**Acciones tras recibir derivación:**

1. **Login con su usuario**
2. Ver lista de NNA → Solo aparecen los casos **derivados a él/ella**
3. Click en un caso → Ver Ficha del NNA
4. Click en **"Gestionar Caso"**

**Dentro de Gestionar Caso hay 3 pestañas:**

#### 📋 Pestaña 1: Plan de Trabajo Individual (PTI)
- Registrar objetivos específicos para el NNA
- Definir metas (ej: obtención de DNI, matrícula escolar)
- Asignar plazos y responsables
- Estados: PENDIENTE, EN_PROCESO, CUMPLIDA

**Ejemplo de registro PTI:**
```
Objetivo: Restitución del derecho a la identidad
Meta: Obtención de DNI
Plazo: 30 días
Responsable: Educador / Trabajador Social
```

#### 📝 Pestaña 2: Diario de Campo
- Registrar cada intervención/visita realizada
- Tipo: VISITA_DOMICILIARIA, ENTREVISTA, ACOMPAÑAMIENTO, COORDINACION
- Descripción de la actividad
- Próximos pasos

**Ejemplo de registro:**
```
Fecha: 29/01/2026
Tipo: VISITA_DOMICILIARIA
Descripción: Contacto con madre del NNA. Se conversó sobre importancia de la escolarización. Se coordinó cita para inscripción escolar.
Próximos pasos: Acompañar a inscripción el 05/02/2026
```

#### 🔀 Pestaña 3: Derivaciones
- Ver historial de todas las derivaciones del caso
- Registrar nuevas derivaciones si el profesista también detecta necesidad
- Estado de cada derivación: PENDIENTE, ACEPTADA, RECHAZADA

**Ruta:** `/nna/gestion/:id`

---

### 👀 Paso 5: Supervisión del Coordinador

**Usuario:** Coordinador (`coordinador@educadores.gob.pe`)

**Acciones:**
1. Login al sistema
2. Dashboard → Ve **TODOS los casos de ZONA_NORTE**
3. Puede:
   - Ver todas las fichas
   - Revisar calidad de PTI
   - Validar derivaciones
   - Generar reportes (pendiente implementación)

**Privilegios:**
- Ve casos de TODOS los educadores y especialistas de su zona
- Puede intervenir en cualquier caso
- Aprueba derivaciones a entidades externas (proceso por implementar)

---

### 🔐 Paso 6: Administración del Sistema

**Usuario:** Administrador (`admin@educadores.gob.pe`)

**Acciones:**
1. Login al sistema
2. Menu lateral → **"Usuarios del Sistema"**
3. Puede:
   - **Crear** nuevos usuarios (educadores, psicólogos, etc.)
   - **Editar** datos y roles
   - **Cambiar contraseñas**
   - **Desactivar** usuarios

**Ruta:** `/usuarios`

---

## FASE IV: Egreso/Cierre

### ✅ Paso 7: Cierre de Caso (Implementación pendiente)

**Criterios para cierre:**
- NNA cumple 18 años
- Reinserción familiar exitosa
- Derivación definitiva a CAR
- Fallecimiento (triste pero necesario registrar)

**Proceso:**
1. Educador/Coordinador → Botón "Cerrar Caso"
2. Seleccionar motivo de cierre
3. Registrar informe final
4. Estado cambia a `CERRADO`

---

## 📊 Resumen de Rutas del Sistema

| Funcionalidad | Ruta | Roles con acceso |
|---------------|------|------------------|
| Dashboard | `/` | Todos |
| Lista de NNA | `/nna` | Todos (filtrado por responsabilidad) |
| Crear NNA | `/nna/create` | EDUCADOR, COORDINADOR, ADMIN |
| Ver Ficha | `/nna/ficha/:id` | Todos |
| Gestionar Caso | `/nna/gestion/:id` | Todos (solo casos asignados) |
| Usuarios | `/usuarios` | COORDINADOR, ADMIN |

---

## 🎬 Escenario de Prueba Completo

### Caso: Juan Pérez (NNA en situación de trabajo infantil)

**Día 1 - Registro**
```
Usuario: educador@educadores.gob.pe
Acción: Registra ficha de Juan (12 años, vende caramelos en semáforos)
Resultado: Caso activo asignado al educador
```

**Día 3 - Primera derivación**
```
Usuario: educador@educadores.gob.pe
Acción: Deriva a psicóloga (detecta signos de ansiedad)
Resultado: Caso reasignado a psicologo@educadores.gob.pe
```

**Día 5 - Evaluación psicológica**
```
Usuario: psicologo@educadores.gob.pe
Acción: 
  - Crea PTI: "Apoyo emocional y derivación a MINSA"
  - Registra en Diario: "Primera entrevista psicológica"
  - Deriva a trabajador social para evaluación familiar
Resultado: Caso reasignado a tsocial@educadores.gob.pe
```

**Día 10 - Evaluación social**
```
Usuario: tsocial@educadores.gob.pe
Acción:
  - Registra visita domiciliaria
  - Actualiza PTI: "Fortalecimiento de vínculos familiares"
  - Deriva a DEMUNA (externa)
Resultado: Caso cambia a estado DERIVADO
```

**Todo el proceso:**
```
Usuario: coordinador@educadores.gob.pe
Puede: Ver todo el historial y trazabilidad del caso
```

---

**Fecha:** 29/01/2026  
**Versión:** 1.0
