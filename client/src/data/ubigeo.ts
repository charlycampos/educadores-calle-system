// Data Simplificada de Ubigeo para demostración
// En producción esto vendría de una tabla maestra completa

export const DEPARTAMENTOS = [
    { id: '15', name: 'LIMA' },
    { id: '01', name: 'AMAZONAS' },
    { id: '02', name: 'ANCASH' },
    { id: '03', name: 'APURIMAC' },
    { id: '04', name: 'AREQUIPA' },
    { id: '05', name: 'AYACUCHO' },
    { id: '06', name: 'CAJAMARCA' },
    { id: '07', name: 'CALLAO' },
    { id: '08', name: 'CUSCO' },
    { id: '09', name: 'HUANCAVELICA' },
    { id: '10', name: 'HUANUCO' },
    { id: '11', name: 'ICA' },
    { id: '12', name: 'JUNIN' },
    { id: '13', name: 'LA LIBERTAD' },
    { id: '14', name: 'LAMBAYEQUE' },
    { id: '16', name: 'LORETO' },
    { id: '17', name: 'MADRE DE DIOS' },
    { id: '18', name: 'MOQUEGUA' },
    { id: '19', name: 'PASCO' },
    { id: '20', name: 'PIURA' },
    { id: '21', name: 'PUNO' },
    { id: '22', name: 'SAN MARTIN' },
    { id: '23', name: 'TACNA' },
    { id: '24', name: 'TUMBES' },
    { id: '25', name: 'UCAYALI' }
];

export const PROVINCIAS: Record<string, { id: string; name: string }[]> = {
    '15': [ // LIMA
        { id: '1501', name: 'LIMA' },
        { id: '1502', name: 'BARRANCA' },
        { id: '1503', name: 'CAJATAMBO' },
        { id: '1504', name: 'CANTA' },
        { id: '1505', name: 'CAÑETE' },
        { id: '1506', name: 'HUARAL' },
        { id: '1507', name: 'HUAROCHIRI' },
        { id: '1508', name: 'HUAURA' },
        { id: '1509', name: 'OYON' },
        { id: '1510', name: 'YAUYOS' }
    ],
    '07': [ // CALLAO
        { id: '0701', name: 'CALLAO' }
    ],
};

export const DISTRITOS: Record<string, { id: string; name: string }[]> = {
    '1501': [ // LIMA METROPOLITANA
        { id: '150101', name: 'LIMA' },
        { id: '150102', name: 'ANCON' },
        { id: '150103', name: 'ATE' },
        { id: '150104', name: 'BARRANCO' },
        { id: '150105', name: 'BREÑA' },
        { id: '150106', name: 'CARABAYLLO' },
        { id: '150107', name: 'CHACLACAYO' },
        { id: '150108', name: 'CHORRILLOS' },
        { id: '150109', name: 'CIENEGUILLA' },
        { id: '150110', name: 'COMAS' },
        { id: '150111', name: 'EL AGUSTINO' },
        { id: '150112', name: 'INDEPENDENCIA' },
        { id: '150113', name: 'JESUS MARIA' },
        { id: '150114', name: 'LA MOLINA' },
        { id: '150115', name: 'LA VICTORIA' },
        { id: '150116', name: 'LINCE' },
        { id: '150117', name: 'LOS OLIVOS' },
        { id: '150118', name: 'LURIGANCHO' },
        { id: '150119', name: 'LURIN' },
        { id: '150120', name: 'MAGDALENA DEL MAR' },
        { id: '150121', name: 'PUEBLO LIBRE' },
        { id: '150122', name: 'MIRAFLORES' },
        { id: '150123', name: 'PACHACAMAC' },
        { id: '150124', name: 'PUCUSANA' },
        { id: '150125', name: 'PUENTE PIEDRA' },
        { id: '150126', name: 'PUNTA HERMOSA' },
        { id: '150127', name: 'PUNTA NEGRA' },
        { id: '150128', name: 'RIMAC' },
        { id: '150129', name: 'SAN BARTOLO' },
        { id: '150130', name: 'SAN BORJA' },
        { id: '150131', name: 'SAN ISIDRO' },
        { id: '150132', name: 'SAN JUAN DE LURIGANCHO' },
        { id: '150133', name: 'SAN JUAN DE MIRAFLORES' },
        { id: '150134', name: 'SAN LUIS' },
        { id: '150135', name: 'SAN MARTIN DE PORRES' },
        { id: '150136', name: 'SAN MIGUEL' },
        { id: '150137', name: 'SANTA ANITA' },
        { id: '150138', name: 'SANTA MARIA DEL MAR' },
        { id: '150139', name: 'SANTA ROSA' },
        { id: '150140', name: 'SANTIAGO DE SURCO' },
        { id: '150141', name: 'SURQUILLO' },
        { id: '150142', name: 'VILLA EL SALVADOR' },
        { id: '150143', name: 'VILLA MARIA DEL TRIUNFO' }
    ],
    '1506': [ // HUARAL
        { id: '150601', name: 'HUARAL' },
        { id: '150602', name: 'CHANCAY' }
    ],
    '0701': [ // CALLAO
        { id: '070101', name: 'CALLAO' },
        { id: '070102', name: 'BELLAVISTA' },
        { id: '070103', name: 'CARMEN DE LA LEGUA REYNOSO' },
        { id: '070104', name: 'LA PERLA' },
        { id: '070105', name: 'LA PUNTA' },
        { id: '070106', name: 'VENTANILLA' },
        { id: '070107', name: 'MI PERU' }
    ]
};

