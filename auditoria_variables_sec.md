# 📊 Auditoría Completa de Mapeo de Variables SEC (2026)

Este cuadro detalla la correspondencia de las **119 variables** oficiales entre la base de datos (Oracle) y la interfaz (React).

> [!NOTE]
> Las variables que se guardan en base de datos de manera flexible dentro de la columna JSON de respaldo `DATOS_F03` (para no alterar innecesariamente el esquema tabular rígido) se consideran implementadas en la base de datos (`✅ Sí`).

| Ítem | Código Variable | Nombre / Descripción de la Variable | BD (Oracle) | Frontend (React) | Estado del Mapeo |
| :---: | :--- | :--- | :---: | :---: | :--- |
| 1 | `Código del Usuario/a` | Código del Usuario/a | ✅ Sí | ✅ Sí | 🟢 Completo |
| 2 | `TIPO_DOC_USU` | Tipo De Documento Del NNA | ✅ Sí | ✅ Sí | 🟢 Completo |
| 3 | `NRO_DOC_USU` | Número del documento NNA | ✅ Sí | ✅ Sí | 🟢 Completo |
| 4 | `PRI_APE_USU` | Apellido paterno NNA | ✅ Sí | ✅ Sí | 🟢 Completo |
| 5 | `SEG_APE_USU` | Apellido materno NNA | ✅ Sí | ✅ Sí | 🟢 Completo |
| 6 | `NOM_USU` | Nombres NNA | ✅ Sí | ✅ Sí | 🟢 Completo |
| 7 | `SEXO_USU` | Sexo del NNA | ✅ Sí | ✅ Sí | 🟢 Completo |
| 8 | `FECHA_NAC_USU` | Fecha De Nacimiento NNA | ✅ Sí | ✅ Sí | 🟢 Completo |
| 9 | `EDAD_USU` | Edad en años NNA | ✅ Sí | ✅ Sí | 🟢 Completo |
| 10.1 | `GRU_ET1` | Grupo etario 1 | ✅ Sí | ✅ Sí | 🟢 Completo |
| 10.2 | `GRU_ET2` | Grupo etario 2 | ✅ Sí | ✅ Sí | 🟢 Completo |
| 10.3 | `GRU_ET3` | Grupo etario 3 | ✅ Sí | ✅ Sí | 🟢 Completo |
| 10.4 | `GRU_ET4` | Grupo etario 4 | ✅ Sí | ✅ Sí | 🟢 Completo |
| 10.5 | `GRU_ET5` | Grupo etario 5 | ✅ Sí | ✅ Sí | 🟢 Completo |
| 10.6 | `GRU_ET6` | Grupo etario 6 | ✅ Sí | ✅ Sí | 🟢 Completo |
| 11 | `PAI_USU` | País (lugar de nacimiento) | ✅ Sí | ✅ Sí | 🟢 Completo |
| 12 | `DEP_NAC` | Departamento (lugar de nacimiento) | ✅ Sí | ✅ Sí | 🟢 Completo |
| 13 | `PROV_NAC` | Provincia (lugar de nacimiento) | ✅ Sí | ✅ Sí | 🟢 Completo |
| 14 | `DIS_NAC` | Distrito (lugar de nacimiento) | ✅ Sí | ✅ Sí | 🟢 Completo |
| 15 | `DIR_RES` | Dirección del domicilio del NNA | ✅ Sí | ✅ Sí | 🟢 Completo |
| 16 | `DEP_RES` | Departamento NNA | ✅ Sí | ✅ Sí | 🟢 Completo |
| 17 | `PROV_RES` | Provincia NNA | ✅ Sí | ✅ Sí | 🟢 Completo |
| 18 | `DIS_RES` | Distrito NNA | ✅ Sí | ✅ Sí | 🟢 Completo |
| 19 | `CCPP_RES` | Centro poblado/localidad NNA | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 20 | `TIENE_DISCAP` | ¿NNA presenta alguna discapacidad? | ✅ Sí | ✅ Sí | 🟢 Completo |
| 21 | `TIPO_DISCAP_USU` | Qué tipo de discapacidad presenta el NNA | ✅ Sí | ✅ Sí | 🟢 Completo |
| 22 | `CERT_DISCAP_USU` | ¿El NNA cuenta con el Certificado de Discapacidad? | ✅ Sí | ✅ Sí | 🟢 Completo |
| 23 | `CARNET_CONADIS_USU` | ¿El usuario cuenta con Carné de Inscripción al Registro Nacional de la Persona con Discapacidad del CONADIS? | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 24 | `LEN_MAT` | ¿Cuál es el idioma o lengua materna con el que aprendió a hablar en su niñez? | ✅ Sí | ✅ Sí | 🟢 Completo |
| 25 | `LEN_MAT_ESP` | Especificar en caso se haya marcado 9 o 12 en la pregunta anterior | ✅ Sí | ✅ Sí | 🟢 Completo |
| 26 | `AUTO_ID_ETN` | Por sus costumbres y sus antepasados, Usted se siente o considera: | ✅ Sí | ✅ Sí | 🟢 Completo |
| 27 | `AUTO_ID_ETN_ESP` | Especificar en caso se haya marcado 3, 4 u 8 en la pregunta anterior | ✅ Sí | ✅ Sí | 🟢 Completo |
| 28 | `VIC_IND_FEM` | Víctima indirecta de feminicidio | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 29 | `TIENE_TUTOR_APO` | El usuario/a tiene tutor o apoderado | ✅ Sí | ✅ Sí | 🟢 Completo |
| 30 | `PRI_APE_TUT_APO` | APELLIDO PATERNO DEL ADULTO RESPONSABLE | ✅ Sí | ✅ Sí | 🟢 Completo |
| 31 | `SEG_APE_TUT_APO` | APELLIDO MATERNO DEL ADULTO RESPONSABLE | ✅ Sí | ✅ Sí | 🟢 Completo |
| 32 | `NOM_APE_TUT_APO` | NOMBRES DEL ADULTO RESPONSABLE | ✅ Sí | ✅ Sí | 🟢 Completo |
| 33 | `SEXO_APO` | SEXO DEL ADULTO RESPONSABLE | ✅ Sí | ✅ Sí | 🟢 Completo |
| 34 | `FECHA_NAC_APO` | FECHA DE NACIMIENTO DEL ADULTO RESPONSABLE | ✅ Sí | ✅ Sí | 🟢 Completo |
| 35 | `NACIONALIDAD_APO` | NACIONALIDAD DEL ADULTO RESPONSABLE | ✅ Sí | ✅ Sí | 🟢 Completo |
| 36 | `TIP_DOC_TUT_APO` | TIPO DE DOCUMENTO DEL ADULTO RESPONSABLE | ✅ Sí | ✅ Sí | 🟢 Completo |
| 37 | `NRO_DOC_TUT_APO` | N° DE DOCUMENTO DE IDENTIDAD DEL ADULTO RESPONSABLE | ✅ Sí | ✅ Sí | 🟢 Completo |
| 38 | `VIN_TUT_USU` | Vinculo del Tutor o Apoderado con el/la NNA: | ✅ Sí | ✅ Sí | 🟢 Completo |
| 39 | `LEN_MAT_APO` | ¿Cuál es el idioma o lengua materna con el que aprendió a hablar en su niñez? | ✅ Sí | ✅ Sí | 🟢 Completo |
| 40 | `LEN_MAT_ESP_APO` | Especificar en caso se haya marcado 9 o 12 en la pregunta anterior | ✅ Sí | ✅ Sí | 🟢 Completo |
| 41 | `AUT_IDE_ET_APO` | Por sus costumbres y sus antepasados, Usted se siente o considera: | ✅ Sí | ✅ Sí | 🟢 Completo |
| 42 | `AUT_IDE_ET_ESP_APO` | Especificar en caso se haya marcado 3, 4 u 8 en la pregunta anterior | ✅ Sí | ✅ Sí | 🟢 Completo |
| 43 | `TIPO_DISCAP_APO` | ¿EL ADULTO RESPONSABLE TIENE ALGUNA DISCAPACIDAD? | ✅ Sí | ✅ Sí | 🟢 Completo |
| 44 | `CERT_DISCAP_APO` | ¿El Adulto responsable cuenta con el Certificado de Discapacidad? | ✅ Sí | ✅ Sí | 🟢 Completo |
| 45 | `MIENBROS_FAM` | Número de miembros de la Familia de NNA | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 46 | `TIP_FAM` | Tipo de familia | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 47 | `DNI_EDUCADOR` | DNI del Educador/a | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 48 | `AP_EDUCADOR` | Apellido Paterno del Educador/a | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 49 | `AM_EDUCADOR` | Apellido Materno del Educador/a | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 50 | `NOM_EDUCADOR` | Nombres del Educador/a | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| - | `COD_SER` | Codigo del servicio | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 51 | `CENTRO_POI` | Centro de atención POI | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 52 | `DEPARTAMENTO` | Departamento del Centro de Atención POI | ✅ Sí | ✅ Sí | 🟢 Completo |
| 53 | `PROVINCIA` | Provincia | ✅ Sí | ✅ Sí | 🟢 Completo |
| 54 | `DISTRITO` | Distrito | ✅ Sí | ✅ Sí | 🟢 Completo |
| 55 | `ZONA_INTERVENCION` | Zona de intervención | ✅ Sí | ✅ Sí | 🟢 Completo |
| 56 | `AREA_RESIDENCIA` | Área de residencia del centro de atención POI | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 57 | `PROT_PREVENIR` | Estrategía Prevenir para Proteger | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 58 | `FECHA_ING` | Fecha de ingreso al servicio | ✅ Sí | ✅ Sí | 🟢 Completo |
| 59 | `FECHA_REING` | Fecha de reingreso al servicio | ✅ Sí | ✅ Sí | 🟢 Completo |
| 60 | `MED_ING` | Modalidad de ingreso al servicio | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 61 | `TIP_ING` | Estado del NNA en el mes | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 62 | `PER_ING` | Perfil del NNA | ✅ Sí | ✅ Sí | 🟢 Completo |
| 63 | `PER_FAS` | Fase de intervención | ✅ Sí | ✅ Sí | 🟢 Completo |
| 64 | `TIP_SEG_SAL` | ¿Tipo de seguro de Salud? | ✅ Sí | ✅ Sí | 🟢 Completo |
| 65 | `NIV_EDU` | ¿Cuál es el nivel educativo actual del NNA? | ✅ Sí | ✅ Sí | 🟢 Completo |
| 66 | `ELAB_INF_SIT` | Educador ELABORÓ informe situacional de NNA | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 67 | `PRES_INF_SIT` | Educador presentó informe situacional a UPE o DEMUNA acreditada | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 68 | `ESTADO ACTUAL DEL NNA` | ESTADO ACTUAL DEL NNA | ✅ Sí | ✅ Sí | 🟢 Completo |
| 69 | `FECHA_EGRESO` | FECHA DE EGRESO / RETIRO | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 70 | `MOT_EGR` | MOTIVO DE EGRESO / RETIRO | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 71 | `EDU_USU` | ¿EL NNA HA SIDO MATRICULADO ESTE AÑO EN UNA INSTITUCIÓN EDUCATIVA? | ✅ Sí | ✅ Sí | 🟢 Completo |
| 72 | `SIST_EDU_USU` | ¿EL EDUCADOR   ACOMPAÑO EN EL PROCESO DE INSERCION DEL NNA AL SISTEMA EDUCATIVO DURANTE ESTE MES? | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 73 | `TIPO_EDU` | ¿MODALIDAD DE LA INSTITUCIÓN EDUCATIVA A LA QUE ASISTE EL NNA? | ✅ Sí | ✅ Sí | 🟢 Completo |
| 74 | `ANO_EST` | ¿CUAL ES EL GRADO QUE CURSA ACTUALMENTE EL NNA? | ✅ Sí | ✅ Sí | 🟢 Completo |
| 75 | `NNA_REDUJO_CALLE` | ¿EL NNA REDUJO EL TIEMPO DE PERMANCIA EN CALLE? | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 76 | `DIAS_REDUJO_CALLE` | En caso respondió SI en la pregunta anterior, ¿Cuántas días a la semana se redujo el tiempo de permanencia en calle? | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 77 | `NNA_DEJO_CALLE` | NNA DEJÓ SU SITUACIÓN DE CALLE | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 78 | `EVA_COM_PAR` | Resultado de la Evaluación de Salida de las sesiones de fortalecimiento de competencias parentales | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 79 | `ESTADO_FAM` | ESTADO ACTUAL DE LA FAMILIA | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 80 | `FEC_ABORDAJE` | FECHA DE ABORDAJE AL NNA | ✅ Sí | ✅ Sí | 🟢 Completo |
| 81 | `CONVIVENCIA_NNA` | EL/LA NNA VIVE CON: | ✅ Sí | ✅ Sí | 🟢 Completo |
| 82 | `ACT_PRIN_NNA` | INDICAR LA ACTIVIDAD O TRABAJO QUE REALIZA EL NNA | ✅ Sí | ✅ Sí | 🟢 Completo |
| 83 | `ACTIVIDAD_ACOMP` | REALIZA SU ACTIVIDAD | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 84 | `ACOMP_QUIEN` | ACOMPAÑADO, ¿DE/CON QUIEN? | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 85 | `MOTIVO_NO_DNI` | MOTIVO POR EL CUAL NO TIENE DNI | ✅ Sí | ✅ Sí | 🟢 Completo |
| 86 | `NNA_TIENE_PARTIDA` | EL NNA CUENTA CON PARTIDA DE NACIMIENTO | ✅ Sí | ✅ Sí | 🟢 Completo |
| 87 | `PARTIDA_GESTION_EDU` | OBTUVO LA PARTIDA DE NACIMIENTO POR GESTIÓN DEL EDUCADOR/A | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 88 | `DNI_GESTION_EDU` | OBTUVO EL DNI POR GESTIÓN DEL EDUCADOR/A | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 89 | `VIOLENCIA_NNA` | ¿NNA ha sido víctima de algún tipo de violencia? | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 90 | `FINANCIA_ALIM` | ¿QUIEN FINANCIA SU ALIMENTACION? | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 91 | `LUGAR_ALIM` | ¿DONDE RECIBE LOS ALIMENTOS? | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 92 | `DER_PROGRAMA` | EL NNA FUE DERIVADO A UN SERVICIO ESPECIALIZADO / PROGRAMAS DE OTRAS INSTITUCIONES POR PARTE DEL EDUCADOR | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 93 | `NOMBRE_INST` | Nombre de la Institución a la cual fue derivado. | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 94 | `MOTIVO_DERIVACION` | MOTIVO DE LA DERIVACIÓN | ✅ Sí | ✅ Sí | 🟢 Completo |
| 95 | `OTRS_DERIVACION` | Especificar: Otros | ✅ Sí | ✅ Sí | 🟢 Completo |
| 96 | `MOTIVO_REDUC_CALLE` | MOTIVO DE REDUCCIÓN DE SU SITUACIÓN DE CALLE: | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 97 | `MOTIVO_NO_DEJA` | MOTIVO POR LOS CUALES EL NNA NO DEJA SITUACION DE CALLE, INDICAR POR QUÉ? | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 98 | `MOTIVO_DEJA_CALLE` | MOTIVOS POR LOS CUALES EL/LA NNA DEJÓ LA SITUACIÓN DE CALLE: | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 99 | `GRADO_EST_APO` | GRADO DE INSTRUCCIÓN DEL ADULTO RESPONSABLE: | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 100 | `SIT_CONYUGAL` | ¿SITUACIÓN CONYUGAL (estado civil) DE LOS PADRES O TUTORES? | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 101 | `SIT_PADRE` | SITUACIÓN DEL PADRE BIOLÓGICO: | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 102 | `SIT_MADRE` | "SITUACIÓN DE LA MADRE BIOLÓGICA | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 103 | `APO_TRABAJA` | ¿EL ADULTO RESPONSABLE TRABAJA ACTUALMENTE? | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 104 | `TIPO_TRABAJO_APO` | ¿DE ACUERDO CON EL TIPO DE RELACIÓN DE DEPENDENCIA LABORAL, QUE TIPO DE TRABAJO DESEMPEÑA? | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 105 | `TIENE_ANTESCEDENTES` | ¿EL ADULTO RESPONSABLE DEL NNA TIENE ALGÚN ANTECEDENTE PENAL? | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 106 | `APO_ADICCIONES` | DEL ADULTO RESPONSABLE (INDICAR LA DE MAYOR FRECUENCIA): | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 107 | `CONSUME_DROGAS` | ¿SÓLO SI EL ADULTO RESPONSABLE CONSUME DROGAS ESPECIFIQUE CUAL? | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 108 | `APO_PARTICIPA_TALLER` | EL ADULTO RESPONSABLE DEL NNA PARTICIPA EN TALLERES EJECUTADOS POR EL SEC | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 109 | `TALLER_PART` | ¿EN QUE TALLER PARTICIPO? | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 110 | `TALLER_ESPECIFICAR` | Especificar | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 111 | `TALLER_FORMATIVO` | ¿EL/NA NNA PARTICIPA EN TALLERES/ACTIVIDADES SOCIO FORMATIVOS DEL SERVICIO DE EDUCADORES DE CALLE? | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 112 | `TALLER_DEPORTIVO` | ¿EL/LA NNA PARTICIPA EN TALLERES/ACTIVIDADES RECREATIVO-DEPORTIVO DEL SERVICIO DE EDUCADORES DE CALLE? | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |
| 113 | `TALLER_CULTURAL` | ¿EL/LA NNA PARTICIPA EN TALLERES/ACTIVIDADES CULTURALES DEL SERVICIO DE EDUCADORES DE CALLE? | ✅ Sí | ❌ No | 🟡 Pendiente Frontend |

### 📈 Resumen Estadístico

- **Variables Completamente Mapeadas (BD + Frontend):** 67 / 119 (56%)
- **Pendientes en Frontend (Configuradas en BD/JSON pero no en formulario):** 52
- **Pendientes en BD (En formulario pero no mapeadas a tabla o JSON):** 0
- **No Implementadas:** 0
