# Auditoría rápida: seguridad y rendimiento
Fecha: 2026-06-10

## 🔴 Seguridad — Alta prioridad

### 1. JWT_SECRET débil y compartido ✅ APLICADO
Todos los servicios usan el mismo secret que empieza con `secreto_super...` — parece un valor de ejemplo. Quien lo conozca puede firmar tokens válidos con cualquier rol/sede.
**Fix:** generar un secret aleatorio (`python -c "import secrets; print(secrets.token_urlsafe(64))"`) y actualizarlo en los 7 `.env`. Es correcto que sea compartido entre servicios (validan el mismo token), pero debe ser aleatorio.

### 2. CORS abierto ✅ APLICADO
En todos los `main.py`. Cualquier web puede llamar a la API con el token del usuario.
**Fix:** lista explícita: `allow_origins=["http://localhost:5173", "https://<dominio-prod>"]`.

### 3. Endpoint de debug expuesto ✅ APLICADO
`nna-service-py` → `GET /nna/debug-loaded/show` devuelve `sys.path`, rutas de archivos y código fuente. Sin auth aparente a nivel de decorador.
**Fix:** eliminarlo (junto con los scripts `debug_*.js`, `test_*.py`, `recover.py`, etc. del repo raíz).

### 4. Sin rate limiting en login ✅ APLICADO
`POST /login` permite fuerza bruta ilimitada.
**Fix:** `slowapi` con límite tipo `5/minute` en login. Simple y suficiente.

### 5. Upload sin límite ni validación real de PDF ✅ APLICADO
`/api/expediente/upload` valida solo la extensión `.pdf` y lee todo el archivo en memoria (`await file.read()`). Un archivo gigante tumba el servicio; un PDF falso se acepta.
**Fix:** verificar magic bytes (`content[:5] == b"%PDF-"`), límite de tamaño (p. ej. 10 MB) leyendo por chunks, y sanitizar `file.filename` (ya usa UUID de prefijo, bien, pero el nombre original va al filesystem).

### 6. Token JWT por query param en descargas de PDF
`/documento/{filename}?token=...` — los tokens quedan en logs del servidor, historial del navegador y cabeceras Referer.
**Fix:** usar cookie o header; si el query param es inevitable (visor PDF), emitir un token corto de un solo uso para descargas.

## 🟡 Seguridad — Media prioridad

### 7. Token en localStorage ✅ APLICADO (centralizado en utils/auth.ts)
Vulnerable a XSS (cualquier script inyectado lo roba). Aceptable para red interna; lo robusto es cookie `HttpOnly` + `SameSite`. Como mínimo, centralizar el acceso al token (hoy hay `localStorage.getItem('token')` repetido en muchos componentes).

### 8. Servicios duplicados con credenciales ✅ APLICADO (auth-service Node eliminado)
`services/auth-service` (Node, viejo) convive con `auth-service-py` y tiene su propio `.env` con la password de Oracle. Si ya no se usa, eliminarlo: menos superficie de ataque.
Verificado: los `.env` están en `.gitignore` ✅ y las queries usan bind variables (sin inyección SQL) ✅. Las contraseñas usan bcrypt ✅.

### 9. Expiración de token: 8 horas
Razonable para jornada laboral, pero sin mecanismo de revocación. Si un token se filtra, vale 8h. Considerar refresh tokens si pasa a producción real.

## ⚡ Rendimiento

### 10. Bundle frontend de 1.8 MB ✅ APLICADO (inicial: 297 kB + chunks por página)
`index-*.js` pesa 1.8 MB sin code-splitting (`React.lazy` no se usa en ninguna ruta). Primera carga lenta.
**Fix:** `React.lazy()` + `Suspense` por página en el router. Es el cambio con mejor relación esfuerzo/beneficio.

### 11. Queries sin paginación ✅ APLICADO (límite 500 en listados principales)
47 `fetchall()` y solo 3 con `OFFSET/FETCH`. Con pocos registros no se nota; con miles de NNA/casos las listas serán lentas y consumirán memoria.
**Fix:** agregar `OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY` a los listados principales (casos, derivaciones, talleres).

### 12. Pool de conexiones sobredimensionado ✅ APLICADO (min=1, max=4)
Oracle XE tiene límite de sesiones. Para esta escala, `min=1, max=4` por servicio es más sano.

### 13. Middleware JWT por servicio re-decodifica en cada request
Está bien así (es barato). No tocar — lo menciono para descartar que sea problema.

## Orden sugerido
1. JWT_SECRET nuevo (5 min)
2. Eliminar endpoint debug y servicio Node viejo (10 min)
3. CORS restringido (10 min)
4. Rate limit en login (30 min)
5. Validación de uploads (1 h)
6. Lazy loading de rutas en el cliente (1-2 h)
7. Paginación en listados grandes (incremental)
