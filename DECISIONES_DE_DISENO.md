# Decisiones de diseño

Bitácora de las decisiones que no se deducen del código. Cada una dice **qué se
decidió**, **por qué** y **qué se rompería** si alguien la revierte sin saberlo.

`AGENTS.md` tiene las reglas en corto; aquí está el razonamiento detrás.

---

## 1. El Resumen del Caso es la fuente única de los datos reutilizables

**Decisión.** Los datos que usan varias fichas viven en el Resumen del Caso
(físicamente en `NNA` y `NNA_CASO`). Las fichas escriben ahí lo reutilizable que
capturan y leen de ahí; nunca de otra ficha.

**Por qué.** Jalar de ficha en ficha encadena copias: un error en la primera se
propaga a todas las siguientes.

**Detalle.** El Resumen del Caso no es una tabla propia — es un componente que
recibe todo por props. "Centralizar en el Resumen" significa, en concreto,
guardarlo en `NNA` o `NNA_CASO`.

Ver `PRINCIPIO_RESUMEN_DEL_CASO.md`.

---

## 2. La fase del servicio se escribe, no se deduce

**Decisión.** `NNA_CASO.FASE` (`I`, `II`, `III`, `EGRESADO`) es la única fuente.
La escriben tres momentos: el alta del caso, el cierre de fase del F05 y el F13
al finalizarse. Ninguna pantalla la calcula.

**Por qué.** Llegó a estar representada en cinco lugares que no se hablaban:
el estado del caso traducido por dos diccionarios distintos en dos servicios, una
columna `FASE` que nadie escribía, las fechas del F05, la existencia de un folio
`F05-FASE-N`, y "¿tiene PTI activo?" en la bandeja del coordinador.

**Lo que costaba.** La Fase II valía 0 en todas las sedes; el Resumen del Caso
imprimía "Fase CONTACTO_INICIAL"; los egresados seguían contando como activos.

**El vencimiento alerta, no promueve.** La guía dice que si al mes de extensión no
se lograron los ítems, el NNA no pasa. El avance lo decide el educador:
*"no necesariamente todo tiene que cumplirse para pasar"* (Luis Gutiérrez,
reunión 05/08/2026). Lo automático es el cálculo y el registro, nunca la decisión.

**Si se revierte:** vuelve el desfase. Al aplicarlo, 28 de 90 casos estaban
reportados en la fase equivocada.

Migración `013_caso_fase_tracking.sql`.

---

## 3. El F08 es del taller, no de cada participante

**Decisión.** Una sola evaluación por taller, en `TALLER.EVAL_*`. Los
participantes la heredan; `PARTICIPANTE_TALLER.EVALUACION` pasa a significar
"evaluación personalizada de este chico".

**Por qué.** El Formato N° 08 oficial pregunta por el taller: personas asistentes,
logros, limitaciones *en función a la planificación*, sugerencias, y lo firma el
educador responsable. Sus puntos 1, 2, 3, 8 y 9 son idénticos al F07.

El sistema pedía una evaluación por asistente: con quince participantes, quince
textos, y ninguno respondía lo que el formato pregunta. Es literalmente la queja
de la reunión: *"ya estar colocando nombre por nombre, me hago bolas"*
(María del Carmen, 05/08/2026).

**Personas asistentes se cuenta, no se escribe.** Pedirlo a mano invita a que no
cuadre con el F10.

**Nunca se sobrescriben las personalizadas.** Hay un botón explícito para
igualarlas. Borrar lo que alguien escribió a mano tiene que ser decisión suya.

**El F08 no es requisito para dar un taller por hecho.** Lo sustenta la lista
firmada y las fotos — la nota del propio formato lo dice, y es lo que les piden en
la práctica: *"ni siquiera hagas tu planificación y tu evaluación, pero ten que tú
has dictado tu taller, con tu evidencia"* (Luis Gutiérrez).

Migración `004_evaluacion_taller_f08.sql`.

---

## 4. Los talleres del SEC no son talleres típicos

**Contexto que condiciona todo el módulo.** No se juntan en un local con
proyector. Se hacen casa por casa, en el parque, de dos en dos. Y uno puede durar
semanas: *"puedo iniciar este mes un taller y culminarlo en dos, tres semanas"*.

Los educadores tienen cuatro días de campo y medio día administrativo.

