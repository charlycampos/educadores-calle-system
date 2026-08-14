# Cambios SEC — Agosto 2026

> Este documento arrancó cubriendo solo el módulo de talleres. La reunión del
> 05/08/2026 abarcó tres módulos: **Ficha de Logros (F05)** (min 5–22), **Informe
> Situacional y PII** (min 22–46) y **Talleres** (min 47–60). Ver la sección 10 para
> lo acordado en los dos primeros.

## Talleres: participantes familiares (F11)

**Estado:** implementado, pendiente de ejecutar la migración en Oracle.
**Origen:** reunión con SEC del 05/08/2026 (`reunion SEC 05082026.md`, min. 47–60).

---

## 1. Qué pidieron los educadores

En la demo del módulo de talleres salieron cuatro puntos:

1. **Faltaban los padres.** Existen talleres dirigidos a familias, pero el sistema
   solo permitía inscribir NNA. El Formato 11 (asistencia de familias) se imprimía
   con 15 filas en blanco para llenar a mano.
2. **No volver a digitar.** Los educadores ya tienen su lista firmada en papel;
   volver a tipear nombre por nombre es duplicar trabajo. Tienen medio día a la
   semana para tareas administrativas.
3. **La lista debe salir del sistema.** Descargar el PDF ya lleno, hacerlo firmar
   en campo, y subirlo como evidencia.
4. **Marcar con checks, idealmente desde el celular.**

Cita de la reunión (María del Carmen Apestigue):
> *"Si yo tengo mis evidencias, mi lista de participantes, el tema sería otra vez
> digitar ahí los nombres de cada uno de mis usuarios. Ese trabajo para mí ya es
> otra vez reescribir la lista."*

## 2. Qué se implementó

**Los padres no se buscan: se derivan.** Al marcar un NNA en el taller, el sistema
ya sabe quiénes son sus familiares porque están en `NNA_FAMILIAR`, capturados en la
ficha F03. El educador solo marca checks. Ningún nombre se vuelve a escribir.

```
NNA marcado en el taller
   └─ NNA.CARPETA_ID → NNA_FAMILIAR.CARPETA_ID
        └─ candidatos: Madre, Padre, Abuela… (nombre, DNI, parentesco)
             └─ el educador marca → F11 sale impreso y listo para firmar
```

Dos hermanos de la misma carpeta comparten padres: la consulta agrupa por familiar
para que no aparezcan duplicados.

## 3. Cambios de base de datos

`PARTICIPANTE_TALLER` pasa a ser **polimórfica**: cada fila es un NNA o un familiar,
nunca ambos. Se eligió esto en vez de una tabla paralela para que F10 y F11 se
alimenten de la misma consulta y la asistencia funcione igual para los dos.

| Columna | Cambio |
|---|---|
| `TIPO` | **nueva** — `'NNA'` \| `'FAMILIAR'`, default `'NNA'`, NOT NULL |
| `FAMILIAR_ID` | **nueva** — FK a `NNA_FAMILIAR(ID)`, nullable |
| `NNA_ID` | pasa de NOT NULL a **nullable** |

Restricciones añadidas:

- `CK_PT_TIPO` — el tipo solo admite los dos valores.
- `CK_PT_REFERENCIA` — exactamente una referencia informada según el tipo.
- `UX_PT_TALLER_NNA` / `UX_PT_TALLER_FAMILIAR` — índices únicos **basados en función**;
  cuando la referencia es NULL todas las columnas indexadas quedan NULL y Oracle no
  indexa la fila, así N familiares del mismo taller no colisionan entre sí.

**Script:** `services/talleres-service-py/src/infrastructure/db/migrations/002_participante_familiar.sql`
Es **idempotente**: verifica el diccionario de datos antes de cada `ALTER`, informa qué
aplicó y qué omitió, y puede volver a ejecutarse sin error. Las filas existentes quedan
como `TIPO = 'NNA'` por el DEFAULT.

```bash
sqlplus sec_user/clave@localhost:1521/XEPDB1 @.../002_participante_familiar.sql
```

**Con DBeaver / SQL Developer / DataGrip usa
`002_participante_familiar_DBEAVER.sql`.** El script principal usa `SET SERVEROUTPUT ON`
y `PROMPT`, que son comandos de SQL\*Plus; un cliente JDBC intenta ejecutarlos como SQL
y falla con `ORA-00922: falta la opción o no es válida`. La versión DBEAVER son
sentencias planas que se ejecutan una por una.

### Degradación cuando la migración está pendiente

El repositorio consulta `USER_TAB_COLUMNS` una vez por proceso
(`familiares_habilitados()`) y, si las columnas no existen, usa una consulta legacy
que sintetiza `TIPO` y `FAMILIAR_ID` como literales. Resultado: el módulo de talleres
sigue operando con normalidad (sin padres) en vez de devolver `ORA-00904` en cada
llamada, y los endpoints de familiares responden `409` con un mensaje explícito.
El servicio imprime un aviso al arrancar.

Esto se agregó porque un despliegue de código sin la migración dejaba caído todo el
módulo, incluido el alta de talleres que ya funcionaba antes.

## 3.b Selector único (agosto 2026)

Los dos botones iniciales ("Seleccionar de mi sede" + "Agregar padres / tutores") se
fusionaron en **un solo botón "Agregar participantes"**, con la lista en forma de
**acordeón**: se ven solo los NNA, uno por fila, y la familia se despliega al tocar la
fila. Doce chicos son doce filas, no veinticuatro.

Las dos acciones están separadas a propósito:

| Dónde se hace clic | Qué pasa |
|---|---|
| El cuadrito de la izquierda | Marca o desmarca al NNA |
| El resto de la fila | Abre o cierra su familia, sin tocar la selección |

Así se puede mirar quién es la familia de un chico sin inscribirlo sin querer.

- `GET /api/talleres/{id}/candidatos` devuelve el árbol completo — NNA del ámbito del
  usuario (sus casos activos; toda la sede si es coordinación) con `familiares[]` anidados
  y flags `yaInscrito` en ambos niveles.
- Cada fila muestra **contador + chevron** ("1 familiar", "2 familiares"). Al marcar
  familiares pasa a "1 de 2" en color primario. Los NNA sin familiares en su F03 muestran
  "sin familia" en ámbar y no despliegan.
- Dentro del desplegado, **"Marcar toda la familia"** cuando hay más de un familiar.
- Filtros **Todos / Solo NNA / Con familia**.
- La búsqueda alcanza al NNA y a sus familiares; si la coincidencia está en un familiar,
  ese NNA se abre solo para que se vea por qué aparece en los resultados.
- Todo se envía en una sola llamada a `/participantes/bulk`.

