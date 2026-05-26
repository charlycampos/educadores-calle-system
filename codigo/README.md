# SEC · Paso 1 — Drop-in para tu codebase

Estos archivos reemplazan / agregan piezas en `educadores-calle-system/client/src/`.

## Mapeo

| Archivo aquí | Destino en tu codebase | Acción |
|---|---|---|
| `index.css` | `client/src/index.css` | **Reemplazar** |
| `components/SecLogo.tsx` | `client/src/components/SecLogo.tsx` | **Nuevo** |
| `components/ui/Button.tsx` | `client/src/components/ui/Button.tsx` | **Nuevo** |
| `components/ui/Badge.tsx` | `client/src/components/ui/Badge.tsx` | **Nuevo** |
| `components/ui/Card.tsx` | `client/src/components/ui/Card.tsx` | **Nuevo** |
| `components/ui/Input.tsx` | `client/src/components/ui/Input.tsx` | **Nuevo** |
| `components/ui/StatCard.tsx` | `client/src/components/ui/StatCard.tsx` | **Nuevo** |
| `components/ui/EmptyState.tsx` | `client/src/components/ui/EmptyState.tsx` | **Nuevo** |
| `features/auth/LoginPage.tsx` | `client/src/features/auth/LoginPage.tsx` | **Reemplazar** |

## Después de copiar

1. **Reiniciar Vite** (`Ctrl+C` y `npm run dev` de nuevo) — los tokens de Tailwind v4 se leen en cold-start.
2. Verificar que `Inter` se carga (ya estaba en `index.html`, no se toca).
3. Abrir `/login` para ver el resultado.

## Convención que arrancamos aquí

A partir del Paso 2 **prohibido** usar en componentes:

```tsx
// ❌ No
className="bg-blue-600 text-white"
className="bg-indigo-50 text-indigo-700"
className="text-gray-400"  // contraste insuficiente
className="text-[10px]"    // ilegible

// ✅ Sí
className="bg-primary text-primary-fg"
className="bg-primary-soft text-primary"
className="text-fg-muted"  // accesible (4.6:1)
className="text-micro"     // 11px UPPERCASE — único permitido bajo 12px
```

Reglas:
- Color: solo tokens `primary / fg / fg-secondary / fg-muted / border / surface / success / warning / danger / info` (+ `*-soft` para fondos).
- Radio: solo `rounded-md` (botones/inputs) y `rounded-lg` (cards/modales). `rounded-2xl` queda prohibido.
- Sombra: `shadow-[var(--shadow-1)]` / `shadow-[var(--shadow-2)]`. Nada de `shadow-blue-200`.
- Texto: usar `text-display / text-h1 / text-h2 / text-body / text-caption / text-micro`.

## Siguiente paso

Paso 2: rediseño de `MainLayout` (sidebar) + `MainMenu` (pantalla intermedia de módulos).
