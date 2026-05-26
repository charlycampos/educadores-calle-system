# Mapeo Oficial de Combos y Variables - SEC 2026

Este documento detalla el mapeo oficial de las 12 variables catalogadas en el sistema de **Educadores de Calle (SEC 2026)**. Todos estos catálogos están unificados bajo la tabla `MAESTRO_PARAMETROS` en la base de datos Oracle (a excepción de Sexo que es un campo básico directo) y se consumen dinámicamente en el formulario de la Ficha F03 (`NnaCreatePage.tsx`).

---

### 1. Situación de Matrícula / ¿Estudia Actualmente?
* **Nombre de Grupo / Catálogo:** `OPCIONES_MATRICULA_2026`
* **Columna DB:** `ESTUDIA_ACTUALMENTE` (Mapeado a boolean en DB: SI/PROCESO = `1`, NO/NO_APLICA = `0`)

| Código / Valor | Descripción en Pantalla (Label) |
| :---: | :--- |
| **`SI`** | 1. Sí (cuenta con ficha de matrícula) |
| **`NO`** | 2. No (no se encuentra matriculado) |
| **`PROCESO`** | 3. En proceso de matrícula (trámite en gestión) |
| **`NO_APLICA`** | 99. No aplica (menores de 3 años o egresados de secundaria) |

---

### 2. Niveles Educativos
* **Nombre de Grupo / Catálogo:** `NIVELES_EDUCATIVOS_2026`
* **Columna DB:** `NIVEL_EDUCATIVO` (`VARCHAR2`)

| Código / Valor | Descripción en Pantalla (Label) |
| :---: | :--- |
| **`1`** | 1: Sin nivel |
| **`2`** | 2: Inicial |
| **`3`** | 3: Primaria Incompleta |
| **`4`** | 4: Primaria Completa |
| **`5`** | 5: Secundaria Incompleta |
| **`6`** | 6: Secundaria Completa |
| **`7`** | 7: Superior No Universitaria Incompleta |
| **`8`** | 8: Superior No Universitaria Completa |
| **`9`** | 9: Superior Universitario Incompleto |
| **`10`** | 10: Superior Universitario Completo |
| **`11`** | 11: Básica Especial |

---

### 3. Modalidad de Estudio
* **Nombre de Grupo / Catálogo:** `MODALIDADES_ESTUDIO_2026`
* **Columna DB:** `MODALIDAD_ESTUDIO` (`VARCHAR2`)

| Código / Valor | Descripción en Pantalla (Label) |
| :---: | :--- |
| **`1`** | 1: Básica / regular (EBR) |
| **`2`** | 2: Alternativa (EBA) |
| **`3`** | 3: Especial (EBE) |
| **`4`** | 4: Superior Técnica |
| **`5`** | 5: Superior Universitaria |
| **`6`** | 6: CETPRO |

---

### 4. Grado de Estudio
* **Nombre de Grupo / Catálogo:** `GRADOS_ESTUDIO_2026`
* **Columna DB:** `GRADO_ESTUDIO` (`VARCHAR2`)

| Código / Valor | Descripción en Pantalla (Label) |
| :---: | :--- |
| **`1`** | 1: Inicial |
| **`2`** | 2: 1ro primaria |
| **`3`** | 3: 2do primaria |
| **`4`** | 4: 3ro primaria |
| **`5`** | 5: 4to primaria |
| **`6`** | 6: 5to primaria |
| **`7`** | 7: 6to primaria |
| **`8`** | 8: 1ro secundaria |
| **`9`** | 9: 2do secundaria |
| **`10`** | 10: 3ro secundaria |
| **`11`** | 11: 4to secundaria |
| **`12`** | 12: 5to secundaria |
| **`13`** | 13: Ciclo I (EBA) |
| **`14`** | 14: Ciclo II (EBA) |
| **`15`** | 15: Ciclo III (EBA) |
| **`16`** | 16: Ciclo IV (EBA) |
| **`17`** | 17: Ciclo V (EBA) |
| **`18`** | 18: Ciclo VI (EBA) |
| **`19`** | 19: Ciclo VII (EBA) |
| **`20`** | 20: Ciclo VIII (EBA) |
| **`21`** | 21: Ciclo IX (EBA) |
| **`22`** | 22: Ciclo X (EBA) |
| **`99`** | 99: No aplica / No sabe |

---

### 5. ¿Con quiénes vives?
* **Nombre de Grupo / Catálogo:** `OPCIONES_CONVIVENCIA_2026`
* **Columna DB:** `VIVE_CON` (`VARCHAR2`)

| Código / Valor | Descripción en Pantalla (Label) |
| :---: | :--- |
| **`1`** | 1: Solo Padre |
| **`2`** | 2: Solo Madre |
| **`3`** | 3: Padre y madre |
| **`4`** | 4: Adulto responsable (familia extensa) |
| **`5`** | 5: Solo |
| **`6`** | 6: Otro |

---