## 3.c Evidencias en el expediente digital (agosto 2026)

La lista de asistencia firmada y las fotos del taller se archivan en el **expediente
digital de cada participante**. No hay tabla nueva: el folio es la única fuente de verdad.

### Cómo funciona el expediente digital (verificado en código)

`ExpedienteDigitalDocs` (`ExpedientePage.tsx`) es una tabla foliada que mezcla cuatro
fuentes vía `loadDocuments()` en `nna.store.ts`:

| Fuente | Aporta |
|---|---|
| nna-service | F03 generado al vuelo, con páginas reales de `/nna/{id}/pdf/pages` |
| intervencion-service | F04 diagnósticos |
| expediente-service (`EXP_FOLIO`) | F05, F12, informe situacional, diario de campo y **todo lo subido** |
| localStorage | residuo de la etapa mock, se deduplica por `filename` o `id` |

**El foliado se calcula en el navegador, no en la base de datos:**

```js
const sortedAsc = [...documents].sort((a,b) => fecha_a - fecha_b);
let currentFolio = 1;
sortedAsc.map(doc => {
    const start = currentFolio;
    const end   = currentFolio + doc.pages - 1;
    currentFolio = end + 1;
    return { ...doc, folioStart: start, folioEnd: end };
});
```

Ordena por fecha ascendente, acumula **páginas**, y luego invierte para mostrar lo más
reciente arriba. Es un legajo foliado hoja por hoja, como el físico.

> **Consecuencia:** `pages` no es cosmético. Un valor incorrecto corre el foliado de todos
> los documentos posteriores de ese NNA.

**Bug preexistente corregido (migración 005).** `EXP_FOLIO` no guardaba el número de
páginas, así que `loadDocuments` asumía `pages = 1` para todo documento subido. Una lista
firmada de 3 hojas se foliaba como una sola y corría el rango del resto del legajo — justo
lo que un expediente foliado no admite. `/expediente/upload` ya contaba las hojas con
pypdf; solo faltaba dónde guardarlas:

- `EXP_FOLIO` gana la columna **`PAGINAS`** (`DEFAULT 1`, que preserva el comportamiento
  anterior para las filas existentes).
- `AgregarFolioRequest` la acepta y ambos GET la exponen.
- La evidencia del taller y el modal genérico del expediente envían el conteo real de
  pypdf, no el que escriba el usuario en "Cant. Folios".
- `loadDocuments` usa `f.paginas` en vez de la constante 1.

Otros dos detalles que condicionan el diseño:

- **El color del icono depende del nombre del tipo:** `type.includes('FICHA') ? azul :
  type.includes('DNI') ? primario : rojo`. Por eso los tipos del taller empiezan con
  "FICHA" — si no, aparecerían en rojo, que en esa tabla se lee como alerta.
- **`EXP_FOLIO` no tiene columna de estado.** Los folios del backend se muestran siempre
  como `APROBADO`; `PENDIENTE_FIRMA` solo existe en localStorage. Por eso el taller
  archiva únicamente cuando se sube el documento **ya firmado**.

### Flujo

```
Descargar F10/F11 (ya lleno)  →  imprimir y hacer firmar  →  subir desde el taller
     └─ 1 upload del archivo
     └─ N folios, uno por participante, todos con el mismo ARCHIVO_URL y TALLER_ID
     └─ aparece solo en el expediente de cada NNA (loadDocuments ya lee EXP_FOLIO)
```

Los familiares no tienen caso propio: su evidencia queda en el expediente del NNA del
mismo expediente familiar. Un NNA sin caso abierto no se puede foliar, y el sistema lo
avisa por nombre en vez de fallar en silencio.

### Cambios

- `EXP_FOLIO` gana **`TALLER_ID`** (nullable, indexado). Migración
  `004_folio_taller.sql` — hay versión `_DBEAVER` con el esquema calificado.
- expediente-service: `AgregarFolioRequest` acepta `taller_id`; nuevo
  `GET /api/expediente/taller/{id}` para listar lo archivado por un taller.
- talleres-service: `GET /api/talleres/{id}/destinos-folio` devuelve el caso activo de
  cada participante. Se consulta **solo al subir evidencia**, no en cada listado.
- `client/src/api/evidencias.api.ts`: orquesta upload + foliado en cascada, agrupa los
  folios por archivo, y convierte imágenes a PDF.
- `TalleresPage`: bloque "Evidencias" en la pestaña de Ejecución.

### Tipos de documento

`EXP_FOLIO.TIPO_DOCUMENTO` es `VARCHAR2(30)` — se confirma en los mapeos truncados del
store, p. ej. `'FICHA DE SEGUIMIENTO FAMILIAR '` (exactamente 30 caracteres).

| Constante | Valor | Largo |
|---|---|---|
| `TIPO_LISTA_NNA` | `FICHA ASISTENCIA NNA (F10)` | 26 |
| `TIPO_LISTA_FAMILIAS` | `FICHA ASISTENCIA FAMILIA (F11)` | 30 |
| `TIPO_FOTOS` | `FICHA EVIDENCIA TALLER` | 22 |

### El bloque en pantalla

El orden importa: el **resumen de lo archivado va arriba**, antes de los botones. En la
primera versión estaba debajo y quedaba fuera de la pantalla visible, así que el educador
subía el archivo y no veía ninguna confirmación — parecía que no había pasado nada.

Los botones de subida **se habilitan al descargar el formato correspondiente**: no tiene
sentido "subir el F10 firmado" sin haberlo impreso primero. `handleDownloadPDF` registra
qué formato se descargó y el botón se desbloquea. Si ya hay evidencia archivada de ese
tipo (de una sesión anterior), el botón queda habilitado y dice "Reemplazar".

### Fotos

`/expediente/upload` valida los magic bytes `%PDF-` y rechaza cualquier otra cosa. Como el
educador fotografía la lista con el celular, `imagenAPdf()` redimensiona a 1600px, comprime
a JPEG 0.8 y lo envuelve en un PDF A4 de una página. Así el conteo de páginas sigue
funcionando y el expediente queda homogéneo, sin tocar el backend.

## 3.d Vista móvil (agosto 2026)

Pedido de la reunión: *"lo puedo adecuar para que pueda ser usado en un celular y ustedes
solamente den check, check, check"*. Probado a **390 px**.