export const DISCAPACIDADES_CONADIS = [
    "1: Motriz o física",
    "2: Sensorial",
    "3: Cognitivo-intelectual",
    "4: Psicosocial o psíquica",
    "5: Otros (especificar)"
];

export const OPCIONES_MATRICULA_2026 = [
    { value: "SI", label: "1. Sí (cuenta con ficha de matrícula)" },
    { value: "NO", label: "2. No (no se encuentra matriculado)" },
    { value: "PROCESO", label: "3. En proceso de matrícula (trámite en gestión)" },
    { value: "NO_APLICA", label: "99. No aplica (menores de 3 años o egresados de secundaria sin estudios superiores)" }
];

export const NIVELES_EDUCATIVOS_2026 = [
    { value: "1: Sin nivel", label: "1: Sin nivel" },
    { value: "2: Inicial", label: "2: Inicial" },
    { value: "3: Primaria Incompleta", label: "3: Primaria Incompleta" },
    { value: "4: Primaria Completa", label: "4: Primaria Completa" },
    { value: "5: Secundaria Incompleta", label: "5: Secundaria Incompleta" },
    { value: "6: Secundaria Completa", label: "6: Secundaria Completa" },
    { value: "7: Superior No Universitaria Incompleta", label: "7: Superior No Universitaria Incompleta" },
    { value: "8: Superior No Universitaria Completa", label: "8: Superior No Universitaria Completa" },
    { value: "9: Superior Universitario Incompleto", label: "9: Superior Universitario Incompleto" },
    { value: "10: Superior Universitario Completo", label: "10: Superior Universitario Completo" },
    { value: "11: Básica Especial", label: "11: Básica Especial" }
];

export const MODALIDADES_ESTUDIO_2026 = [
    { value: "1: Básica / regular", label: "1: Básica / regular (EBR)" },
    { value: "2: Alternativa (EBA)", label: "2: Alternativa (EBA)" },
    { value: "3: Especial", label: "3: Especial (EBE)" },
    { value: "4: Superior Técnica", label: "4: Superior Técnica" },
    { value: "5: Superior Universitaria", label: "5: Superior Universitaria" },
    { value: "6: CETPRO", label: "6: CETPRO" }
];

export const GRADOS_ESTUDIO_2026 = [
    { value: "1: Inicial", label: "1: Inicial" },
    { value: "2: 1ro prim", label: "2: 1ro primaria" },
    { value: "3: 2do prim", label: "3: 2do primaria" },
    { value: "4: 3ro prim", label: "4: 3ro primaria" },
    { value: "5: 4to prim", label: "5: 4to primaria" },
    { value: "6: 5to prim", label: "6: 5to primaria" },
    { value: "7: 6to prim", label: "7: 6to primaria" },
    { value: "8: 1ro sec", label: "8: 1ro secundaria" },
    { value: "9: 2do sec", label: "9: 2do secundaria" },
    { value: "10: 3ro sec", label: "10: 3ro secundaria" },
    { value: "11: 4to sec", label: "11: 4to secundaria" },
    { value: "12: 5to sec", label: "12: 5to secundaria" },
    { value: "13: Ciclo I", label: "13: Ciclo I (EBA)" },
    { value: "14: Ciclo II", label: "14: Ciclo II (EBA)" },
    { value: "15: Ciclo III", label: "15: Ciclo III (EBA)" },
    { value: "16: Ciclo IV", label: "16: Ciclo IV (EBA)" },
    { value: "17: Ciclo V", label: "17: Ciclo V (EBA)" },
    { value: "18: Ciclo VI", label: "18: Ciclo VI (EBA)" },
    { value: "19: Ciclo VII", label: "19: Ciclo VII (EBA)" },
    { value: "20: Ciclo VIII", label: "20: Ciclo VIII (EBA)" },
    { value: "21: Ciclo IX", label: "21: Ciclo IX (EBA)" },
    { value: "22: Ciclo X", label: "22: Ciclo X (EBA)" },
    { value: "99: No aplica / No sabe", label: "99: No aplica / No sabe" }
];

export const OPCIONES_CONVIVENCIA_2026 = [
    { value: "1: Solo Padre", label: "1. Solo Padre" },
    { value: "2: Solo Madre", label: "2. Solo Madre" },
    { value: "3: Padre y madre", label: "3. Padre y madre" },
    { value: "4: Adulto responsable (familia extensa)", label: "4. Adulto responsable (familia extensa)" },
    { value: "5: Solo", label: "5. Solo" },
    { value: "6: Otro", label: "6. Otro" }
];