**Consecuencia de diseño:** cualquier campo obligatorio que se agregue a este
módulo compite con su tiempo de calle. Antes de exigir un dato, preguntar si
alguien lo va a leer.

---

## 5. La derivación va al final del informe, no en el encabezado

**Decisión.** Los dos combos —tipo de institución y la específica— van al final de
la sección VIII (Recomendación) del informe situacional.

**Por qué.** Yo lo había puesto en el encabezado razonando desde la lógica de un
oficio, pero los educadores describían su documento real. Luis, reunión del
11/08/2026: *"eso normalmente lo ponemos en el informe al final, en
recomendaciones"*. El destinatario del oficio es la Coordinación del SEC; la
institución a la que se deriva se menciona en el texto de las recomendaciones.
**Son dos datos distintos.**

Y resuelve un olvido concreto que describió María del Carmen: *"en la última parte
ahí dice: se deriva a la DEMUNA tal. Si no lo colocamos, urgente nos llaman: ¿a qué
DEMUNA?"*. Con el combo, la frase se arma sola.

**Todo informe se deriva.** No hay un "¿requiere derivar?" — se propuso y quedó
descartado: *"todos hacen y todos por tema administrativo deberían llegar todos"*
(Luis), *"todos, todos, todos"* (María del Carmen).

**Nombres oficiales tal como están en el registro.** Primero renombré las DEMUNAs
por su distrito y estaba mal: 32 tienen nombre propio —"Uchi Jee", "Caritas
Felices"— y varias son provinciales, no distritales. Renombrarlas borraba el nombre
por el que se las conoce y se las busca.

**Los estados del registro:** `b` acreditada, `c` no acreditada, `a` no operativa.
Las no operativas quedan fuera —no se deriva a una que no opera—; las no acreditadas
se ofrecen con aviso en rojo, porque pueden ser las que corresponden por zona y esa
decisión es del educador.

**El flujo acordado, aún sin construir:** el educador redacta y elige el destino →
deriva → la trabajadora social observa o aprueba → recién entonces se marca como
derivado. El envío real lo hace ella por el SGD, fuera del sistema: *"la encargada
que ve los informes por sistema lo envía de frente a ellos"* (Luis). Por eso el
botón debe decir "marcar como derivado" y no "derivar".

---

## 6. Cada elemento clicable lleva a donde se resuelve

**Decisión.** Un pendiente del tablero abre el expediente **en la pestaña de la
ficha que falta**. Una alerta agregada abre la lista **filtrada a esos casos**,
con un chip visible que dice qué se está filtrando y cuántos quedan.

**Por qué.** Decirle a alguien que tiene 5 casos con problema y soltarlo en una
lista de 90 le deja el trabajo de buscarlos. Y sin el chip, ver 5 donde había 90
parece que se perdieron datos.

**Ojo con las URLs del expediente.** `/nna/expediente/:id` espera el **id de
carpeta** en la ruta y el **id de NNA** en `?nnaId=`. Son datos distintos: usar
uno por el otro abre el expediente de otro chico cuando los ids coinciden.

---

## 7. El correlativo se asigna al firmar, no al guardar

**Decisión.** El número `INF-<sede>-<año>-NNNN` de la Ficha de Egreso se asigna
cuando el coordinador firma. Hasta entonces la ficha no tiene número.

**Por qué.** Se asignaba en el primer guardado, incluso en borrador: si el
educador abría la ficha, guardaba y se arrepentía, ese número quedaba muerto.
Una numeración con huecos es una observación de auditoría difícil de explicar
con 23 sedes reportando a la DGNNA. Un informe observado tampoco es un
documento oficial, así que tampoco debe consumir número.

**Cuidado al mover esto:** `get_next_correlativo` contaba *filas* de informes,
y funcionaba solo porque el número se pedía justo antes del INSERT. Al asignarlo
al final, el conteo no cambia entre dos firmas y ambas reciben el mismo número.
Ahora se calcula sobre los **códigos ya emitidos** (`REGEXP_SUBSTR` sobre el
sufijo numérico), con un índice único como red de seguridad.

**El NNA egresa también al firmar**, por la misma lógica: antes se cerraba el
caso al finalizar, y si el coordinador después observaba la ficha, quedaba un
caso cerrado con un informe en corrección. El chico sale de los tableros cuando
su egreso está aprobado, no antes.

