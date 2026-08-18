## Imported Claude Cowork project instructions

Eres un asistente experto en Python y desarrollo web. 
El proyecto es un sistema de asignación de apelaciones para la DGNNA.
- Responde siempre en español
- Antes de escribir código, explica brevemente tu enfoque
- Prefiero soluciones simples y directas sobre las más complejas
- Cuando encuentres un bug, explica la causa raíz, no solo el fix

**Antes de cambiar algo que ya funciona, leer `DECISIONES_DE_DISENO.md`.** Ahí está
el porqué de las decisiones que no se deducen del código, con las citas de las
reuniones que las sustentan y qué se rompe si se revierten.

**Para saber en qué punto está el sistema, leer `ESTADO_DEL_PROYECTO.md`**: qué se
resolvió, qué falta revisar, qué migraciones corrieron y qué decisiones esperan
respuesta de Charly.

## Regla de datos (obligatoria)

El **Resumen del Caso** es la fuente única de los datos que se reutilizan: las fichas
jalan de ahí y no de otras fichas. Si un formato captura un dato que otros van a
necesitar, ese dato sube al Resumen del Caso.

Antes de agregar cualquier campo a una ficha, leer `PRINCIPIO_RESUMEN_DEL_CASO.md`.

## La fase del servicio tiene una sola fuente

`NNA_CASO.FASE` (`I`, `II`, `III`, `EGRESADO`) es la fase vigente. **Ninguna pantalla
la deduce**: ni del estado del caso, ni de si hay PTI activo, ni del nombre de un PDF.

Solo tres puntos la escriben:

| Momento | Qué escribe |
|---|---|
| Alta del caso (F03) | `FASE = 'I'` y abre la Fase I en `CASO_FASE` |
| "Cerrar fase N" en el F05 | sella `Fn_FIN`, abre la siguiente al día siguiente y promueve |
| F13 finalizado | `FASE = 'EGRESADO'`, `ESTADO = 'CERRADO'` |

`CASO_FASE` guarda el recorrido (inicio, fin, plazo, extensión, quién cerró) y
`NNA_HISTORIAL_ESTADO` la auditoría, con `TIPO_CAMBIO = 'FASE'`.

**El vencimiento del plazo alerta, no promueve.** La guía es explícita: si al mes de
extensión no se lograron los ítems, el NNA no pasa de fase. El avance lo decide el
educador — *"no necesariamente todo tiene que cumplirse para pasar"* (reunión
05/08/2026). Lo automático es el cálculo y el registro, nunca la decisión.

Los nombres y plazos oficiales viven en `services/intervencion-service-py/src/domain/fases.py`
y su espejo `client/src/utils/fases.ts`. No hardcodear etiquetas de fase en otro lado.

## Talleres: cada formato es una ficha aparte

F07, F10/F11 y F08 son formatos oficiales distintos y ocurren en momentos distintos.
En el módulo son tres fichas separadas, no pasos de un mismo trámite:

| Ficha | Cuándo | Qué guarda |
|---|---|---|
| **F07** Planificación | antes (o después, si se registra lo ya hecho) | `TALLER` |
| **F10 / F11** Asistencia | el día, firmado a mano | `PARTICIPANTE_TALLER.ASISTE` |
| **F08** Evaluación | después | `TALLER.EVAL_*` |

**El F08 es del taller, no de cada participante.** Una sola evaluación por actividad,
firmada por el educador responsable (punto 9 del formato). Sus puntos 1, 2, 3, 8 y 9
son idénticos al F07 y se heredan; solo se escriben logros, limitaciones y sugerencias.
El punto 4 —personas asistentes— **se cuenta, no se escribe**.

`PARTICIPANTE_TALLER.EVALUACION` sigue existiendo pero significa otra cosa: una
evaluación **personalizada** para un participante concreto. Si está vacía, hereda la
del taller. Al imprimir el F08 de un NNA se usa la suya si la tiene, y si no, la del
taller. Nunca se sobrescriben solas — hay un botón explícito para igualarlas.

**El F08 no es requisito para dar un taller por hecho.** Lo que lo sustenta es la lista
firmada y las fotos, que es lo que la nota del propio formato exige adjuntar y lo que
les piden en la práctica: *"ni siquiera hagas tu planificación y tu evaluación, pero ten
que tú has dictado tu taller, con tu evidencia"* (reunión 05/08/2026).

**Contexto que condiciona el diseño:** los talleres del SEC no son grupales típicos.
Se hacen casa por casa, en el parque, de dos en dos, y uno puede durar semanas —
*"puedo iniciar este mes un taller y culminarlo en dos, tres semanas"*. Los educadores
tienen cuatro días de campo y medio administrativo. Cualquier cosa que agregue campos
obligatorios a este módulo va en contra de eso.

**Pendiente, en la directiva pero no acordado en reuniones:** el F09 (compromiso) o el
F14 (autorización) se requieren *previamente* a los talleres según `GUIA_OPERATIVA_SEC.md`.
Hoy el módulo no los pide.

## Derivación institucional del informe situacional

**Todo informe se deriva.** No hay un "¿requiere derivar?": en la reunión del
11/08/2026 quedó que llegan todos — *"todos hacen y todos por tema administrativo
deberían llegar todos"* (Luis), *"todos, todos, todos"* (María del Carmen).

Los dos combos —tipo de institución y la específica— van **al final de la sección VIII
(Recomendación)**, no en el encabezado. Es donde los educadores lo escriben en su
documento real: *"eso normalmente lo ponemos en el informe al final, en
recomendaciones"* (Luis). El destinatario del oficio y la institución a la que se
deriva son datos distintos.

**Los catálogos son provisionales** — se van a jalar por API desde otro sistema. Hasta
entonces viven en `client/src/data/`: las 26 UPEs en `instituciones-derivacion.ts` y
las 1714 DEMUNAs en `demunas.ts` (generado del Excel del registro, no editar a mano).
Todo acceso pasa por las funciones de `instituciones-derivacion.ts`; **nadie importa
los arreglos directamente**, para que al llegar la API solo cambie el interior.

**Nombres oficiales, tal como están en el registro.** No todas las DEMUNAs se llaman
por su distrito: hay con nombre propio —"Uchi Jee", "Caritas Felices"— y varias son
provinciales. Del nombre solo se quita el encabezado "Defensoría Municipal de la Niña,
Niño y Adolescente", idéntico en todas.

**Estados del registro:** `b` acreditada (844), `c` no acreditada (870), `a` NO
OPERATIVA (178, excluida — no se deriva a una que no opera). La acreditación se
muestra en verde o rojo tras el ubigeo; elegir una no acreditada avisa pero no bloquea.

**Falta el backend:** `EXP_INFORME_SITUACIONAL` no tiene `TIPO_INSTITUCION` ni
`INSTITUCION_CODIGO`. Los campos ya viajan del cliente pero no se guardan.
