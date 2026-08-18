# Estado del proyecto — SEC

Última actualización: **16/08/2026**

Este archivo dice **en qué punto está el sistema** y **qué falta revisar**. Para
el *porqué* de las decisiones, ver `DECISIONES_DE_DISENO.md`. Para las reglas
permanentes, `AGENTS.md`.

---

## 1. Migraciones

Todas las de abajo **ya se ejecutaron** en la base de Charly.

| Migración | Servicio | Qué hizo |
|---|---|---|
| `010_unique_diagnostico_social_por_nna` | intervencion | Un F04 por NNA |
| `011_logros_fechas_fase` | intervencion | Fechas de inicio y término por fase en el F05 |
| `012_seguimiento_familiar_estado` | intervencion | Borrador del F12 |
| `013_caso_fase_tracking` | intervencion | Tabla `CASO_FASE` y normalización de `NNA_CASO.FASE` |
| `014_diagnostico_estado` | intervencion | `DIAGNOSTICO_SOCIAL.ESTADO` (borrador vs. completo) |
| `004_evaluacion_taller_f08` | talleres | Evaluación del taller en `TALLER.EVAL_*` |
| `007_informe_cierre_circuito_firma` | expediente | `ESTADO`, `DETALLES` y CHECK del F13 |

**El runner de migraciones estaba roto**: tenía una lista escrita a mano que
terminaba en la 009, así que las 010 a 014 **nunca se ejecutaban en un
despliegue nuevo**. Corregido: ahora las descubre con `glob` ordenado por
prefijo numérico (pasó de 20 archivos a 41).

**Verificación pendiente:** la consulta 3 de la migración 014 lista los
borradores de F04 que **ya abrieron expediente digital** con el comportamiento
anterior. Si devuelve filas, hay que revisarlas a mano — el expediente y el
código de carpeta no se revierten.

---

## 2. Lo que se resolvió en esta sesión

### Fases del servicio

La fase estaba representada en **cinco lugares** que no se hablaban. La Fase II
valía 0 en todas las sedes, el Resumen del Caso imprimía "Fase
CONTACTO_INICIAL", y cerrar el F13 no cerraba el caso.

Ahora `NNA_CASO.FASE` es la única fuente, con `CASO_FASE` guardando el
recorrido. Al aplicarlo, **28 de 90 casos estaban en la fase equivocada**.

El vencimiento del plazo **alerta, no promueve**.

### Talleres

El F08 pasó de ser una evaluación por participante a **una por taller**, que es
lo que dice el formato oficial. Los participantes la heredan; quien tenga una
propia la conserva.

El módulo abre en el listado —antes en el calendario—, el listado es tabla con
buscador y filtros, y cada fila lleva a la ficha que toca.

### Informe situacional

Dos combos de derivación al final de la sección VIII, con **26 UPEs** y **1.714
DEMUNAs** (844 acreditadas en verde, 870 no acreditadas en rojo; las 178 no
operativas quedaron fuera).

El ojo se reemplazó por el lápiz: el documento oficial es el Word que va al SGD,
así que la vista HTML no aportaba.

### Ficha de Egreso (F13)

Auditada a fondo. Lo que se corrigió:

- **El circuito de observación no funcionaba**: el educador no podía corregir
  una ficha devuelta, solo volver a firmarla igual.
- Se podía **firmar un borrador** y llegar a FIRMADO sin PDF ni folio.
- El **correlativo se gastaba en el primer guardado**; ahora se asigna al firmar
  el coordinador. Y el NNA egresa ahí, no antes.
- Dos textos iban a columnas equivocadas y reventaban con `ORA-12899`.
- La **modalidad de retiro no se imprimía** (leía un campo que nadie escribía).
- El PDF ya pinta las firmas y la ficha imprime la fase al egreso.

### Ficha de Diagnóstico Social (F04)

Auditada a fondo. Lo que se corrigió:

- **El `PUT` podía escribir sobre la identidad de OTRO NNA**: sincronizaba con
  el `nnaId` del payload sin verificar que fuera el de la ficha.
- **Un motivo dictado largo rompía el guardado entero** (`VARCHAR2(500)` contra
  campos sin tope). Ahora se aplana y corta por bytes; el texto íntegro queda en
  el CLOB.
- **Un CLOB ilegible vaciaba la ficha** y el siguiente guardado la sobrescribía
  en blanco.
- **Siete consultas contaban los borradores como F04 terminado** — incluida la
  que abre el expediente digital.
- **El F04 devolvía 6 de ~40 datos reutilizables al Resumen del Caso.** Ahora
  sube más de veinte, más el perfil del caso y **los familiares nuevos a
  `NNA_FAMILIAR`**.
- Marcar "no estudia" **borraba bullying, expulsión y atraso escolar** — la
  causa de la deserción.