| Problema | Solución |
|---|---|
| El calendario tenía `grid-cols-7` fijo: columnas de ~50 px, ilegibles | `overflow-x-auto` con `min-w-[640px]` — el mes se recorre en horizontal y cada día conserva su ancho |
| Título y botones en un `flex justify-between` sin wrap: se aplastaban | `flex-wrap` con `gap`, los botones bajan a su propia fila |
| La columna "Evaluación F8" apretaba las dos columnas útiles | `hidden sm:table-cell` — el F8 se llena sentado, no en campo |
| El código de carpeta forzaba dos líneas por fila en el selector | Se oculta en móvil; basta el documento. Pasa de 5 a 7 NNA por pantalla |
| "Seleccionar todo" se apretaba contra los filtros | Ocupa su propia línea en móvil (`w-full sm:w-auto`) |

El modal del selector ya funcionaba: `max-w-xl` con `p-4` se adapta solo, y los checkboxes
tienen tamaño suficiente para el dedo.

## 3.e Estado derivado de los datos (agosto 2026)

El estado ya no se marca a mano: `recalcular_estado()` lo deduce de la asistencia y las
evaluaciones registradas.

| Situación | Estado |
|---|---|
| Nadie asistió todavía | `PLANIFICADO` |
| Hay asistentes, falta evaluar a alguno | `EJECUTADO` |
| Todos los NNA que asistieron tienen su F8 | `EVALUADO` |

Solo cuentan los NNA: el Formato 8 es evaluación individual del NNA y los familiares no se
evalúan. Un taller `CANCELADO` no se toca.

Se recalcula tras cada operación que puede cambiarlo: marcar asistencia, evaluar, agregar
o quitar participantes, y ejecutar el taller. `ejecutar_taller` ya no fuerza `'EJECUTADO'`
— solo sella `FECHA_EJECUCION` y deja que el estado se derive.

Verificado en vivo sobre el taller 147: marcar asistencia → `EJECUTADO`, evaluar →
`EVALUADO`, desmarcar → `PLANIFICADO`.

**Bug corregido de paso.** `updateTaller` decidía a qué endpoint llamar mirando
`estado === 'PLANIFICADO' && sin participantes`. Con el estado derivado eso significaba
que editar la planificación de un taller ya ejecutado disparaba `/ejecutar`, que borra y
reinserta toda la lista de NNA. Ahora recibe un parámetro `modo` que viene de la pestaña
abierta, que es lo que el usuario realmente está haciendo.

Ambas comprobaciones de migración (`familiares_habilitados`, `estado_evaluado_habilitado`)
degradan con elegancia: sin la 003 el taller se queda en `EJECUTADO` en vez de fallar con
`ORA-02290`.

## 4. Endpoints nuevos

| Método | Ruta | Para qué |
|---|---|---|
| `GET` | `/api/talleres/{id}/candidatos` | **Árbol del selector único**: NNA del ámbito del usuario con `familiares[]` anidados y `yaInscrito` en ambos niveles. |
| `GET` | `/api/talleres/{id}/familiares-candidatos` | Padres derivados de los NNA ya inscritos. Quedó como endpoint auxiliar tras el selector único. |
| `POST` | `/api/talleres/{id}/participantes` | Ahora acepta `{nnaId}` **o** `{familiarId}` |
| `POST` | `/api/talleres/{id}/participantes/bulk` | Alta masiva de los checks marcados en campo |
| `PUT` | `/api/talleres/{id}/familiares/{familiar_id}` | Asistencia del familiar |
| `DELETE` | `/api/talleres/{id}/familiares/{familiar_id}` | Quitar familiar del taller |
| `GET` | `/api/talleres/{id}/destinos-folio` | Caso activo de cada participante, para foliar la evidencia |
| `GET` | `/api/expediente/taller/{id}` | Folios que originó un taller (su evidencia archivada) |

Las rutas de NNA (`/participantes/{nna_id}`) no cambiaron: son retrocompatibles.

## 5. Archivos tocados

**Backend** (`services/talleres-service-py`)

- `src/domain/entities/taller.py` — `FamiliarMiniResponse`, `FamiliarCandidatoResponse`,
  `AgregarParticipantesBulkRequest`; `ParticipanteResponse` gana `tipo`/`familiarId`/`familiar`.
- `src/infrastructure/db/repositories/oracle_taller_repository.py` — consulta unificada
  `_PARTICIPANTE_SELECT` con LEFT JOIN a `NNA` y `NNA_FAMILIAR`; los métodos de
  participante ahora reciben `(taller_id, ref_id, tipo)`; nuevo `list_familiares_candidatos`.
- `src/infrastructure/http/routers/taller_router.py` — endpoints de arriba.

**Frontend** (`client/src`)

- `api/talleres.api.ts` — tipos `TipoParticipante`, `FamiliarCandidato`; funciones
  `getFamiliaresCandidatos`, `addFamiliar`, `updateFamiliar`, `removeFamiliar`, `addParticipantesBulk`.
- `features/talleres/TalleresPage.tsx` — botón *"Agregar padres / tutores"*, modal de
  selección, tabla que separa NNA (F10) de familias (F11), contador desglosado.
- `features/nna/components/Formato11Print.tsx` — imprime nombre, DNI y parentesco
  reales; completa hasta 15 filas para asistentes no previstos.
- `features/nna/components/FichaTalleres.tsx` — filtra por tipo al imprimir F10/F11.

## 6. Cómo verificar tipos en el cliente

```bash
cd client && npx tsc --noEmit -p tsconfig.app.json
```

**Importante:** `tsc --noEmit -p tsconfig.json` **no verifica nada**. El tsconfig raíz
tiene `"files": []` y solo declara `references`, por lo que termina con código 0 sin
revisar un solo archivo. Hay que apuntar a `tsconfig.app.json` (o usar `tsc -b`).

## 7. Bugs corregidos de paso

- **`ejecutar_taller` borraba los familiares.** Hacía
  `DELETE FROM PARTICIPANTE_TALLER WHERE TALLER_ID = :1` y reinsertaba solo los NNA
  del payload. Con familiares en la misma tabla eso habría perdido su asistencia en
  cada ejecución. Ahora el DELETE filtra por `TIPO = 'NNA'`.
- **`updateTaller` (frontend)** enviaba todos los participantes al ejecutar,
  incluidos los familiares, que llegaban con `nna_id` nulo. Ahora se filtran.
- **`list_by_nna`** lleva `AND pt.TIPO = 'NNA'` explícito.
- **`toast.exito` no existe** (6 usos en `TalleresPage.tsx`). La API real de
  `components/ui/Toast.tsx` expone `success` / `error` / `info`. Reventaba en runtime al
  agregar participantes, guardar el taller, evaluar y descargar PDF. Pasó desapercibido
  porque la verificación de tipos se estaba corriendo contra el tsconfig raíz vacío.
- **`variante: 'peligro'`** en `confirmar()`: la opción declarada en `ConfirmOptions`
  es `peligro: boolean`.

