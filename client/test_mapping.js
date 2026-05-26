// Simulación de los normalizadores y mapeo de datos de NnaCreatePage.tsx

const normalizeLenMat = (val) => {
    if (!val) return '';
    const v = String(val).trim();
    const validValues = [
        "10: Castellano", "1: Quechua", "2: Aimara", "3: Asháninca", 
        "4: Awajún/Aguaruna", "5: Shipibo-Conibo", "6: Shawi/ Chayahuita", 
        "7: Matsigenka/ Machiguenga", "8: Achuar", "9: Otra lengua indígena u originaria", 
        "11: portugués", "12: Otra lengua extranjera", "13: Lengua de señas peruana", 
        "14: No escucha ni habla", "16 NO RESPONDE / NO SABE", "99. NO APLICA (menores de 3 años)"
    ];
    if (validValues.includes(v)) return v;
    const lower = v.toLowerCase();
    if (lower.includes('castellano') || lower.includes('español')) return '10: Castellano';
    return v;
};

const normalizeEtnia = (val) => {
    if (!val) return '';
    const v = String(val).trim();
    const validValues = [
        "7: Mestizo", "1: Quechua", "2: Aimara", "3: Indígena u originario de la Amazonía", 
        "4: Perteneciente o parte de otro pueblo indígena u originario", 
        "5: Negro, moreno, zambo, mulato o afrodescendiente", "6: Blanco", "8: Otro"
    ];
    if (validValues.includes(v)) return v;
    const lower = v.toLowerCase();
    if (lower.includes('mestizo')) return '7: Mestizo';
    return v;
};

const normalizeTipoDiscap = (val) => {
    if (!val) return '';
    const v = String(val).trim();
    const validValues = [
        "6. Ninguna",
        "1. Motriz o física",
        "2. Sensorial",
        "3. Cognitivo-intelectual",
        "4. Psicosocial o psíquica",
        "5. Mas de una discapacidad"
    ];
    if (validValues.includes(v)) return v;
    const lower = v.toLowerCase();
    if (lower.includes('ninguna')) return '6. Ninguna';
    return v;
};

const normalizeCertDiscap = (val) => {
    if (!val) return '';
    const v = String(val).trim();
    const validValues = [
        "99. No aplica",
        "1. Sí, tiene Certificado de Discapacidad.",
        "2. Si, tiene Certificado de Discapacidad, pero no lo porto conmigo.",
        "3. No, no tiene Certificado de Discapacidad."
    ];
    if (validValues.includes(v)) return v;
    return v;
};