### 6. Vínculo del Tutor / Familiar con el NNA
* **Nombre de Grupo / Catálogo:** `OPCIONES_VINCULO_TUTOR_2026`
* **Columna DB:** `VIN_TUT_USU` / `PARENTESCO` (`VARCHAR2`)

| Código / Valor | Descripción en Pantalla (Label) |
| :---: | :--- |
| **`1`** | 1: Padre o madre |
| **`2`** | 2: Tio/a |
| **`3`** | 3: Abuelo/a |
| **`4`** | 4: Hermano/a |
| **`5`** | 5: Otro familiar (ej. cuñado/a) |
| **`6`** | 6: Otro no familiar (no pariente) |

---

### 7. Tipo de Documento (NNA y Tutor)
* **Nombre de Grupo / Catálogo:** `OPCIONES_TIP_DOC_APO_2026`
* **Columna DB:** `TIP_DOC_TUT_APO` / `TIPO_DOC` (`VARCHAR2`)

| Código / Valor | Descripción en Pantalla (Label) |
| :---: | :--- |
| **`1`** | 1: DNI |
| **`2`** | 2: Carné de extranjería |
| **`3`** | 3: Pasaporte |
| **`4`** | 4: Documento de Identidad Extranjero |
| **`5`** | 5: CUI o Acta de Nacimiento |
| **`6`** | 6: Certificado de Nacido Vivo - CNV |
| **`7`** | 7: No tiene |

---

### 8. Lengua Materna (NNA y Tutor)
* **Nombre de Grupo / Catálogo:** `OPCIONES_LENGUA_APO_2026`
* **Columna DB:** `LEN_MAT_APO` / `LEN_MAT_NNA` (`VARCHAR2`)

| Código / Valor | Descripción en Pantalla (Label) |
| :---: | :--- |
| **`10`** | 10: Castellano |
| **`1`** | 1: Quechua |
| **`2`** | 2: Aimara |
| **`3`** | 3: Asháninka |
| **`4`** | 4: Awajún/Aguaruna |
| **`5`** | 5: Shipibo-Conibo |
| **`6`** | 6: Shawi/ Chayahuita |
| **`7`** | 7: Matsigenka/ Machiguenga |
| **`8`** | 8: Achuar |
| **`9`** | 9: Otra lengua indígena u originaria |
| **`11`** | 11: Portugués |
| **`12`** | 12: Otra lengua extranjera |
| **`13`** | 13: Lengua de señas peruana |
| **`14`** | 14: No escucha ni habla |
| **`16`** | 16: No responde / No sabe |
| **`99`** | 99: No aplica |

---

### 9. Autoidentificación Étnica (NNA y Tutor)
* **Nombre de Grupo / Catálogo:** `OPCIONES_ETNIA_APO_2026`
* **Columna DB:** `AUT_IDE_ET_APO` / `AUT_IDE_ET_NNA` (`VARCHAR2`)

| Código / Valor | Descripción en Pantalla (Label) |
| :---: | :--- |
| **`7`** | 7: Mestizo |
| **`1`** | 1: Quechua |
| **`2`** | 2: Aimara |
| **`3`** | 3: Indígena u originario de la Amazonía |
| **`4`** | 4: Perteneciente o parte de otro pueblo indígena |
| **`5`** | 5: Negro, moreno, zambo, mulato o afrodescendiente |
| **`6`** | 6: Blanco |
| **`8`** | 8: Otro |

---

### 10. Discapacidad del Tutor
* **Nombre de Grupo / Catálogo:** `OPCIONES_DISCAPACIDAD_APO_2026`
* **Columna DB:** `TIPO_DISCAP_APO` (`VARCHAR2`)

| Código / Valor | Descripción en Pantalla (Label) |
| :---: | :--- |
| **`6`** | 6: Ninguna |
| **`1`** | 1: Motriz o física |
| **`2`** | 2: Sensorial |
| **`3`** | 3: Cognitivo-intelectual |
| **`4`** | 4: Psicosocial o psíquica |
| **`5`** | 5: Más de una discapacidad |

---

### 11. Certificado CONADIS (NNA y Tutor)
* **Nombre de Grupo / Catálogo:** `OPCIONES_CERT_DISCAP_APO_2026`
* **Columna DB:** `CERT_DISCAP_APO` / `CERT_DISCAP_NNA` (`VARCHAR2`)

| Código / Valor | Descripción en Pantalla (Label) |
| :---: | :--- |
| **`99`** | 99: No aplica |
| **`1`** | 1: Sí, tiene Certificado de Discapacidad |
| **`2`** | 2: Sí, tiene, pero no lo porta |
| **`3`** | 3: No, no cuenta con Certificado |
| **`4`** | 4: En trámite |

---

### 12. Sexo (NNA y Tutor)
* **Variable Básica (No en MAESTRO_PARAMETROS - Campo directo en DB)**
* **Columna DB:** `SEXO` / `SEXO_APO` (`VARCHAR2`)

| Código / Valor | Descripción en Pantalla (Label) |
| :---: | :--- |
| **`1`** | 1: Masculino (Hombre) |
| **`2`** | 2: Femenino (Mujer) |