## 7.b Migraciones a ejecutar

| Script | Servicio | Qué hace |
|---|---|---|
| `002_participante_familiar.sql` | talleres | `TIPO` y `FAMILIAR_ID` en `PARTICIPANTE_TALLER` |
| `003_estado_evaluado.sql` | talleres | Admite el estado `EVALUADO` en `TALLER.ESTADO` |
| `004_folio_taller.sql` | expediente | `TALLER_ID` en `EXP_FOLIO` |
| `005_folio_paginas.sql` | expediente | `PAGINAS` en `EXP_FOLIO` (corrige el foliado) |

La 003 no necesita versión DBeaver: es un bloque PL/SQL sin comandos SQL\*Plus, y localiza
el CHECK anterior por su condición porque se creó inline y tiene nombre generado
(`SYS_Cnnnnn`).

Ambos tienen versión `_DBEAVER` con el esquema calificado (`SEC_USER.`) y sin comandos
SQL\*Plus. **Sin la 004, el bloque de evidencias falla al listar y al archivar.**

## 8. Pendiente (acordado en la reunión, no implementado aún)

1. ~~**Evidencias en el taller**~~ — implementado, ver sección 3.c.
2. ~~**Campos obligatorios opcionales**~~ — revisado: no existía tal bloqueo. El backend
   solo exige `tema` y `fecha_programada`, y el frontend rellenaba el tema con
   `'Sin nombre'` en silencio, que es peor. Ahora se valida explícitamente el nombre y la
   fecha, el esquema metodológico está rotulado "(opcional)" y el resto no bloquea.
3. ~~**Estado derivado**~~ — implementado, ver 3.e.
4. ~~**Vista móvil de checks**~~ — ajustada y probada a 390 px (ver 3.d).
5. ~~**Taller itinerante**~~ — **descartado por decisión funcional (08/2026).**

   Luis planteó en la reunión que un taller puede completarse a lo largo de dos o tres
   semanas. Se evaluó agregar `FECHA_ATENCION` por participante para que el calendario
   mostrara el taller en cada jornada.

   Se descartó: **un taller corresponde a una fecha**. Si el educador atiende en otra
   fecha, registra otro taller. La regla es que lo registrado en un taller es lo que
   ocurrió ese día, sin fechas mezcladas dentro de un mismo registro.

   Implicación: cada registro conserva su propio F10/F11 y su propia evidencia, lo que
   mantiene la trazabilidad documento a documento. El costo es que el educador crea
   varios talleres para una misma campaña — un botón "repetir en otra fecha" que copie
   la planificación resolvería la parte tediosa sin romper la regla.

## 9. Deuda técnica conocida

- La evaluación F8 se guarda concatenada (`"Logros: …\nLimitaciones: …"`) en un
  `VARCHAR2(500)` y se re-parsea al leer. Frágil ante saltos de línea del usuario.
- La metodología codifica INICIO/PROCESO/CIERRE en un solo campo de texto.

Ambas convendría normalizarlas en columnas propias, pero no bloquean este cambio.

---

## 10. Ficha de Logros (F05) — paso de fase sin bloqueo por cumplimiento

**Origen:** reunión SEC 05/08/2026, min 8:27 a 9:38.

Charly había implementado que una fase no se pasaba mientras no se cumplieran todos sus
indicadores. Luis lo corrigió:

> *"No necesariamente todo tiene que cumplirse para pasar. Porque hay chicos que a veces
> en la segunda fase los ponemos a estudiar, le matriculamos, pero por su falta de interés
> o tener retraso escolar ya no van, no quieren asistir. Entonces, si se tiene que cumplir
> todos, entonces nunca pasaremos de fase."*

Y describió cómo cierran en la práctica:

> *"vamos a pasar a la segunda fase, entonces cerramos la primera fase, ponemos de repente
> en el primer logro sí, en el segundo sí, en la tercera proceso, la cuarta no. Queda así.
> Ya no volvemos."*

### Reglas nuevas

| Antes | Ahora |
|---|---|
| La fase siguiente se desbloqueaba con **todos los ítems en SI** | Se desbloquea **solo cuando la anterior fue cerrada** |
| Cerrar exigía los 5 (o 10) ítems en SI | Basta con **un indicador evaluado**, con cualquier valor |
| Un `NO` o un `PROCESO` retenían al NNA | Son evaluaciones válidas; no condicionan nada |

El cierre es un **acto explícito del educador** ("Cerrar Fase I"), no la consecuencia
automática de marcar casillas. Al cerrar se genera el PDF de la fase y se archiva en el
expediente digital, y la fase queda en solo lectura — coherente con *"ya no volvemos a la
primera fase para ver si eso se cumplió"*.

Se pide al menos un indicador evaluado para no archivar en el expediente una ficha
completamente vacía.

### Archivos tocados

- `services/intervencion-service-py/.../proceso_logros_router.py` — endpoints
  `cerrar-fase/{n}` y `finalizar`: se elimina la validación de "todos en SI" y se
  reemplaza por "la fase anterior debe estar **cerrada**" + "al menos un indicador
  evaluado".
- `client/src/features/nna/components/Formato5Logros.tsx` — `faseNDesbloqueada` depende
  solo del cierre.
- `client/src/features/nna/components/LogrosList.tsx` — el botón "Cerrar Fase" aparece con
  un indicador evaluado; los textos ya no afirman "todos los logros en SÍ".

### Verificación en vivo

Sobre el F05 `161` (PEDRO), que tenía **1 de 5** indicadores marcados:

| Prueba | Resultado |
|---|---|
| Cerrar Fase I con 1 de 5 marcados | `200 OK` — antes daba `422` |
| Cerrar Fase II sin cerrar la I | `422 · "Debe cerrar la Fase I antes de cerrar la Fase II"` |

---

## 11. Pendiente de la reunión (F05 y Situacional)

Lo acordado que todavía no está implementado:

**Ficha de Logros**

1. ~~Fecha de **inicio y término** por fase~~ — implementado, ver sección 12.
2. ~~La fase I arranca en la **fecha de inscripción**~~ — implementado.
3. ~~La fecha de término se **jala como inicio** de la siguiente~~ — implementado (día siguiente).
4. ~~Duración referencial visible~~ — implementado como texto informativo.

**Informe Situacional y PII**

5. **Quitar la sección de Plan de Trabajo Individual**: el PII va dentro del informe
   situacional como un ítem más, no como documento aparte.
6. El informe se llena en el sistema y al finalizar **genera un Word** para tramitar por
   SGD.