// Datos reales recibidos por el endpoint
const selectedExpediente = [
  {
    "id": 121,
    "codigoFicha03": "F03-2026-0041",
    "nombres": "OSCAR",
    "apellidoPaterno": "BENAVIDES",
    "apellidoMaterno": "RAMOS",
    "tipoDoc": "DNI",
    "numeroDoc": "9898989898",
    "fechaNacimiento": "2023-05-05T00:00:00",
    "sexo": "M",
    "nacionalidad": "PERUANA",
    "carpetaId": 141,
    "tienePartidaNacimiento": true,
    "detalleSinDoc": "SDFDSFSDF",
    "departamentoNac": "MADRE DE DIOS",
    "provinciaNac": "TAMBOPATA",
    "distritoNac": "INAMBARI",
    "domicilioActual": "sfsdf",
    "referenciaDomicilio": "ssdfsdfsd",
    "departamentoDom": "LIMA",
    "provinciaDom": "CAJATAMBO",
    "distritoDom": "COPA",
    "telefonoContacto": "999999999",
    "nombreTutor": "CAMPOS GUERRA CHARLY",
    "viveCon": "1: Solo Padre",
    "detalleViveCon": null,
    "tieneHermanos": false,
    "cantHermanos": 0,
    "lugarPernocte": "SU_CASA",
    "detalleLugarPernocte": null,
    "tieneAntecedenteAlbergue": false,
    "detalleAntecedenteAlbergue": null,
    "afiliadoSIS": "NO",
    "afiliadoOtroSeguro": "NO",
    "detalleOtroSeguro": null,
    "sufreEnfermedad": "NO",
    "detalleEnfermedad": null,
    "observacionesSalud": "SDFSDFSDFSDF",
    "tieneDiscapacidad": false,
    "tipoDiscapacidad": null,
    "detalleDiscapacidad": null,
    "estudiaActualmente": true,
    "nivelEducativo": "2: Inicial",
    "gradoEstudio": "1: Inicial",
    "institucionEducativa": "SDFSDFDSF",
    "modalidadEstudio": "1: B\u00e1sica / regular",
    "detalleNoEstudia": null,
    "edad": 3,
    "unidadEdad": "ANIOS",
    "actividadesTiempoLibre": "Estudiar: 4h/sem, Trabajar: 4h/sem, Dormir: 0h/sem, Jugar: 0h/sem. Diagn\u00f3stico: Riesgo Cr\u00edtico. Alerta: Privaci\u00f3n de Sue\u00f1o.",
    "caracteristicas": "SDFSDFSDFSFSDFD",
    "fotoUrl": null,
    "tieneTutorApo": 1,
    "priApeTutApo": "CAMPOS",
    "segApeTutApo": "GUERRA",
    "nomApeTutApo": "CHARLY",
    "sexoApo": "1: Hombre",
    "fechaNacApo": "1979-01-01T00:00:00",
    "nacionalidadApo": "PERUANA",
    "tipDocTutApo": "1: DNI",
    "nroDocTutApo": "8781315",
    "vinTutUsu": "1: Padre o madre",
    "lenMatApo": "10: Castellano",
    "lenMatEspApo": null,
    "autIdeEtApo": "7: Mestizo",
    "autIdeEtEspApo": null,
    "tipoDiscapApo": "1. Motriz o f\u00edsica",
    "certDiscapApo": "1. S\u00ed, tiene Certificado de Discapacidad.",
    "lenMatNna": "10: Castellano",
    "lenMatEspNna": null,
    "autIdeEtNna": "7: Mestizo",
    "autIdeEtEspNna": null,
    "certDiscapNna": null,
    "createdAt": "2026-05-23T23:42:04.417000",
    "carpeta": {
      "id": 141,
      "codigo": "00005-2026-SEC.LIMA"
    },
    "casos": [
      {
        "id": 121,
        "codigoCaso": "CAS-2026-00114",
        "nnaId": 121,
        "sedeId": 1,
        "responsableId": 6,
        "perfil": "TRABAJO_EN_CALLE",
        "zonaIntervencion": "asdfsadfasdf",
        "distritoIntervencion": null,
        "situacionCalle": "TRANSITO_EN_CALLE",
        "actividadRealizada": "Venta de dulces / golosinas / caramelos",
        "tiempoEnCalle": "1 mese",
        "condicion": "SOLO",
        "antecedenteInstitucional": null,
        "horarioInicio": null,
        "horarioFin": null,
        "horarioInicio2": null,
        "horarioFin2": null,
        "diasTrabajo": null,
        "fechaAbordaje": "2026-05-23T00:00:00",
        "fechaIngreso": "2026-05-23T23:42:04",
        "fechaReingreso": null,
        "estado": "EN_EVALUACION",
        "fase": "CONTACTO_INICIAL",
        "nivelRiesgo": null,
        "responsableNombre": "Juan Educador Garcia",
        "fechaApertura": "2026-05-23T23:42:04.422000"
      }
    ],
    "familiares": [
      {
        "id": 61,
        "carpetaId": 141,
        "nombres": "CAMPOS GUERRA CHARLY",
        "parentesco": "1: Padre o madre",
        "dni": "8781315",
        "telefono": "9898989",
        "ocupacion": "SDFSDFSDF",
        "viveCon": "SI"
      }
    ]
  }
];

const toDateInput = (v) => {
    if (!v) return '';
    const s = String(v).replace(' ', 'T');
    const d = new Date(s);
    return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
};

