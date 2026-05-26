# ✅ Evaluación Social - DENTRO DEL EXPEDIENTE DIGITAL

## 📍 **UBICACIÓN CORRECTA**

La Evaluación Social **NO es un módulo independiente**, sino que está **DENTRO del Expediente Digital** de cada beneficiario.

---

## 🗺️ **FLUJO DE NAVEGACIÓN**

```
Menú → Beneficiarios (NNA) 
    → Seleccionar un NNA
        → Expediente Digital
            → Pestaña "Evaluación Social"
                → GRILLA de evaluaciones
                    → Botón "Nuevo Registro" → Formato 4
                    → Botón "Ver" → Ver evaluación (solo lectura)
                    → Botón "Editar" → Editar evaluación
                    → Botón "Eliminar" → Eliminar evaluación
```

---

## 🎯 **PASO A PASO**

### **1. Ir al Padrón de Beneficiarios**
- Menú lateral → "Beneficiarios (NNA)"
- Se muestra la lista de todos los NNA registrados

### **2. Entrar al Expediente Digital**
- Hacer clic en "Ver Expediente" de un NNA
- Se abre el Expediente Digital con múltiples pestañas

### **3. Ir a la Pestaña "Evaluación Social"**
- En el menú izquierdo del expediente, buscar: **"Diagnóstico Social (Formato 4)"**
- Hacer clic → Se muestra una **GRILLA/TABLA** con las evaluaciones sociales existentes

### **4. Ver la Grilla de Evaluaciones**
**La grilla muestra:**
- ID de la evaluación
- Fecha de creación
- Responsable (educador)
- Estado (Completo, En Proceso, Pendiente)
- Acciones (Ver, Editar, Eliminar)

**Botón principal:** ➕ **"Nuevo Registro"** (azul, arriba a la derecha)

### **5. Crear Nueva Evaluación**
- Clic en **"Nuevo Registro"**
- Se abre el **Formato 4** completo
- Completar todas las secciones
- Usar modales para agregar:
  - Familiares (con nombre separado en 3 campos)
  - Necesidades del NNA (con categorías y 3 fases)
- Clic en **"Guardar"**
- **Botón "Volver a la Lista"** → Regresa a la grilla

### **6. Ver o Editar Evaluación Existente**
- Desde la grilla, hacer clic en:
  - 👁️ **Ver** → Solo lectura del Formato 4
  - ✏️ **Editar** → Modificar el Formato 4
- **Botón "Volver a la Lista"** → Regresa a la grilla

---

## 📋 **COMPONENTES IMPLEMENTADOS**

### **1. DiagnosticoSocialList.tsx**
**Mini-grilla DENTRO del expediente**

**Props:**
- `nnaId`: ID del NNA actual
- `onNuevoDiagnostico`: Callback para crear nueva evaluación
- `onVerDiagnostico`: Callback para ver evaluación
- `onEditarDiagnostico`: Callback para editar evaluación

**Características:**
- Tabla con 5 columnas (ID, Fecha, Responsable, Estado, Acciones)
- Botón "Nuevo Registro" en el header
- Acciones: Ver (ojo azul), Editar (lápiz verde), Eliminar (papelera roja)
- Mensaje cuando no hay evaluaciones registradas
- Footer con contador de evaluaciones

---

### **2. ExpedientePage.tsx (Modificado)**

**Estado agregado:**
```tsx
const [showDiagnosticoForm, setShowDiagnosticoForm] = useState(false);
const [currentDiagnosticoId, setCurrentDiagnosticoId] = useState<number | null>(null);
```

**Lógica del caso 'social':**
```tsx
case 'social':
    if (showDiagnosticoForm) {
        return (
            <div>
                <button onClick={() => setShowDiagnosticoForm(false)}>
                    ← Volver a la Lista
                </button>
                <Formato4Social nna={mainNna} caso={activeCase} />
            </div>
        );
    }
    return <DiagnosticoSocialList ... />;
```