7. **Numeración correlativa por educador**, hoy manual.
8. El informe es **por familia, no por NNA**: cinco hermanos, un solo informe, aunque cada
   hermano tenga su propio file.


## 12. F05 — fecha de inicio y término por fase

**Origen:** reunión SEC 05/08/2026, min 12:13 a 19:42. Migración `011_logros_fechas_fase.sql`.

La ficha solo tenía una fecha por fase, la de evaluación. María del Carmen lo señaló como
un vacío de su propia ficha física:

> *"No hay fecha de término porque todos entendemos que son tres meses nada más. (...) esa
> es una de las debilidades que se ha tenido: no tener ahí plasmado en esta ficha las
> fechas."*

### Reglas

| Campo | Comportamiento |
|---|---|
| **Inicio Fase I** | Fecha de inscripción del NNA. Bloqueado |
| **Inicio Fase II / III** | **Día siguiente** al término de la fase anterior. Bloqueado |
| **Término** | Único campo editable, en las tres fases |
| Duración | Solo texto de referencia: 3 / 15 / 6 meses. No valida ni bloquea |

El encadenado sigue el ejemplo textual de María del Carmen: *"Supongamos que terminó el 30
de agosto la fase 1, la fase 2 tendría que empezar el primero de septiembre"*.

No hay contador de días transcurridos: cuando se ofreció, Luis respondió *"No, solamente
fecha de inicio y fecha de culminado"*. Y sobre los plazos advirtió *"puede pasar un
poquito más, es relativo, pero tenemos esa referencia"* — por eso la duración se muestra
pero no restringe.

### Datos existentes

`F*_FECHA` era la fecha de evaluación, que es el mismo dato que el término: el día en que
se evalúa la fase es el día en que se cierra. La migración la copia a `F*_FIN`, deriva los
inicios hacia atrás y **deja la columna original intacta**. El código ya no la lee, pero la
sigue escribiendo con el mismo valor que el término, así que nada que dependa de ella se
rompe.

### Verificación en vivo

F05 `262` (HAVER CAMPOS), tras la migración:

| Campo | Valor |
|---|---|
| Fecha de ingreso | 29/06/2026 |
| Fase I · inicio | 29/06/2026 — de la inscripción |
| Fase I · término | 04/08/2026 — era la fecha de evaluación |
| **Fase II · inicio** | **05/08/2026** — día siguiente |

En pantalla: el inicio aparece bloqueado con candado y la leyenda "Fecha de inscripción del
usuario"; el término es editable; debajo "Referencia: 3 meses → 29/09/2026".

---

## 13. Hermanos y detección de coincidencias (agosto 2026)

### 13.1 Hermanos entre NNA

El informe situacional se hace por familia — *"cuando son hermanos, se hace un solo
informe de todos los hermanos"* (Luis) — pero **los expedientes son individuales**: una
carpeta = un NNA, y cada hermano conserva su propio file. Hacía falta saber quiénes son
hermanos sin mezclar expedientes.

**Tabla `NNA_HERMANO`** (`create_nna_hermano.sql`). El par se guarda una sola vez y
ordenado (`NNA_ID_MENOR < NNA_ID_MAYOR`, con `CHECK`), así es imposible que quede A→B sin
B→A. Los descartes se guardan con estado `DESCARTADO` para no repetir la pregunta.

**Cuándo salta el aviso.** Al guardar un integrante de la familia, en la ficha de
inscripción o en el diagnóstico social — comparten la misma lista de familiares:

| Señal | Qué busca |
|---|---|
| Parentesco "Hermano/a" (`vinTutUsu = 4`) | Ese nombre entre los NNA del servicio |
| Padre o madre (`vinTutUsu = 1`) con DNI | Ese DNI entre los familiares de otros NNA |

La segunda detecta hermanos de **distinto apellido** — *"tres hermanas de diferentes
padres y el mismo apellido de la mamá"* — que una búsqueda por nombre nunca encontraría.

**Si el hermano no está registrado**, el aviso lo indica: sin ficha propia no tiene caso,
y el informe habla de cada hermano con su caso. Se ofrece registrarlo.

El sistema **sugiere; el educador confirma**. Si la detección falla, no frena el registro.

### 13.2 Buscar coincidencias en el F03

La búsqueda anterior comparaba por igualdad exacta (`UPPER(APELLIDO_PATERNO) = :ap_pat`).
Los nombres se recogen en la calle, muchas veces de oído: un tipeo y el duplicado pasaba
sin que nadie se enterara.

| Problema anterior | Ahora |
|---|---|
| Apellido paterno exacto | Similitud normalizada (sin tildes, sin espacios dobles) |
| Exigía apellido paterno **y** nombres | Busca con cualquier dato disponible |
| El DNI cortaba la búsqueda de homónimos | Una sola pasada: detecta el mismo NNA con otro documento |
| En edición se encontraba a sí mismo | Se excluye el propio `id` |
| Solo informaba | Acciones: abrir el expediente o descartar |

**Puntajes:** documento igual 100 · apellido paterno 25 · materno 20 · nombre 25 ·
apellidos invertidos 35 · misma fecha de nacimiento 30. Se muestran los que pasan de 45,
lo que evita que un apellido suelto dispare ruido.

La similitud se calcula en Python con `SequenceMatcher` y no con `UTL_MATCH` de Oracle,
para no depender de un paquete que puede no estar instalado.

**Verificado contra datos reales:**

| Búsqueda | Resultado |
|---|---|
| `CAMPOS VERGARA, HAVER` | Encontrado — "Nombre y apellido 100% similares" |
| `CANPOS BERGARA, HAVER` | **Encontrado** — "83% similares" |
| `VERGARA CAMPOS, HAVER` | Encontrado — "Apellidos en orden invertido" |
| Solo `CAMPOS` | Nada (no alcanza el umbral) |

**Qué pasa al encontrar.** Cada candidato ofrece *"Es el mismo NNA"* —abre su expediente
en otra pestaña, para no perder lo escrito en la ficha en curso— o *"No es"*, que lo quita
de la lista. Y si el documento es idéntico, el guardado pide confirmación explícita: no se
bloquea, pero no se crea sin haberlo visto.

---

## 14. F05 — la fase cerrada no mostraba lo evaluado (bug)

Eran **dos** defectos encadenados. El de fondo: al cerrar la fase el educador ni siquiera
se quedaba en la pantalla donde se ven los indicadores.

### 14.0 Cerrar la fase expulsaba del formulario

`handleCerrarFase` terminaba en `onSuccess(resultado)`, y ese callback en `ExpedientePage`
hace `setShowLogrosForm(false)`: devolvía al educador a las tarjetas de resumen, que solo
muestran "Archivada · 5/5". De ahí el reclamo *"no se muestra qué es lo que marcaste"* —
lo marcado estaba guardado y bien pintado, pero la pantalla ya no era esa.

