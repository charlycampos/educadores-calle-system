# Principio: el Resumen del Caso es la fuente única de datos

> Regla del proyecto, definida por Charly Campos (12/08/2026).
> **Aplica a todo el sistema. Antes de agregar un campo a cualquier ficha, léase esto.**

---

## La regla

**El Resumen del Caso centraliza los datos que se van a reutilizar. Las fichas lo
alimentan en el orden en que se aplican, y jalan desde ahí — nunca de otra ficha.**

Si un dato lo van a necesitar dos o más formatos, ese dato pertenece al Resumen del
Caso. Las fichas lo leen; no lo vuelven a pedir ni lo copian entre ellas.

## El Resumen se alimenta de las fichas, en su orden

El Resumen del Caso no es un formulario que alguien llena aparte: **se va llenando con
lo que cada ficha registra, en el orden en que se aplican**.

```
F03 inscripción  ─┐
F04 diagnóstico  ─┤
F05 logros       ─┼──►  RESUMEN DEL CASO  ──►  cualquier ficha posterior
F12 seguimiento  ─┤        (dato vigente)        y todos los formatos impresos
talleres F07-F11 ─┘
```

El flujo es de ida y vuelta, pero nunca de ficha a ficha:

1. **La ficha escribe en el Resumen** lo reutilizable que capturó.
2. **Las fichas siguientes leen del Resumen**, no de la ficha que originó el dato.

Por eso una ficha posterior puede corregir lo que registró una anterior y todo el
sistema queda al día de una sola vez. Ejemplo real: en la inscripción muchas veces no
hay fecha de nacimiento —el primer contacto es en calle y el NNA no tiene documento—,
así que el educador anota una edad aproximada. Cuando el F04 obtiene la fecha real, la
escribe en el Resumen, y desde ese momento el F10, el F11 y el informe situacional
calculan la edad correcta sin tocar nada más.

**Ojo con la diferencia entre el dato histórico y el vigente:** la edad con la que un
NNA ingresó al servicio es un hecho de su inscripción y no se pisa; la edad actual se
calcula de la fecha de nacimiento del Resumen. Son dos cosas distintas y no deben
mezclarse.

## Por qué

Cada vez que un formato pide de nuevo un dato que ya existe:

- el educador lo escribe otra vez (son ~50 usuarios por educador),
- se escribe distinto en cada ficha ("Mamá", "madre", "MADRE") y los indicadores salen
  partidos,
- cuando el dato cambia —una mudanza, un teléfono nuevo— queda corregido en una ficha y
  viejo en las otras, sin forma de saber cuál es la buena.

Jalar de ficha en ficha traslada el problema: encadena copias y cualquier error de una
se propaga a las siguientes. Por eso el punto de lectura es siempre el mismo: el
Resumen del Caso.

## Cómo se aplica

**1. Dato reutilizable → vive en el Resumen del Caso**

Datos personales, documento, fecha de nacimiento, dirección, teléfono, familia, salud,
educación, responsable del caso, sede y zona.

**2. Dato propio del evento → vive en su ficha**

Lo que solo tiene sentido en ese hecho concreto: la fecha y hora de esa visita, la
descripción de lo ocurrido, los compromisos de esa consejería, los logros de esa fase.

**3. Si una ficha captura un dato reutilizable que aún no existe → sube al Resumen**

No se queda encerrado en la ficha. Ejemplo: si en el seguimiento familiar se entrevista
a una tía que no estaba registrada, esa persona se agrega a la familia del NNA y desde
la siguiente ficha ya está disponible para todos.

**4. Los códigos salen del catálogo, no de texto libre**

Parentesco, nivel educativo, seguro de salud y demás usan el
`Diccionario_de_datos_SEC_2026.md`. Es lo que permite contar y reportar.

## Ejemplos aplicados

| Dato | Vive en | Lo usan |
|------|---------|---------|
| Dirección del NNA (`domicilioActual`) | Resumen del Caso → Datos personales | F04, F12 (al marcar "Domicilio"), informe situacional |
| Familia del NNA (nombre, parentesco, teléfono) | Resumen del Caso → Familia | F11 (asistencia de padres), F12 (persona entrevistada), F04 |
| Fecha de nacimiento | Resumen del Caso | La edad de F10, F11 y el informe se **calcula** de aquí; no se guarda una edad por ficha |
| Educador responsable, sede, zona | Resumen del Caso | Todos los formatos impresos |

## Antes de crear un campo nuevo

Tres preguntas, en este orden:

1. ¿Este dato ya existe en el Resumen del Caso? → jálalo.
2. ¿Lo va a usar otro formato? → va al Resumen del Caso, no a la ficha.
3. ¿Es solo de este hecho puntual? → entonces sí, vive en la ficha.