- El PDF imprimía **"Víctima de explotación: NO"** cuando nadie había
  respondido.

### Tablero del educador

Tarjetas de cantidades por periodo (flujo), acciones rápidas como cabecera, y
"Mis Pendientes" con su ticker. Los pendientes ahora **sí navegan** — la ruta a
la que apuntaban no existía— y las alertas abren la lista filtrada.

---

## 3. Lo que falta revisar

### Fichas sin auditar

Prioridad sugerida:

| Ficha | Por qué |
|---|---|
| **F03 Inscripción** | Puerta de entrada; todo lo demás jala datos de ella |
| **F12 Seguimiento Familiar** | Muchos cambios seguidos sin auditar |
| **F08 Talleres** | Cambio de hoy, sin probar en ejecución |
| **Informe Situacional** | Ya se sabe que la derivación no se guarda |
| **F05 Proceso de Logros** | Tocado con el tracking de fases |
| F09, F10, F11, F15 | Más simples, menor riesgo |

### Pendiente del F04 (menor)

- `lugarPernocte` y `tutorEtnia` se imprimen pero no tienen input.
- El PDF no escapa `&` ni `<` sueltos en nombres de familiares y actividades:
  **reportlab aborta el documento entero** ante una etiqueta que no conoce.
- `detalleSinDoc` se imprime bajo la etiqueta "Partida de Nacimiento".
- De `familiares[]` solo salen 7 de 27 columnas en el PDF.
- El `DELETE` del F04 no valida rol ni estado: borra una ficha que ya abrió
  expediente, sin revertir el código de carpeta.
- No hay modo solo lectura: "Ver detalle" abre el formulario editable.

### Pendiente del F13

- **Regenerar el PDF al firmar.** Hoy se arma en el navegador y el coordinador
  firma desde otra página. Lo correcto es generarlo en el backend con reportlab,
  como el F04, F05 y F12.
- **Los DNI del educador y coordinador salen vacíos**: `SEC_USUARIO` no tiene
  columna de DNI.

### Pendiente del informe situacional

- **La derivación no se guarda**: faltan `TIPO_INSTITUCION` e
  `INSTITUCION_CODIGO` en `EXP_INFORME_SITUACIONAL` y su migración.
- **El circuito hasta la trabajadora social no existe**: faltan los estados
  `PEND_TS`, `OBSERVADO`, `APROBADO`, `DERIVADO` y su bandeja.

---

## 4. Decisiones que dependen de Charly

| Tema | Pregunta |
|---|---|
| **Reingreso** | `EXP_INFORME_CIERRE` admite un solo F13 por caso. Si un NNA reingresa sobre el mismo caso y vuelve a egresar, choca. ¿El reingreso abre caso nuevo? |
| **Las dos trabajadoras sociales** | Se reparten "mitad y mitad". ¿Bandeja común o reparto por sede? |
| **DNI del personal** | ¿Se agrega la columna a `SEC_USUARIO`, se vuelve a pedir en la ficha, o se quita del impreso? |
| **PDF del F13** | ¿Se pasa a reportlab en el backend? Cambia cómo se ve el documento. |
| **Catálogo de instituciones** | Hoy son archivos `.ts` (260 KB que se cargan siempre). ¿Pasan a tabla de catálogo mientras llega la API? |
| **Módulo PTI** | Está oculto. ¿Se elimina del código o se deja? |

---

## 5. Pedidos de reunión sin implementar

| Pedido | Origen |
|---|---|
| Bandeja de informes para calidad (aprobar / observar) | Reu. 11/08 |
| Bandeja de la trabajadora social | Reu. anterior |
| Bandeja de Atención Inmediata (F15) | Reu. anterior |
| Expediente digital en 5 áreas | Esperando el video del orden físico |
| Edad de los padres en el F11 | Reu. anterior |
| Limpiar la dirección del F12 al cambiar de lugar | Reu. anterior |
| Interoperabilidad con el SGD | Acordado para *después* |

### Formatos de la directiva sin implementar

**F01** conteo · **F02** directorio institucional —el F13 dice que se entrega al
egresar— · **F06 ficha de derivación** —es el formato oficial de lo que se está
armando a mano en el informe situacional— · **F14** autorización para eventos.

---

## 6. Lo que no se ha probado en ejecución

Todo lo de esta sesión compila (TypeScript y Python) y fue auditado leyendo el
código, pero **nada se probó en el navegador**. En particular:

- El circuito de firma del F13 completo, incluida la corrección de una ficha
  observada.
- La evaluación del taller con herencia a los participantes.
- Los combos de derivación con las 1.714 DEMUNAs.
- El guardado del F04 tras los cambios de columnas y sincronización.

**La prueba que más cierra:** llenar un F04 con todos los campos, guardarlo,
reabrirlo y comparar. Si algo se pierde, aparece ahí.