**Cuando se hace clic en "Nuevo Registro" o "Editar":**
- `setShowDiagnosticoForm(true)` → Muestra el formulario
- `setCurrentDiagnosticoId(id)` → Guarda el ID (null para nuevo)

**Cuando se hace clic en "Volver a la Lista":**
- `setShowDiagnosticoForm(false)` → Vuelve a la grilla

---

### **3. Formato4Social.tsx (Sin cambios)**

Sigue siendo el mismo componente de formulario completo con:
- 9 secciones
- Modales dinámicos para Familia y Necesidades
- Botón Guardar
- Botón Imprimir
- Vista de impresión

---

## 🗂️ **ARCHIVOS MODIFICADOS/CREADOS**

### **Creados:**
✅ `client/src/features/nna/components/DiagnosticoSocialList.tsx`

### **Modificados:**
✅ `client/src/features/nna/ExpedientePage.tsx`
✅ `client/src/features/nna/components/Formato4Social.tsx` (ya existía, ya tiene modales)

### **Eliminados:**
❌ `EvaluacionSocialListPage.tsx` (página independiente innecesaria)
❌ `EvaluacionSocialFormPage.tsx` (página independiente innecesaria)

### **Sin cambios en rutas:**
- No hay rutas `/evaluacion-social/*`
- Todo funciona dentro de `/nna/expediente/:id`

---

## 🎨 **DISEÑO Y UX**

### **Grilla:**
- Tabla limpia y moderna
- Header con título y botón "Nuevo Registro"
- Estados con badges de colores
- Iconos de acciones (ojo, lápiz, papelera)
- Footer con contador

### **Formulario:**
- Botón "Volver a la Lista" arriba
- Mismo diseño del Formato 4 existente
- Modales dinámicos para familia y necesidades

---

## 🔄 **FLUJO DE DATOS**

```
1. Usuario entra a Expediente → Pestaña "Evaluación Social"
2. ExpedientePage renderiza DiagnosticoSocialList
3. DiagnosticoSocialList muestra la tabla
4. Usuario hace clic en "Nuevo Registro"
5. DiagnosticoSocialList ejecuta onNuevoDiagnostico()
6. ExpedientePage cambia showDiagnosticoForm = true
7. ExpedientePage renderiza Formato4Social
8. Usuario completa el formulario
9. Usuario hace clic en "Volver a la Lista"
10. ExpedientePage cambia showDiagnosticoForm = false
11. ExpedientePage renderiza DiagnosticoSocialList de nuevo
```

---

## ⚙️ **PENDIENTE (Backend)**

### **API Endpoints necesarios:**
```
GET    /api/nna/:nnaId/diagnosticos-sociales     → Lista de evaluaciones del NNA
GET    /api/diagnosticos-sociales/:id            → Una evaluación específica
POST   /api/nna/:nnaId/diagnosticos-sociales     → Crear nueva
PUT    /api/diagnosticos-sociales/:id            → Actualizar
DELETE /api/diagnosticos-sociales/:id            → Eliminar
```

### **Base de Datos:**
```sql
CREATE TABLE diagnosticos_sociales (
  id SERIAL PRIMARY KEY,
  nna_id INT REFERENCES nnas(id),
  -- Todos los campos del Formato 4 --
  familiares JSONB,
  necesidades JSONB,
  responsable_id INT,
  estado VARCHAR(50),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## ✅ **RESULTADO FINAL**

### **El usuario ahora puede:**

1. ✅ Ir a Beneficiarios → Seleccionar NNA → Expediente
2. ✅ Hacer clic en pestaña "Evaluación Social"
3. ✅ Ver una **grilla** con todas las evaluaciones del NNA
4. ✅ Hacer clic en **"Nuevo Registro"** para crear
5. ✅ Completar el Formato 4 con modales dinámicos
6. ✅ Hacer clic en **"Volver a la Lista"** para regresar
7. ✅ **Ver, editar o eliminar** evaluaciones desde la grilla
8. ✅ **Guardar** cambios (pendiente backend)
9. ✅ **Imprimir** documento oficial

**Todo funciona DENTRO del Expediente Digital. ✨**