`onSuccess` lo comparten *Actualizar F05* y *Cerrar fase*, así que ahora el segundo pasa
`{ mantenerAbierto: true }`. Con esa bandera el padre recarga el F05 (`getLogrosById`) y
los documentos —de `documents` sale si la fase está cerrada— y **no cierra el formulario**.
El educador se queda en la misma fase, ya en solo lectura, viendo lo que archivó.

### 14.1 Los tres botones salían iguales


Al cerrar una fase, la ficha queda en solo lectura. Pero los tres botones (SÍ / NO / EN
PROCESO) se veían **los tres iguales en gris**: no había forma de saber qué se marcó. El
dato estaba guardado; simplemente no se pintaba.

**Causa raíz.** En `StatusButton` la condición de fase cerrada se evaluaba *antes* que la
de seleccionado, así que ganaba siempre y todos los botones recibían la misma clase:

```js
${faseCerradaActual
    ? 'opacity-60 cursor-not-allowed bg-surface-muted …'   // los tres idénticos
    : selected ? colorClass : '…'}
```

**Arreglo.** Se invirtió el orden: primero se pregunta si está seleccionado. El botón
marcado conserva su color (sin el anillo de foco, que sugeriría que se puede cambiar) y
los otros dos se apagan. Además queda un `title`: *Evaluado como "SÍ" — fase cerrada*.

De paso, la fecha de término y las observaciones usaban `opacity-60`, que atenúa el propio
texto. En solo lectura conviene lo contrario —que el dato se lea bien—, así que ahora el
"no editable" se señala con el fondo (`bg-surface-muted`) y el texto queda a plena
opacidad. El fondo se escribe como **un solo `bg-*` condicional**, no como `bg-surface` más
otro `bg-*` encima: entre dos clases de fondo Tailwind resuelve por el orden de la hoja de
estilos, no por el orden del atributo, y el cambio podía no aplicarse nunca.

**Verificado** en el F05 `262` (HAVER CAMPOS), Fase I cerrada 5/5: los cinco indicadores
muestran su **SÍ** en verde y las opciones no elegidas quedan apagadas. Las observaciones
de una fase cerrada se leen en negro sobre el fondo gris (`opacity: 1` comprobado en el
estilo calculado).

---

## 15. F04 — fechas de aplicación automáticas y bloqueadas

Los dos campos de *Fecha de Aplicación de la Ficha* estaban editables aunque el texto de
ayuda prometía que se llenaban solos. Contradicción visible: el educador veía un campo en
blanco que le pedía escribir y, debajo, una nota diciendo que no hacía falta.

Ahora las pone el sistema y **no se tocan nunca**:

| Campo | Cuándo se fija | Estado en pantalla |
|---|---|---|
| Inicio de aplicación | Al abrir la ficha (día en que se empieza a llenar) | Gris, con candado, ya con la fecha |
| Fin de aplicación | Al pulsar *Guardar* (finalizar la ficha) | Gris, con candado; en blanco mientras sea borrador |

El inicio deja de nacer vacío (`fechaInicioAplicacion: getTodayLocal()`), así el educador ve
desde el principio la fecha con la que va a quedar registrada la ficha. Si el F04 se aplica
en varias sesiones —que es lo normal—, el inicio se conserva del primer guardado y solo el
fin se sella al cerrar.

El backend ya hacía lo correcto (`diagnostico.py`: si no llega fin y no es borrador, pone
hoy), así que el cambio es solo de interfaz.

**Ojo con los F04 anteriores.** Los que se finalizaron antes de esta lógica pueden tener el
fin en blanco aunque figuren como *Completo* — el F04 de HAVER CAMPOS es uno. Se corrigen
solos la próxima vez que se guarden; no hace falta migración.

---

## 16. Expediente — se ocultan dos módulos del menú

| Módulo | Por qué |
|---|---|
| **Plan de Intervención Individual** | Deja de ser un módulo aparte: va como una sección dentro del Informe Situacional. *"Está dentro del informe situacional, como te decíamos"* (Mari). Luis lo ubica como el **ítem 6** del informe: por cada fase, el tiempo y las actividades — Fase I 3 meses, Fase II 15, Fase III 6. |
| **Seguimiento (Posterior Egreso)** | No está normado todavía. |

**No se borró nada.** El componente `PlanIntervencion`, sus rutas, sus endpoints y los
datos ya registrados siguen intactos. Lo único que cambia es que los dos botones dejan de
pintarse en el menú lateral:

```js
const MODULOS_OCULTOS = ['pti', 'seguimiento'];
```

Para volver a mostrar uno basta con sacarlo de esa lista.

`renderContent` también consulta la constante: si `activeTab` quedara apuntando a un módulo
oculto —al volver de otra pantalla, por ejemplo— cae al Resumen del Caso en vez de a una
vista que ya no se puede alcanzar desde el menú.

Se mantiene **Seguimiento Familiar (Formato 12)**, que sí es un formato oficial.

---

## 17. Informe Situacional — estructura del modelo oficial

Base: `05 SITUACIONAL HNOS RUIZ CULQUI.pdf`, informe real de María del Carmen para
**cinco hermanos en un solo documento**. Confirma tres cosas de la reunión: el PII va
dentro del informe (ítem VI), el correlativo es por educador, y el informe es por familia.

### 17.1 Las ocho secciones

| # | Sección | Antes | Dónde se guarda |
|---|---|---|---|
| I | Datos Generales de la NNA | Un solo NNA, a mano | **No se guarda**: sale del mismo objeto que alimenta el Resumen del Caso |
| II | Antecedentes del Caso | "Antecedentes y Circunstancias del Hallazgo" | `ANTECEDENTES` |
| III | Acciones Realizadas | "Estrategias de Acercamiento" | `ESTRATEGIAS` |
| IV | Situación Familiar | Partida en 4.1 salud / 4.2 educativa / 4.3 familiar | `SITUACION_FAMILIAR`, texto único |
| V | Indicadores de Vulnerabilidad | No existía | `INDICADORES_VULNERAB` |
| VI | Plan de Intervención Individual | Módulo aparte | `PII_FASE1/2/3` |
| VII | Apreciación Profesional | Parte de "Conclusiones y Recomendaciones" | `CONCLUSIONES` |
| VIII | Recomendación | Parte de la misma sección | `RECOMENDACIONES` |

Al abrir un informe viejo, los tres campos de la sección IV se juntan en el texto único.
`SITUACION_SALUD` y `SITUACION_EDUCATIVA` quedan sin uso pero no se borran.