try {
    console.log("[*] Starting mapping test...");
    const mainNna = selectedExpediente[0];
    const activeCase = mainNna.casos?.find((c) => c.estado !== 'CERRADO') || mainNna.casos?.[0];

    const mappedNnas = selectedExpediente.map(nna => ({
        id: nna.id,
        nombres: nna.nombres,
        apellidoPaterno: nna.apellidoPaterno,
        apellidoMaterno: nna.apellidoMaterno,
        numeroDoc: nna.numeroDoc || '',
        fechaNacimiento: toDateInput(nna.fechaNacimiento),
        edad:       nna.edad        ? String(nna.edad) : '',
        unidadEdad: nna.unidadEdad  || 'ANIOS',
        tipoDoc: nna.tipoDoc,
        sexo: nna.sexo || '',
        tienePartidaNacimiento: nna.tienePartidaNacimiento ? "true" : "false",
        detalleSinDoc: nna.detalleSinDoc || '',
        departamentoNac: nna.departamentoNac || '',
        provinciaNac: nna.provinciaNac || '',
        distritoNac: nna.distritoNac || '',
        estudiaActualmente: nna.estudiaActualmente 
            ? 'SI' 
            : (nna.detalleNoEstudia === 'En proceso de matrícula' 
                ? 'PROCESO' 
                : (nna.detalleNoEstudia === 'No aplica' 
                    ? 'NO_APLICA' 
                    : 'NO')),
        nivelEducativo: nna.nivelEducativo || '',
        gradoEstudio: nna.gradoEstudio || '',
        institucionEducativa: nna.institucionEducativa || '',
        modalidadEstudio: nna.modalidadEstudio || '',
        detalleNoEstudia: nna.detalleNoEstudia || '',
        afiliadoSIS: nna.afiliadoSIS || '',
        afiliadoOtroSeguro: nna.afiliadoOtroSeguro || '',
        detalleOtroSeguro: nna.detalleOtroSeguro || '',
        sufreEnfermedad: nna.sufreEnfermedad === true || nna.sufreEnfermedad === 'SI' ? 'SI' : 'NO',
        detalleEnfermedad: nna.detalleEnfermedad || '',
        observacionesSalud: nna.observacionesSalud || '',
        tieneDiscapacidad: nna.tieneDiscapacidad,
        tipoDiscapacidad: nna.tipoDiscapacidad || '',
        detalleDiscapacidad: nna.detalleDiscapacidad || '',
        actividadesTiempoLibre: nna.actividadesTiempoLibre || '',
        caracteristicas: nna.caracteristicas || '',
        tieneAntecedenteAlbergue: nna.tieneAntecedenteAlbergue,
        detalleAntecedenteAlbergue: nna.detalleAntecedenteAlbergue || '',
        lenMatNna: normalizeLenMat(nna.lenMatNna),
        lenMatEspNna: nna.lenMatEspNna || '',
        autIdeEtNna: normalizeEtnia(nna.autIdeEtNna),
        autIdeEtEspNna: nna.autIdeEtEspNna || '',
        certDiscapNna: normalizeCertDiscap(nna.certDiscapNna),
        actividadesTiempoLibreLista: []
    }));

    const result = {
        zonaIntervencion: activeCase?.zonaIntervencion || '',
        perfil: activeCase?.perfil || '',
        situacionCalle: activeCase?.situacionCalle || '',
        fechaAbordaje:    toDateInput(activeCase?.fechaAbordaje),
        fechaIngreso:     toDateInput(activeCase?.fechaIngreso),
        fechaReingreso:   toDateInput(activeCase?.fechaReingreso),
        fechaCambioPerfil: toDateInput(activeCase?.fechaCambioPerfil),
        actividadRealizada: activeCase?.actividadRealizada || '',
        tiempoEnCalle: activeCase?.tiempoEnCalle || '',
        condicion: activeCase?.condicion || '',
        horarioInicio: activeCase?.horarioInicio || '',
        horarioFin: activeCase?.horarioFin || '',
        horarioInicio2: activeCase?.horarioInicio2 || '',
        horarioFin2: activeCase?.horarioFin2 || '',
        diasTrabajo: activeCase?.diasTrabajo || '',
        domicilioActual: mainNna.domicilioActual || '',
        referenciaDomicilio: mainNna.referenciaDomicilio || '',
        departamentoDom: mainNna.departamentoDom || '',
        provinciaDom: mainNna.provinciaDom || '',
        distritoDom: mainNna.distritoDom || '',
        telefonoContacto: mainNna.telefonoContacto || '',
        viveCon: (() => {
            const val = mainNna.viveCon || '';
            const upper = val.toUpperCase().trim();
            if (upper === 'SOLO_PADRE') return '1: Solo Padre';
            if (upper === 'SOLO_MADRE') return '2: Solo Madre';
            if (upper === 'AMBOS_PADRES') return '3: Padre y madre';
            if (upper === 'OTROS_FAMILIARES') return '4: Adulto responsable (familia extensa)';
            if (upper === 'SOLO') return '5: Solo';
            if (upper === 'AMIGOS' || upper === 'OTRO') return '6: Otro';
            return val;
        })(),
        detalleViveCon: mainNna.detalleViveCon || '',
        lugarPernocte: mainNna.lugarPernocte || '',
        detalleLugarPernocte: mainNna.detalleLugarPernocte || '',
        nombreTutor: mainNna.nombreTutor || '',
        nnas: mappedNnas,
        familiares: (() => {
            const familiaresBackend = mainNna.familiares || [];
            const mappedFamiliares = familiaresBackend.map((f) => {
                const parentescoVal = (() => {
                    const clean = (f.parentesco || '').trim();
                    if (clean === 'Padre' || clean === 'Madre') return '1: Padre o madre';
                    if (clean === 'Tío/a' || clean === 'Tio/a' || clean === 'Tío' || clean === 'Tía') return '2: Tio/a';
                    if (clean === 'Abuelo/a' || clean === 'Abuelo' || clean === 'Abuela') return '3: Abuelo/a';
                    if (clean === 'Hermano/a' || clean === 'Hermano' || clean === 'Hermana') return '4: Hermano/a';
                    if (clean === 'Otro familiar') return '5: Otro familiar';
                    if (clean === 'Padrino/Madrina' || clean === 'Tutor legal' || clean === 'Otro no familiar') return '6: Otro no familiar';
                    return clean;
                })();

                const isTutorMatch = mainNna.tieneTutorApo === 1 && (
                    (f.dni && mainNna.nroDocTutApo && f.dni.trim() === mainNna.nroDocTutApo.trim()) ||
                    (f.nombres && mainNna.nomApeTutApo && f.nombres.toLowerCase().includes(mainNna.nomApeTutApo.toLowerCase()))
                );

                if (isTutorMatch) {
                    return {
                        nombres:    f.nombres    || '',
                        parentesco: parentescoVal,
                        dni:        f.dni        || '',
                        telefono:   f.telefono   || '',
                        ocupacion:  f.ocupacion  || '',
                        viveCon:    f.viveCon    || 'NO',
                        esTutor:    true,
                        priApeTutApo: mainNna.priApeTutApo || '',
                        segApeTutApo: mainNna.segApeTutApo || '',
                        nomApeTutApo: mainNna.nomApeTutApo || '',
                        sexoApo:      mainNna.sexoApo || '',
                        fechaNacApo:  toDateInput(mainNna.fechaNacApo),
                        nacionalidadApo: mainNna.nacionalidadApo || 'PERUANA',
                        tipDocTutApo: mainNna.tipDocTutApo || '',
                        nroDocTutApo: mainNna.nroDocTutApo || '',
                        vinTutUsu:    mainNna.vinTutUsu || '',
                        lenMatApo:    normalizeLenMat(mainNna.lenMatApo),
                        lenMatEspApo: mainNna.lenMatEspApo || '',
                        autIdeEtApo:  normalizeEtnia(mainNna.autIdeEtApo),
                        autIdeEtEspApo: mainNna.autIdeEtEspApo || '',
                        tipoDiscapApo: normalizeTipoDiscap(mainNna.tipoDiscapApo),
                        certDiscapApo: normalizeCertDiscap(mainNna.certDiscapApo),
                    };
                }

                return {
                    ...f,
                    nombres:    f.nombres    || '',
                    parentesco: parentescoVal,
                    dni:        f.dni        || '',
                    telefono:   f.telefono   || '',
                    ocupacion:  f.ocupacion  || '',
                    viveCon:    f.viveCon    || 'NO',
                    esTutor:    false
                };
            });

            const hasTutorInList = mappedFamiliares.some((f) => f.esTutor);
            if (mainNna.tieneTutorApo === 1 && !hasTutorInList) {
                const nombreCompletoTutor = `${mainNna.priApeTutApo || ''} ${mainNna.segApeTutApo || ''} ${mainNna.nomApeTutApo || ''}`.trim() || mainNna.nombreTutor || 'Tutor Principal';
                mappedFamiliares.push({
                    nombres:      nombreCompletoTutor,
                    parentesco:   mainNna.vinTutUsu || '1: Padre o madre',
                    dni:          mainNna.nroDocTutApo || '',
                    telefono:     mainNna.telefonoContacto || '',
                    ocupacion:    '',
                    viveCon:      'SI',
                    esTutor:      true,
                    priApeTutApo: mainNna.priApeTutApo || '',
                    segApeTutApo: mainNna.segApeTutApo || '',
                    nomApeTutApo: mainNna.nomApeTutApo || '',
                    sexoApo:      mainNna.sexoApo || '',
                    fechaNacApo:  toDateInput(mainNna.fechaNacApo),
                    nacionalidadApo: mainNna.nacionalidadApo || 'PERUANA',
                    tipDocTutApo: mainNna.tipDocTutApo || '',
                    nroDocTutApo: mainNna.nroDocTutApo || '',
                    vinTutUsu:    mainNna.vinTutUsu || '',
                    lenMatApo:    mainNna.lenMatApo || '',
                    lenMatEspApo: mainNna.lenMatEspApo || '',
                    autIdeEtApo:  mainNna.autIdeEtApo || '',
                    autIdeEtEspApo: mainNna.autIdeEtEspApo || '',
                    tipoDiscapApo: mainNna.tipoDiscapApo || '',
                    certDiscapApo: mainNna.certDiscapApo || '',
                });
            }
            return mappedFamiliares;
        })()
    };
    console.log("[+] Mapping completed successfully!");
    console.log(JSON.stringify(result, null, 2).slice(0, 500) + "...\n");
} catch (e) {
    console.error("[-] Mapping threw an error:", e);
}