**Punto único de asignación.** Está en `cierre_router.firmar_coordinador`. El
día que el número lo ponga el SGD, se reemplaza esa llamada y nada más.

**Consecuencias de haber hecho editable el estado OBSERVADO:** cualquier UPDATE
sobre `EXP_INFORME_CIERRE` que asigne columnas a ciegas ahora se ejecuta varias
veces sobre la misma ficha. `ARCHIVO_URL` ya se rompió por eso —el guardado de
borrador no la envía y la borraba— y se resolvió con `NVL(:archivo, ARCHIVO_URL)`.
Al agregar columnas nuevas, pensar si deben preservarse igual.

**Firma el educador que redactó o el responsable del caso.** Antes solo se
validaba la sede, así que cualquiera podía firmar en su lugar y quedaba su
nombre estampado. Los roles de gestión quedan fuera a propósito: si el
coordinador pudiera firmar como educador, luego se estaría firmando a sí mismo.

---

## 8. Flujo y stock no se mezclan bajo el mismo filtro

**Decisión.** Las tarjetas del periodo muestran solo **flujo** —lo que ocurrió
dentro del periodo: atendidos, ingresos, talleres, visitas, fases cerradas,
egresos—. El **stock** —casos activos y su reparto por fase— vive en su propio
bloque y no responde al filtro de año y mes.

**Por qué.** "Casos activos en marzo" no significa nada: un caso está activo ahora
o no lo está. Mezclarlos bajo el mismo selector es la forma más rápida de que
nadie entienda qué está mirando.

**Atendidos** se define como NNA distintos con al menos una interacción registrada
—diario de campo, taller o visita familiar—. No es lo mismo que casos asignados:
mide a cuántos chicos se vio de verdad.

**La comparación es en diferencia, no en porcentaje.** "6 más que julio", no
"+14,6%". Y no va en egresos: pasar de 1 a 2 no es "+100%", es un caso más.

---

## Estado de los formatos de la directiva

Los 15 formatos de la RDE 069-2021 más el informe situacional. Actualizado al
16/08/2026.

| Formato | Qué es | Estado |
|---|---|---|
| F01 | Ficha de Conteo | No implementado — es de Etapa 1, previo al servicio |
| F02 | Directorio Institucional | No implementado — **el F13 dice que se entrega al egresar** |
| F03 | Inscripción y Compromiso | Completo, con detección de duplicados |
| F04 | Diagnóstico Social | Completo |
| F05 | Proceso de Logros | Completo, con cierre de fase y tracking |
| F06 | **Ficha de Derivación** | No implementado — es el formato oficial de lo que se está armando a mano en el informe situacional |
| F07 | Planificación de Taller | Completo |
| F08 | Evaluación de Taller | Completo — rehecho como evaluación del taller |
| F09 | Compromiso NNA y Apoderado | Completo, con firma y huella |
| F10 | Asistencia de Usuarios | Completo |
| F11 | Asistencia de Hermanos/Padres | Completo — falta la edad de los padres |
| F12 | Seguimiento Familiar | Completo |
| F13 | Egreso – Retiro | Completo, con circuito de firma al coordinador |
| F14 | Autorización para Eventos | No implementado — alterna con el F09 |
| F15 | Atención Inmediata | La ficha existe; falta su bandeja |
| — | Informe Situacional | Completo; la derivación no se guarda todavía |

**Antes de construir un circuito nuevo, revisar si ya hay formato oficial.** El F06
es el caso: se estaba diseñando la derivación desde cero cuando la directiva ya tiene
una ficha para eso.

---

## 9. El F04 guarda casi todo en un CLOB, y eso condiciona su mantenimiento

`DIAGNOSTICO_SOCIAL` tiene 16 columnas para un formulario de ~134 campos. El
modelo real es: once campos se promueven a columna propia y **el payload
completo se serializa en `DATOS_EXTRA`**, un CLOB JSON que al leer se desanida
al nivel raíz.

**Consecuencias que hay que tener presentes:**

**Las columnas cortas reciben texto sin tope.** `MOTIVO_INGRESO` y
`ACTIVIDAD_CALLE` son `VARCHAR2(500)` y se llenan con dictado por voz, que emite
HTML. Un motivo de tres frases reventaba el guardado entero con ORA-12899 y el
educador perdía la sesión viendo solo "ocurrió un error al guardar". Ahora todo
lo que va a columna pasa por `_resumen()`, que aplana el HTML y corta **por
bytes** — la columna mide en bytes y una tilde ocupa dos. El texto íntegro sigue
en el CLOB.