export const OPCIONES_VINCULO_TUTOR_2026 = [
    { value: "1: Padre o madre", label: "1: Padre o madre" },
    { value: "2: Tio/a", label: "2: Tio/a" },
    { value: "3: Abuelo/a", label: "3: Abuelo/a" },
    { value: "4: Hermano/a", label: "4: Hermano/a" },
    { value: "5: Otro familiar", label: "5: Otro familiar (ejemplo: cuñado, etc.)" },
    { value: "6: Otro no familiar", label: "6: Otro no familiar (no pariente)" }
];

export const OPCIONES_SEXO_APO_2026 = [
    { value: "1: Hombre", label: "1: Hombre" },
    { value: "2: Mujer", label: "2: Mujer" }
];

export const OPCIONES_TIP_DOC_APO_2026 = [
    { value: "1: DNI", label: "1: DNI" },
    { value: "2: Carné de extranjería", label: "2: Carné de extranjería" },
    { value: "3: Pasaporte", label: "3: Pasaporte" },
    { value: "4: Documento de Identidad Extranjero", label: "4: Documento de Identidad Extranjero" },
    { value: "5: CUI o Acta de Nacimiento", label: "5: CUI o Acta de Nacimiento" },
    { value: "6: Certificado de Nacido Vivo - CNV", label: "6: Certificado de Nacido Vivo - CNV" },
    { value: "7: No tiene", label: "7: No tiene" }
];

export const OPCIONES_LENGUA_APO_2026 = [
    { value: "10: Castellano", label: "10: Castellano" },
    { value: "1: Quechua", label: "1: Quechua" },
    { value: "2: Aimara", label: "2: Aimara" },
    { value: "3: Asháninca", label: "3: Asháninca" },
    { value: "4: Awajún/Aguaruna", label: "4: Awajún/Aguaruna" },
    { value: "5: Shipibo-Conibo", label: "5: Shipibo-Conibo" },
    { value: "6: Shawi/ Chayahuita", label: "6: Shawi/ Chayahuita" },
    { value: "7: Matsigenka/ Machiguenga", label: "7: Matsigenka/ Machiguenga" },
    { value: "8: Achuar", label: "8: Achuar" },
    { value: "9: Otra lengua indígena u originaria", label: "9: Otra lengua indígena u originaria" },
    { value: "11: portugués", label: "11: Portugués" },
    { value: "12: Otra lengua extranjera", label: "12: Otra lengua extranjera" },
    { value: "13: Lengua de señas peruana", label: "13: Lengua de señas peruana" },
    { value: "14: No escucha ni habla", label: "14: No escucha ni habla" },
    { value: "16 NO RESPONDE / NO SABE", label: "16: No responde / No sabe" },
    { value: "99. NO APLICA (menores de 3 años)", label: "99: No aplica" }
];

export const OPCIONES_ETNIA_APO_2026 = [
    { value: "7: Mestizo", label: "7: Mestizo" },
    { value: "1: Quechua", label: "1: Quechua" },
    { value: "2: Aimara", label: "2: Aimara" },
    { value: "3: Indígena u originario de la Amazonía", label: "3: Indígena u originario de la Amazonía" },
    { value: "4: Perteneciente o parte de otro pueblo indígena u originario", label: "4: Perteneciente o parte de otro pueblo indígena u originario" },
    { value: "5: Negro, moreno, zambo, mulato o afrodescendiente", label: "5: Negro, moreno, zambo, mulato o afrodescendiente" },
    { value: "6: Blanco", label: "6: Blanco" },
    { value: "8: Otro", label: "8: Otro" }
];

export const OPCIONES_DISCAPACIDAD_APO_2026 = [
    { value: "6. Ninguna", label: "6: Ninguna" },
    { value: "1. Motriz o física", label: "1: Motriz o física" },
    { value: "2. Sensorial", label: "2: Sensorial" },
    { value: "3. Cognitivo-intelectual", label: "3: Cognitivo-intelectual" },
    { value: "4. Psicosocial o psíquica", label: "4: Psicosocial o psíquica" },
    { value: "5. Mas de una discapacidad", label: "5: Más de una discapacidad" }
];

export const OPCIONES_CERT_DISCAP_APO_2026 = [
    { value: "99. No aplica", label: "99: No aplica" },
    { value: "1. Sí, tiene Certificado de Discapacidad.", label: "1: Sí, tiene Certificado de Discapacidad" },
    { value: "2. Si, tiene Certificado de Discapacidad, pero no lo porto conmigo.", label: "2: Sí, tiene, pero no lo porta" },
    { value: "3. No, no tiene Certificado de Discapacidad.", label: "3: No tiene Certificado de Discapacidad" }
];

export const OPCIONES_OTRO_SEGURO_2026 = [
    { value: "1: EsSalud", label: "1: EsSalud" },
    { value: "2: Seguro de las Fuerzas Armadas o Policiales", label: "2: Seguro de las Fuerzas Armadas o Policiales" },
    { value: "3: Seguro privado", label: "3: Seguro privado" },
    { value: "4: Ningún seguro", label: "4: Ningún seguro" },
    { value: "5: Otro", label: "5: Otro" }
];