### 17.2 Un informe para varios hermanos

Tabla puente `EXP_INFORME_NNA`. El expediente sigue siendo individual; lo compartido es el
informe. Los candidatos salen de la lista `familia` que ya usaba el Resumen del Caso —el
"Grupo Familiar en esta Carpeta"—, así que el selector no necesitó consulta nueva.

La selección la hace el educador y no el sistema: *"si es de tiempo en tiempo que se
inscriben o se encuentran hermanos, su informe se hace de manera separada porque no es el
mismo tiempo ni la misma situación"* (Mari).

También se quitó `UNIQUE (CASO_ID)`: el informe se rehace a lo largo del proceso —el modelo
es de Fase II, no de Fase I— y cada uno se archiva como folio propio.

### 17.3 Correlativo por educador

`N°005-2025-INABIF-IQU/MCAG`, como el modelo. Antes era `F09-IQU-2025-0001`, contado por
sede, que no coincide con el número que el educador escribe a mano: *"cada uno maneja su
numeración"* (Luis). Las iniciales salen de `SEC_USUARIO.NOMBRE_COMPLETO` descartando las
partículas ("de", "del", "la"). Se usa `MAX(CORRELATIVO)` y no `COUNT`: si se borra un
informe, el siguiente no debe reutilizar un número que ya salió en un documento enviado.

### 17.4 Degradación sin la migración 006

Mismo patrón que en talleres: `migracion_006_aplicada()` consulta `ALL_TAB_COLUMNS` una vez
y **cachea solo el resultado positivo**, para que la migración se pueda aplicar con el
servicio arriba. Sin ella el módulo sigue funcionando con el esquema viejo (un informe por
caso, sin secciones V y VI).

Se detectó en el navegador antes de entregarlo: el primer intento devolvía **500** porque el
SELECT pedía columnas que aún no existían — el mismo error que ya había cometido con
`PT.FAMILIAR_ID`.

### 17.5 Bug encontrado de paso: nivel educativo invertido

Al extraer los catálogos de `ResumenCaso.tsx` a `client/src/data/catalogos-sec.ts` apareció
que `NIVEL_EDUCATIVO_MAP` contradecía al diccionario oficial (ítem 65, `NIV_EDU`):

| Código | Mostraba | Diccionario |
|---|---|---|
| 3 | Primaria Completa | **Primaria Incompleta** |
| 4 | Primaria Incompleta | **Primaria Completa** |
| 5 | Secundaria Completa | **Secundaria Incompleta** |
| 6 | Secundaria Incompleta | **Secundaria Completa** |
| 7 | EBE (Esp. Básica) | **Superior No Univ. Incompleta** |
| 8 | Superior | **Superior No Univ. Completa** |
| 9, 10, 11 | *(faltaban)* | Superior Univ. Incompleto / Completo / Básica Especial |

Corregido contra el diccionario. Afectaba a la ficha completa, no solo al informe.

### 17.6 Migración a ejecutar

`expediente-service-py/.../migrations/006_informe_situacional_v2.sql` — calificada con
`SEC_USER.` para poder correrla desde DBeaver conectado como SYSTEM.

---

## 18. Informe Situacional — Word, informe firmado y el ojito que no abría

### 18.1 Bug: el visor no mostraba el PDF

El folio se creaba bien y el PDF se generaba, pero el ojito no mostraba nada. La causa
estaba en la dirección con la que se guardaba el folio:

```python
archivo_url = f"/api/informe-situacional/caso/{caso_id}/pdf"
```

Esa es la ruta **interna del servicio**. El navegador llega al expediente-service por
`/api/expediente-service/...`, así que pedía una dirección que el proxy no conoce → 404.
Se nota comparando con los folios del F05, que se guardan con la ruta completa porque los
crea el cliente; el del informe situacional era el único creado por el backend.

**Arreglo en el store, no en la base** (`normalizarUrlFolio`): si el `archivo_url` es
relativo y empieza con `/api/` pero no con el prefijo de un servicio conocido, se le
antepone. Así quedan arreglados de una vez los folios que ya estaban guardados mal, sin
migración de datos. Era un bug preexistente.

### 18.2 Descargar Word

`GET /informe-situacional/caso/{id}/word` genera el `.docx` con `python-docx`: membrete
INABIF, número correlativo, las ocho secciones y el bloque de firma con los datos del
educador. Las secciones II, III, V y VI salen como viñetas —una línea del textarea es una
viñeta— y IV, VII y VIII como párrafos justificados.

**Solo para informes FINALIZADOS**: un borrador todavía puede cambiar y no debería salir de
la institución. Si se pide de un borrador, responde 409 con el motivo.

`python-docx` se importa **dentro de la función**. Si la librería no está instalada, falla
ese endpoint con un 503 que dice qué instalar, en vez de tumbar el arranque del servicio.

### 18.3 Subir el informe firmado

El circuito real: el educador descarga el Word, lo firma, lo tramita por SGD y sube el
documento firmado o el cargo de recepción.

Ese archivo **se suma, no reemplaza**: queda como folio propio con tipo
`INFORME SITUACIONAL FIRMADO`, junto al PDF que genera el sistema. El expediente foliado no
pisa ni borra documentos, y los dos tienen valor distinto — el generado es el contenido del
sistema, el firmado es el que tiene valor oficial.

Reutiliza el mecanismo de las evidencias de talleres: se sube una vez, se convierte a PDF si
es una foto, y se folia con las páginas reales contadas por pypdf.

### 18.4 El PDF también tiene ahora las ocho secciones

`pdf_generator_f09.py` seguía con la estructura vieja de cinco. Quedaba incoherente que el
Word tuviera ocho y el PDF —que es el que se archiva en el expediente— cinco.

### 18.5 Qué hay que hacer para que esto funcione

1. `pip install -r requirements.txt` en `expediente-service-py` (agrega `python-docx`).
2. **Reiniciar el expediente-service**: el generador de PDF y el de Word son módulos nuevos.
3. Ejecutar la migración `006_informe_situacional_v2.sql` si aún no se corrió.

---

## 19. Formatos oficiales impresos — revisión contra el original

Se compararon los formatos que genera el sistema contra los originales escaneados (F10 y
F11). Aparecieron tres defectos que dejaban columnas enteras en blanco en el papel.

### 19.1 Tres bugs que afectaban a varios formatos

| Problema | Dónde | Efecto |
|---|---|---|
| El sexo se comparaba contra `'M'` / `'F'` | F10, F03 | El catálogo SEC guarda `'1'` y `'2'` — las columnas **H y M salían siempre vacías** |
| La edad se calculaba restando solo los años | F10 | Un NNA que cumple en diciembre aparecía con **un año de más** casi todo el año |
| "Dirigido a" comparaba contra un texto exacto | F07, F08, F10, F11 | Los talleres creados desde la ficha del NNA se guardan como `'NNA'` y **no marcaban ninguna casilla** |