**Un CLOB ilegible no puede devolver `{}`.** Antes, si el JSON no parseaba, se
seguía adelante con un diccionario vacío: el formulario se rehidrataba con solo
las columnas base y el siguiente "Guardar" sobrescribía el CLOB con el
formulario en blanco. Pérdida total y silenciosa. Ahora falla con error claro.

**Lo que vive solo en el CLOB es ciego para el resto del sistema.** El
`es_borrador` estaba ahí dentro, y por eso **siete consultas SQL contaban los
borradores como F04 terminado** — incluida la que abre el expediente digital y
genera el código de carpeta, que son irreversibles. Resuelto con la columna
`ESTADO` (migración 014) y el filtro `ESTADO = 'COMPLETO'` en las siete.

**El F04 devuelve al Resumen lo que corrige.** Sincronizaba seis campos de unos
cuarenta reutilizables. Ahora sube identidad, domicilio, contacto, educación,
salud y pernocte a `NNA`; el perfil a `NNA_CASO`; y **los familiares nuevos a
`NNA_FAMILIAR`** — antes se quedaban en el CLOB y la ficha siguiente los volvía
a pedir. Solo se suben los campos no vacíos: el F04 se llena durante semanas y
un guardado intermedio no debe borrar lo que ya estaba en el Resumen.

**No borrar antecedentes al cambiar una respuesta.** Marcar "no estudia" vaciaba
bullying, expulsión y atraso escolar — que son típicamente la causa de la
deserción. Ahora solo se limpian los campos que exigen matrícula vigente
(turno, tipo de IE, grado, institución).

**Los tri-estados no se imprimen como negación.** `yesno(None)` devolvía "NO", y
en explotación sexual eso significaba declarar en un documento oficial que el
NNA no es víctima cuando nadie preguntó. Para esas preguntas se usa `sino_nd()`,
que devuelve "—".

---

## 10. Las migraciones se descubren solas

`run_all_migrations.py` tenía una lista escrita a mano que se quedó en la 009:
las migraciones 010 a 013 existían en disco y **nunca se ejecutaban**. Nadie lo
notaba porque en los entornos ya montados se habían corrido a mano.

Ahora se descubren con `glob` ordenado por prefijo numérico. Pasó de 20 archivos
a 41. Agregar una migración es dejar el archivo en su carpeta; no hay que tocar
el runner.

El orden **entre servicios** sí sigue siendo explícito (`ORDEN_SERVICIOS`),
porque las tablas base deben crearse antes que las que las referencian.

---

## Notas técnicas que ya costaron caro

**Binds repetidos en Oracle.** Con parámetros posicionales, `oracledb` cuenta cada
aparición de `:1` como un bind distinto. Una consulta que repite el mismo bind seis
veces esperaba seis valores y reventaba en silencio. **Usar binds por nombre**
(diccionario) siempre que un bind se repita.

**`NNA_HISTORIAL_ESTADO.ESTADO_ANTERIOR/NUEVO` son `VARCHAR2(30)`.** Guardar ahí
una etiqueta con tildes lanza `ORA-12899` — "Fase II: Restitución de Derechos" mide
33 bytes en AL32UTF8. Guardar códigos, no etiquetas.

**Restricciones que no están en el repo.** `CHK_FASE` existía en la base y en
ninguna migración. Antes de un `UPDATE` masivo sobre una columna con vocabulario
controlado, consultar `ALL_CONSTRAINTS`.

**`tablas.md` puede estar desactualizado.** Es un volcado manual, no se regenera
solo, y las columnas que se agregan al escribir una migración quedan ahí antes de
existir en Oracle. Sirve para consultar nombres, **no como prueba de que algo
existe**. Para eso, consultar `ALL_TAB_COLUMNS` directamente.

**El orden importa al generar PDFs.** reportlab es frágil y aborta el documento
entero ante una etiqueta que no conoce. Guardar el dato **antes** de generar el
PDF: si el PDF falla, el registro no se pierde.

**La auditoría no debe impedir la operación.** Los INSERT a tablas de bitácora van
en su propio `try`: que falle el rastro no puede impedir que un educador cierre una
fase.
