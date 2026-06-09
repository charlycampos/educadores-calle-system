# 📖 Diccionario Oficial de Datos - Sistema SEC (2026)

Este diccionario de datos oficial se genera a partir del archivo de control del programa **`Diccionario de datos SEC 2026.xlsx`**. Sirve como fuente única de verdad para el diseño de la base de datos Oracle (secuencias de tablas, tipos de datos) y la validación de formularios en el cliente.

> [!IMPORTANT]
> **Directiva de Desarrollo SEC:** Todos los campos de base de datos definidos aquí deben coincidir exactamente con los esquemas de persistencia y las validaciones de frontend.

## 🗂️ Índice de Secciones

1. [👤 1. Identificación y Datos Personales del NNA (Ítems 1 al 10.6)](#1-identificacin-y-datos-personales-del-nna-tems-1-al-106)
2. [📍 2. Lugar de Nacimiento y Ubicación Geográfica de Residencia (Ítems 11 al 19)](#2-lugar-de-nacimiento-y-ubicacin-geogrfica-de-residencia-tems-11-al-19)
3. [🏥 3. Salud, Discapacidad y Lengua Materna (Ítems 20 al 28)](#3-salud-discapacidad-y-lengua-materna-tems-20-al-28)
4. [👨‍👩‍👦 4. Datos del Adulto Responsable / Tutor (Ítems 29 al 42)](#4-datos-del-adulto-responsable-tutor-tems-29-al-42)
5. [🏠 5. Situación de Convivencia, Trabajo y Nutrición (Ítems 43 al 90)](#5-situacin-de-convivencia-trabajo-y-nutricin-tems-43-al-90)
6. [📁 6. Derivaciones, Metodología SEC y Entorno Familiar (Ítems 91 al 113)](#6-derivaciones-metodologa-sec-y-entorno-familiar-tems-91-al-113)
7. [📌 Anexo A: Códigos de Servicio por Región](#-anexo-a-c%C3%B3digos-de-servicio-por-regi%C3%B3n)
8. [📌 Anexo B: Tabla de Ciclos EBA](#-anexo-b-tabla-de-ciclos-eba)

---

## 👤 1. Identificación y Datos Personales del NNA (Ítems 1 al 10.6)

### 🔹 Ítem 1: `Código del Usuario/a` - Código del Usuario/a

- **Nombre del campo (BD):** `Código del Usuario/a`
- **Descripción:** No registrar dato
- **Valores permitidos / Categorías:**
  - `No Aplica`

### 🔹 Ítem 2: `TIPO_DOC_USU` - Tipo De Documento Del NNA

- **Nombre del campo (BD):** `TIPO_DOC_USU`
- **Descripción:** Indicar el tipo de documento de identidad del NNA.
- **Valores permitidos / Categorías:**
  - `1: DNI`: Documento Nacional de Identidad emitido por RENIEC que acredita la identidad de ciudadanos peruanos.
  - `2: Carné de extranjería`: Documento de identidad otorgado a personas extranjeras residentes en el Perú por la Superintendencia Nacional de Migraciones.
  - `3: Pasaporte`: Documento oficial emitido por el país de origen que permite la identificación y tránsito internacional del NNA.
  - `4: Documento de Identidad Extranjero`: Documento de identificación emitido por una autoridad extranjera distinta al pasaporte (por ejemplo, cédula de identidad de otro país).
  - `5: CUI o Acta de Nacimiento`: Documento que acredita el registro de nacimiento del NNA, el cual contiene el código único de identificación, emitido por la autoridad competente del país de origen.
  - `6: Certificado de Nacido Vivo - CNV`: Documento emitido por el establecimiento de salud al momento del nacimiento, que acredita el nacimiento del NNA previo a su inscripción en oficial.
  - `7: No tiene`: El NNA no cuenta con ningún documento de identidad.

### 🔹 Ítem 3: `NRO_DOC_USU` - Número del documento NNA

- **Nombre del campo (BD):** `NRO_DOC_USU`
- **Descripción:** Registrar el número del documento de identidad del niño, niña o adolescente (NNA) atendido en el servicio.
- **Valores permitidos / Categorías:**
  - `No Aplica`

### 🔹 Ítem 4: `PRI_APE_USU` - Apellido paterno NNA

- **Nombre del campo (BD):** `PRI_APE_USU`
- **Descripción:** Registrar el apellido paterno del niño, niña o adolescente (NNA) atendido en el servicio.
- **Valores permitidos / Categorías:**
  - `No Aplica`

### 🔹 Ítem 5: `SEG_APE_USU` - Apellido materno NNA

- **Nombre del campo (BD):** `SEG_APE_USU`
- **Descripción:** Registrar el apellido materno del niño, niña o adolescente (NNA) atendido en el servicio.
- **Valores permitidos / Categorías:**
  - `No Aplica`

### 🔹 Ítem 6: `NOM_USU` - Nombres NNA

- **Nombre del campo (BD):** `NOM_USU`
- **Descripción:** Registrar los nombres del niño, niña o adolescente (NNA) atendido en el servicio.
- **Valores permitidos / Categorías:**
  - `No Aplica`

### 🔹 Ítem 7: `SEXO_USU` - Sexo del NNA

- **Nombre del campo (BD):** `SEXO_USU`
- **Descripción:** Seleccionar el sexo del niño, niña o adolescente (NNA).
- **Valores permitidos / Categorías:**
  - `1: Hombre`
  - `2: Mujer`

### 🔹 Ítem 8: `FECHA_NAC_USU` - Fecha De Nacimiento NNA

- **Nombre del campo (BD):** `FECHA_NAC_USU`
- **Descripción:** Registrar la fecha de nacimiento del niño, niña o adolescente (NNA) en formato dd/mm/aaaa.
- **Valores permitidos / Categorías:**
  - `No Aplica`

### 🔹 Ítem 9: `EDAD_USU` - Edad en años NNA

- **Nombre del campo (BD):** `EDAD_USU`
- **Descripción:** La edad es calculada automáticamente a partir de la fecha de nacimiento registrada. Esta variable no requiere ingreso manual.  Para su actualización, se debe modificar la fecha de reporte en la fórmula, de acuerdo con el mes correspondiente.  Fórmula: =SIFECHA(Z5;"31/03/2026";"Y")  Donde la fecha "30/04/2026" debe ajustarse según el último día del mes de reporte.  Ejemplo: Para el mes de reporte abril, la fecha será cambiada por 30/04/2026.
- **Valores permitidos / Categorías:**
  - `No Aplica`: La edad es calculada automáticamente a partir de la fecha de nacimiento registrada. Esta variable no requiere ingreso manual.  Para su actualización, se debe modificar la fecha de reporte en la fórmula, de acuerdo con el mes correspondiente.  Fórmula: =SIFECHA(Z5;"31/03/2026";"Y")  Donde la fecha "30/04/2026" debe ajustarse según el último día del mes de reporte.  Ejemplo: Para el mes de reporte abril, la fecha será cambiada por 30/04/2026.

### 🔹 Ítem 10.1: `GRU_ET1` - Grupo etario 1

- **Nombre del campo (BD):** `GRU_ET1`
- **Descripción:** Grupo etario del NNA generado automáticamente a partir de la edad registrada. No requiere registro manual.
- **Valores permitidos / Categorías:**
  - `1: 0-5 años`
  - `2: 6-11 años`
  - `3: 12-17 años`
  - `4: 18 a más`

### 🔹 Ítem 10.2: `GRU_ET2` - Grupo etario 2

- **Nombre del campo (BD):** `GRU_ET2`
- **Descripción:** Clasificación etaria del NNA para fines estadísticos calculada automáticamente según la edad. No requiere registro manual.
- **Valores permitidos / Categorías:**
  - `1: 0-11 meses`
  - `2: 1-5 años`
  - `3: 6-11 años`
  - `4: 12-17 años`
  - `5: 18 a más`

### 🔹 Ítem 10.3: `GRU_ET3` - Grupo etario 3

- **Nombre del campo (BD):** `GRU_ET3`
- **Descripción:** Clasificación etaria del NNA para fines estadísticos calculada automáticamente según la edad. No requiere registro manual.
- **Valores permitidos / Categorías:**
  - `1: 0-5 años`
  - `2: 6-11 años`
  - `3: 12-17 años`
  - `4: 18 a más`

### 🔹 Ítem 10.4: `GRU_ET4` - Grupo etario 4

- **Nombre del campo (BD):** `GRU_ET4`
- **Descripción:** Clasificación etaria del NNA para fines estadísticos calculada automáticamente según la edad. No requiere registro manual.
- **Valores permitidos / Categorías:**
  - `00 - 05 AÑOS`
  - `06 - 08 AÑOS`
  - `09 - 11 AÑOS`
  - `12 - 14 AÑOS`
  - `15 - 17 AÑOS`
  - `18 AÑOS`

### 🔹 Ítem 10.5: `GRU_ET5` - Grupo etario 5

- **Nombre del campo (BD):** `GRU_ET5`
- **Descripción:** Clasificación etaria del NNA para fines estadísticos calculada automáticamente según la edad. No requiere registro manual.
- **Valores permitidos / Categorías:**
  - `1: 0 - 11 meses`
  - `2: 1 - 5 años`
  - `3: 6 - 11 años`
  - `4: 12- 17 años`
  - `5: 18 a más años`

### 🔹 Ítem 10.6: `GRU_ET6` - Grupo etario 6

- **Nombre del campo (BD):** `GRU_ET6`
- **Descripción:** Clasificación etaria del NNA para fines estadísticos calculada automáticamente según la edad. No requiere registro manual.
- **Valores permitidos / Categorías:**
  - `1: 0 - 5 años`
  - `2: 6 - 10 años`
  - `3: 11 - 15 años`
  - `4: 16 - 18 años`

---

## 📍 2. Lugar de Nacimiento y Ubicación Geográfica de Residencia (Ítems 11 al 19)

### 🔹 Ítem 11: `PAI_USU` - País (lugar de nacimiento)

- **Nombre del campo (BD):** `PAI_USU`
- **Descripción:** Registrar el país de nacimiento del niño, niña o adolescente (NNA). Considerar que el registro es manual y debe garantizar la coherencia con la información geográfica complementaria (departamento, provincia y distrito), a fin de evitar inconsistencias en la base de datos.
- **Valores permitidos / Categorías:**
  - `País de nacimiento`: Registrar el país de nacimiento del niño, niña o adolescente (NNA). Considerar que el registro es manual y debe garantizar la coherencia con la información geográfica complementaria (departamento, provincia y distrito), a fin de evitar inconsistencias en la base de datos.

### 🔹 Ítem 12: `DEP_NAC` - Departamento (lugar de nacimiento)

- **Nombre del campo (BD):** `DEP_NAC`
- **Descripción:** Registrar el departamento de nacimiento de él/la NNA.  El registro es manual y debe realizarse de manera precisa, garantizando la coherencia con la información geográfica asociada, como provincia y distrito, a fin de evitar inconsistencias en la base de datos.
- **Valores permitidos / Categorías:**
  - `Departamento de nacimiento`: Registrar el departamento de nacimiento de él/la NNA.  El registro es manual y debe realizarse de manera precisa, garantizando la coherencia con la información geográfica asociada, como provincia y distrito, a fin de evitar inconsistencias en la base de datos.

### 🔹 Ítem 13: `PROV_NAC` - Provincia (lugar de nacimiento)

- **Nombre del campo (BD):** `PROV_NAC`
- **Descripción:** Registrar la provincia de nacimiento de la niña, niño o adolescente (NNA).  El registro es manual y debe realizarse de manera precisa, garantizando la coherencia con la información geográfica asociada, como el departamento y distrito, a fin de evitar inconsistencias en la base de datos.
- **Valores permitidos / Categorías:**
  - `Provincia de nacimiento`: Registrar la provincia de nacimiento de la niña, niño o adolescente (NNA).  El registro es manual y debe realizarse de manera precisa, garantizando la coherencia con la información geográfica asociada, como el departamento y distrito, a fin de evitar inconsistencias en la base de datos.

### 🔹 Ítem 14: `DIS_NAC` - Distrito (lugar de nacimiento)

- **Nombre del campo (BD):** `DIS_NAC`
- **Descripción:** Registrar la provincia de nacimiento el NNA.  El registro es manual y debe realizarse de manera precisa, garantizando la coherencia con la información geográfica asociada a el departamento y distrito, a fin de evitar inconsistencias en la base de datos.
- **Valores permitidos / Categorías:**
  - `Distrito de nacimiento`: Registrar la provincia de nacimiento el NNA.  El registro es manual y debe realizarse de manera precisa, garantizando la coherencia con la información geográfica asociada a el departamento y distrito, a fin de evitar inconsistencias en la base de datos.

### 🔹 Ítem 15: `DIR_RES` - Dirección del domicilio del NNA

- **Nombre del campo (BD):** `DIR_RES`
- **Descripción:** Registrar la dirección del domicilio donde reside actualmente el NNA.
- **Valores permitidos / Categorías:**
  - `Dirección donde reside actualmente el NNA`

### 🔹 Ítem 16: `DEP_RES` - Departamento NNA

- **Nombre del campo (BD):** `DEP_RES`
- **Descripción:** Registrar el departamento donde reside actualmente la niña, niño o adolescente (NNA). El registro es manual, debe ser preciso y consistente con la información de provincia y distrito.
- **Valores permitidos / Categorías:**
  - `País donde reside actualmente`

### 🔹 Ítem 17: `PROV_RES` - Provincia NNA

- **Nombre del campo (BD):** `PROV_RES`
- **Descripción:** Registrar la provincia donde reside actualmente el NNA. El registro es manual, debe ser coherente con el departamento y distrito consignados.
- **Valores permitidos / Categorías:**
  - `Provincia donde reside actualmente`

### 🔹 Ítem 18: `DIS_RES` - Distrito NNA

- **Nombre del campo (BD):** `DIS_RES`
- **Descripción:** Registrar el distrito donde reside actualmente el NNA. El registro es manual, debe ser consistente con el departamento y provincia registrados.
- **Valores permitidos / Categorías:**
  - `Distrito donde reside actualmente`

### 🔹 Ítem 19: `CCPP_RES` - Centro poblado/localidad NNA

- **Nombre del campo (BD):** `CCPP_RES`
- **Descripción:** Registrar el centro poblado o localidad donde reside actualmente el NNA, según corresponda. El registro es manual, este dato complementa la ubicación geográfica registrada a nivel de departamento, provincia y distrito.
- **Valores permitidos / Categorías:**
  - `Centro poblado donde reside actualmente`

---

## 🏥 3. Salud, Discapacidad y Lengua Materna (Ítems 20 al 28)

### 🔹 Ítem 20: `TIENE_DISCAP` - ¿NNA presenta alguna discapacidad?

- **Nombre del campo (BD):** `TIENE_DISCAP`
- **Descripción:** Indicar si el niño, niña o adolescente presenta alguna discapacidad.
- **Valores permitidos / Categorías:**
  - `1. Sí, el usuario es una persona con discapacidad`
  - `2. No, el usuario no es una persona con discapacidad. (pasar a la 24)`

### 🔹 Ítem 21: `TIPO_DISCAP_USU` - Qué tipo de discapacidad presenta el NNA

- **Nombre del campo (BD):** `TIPO_DISCAP_USU`
- **Descripción:** Registrar el tipo de discapacidad que presenta el NNA. Esta variable se registra solo si el NNA Sí es una persona con discapacidad; en caso contrario registrar 99 = No aplica.
- **Valores permitidos / Categorías:**
  - `Según manifiesta el NNA o registrar si es notoria`: Registrar el tipo de discapacidad que presenta el NNA. Esta variable se registra solo si el NNA Sí es una persona con discapacidad; en caso contrario registrar 99 = No aplica.
  - `1. Motriz o física`
  - `2. Sensorial`
  - `3. Cognitivo-intelectual`
  - `4. Psicosocial o psíquica`
  - `5. Otros (especificar)`
  - `99. No aplica`

### 🔹 Ítem 22: `CERT_DISCAP_USU` - ¿El NNA cuenta con el Certificado de Discapacidad?

- **Nombre del campo (BD):** `CERT_DISCAP_USU`
- **Descripción:** Indicar si el NNA cuenta con certificado de discapacidad, según lo manifestado o de acuerdo con el documento presentado. Esta variable se registra solo si el NNA Sí es una persona con discapacidad; en caso contrario registrar 99 = No aplica.
- **Valores permitidos / Categorías:**
  - `Según manifiesta el NNA o de acuerdo con el documento que ha presentado.`: Indicar si el NNA cuenta con certificado de discapacidad, según lo manifestado o de acuerdo con el documento presentado. Esta variable se registra solo si el NNA Sí es una persona con discapacidad; en caso contrario registrar 99 = No aplica.
  - `1. Sí, el usuario tiene Certificado de Discapacidad.`
  - `2. Si, el usuario tiene Certificado de Discapacidad, pero no lo porto conmigo.`
  - `3. No, el usuario no tiene Certificado de Discapacidad.`
  - `99. No aplica`

### 🔹 Ítem 23: `CARNET_CONADIS_USU` - ¿El usuario cuenta con Carné de Inscripción al Registro Nacional de la Persona con Discapacidad del CONADIS?

- **Nombre del campo (BD):** `CARNET_CONADIS_USU`
- **Descripción:** Indicar si el NNA cuenta con carné de inscripción en el Registro Nacional de la Persona con Discapacidad del CONADIS. Esta variable se registra solo si el NNA Sí es una persona con discapacidad; en caso contrario registrar 99 = No aplica.
- **Valores permitidos / Categorías:**
  - `1. Sí, el usuario tiene Carné de Inscripción al Registro Nacional de la Persona con Discapacidad`: Indicar si el NNA cuenta con carné de inscripción en el Registro Nacional de la Persona con Discapacidad del CONADIS. Esta variable se registra solo si el NNA Sí es una persona con discapacidad; en caso contrario registrar 99 = No aplica.
  - `2. Sí, el usuario tiene Carné de Inscripción al Registro Nacional de la Persona con Discapacidad, pero no lo porta consigo.`
  - `3. No, el usuario no tiene Carné de Inscripción al Registro Nacional de la Persona con Discapacidad.`
  - `99. No aplica.`

### 🔹 Ítem 24: `LEN_MAT` - ¿Cuál es el idioma o lengua materna con el que aprendió a hablar en su niñez?

- **Nombre del campo (BD):** `LEN_MAT`
- **Descripción:** ¿Cuál es el idioma o lengua materna con el que aprendió a hablar en su niñez?
- **Valores permitidos / Categorías:**
  - `Según lo que manifiesta el NNA`
  - `1: Quechua`: Registrar el idioma o lengua materna con la que el NNA aprendió a hablar en su niñez.
  - `2: Aimara`
  - `3: Asháninca`
  - `4: Awajún /Aguaruna`
  - `5: Shipibo-Conibo`
  - `6: Shawi/ Chayahuita`
  - `7: Matsigenka / Machiguenga`
  - `8: Achuar`
  - `9: Otra lengua indígena u originaria`
  - `10: Castellano`
  - `11: Portugués`
  - `12: Otra lengua extranjera`
  - `13: Lengua de señas peruana`
  - `14: No escucha ni habla`

### 🔹 Ítem 25: `LEN_MAT_ESP` - Especificar en caso se haya marcado 9 o 12 en la pregunta anterior

- **Nombre del campo (BD):** `LEN_MAT_ESP`
- **Descripción:** Especificar el idioma o lengua cuando en la variable LEN_MAT se haya seleccionado la opción 9 (otra lengua indígena u originaria) o 12 (otra lengua extranjera).
- **Valores permitidos / Categorías:**
  - `No Aplica`

### 🔹 Ítem 26: `AUTO_ID_ETN` - Por sus costumbres y sus antepasados, Usted se siente o considera:

- **Nombre del campo (BD):** `AUTO_ID_ETN`
- **Descripción:** Registrar la autoidentificación étnica del NNA según lo que manifiesta.
- **Valores permitidos / Categorías:**
  - `Según lo que manifiesta el NNA`
  - `1: Quechua`
  - `2: Aimara`
  - `3: Indígena u originario de la Amazonía`
  - `4: Perteneciente o parte de otro pueblo indígena u originario`
  - `5: Negro, moreno, zambo, mulato o afrodescendiente`
  - `6: Blanco`
  - `7: Mestizo`
  - `8: Otro`

### 🔹 Ítem 27: `AUTO_ID_ETN_ESP` - Especificar en caso se haya marcado 3, 4 u 8 en la pregunta anterior

- **Nombre del campo (BD):** `AUTO_ID_ETN_ESP`
- **Descripción:** Especificar la autoidentificación étnica cuando en la variable AUTO_ID_ETN se haya seleccionado 3 ( Indígena u originario de la Amazonía) , 4 (Perteneciente o parte de otro pueblo indígena u originario) u 8 (Otro).
- **Valores permitidos / Categorías:**
  - `No Aplica`

### 🔹 Ítem 28: `VIC_IND_FEM` - Víctima indirecta de feminicidio

- **Nombre del campo (BD):** `VIC_IND_FEM`
- **Descripción:** Indicar si el NNA es víctima indirecta de feminicidio.
- **Valores permitidos / Categorías:**
  - `Según lo que manifiesta el NNA`
  - `1: Sí, feminicidio`
  - `2: Sí, presunto feminicidio`
  - `3: No`

---

## 👨‍👩‍👦 4. Datos del Adulto Responsable / Tutor (Ítems 29 al 42)

### 🔹 Ítem 29: `TIENE_TUTOR_APO` - El usuario/a tiene tutor o apoderado

- **Nombre del campo (BD):** `TIENE_TUTOR_APO`
- **Descripción:** Indicar si el NNA cuenta con tutor o apoderado responsable.
- **Valores permitidos / Categorías:**
  - `Según lo que manifiesta el NNA`
  - `1: Sí`
  - `2: No`

### 🔹 Ítem 30: `PRI_APE_TUT_APO` - APELLIDO PATERNO DEL ADULTO RESPONSABLE

- **Nombre del campo (BD):** `PRI_APE_TUT_APO`
- **Descripción:** Registrar el apellido paterno del tutor o apoderado responsable del NNA. El registro debe realizarse en letras mayúsculas
- **Formato:** Campo de texto libre / numérico.

### 🔹 Ítem 31: `SEG_APE_TUT_APO` - APELLIDO MATERNO DEL ADULTO RESPONSABLE

- **Nombre del campo (BD):** `SEG_APE_TUT_APO`
- **Descripción:** Registrar el apellido materno del tutor o apoderado responsable del NNA. El registro debe realizarse en letras mayúsculas
- **Formato:** Campo de texto libre / numérico.

### 🔹 Ítem 32: `NOM_APE_TUT_APO` - NOMBRES DEL ADULTO RESPONSABLE

- **Nombre del campo (BD):** `NOM_APE_TUT_APO`
- **Descripción:** Registrar los nombres del tutor o apoderado del NNA.
- **Valores permitidos / Categorías:**
  - `Nombre del padre con quien vive el NNA`

### 🔹 Ítem 33: `SEXO_APO` - SEXO DEL ADULTO RESPONSABLE

- **Nombre del campo (BD):** `SEXO_APO`
- **Descripción:** Seleccionar el sexo del tutor o apoderado del NNA.
- **Valores permitidos / Categorías:**
  - `1: Hombre`
  - `2: Mujer`

### 🔹 Ítem 34: `FECHA_NAC_APO` - FECHA DE NACIMIENTO DEL ADULTO RESPONSABLE

- **Nombre del campo (BD):** `FECHA_NAC_APO`
- **Descripción:** Registrar la fecha de nacimiento del tutor o apoderado del NNA en formato dd/mm/aaaa.
- **Valores permitidos / Categorías:**
  - `No Aplica`

### 🔹 Ítem 35: `NACIONALIDAD_APO` - NACIONALIDAD DEL ADULTO RESPONSABLE

- **Nombre del campo (BD):** `NACIONALIDAD_APO`
- **Descripción:** Registrar la nacionalidad del tutor o apoderado del NNA, (consignando el País)
- **Valores permitidos / Categorías:**
  - `No Aplica`

### 🔹 Ítem 36: `TIP_DOC_TUT_APO` - TIPO DE DOCUMENTO DEL ADULTO RESPONSABLE

- **Nombre del campo (BD):** `TIP_DOC_TUT_APO`
- **Descripción:** Seleccionar el tipo de documento de identidad del tutor o apoderado del NNA.
- **Valores permitidos / Categorías:**
  - `1: DNI`: Documento Nacional de Identidad emitido por RENIEC que acredita la identidad de ciudadanos peruanos.
  - `2: Carné de extranjería`: Documento de identidad otorgado a personas extranjeras residentes en el Perú por la Superintendencia Nacional de Migraciones.
  - `3: Pasaporte`: Documento oficial emitido por el país de origen que permite la identificación del adulto responsable y su tránsito internacional.
  - `4: Documento de Identidad Extranjero`: Documento de identificación emitido por una autoridad extranjera distinta al pasaporte (por ejemplo, cédula de identidad de otro país).
  - `5: CUI o Acta de Nacimiento`: Documento que acredita el registro de nacimiento de la persona, el cual contiene el Código Único de Identificación (CUI) asignado por RENIEC. (Uso excepcional en adultos que no cuentan con DNI).
  - `6: Certificado de Nacido Vivo - CNV`: Documento emitido por el establecimiento de salud al momento del nacimiento. (Uso excepcional; no constituye documento de identidad en adultos).
  - `7: No tiene`: El adulto responsable no cuenta con ningún documento de identidad

### 🔹 Ítem 37: `NRO_DOC_TUT_APO` - N° DE DOCUMENTO DE IDENTIDAD DEL ADULTO RESPONSABLE

- **Nombre del campo (BD):** `NRO_DOC_TUT_APO`
- **Descripción:** Registrar el número del documento de identidad del tutor o apoderado del NNA.
- **Valores permitidos / Categorías:**
  - `No Aplica`

### 🔹 Ítem 38: `VIN_TUT_USU` - Vinculo del Tutor o Apoderado con el/la NNA:

- **Nombre del campo (BD):** `VIN_TUT_USU`
- **Descripción:** Seleccionar el vínculo o relación del tutor o apoderado con el NNA.
- **Valores permitidos / Categorías:**
  - `Del adulto con el que vive el NNA`
  - `1: Padre o madre`
  - `2: Tio/a`
  - `3: Abuelo/a`
  - `4: Hermano/a`
  - `5: Otro familiar (ejemplo: cuñado, etc.)`
  - `6: Otro no familiar (no pariente)`

### 🔹 Ítem 39: `LEN_MAT_APO` - ¿Cuál es el idioma o lengua materna con el que aprendió a hablar en su niñez?

- **Nombre del campo (BD):** `LEN_MAT_APO`
- **Descripción:** Seleccionar el idioma o lengua materna con la que el tutor o apoderado aprendió a hablar en su niñez.
- **Valores permitidos / Categorías:**
  - `Del adulto con el que vive el NNA`
  - `1: Quechua`
  - `2: Aimara`
  - `3: Asháninca`
  - `4: Awajún/Aguaruna`
  - `5: Shipibo-Conibo`
  - `6: Shawi/ Chayahuita`
  - `7: Matsigenka/ Machiguenga`
  - `8: Achuar`
  - `9: Otra lengua indígena u originaria`
  - `10: Castellano`
  - `11: portugués`
  - `12: Otra lengua extranjera`
  - `13: Lengua de señas peruana`
  - `14: No escucha ni habla`
  - `16 NO RESPONDE / NO SABE`
  - `99. NO APLICA (menores de 3 años)`

### 🔹 Ítem 40: `LEN_MAT_ESP_APO` - Especificar en caso se haya marcado 9 o 12 en la pregunta anterior

- **Nombre del campo (BD):** `LEN_MAT_ESP_APO`
- **Descripción:** Especificar el idioma o lengua cuando en LEN_MAT_APO se haya seleccionado 9 (otra lengua indígena u originaria) o 12 (otra lengua extranjera).
- **Formato:** Campo de texto libre / numérico.

### 🔹 Ítem 41: `AUT_IDE_ET_APO` - Por sus costumbres y sus antepasados, Usted se siente o considera:

- **Nombre del campo (BD):** `AUT_IDE_ET_APO`
- **Descripción:** Seleccionar la autoidentificación étnica del tutor o apoderado según lo que manifiesta.
- **Valores permitidos / Categorías:**
  - `1: Quechua`
  - `2: Aimara`
  - `3: Indígena u originario de la Amazonía`
  - `4: Perteneciente o parte de otro pueblo indígena u originario`
  - `5: Negro, moreno, zambo, mulato o afrodescendiente`
  - `6: Blanco`
  - `7: Mestizo`
  - `8: Otro`

### 🔹 Ítem 42: `AUT_IDE_ET_ESP_APO` - Especificar en caso se haya marcado 3, 4 u 8 en la pregunta anterior

- **Nombre del campo (BD):** `AUT_IDE_ET_ESP_APO`
- **Descripción:** Especificar la autoidentificación étnica cuando en AUTO_ID_ET_APO se haya seleccionado 3 ( Indígena u originario de la Amazonía) , 4 (Perteneciente o parte de otro pueblo indígena u originario) u 8 (Otro).
- **Formato:** Campo de texto libre / numérico.

---

## 🏠 5. Situación de Convivencia, Trabajo y Nutrición (Ítems 43 al 90)

### 🔹 Ítem 43: `TIPO_DISCAP_APO` - ¿EL ADULTO RESPONSABLE TIENE ALGUNA DISCAPACIDAD?

- **Nombre del campo (BD):** `TIPO_DISCAP_APO`
- **Descripción:** Indicar el tipo de discapacidad que presenta el tutor o apoderado; caso contrario consignar 6 (Ninguna).
- **Valores permitidos / Categorías:**
  - `1. Motriz o física`
  - `2. Sensorial`
  - `3. Cognitivo-intelectual`
  - `4. Psicosocial o psíquica`
  - `5. Mas de una discapacidad`
  - `6. Ninguna`

### 🔹 Ítem 44: `CERT_DISCAP_APO` - ¿El Adulto responsable cuenta con el Certificado de Discapacidad?

- **Nombre del campo (BD):** `CERT_DISCAP_APO`
- **Descripción:** Indicar si el tutor o apoderado cuenta con certificado de discapacidad. Esta variable se registra solo si el Tutor o apoderado Sí es una persona con discapacidad; en caso contrario registrar 99 = No aplica.
- **Valores permitidos / Categorías:**
  - `Del adulto con el que vive el NNA`: Indicar si el tutor o apoderado cuenta con certificado de discapacidad. Esta variable se registra solo si el Tutor o apoderado Sí es una persona con discapacidad; en caso contrario registrar 99 = No aplica.
  - `1. Sí, tiene Certificado de Discapacidad.`
  - `2. Si, tiene Certificado de Discapacidad, pero no lo porto conmigo.`
  - `3. No, no tiene Certificado de Discapacidad.`
  - `99. No aplica`

### 🔹 Ítem 45: `MIENBROS_FAM` - Número de miembros de la Familia de NNA

- **Nombre del campo (BD):** `MIENBROS_FAM`
- **Descripción:** Registrar el número total de miembros que conforman la familia del NNA que comparten alimentación y residencia en el mismo hogar. Nota: Para efectos de esta variable, se considera familia al conjunto de personas que comparten la alimentación, es decir, quienes consumen de la misma olla. Independientemente de si dichos miembros conviven en la misma vivienda junto a otros integrantes de la familia extensa. De esta manera, el núcleo familiar queda definido por el grupo de personas que comparten la comida a diario, estableciendo así una unidad básica de convivencia dentro del hogar.
- **Valores permitidos / Categorías:**
  - `No Aplica`: Registrar el número total de miembros que conforman la familia del NNA que comparten alimentación y residencia en el mismo hogar. Nota: Para efectos de esta variable, se considera familia al conjunto de personas que comparten la alimentación, es decir, quienes consumen de la misma olla. Independientemente de si dichos miembros conviven en la misma vivienda junto a otros integrantes de la familia extensa. De esta manera, el núcleo familiar queda definido por el grupo de personas que comparten la comida a diario, estableciendo así una unidad básica de convivencia dentro del hogar.

### 🔹 Ítem 46: `TIP_FAM` - Tipo de familia

- **Nombre del campo (BD):** `TIP_FAM`
- **Descripción:** Identifica el tipo de familia con la que convive el NNA, considerando la composición del hogar y los vínculos familiares de las personas con quienes reside habitualmente.
- **Valores permitidos / Categorías:**
  - `1: Familia nuclear`: El NNA convive con ambos padres (madre y padre), con o sin hermanos, en un mismo hogar.
  - `2: Familia monoparental`: El NNA convive únicamente con uno de sus padres (madre o padre), con o sin hermanos.
  - `3: Familia extensa`: El NNA convive en un hogar donde, además de uno o ambos padres (o en ausencia de estos), residen otros familiares como abuelos, tíos, primos u otros parientes.
  - `4: Familia reconstruida`: El NNA convive en un hogar conformado por una pareja (matrimonio o unión de hecho) en la que uno o ambos adultos responsables tienen hijos provenientes de relaciones anteriores.
  - `5: Familia incompleta`: Equivale a la definición de Familia monoparental. OMITIR REGISTRAR ESTA CATEGORÍA
  - `6: Otros`: Corresponde a situaciones familiares que no se ajustan a las categorías anteriores.

### 🔹 Ítem 47: `DNI_EDUCADOR` - DNI del Educador/a

- **Nombre del campo (BD):** `DNI_EDUCADOR`
- **Descripción:** Registrar el número de DNI del educador o educadora responsable  del caso.
- **Valores permitidos / Categorías:**
  - `No Aplica`

### 🔹 Ítem 48: `AP_EDUCADOR` - Apellido Paterno del Educador/a

- **Nombre del campo (BD):** `AP_EDUCADOR`
- **Descripción:** Registrar el apellido paterno del educador o educadora responsable.
- **Valores permitidos / Categorías:**
  - `No Aplica`

### 🔹 Ítem 49: `AM_EDUCADOR` - Apellido Materno del Educador/a

- **Nombre del campo (BD):** `AM_EDUCADOR`
- **Descripción:** Registrar el apellido materno del educador o educadora responsable.
- **Valores permitidos / Categorías:**
  - `No Aplica`

### 🔹 Ítem 50: `NOM_EDUCADOR` - Nombres del Educador/a

- **Nombre del campo (BD):** `NOM_EDUCADOR`
- **Descripción:** Registrar los nombres del educador o educadora responsable.
- **Valores permitidos / Categorías:**
  - `No Aplica`

### 🔹 Sin número: `COD_SER` - Codigo del servicio

- **Nombre del campo (BD):** `COD_SER`
- **Descripción:** Es el código correspondiente al centro de atención del servicio.
- **Valores permitidos / Categorías:**
  - `Se considera los codigos de los 23 SEC a nivel nacional`

### 🔹 Ítem 51: `CENTRO_POI` - Centro de atención POI

- **Nombre del campo (BD):** `CENTRO_POI`
- **Descripción:** Registrar  el nombre correspondiente al  centro de atención del servicio
- **Valores permitidos / Categorías:**
  - `Se considera los 23 SEC a nivel nacional`

### 🔹 Ítem 52: `DEPARTAMENTO` - Departamento del Centro de Atención POI

- **Nombre del campo (BD):** `DEPARTAMENTO`
- **Descripción:** Registrar el nombre del departamento donde se ubica el centro de atención del servicio.
- **Valores permitidos / Categorías:**
  - `No Aplica`

### 🔹 Ítem 53: `PROVINCIA` - Provincia

- **Nombre del campo (BD):** `PROVINCIA`
- **Descripción:** Registrar el nombre de la provincia donde se ubica el centro de atención del servicio.
- **Valores permitidos / Categorías:**
  - `No Aplica`

### 🔹 Ítem 54: `DISTRITO` - Distrito

- **Nombre del campo (BD):** `DISTRITO`
- **Descripción:** Registrar el nombre del distrito donde se ubica el centro de atención del servicio.
- **Valores permitidos / Categorías:**
  - `No Aplica`

### 🔹 Ítem 55: `ZONA_INTERVENCION` - Zona de intervención

- **Nombre del campo (BD):** `ZONA_INTERVENCION`
- **Descripción:** Registrar el nombre de la zona de intervención del servicio
- **Valores permitidos / Categorías:**
  - `No Aplica`

### 🔹 Ítem 56: `AREA_RESIDENCIA` - Área de residencia del centro de atención POI

- **Nombre del campo (BD):** `AREA_RESIDENCIA`
- **Descripción:** Seleccionar el área de residencia del centro de atención del servicio (urbano o rural).
- **Valores permitidos / Categorías:**
  - `1: URBANO`
  - `2: RURAL`

### 🔹 Ítem 57: `PROT_PREVENIR` - Estrategía Prevenir para Proteger

- **Nombre del campo (BD):** `PROT_PREVENIR`
- **Descripción:** Indicar si el NNA pertenece a la estrategia Prevenir para Proteger.   Se consigna "SI" solo a los distritos de: Nuevo Chimbote, Ayacucho, San Sebastian, Huánuco, Trujillo, Chiclayo, San Juan de Luringancho, Villa Maria del Triunfo, Chancay, Belen, Piura, Juliaca y Tumbes.  El resto de distritos consignar "NO".
- **Valores permitidos / Categorías:**
  - `SI o NO (son solo 13 ciudades/distritos)`: Indicar si el NNA pertenece a la estrategia Prevenir para Proteger.   Se consigna "SI" solo a los distritos de: Nuevo Chimbote, Ayacucho, San Sebastian, Huánuco, Trujillo, Chiclayo, San Juan de Luringancho, Villa Maria del Triunfo, Chancay, Belen, Piura, Juliaca y Tumbes.  El resto de distritos consignar "NO".

### 🔹 Ítem 58: `FECHA_ING` - Fecha de ingreso al servicio

- **Nombre del campo (BD):** `FECHA_ING`
- **Descripción:** Registrar la fecha de ingreso del NNA al servicio, según la ficha de inscripción.
- **Valores permitidos / Categorías:**
  - `(según la ficha de inscripción)`

### 🔹 Ítem 59: `FECHA_REING` - Fecha de reingreso al servicio

- **Nombre del campo (BD):** `FECHA_REING`
- **Descripción:** El reingreso solo aplica cuando han transcurrido al menos 91 días desde la fecha de egreso.  Asimismo, se debe verificar que la fecha de reingreso no sea anterior a la fecha del último ingreso registrado en el servicio.  Se debe considerar el registro del ultimo ingreso del NNA.
- **Valores permitidos / Categorías:**
  - `No Aplica`: El reingreso solo aplica cuando han transcurrido al menos 91 días desde la fecha de egreso.  Asimismo, se debe verificar que la fecha de reingreso no sea anterior a la fecha del último ingreso registrado en el servicio.  Se debe considerar el registro del ultimo ingreso del NNA.

### 🔹 Ítem 60: `MED_ING` - Modalidad de ingreso al servicio

- **Nombre del campo (BD):** `MED_ING`
- **Descripción:** Seleccionar la modalidad mediante la cual el NNA ingresa al servicio:
- **Valores permitidos / Categorías:**
  - `1: Vía Judicial`: El NNA ingresa al servicio por disposición de una autoridad judicial (juez)
  - `2: Vía Administrativa (UPE)`: El NNA ingresa al servicio por derivación de la Unidad de Protección Especial (UPE).
  - `3: Vía Administrativa (Fiscalía)`: El NNA ingresa al servicio por derivación del Ministerio Público (Fiscalía)
  - `4: Otros`: El ingreso del NNA se produce por una vía distinta a las anteriores, como derivaciones de otras instituciones públicas, privadas, organizaciones sociales u otros actores no especificados.
  - `5: Identificado por Educador de Calle`: El NNA es incorporado al servicio tras ser identificado directamente por el educador de calle durante las acciones de búsqueda, contacto y abordaje en territorio.
  - `6: Identificado por Educador de Atención Urgente`: El NNA es incorporado al servicio tras ser identificado por el educador de atención urgente, quien realiza la derivación correspondiente al servicio de atención básica.

### 🔹 Ítem 61: `TIP_ING` - Estado del NNA en el mes

- **Nombre del campo (BD):** `TIP_ING`
- **Descripción:** Seleccionar el estado del niño, niña o adolescente (NNA) en el servicio durante el mes de reporte, según su situación de permanencia, ingreso, traslado, egreso o condición de atención.
- **Valores permitidos / Categorías:**
  - `Definición:`
  - `1:  Continuador constante/permanente en el servicio`: NNA que viene siendo atendido de manera continua en el servicio desde meses anteriores y mantiene su participación activa durante el mes de reporte.
  - `2: Nuevo en el servicio`: NNA que ingresa por primera vez al servicio durante el mes de reporte.
  - `3: Reingreso en el servicio`: NNA que retorna al servicio luego de haber egresado previamente (debe tener ficha y fecha de egreso, el tiempo transcurrido desde dicho egreso es referencial)
  - `4: Traslado interno`: Se refiere al NNA que es derivado a otro educador dentro de la misma sede del Servicio de Educadores de Calle.  Esta opción debe ser registrado por el/la educador(a) que recepciona y por el/la educador(a) que deriva. El/la educador(a) que deriva resalta la fila en amarillo para su validación y depuración por el profesional de estadística.  A partir del siguiente mes de reporte, el NNA solo debe ser reportado por el/la educador(a) que lo recepciona.
  - `5: Traslado externo`: Se refiere al NNA que es derivado a otra sede de atención del Servicio de Educadores de Calle. (Ejemplo: de SEC Lima a SEC Tacna)  Esta opción debe ser registrado en la base de datos de el/la educador(a) que recepciona en la sede de destino y por el/la educador(a) que deriva. El/la educador(a) que deriva deberá resaltar la fila del NNA en color amarillo para su verificación y depuración por el profesional de estadística.  A partir del siguiente mes de reporte, el NNA no debe ser reportado en la sede de origen, debiendo figurar únicamente en la base de datos de la sede de destino.
  - `6: Egresado`: NNA que finaliza su atención en el servicio durante el mes de reporte, de acuerdo a los lineamientos del protocolo. Para los casos donde el NNA es egresado tienen un plazo de 30 días para elaboración de informe de egreso
  - `7: No Atendido por ausencia de NNA (Hasta 90 días)`: NNA que no ha podido ser atendido durante el mes debido a su no ubicación, por un periodo máximo de 90 días. Si se supera este periodo, corresponde registrar el egreso como “Retiro por no ubicado / no atendido más de 90 días”.  A partir del cuarto mes se realiza el egreso del NNA. Considerar que el NNA sigue siendo Activo.
  - `8: No Atendido por falta de educador (Hasta 90 días)`: Corresponde a la condición del NNA que no ha sido atendido durante el mes debido a la falta de asignación de un educador responsable.  Esta condición aplica únicamente por un periodo máximo de 90 días consecutivos.  En caso dicho periodo supere los 90 días (es decir, a partir del cuarto mes de no atención), se deberá registrar el egreso del NNA, consignando la opción: “Egreso por falta de educador (más de 90 días)”.  Si durante el periodo de los 90 días se asigna un educador responsable, el NNA deberá cambiar su condición a: “Continuador”.  Si posterior al egreso se asigna nuevamente un educador responsable, el NNA deberá ser registrado con la condición de: “Reingreso”.

### 🔹 Ítem 62: `PER_ING` - Perfil del NNA

- **Nombre del campo (BD):** `PER_ING`
- **Descripción:** Indicar el perfil del NNA según la situación en la que se encuentra  (trabajo en calle, mendicidad o vida en calle).
- **Valores permitidos / Categorías:**
  - `1. Trabajo en calle`: Es la actividad económica que realiza la niña, niño o adolescente, remunerada o no, que pone en riesgo su integridad física o psicológica sea esta autorizada o no por una autoridad competente. Esta actividad puede ser realizada de forma dependiente, independiente o familiar.
  - `2. Mendicidad`: Cuando una niña, niño ó adolescente solicita con persistencia o humillación una dádiva o limosna sin que medie el intercambio de un bien o servicio. La mendicidad no genera transacción económica, prestación de servicios, ni relación laboral.
  - `3. Vida en Calle`: Cuando la niña, niño o adolescente ha hecho de la calle su espacio de socialización y lugar de vida. Aquellos NNA que se ausentan de 2 a 3 días a la semana, no llegan a dormir a casa.

### 🔹 Ítem 63: `PER_FAS` - Fase de intervención

- **Nombre del campo (BD):** `PER_FAS`
- **Descripción:** Indicar la fase de intervención en la que se encuentra el NNA dentro del proceso de atención del servicio. Considerar los resultados planteados en el Protocolo del SEC.
- **Valores permitidos / Categorías:**
  - `1. FASE I`: Contacto e integración con NNA en presunta situación de riesgo en calle Esta intervención se encuentra orientada al establecimiento de un primer contacto con los NNA en situación de calle, así como con su familia; además ello, en la misma, se establecen vínculos de confianza con los mismos, a fin de recoger información relacionada a sus problemas y necesidades urgentes e incorporarlos en el servicio.
  - `2. FASE II`: Desarrollo e intervención para la restitución y el ejercicio de los derechos del NNA en situación de riesgo en calle Esta intervención se encuentra orientada a efectuar diversas acciones para promover, proteger y restituir el ejercicio de los derechos de los NNA en situación de riesgo en calle así como del padre, madre o apoderados/as. Dichas acciones pueden comprender; fortalecimiento de capacidades del NNA y su familia, desarrollo formativo, jornadas lúdicas/recreativas, acciones de seguimiento y acompañamiento, competencias parentales, así como otras acciones de carácter complementario.
  - `3. FASE III`: Seguimiento y egreso del Servicio La intervención de seguimiento está orientada a fortalecer y sostener en el tiempo los logros alcanzados por el NNA y su familia durante la fase de intervención, promoviendo la restitución y ejercicio de sus derechos, con miras a su egreso del Servicio de Educadores de Calle. Comprende acciones como visitas domiciliarias, entrevistas de acompañamiento, seguimiento escolar, orientación y consejería, enfocadas en la desvinculación de la situación de calle, la continuidad educativa, el fortalecimiento de las relaciones familiares y el acceso oportuno a servicios locales.

### 🔹 Ítem 64: `TIP_SEG_SAL` - ¿Tipo de seguro de Salud?

- **Nombre del campo (BD):** `TIP_SEG_SAL`
- **Descripción:** Seleccionar el tipo de seguro de salud al que se encuentra afiliado el NNA
- **Valores permitidos / Categorías:**
  - `1: SIS`
  - `2: ESSALUD`
  - `3: Privado`
  - `4: Fuerzas armadas o policiales`
  - `5: No se encuentra afiliado a un seguro`

### 🔹 Ítem 65: `NIV_EDU` - ¿Cuál es el nivel educativo actual del NNA?

- **Nombre del campo (BD):** `NIV_EDU`
- **Descripción:** Seleccionar el nivel educativo actual del NNA según el nivel en el que se encuentra matriculado o último nivel alcanzado:
- **Valores permitidos / Categorías:**
  - `1: Sin nivel`: NNA sin estudios o que no ha accedido al sistema educativo.
  - `2: Inicial`: NNA que cursa educación inicial (3, 4, 5 años).
  - `3: Primaria Incompleta`: NNA que cursa entre 1ro y 6to grado de primaria.
  - `4: Primaria Completa`: NNA que culminó primaria y no se encuentra cursando secundaria.
  - `5: Secundaria Incompleta`: NNA que cursa entre 1ro y 5to de secundaria.
  - `6: Secundaria Completa`: NNA que culminó la educación secundaria.
  - `7: Superior No Universitaria Incompleta`: NNA que cursa estudios técnicos o en instituto.
  - `8: Superior No Universitaria Completa`: Técnico / Instituto terminado
  - `9: Superior Universitario Incompleto`: Universidad en curso
  - `10: Superior Universitario Completo`: Universidad terminada
  - `11: Básica Especial`: NNA que se encuentra en un programa de educación básica especial.

### 🔹 Ítem 66: `ELAB_INF_SIT` - Educador ELABORÓ informe situacional de NNA

- **Nombre del campo (BD):** `ELAB_INF_SIT`
- **Descripción:** Indicar si el educador o educadora elaboró el informe situacional del NNA durante el proceso de intervención.
- **Valores permitidos / Categorías:**
  - `1: Si`
  - `2: No`

### 🔹 Ítem 67: `PRES_INF_SIT` - Educador presentó informe situacional a UPE o DEMUNA acreditada

- **Nombre del campo (BD):** `PRES_INF_SIT`
- **Descripción:** Indicar si el educador presentó el informe situacional del NNA ante la UPE o DEMUNA acreditada.
- **Valores permitidos / Categorías:**
  - `1: Si`
  - `2: No`

### 🔹 Ítem 68: `ESTADO ACTUAL DEL NNA` - ESTADO ACTUAL DEL NNA

- **Nombre del campo (BD):** `ESTADO ACTUAL DEL NNA`
- **Descripción:** Seleccionar el estado actual del NNA en el servicio (activo o inactivo). La opción inactivo solo aplica cuando el NNA ha sido egresado durante el mes de reporte.
- **Valores permitidos / Categorías:**
  - `1: Activo`
  - `2: Inactivo`

### 🔹 Ítem 69: `FECHA_EGRESO` - FECHA DE EGRESO / RETIRO

- **Nombre del campo (BD):** `FECHA_EGRESO`
- **Descripción:** Registrar la fecha de egreso del niño, niña o adolescente (NNA) del servicio. Esta fecha debe coincidir con la consignada en Ficha de egreso. Debe registrarse en formato dd/mm/aaaa.   En caso de que el NNA se encuentre ACTIVO en el servicio, consignar “No aplica”.
- **Valores permitidos / Categorías:**
  - `No Aplica`: Registrar la fecha de egreso del niño, niña o adolescente (NNA) del servicio. Esta fecha debe coincidir con la consignada en Ficha de egreso. Debe registrarse en formato dd/mm/aaaa.   En caso de que el NNA se encuentre ACTIVO en el servicio, consignar “No aplica”.

### 🔹 Ítem 70: `MOT_EGR` - MOTIVO DE EGRESO / RETIRO

- **Nombre del campo (BD):** `MOT_EGR`
- **Descripción:** Seleccionar el motivo de egreso del NNA del servicio, según la causa que originó la finalización de la atención.  En caso de que el NNA se encuentre ACTIVO en el servicio, consignar “No aplica”.
- **Valores permitidos / Categorías:**
  - `1: Egreso cumplimiento de evaluación interfase`: Se registra cuando el NNA ha cumplido satisfactoriamente los objetivos establecidos en su proceso de intervención, evidenciando avances sostenibles en la restitución de sus derechos, lo que permite su egreso del servicio. El NNA concluye Fase III.
  - `2: Retiro por no ubicado/ no atendido más de 90 días`: Si luego de la incorporación del usuario/a al servicio, este/a deja de participar en las actividades del servicio debido a su no ubicación. Cabe precisar, que el/la Educador/a puede realizar acciones y gestiones pertinentes para lograr su ubicación.
  - `3: Egreso con derivación a servicios para el tránsito a la vida adulta`: Se registra cuando el/la NNA cumple dieciocho (18) años, generándose su egreso del servicio y, de corresponder, su derivación a servicios para el tránsito a la vida adulta.
  - `4: Retiro por abandono`: Se registra cuando, posterior a su incorporación al servicio hasta 90 días, el NNA deja de participar en las actividades debido a su negativa o a la de su familia, pese a las acciones y gestiones realizadas por el/la educador/a orientadas a promover su reincorporación.
  - `5: Egreso con derivación por necesidad de servicios complementarios`: Se registra cuando el/la NNA presenta necesidades especificas que no pueden ser atendidas en el Servicio Educadores de Calle.
  - `6: Por fallecimiento`: Cuando se produce el deceso de la niña, niño o adolescente.
  - `7: Retiro por interés superior del NNA (casos de trata, entorno delincuencial o análogos)`: Cuando el Coordinador/a o Educador/a advierta que el NNA ha sido víctima de un presunto delito o es gravemente expuesto a un entorno delincuencial procederá a coordinar con las autoridades para la denuncia correspondiente, en atención al interés superior del niño, niña y adolescente.
  - `8. Egreso por falta de educador (más de 90 días).`: Se registra cuando el NNA no ha sido atendido durante un periodo mayor a 90 días debido a la ausencia o falta de asignación de un educador responsable, imposibilitando la continuidad de su atención en el servicio.

### 🔹 Ítem 71: `EDU_USU` - ¿EL NNA HA SIDO MATRICULADO ESTE AÑO EN UNA INSTITUCIÓN EDUCATIVA?

- **Nombre del campo (BD):** `EDU_USU`
- **Descripción:** Indicar si el NNA ha sido matriculado en una institución educativa durante el año en curso. Tener en cuenta la definición de las categorías:
- **Valores permitidos / Categorías:**
  - `1. Si`: Sí: cuando el NNA cuenta con ficha de matrícula.
  - `2. No`: No: cuando el NNA no se encuentra matriculado en una institución educativa.
  - `3. En proceso de matricula`: En proceso de matrícula: cuando el trámite de matrícula se encuentra en gestión.
  - `99. No aplica`: No aplica:  Cuando el NNA: -Tiene menos de 3 años de edad (0, 1 o 2 años), o -Ha culminado la educación secundaria completa y no se encuentra matriculado en ningún nivel educativo posterior.  Excepción: Esta categoría no se toma en cuenta cuando el NNA, habiendo culminado la secundaria, se encuentra matriculado en un nivel de educación superior (Superior No Universitario incompleto o Superior Universitario incompleto), en cuyo caso deberá registrarse la opción correspondiente según su situación de matrícula.

### 🔹 Ítem 72: `SIST_EDU_USU` - ¿EL EDUCADOR   ACOMPAÑO EN EL PROCESO DE INSERCION DEL NNA AL SISTEMA EDUCATIVO DURANTE ESTE MES?

- **Nombre del campo (BD):** `SIST_EDU_USU`
- **Descripción:** Indicar si el educador acompañó al NNA en el proceso de inserción en el sistema educativo para aquellos niños matriculados o en proceso de matricula.   Importante: Cuando en la pregunta "¿EL NNA HA SIDO MATRICULADO ESTE AÑO EN UNA INSTITUCIÓN EDUCATIVA?"  se haya registrado 2 = No o 99 = No aplica, esta variable no deberá registrarse, por lo que la celda deberá quedar en BLANCO.  Nota: Se entiende por acompañamiento cuando el educador realizó acciones de acompañamiento directas o indirectas relacionadas con la inserción del NNA en el sistema educativo, tales como talleres, charlas, apoyo en tareas, coordinación con la institución educativa u otras acciones similares.
- **Valores permitidos / Categorías:**
  - `1. Si`: Indicar si el educador acompañó al NNA en el proceso de inserción en el sistema educativo para aquellos niños matriculados o en proceso de matricula.   Importante: Cuando en la pregunta "¿EL NNA HA SIDO MATRICULADO ESTE AÑO EN UNA INSTITUCIÓN EDUCATIVA?"  se haya registrado 2 = No o 99 = No aplica, esta variable no deberá registrarse, por lo que la celda deberá quedar en BLANCO.  Nota: Se entiende por acompañamiento cuando el educador realizó acciones de acompañamiento directas o indirectas relacionadas con la inserción del NNA en el sistema educativo, tales como talleres, charlas, apoyo en tareas, coordinación con la institución educativa u otras acciones similares.
  - `2. No`

### 🔹 Ítem 73: `TIPO_EDU` - ¿MODALIDAD DE LA INSTITUCIÓN EDUCATIVA A LA QUE ASISTE EL NNA?

- **Nombre del campo (BD):** `TIPO_EDU`
- **Descripción:** Se registra la modalidad de la institución educativa a la que asiste el NNA. Esta información deberá consignarse únicamente cuando el NNA se encuentre matriculado (1) o en proceso de matrícula (3) en una institución educativa.  Cuando en la pregunta "¿EL NNA HA SIDO MATRICULADO ESTE AÑO EN UNA INSTITUCIÓN EDUCATIVA?"  se haya registrado 2 = No o 99 = No aplica, esta variable no deberá registrarse, por lo que la celda deberá quedar en BLANCO, debido a que el NNA no se encuentra vinculado a una institución educativa.
- **Valores permitidos / Categorías:**
  - `1: Básica / regular`: Modalidad dirigida a niños, niñas y adolescentes que transitan oportunamente por el sistema educativo en los niveles de inicial, primaria y secundaria, conforme a lo establecido en la Ley General de Educación N.° 28044.
  - `2: Alternativa (EBA)`: Modalidad educativa dirigida a estudiantes que no accedieron oportunamente o no lograron culminar la Educación Básica Regular, permitiéndoles continuar y concluir sus estudios en condiciones flexibles, pertinentes a sus características y trayectorias educativas.  La Educación Básica Alternativa se organiza en tres ciclos: Ciclo Inicial (Ciclo I y II), Ciclo Intermedio (Ciclo III al VI) y Ciclo Avanzado (Ciclo VII al X).
  - `3: Especial`: Modalidad orientada a la atención de personas con necesidades educativas especiales asociadas a discapacidad, brindando servicios educativos especializados e inclusivos.
  - `4: Superior Técnica`: Nivel de educación superior no universitaria orientado a la formación técnica y profesional, desarrollado en institutos y escuelas de educación superior, conforme a la normativa del MINEDU.
  - `5: Superior Universitaria`: Nivel de educación superior impartido por universidades, orientado a la formación profesional, la investigación y la generación de conocimiento.
  - `6: CETPRO`: Modalidad orientada al desarrollo de competencias laborales y capacidades emprendedoras, brindada en Centros de Educación Técnico-Productiva, conforme a la normativa del MINEDU.

### 🔹 Ítem 74: `ANO_EST` - ¿CUAL ES EL GRADO QUE CURSA ACTUALMENTE EL NNA?

- **Nombre del campo (BD):** `ANO_EST`
- **Descripción:** Se registra el grado o nivel educativo que cursa actualmente el NNA dentro del sistema educativo. Esta variable deberá registrarse cuando el NNA se encuentre matriculado o en proceso de matrícula en una institución educativa, consignando el grado correspondiente según la información disponible.  TENER EN CUENTA: La Educación Básica Alternativa (EBA) se organiza en tres ciclos: Ciclo Inicial (Ciclo I y II), Ciclo Intermedio (Ciclo III al VI) y Ciclo Avanzado (Ciclo VII al X).  Nota: La categoría 99 = No aplica deberá registrarse en los siguientes casos:  1. Cuando el NNA sea menor de 3 años, debido a que no corresponde escolaridad.  2. Cuando la modalidad educativa corresponda a Educación Básica Especial, ya que esta modalidad no se organiza bajo el mismo esquema de grados de la educación básica regular.  3. Cuando la modalidad educativa corresponda a CETPRO, dado que la formación técnico-productiva no se estructura por grados escolares.  4. Cuando el NNA culmino sus estudios basicos obteniendo el nivel educativo secundaria completa.  5. Cuando el NNA no fue matriculado en alguna institución educativa.
- **Valores permitidos / Categorías:**
  - `1: Inicial`: Se registra el grado o nivel educativo que cursa actualmente el NNA dentro del sistema educativo. Esta variable deberá registrarse cuando el NNA se encuentre matriculado o en proceso de matrícula en una institución educativa, consignando el grado correspondiente según la información disponible.  TENER EN CUENTA: La Educación Básica Alternativa (EBA) se organiza en tres ciclos: Ciclo Inicial (Ciclo I y II), Ciclo Intermedio (Ciclo III al VI) y Ciclo Avanzado (Ciclo VII al X).  Nota: La categoría 99 = No aplica deberá registrarse en los siguientes casos:  1. Cuando el NNA sea menor de 3 años, debido a que no corresponde escolaridad.  2. Cuando la modalidad educativa corresponda a Educación Básica Especial, ya que esta modalidad no se organiza bajo el mismo esquema de grados de la educación básica regular.  3. Cuando la modalidad educativa corresponda a CETPRO, dado que la formación técnico-productiva no se estructura por grados escolares.  4. Cuando el NNA culmino sus estudios basicos obteniendo el nivel educativo secundaria completa.  5. Cuando el NNA no fue matriculado en alguna institución educativa.
  - `2: 1ro prim:`
  - `3: 2do prim:`
  - `4: 3ro prim:`
  - `5: 4to prim:`
  - `6: 5to prim:`
  - `7: 6to prim:`
  - `8: 1ro sec:`
  - `9: 2do sec:`
  - `10: 3ro sec:`
  - `11: 4to sec:`
  - `12: 5to sec:`
  - `13: Ciclo I`
  - `14: Ciclo II`
  - `15: Ciclo III`
  - `16: Ciclo IV`
  - `17: Ciclo V`
  - `18: Ciclo VI`
  - `19: Ciclo VII`
  - `20 Ciclo VIII`
  - `21 Ciclo IX`
  - `22 Ciclo X`
  - `99: No aplica/ No sabe"`

### 🔹 Ítem 75: `NNA_REDUJO_CALLE` - ¿EL NNA REDUJO EL TIEMPO DE PERMANCIA EN CALLE?

- **Nombre del campo (BD):** `NNA_REDUJO_CALLE`
- **Descripción:** Indica si el/la NNA ha reducido el tiempo de permanencia en situación de calle durante el periodo de seguimiento.  En aquellos casos en los que no sea posible determinar dicha reducción debido a que el/la NNA no fue ubicado(a) durante el periodo de reporte, se deberá registrar la categoría “No”.
- **Valores permitidos / Categorías:**
  - `1: Si`: Indica si el/la NNA ha reducido el tiempo de permanencia en situación de calle durante el periodo de seguimiento.  En aquellos casos en los que no sea posible determinar dicha reducción debido a que el/la NNA no fue ubicado(a) durante el periodo de reporte, se deberá registrar la categoría “No”.
  - `2: No`

### 🔹 Ítem 76: `DIAS_REDUJO_CALLE` - En caso respondió SI en la pregunta anterior, ¿Cuántas días a la semana se redujo el tiempo de permanencia en calle?

- **Nombre del campo (BD):** `DIAS_REDUJO_CALLE`
- **Descripción:** Seleccionar la opción correspondiente según el tiempo de reducción de permanencia en calle del NNA, expresado en rangos equivalentes a días.  Esta variable debe ser completada únicamente cuando en la variable NNA_REDUJO_CALLE se haya respondido “Sí”; en caso contrario, deberá dejarse en blanco.  El registro debe realizarse a partir de la comparación entre la situación inicial del NNA y su situación actual durante el mes de reporte.  La información consignada debe estar sustentada en la observación del educador y/o en la información proporcionada por el NNA y/o su entorno familiar.  Se trata de una estimación aproximada realizada por el educador; por ello, se establecen rangos referenciales que faciliten el registro de la información.
- **Valores permitidos / Categorías:**
  - `0: menos de 1 día (de 1 a 23 horas)`: Seleccionar la opción correspondiente según el tiempo de reducción de permanencia en calle del NNA, expresado en rangos equivalentes a días.  Esta variable debe ser completada únicamente cuando en la variable NNA_REDUJO_CALLE se haya respondido “Sí”; en caso contrario, deberá dejarse en blanco.  El registro debe realizarse a partir de la comparación entre la situación inicial del NNA y su situación actual durante el mes de reporte.  La información consignada debe estar sustentada en la observación del educador y/o en la información proporcionada por el NNA y/o su entorno familiar.  Se trata de una estimación aproximada realizada por el educador; por ello, se establecen rangos referenciales que faciliten el registro de la información.
  - `1: 1 día (24 a 47 horas)`
  - `2: 2 días (48 a 71 horas)`
  - `3: 3 días (72 a 95 horas)`
  - `4: 4 días (96 a 119 horas)`
  - `5: de 5 días a más (de120 horas a más)`

### 🔹 Ítem 77: `NNA_DEJO_CALLE` - NNA DEJÓ SU SITUACIÓN DE CALLE

- **Nombre del campo (BD):** `NNA_DEJO_CALLE`
- **Descripción:** Indicar si el NNA ha dejado su situación de calle (trabajo en calle, mendicidad o vida en calle).
- **Valores permitidos / Categorías:**
  - `1. Si`
  - `2. No`

### 🔹 Ítem 78: `EVA_COM_PAR` - Resultado de la Evaluación de Salida de las sesiones de fortalecimiento de competencias parentales

- **Nombre del campo (BD):** `EVA_COM_PAR`
- **Descripción:** Registrar el resultado de la evaluación de salida de las sesiones de fortalecimiento de competencias parentales. Esta evaluación se realiza una vez al año, generalmente en el mes de noviembre.
- **Valores permitidos / Categorías:**
  - `No Aplica`

### 🔹 Ítem 79: `ESTADO_FAM` - ESTADO ACTUAL DE LA FAMILIA

- **Nombre del campo (BD):** `ESTADO_FAM`
- **Descripción:** Indicar el estado actual de la familia dentro del programa (activa o inactiva). La familia se considera activa mientras al menos uno de sus miembros NNA permanezca activo en el servicio.  Nota: En aquellos casos donde existen dos o más usuarios pertenecientes a la misma familia, el estado ACTIVO se mantiene hasta que el último de ellos finalice o egrese del programa.
- **Valores permitidos / Categorías:**
  - `1: Activo:`: Indicar el estado actual de la familia dentro del programa (activa o inactiva). La familia se considera activa mientras al menos uno de sus miembros NNA permanezca activo en el servicio.  Nota: En aquellos casos donde existen dos o más usuarios pertenecientes a la misma familia, el estado ACTIVO se mantiene hasta que el último de ellos finalice o egrese del programa.
  - `2: Inactivo`

### 🔹 Ítem 80: `FEC_ABORDAJE` - FECHA DE ABORDAJE AL NNA

- **Nombre del campo (BD):** `FEC_ABORDAJE`
- **Descripción:** Registrar la fecha del primer contacto o abordaje del educador con el NNA. Formato DD/MM/AAAA.
- **Valores permitidos / Categorías:**
  - `No Aplica`

### 🔹 Ítem 81: `CONVIVENCIA_NNA` - EL/LA NNA VIVE CON:

- **Nombre del campo (BD):** `CONVIVENCIA_NNA`
- **Descripción:** Seleccionar con quién vive actualmente el NNA.
- **Valores permitidos / Categorías:**
  - `1. Solo Padre`
  - `2. Solo Madre`
  - `3. Padre y madre`
  - `4. Adulto responsable (familia extensa).`
  - `5. Solo`
  - `6. Otro`

### 🔹 Ítem 82: `ACT_PRIN_NNA` - INDICAR LA ACTIVIDAD O TRABAJO QUE REALIZA EL NNA

- **Nombre del campo (BD):** `ACT_PRIN_NNA`
- **Descripción:** Registrar la principal actividad o trabajo que realiza el NNA. (En mayúscula). En caso el niño que trabaja sea menor de 6 años, se debe colocar entre parentesis la palabra (acompañante), al lado de la descripción de la actividad, ya que consideramos que los niños de esa edad son basicamente acompañantes en actividades laborales que desarrollan sus padres o hermanos mayores
- **Valores permitidos / Categorías:**
  - `No Aplica`

### 🔹 Ítem 83: `ACTIVIDAD_ACOMP` - REALIZA SU ACTIVIDAD

- **Nombre del campo (BD):** `ACTIVIDAD_ACOMP`
- **Descripción:** Indicar si el NNA realiza su actividad acompañado o solo.
- **Valores permitidos / Categorías:**
  - `1. Sólo (saltar a la siguiente pregunta)`
  - `2. Acompañado`

### 🔹 Ítem 84: `ACOMP_QUIEN` - ACOMPAÑADO, ¿DE/CON QUIEN?

- **Nombre del campo (BD):** `ACOMP_QUIEN`
- **Descripción:** Seleccionar con quién realiza la actividad el NNA cuando se registra que se encuentra acompañado.
- **Valores permitidos / Categorías:**
  - `1. Padres`
  - `2. Hermanos`
  - `3. Otro familiar`
  - `4. Otro adulto`
  - `5. Otro NNA`

### 🔹 Ítem 85: `MOTIVO_NO_DNI` - MOTIVO POR EL CUAL NO TIENE DNI

- **Nombre del campo (BD):** `MOTIVO_NO_DNI`
- **Descripción:** Seleccionar el motivo por el cual el NNA no cuenta con Documento Nacional de Identidad (DNI), solo si indico "No tiene (7)" en la pregunta "Tipo De Documento Del NNA" (ítem 2). Caso contrario debrerá quedar EN BLANCO. (sin respuesta)
- **Valores permitidos / Categorías:**
  - `1. Desconocimiento`
  - `2.No cuenta con Constancia de nacido vivo`
  - `3.No cuenta con partida de nacimiento`
  - `4. Desinterés de la familia`
  - `5. Registro inadecuado de las partidas de nacimiento.`
  - `6.- Padres sin documentos de identidad`
  - `7.- Falta de recursos económicos`
  - `8. Dificultades para acceso a RENIEC`

### 🔹 Ítem 86: `NNA_TIENE_PARTIDA` - EL NNA CUENTA CON PARTIDA DE NACIMIENTO

- **Nombre del campo (BD):** `NNA_TIENE_PARTIDA`
- **Descripción:** EL NNA CUENTA CON PARTIDA DE NACIMIENTO
- **Valores permitidos / Categorías:**
  - `1. Si`
  - `2. No`: Indicar si el NNA cuenta con partida o acta de nacimiento. Tener en cuenta que, si el NNA cuenta con DNI o CUI/Acta de nacimiento, deberá registrarse obligatoriamente la opción “Sí”, dado que estos documentos implican su inscripción en el registro civil. En el caso de contar únicamente con Certificado de Nacido Vivo (CNV), corresponde registrar “No” o “En trámite”. Esta variable cobra especial relevancia en los casos donde el NNA no cuenta con documento de identidad (DNI).
  - `3. En Trámite`

### 🔹 Ítem 87: `PARTIDA_GESTION_EDU` - OBTUVO LA PARTIDA DE NACIMIENTO POR GESTIÓN DEL EDUCADOR/A

- **Nombre del campo (BD):** `PARTIDA_GESTION_EDU`
- **Descripción:** Indicar si el educador gestionó la obtención de la partida de nacimiento del NNA.
- **Valores permitidos / Categorías:**
  - `1.Si`
  - `2.No`
  - `99. No aplica`

### 🔹 Ítem 88: `DNI_GESTION_EDU` - OBTUVO EL DNI POR GESTIÓN DEL EDUCADOR/A

- **Nombre del campo (BD):** `DNI_GESTION_EDU`
- **Descripción:** Indicar si el educador gestionó la obtención del DNI  del NNA.
- **Valores permitidos / Categorías:**
  - `1.Si`
  - `2.No`

### 🔹 Ítem 89: `VIOLENCIA_NNA` - ¿NNA ha sido víctima de algún tipo de violencia?

- **Nombre del campo (BD):** `VIOLENCIA_NNA`
- **Descripción:** Indicar si el niño, niña o adolescente (NNA) ha sido víctima de algún tipo de violencia durante el mes de reporte señalando el tipo de violencia correspondiente.
- **Valores permitidos / Categorías:**
  - `1. Psicológica`
  - `2. física`
  - `3. Sexual`
  - `4. Ninguna`

### 🔹 Ítem 90: `FINANCIA_ALIM` - ¿QUIEN FINANCIA SU ALIMENTACION?

- **Nombre del campo (BD):** `FINANCIA_ALIM`
- **Descripción:** Seleccionar quién es responsable económico de la alimentación del NNA.
- **Valores permitidos / Categorías:**
  - `1. Su familia`
  - `2. El mismo NNA (ingresos obtenidos por el mismo).`
  - `3. Terceros (comedor popular, iglesia, programa social)`

---

## 📁 6. Derivaciones, Metodología SEC y Entorno Familiar (Ítems 91 al 113)

### 🔹 Ítem 91: `LUGAR_ALIM` - ¿DONDE RECIBE LOS ALIMENTOS?

- **Nombre del campo (BD):** `LUGAR_ALIM`
- **Descripción:** Seleccionar el lugar donde el NNA recibe habitualmente sus alimentos.
- **Valores permitidos / Categorías:**
  - `1. En su hogar`
  - `2. Restaurant`
  - `3. Comedores populares`
  - `4. Puesto de comida`
  - `5. Calle`
  - `6. Otros`

### 🔹 Ítem 92: `DER_PROGRAMA` - EL NNA FUE DERIVADO A UN SERVICIO ESPECIALIZADO / PROGRAMAS DE OTRAS INSTITUCIONES POR PARTE DEL EDUCADOR

- **Nombre del campo (BD):** `DER_PROGRAMA`
- **Descripción:** Indicar si el NNA ha sido derivado por el educador a un servicio especializado o a un programa de otra institución, como parte de las acciones orientadas a contribuir al logro del fin de la situación de calle.  Se considera derivación cuando el educador gestiona y facilita el acceso del NNA a servicios o programas brindados por otras instituciones (públicas o privadas), tales como servicios de salud, educación, protección, entre otros.  No se considera derivación a aquellas actividades organizadas directamente por el educador o el equipo (por ejemplo, gestión de una loza deportiva para la realización de un partido de fútbol), sino únicamente cuando existe articulación con una institución externa que brinda el servicio o actividad y el NNA accede a esta.
- **Valores permitidos / Categorías:**
  - `1. Si`: Indicar si el NNA ha sido derivado por el educador a un servicio especializado o a un programa de otra institución, como parte de las acciones orientadas a contribuir al logro del fin de la situación de calle.  Se considera derivación cuando el educador gestiona y facilita el acceso del NNA a servicios o programas brindados por otras instituciones (públicas o privadas), tales como servicios de salud, educación, protección, entre otros.  No se considera derivación a aquellas actividades organizadas directamente por el educador o el equipo (por ejemplo, gestión de una loza deportiva para la realización de un partido de fútbol), sino únicamente cuando existe articulación con una institución externa que brinda el servicio o actividad y el NNA accede a esta.
  - `2. No (Pasar a 97)`

### 🔹 Ítem 93: `NOMBRE_INST` - Nombre de la Institución a la cual fue derivado.

- **Nombre del campo (BD):** `NOMBRE_INST`
- **Descripción:** Registrar el nombre de la institución o servicio al cual fue derivado el NNA. Esta variable se completa solo si en DER_PROGRAMA se respondió “Sí”.
- **Valores permitidos / Categorías:**
  - `No Aplica`

### 🔹 Ítem 94: `MOTIVO_DERIVACION` - MOTIVO DE LA DERIVACIÓN

- **Nombre del campo (BD):** `MOTIVO_DERIVACION`
- **Descripción:** Seleccionar el motivo principal por el cual el NNA fue derivado a otra institución o servicio.
- **Valores permitidos / Categorías:**
  - `1. Atención educativa`: Cuando el NNA es derivado para recibir un conjunto de acciones pedagógicas, psicológicas y sociales que buscan garantizar que cada estudiante pueda aprender en condiciones adecuadas. Ejemplo: reforzamiento escolar, apoyo en tareas.
  - `2. Atención alimentaria`: Cuando el NNA es derivado a servicios vinculados con comedores populares, restaurantes o instituciones que brinden apoyo nutricional. Su finalidad es garantizar el acceso a una alimentación adecuada y suficiente, contribuyendo al bienestar y desarrollo integral.
  - `3. Atención de salud`: Cuando el NNA es derivado a instituciones médicas que puedan atender y dar solución a sus necesidades de salud física o mental. Incluye consultas médicas, tratamientos especializados y programas de prevención.
  - `4. Defensa legal`: Cuando el NNA o el apoderado/a es derivado a un servicio de representación y asesoría jurídica. Su objetivo es garantizar la protección de sus derechos, brindar acompañamiento en procesos judiciales y asegurar el acceso a la justicia.
  - `5. Atención recreativa`: Cuando el NNA es derivado a servicios y espacios vinculados con el ejercicio de su derecho a la recreación. Su finalidad es promover el desarrollo integral mediante actividades culturales, deportivas y lúdicas que favorezcan la socialización, el bienestar emocional y el uso positivo del tiempo libre.
  - `6. Formación laboral`: Cuando el NNA es derivado a servicios de capacitación práctica orientada a tareas específicas en un entorno de trabajo. Ejemplo: cursos de oficios, entrenamientos en empresas privadas o públicas, pasantías, talleres de habilidades blandas.
  - `7. Formación académica`: Cuando el NNA es derivado a una institución educativa orientada a la adquisición de conocimientos, habilidades y competencias. Esta opción se registra especialmente en los adolescentes que han culminado la educación secundaria. Un ejemplo es la preparación preuniversitaria, donde se fortalecen las capacidades académicas para acceder a estudios superiores.
  - `8. Tratamiento por consumo de psicoactivos`: Cuando el NNA es derivado a una institución donde recibirá un conjunto de intervenciones terapéuticas, médicas, psicológicas y sociales dirigidas a personas que presentan problemas derivados del uso de sustancias psicoactivas.
  - `9. Apoyo económico`: Cuando el NNA es derivado a instituciones (pública o privada) donde recibirá apoyo económico o materiales destinados a cubrir necesidades básicas o específicas del NNA. Su objetivo es garantizar condiciones mínimas de bienestar que favorezcan la continuidad educativa, la salud y la integración social.
  - `10. Ayuda al migrante`: Cuando el NNA es derivado a instituciones que realizan acciones de orientación, acompañamiento y asistencia que se brindan a personas en situación de movilidad humana. Busca facilitar su integración social, el acceso a servicios básicos y la protección de sus derechos, especialmente en el caso de NNA migrantes.
  - `11. Otros`: Cuando el NNA es derivado a instituciones que no se encuentran contempladas en las tipologías anteriores, pero que responden a necesidades específicas de los NNA.

### 🔹 Ítem 95: `OTRS_DERIVACION` - Especificar: Otros

- **Nombre del campo (BD):** `OTRS_DERIVACION`
- **Descripción:** Especificar el motivo de la derivación cuando se selecciona la opción Otros
- **Valores permitidos / Categorías:**
  - `No Aplica`

### 🔹 Ítem 96: `MOTIVO_REDUC_CALLE` - MOTIVO DE REDUCCIÓN DE SU SITUACIÓN DE CALLE:

- **Nombre del campo (BD):** `MOTIVO_REDUC_CALLE`
- **Descripción:** Seleccionar el motivo principal por el cual el NNA ha reducido su tiempo de permanencia en calle.  Esta variable se completa solo si en la pregunta "¿EL NNA REDUJO EL TIEMPO DE PERMANENCIA EN CALLE?" se respondió “Sí”; en caso contrario dejarlo en blanco.
- **Valores permitidos / Categorías:**
  - `1. Por refuerzo educativo`: Seleccionar el motivo principal por el cual el NNA ha reducido su tiempo de permanencia en calle.  Esta variable se completa solo si en la pregunta "¿EL NNA REDUJO EL TIEMPO DE PERMANENCIA EN CALLE?" se respondió “Sí”; en caso contrario dejarlo en blanco.
  - `2. Por inserción/reinserción escolar`
  - `3. Participación en las actividades recreativas`
  - `4. Participación en servicios del programa`
  - `5. Participación en talleres de habilidades`
  - `6. Asistencia a centro de referencia`
  - `7. Adolescentes realizan actividades laborales que no afectan su desarrollo integral (SEGÚN NORMATIVIDAD VIGENTE)`
  - `8. Familia asume su rol de manera progresiva`
  - `9. Derivación a un servicio de otras instituciones/ casa hogar/ONG`
  - `10. Otros`

### 🔹 Ítem 97: `MOTIVO_NO_DEJA` - MOTIVO POR LOS CUALES EL NNA NO DEJA SITUACION DE CALLE, INDICAR POR QUÉ?

- **Nombre del campo (BD):** `MOTIVO_NO_DEJA`
- **Descripción:** Registrar el motivo por el cual el NNA no ha dejado la situación de calle. Esta variable se completa solo si en la pregunta "NNA DEJÓ SU SITUACIÓN DE CALLE (Trabajo en calle, Mendicidad, y Vida en calle)" se respondió “No”; en caso contrario dejarlo en blanco.
- **Valores permitidos / Categorías:**
  - `1.Cultural`: Cuando se tienen patrones, hábitos o prácticas normalizadas en el entorno familiar o comunitario que naturalizan la permanencia del NNA en la calle (por ejemplo, trabajo infantil visto como parte de la crianza o tradición familiar).
  - `2.Situación económica`: Cuando las condiciones de pobreza o necesidad económica del hogar que motivan o obligan al NNA a permanecer en la calle para generar ingresos.
  - `3.Deterioro progresivo y de tiempo prolongado`: Cuando los NNA presentan una permanencia prolongada en calle, generando un proceso de adaptación o arraigo que dificulta su desvinculación (incluye situaciones de abandono, consumo, desvinculación familiar o institucionalización fallida).
  - `4.Familia NO respeta los derechos del NNA y lo expone a la calle.`: Se refiere a situaciones en las que el entorno familiar vulnera los derechos del NNA, promoviendo, permitiendo o forzando su permanencia en la calle (por negligencia, explotación, violencia u otras formas de vulneración).

### 🔹 Ítem 98: `MOTIVO_DEJA_CALLE` - MOTIVOS POR LOS CUALES EL/LA NNA DEJÓ LA SITUACIÓN DE CALLE:

- **Nombre del campo (BD):** `MOTIVO_DEJA_CALLE`
- **Descripción:** Registrar el motivo por el cual el NNA SI ha dejado la situación de calle. Esta variable se completa solo si en la pregunta "NNA DEJÓ SU SITUACIÓN DE CALLE (Trabajo en calle, Mendicidad, y Vida en calle)" se respondió “Si”; en caso contrario dejarlo en blanco.
- **Valores permitidos / Categorías:**
  - `1. Alcanzó los logros propuestos en el proceso de intervención`: Se refiere a casos en los que el NNA ha cumplido los objetivos establecidos en su proceso de intervención, logrando la desvinculación de la situación de calle, así como mejoras en su entorno familiar, educativo y social.  Esta categoría corresponde a aquellos NNA que han alcanzado la Fase III del proceso de intervención, evidenciando condiciones favorables para su egreso del servicio. Cabe resaltar que los 24 meses de intervención no son requisitos de cumplimiento obligatoria sino es refencial ya que el avance depende de la consecucion de los objetivos de la intervención.
  - `2.Por ingreso a centro de atención (CAR, casa de acogida, centro de rehabilitación, diagnóstico, tratamiento, etc.)`: Se refiere a casos en los que el NNA deja la situación de calle debido a su ingreso a un servicio o institución de atención especializada que garantiza su protección, cuidado o tratamiento (CAR, casa de acogida, centro de rehabilitación, diagnóstico, tratamiento, etc.).
  - `3. Otros.`: Cuando el NNA deja la situación de calle debido a otros motivos que no se encuentran contempladas en las tipologías anteriores.

### 🔹 Ítem 99: `GRADO_EST_APO` - GRADO DE INSTRUCCIÓN DEL ADULTO RESPONSABLE:

- **Nombre del campo (BD):** `GRADO_EST_APO`
- **Descripción:** Seleccionar el grado o nivel de instrucción alcanzado por el adulto responsable del NNA.
- **Valores permitidos / Categorías:**
  - `1. Sin Estudios`
  - `2. Primaria`
  - `3. Secundaria`
  - `4. Superior no universitario`
  - `5. Superior universitario"`

### 🔹 Ítem 100: `SIT_CONYUGAL` - ¿SITUACIÓN CONYUGAL (estado civil) DE LOS PADRES O TUTORES?

- **Nombre del campo (BD):** `SIT_CONYUGAL`
- **Descripción:** Esta variable permite identificar la situación conyugal actual de los padres biológicos o del adulto responsable (tutor) del NNA, considerando su estado civil o tipo de unión al momento del registro.  El registro de esta variable debe realizarse de manera coherente con la convivencia en el hogar y con el tipo familiar del NNA registrado.
- **Valores permitidos / Categorías:**
  - `1. Casados`: Esta variable permite identificar la situación conyugal actual de los padres biológicos o del adulto responsable (tutor) del NNA, considerando su estado civil o tipo de unión al momento del registro.  El registro de esta variable debe realizarse de manera coherente con la convivencia en el hogar y con el tipo familiar del NNA registrado.
  - `2. Soltero/a`
  - `3. Convivientes`
  - `4. Separados`
  - `5. Divorciados`
  - `6. Viuda/o`

### 🔹 Ítem 101: `SIT_PADRE` - SITUACIÓN DEL PADRE BIOLÓGICO:

- **Nombre del campo (BD):** `SIT_PADRE`
- **Descripción:** Esta variable permite identificar la situación actual del padre biológico del NNA en relación con su presencia, convivencia y vínculo con el hogar, considerando su condición real al momento del registro.  Tener en cuenta que la respuesta debe ser coherente con la variable 46. Tipo de familia del NNA, especialmente en lo referido a la convivencia en el hogar.
- **Valores permitidos / Categorías:**
  - `1. Vive en el hogar con el NNA`: Esta variable permite identificar la situación actual del padre biológico del NNA en relación con su presencia, convivencia y vínculo con el hogar, considerando su condición real al momento del registro.  Tener en cuenta que la respuesta debe ser coherente con la variable 46. Tipo de familia del NNA, especialmente en lo referido a la convivencia en el hogar.
  - `2. Vive con otra familia`
  - `3. Abandono hogar`
  - `4. Se encuentra preso`
  - `5. No habido`
  - `6. Fallecido`

### 🔹 Ítem 102: `SIT_MADRE` - "SITUACIÓN DE LA MADRE BIOLÓGICA

- **Nombre del campo (BD):** `SIT_MADRE`
- **Descripción:** Seleccionar la situación actual del madre biológica del NNA. Esta variable permite identificar la situación actual de la madre biológica del NNA en relación con su presencia, convivencia y vínculo con el hogar, considerando su condición real al momento del registro.  Tener en cuenta que la respuesta debe ser coherente con el tipo de familia del NNA, especialmente en lo referido a la convivencia en el hogar.
- **Valores permitidos / Categorías:**
  - `1. Vive en el hogar con el NNA`: Seleccionar la situación actual del madre biológica del NNA. Esta variable permite identificar la situación actual de la madre biológica del NNA en relación con su presencia, convivencia y vínculo con el hogar, considerando su condición real al momento del registro.  Tener en cuenta que la respuesta debe ser coherente con el tipo de familia del NNA, especialmente en lo referido a la convivencia en el hogar.
  - `2. Vive con otra familia`
  - `3. Abandono hogar`
  - `4. Se encuentra preso`
  - `5. No habido`
  - `6. Fallecido`

### 🔹 Ítem 103: `APO_TRABAJA` - ¿EL ADULTO RESPONSABLE TRABAJA ACTUALMENTE?

- **Nombre del campo (BD):** `APO_TRABAJA`
- **Descripción:** Indica si el adulto responsable del NNA realiza actualmente alguna actividad laboral, ya sea dependiente o independiente, que le genere ingresos.
- **Valores permitidos / Categorías:**
  - `1. Si`
  - `2. No`: Si la respuesta es “2: No”, la variable 104. TIPO DE TRABAJO deberá quedar en BLANCO.  Si la respuesta es “1: Sí”, se debe completar obligatoriamente la variable 104.

### 🔹 Ítem 104: `TIPO_TRABAJO_APO` - ¿DE ACUERDO CON EL TIPO DE RELACIÓN DE DEPENDENCIA LABORAL, QUE TIPO DE TRABAJO DESEMPEÑA?

- **Nombre del campo (BD):** `TIPO_TRABAJO_APO`
- **Descripción:** Seleccionar el tipo de relación laboral del adulto responsable (trabajo dependiente o independiente).
- **Valores permitidos / Categorías:**
  - `1. Trabajo dependiente`
  - `2. Trabajo independiente`: Esta variable debe ser completada únicamente cuando en la variable 103. APO_TRABAJA = 1 (Sí). Si en la variable 103 se registra “2: No”, esta variable debe quedar en blanco.

### 🔹 Ítem 105: `TIENE_ANTESCEDENTES` - ¿EL ADULTO RESPONSABLE DEL NNA TIENE ALGÚN ANTECEDENTE PENAL?

- **Nombre del campo (BD):** `TIENE_ANTESCEDENTES`
- **Descripción:** Indicar si el adulto responsable del NNA tiene antecedentes penales.
- **Valores permitidos / Categorías:**
  - `1. Si`
  - `2. No`

### 🔹 Ítem 106: `APO_ADICCIONES` - DEL ADULTO RESPONSABLE (INDICAR LA DE MAYOR FRECUENCIA):

- **Nombre del campo (BD):** `APO_ADICCIONES`
- **Descripción:** Seleccionar el tipo de consumo de sustancias que presenta el adulto responsable, según lo manifestado o identificado.
- **Valores permitidos / Categorías:**
  - `1. Consume drogas legales`
  - `2. Consume drogas ilegales`
  - `3. Frecuenta casinos (Juegos de azar)`
  - `4. Todas las anteriores`
  - `5. Ninguna de las anteriores`
  - `6. No responde`

### 🔹 Ítem 107: `CONSUME_DROGAS` - ¿SÓLO SI EL ADULTO RESPONSABLE CONSUME DROGAS ESPECIFIQUE CUAL?

- **Nombre del campo (BD):** `CONSUME_DROGAS`
- **Descripción:** Registrar el tipo de droga que consume el adulto responsable cuando corresponda. Solo si en la pregunta anterior indico que consume drogas legales e ilegales.
- **Valores permitidos / Categorías:**
  - `Drogas legales:`
  - `1. Alcohol`
  - `2. Tabaco`
  - `Drogas ilegales:`
  - `3. Marihuana`
  - `4. Pasta básica de cocaína`
  - `5. Clorhidrato de cocaína`
  - `6. Éxtasis`
  - `7. Inhalantes`
  - `8. Anfetaminas`
  - `9. Heroína`
  - `10. Otros`

### 🔹 Ítem 108: `APO_PARTICIPA_TALLER` - EL ADULTO RESPONSABLE DEL NNA PARTICIPA EN TALLERES EJECUTADOS POR EL SEC

- **Nombre del campo (BD):** `APO_PARTICIPA_TALLER`
- **Descripción:** Indicar si el adulto responsable participa en talleres organizados por el Servicio de Educadores de Calle (SEC) durante el mes de reporte.
- **Valores permitidos / Categorías:**
  - `1. Si`
  - `2. No`

### 🔹 Ítem 109: `TALLER_PART` - ¿EN QUE TALLER PARTICIPO?

- **Nombre del campo (BD):** `TALLER_PART`
- **Descripción:** Seleccionar el tipo de taller en el que participa el adulto responsable.
- **Valores permitidos / Categorías:**
  - `1. Riesgos y peligros a los que están expuestos los NNA en las calles`
  - `2. Pautas de crianza`
  - `3. Relaciones familiares saludables`
  - `4. Prevención de la violencia familiar y maltrato infantil`
  - `5. Rol protector y proveedor`
  - `6. Importancia del derecho a NNA`
  - `7. Competencias Parentales`
  - `8. Otros (especificar en la siguiente columna)`

### 🔹 Ítem 110: `TALLER_ESPECIFICAR` - Especificar

- **Nombre del campo (BD):** `TALLER_ESPECIFICAR`
- **Descripción:** Especificar el tipo de taller cuando se selecciona la opción Otros.
- **Valores permitidos / Categorías:**
  - `No Aplica`

### 🔹 Ítem 111: `TALLER_FORMATIVO` - ¿EL/NA NNA PARTICIPA EN TALLERES/ACTIVIDADES SOCIO FORMATIVOS DEL SERVICIO DE EDUCADORES DE CALLE?

- **Nombre del campo (BD):** `TALLER_FORMATIVO`
- **Descripción:** Indicar si el NNA participa en talleres o actividades formativos organizadas directamente por el educador  del servicio durante el mes de reporte.
- **Valores permitidos / Categorías:**
  - `1. Si`
  - `2. No`

### 🔹 Ítem 112: `TALLER_DEPORTIVO` - ¿EL/LA NNA PARTICIPA EN TALLERES/ACTIVIDADES RECREATIVO-DEPORTIVO DEL SERVICIO DE EDUCADORES DE CALLE?

- **Nombre del campo (BD):** `TALLER_DEPORTIVO`
- **Descripción:** Indicar si el NNA participa en talleres/actividades recreativos o deportivos organizadas directamente por el educador del servicio durante el mes de reporte.
- **Valores permitidos / Categorías:**
  - `1. Si`
  - `2. No`

### 🔹 Ítem 113: `TALLER_CULTURAL` - ¿EL/LA NNA PARTICIPA EN TALLERES/ACTIVIDADES CULTURALES DEL SERVICIO DE EDUCADORES DE CALLE?

- **Nombre del campo (BD):** `TALLER_CULTURAL`
- **Descripción:** Indicar si el NNA participa en talleres o actividades culturales organizadas directamente por el educador del servicio durante el mes de reporte.
- **Valores permitidos / Categorías:**
  - `1. Si`
  - `2. No`

---

## 📌 Anexo A: Códigos de Servicio por Región

| Región | Código de Servicio |
| :--- | :---: |
| REGIÓN | `CÓDIGO` |
| APURÍMAC | `371` |
| AREQUIPA | `391` |
| AYACUCHO | `392` |
| CAJAMARCA | `393` |
| ANCASH | `394` |
| CUSCO | `395` |
| HUANCAVELICA | `396` |
| JUNÍN | `397` |
| HUÁNUCO | `398` |
| HUARAL | `399` |
| ICA | `400` |
| LORETO | `401` |
| LAMBAYEQUE | `402` |
| MOQUEGUA | `403` |
| LIMA | `404` |
| PIURA | `406` |
| PUNO | `407` |
| TACNA | `408` |
| LA LIBERTAD | `409` |
| TUMBES | `544` |
| PASCO | `551` |
| UCAYALI | `552` |
| JAÉN | `732` |

---

## 📌 Anexo B: Tabla de Ciclos EBA

| Código BD | Ciclo | Nivel EBA |
| :---: | :--- | :--- |
| `13` | Ciclo I | Inicial 1 |
| `14` | Ciclo II | Inicial 2 |
| `15` | Ciclo III | Intermedio 1 |
| `16` | Ciclo IV | Intermedio 2 |
| `17` | Ciclo V | Intermedio 3 |
| `18` | Ciclo VI | Intermedio 4 |
| `19` | Ciclo VII | Avanzado 1 |
| `20` | Ciclo VIII | Avanzado 2 |
| `21` | Ciclo IX | Avanzado 3 |
| `22` | Ciclo X | Avanzado 4 |