Los tres se resolvían por separado en cada formato, así que se sacaron a
`client/src/utils/formatos.ts`:

- `esHombre()` / `esMujer()` — aceptan `'1'`, `'M'`, `'H'`, `'HOMBRE'`, `'MASCULINO'` y sus
  equivalentes femeninos, porque el dato llega de tres sitios con formatos distintos.
- `edadDe()` — prefiere el campo `edad` ya registrado y solo deduce de la fecha de
  nacimiento si falta. Devuelve cadena vacía y no `0`: en una lista de asistencia una celda
  vacía se entiende, un cero confunde.
- `marcaDirigido()` — normaliza los valores, **admite marcar más de una casilla** (el
  formato oficial lo permite: un taller puede tener niños y adolescentes) y, cuando el
  taller solo dice `'NNA'`, deduce las casillas de las edades de los participantes usando
  el corte de 12 años del diccionario.

### 19.2 El Formato 11 no se parecía al oficial

| Oficial | Estaba | Ahora |
|---|---|---|
| "HERMANOS(AS)-PADRES/TUTORES" · "REGISTRO DE ASISTENCIA" | "FAMILIAS" · "REGISTRO DE ASISTENCIA DE ACTIVIDADES CON FAMILIAS" | Corregido |
| Fila "Dirigido a" | No existía | Hermanos(as) / Padre, Madre, Adulto responsable |
| Columna **Edad** | Faltaba | Agregada |
| Columnas **H** y **M** | Faltaban | Agregadas |
| Columna **Nombre del Hijo/Hija y/o hermano(a)** | Faltaba | Agregada, sale de `nnaRelacionado` |
| Columnas DNI y Parentesco | Sobraban | El parentesco quedó como nota junto al nombre |

**Edad, H y M del F11 salen vacías a propósito.** `NNA_FAMILIAR` solo guarda nombres,
parentesco, DNI y teléfono: el F03 no pregunta la edad ni el sexo del familiar (ver 17.5 y
la revisión del bloque III del F04). Se imprimen igual para que el educador las complete a
mano, como viene haciendo. Si se quiere que salgan llenas, hay que capturar esos dos campos
en el modal de familiares del F03.

**Verificado en el navegador** sobre el taller "Habilidades Socioemocionales": el F10 marca
H y M y la casilla NN; el F11 muestra la columna del hijo/hermano con el NNA acompañado.

---

## 20. Expediente — historial de participación en talleres

La sección **Talleres Socioeducativos (Formatos 07 y 08)** conserva su nombre y su lugar en
el menú. Lo que cambia es lo que muestra.

### 20.1 Se quita el taller individual

*"Si hace un taller X para una fecha, solo en esa debe colocar lo que participaron; si lo
hace en otra fecha tiene que hacer otro registro de taller"*. El taller es grupal y de una
fecha: el F10 tiene quince filas y el F11 se llama "HERMANOS(AS)-PADRES/TUTORES". Un taller
de un solo NNA produce una hoja con una fila y catorce en blanco.

Se quitó el botón **Planificar Taller Individual (F7)** del expediente. Queda solo
*Inscribir en Taller Grupal*. Los talleres individuales ya registrados se siguen viendo.

Efecto colateral que se corta de raíz: esos talleres se creaban con `dirigidoA: 'NNA'`,
valor que ningún formato reconocía — el origen del bug de las casillas "Dirigido a"
(ver 19.1).

> El modal de planificación y su manejador siguen en el código, ya sin acceso. Se dejaron
> a pedido expreso: la instrucción fue quitar el botón, no desmontar la función.

### 20.2 Con quién de su familia asistió

Cada tarjeta muestra ahora los familiares del NNA que participaron en ese mismo taller, con
nombre y parentesco. Los que asistieron van resaltados; los inscritos que no asistieron,
tachados.

El dato existía —`PARTICIPANTE_TALLER` guarda tipo NNA/FAMILIAR y el familiar comparte
`CARPETA_ID` con el NNA— pero no se veía en ninguna parte del expediente. Sostiene los
indicadores del F05 sobre el adulto responsable (3 y 4 de la Fase I, 6 de la Fase II).

`/talleres/historial/{nna_id}` devolvía `participantes: []`. Se agregó una segunda consulta
que trae los familiares de la misma carpeta por taller, y **se declaró
`familiaresAcompanantes` en `TallerResponse`**: sin declararlo, Pydantic lo descartaba en
silencio — el mismo error que ya había cometido con la edad en el F10.

### 20.3 Registros, no tarjetas

La grilla de tarjetas se reemplazó por una tabla. Con nueve talleres obligaba a hacer
scroll para armarse una idea que debería leerse de un vistazo.

**Línea de asistencia.** Una fila de cuadros en orden cronológico: verde asistió, rojo
faltó, y el ícono de personas marca los que fueron con familia. Muestra el patrón del
proceso —si viene sostenido o dejó de venir hace dos meses—, que es lo que hay que juzgar
para marcar el indicador 2 del F05 y hasta ahora no se veía en ninguna parte.

**Filtros que además cuentan.** "Faltó · 2" informa antes de pulsarlo.

**Tabla densa.** Fecha, taller, estado del NNA, quién lo acompañó y la acción pendiente.
La evaluación del F08 va como segunda línea en gris bajo el nombre del taller, solo si
existe. El acompañante muestra el primero y `+N` con el detalle en el tooltip: en 680px no
entran tres nombres. Tras 15 filas aparece "ver los restantes".

Estados que resuelven casos reales: **Faltó** con familia acompañante (pasa: la madre va y
el chico no), y **Sin F08** en ámbar, que es trabajo pendiente del educador.

**Solo cuentan talleres ejecutados** para las cifras; uno planificado todavía no dice nada
del proceso.

Y un botón que copia el párrafo listo para la sección III del Informe Situacional:

> *"HAVER CAMPOS participó en 7 de 9 talleres socioeducativos ejecutados por el servicio,
> siendo su última participación el 07/08/2026. En 4 de ellos asistió acompañado de Karen
> Campos Guerra."*

Hoy el educador redacta eso a mano revisando taller por taller.

**Límite conocido:** el acompañamiento familiar depende de que el educador haya registrado
al familiar como participante. Si el padre firmó el F11 pero nadie lo inscribió en el
sistema, el contador saldrá bajo. Conviene confirmarlo con los educadores antes de usar el
dato como indicador.
