import { NNA_API_URL, DERIVACION_API_URL, INTERVENCION_API_URL, AUTH_API_URL, EXPEDIENTE_API_URL } from '../../../config/api';
import { useState, useEffect } from 'react';
import { Printer, Save, Plus, Edit2, Trash2, X, ArrowLeft, User, Users, GraduationCap, HeartPulse, Target } from 'lucide-react';
import { UbigeoSelectorSimple } from './UbigeoSelectorSimple';

interface Formato4SocialProps {
    nna: any;
    caso?: any;
    initialData?: any; // Para modo edición
    onClose?: () => void; // Para volver a la lista
    onSuccess?: () => void; // Para refrescar la lista
}

interface FamilyMember {
    primerApellido: string;
    segundoApellido: string;
    nombres: string;
    parentesco: string;
    edad: string;
    sexo: string;
    estadoCivil: string;
    gradoInstruccion: string;
    ocupacion: string;
}

interface Need {
    categoria: string;
    descripcion: string;
    faseI: string;
    faseII: string;
    faseIII: string;
}

export const Formato4Social = ({ nna, caso, initialData, onClose, onSuccess }: Formato4SocialProps) => {

    const [activeTab, setActiveTab] = useState<'GENERAL' | 'FAMILIA' | 'EDUCACION' | 'SALUD' | 'NECESIDADES'>('GENERAL');
    const [loading, setLoading] = useState(false);

    // --- ESTADO DEL FORMULARIO (Basado en la estructura del backend) ---
    // ── Parsear datos_f03 CLOB para pre-cargar campos del educador ──────────
    const datosF03 = (() => {
        try { return nna?.datosF03 ? JSON.parse(nna.datosF03) : {}; }
        catch { return {}; }
    })();
    const familiaresF03 = Array.isArray(datosF03.familiares) ? datosF03.familiares : [];
    // Tutor principal: primer familiar con parentesco Madre, Padre o Tutor legal
    const tutorPrincipal = familiaresF03.find((f: any) =>
        ['Madre','Padre','Tutor legal'].includes(f.parentesco)
    ) || familiaresF03[0] || null;

    // ── Pre-carga de datos desde F03 (NNA + Caso) ──────────────────────────
    const perfilCaso = caso?.perfil || '';
    const perfilCalle = {
        trabajoInfantil: perfilCaso === 'TRABAJO_EN_CALLE',
        mendicidad:      perfilCaso === 'MENDICIDAD',
        vidaEnCalle:     perfilCaso === 'VIDA_EN_CALLE' || perfilCaso === 'VIDA_CALLE',
        transito:        false,
        convivencia:     false,
    };
    const explotacionSexualF03: boolean | null =
        perfilCaso === 'EXPLOTACION_SEXUAL' ? true : null;

    const [formData, setFormData] = useState({
        // I-III. Datos Generales y Calle
        noTieneDNI:         !nna?.numeroDoc,
        edad:               nna?.edad        ? String(nna.edad) : '',
        unidadEdad:         nna?.unidadEdad  || 'ANIOS',
        direccionActual:    nna?.domicilioActual    || '',
        ubigeoDepto:        nna?.departamentoDom  || '',
        ubigeoProvinc:      nna?.provinciaDom     || '',
        ubigeoDistrito:     nna?.distritoDom      || '',
        referenciaDireccion: nna?.referenciaDomicilio || '',
        telefonoContacto:   nna?.telefonoContacto   || '',

        tiempoEnCalle:      caso?.tiempoEnCalle        || '',
        puntoConcentracion: caso?.zonaIntervencion     || '',
        actividadEconomica: caso?.actividadRealizada   || '',
        situacionCalleDetalle: {
            perfil: perfilCalle,
            tiempo: { cantidad: '', unidad: 'MESES' },
            explotacionSexual: explotacionSexualF03,
            ingresoSemanal: '',
            horarios:  { manana: false, tarde: false, noche: false },
            frecuencia: { diario: false, interdiario: false, finesSemana: false, temporadas: false },
            motivo: '',
            modalidadTrabajo: { puestoFijo: false, ambulante: false, recorre: false },
            actividad: '',
            lugar: '',
            acompanamiento: { solo: false, acompanado: false, acompanadoFamiliar: false, quien: '' },
            obligado:   { si: false, no: false, quien: '' },
            escapoCasa: { si: false, no: false, veces: '' },
            consumo:    { si: false, no: false, tipo: '', frecuencia: '', tiempo: '', unidadTiempo: 'MESES' }
        },

        // III. Tutor — pre-cargado desde tutor principal del F03
        tutorNombre:           tutorPrincipal?.nombres    || nna?.nombreTutor     || '',
        tutorDNI:              tutorPrincipal?.dni        || nna?.dniTutor        || '',
        tutorFechaNacimiento:  '',
        tutorParentesco:       tutorPrincipal?.parentesco || nna?.parentescoTutor || nna?.viveCon || '',
        tutorGradoInstruccion: '',
        tutorDiscapacidad:     'NO',
        tutorConadis:          'NO',
        tutorEstadoCivil:      '',
        tutorOcupacion:        tutorPrincipal?.ocupacion  || '',
        tutorIngreso:          '',
        tutorConsumoDrogas:    'NO',
        tutorRecibeApoyo:      'NO',
        tutorDeseaDemanda:     'NO',

        // IV. Familia — pre-cargada desde familiares del F03
        familiares: familiaresF03.map((f: any) => ({
            primerApellido:    f.nombres?.split(' ')[0] || '',
            segundoApellido:   f.nombres?.split(' ')[1] || '',
            nombres:           f.nombres?.split(' ').slice(2).join(' ') || f.nombres || '',
            parentesco:        f.parentesco || '',
            edad:              '',
            sexo:              '',
            estadoCivil:       '',
            gradoInstruccion:  '',
            ocupacion:         f.ocupacion || '',
        })) as FamilyMember[],
        dinamicaFamiliar: {
            contacto:     'SI',
            frecuencia:   'DIARIO',
            rolProtector: 'REGULAR',
            rolProveedor: 'REGULAR'
        },

        // V. Vivienda
        materialVivienda:    'CONCRETO',
        numeroAmbientes:     '1',
        propiedadVivienda:   'PROPIA',
        serviciosBasicos:    { agua: true, luz: true, desague: true, otros: false },
        viviendaSisfoh:      'NO',
        duermeCama:          'SI',
        lugarPernocte:        nna?.lugarPernocte    || '',
        detalleLugarPernocte: nna?.detalleLugarPernocte || '',
        duermeConQuien:       nna?.detalleViveCon  || '',
        duermeSoloAcompanado: 'SOLO',
        higieneDomicilio:    'BUENO',
        tieneAntecedenteAlbergue:   !!nna?.tieneAntecedenteAlbergue,
        tiempoAlbergue:             '',
        detalleAntecedenteAlbergue: nna?.detalleAntecedenteAlbergue || '',

        // VI. Educación
        presentaAtraso:      false,
        tiempoAtraso:        '',
        motivoAtraso:        '',
        problemasAprendizaje: false,
        problemasConducta:   false,
        expulsado:           false,
        vecesExpulsado:      '',
        eduNivel:      nna?.nivelEducativo   || 'SECUNDARIA',
        eduGrado:      nna?.gradoEstudio     || '1ero',
        eduTurno:      'MAÑANA',
        eduTipoIE:     'ESTATAL',
        eduModalidad:  nna?.modalidadEstudio || '',
        eduEstudia:    nna?.estudiaActualmente ? 'SI' : 'NO',
        eduInstitucion: nna?.institucionEducativa || '',
        eduMotivoNoEstudia: nna?.detalleNoEstudia || '',

        // VII. Salud
        afiliadoSIS:              nna?.afiliadoSIS        || 'NO',
        afiliadoOtroSeguro:       nna?.afiliadoOtroSeguro || '',
        detalleOtroSeguro:        nna?.detalleOtroSeguro  || '',
        tieneDiscapacidad:        !!(nna?.tieneDiscapacidad && nna.tieneDiscapacidad !== 0),
        tipoDiscapacidad:         nna?.tipoDiscapacidad   || '',
        detalleDiscapacidad:      nna?.detalleDiscapacidad || '',
        enfermedadCronica:        !!(nna?.sufreEnfermedad && nna.sufreEnfermedad !== 'NO' && nna.sufreEnfermedad !== 0),
        detalleEnfermedadCronica: nna?.detalleEnfermedad  || '',
        observacionesSalud:       nna?.observacionesSalud || '',
        problemaPsicologico:      false,
        detalleProblemaPsicologico: '',
        consumeSustancias:        false,
        tipoSustancias:           '',
        recibeTresAlimentos:      true,
        higieneAdecuada:          true,

        // VIII. Recreación
        tiempoParaJugar:              true,
        vecesJuegaSemana:             '',
        lugarJuego:                   '',
        participaInstitucion:         false,
        tipoInstitucion:              '',
        interesesDeportivos:          false,
        interesesArtisticos:          false,
        actividadesFamilia:           false,
        recreacionActividadFamilia:   'NO',
        recreacionInteresDeporte:     '',
        recreacionInteresArte:        '',
        recreacionParticipaInstitucion: 'NO',
        recreacionTipoInstitucion:    '',
        recreacionInstitucionDetalle: '',

        // IX. Necesidades
        necesidades: [] as Need[]
    });

    // --- MODALES ---
    const [showFamilyModal, setShowFamilyModal] = useState(false);
    const [editingFamilyIndex, setEditingFamilyIndex] = useState<number | null>(null);
    const [currentFamily, setCurrentFamily] = useState<FamilyMember>({
        primerApellido: '', segundoApellido: '', nombres: '', parentesco: '', edad: '', sexo: 'MASCULINO', estadoCivil: 'SOLTERO(A)', gradoInstruccion: 'SECUNDARIA', ocupacion: ''
    });

    const [showNeedModal, setShowNeedModal] = useState(false);
    const [editingNeedIndex, setEditingNeedIndex] = useState<number | null>(null);
    const [currentNeed, setCurrentNeed] = useState<Need>({
        categoria: 'SALUD', descripcion: '', faseI: '', faseII: '', faseIII: ''
    });

    // --- EFECTOS ---
    useEffect(() => {
        if (initialData) {
            setFormData({ ...formData, ...initialData });
        }
    }, [initialData]);

    // --- HANDLERS ---
    const handleSave = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const method = initialData ? 'PUT' : 'POST';
            const url = initialData
                ? `${INTERVENCION_API_URL}/diagnostico/${initialData.id}`
                : `${INTERVENCION_API_URL}/diagnostico/nna/${nna.id}`;

            const payload = {
                ...formData,
                nnaId: nna.id,
                casoId: caso?.id
            };

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                alert('Diagnóstico guardado correctamente');
                if (onSuccess) onSuccess();
            } else {
                const err = await response.json();
                alert('Error al guardar: ' + (err.detail || err.message));
            }
        } catch (error) {
            console.error(error);
            alert('Error de conexión con el servidor');
        } finally {
            setLoading(false);
        }
    };

    const handleAddFamily = () => {
        setEditingFamilyIndex(null);
        setCurrentFamily({ primerApellido: '', segundoApellido: '', nombres: '', parentesco: '', edad: '', sexo: 'MASCULINO', estadoCivil: 'SOLTERO(A)', gradoInstruccion: 'SECUNDARIA', ocupacion: '' });
        setShowFamilyModal(true);
    };

    const handleEditFamily = (index: number) => {
        setEditingFamilyIndex(index);
        setCurrentFamily(formData.familiares[index]);
        setShowFamilyModal(true);
    };

    const handleDeleteFamily = (index: number) => {
        if (confirm('¿Eliminar a este integrante de la familia?')) {
            const newFam = [...formData.familiares];
            newFam.splice(index, 1);
            setFormData({ ...formData, familiares: newFam });
        }
    };

    const handleSaveFamily = () => {
        const newFam = [...formData.familiares];
        if (editingFamilyIndex !== null) {
            newFam[editingFamilyIndex] = currentFamily;
        } else {
            newFam.push(currentFamily);
        }
        setFormData({ ...formData, familiares: newFam });
        setShowFamilyModal(false);
    };

    const handleAddNeed = () => {
        setEditingNeedIndex(null);
        setCurrentNeed({ categoria: 'SALUD', descripcion: '', faseI: '', faseII: '', faseIII: '' });
        setShowNeedModal(true);
    };

    const handleEditNeed = (index: number) => {
        setEditingNeedIndex(index);
        setCurrentNeed(formData.necesidades[index]);
        setShowNeedModal(true);
    };

    const handleDeleteNeed = (index: number) => {
        if (confirm('¿Eliminar esta necesidad?')) {
            const newNeeds = [...formData.necesidades];
            newNeeds.splice(index, 1);
            setFormData({ ...formData, necesidades: newNeeds });
        }
    };

    const handleSaveNeed = () => {
        const newNeeds = [...formData.necesidades];
        if (editingNeedIndex !== null) {
            newNeeds[editingNeedIndex] = currentNeed;
        } else {
            newNeeds.push(currentNeed);
        }
        setFormData({ ...formData, necesidades: newNeeds });
        setShowNeedModal(false);
    };

    // --- HELPER ESTILOS ---
    const formatDate = (date: string) => {
        if (!date) return '---';
        return new Date(date).toLocaleDateString('es-PE');
    };

    const tableStyle = { width: '100%', borderCollapse: 'collapse', border: '1px solid black', marginBottom: '10px' };
    const thStyle = { border: '1px solid black', padding: '4px', fontSize: '10px', backgroundColor: '#f2f2f2', textAlign: 'left' };
    const tdStyle = { border: '1px solid black', padding: '4px', fontSize: '10px' };
    const sectionTitle = { backgroundColor: '#333', color: 'white', padding: '4px 8px', fontWeight: 'bold', fontSize: '11px', marginTop: '15px' };
    const labelStyle = { display: 'block', fontSize: '8px', color: '#666', fontWeight: 'bold' };
    const valueStyle = { fontSize: '10px', fontWeight: 'bold' };

    return (
        <div className="bg-bg print:bg-white min-h-screen p-6 print:p-0">

            {/* ===== VISTA WEB (INTERACTIVA) - Solo visible en pantalla ===== */}
            <div className="max-w-7xl mx-auto print:hidden">

                {/* Header con acciones */}
                <div className="bg-surface border-b border-border px-6 py-4 rounded-t-[8px] shadow-1">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-[16px] font-bold text-fg uppercase">FICHA DE DIAGNÓSTICO SOCIAL</h1>
                            <p className="text-[12px] text-fg-muted mt-0.5">Completa la evaluación social del NNA</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-1.5 bg-primary text-primary-fg px-4 py-2 rounded-[6px] text-[13px] font-medium hover:bg-primary/90 transition-colors"
                            >
                                <Save size={16} /> Guardar
                            </button>
                            <button
                                onClick={() => window.print()}
                                className="flex items-center gap-1.5 bg-surface border border-border-strong text-fg px-4 py-2 rounded-[6px] text-[13px] font-medium hover:bg-surface-muted transition-colors"
                            >
                                <Printer size={16} /> Imprimir
                            </button>
                        </div>
                    </div>
                </div>

                {/* TABS DE NAVEGACIÓN */}
                <div className="bg-surface px-4 pt-0 border-x border-border">
                    <div className="flex overflow-x-auto no-scrollbar">
                        {[
                            { id: 'GENERAL',    label: 'I-III. General / Calle',       icon: User },
                            { id: 'FAMILIA',    label: 'IV-V. Familia / Vivienda',     icon: Users },
                            { id: 'EDUCACION',  label: 'VI. Educación',                icon: GraduationCap },
                            { id: 'SALUD',      label: 'VII-VIII. Salud / Recreación', icon: HeartPulse },
                            { id: 'NECESIDADES',label: 'IX. Necesidades',              icon: Target }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`
                                    flex items-center gap-1.5 px-4 py-3.5 border-b-2 text-[12px] font-semibold uppercase tracking-wide transition-all whitespace-nowrap
                                    ${activeTab === tab.id
                                        ? 'border-primary text-primary bg-primary-soft/20'
                                        : 'border-transparent text-fg-muted hover:text-fg hover:bg-surface-muted'}
                                `}
                            >
                                <tab.icon size={14} className={activeTab === tab.id ? 'text-primary' : 'text-fg-muted'} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Contenido del formulario */}
                <div className="bg-surface rounded-b-[8px] shadow-1 p-6 space-y-6 border-t border-border">

                    {/* I. DATOS GENERALES */}
                    <div className={`bg-surface rounded-[8px] border border-border overflow-hidden ${activeTab === 'GENERAL' ? '' : 'hidden'}`}>
                        <div className="bg-surface-muted border-b border-border px-4 py-2">
                            <h2 className="text-sm font-black text-fg uppercase">
                                I. DATOS GENERALES
                            </h2>
                        </div>
                        <div className="p-4 grid grid-cols-12 gap-x-4 gap-y-4 text-xs">

                            {/* Fila 1: Nombre | DNI | Fecha Nac | Edad + Unidad */}
                            <div className="col-span-12 md:col-span-5">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-0.5">Nombres y Apellidos</label>
                                <p className="font-bold text-fg text-sm">{nna?.nombres} {nna?.apellidoPaterno} {nna?.apellidoMaterno}</p>
                            </div>

                            <div className="col-span-6 md:col-span-2">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-0.5">DNI / Documento</label>
                                <p className="font-bold text-fg text-sm">{nna?.numeroDoc || '---'}</p>
                                {formData.noTieneDNI && (
                                    <span className="text-[10px] text-warning font-semibold">Sin DNI</span>
                                )}
                            </div>

                            <div className="col-span-6 md:col-span-2">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-0.5">Fecha Nacimiento</label>
                                <p className="font-bold text-fg text-sm">
                                    {nna?.fechaNacimiento ? new Date(nna.fechaNacimiento).toLocaleDateString('es-PE') : '---'}
                                </p>
                            </div>

                            <div className="col-span-6 md:col-span-2">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Edad</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="999"
                                    placeholder="Ej: 12"
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs focus:ring-2 focus:ring-primary/40 focus:border-primary"
                                    value={formData.edad}
                                    onChange={(e) => setFormData({ ...formData, edad: e.target.value })}
                                />
                            </div>

                            <div className="col-span-6 md:col-span-1">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Unidad</label>
                                <select
                                    className="w-full px-2 py-2 border border-border rounded-[6px] text-xs focus:ring-2 focus:ring-primary/40 focus:border-primary bg-surface"
                                    value={formData.unidadEdad}
                                    onChange={(e) => setFormData({ ...formData, unidadEdad: e.target.value })}
                                >
                                    <option value="ANIOS">Años</option>
                                    <option value="MESES">Meses</option>
                                    <option value="DIAS">Días</option>
                                </select>
                            </div>

                            {/* Dirección */}
                            <div className="col-span-12 md:col-span-8 mt-2">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Dirección Actual</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs focus:ring-2 focus:ring-primary/40 focus:border-primary"
                                    value={formData.direccionActual}
                                    onChange={(e) => setFormData({ ...formData, direccionActual: e.target.value })}
                                />
                            </div>

                            {/* Referencia */}
                            <div className="col-span-12 md:col-span-4 mt-2">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Referencia</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs focus:ring-2 focus:ring-primary/40 focus:border-primary"
                                    value={formData.referenciaDireccion}
                                    onChange={(e) => setFormData({ ...formData, referenciaDireccion: e.target.value })}
                                />
                            </div>

                            {/* Ubigeo */}
                            <div className="col-span-12 md:col-span-8 mt-2">
                                <UbigeoSelectorSimple
                                    departamento={formData.ubigeoDepto}
                                    provincia={formData.ubigeoProvinc}
                                    distrito={formData.ubigeoDistrito}
                                    onCascadeChange={(updates) =>
                                        setFormData(prev => ({
                                            ...prev,
                                            ubigeoDepto:    updates.departamento ?? prev.ubigeoDepto,
                                            ubigeoProvinc:  updates.provincia    ?? prev.ubigeoProvinc,
                                            ubigeoDistrito: updates.distrito     ?? prev.ubigeoDistrito,
                                        }))
                                    }
                                />
                            </div>

                            {/* Teléfono */}
                            <div className="col-span-12 md:col-span-4 mt-2">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Teléfono de Contacto</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs focus:ring-2 focus:ring-primary/40 focus:border-primary"
                                    value={formData.telefonoContacto}
                                    onChange={(e) => setFormData({ ...formData, telefonoContacto: e.target.value })}
                                />
                            </div>

                        </div>
                    </div>

                    {/* II. SITUACIÓN DE CALLE */}
                    <div className={`bg-surface rounded-[8px] border border-border overflow-hidden ${activeTab === 'GENERAL' ? '' : 'hidden'}`}>
                        <div className="bg-surface-muted border-b border-border px-4 py-2">
                            <h2 className="text-sm font-black text-fg uppercase">
                                II. SITUACIÓN DE CALLE
                            </h2>
                        </div>
                        <div className="p-4 grid grid-cols-12 gap-x-6 gap-y-6 text-xs">

                            {/* Perfil */}
                            <div className="col-span-12">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">Perfil del Usuario/a</label>
                                <div className="flex flex-wrap gap-3">
                                    <label className="flex items-center gap-2 px-3 py-2 border border-border rounded-[6px] bg-surface-muted/60 cursor-pointer hover:bg-surface-muted">
                                        <input type="checkbox" checked={formData.situacionCalleDetalle.perfil.trabajoInfantil} onChange={e => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, perfil: { ...formData.situacionCalleDetalle.perfil, trabajoInfantil: e.target.checked } } })} className="w-4 h-4 text-primary rounded" />
                                        <span className="font-bold text-[10px] text-fg-2 uppercase">Trabajo Infantil</span>
                                    </label>
                                    <label className="flex items-center gap-2 px-3 py-2 border border-border rounded-[6px] bg-surface-muted/60 cursor-pointer hover:bg-surface-muted">
                                        <input type="checkbox" checked={formData.situacionCalleDetalle.perfil.mendicidad} onChange={e => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, perfil: { ...formData.situacionCalleDetalle.perfil, mendicidad: e.target.checked } } })} className="w-4 h-4 text-primary rounded" />
                                        <span className="font-bold text-[10px] text-fg-2 uppercase">Mendicidad</span>
                                    </label>
                                    <label className="flex items-center gap-2 px-3 py-2 border border-border rounded-[6px] bg-surface-muted/60 cursor-pointer hover:bg-surface-muted">
                                        <input type="checkbox" checked={formData.situacionCalleDetalle.perfil.vidaEnCalle} onChange={e => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, perfil: { ...formData.situacionCalleDetalle.perfil, vidaEnCalle: e.target.checked } } })} className="w-4 h-4 text-primary rounded" />
                                        <span className="font-bold text-[10px] text-fg-2 uppercase">Vida en Calle</span>
                                    </label>
                                </div>
                                {(formData.situacionCalleDetalle.perfil.vidaEnCalle) && (
                                    <div className="mt-2 ml-4 flex gap-4">
                                        <label className="flex items-center gap-2"><input type="checkbox" checked={formData.situacionCalleDetalle.perfil.transito} onChange={e => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, perfil: { ...formData.situacionCalleDetalle.perfil, transito: e.target.checked } } })} className="rounded text-primary" /> <span className="text-[10px] text-fg-muted font-bold uppercase">Tránsito</span></label>
                                        <label className="flex items-center gap-2"><input type="checkbox" checked={formData.situacionCalleDetalle.perfil.convivencia} onChange={e => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, perfil: { ...formData.situacionCalleDetalle.perfil, convivencia: e.target.checked } } })} className="rounded text-primary" /> <span className="text-[10px] text-fg-muted font-bold uppercase">Convivencia</span></label>
                                    </div>
                                )}
                            </div>

                            <hr className="col-span-12 border-border" />

                            {/* Tiempo y Explotación */}
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Tiempo en Calle</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Cant."
                                        className="w-20 px-3 py-2 border border-border rounded-[6px] text-xs focus:ring-2 focus:ring-primary/40 focus:border-primary"
                                        value={formData.situacionCalleDetalle.tiempo.cantidad}
                                        onChange={e => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, tiempo: { ...formData.situacionCalleDetalle.tiempo, cantidad: e.target.value } } })}
                                    />
                                    <select
                                        className="flex-1 px-3 py-2 border border-border rounded-[6px] text-xs bg-surface focus:ring-2 focus:ring-primary/40 focus:border-primary"
                                        value={formData.situacionCalleDetalle.tiempo.unidad}
                                        onChange={e => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, tiempo: { ...formData.situacionCalleDetalle.tiempo, unidad: e.target.value } } })}
                                    >
                                        <option value="SEMANAS">SEMANAS</option>
                                        <option value="MESES">MESES</option>
                                        <option value="AÑOS">AÑOS</option>
                                    </select>
                                </div>
                            </div>

                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">¿Víctima de Explotación Sexual?</label>
                                <div className="flex gap-6 mt-1">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="explotacion_sexual"
                                            checked={formData.situacionCalleDetalle.explotacionSexual === true}
                                            onChange={() => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, explotacionSexual: true } })}
                                            className="w-4 h-4 text-danger focus:ring-danger/40"
                                        />
                                        <span className="text-xs font-bold text-fg-2">SI</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="explotacion_sexual"
                                            checked={formData.situacionCalleDetalle.explotacionSexual === false}
                                            onChange={() => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, explotacionSexual: false } })}
                                            className="w-4 h-4 text-primary focus:ring-primary/40"
                                        />
                                        <span className="text-xs font-bold text-fg-2">NO</span>
                                    </label>
                                </div>
                            </div>

                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">Ingreso Aprox. Semanal</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-fg-muted font-bold">S/</span>
                                    <input
                                        type="text"
                                        className="w-full pl-8 pr-3 py-2 border border-border rounded-lg text-xs font-bold focus:ring-2 focus:ring-primary/40 focus:border-primary"
                                        placeholder="0.00"
                                        value={formData.situacionCalleDetalle.ingresoSemanal}
                                        onChange={e => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, ingresoSemanal: e.target.value } })}
                                    />
                                </div>
                            </div>

                            <hr className="col-span-12 border-border" />

                            {/* Horarios y Frecuencia */}
                            <div className="col-span-12 md:col-span-6">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">Horarios en Calle</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['Manana', 'Tarde', 'Noche'].map(h => (
                                        <label key={h} className="flex flex-col items-center justify-center p-2 border border-border rounded-[6px] hover:bg-surface-muted cursor-pointer bg-surface">
                                            <span className="text-[9px] font-bold uppercase mb-1">{h}</span>
                                            <input
                                                type="checkbox"
                                                checked={(formData.situacionCalleDetalle.horarios as any)[h.toLowerCase().replace('ñ', 'n')]}
                                                onChange={e => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, horarios: { ...formData.situacionCalleDetalle, [h.toLowerCase().replace('ñ', 'n')]: e.target.checked } } })}
                                                className="w-4 h-4 text-primary rounded"
                                            />
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="col-span-12 md:col-span-6">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">Frecuencia en Calle</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['Diario', 'Interdiario', 'FinesSemana', 'Temporadas'].map(f => (
                                        <label key={f} className="flex items-center gap-2 p-2 border border-border rounded-lg bg-surface-muted/60 hover:bg-surface-muted cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={(formData.situacionCalleDetalle.frecuencia as any)[f === 'FinesSemana' ? 'finesSemana' : f.toLowerCase()]}
                                                onChange={e => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, frecuencia: { ...formData.situacionCalleDetalle.frecuencia, [f === 'FinesSemana' ? 'finesSemana' : f.toLowerCase()]: e.target.checked } } })}
                                                className="w-3.5 h-3.5 text-primary rounded"
                                            />
                                            <span className="text-[10px] font-bold uppercase text-fg-2">{f.replace('FinesSemana', 'Fines de Semana')}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <hr className="col-span-12 border-border" />

                            {/* Motivo y Modalidad */}
                            <div className="col-span-12 md:col-span-6">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Motivo Situación de Calle</label>
                                <textarea
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs focus:ring-2 focus:ring-primary/40 focus:border-primary min-h-[80px]"
                                    placeholder="Describa el motivo..."
                                    value={formData.situacionCalleDetalle.motivo}
                                    onChange={e => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, motivo: e.target.value } })}
                                />
                            </div>
                            <div className="col-span-12 md:col-span-6">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">Modalidad de Trabajo</label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={formData.situacionCalleDetalle.modalidadTrabajo.puestoFijo} onChange={e => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, modalidadTrabajo: { ...formData.situacionCalleDetalle.modalidadTrabajo, puestoFijo: e.target.checked } } })} className="rounded text-success" />
                                        <span className="text-xs text-fg-2">Puesto Fijo</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={formData.situacionCalleDetalle.modalidadTrabajo.ambulante} onChange={e => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, modalidadTrabajo: { ...formData.situacionCalleDetalle.modalidadTrabajo, ambulance: e.target.checked } } })} className="rounded text-success" />
                                        <span className="text-xs text-fg-2">Ambulante</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={formData.situacionCalleDetalle.modalidadTrabajo.recorre} onChange={e => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, modalidadTrabajo: { ...formData.situacionCalleDetalle, recorre: e.target.checked } } })} className="rounded text-success" />
                                        <span className="text-xs text-fg-2">Recorre</span>
                                    </label>
                                </div>
                            </div>

                            {/* Actividad y Lugar */}
                            <div className="col-span-12 md:col-span-6">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Actividad en Calle</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs focus:ring-2 focus:ring-primary/40 focus:border-primary"
                                    value={formData.situacionCalleDetalle.actividad}
                                    onChange={e => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, actividad: e.target.value } })}
                                />
                            </div>
                            <div className="col-span-12 md:col-span-6">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Lugar / Zona</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs focus:ring-2 focus:ring-primary/40 focus:border-primary"
                                    value={formData.situacionCalleDetalle.lugar}
                                    onChange={e => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, lugar: e.target.value } })}
                                />
                            </div>

                            <hr className="col-span-12 border-border" />

                            {/* Acompañamiento */}
                            <div className="col-span-12">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">Acompañamiento en la Actividad</label>
                                <div className="grid grid-cols-12 gap-4 items-center">
                                    <div className="col-span-12 md:col-span-4 flex gap-4">
                                        <label className="flex items-center gap-2"><input type="checkbox" checked={formData.situacionCalleDetalle.acompanamiento.solo} onChange={e => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, acompanamiento: { ...formData.situacionCalleDetalle.acompanamiento, solo: e.target.checked } } })} className="rounded text-warning" /> <span className="text-xs font-bold uppercase">Solo</span></label>
                                        <label className="flex items-center gap-2"><input type="checkbox" checked={formData.situacionCalleDetalle.acompanamiento.acompanado} onChange={e => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, acompanamiento: { ...formData.situacionCalleDetalle.acompanamiento, acompanado: e.target.checked } } })} className="rounded text-warning" /> <span className="text-xs font-bold uppercase">Acompañado</span></label>
                                        <label className="flex items-center gap-2"><input type="checkbox" checked={formData.situacionCalleDetalle.acompanamiento.acompanadoFamiliar} onChange={e => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, acompanamiento: { ...formData.situacionCalleDetalle.acompanamiento, acompanadoFamiliar: e.target.checked } } })} className="rounded text-warning" /> <span className="text-xs font-bold uppercase">Familiar</span></label>
                                    </div>
                                    <div className="col-span-12 md:col-span-8">
                                        <input
                                            type="text"
                                            placeholder="¿Quién lo acompaña?"
                                            className="w-full px-3 py-2 border border-border rounded-[6px] text-xs bg-surface-muted focus:bg-surface transition-colors"
                                            value={formData.situacionCalleDetalle.acompanamiento.quien}
                                            onChange={e => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, acompanamiento: { ...formData.situacionCalleDetalle.acompanamiento, quien: e.target.value } } })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Obligado y Escapó */}
                            <div className="col-span-12 md:col-span-6 bg-danger-soft p-3 rounded-[6px] border border-danger/20">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-[10px] font-bold text-danger uppercase">¿Es obligado a trabajar?</label>
                                    <div className="flex gap-3">
                                        <label className="flex items-center gap-1"><input type="radio" name="obligado" checked={formData.situacionCalleDetalle.obligado.si} onChange={() => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, obligado: { si: true, no: false, quien: '' } } })} className="text-danger" /> <span className="text-xs font-bold">SI</span></label>
                                        <label className="flex items-center gap-1"><input type="radio" name="obligado" checked={formData.situacionCalleDetalle.obligado.no} onChange={() => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, obligado: { si: false, no: true, quien: '' } } })} className="text-fg-muted" /> <span className="text-xs font-bold">NO</span></label>
                                    </div>
                                </div>
                                <input
                                    type="text"
                                    placeholder="¿Quién lo obliga?"
                                    className="w-full px-2 py-1 border border-danger/20 rounded text-xs bg-surface"
                                    value={formData.situacionCalleDetalle.obligado.quien}
                                    onChange={e => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, obligado: { ...formData.situacionCalleDetalle.obligado, quien: e.target.value } } })}
                                />
                            </div>

                            <div className="col-span-12 md:col-span-6 bg-warning-soft p-3 rounded-[6px] border border-warning/20">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-[10px] font-bold text-warning uppercase">¿Escapó de casa?</label>
                                    <div className="flex gap-3">
                                        <label className="flex items-center gap-1"><input type="radio" name="escapo" checked={formData.situacionCalleDetalle.escapoCasa.si} onChange={() => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, escapoCasa: { si: true, no: false, veces: '' } } })} className="text-warning" /> <span className="text-xs font-bold">SI</span></label>
                                        <label className="flex items-center gap-1"><input type="radio" name="escapo" checked={formData.situacionCalleDetalle.escapoCasa.no} onChange={() => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, escapoCasa: { si: false, no: true, veces: '' } } })} className="text-fg-muted" /> <span className="text-xs font-bold">NO</span></label>
                                    </div>
                                </div>
                                <input
                                    type="text"
                                    placeholder="¿Cuántas veces?"
                                    className="w-full px-2 py-1 border border-warning/20 rounded text-xs bg-surface"
                                    value={formData.situacionCalleDetalle.escapoCasa.veces}
                                    onChange={e => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, escapoCasa: { ...formData.situacionCalleDetalle.escapoCasa, veces: e.target.value } } })}
                                />
                            </div>

                            {/* Consumo */}
                            <div className="col-span-12 border-t border-border pt-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">Consumo de Sustancias Psicoactivas</label>
                                <div className="grid grid-cols-12 gap-4 bg-surface-muted rounded-[6px] p-3 border border-border">
                                    <div className="col-span-12 md:col-span-4 flex items-center justify-between">
                                        <span className="text-xs font-bold text-fg-2">¿Consume?</span>
                                        <div className="flex gap-3">
                                            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="consumo" checked={formData.situacionCalleDetalle.consumo.si} onChange={() => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, consumo: { ...formData.situacionCalleDetalle.consumo, si: true, no: false } } })} className="text-danger" /> <span className="text-xs font-bold">SI</span></label>
                                            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="consumo" checked={formData.situacionCalleDetalle.consumo.no} onChange={() => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, consumo: { ...formData.situacionCalleDetalle.consumo, si: false, no: true } } })} className="text-success" /> <span className="text-xs font-bold">NO</span></label>
                                        </div>
                                    </div>
                                    <div className="col-span-12 md:col-span-8">
                                        <input
                                            type="text"
                                            placeholder="¿Qué tipo de sustancias?"
                                            className="w-full px-3 py-1.5 border border-border rounded text-xs bg-surface"
                                            value={formData.situacionCalleDetalle.consumo.tipo}
                                            onChange={e => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, consumo: { ...formData.situacionCalleDetalle.consumo, tipo: e.target.value } } })}
                                        />
                                    </div>
                                    <div className="col-span-12 md:col-span-6 flex items-center gap-3">
                                        <span className="text-[10px] font-bold text-fg-muted uppercase">Frecuencia:</span>
                                        <div className="flex gap-2">
                                            {['Experimental', 'Ocasional', 'Habitual'].map(fr => (
                                                <label key={fr} className="text-[10px] flex items-center gap-1">
                                                    <input type="radio" name="frecuenciaConsumo" value={fr.toUpperCase()} checked={formData.situacionCalleDetalle.consumo.frecuencia === fr.toUpperCase()} onChange={e => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, consumo: { ...formData.situacionCalleDetalle.consumo, frequency: e.target.value } } })} />
                                                    {fr}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="col-span-12 md:col-span-6 flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-fg-muted uppercase">Tiempo:</span>
                                        <input type="text" className="w-16 px-2 py-1 border border-border rounded text-xs" placeholder="Cant." value={formData.situacionCalleDetalle.consumo.tiempo} onChange={e => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, consumo: { ...formData.situacionCalleDetalle.consumo, tiempo: e.target.value } } })} />
                                        <select className="px-2 py-1 border border-border rounded text-xs" value={formData.situacionCalleDetalle.consumo.unidadTiempo} onChange={e => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, consumo: { ...formData.situacionCalleDetalle.consumo, unidadTiempo: e.target.value } } })}>
                                            <option value="SEMANAS">Semanas</option>
                                            <option value="MESES">Meses</option>
                                            <option value="AÑOS">Años</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* III. TUTOR */}
                    <div className={`bg-surface rounded-[8px] border border-border overflow-hidden ${activeTab === 'GENERAL' ? '' : 'hidden'}`}>
                        <div className="bg-surface-muted border-b border-border px-4 py-2">
                            <h2 className="text-sm font-black text-fg uppercase">
                                III. DATOS DEL TUTOR/APODERADO/FAMILIAR
                            </h2>
                        </div>
                        <div className="p-4 grid grid-cols-12 gap-x-6 gap-y-4 text-xs">

                            {/* Fila 1: Nombres y Fecha Nac */}
                            <div className="col-span-12 md:col-span-8">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Nombres y Apellidos</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs focus:ring-2 focus:ring-primary/40 focus:border-primary"
                                    value={formData.tutorNombre}
                                    onChange={(e) => setFormData({ ...formData, tutorNombre: e.target.value })}
                                />
                            </div>
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Fecha de Nacimiento</label>
                                <input
                                    type="date"
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs focus:ring-2 focus:ring-primary/40 focus:border-primary"
                                    value={formData.tutorFechaNacimiento}
                                    onChange={(e) => setFormData({ ...formData, tutorFechaNacimiento: e.target.value })}
                                />
                            </div>

                            {/* Fila 2: DNI */}
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">DNI</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs focus:ring-2 focus:ring-primary/40 focus:border-primary"
                                    value={formData.tutorDNI}
                                    onChange={(e) => setFormData({ ...formData, tutorDNI: e.target.value })}
                                />
                            </div>

                            {/* Fila 3: Parentesco y Grado */}
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Parentesco con el usuario</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs focus:ring-2 focus:ring-primary/40 focus:border-primary"
                                    value={formData.tutorParentesco}
                                    onChange={(e) => setFormData({ ...formData, tutorParentesco: e.target.value })}
                                />
                            </div>
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Grado de Instrucción</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs focus:ring-2 focus:ring-primary/40 focus:border-primary"
                                    value={formData.tutorGradoInstruccion}
                                    onChange={(e) => setFormData({ ...formData, tutorGradoInstruccion: e.target.value })}
                                />
                            </div>

                            <hr className="col-span-12 border-border" />

                            {/* Fila 4: Discapacidad y Estado Civil */}
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">¿Presenta alguna Discapacidad?</label>
                                <div className="flex gap-4 mt-2">
                                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="tutorDiscapacidad" value="SI" checked={formData.tutorDiscapacidad === 'SI'} onChange={() => setFormData({ ...formData, tutorDiscapacidad: 'SI' })} className="text-primary" /> <span className="font-bold text-fg-2">SI</span></label>
                                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="tutorDiscapacidad" value="NO" checked={formData.tutorDiscapacidad === 'NO'} onChange={() => setFormData({ ...formData, tutorDiscapacidad: 'NO' })} className="text-primary" /> <span className="font-bold text-fg-2">NO</span></label>
                                </div>
                            </div>
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Cuenta con carnet CONADIS</label>
                                <div className="flex gap-4 mt-2">
                                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="tutorConadis" value="SI" checked={formData.tutorConadis === 'SI'} onChange={() => setFormData({ ...formData, tutorConadis: 'SI' })} className="text-primary" /> <span className="font-bold">SI</span></label>
                                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="tutorConadis" value="NO" checked={formData.tutorConadis === 'NO'} onChange={() => setFormData({ ...formData, tutorConadis: 'NO' })} className="text-primary" /> <span className="font-bold">NO</span></label>
                                </div>
                            </div>
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Estado Civil</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs focus:ring-2 focus:ring-primary/40 focus:border-primary"
                                    value={formData.tutorEstadoCivil}
                                    onChange={(e) => setFormData({ ...formData, tutorEstadoCivil: e.target.value })}
                                />
                            </div>

                            {/* Fila 5: Ocupación e Ingreso */}
                            <div className="col-span-12 md:col-span-8">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Ocupación</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs focus:ring-2 focus:ring-primary/40 focus:border-primary"
                                    value={formData.tutorOcupacion}
                                    onChange={(e) => setFormData({ ...formData, tutorOcupacion: e.target.value })}
                                />
                            </div>
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Ingreso Aprox. Semanal</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-fg-muted font-bold">S/</span>
                                    <input
                                        type="text"
                                        className="w-full pl-8 pr-3 py-2 border border-border rounded-[6px] text-xs font-bold focus:ring-2 focus:ring-primary/40 focus:border-primary"
                                        placeholder="0.00"
                                        value={formData.tutorIngreso}
                                        onChange={(e) => setFormData({ ...formData, tutorIngreso: e.target.value })}
                                    />
                                </div>
                            </div>

                            <hr className="col-span-12 border-border" />

                            {/* Fila 6: Consumo y Apoyo Alimentos */}
                            <div className="col-span-12 md:col-span-6">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Consumo de Drogas</label>
                                <div className="flex gap-4 mt-2">
                                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="tutorConsumoDrogas" value="SI" checked={formData.tutorConsumoDrogas === 'SI'} onChange={() => setFormData({ ...formData, tutorConsumoDrogas: 'SI' })} className="text-danger" /> <span className="font-bold text-fg-2">SI</span></label>
                                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="tutorConsumoDrogas" value="NO" checked={formData.tutorConsumoDrogas === 'NO'} onChange={() => setFormData({ ...formData, tutorConsumoDrogas: 'NO' })} className="text-success" /> <span className="font-bold text-fg-2">NO</span></label>
                                </div>
                            </div>
                            <div className="col-span-12 md:col-span-6">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">¿Recibe apoyo para alimentos del NNA?</label>
                                <div className="flex gap-4 mt-2">
                                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="tutorRecibeApoyo" value="SI" checked={formData.tutorRecibeApoyo === 'SI'} onChange={() => setFormData({ ...formData, tutorRecibeApoyo: 'SI' })} className="text-primary" /> <span className="font-bold text-fg-2">SI</span></label>
                                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="tutorRecibeApoyo" value="NO" checked={formData.tutorRecibeApoyo === 'NO'} onChange={() => setFormData({ ...formData, tutorRecibeApoyo: 'NO' })} className="text-primary" /> <span className="font-bold text-fg-2">NO</span></label>
                                </div>
                            </div>

                            {/* Fila 7: Demanda */}
                            <div className="col-span-12 bg-primary-soft/30 p-3 rounded-[6px] border border-primary/20 flex items-center justify-between mt-2">
                                <label className="font-bold text-primary uppercase text-[10px]">¿Desea realizar demanda por alimentos?</label>
                                <div className="flex gap-6">
                                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="tutorDeseaDemanda" value="SI" checked={formData.tutorDeseaDemanda === 'SI'} onChange={() => setFormData({ ...formData, tutorDeseaDemanda: 'SI' })} className="text-primary" /> <span className="font-bold text-primary text-xs">SI</span></label>
                                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="tutorDeseaDemanda" value="NO" checked={formData.tutorDeseaDemanda === 'NO'} onChange={() => setFormData({ ...formData, tutorDeseaDemanda: 'NO' })} className="text-primary" /> <span className="font-bold text-primary text-xs">NO</span></label>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* IV. DATOS DE LA FAMILIA */}
                    <div className={activeTab === 'FAMILIA' ? '' : 'hidden'}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-black text-fg-muted uppercase tracking-widest border-b border-border pb-2">
                                IV. Datos de la Familia
                            </h3>
                            <button
                                onClick={handleAddFamily}
                                className="flex items-center gap-2 bg-success text-white px-4 py-2 rounded-[6px] hover:bg-success/90 transition-colors text-sm font-bold"
                            >
                                <Plus size={16} /> Agregar Familiar
                            </button>
                        </div>

                        {formData.familiares.length > 0 ? (
                            <div className="border border-border rounded-[6px] overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-surface-muted text-xs">
                                        <tr>
                                            <th className="px-3 py-2 text-left">N°</th>
                                            <th className="px-3 py-2 text-left">Apellidos y Nombres</th>
                                            <th className="px-3 py-2 text-left">Parentesco</th>
                                            <th className="px-3 py-2 text-left">Edad</th>
                                            <th className="px-3 py-2 text-left">Sexo</th>
                                            <th className="px-3 py-2 text-left">G. Instrucción</th>
                                            <th className="px-3 py-2 text-left">Ocupación</th>
                                            <th className="px-3 py-2 text-center">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {formData.familiares.map((familiar, idx) => (
                                            <tr key={idx} className="border-t border-border">
                                                <td className="px-3 py-2 font-bold text-fg-muted text-center">{idx + 1}</td>
                                                <td className="px-3 py-2">{`${familiar.primerApellido} ${familiar.segundoApellido} ${familiar.nombres}`.trim()}</td>
                                                <td className="px-3 py-2">{familiar.parentesco}</td>
                                                <td className="px-3 py-2 text-center">{familiar.edad}</td>
                                                <td className="px-3 py-2">{familiar.sexo}</td>
                                                <td className="px-3 py-2 text-xs">{familiar.gradoInstruccion}</td>
                                                <td className="px-3 py-2 text-xs">{familiar.ocupacion}</td>
                                                <td className="px-3 py-2">
                                                    <div className="flex gap-2 justify-center">
                                                        <button
                                                            onClick={() => handleEditFamily(idx)}
                                                            className="p-1 text-primary hover:bg-primary-soft rounded transition-colors"
                                                            title="Editar"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteFamily(idx)}
                                                            className="p-1 text-danger hover:bg-danger-soft rounded transition-colors"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="border-2 border-dashed border-border rounded-[6px] p-8 text-center">
                                <p className="text-fg-muted text-sm mb-3">No hay familiares registrados</p>
                                <button
                                    onClick={handleAddFamily}
                                    className="text-success text-sm font-bold hover:text-success/80"
                                >
                                    + Agregar el primer familiar
                                </button>
                            </div>
                        )}

                        <div className="mt-6 border-t border-border pt-4">
                            <h4 className="text-xs font-black text-fg-muted uppercase tracking-widest mb-4">Relación con la Familia</h4>

                            <div className="grid grid-cols-12 gap-4 text-xs">
                                {/* Contacto y Frecuencia */}
                                <div className="col-span-12 md:col-span-4">
                                    <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">¿Tiene contacto con su familia?</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-1 font-bold"><input type="radio" checked={formData.dinamicaFamiliar.contacto === 'SI'} onChange={() => setFormData({ ...formData, dinamicaFamiliar: { ...formData.dinamicaFamiliar, contacto: 'SI' } })} /> SI</label>
                                        <label className="flex items-center gap-1 font-bold"><input type="radio" checked={formData.dinamicaFamiliar.contacto === 'NO'} onChange={() => setFormData({ ...formData, dinamicaFamiliar: { ...formData.dinamicaFamiliar, contacto: 'NO' } })} /> NO</label>
                                    </div>
                                </div>

                                <div className="col-span-12 md:col-span-8">
                                    <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">Frecuencia</label>
                                    <div className="flex flex-wrap gap-4">
                                        {['DIARIO', 'INTERDIARIO', 'FINES DE SEMANA', 'MESES', 'AÑOS'].map(opt => (
                                            <label key={opt} className="flex items-center gap-1 text-[10px]">
                                                <input type="radio" checked={formData.dinamicaFamiliar.frecuencia === opt} onChange={() => setFormData({ ...formData, dinamicaFamiliar: { ...formData.dinamicaFamiliar, frecuencia: opt } })} />
                                                {opt}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="col-span-12 mt-2">
                                    <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">Padres asumen su rol (X)</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border border-border rounded-[6px] p-3 bg-surface-muted">
                                        {/* Protector */}
                                        <div>
                                            <div className="text-center font-bold mb-2 text-fg-muted border-b border-border pb-1">PROTECTOR</div>
                                            <div className="flex justify-center gap-4">
                                                <label className="flex items-center gap-1"><input type="radio" checked={formData.dinamicaFamiliar.rolProtector === 'SI'} onChange={() => setFormData({ ...formData, dinamicaFamiliar: { ...formData.dinamicaFamiliar, rolProtector: 'SI' } })} /> SI</label>
                                                <label className="flex items-center gap-1"><input type="radio" checked={formData.dinamicaFamiliar.rolProtector === 'NO'} onChange={() => setFormData({ ...formData, dinamicaFamiliar: { ...formData.dinamicaFamiliar, rolProtector: 'NO' } })} /> NO</label>
                                                <label className="flex items-center gap-1"><input type="radio" checked={formData.dinamicaFamiliar.rolProtector === 'REGULAR'} onChange={() => setFormData({ ...formData, dinamicaFamiliar: { ...formData.dinamicaFamiliar, rolProtector: 'REGULAR' } })} /> REGULAR</label>
                                            </div>
                                        </div>

                                        {/* Proveedor */}
                                        <div>
                                            <div className="text-center font-bold mb-2 text-fg-muted border-b border-border pb-1">PROVEEDOR</div>
                                            <div className="flex justify-center gap-4">
                                                <label className="flex items-center gap-1"><input type="radio" checked={formData.dinamicaFamiliar.rolProveedor === 'SI'} onChange={() => setFormData({ ...formData, dinamicaFamiliar: { ...formData.dinamicaFamiliar, rolProveedor: 'SI' } })} /> SI</label>
                                                <label className="flex items-center gap-1"><input type="radio" checked={formData.dinamicaFamiliar.rolProveedor === 'NO'} onChange={() => setFormData({ ...formData, dinamicaFamiliar: { ...formData.dinamicaFamiliar, rolProveedor: 'NO' } })} /> NO</label>
                                                <label className="flex items-center gap-1"><input type="radio" checked={formData.dinamicaFamiliar.rolProveedor === 'REGULAR'} onChange={() => setFormData({ ...formData, dinamicaFamiliar: { ...formData.dinamicaFamiliar, rolProveedor: 'REGULAR' } })} /> REGULAR</label>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>

                    </div>

                    {/* V. DATOS DE LA VIVIENDA */}
                    <div className={`bg-surface rounded-[8px] border border-border overflow-hidden mt-6 ${activeTab === 'FAMILIA' ? '' : 'hidden'}`}>
                        <div className="bg-surface-muted border-b border-border px-4 py-2">
                            <h2 className="text-sm font-black text-fg uppercase">
                                V. DATOS DE LA VIVIENDA
                            </h2>
                        </div>
                        <div className="p-4 grid grid-cols-12 gap-x-6 gap-y-6 text-xs">

                            {/* Fila 1: Material */}
                            <div className="col-span-12 md:col-span-4 relative group">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">Material de Vivienda (X)</label>
                                <div className="flex gap-2 bg-surface-muted p-2 rounded-[6px] border border-border">
                                    <label className="flex-1 flex items-center justify-center gap-2 cursor-pointer hover:bg-surface p-2 rounded transition-all shadow-sm border border-transparent hover:border-border">
                                        <input type="radio" name="material" value="CONCRETO" checked={formData.materialVivienda === 'CONCRETO'} onChange={(e) => setFormData({ ...formData, materialVivienda: e.target.value })} className="text-primary focus:ring-primary/40" />
                                        <span className="font-semibold text-fg-2">Concreto</span>
                                    </label>
                                    <label className="flex-1 flex items-center justify-center gap-2 cursor-pointer hover:bg-surface p-2 rounded transition-all shadow-sm border border-transparent hover:border-border">
                                        <input type="radio" name="material" value="PRECARIO" checked={formData.materialVivienda === 'PRECARIO'} onChange={(e) => setFormData({ ...formData, materialVivienda: e.target.value })} className="text-primary focus:ring-primary/40" />
                                        <span className="font-semibold text-fg-2">Precario</span>
                                    </label>
                                </div>
                            </div>

                            {/* Fila 1: Ambientes */}
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">Número de Ambientes</label>
                                <div className="flex gap-2 bg-surface-muted p-2 rounded-[6px] border border-border text-center">
                                    {['1', '2', '3'].map(opt => (
                                        <label key={opt} className="flex-1 cursor-pointer hover:bg-surface p-2 rounded transition-all shadow-sm border border-transparent hover:border-border">
                                            <input type="radio" name="ambientes" value={opt} checked={formData.numeroAmbientes === opt} onChange={(e) => setFormData({ ...formData, numeroAmbientes: e.target.value })} className="sr-only peer" />
                                            <span className="block font-bold text-fg-muted peer-checked:text-primary peer-checked:scale-110 transition-transform">{opt}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Fila 1: Propiedad */}
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">Propiedad de la Vivienda</label>
                                <div className="grid grid-cols-2 gap-2 bg-surface-muted p-2 rounded-[6px] border border-border">
                                    {['OTROS', 'PROPIA', 'ALQUILADA', 'ALOJADO'].map(opt => (
                                        <label key={opt} className="flex items-center gap-2 cursor-pointer hover:bg-surface p-1 px-2 rounded transition-all border border-transparent hover:border-border">
                                            <input type="radio" name="propiedad" value={opt} checked={formData.propiedadVivienda === opt} onChange={(e) => setFormData({ ...formData, propiedadVivienda: e.target.value })} className="text-primary focus:ring-primary/40" />
                                            <span className="text-[10px] font-semibold text-fg-2 truncate" title={opt}>{opt === 'ALOJADO' ? 'ALOJADO/INV.' : opt}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <hr className="col-span-12 border-border" />

                            {/* Fila 2: SISFOH y Cama (Agrupados) */}
                            <div className="col-span-12 md:col-span-4 space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">Vivienda inscrita en SISFOH</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="sisfoh" value="SI" checked={formData.viviendaSisfoh === 'SI'} onChange={(e) => setFormData({ ...formData, viviendaSisfoh: e.target.value })} className="text-primary" /> <span className="font-bold">SI</span></label>
                                        <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="sisfoh" value="NO" checked={formData.viviendaSisfoh === 'NO'} onChange={(e) => setFormData({ ...formData, viviendaSisfoh: e.target.value })} className="text-primary" /> <span className="font-bold">NO</span></label>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">Duerme en una Cama</label>
                                    <div className="flex gap-4 mb-2">
                                        <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="cama" value="SI" checked={formData.duermeCama === 'SI'} onChange={(e) => setFormData({ ...formData, duermeCama: e.target.value })} className="text-primary" /> <span className="font-bold">SI</span></label>
                                        <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="cama" value="NO" checked={formData.duermeCama === 'NO'} onChange={(e) => setFormData({ ...formData, duermeCama: e.target.value })} className="text-primary" /> <span className="font-bold">NO</span></label>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="¿Con quién?"
                                        className="w-full border-b border-border-strong focus:border-primary outline-none text-xs py-1 bg-transparent"
                                        value={formData.duermeConQuien}
                                        onChange={(e) => setFormData({ ...formData, duermeConQuien: e.target.value })}
                                    />
                                    <div className="flex gap-4 mt-2 text-[10px]">
                                        <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="solo" value="SOLO" checked={formData.duermeSoloAcompanado === 'SOLO'} onChange={(e) => setFormData({ ...formData, duermeSoloAcompanado: e.target.value })} /> SOLO</label>
                                        <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="solo" value="ACOMPAÑADO" checked={formData.duermeSoloAcompanado === 'ACOMPAÑADO'} onChange={(e) => setFormData({ ...formData, duermeSoloAcompanado: e.target.value })} /> ACOMPAÑADO</label>
                                    </div>
                                </div>
                            </div>

                            {/* Fila 2: Servicios Básicos */}
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">Servicios Básicos</label>
                                <div className="space-y-2 bg-primary-soft/20 p-3 rounded-[6px] border border-primary/20">
                                    <label className="flex items-center gap-2 cursor-pointer hover:bg-primary-soft/40 p-1 rounded transition-colors">
                                        <input type="checkbox" checked={formData.serviciosBasicos.agua} onChange={(e) => setFormData({ ...formData, serviciosBasicos: { ...formData.serviciosBasicos, agua: e.target.checked } })} className="rounded text-primary focus:ring-primary/40" />
                                        <span className="font-medium text-fg-2">Agua</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer hover:bg-primary-soft/40 p-1 rounded transition-colors">
                                        <input type="checkbox" checked={formData.serviciosBasicos.luz} onChange={(e) => setFormData({ ...formData, serviciosBasicos: { ...formData.serviciosBasicos, luz: e.target.checked } })} className="rounded text-primary focus:ring-primary/40" />
                                        <span className="font-medium text-fg-2">Luz</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer hover:bg-primary-soft/40 p-1 rounded transition-colors">
                                        <input type="checkbox" checked={formData.serviciosBasicos.desague} onChange={(e) => setFormData({ ...formData, serviciosBasicos: { ...formData.serviciosBasicos, desague: e.target.checked } })} className="rounded text-primary focus:ring-primary/40" />
                                        <span className="font-medium text-fg-2">Desagüe</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer hover:bg-primary-soft/40 p-1 rounded transition-colors">
                                        <input type="checkbox" checked={formData.serviciosBasicos.otros} onChange={(e) => setFormData({ ...formData, serviciosBasicos: { ...formData.serviciosBasicos, otros: e.target.checked } })} className="rounded text-primary focus:ring-primary/40" />
                                        <span className="font-medium text-fg-2">Otros</span>
                                    </label>
                                </div>
                            </div>

                            {/* Fila 2: Higiene */}
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">Higiene en el domicilio</label>
                                <div className="space-y-1">
                                    {['BUENO', 'REGULAR', 'MALO', 'PESIMO'].map(opt => (
                                        <label key={opt} className={`flex items-center gap-3 cursor-pointer p-2 rounded-lg border transition-all ${formData.higieneDomicilio === opt ? 'bg-success-soft border-success/20 shadow-sm' : 'border-transparent hover:bg-surface-muted'}`}>
                                            <input type="radio" name="higiene" value={opt} checked={formData.higieneDomicilio === opt} onChange={(e) => setFormData({ ...formData, higieneDomicilio: e.target.value })} className="text-success focus:ring-success/40" />
                                            <span className={`text-xs font-bold ${formData.higieneDomicilio === opt ? 'text-success' : 'text-fg-muted'}`}>{opt}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <hr className="col-span-12 border-border" />

                            {/* Fila 3: Albergue */}
                            <div className="col-span-12">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">Antecedente en CAR / Albergue</label>
                                <div className="flex flex-col md:flex-row items-start gap-6 bg-surface-muted p-4 rounded-[8px] border border-border">
                                    {/* SI/NO Radio */}
                                    <div>
                                        <span className="text-xs font-bold text-fg-muted block mb-2">¿Estuvo en Albergue?</span>
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white transition-colors ${formData.tieneAntecedenteAlbergue ? 'bg-primary' : 'bg-surface-muted text-fg-muted'}`}>
                                                    {formData.tieneAntecedenteAlbergue ? 'SI' : ''}
                                                </div>
                                                <input
                                                    type="radio"
                                                    name="antecedenteAlbergue"
                                                    checked={formData.tieneAntecedenteAlbergue === true}
                                                    onChange={() => setFormData({ ...formData, tieneAntecedenteAlbergue: true })}
                                                    className="hidden"
                                                />
                                                <span className={`text-xs font-bold ${formData.tieneAntecedenteAlbergue ? 'text-primary' : 'text-fg-muted'}`}>SI</span>
                                            </label>

                                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white transition-colors ${formData.tieneAntecedenteAlbergue === false ? 'bg-primary' : 'bg-surface-muted text-fg-muted'}`}>
                                                    {formData.tieneAntecedenteAlbergue === false ? 'NO' : ''}
                                                </div>
                                                <input
                                                    type="radio"
                                                    name="antecedenteAlbergue"
                                                    checked={formData.tieneAntecedenteAlbergue === false}
                                                    onChange={() => setFormData({ ...formData, tieneAntecedenteAlbergue: false })}
                                                    className="hidden"
                                                />
                                                <span className={`text-xs font-bold ${formData.tieneAntecedenteAlbergue === false ? 'text-primary' : 'text-fg-muted'}`}>NO</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="flex-1 grid grid-cols-2 gap-4 w-full">
                                        <div>
                                            <label className="block text-[9px] font-bold text-fg-muted uppercase mb-1">¿Cuánto Tiempo?</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 border border-border rounded-[6px] text-xs focus:ring-2 focus:ring-primary/40 bg-surface"
                                                placeholder="Ej: 3 meses"
                                                value={formData.tiempoAlbergue}
                                                onChange={(e) => setFormData({ ...formData, tiempoAlbergue: e.target.value })}
                                                disabled={!formData.tieneAntecedenteAlbergue}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-bold text-fg-muted uppercase mb-1">Motivo</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 border border-border rounded-[6px] text-xs focus:ring-2 focus:ring-primary/40 bg-surface"
                                                placeholder="Especifique motivo..."
                                                value={formData.detalleAntecedenteAlbergue}
                                                onChange={(e) => setFormData({ ...formData, detalleAntecedenteAlbergue: e.target.value })}
                                                disabled={!formData.tieneAntecedenteAlbergue}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* VI. EDUCACIÓN */}
                    <div className={`bg-surface rounded-[8px] border border-border overflow-hidden mt-6 shadow-sm ${activeTab === 'EDUCACION' ? '' : 'hidden'}`}>
                        <div className="bg-surface-muted border-b border-border px-4 py-2">
                            <h2 className="text-sm font-black text-fg uppercase">
                                VI. EDUCACIÓN - NNA
                            </h2>
                        </div>

                        <div className="p-4 grid grid-cols-12 gap-x-6 gap-y-4 text-xs">
                            {/* Estudia y Nivel */}
                            <div className="col-span-12 md:col-span-3">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">¿Estudia Actualmente?</label>
                                <div className="flex relative w-full h-10 bg-surface-muted rounded-full p-1 border border-border">
                                    <div onClick={() => setFormData({ ...formData, eduEstudia: 'SI' })} className={`flex-1 flex items-center justify-center font-bold z-10 cursor-pointer transition-colors ${formData.eduEstudia === 'SI' ? 'text-white' : 'text-fg-muted hover:text-fg'}`}>SÍ</div>
                                    <div onClick={() => setFormData({ ...formData, eduEstudia: 'NO' })} className={`flex-1 flex items-center justify-center font-bold z-10 cursor-pointer transition-colors ${formData.eduEstudia === 'NO' ? 'text-white' : 'text-fg-muted hover:text-fg'}`}>NO</div>
                                    <div className={`absolute top-1 bottom-1 w-[45%] bg-primary rounded-full transition-all duration-300 shadow-sm ${formData.eduEstudia === 'NO' ? 'translate-x-[110%]' : 'translate-x-[5%]'}`}></div>
                                </div>
                            </div>

                            <div className="col-span-12 md:col-span-9">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">Nivel Educativo</label>
                                <div className="flex gap-2">
                                    {['INICIAL', 'PRIMARIA', 'SECUNDARIA', 'TÉCNICA', 'SUPERIOR', 'CEBA'].map(opt => (
                                        <div
                                            key={opt}
                                            onClick={() => setFormData({ ...formData, eduNivel: opt })}
                                            className={`flex-1 cursor-pointer text-center py-2 rounded-t-lg border-b-2 font-bold transition-colors ${formData.eduNivel === opt ? 'border-primary text-primary bg-primary-soft/20' : 'border-transparent text-fg-muted hover:bg-surface-muted'}`}
                                        >
                                            {opt.substring(0, 3)}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="col-span-12 border-t border-border pt-4">
                                <div className="grid grid-cols-12 gap-4">
                                    <div className="col-span-12 md:col-span-4">
                                        <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Grado / Año</label>
                                        <input type="text" className="w-full px-3 py-1.5 border border-border rounded text-xs bg-surface" value={formData.eduGrado} onChange={e => setFormData({ ...formData, eduGrado: e.target.value })} />
                                    </div>
                                    <div className="col-span-12 md:col-span-4">
                                        <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Turno</label>
                                        <select className="w-full px-3 py-1.5 border border-border rounded text-xs bg-surface" value={formData.eduTurno} onChange={e => setFormData({ ...formData, eduTurno: e.target.value })}>
                                            <option value="MAÑANA">MAÑANA</option>
                                            <option value="TARDE">TARDE</option>
                                            <option value="NOCHE">NOCHE</option>
                                        </select>
                                    </div>
                                    <div className="col-span-12 md:col-span-4">
                                        <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Tipo de I.E.</label>
                                        <select className="w-full px-3 py-1.5 border border-border rounded text-xs bg-surface" value={formData.eduTipoIE} onChange={e => setFormData({ ...formData, eduTipoIE: e.target.value })}>
                                            <option value="ESTATAL">ESTATAL</option>
                                            <option value="PARTICULAR">PARTICULAR</option>
                                            <option value="CONVENIO">CONVENIO</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Atraso y Problemas */}
                            <div className="col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                                {[
                                    { label: 'Atraso Escolar', key: 'presentaAtraso' },
                                    { label: 'Prob. Aprendizaje', key: 'problemasAprendizaje' },
                                    { label: 'Prob. Conducta', key: 'problemasConducta' }
                                ].map(item => (
                                    <div key={item.key} className="p-3 border border-border rounded-lg bg-surface-muted/20 flex flex-col justify-between">
                                        <span className="font-bold text-[10px] text-fg-muted uppercase mb-3">{item.label}</span>
                                        <div className="flex gap-2 h-8">
                                            <div onClick={() => setFormData({ ...formData, [item.key]: true })} className={`flex-1 flex items-center justify-center font-bold text-[10px] border rounded cursor-pointer transition-colors ${formData[item.key as keyof typeof formData] === true ? 'bg-primary text-white border-primary' : 'bg-surface text-fg-muted hover:text-fg'}`}>SÍ</div>
                                            <div onClick={() => setFormData({ ...formData, [item.key]: false })} className={`flex-1 flex items-center justify-center font-bold text-[10px] border rounded cursor-pointer transition-colors ${formData[item.key as keyof typeof formData] === false ? 'bg-fg-muted text-white border-fg-muted' : 'bg-surface text-fg-muted hover:text-fg'}`}>NO</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* VII. SALUD */}
                    <div className={`bg-surface rounded-[8px] border border-border overflow-hidden mt-6 ${activeTab === 'SALUD' ? '' : 'hidden'}`}>
                        <div className="bg-surface-muted border-b border-border px-4 py-2">
                            <h2 className="text-sm font-black text-fg uppercase">
                                VII. SALUD – ALIMENTACIÓN – HIGIENE
                            </h2>
                        </div>
                        <div className="p-4 grid grid-cols-12 gap-x-6 gap-y-4 text-xs">
                            {[
                                { label: '¿Enfermedad Crónica?', key: 'enfermedadCronica', detailKey: 'detalleEnfermedadCronica' },
                                { label: '¿Problema Psicológico?', key: 'problemaPsicologico', detailKey: 'detalleProblemaPsicologico' },
                                { label: '¿Consume Sustancias?', key: 'consumeSustancias', detailKey: 'tipoSustancias' }
                            ].map(item => (
                                <div key={item.key} className="col-span-12 p-3 border-b border-border/50 flex flex-col md:flex-row gap-4 items-start md:items-center">
                                    <div className="w-48">
                                        <span className="font-bold text-[10px] text-fg-muted uppercase">{item.label}</span>
                                        <div className="flex gap-2 mt-2">
                                            <div onClick={() => setFormData({ ...formData, [item.key]: true })} className={`px-4 py-1 rounded cursor-pointer font-bold transition-colors ${formData[item.key as keyof typeof formData] === true ? 'bg-danger text-white' : 'bg-surface-muted text-fg-muted hover:text-danger'}`}>SI</div>
                                            <div onClick={() => setFormData({ ...formData, [item.key]: false })} className={`px-4 py-1 rounded cursor-pointer font-bold transition-colors ${formData[item.key as keyof typeof formData] === false ? 'bg-success text-white' : 'bg-surface-muted text-fg-muted hover:text-success'}`}>NO</div>
                                        </div>
                                    </div>
                                    {formData[item.key as keyof typeof formData] && (
                                        <div className="flex-1 w-full animate-in slide-in-from-left-2 duration-300">
                                            <label className="block text-[9px] font-bold text-fg-muted uppercase mb-1">Especifique / Detalles:</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 border border-danger/20 rounded-[6px] text-xs bg-danger-soft/10 focus:bg-surface focus:ring-2 focus:ring-danger/20 outline-none"
                                                placeholder="Describa la situación..."
                                                value={formData[item.detailKey as keyof typeof formData] as string}
                                                onChange={e => setFormData({ ...formData, [item.detailKey]: e.target.value })}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* VIII. RECREACIÓN */}
                    <div className={`bg-surface rounded-[8px] border border-border overflow-hidden mt-6 shadow-sm ${activeTab === 'SALUD' ? '' : 'hidden'}`}>
                        <div className="bg-surface-muted border-b border-border px-4 py-2">
                            <h2 className="text-sm font-black text-fg uppercase">
                                VIII. RECREACIÓN E INTERESES DEL NNA
                            </h2>
                        </div>
                        <div className="p-4 grid grid-cols-12 gap-6 text-xs">

                            {/* --- 1. TIEMPO Y ACTIVIDADES --- */}
                            <div className="col-span-12 md:col-span-6 space-y-4">
                                <div className="p-4 bg-primary-soft/10 rounded-[8px] border border-primary/20">
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-[10px] font-bold text-primary uppercase">¿Cuenta con tiempo para jugar?</label>
                                        <div className="flex bg-surface rounded border border-border p-0.5 shadow-sm">
                                            <div onClick={() => setFormData({ ...formData, tiempoParaJugar: true })} className={`px-3 py-1 rounded cursor-pointer font-bold transition-colors ${formData.tiempoParaJugar ? 'bg-primary text-white' : 'text-fg-muted hover:text-primary'}`}>SI</div>
                                            <div onClick={() => setFormData({ ...formData, tiempoParaJugar: false })} className={`px-3 py-1 rounded cursor-pointer font-bold transition-colors ${!formData.tiempoParaJugar ? 'bg-fg-muted text-white' : 'text-fg-muted hover:text-fg'}`}>NO</div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[9px] font-bold text-fg-muted uppercase mb-1">Veces por semana</label>
                                            <input type="text" className="w-full text-xs p-2 border border-primary/10 rounded-[6px] bg-surface" placeholder="Ej: 3 veces" value={formData.vecesJuegaSemana} onChange={e => setFormData({ ...formData, vecesJuegaSemana: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-bold text-fg-muted uppercase mb-1">¿Dónde juega?</label>
                                            <input type="text" className="w-full text-xs p-2 border border-primary/10 rounded-[6px] bg-surface" placeholder="Ej: Parque, Casa..." value={formData.lugarJuego} onChange={e => setFormData({ ...formData, lugarJuego: e.target.value })} />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-surface-muted/30 rounded-[8px] border border-border">
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col border-r border-primary/20 pr-4 w-1/3">
                                            <span className="text-[14px] font-black text-primary">NNA</span>
                                            <span className="text-[8px] font-bold text-fg-muted uppercase">Familia</span>
                                        </div>
                                        <div className="flex items-center gap-4 bg-primary-soft/10 p-2 rounded-lg border border-primary/20">
                                            <span className="text-[9px] font-bold text-primary uppercase leading-tight w-2/3">Actividades Recreativas con Familia</span>
                                            <div className="flex gap-2">
                                                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={formData.recreacionActividadFamilia === 'SI'} onChange={() => setFormData({ ...formData, recreacionActividadFamilia: 'SI' })} className="text-primary" /> <span className="font-bold text-[9px]">SI</span></label>
                                                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={formData.recreacionActividadFamilia === 'NO'} onChange={() => setFormData({ ...formData, recreacionActividadFamilia: 'NO' })} className="text-primary" /> <span className="font-bold text-[9px]">NO</span></label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* --- 2. INTERESES --- */}
                            <div className="col-span-12 md:col-span-6 space-y-4">
                                <div className="bg-primary-soft/10 rounded-[8px] border border-primary/20 p-4">
                                    <h3 className="text-primary font-bold uppercase text-[10px] mb-3 border-b border-primary/20 pb-1 flex items-center gap-2">
                                        <span className="text-lg">🎨</span> Intereses y Talentos
                                    </h3>

                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-[9px] font-bold text-fg-muted uppercase mb-1">Intereses Deportivos</label>
                                            <input
                                                type="text"
                                                className="w-full text-xs p-2 border border-primary/20 rounded-[6px] focus:ring-primary/40 bg-surface"
                                                placeholder="Ej: Fútbol, Voley..."
                                                value={formData.recreacionInteresDeporte}
                                                onChange={(e) => setFormData({ ...formData, recreacionInteresDeporte: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-bold text-fg-muted uppercase mb-1">Intereses Artísticos</label>
                                            <input
                                                type="text"
                                                className="w-full text-xs p-2 border border-primary/20 rounded-[6px] focus:ring-primary/40 bg-surface"
                                                placeholder="Ej: Dibujo, Baile, Música..."
                                                value={formData.recreacionInteresArte}
                                                onChange={(e) => setFormData({ ...formData, recreacionInteresArte: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-info-soft/20 rounded-[8px] border border-info/20 p-4">
                                    <h3 className="text-info font-bold uppercase text-[10px] mb-3 border-b border-info/20 pb-1 flex items-center gap-2">
                                        <span className="text-lg">🏫</span> Participación Institucional
                                    </h3>

                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-[9px] font-bold text-info uppercase">¿Participa en alguna institución?</label>
                                        <div className="flex bg-surface rounded border border-border p-0.5 shadow-sm">
                                            <div onClick={() => setFormData({ ...formData, recreacionParticipaInstitucion: 'SI' })} className={`px-2 py-0.5 rounded cursor-pointer font-bold transition-colors ${formData.recreacionParticipaInstitucion === 'SI' ? 'bg-info text-white' : 'text-fg-muted hover:text-info'}`}>SI</div>
                                            <div onClick={() => setFormData({ ...formData, recreacionParticipaInstitucion: 'NO' })} className={`px-2 py-0.5 rounded cursor-pointer font-bold transition-colors ${formData.recreacionParticipaInstitucion === 'NO' ? 'bg-fg-muted text-white' : 'text-fg-muted hover:text-fg'}`}>NO</div>
                                        </div>
                                    </div>

                                    {formData.recreacionParticipaInstitucion === 'SI' && (
                                        <div className="space-y-2 animate-in fade-in">
                                            <div className="grid grid-cols-2 gap-2">
                                                {['IGLESIA', 'CLUB CULTURAL', 'CLUB DEPORTIVO', 'OTROS'].map(opt => (
                                                    <div
                                                        key={opt}
                                                        onClick={() => setFormData({ ...formData, recreacionTipoInstitucion: opt })}
                                                        className={`text-center py-1.5 rounded cursor-pointer text-[8px] font-bold border transition-all ${formData.recreacionTipoInstitucion === opt ? 'bg-info-soft border-info/30 text-info shadow-sm' : 'bg-surface border-info/10 text-fg-muted hover:bg-info-soft/20'}`}
                                                    >
                                                        {opt}
                                                    </div>
                                                ))}
                                            </div>
                                            <input
                                                type="text"
                                                className="w-full text-xs p-2 border border-info/20 rounded-[6px] bg-surface"
                                                placeholder="Nombre de la institución..."
                                                value={formData.recreacionInstitucionDetalle}
                                                onChange={(e) => setFormData({ ...formData, recreacionInstitucionDetalle: e.target.value })}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>


                    {/* IX. NECESIDADES Y PLAN DE ACCIÓN */}
                    <div className={activeTab === 'NECESIDADES' ? '' : 'hidden'}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-black text-fg-muted uppercase tracking-widest border-b border-border pb-2">
                                IX. Necesidades del NNA y Plan de Acción
                            </h3>
                            <button
                                onClick={handleAddNeed}
                                className="flex items-center gap-2 bg-primary text-primary-fg px-4 py-2 rounded-[6px] hover:bg-primary/90 transition-colors text-sm font-bold"
                            >
                                <Plus size={16} /> Agregar Necesidad
                            </button>
                        </div>

                        {formData.necesidades.length > 0 ? (
                            <div className="border border-border rounded-[6px] overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-surface-muted text-xs">
                                        <tr>
                                            <th className="px-3 py-2 text-left" style={{ width: '5%' }}>N°</th>
                                            <th className="px-3 py-2 text-left" style={{ width: '15%' }}>Categoría</th>
                                            <th className="px-3 py-2 text-left" style={{ width: '20%' }}>Descripción</th>
                                            <th className="px-3 py-2 text-left" style={{ width: '17%' }}>Fase I</th>
                                            <th className="px-3 py-2 text-left" style={{ width: '17%' }}>Fase II</th>
                                            <th className="px-3 py-2 text-left" style={{ width: '17%' }}>Fase III</th>
                                            <th className="px-3 py-2 text-center" style={{ width: '9%' }}>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {formData.necesidades.map((necesidad, idx) => (
                                            <tr key={idx} className="border-t border-border">
                                                <td className="px-3 py-2 font-bold text-fg-muted text-center">{idx + 1}</td>
                                                <td className="px-3 py-2">
                                                    <span className="inline-block px-2 py-1 bg-primary-soft text-primary text-xs font-bold rounded">
                                                        {necesidad.categoria}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-xs">{necesidad.descripcion}</td>
                                                <td className="px-3 py-2 text-xs text-fg-muted">{necesidad.faseI || '-'}</td>
                                                <td className="px-3 py-2 text-xs text-fg-muted">{necesidad.faseII || '-'}</td>
                                                <td className="px-3 py-2 text-xs text-fg-muted">{necesidad.faseIII || '-'}</td>
                                                <td className="px-3 py-2">
                                                    <div className="flex gap-2 justify-center">
                                                        <button
                                                            onClick={() => handleEditNeed(idx)}
                                                            className="p-1 text-primary hover:bg-primary-soft rounded transition-colors"
                                                            title="Editar"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteNeed(idx)}
                                                            className="p-1 text-danger hover:bg-danger-soft rounded transition-colors"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="border-2 border-dashed border-border rounded-[6px] p-8 text-center">
                                <p className="text-fg-muted text-sm mb-3">No hay necesidades registradas</p>
                                <p className="text-xs text-fg-muted mb-4">Agrega las necesidades identificadas del NNA y el plan de acción por fases</p>
                                <button
                                    onClick={handleAddNeed}
                                    className="text-primary text-sm font-bold hover:text-primary/80"
                                >
                                    + Agregar la primera necesidad
                                </button>
                            </div>
                        )}
                    </div>

                </div>

            </div>

            {/* MODAL PARA AGREGAR/EDITAR FAMILIAR */}
            {
                showFamilyModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                        <div className="bg-surface rounded-[12px] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            {/* Header del Modal */}
                            <div className="flex items-center justify-between p-6 border-b border-border">
                                <h3 className="text-xl font-bold text-fg">
                                    {editingFamilyIndex !== null ? 'Editar Familiar' : 'Agregar Familiar'}
                                </h3>
                                <button
                                    onClick={() => setShowFamilyModal(false)}
                                    className="text-fg-muted hover:text-fg transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Contenido del Modal */}
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-fg-2 mb-2">
                                            Primer Apellido <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2 border border-border rounded-[6px] focus:ring-2 focus:ring-success/40 focus:border-success"
                                            value={currentFamily.primerApellido}
                                            onChange={(e) => setCurrentFamily({ ...currentFamily, primerApellido: e.target.value.toUpperCase() })}
                                            placeholder="GARCÍA"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-fg-2 mb-2">
                                            Segundo Apellido
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2 border border-border rounded-[6px] focus:ring-2 focus:ring-success/40 focus:border-success"
                                            value={currentFamily.segundoApellido}
                                            onChange={(e) => setCurrentFamily({ ...currentFamily, segundoApellido: e.target.value.toUpperCase() })}
                                            placeholder="PÉREZ"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-fg-2 mb-2">
                                            Nombres <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2 border border-border rounded-[6px] focus:ring-2 focus:ring-success/40 focus:border-success"
                                            value={currentFamily.nombres}
                                            onChange={(e) => setCurrentFamily({ ...currentFamily, nombres: e.target.value.toUpperCase() })}
                                            placeholder="MARÍA"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-fg-2 mb-2">
                                            Parentesco <span className="text-danger">*</span>
                                        </label>
                                        <select
                                            className="w-full px-4 py-2 border border-border rounded-[6px] focus:ring-2 focus:ring-success/40 focus:border-success"
                                            value={currentFamily.parentesco}
                                            onChange={(e) => setCurrentFamily({ ...currentFamily, parentesco: e.target.value })}
                                        >
                                            <option value="">Seleccionar...</option>
                                            <option value="MADRE">Madre</option>
                                            <option value="PADRE">Padre</option>
                                            <option value="HERMANO/A">Hermano/a</option>
                                            <option value="ABUELO/A">Abuelo/a</option>
                                            <option value="TIO/A">Tío/a</option>
                                            <option value="PRIMO/A">Primo/a</option>
                                            <option value="OTRO">Otro</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-fg-2 mb-2">
                                            Edad <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            className="w-full px-4 py-2 border border-border rounded-[6px] focus:ring-2 focus:ring-success/40 focus:border-success"
                                            value={currentFamily.edad}
                                            onChange={(e) => setCurrentFamily({ ...currentFamily, edad: e.target.value })}
                                            placeholder="Ej: 35"
                                            min="0"
                                            max="120"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-fg-2 mb-2">
                                            Sexo <span className="text-danger">*</span>
                                        </label>
                                        <select
                                            className="w-full px-4 py-2 border border-border rounded-[6px] focus:ring-2 focus:ring-success/40 focus:border-success"
                                            value={currentFamily.sexo}
                                            onChange={(e) => setCurrentFamily({ ...currentFamily, sexo: e.target.value })}
                                        >
                                            <option value="">Seleccionar...</option>
                                            <option value="MASCULINO">Masculino</option>
                                            <option value="FEMENINO">Femenino</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-fg-2 mb-2">
                                            Estado Civil
                                        </label>
                                        <select
                                            className="w-full px-4 py-2 border border-border rounded-[6px] focus:ring-2 focus:ring-success/40 focus:border-success"
                                            value={currentFamily.estadoCivil}
                                            onChange={(e) => setCurrentFamily({ ...currentFamily, estadoCivil: e.target.value })}
                                        >
                                            <option value="">Seleccionar...</option>
                                            <option value="SOLTERO(A)">Soltero(a)</option>
                                            <option value="CASADO(A)">Casado(a)</option>
                                            <option value="CONVIVIENTE">Conviviente</option>
                                            <option value="SEPARADO(A)">Separado(a)</option>
                                            <option value="DIVORCIADO(A)">Divorciado(a)</option>
                                            <option value="VIUDO(A)">Viudo(a)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-fg-2 mb-2">
                                            Grado Instrucción
                                        </label>
                                        <select
                                            className="w-full px-4 py-2 border border-border rounded-[6px] focus:ring-2 focus:ring-success/40 focus:border-success"
                                            value={currentFamily.gradoInstruccion}
                                            onChange={(e) => setCurrentFamily({ ...currentFamily, gradoInstruccion: e.target.value })}
                                        >
                                            <option value="">Seleccionar...</option>
                                            <option value="SIN INSTRUCCIÓN">Sin Instrucción</option>
                                            <option value="INICIAL">Inicial</option>
                                            <option value="PRIMARIA">Primaria</option>
                                            <option value="SECUNDARIA">Secundaria</option>
                                            <option value="TÉCNICA">Técnica</option>
                                            <option value="SUPERIOR">Superior</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-fg-2 mb-2">
                                        Ocupación
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 border border-border rounded-[6px] focus:ring-2 focus:ring-success/40 focus:border-success"
                                        value={currentFamily.ocupacion}
                                        onChange={(e) => setCurrentFamily({ ...currentFamily, ocupacion: e.target.value })}
                                        placeholder="Ej: Comerciante, Ama de casa, Estudiante..."
                                    />
                                </div>
                            </div>

                            {/* Footer del Modal */}
                            <div className="flex gap-3 justify-end p-6 border-t border-border bg-surface-muted">
                                <button
                                    onClick={() => setShowFamilyModal(false)}
                                    className="px-6 py-2 border border-border rounded-[6px] text-fg-2 font-bold hover:bg-surface-muted transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveFamily}
                                    disabled={!currentFamily.primerApellido || !currentFamily.nombres || !currentFamily.parentesco || !currentFamily.edad || !currentFamily.sexo}
                                    className="px-6 py-2 bg-success text-white rounded-[6px] font-bold hover:bg-success/90 disabled:bg-surface-muted disabled:cursor-not-allowed transition-colors"
                                >
                                    {editingFamilyIndex !== null ? 'Actualizar' : 'Agregar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* MODAL PARA AGREGAR/EDITAR NECESIDAD */}
            {
                showNeedModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                        <div className="bg-surface rounded-[12px] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                            {/* Header del Modal */}
                            <div className="flex items-center justify-between p-6 border-b border-border">
                                <h3 className="text-xl font-bold text-fg">
                                    {editingNeedIndex !== null ? 'Editar Necesidad' : 'Agregar Necesidad'}
                                </h3>
                                <button
                                    onClick={() => setShowNeedModal(false)}
                                    className="text-fg-muted hover:text-fg transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Contenido del Modal */}
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-fg-2 mb-2">
                                            Categoría <span className="text-danger">*</span>
                                        </label>
                                        <select
                                            className="w-full px-4 py-2 border border-border rounded-[6px] focus:ring-2 focus:ring-primary/40 focus:border-primary"
                                            value={currentNeed.categoria}
                                            onChange={(e) => setCurrentNeed({ ...currentNeed, categoria: e.target.value })}
                                        >
                                            <option value="">Seleccionar...</option>
                                            <option value="SALUD">Salud</option>
                                            <option value="IDENTIFICACIÓN">Identificación</option>
                                            <option value="ALIMENTACIÓN">Alimentación</option>
                                            <option value="VIVIENDA">Vivienda</option>
                                            <option value="EDUCACIÓN">Educación</option>
                                            <option value="LEGAL">Legal</option>
                                            <option value="PAUTAS DE CRIANZA">Pautas de Crianza</option>
                                            <option value="VIOLENCIA">Violencia</option>
                                            <option value="RECREATIVAS">Recreativas</option>
                                            <option value="OTRA">Otra</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-fg-2 mb-2">
                                            Descripción <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2 border border-border rounded-[6px] focus:ring-2 focus:ring-primary/40 focus:border-primary"
                                            value={currentNeed.descripcion}
                                            onChange={(e) => setCurrentNeed({ ...currentNeed, descripcion: e.target.value })}
                                            placeholder="Describa brevemente la necesidad..."
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-fg-2 mb-2">
                                            Fase I - Contacto
                                        </label>
                                        <textarea
                                            className="w-full px-4 py-2 border border-border rounded-[6px] focus:ring-2 focus:ring-primary/40 focus:border-primary"
                                            rows={4}
                                            value={currentNeed.faseI}
                                            onChange={(e) => setCurrentNeed({ ...currentNeed, faseI: e.target.value })}
                                            placeholder="Acciones a desarrollar en Fase I..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-fg-2 mb-2">
                                            Fase II - Desarrollo
                                        </label>
                                        <textarea
                                            className="w-full px-4 py-2 border border-border rounded-[6px] focus:ring-2 focus:ring-primary/40 focus:border-primary"
                                            rows={4}
                                            value={currentNeed.faseII}
                                            onChange={(e) => setCurrentNeed({ ...currentNeed, faseII: e.target.value })}
                                            placeholder="Acciones a desarrollar en Fase II..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-fg-2 mb-2">
                                            Fase III - Reinserción
                                        </label>
                                        <textarea
                                            className="w-full px-4 py-2 border border-border rounded-[6px] focus:ring-2 focus:ring-primary/40 focus:border-primary"
                                            rows={4}
                                            value={currentNeed.faseIII}
                                            onChange={(e) => setCurrentNeed({ ...currentNeed, faseIII: e.target.value })}
                                            placeholder="Acciones a desarrollar en Fase III..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Footer del Modal */}
                            <div className="flex gap-3 justify-end p-6 border-t border-border bg-surface-muted">
                                <button
                                    onClick={() => setShowNeedModal(false)}
                                    className="px-6 py-2 border border-border rounded-[6px] text-fg-2 font-bold hover:bg-surface-muted transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveNeed}
                                    disabled={!currentNeed.categoria || !currentNeed.descripcion}
                                    className="px-6 py-2 bg-primary text-primary-fg rounded-[6px] font-bold hover:bg-primary/90 disabled:bg-surface-muted disabled:cursor-not-allowed transition-colors"
                                >
                                    {editingNeedIndex !== null ? 'Actualizar' : 'Agregar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }



            {/* ===== VISTA IMPRESIÓN (OFICIAL) - Solo visible al imprimir ===== */}
            <div className="hidden print:block max-w-[210mm] mx-auto bg-white min-h-[297mm] p-8">

                {/* ENCABEZADO OFICIAL */}
                <table style={{ width: '100%', marginBottom: '5px' }}>
                    <tbody>
                        <tr>
                            <td width="20%"><img src="/logo-min.png" alt="MIMP" style={{ height: '35px', filter: 'grayscale(100%)' }} /></td>
                            <td width="60%" style={{ textAlign: 'center' }}>
                                <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>FORMATO 4: FICHA DE DIAGNÓSTICO SOCIAL</h2>
                                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#555' }}>EDUCADORES DE CALLE - INABIF</p>
                            </td>
                            <td width="20%" style={{ border: '1px solid black', textAlign: 'center', padding: '5px' }}>
                                <div style={{ fontSize: '9px' }}>FECHA INGRESO</div>
                                <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{formatDate(caso?.fechaIngreso)}</div>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* I. DATOS GENERALES */}
                <div style={sectionTitle as any}>I. DATOS GENERALES DEL USUARIO/A</div>
                <table style={tableStyle as any}>
                    <tbody>
                        <tr>
                            <td style={tdStyle} width="20%">
                                <span style={labelStyle as any}>Apellidos</span>
                                <div style={valueStyle as any}>{nna?.apellidoPaterno} {nna?.apellidoMaterno}</div>
                            </td>
                            <td style={tdStyle} width="30%">
                                <span style={labelStyle as any}>Nombres</span>
                                <div style={valueStyle as any}>{nna?.nombres}</div>
                            </td>
                            <td style={tdStyle} width="25%">
                                <span style={labelStyle as any}>Fecha Nacimiento</span>
                                <div style={valueStyle as any}>{formatDate(nna?.fechaNacimiento)}</div>
                            </td>
                            <td style={tdStyle} width="25%">
                                <span style={labelStyle as any}>DNI</span>
                                <div style={valueStyle as any}>{nna?.numeroDoc || 'NO REGISTRA'}</div>
                            </td>
                        </tr>
                        <tr>
                            <td style={tdStyle}>
                                <span style={labelStyle as any}>Sexo</span>
                                M [{nna?.sexo === 'M' ? 'X' : ' '}]  F [{nna?.sexo === 'F' ? 'X' : ' '}]
                            </td>
                            <td style={tdStyle}>
                                <span style={labelStyle as any}>Lugar Nacimiento</span>
                                {nna?.departamentoNac} - {nna?.provinciaNac}
                            </td>
                            <td style={tdStyle} colSpan={2}>
                                <span style={labelStyle as any}>Seguro de Salud</span>
                                {nna?.afiliadoSIS === 'SI' ? 'SIS' : (nna?.afiliadoOtroSeguro === 'SI' ? nna?.detalleOtroSeguro : 'NINGUNO')}
                            </td>
                        </tr>
                        <tr>
                            <td style={tdStyle} colSpan={4}>
                                <span style={labelStyle as any}>Dirección Actual</span>
                                {nna?.domicilioActual}
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* II. SITUACIÓN DE CALLE */}
                <div style={sectionTitle as any}>II. SITUACIÓN DE CALLE</div>
                <table style={tableStyle as any}>
                    <tbody>
                        <tr>
                            <td style={{ ...tdStyle, backgroundColor: '#f9fafb', fontWeight: 'bold' }} width="25%">Perfil:</td>
                            <td style={tdStyle}><span style={labelStyle as any}>Trabajo Infantil</span> {caso?.perfil === 'TRABAJO_EN_CALLE' ? 'X' : ''}</td>
                            <td style={tdStyle}><span style={labelStyle as any}>Mendicidad</span> {caso?.perfil === 'MENDICIDAD' ? 'X' : ''}</td>
                            <td style={tdStyle}><span style={labelStyle as any}>Vida en Calle</span> {caso?.perfil === 'VIDA_EN_CALLE' ? 'X' : ''}</td>
                        </tr>
                        <tr>
                            <td style={tdStyle}>
                                <span style={labelStyle as any}>Tiempo en Calle</span>
                                <b>{formData.tiempoEnCalle || caso?.tiempoEnCalle}</b>
                            </td>
                            <td style={tdStyle} colSpan={3}>
                                <span style={labelStyle as any}>Punto de Concentración</span>
                                <b>{formData.puntoConcentracion || caso?.zonaIntervencion}</b>
                            </td>
                        </tr>
                        <tr>
                            <td style={tdStyle} colSpan={4}>
                                <span style={labelStyle as any}>Actividad Económica</span>
                                <b>{formData.actividadEconomica || caso?.actividadRealizada}</b>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* III. DATOS DEL TUTOR */}
                <div style={sectionTitle as any}>III. DATOS DEL TUTOR / APODERADO / FAMILIAR</div>
                <table style={tableStyle as any}>
                    <tbody>
                        <tr>
                            <td style={tdStyle} width="40%">
                                <span style={labelStyle as any}>Nombres y Apellidos</span>
                                <div style={{ fontWeight: 'bold' }}>{nna?.nombreTutor || '---'}</div>
                            </td>
                            <td style={tdStyle} width="20%">
                                <span style={labelStyle as any}>DNI</span>
                                <b>{formData.tutorDNI || '---'}</b>
                            </td>
                            <td style={tdStyle} width="20%">
                                <span style={labelStyle as any}>Parentesco</span>
                                {nna?.viveCon?.replace(/_/g, ' ') || '---'}
                            </td>
                            <td style={tdStyle} width="20%">
                                <span style={labelStyle as any}>Grado Instrucción</span>
                                <b>{formData.tutorGradoInstruccion || '---'}</b>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* IV. DATOS DE LA FAMILIA */}
                <div style={sectionTitle as any}>IV. DATOS DE LA FAMILIA</div>
                <table style={tableStyle as any}>
                    <thead>
                        <tr>
                            <th style={thStyle} width="5%">N°</th>
                            <th style={thStyle} width="35%">Apellidos y Nombres</th>
                            <th style={thStyle} width="15%">Parentesco</th>
                            <th style={thStyle} width="10%">Edad</th>
                            <th style={thStyle} width="10%">Sexo</th>
                            <th style={thStyle} width="15%">G. Instrucción</th>
                            <th style={thStyle} width="10%">Ocupación</th>
                        </tr>
                    </thead>
                    <tbody>
                        {formData.familiares.length > 0 ? (
                            formData.familiares.map((familiar, i) => (
                                <tr key={i}>
                                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold' }}>{i + 1}</td>
                                    <td style={tdStyle}>{`${familiar.primerApellido} ${familiar.segundoApellido} ${familiar.nombres}`.trim() || '-'}</td>
                                    <td style={tdStyle}>{familiar.parentesco || '-'}</td>
                                    <td style={{ ...tdStyle, textAlign: 'center' }}>{familiar.edad || '-'}</td>
                                    <td style={tdStyle}>{familiar.sexo || '-'}</td>
                                    <td style={{ ...tdStyle, fontSize: '9px' }}>{familiar.gradoInstruccion || '-'}</td>
                                    <td style={{ ...tdStyle, fontSize: '9px' }}>{familiar.ocupacion || '-'}</td>
                                </tr>
                            ))
                        ) : (
                            // Si no hay familiares, mostrar al menos 3 filas vacías
                            [1, 2, 3].map((i) => (
                                <tr key={i}>
                                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold' }}>{i}</td>
                                    <td style={tdStyle}>&nbsp;</td>
                                    <td style={tdStyle}>&nbsp;</td>
                                    <td style={tdStyle}>&nbsp;</td>
                                    <td style={tdStyle}>&nbsp;</td>
                                    <td style={tdStyle}>&nbsp;</td>
                                    <td style={tdStyle}>&nbsp;</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* V. DATOS DE LA VIVIENDA */}
                <div style={sectionTitle as any}>V. DATOS DE LA VIVIENDA</div>
                <table style={tableStyle as any}>
                    <tbody>
                        <tr>
                            <td style={{ ...tdStyle, backgroundColor: '#f9fafb' }} width="25%"><b>Material Vivienda:</b></td>
                            <td style={tdStyle}>Concreto [{formData.materialVivienda === 'CONCRETO' ? 'X' : ' '}]</td>
                            <td style={tdStyle}>Precario [{formData.materialVivienda === 'PRECARIO' ? 'X' : ' '}]</td>
                            <td style={tdStyle}>Otro [{formData.materialVivienda === 'OTRO' ? 'X' : ' '}]</td>
                        </tr>
                        <tr>
                            <td style={{ ...tdStyle, backgroundColor: '#f9fafb' }}><b>N° Ambientes:</b></td>
                            <td style={tdStyle}>1 [{formData.numeroAmbientes === '1' ? 'X' : ' '}]</td>
                            <td style={tdStyle}>2 [{formData.numeroAmbientes === '2' ? 'X' : ' '}]</td>
                            <td style={tdStyle}>3+ [{formData.numeroAmbientes === '3+' ? 'X' : ' '}]</td>
                        </tr>
                        <tr>
                            <td style={{ ...tdStyle, backgroundColor: '#f9fafb' }}><b>Propiedad:</b></td>
                            <td style={tdStyle}>Propia [{formData.propiedadVivienda === 'PROPIA' ? 'X' : ' '}]</td>
                            <td style={tdStyle}>Alquilada [{formData.propiedadVivienda === 'ALQUILADA' ? 'X' : ' '}]</td>
                            <td style={tdStyle}>Alojado [{formData.propiedadVivienda === 'ALOJADO' ? 'X' : ' '}]</td>
                        </tr>
                        <tr>
                            <td style={{ ...tdStyle, backgroundColor: '#f9fafb' }}><b>Servicios Básicos:</b></td>
                            <td style={tdStyle}>Agua [{formData.serviciosBasicos.agua ? 'X' : ' '}]</td>
                            <td style={tdStyle}>Luz [{formData.serviciosBasicos.luz ? 'X' : ' '}]</td>
                            <td style={tdStyle}>Desagüe [{formData.serviciosBasicos.desague ? 'X' : ' '}]</td>
                        </tr>
                        <tr>
                            <td style={{ ...tdStyle, backgroundColor: '#f9fafb' }}><b>Estuvo en CAR/Albergue:</b></td>
                            <td style={tdStyle}>SI [{nna?.tieneAntecedenteAlbergue ? 'X' : ' '}]</td>
                            <td style={tdStyle}>NO [{!nna?.tieneAntecedenteAlbergue ? 'X' : ' '}]</td>
                            <td style={tdStyle}>
                                <span style={{ fontSize: '8px' }}>Motivo: {nna?.detalleAntecedenteAlbergue || '---'}</span>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* VI. EDUCACIÓN */}
                <div style={sectionTitle as any}>VI. EDUCACIÓN - NNA</div>
                <table style={tableStyle as any}>
                    <tbody>
                        <tr>
                            <td style={tdStyle} width="25%">
                                <span style={labelStyle as any}>¿Estudia Actualmente?</span>
                                <b>{nna?.estudiaActualmente ? 'SÍ' : 'NO'}</b>
                            </td>
                            <td style={tdStyle} width="25%">
                                <span style={labelStyle as any}>Nivel / Grado</span>
                                {nna?.nivelEducativo} - {nna?.gradoEstudio}
                            </td>
                            <td style={tdStyle} width="50%">
                                <span style={labelStyle as any}>Institución Educativa</span>
                                {nna?.institucionEducativa || '---'}
                            </td>
                        </tr>
                        <tr>
                            <td style={tdStyle} colSpan={2}>
                                <span style={labelStyle as any}>Presenta Atraso Escolar</span>
                                SI [{formData.presentaAtraso ? 'X' : ' '}] NO [{!formData.presentaAtraso ? 'X' : ' '}]
                                <b> Cuánto: {formData.tiempoAtraso || '---'}</b>
                            </td>
                            <td style={tdStyle}>
                                <span style={labelStyle as any}>Motivo Atraso</span>
                                {formData.motivoAtraso || '---'}
                            </td>
                        </tr>
                        <tr>
                            <td style={tdStyle}>
                                <span style={labelStyle as any}>Problemas Aprendizaje</span>
                                SI [{formData.problemasAprendizaje ? 'X' : ' '}] NO [{!formData.problemasAprendizaje ? 'X' : ' '}]
                            </td>
                            <td style={tdStyle}>
                                <span style={labelStyle as any}>Problemas Conducta</span>
                                SI [{formData.problemasConducta ? 'X' : ' '}] NO [{!formData.problemasConducta ? 'X' : ' '}]
                            </td>
                            <td style={tdStyle}>
                                <span style={labelStyle as any}>Ha sido expulsado</span>
                                SI [{formData.expulsado ? 'X' : ' '}] NO [{!formData.expulsado ? 'X' : ' '}] N° veces: {formData.vecesExpulsado || '---'}
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* VII. SALUD */}
                <div style={sectionTitle as any}>VII. SALUD – ALIMENTACIÓN – HIGIENE</div>
                <table style={tableStyle as any}>
                    <tbody>
                        <tr>
                            <td style={{ ...tdStyle, backgroundColor: '#f9fafb' }} width="30%"><b>Enfermedad Crónica:</b></td>
                            <td style={tdStyle}>SI [{formData.enfermedadCronica ? 'X' : ' '}] NO [{!formData.enfermedadCronica ? 'X' : ' '}]</td>
                            <td style={tdStyle}>{formData.detalleEnfermedadCronica || '---'}</td>
                        </tr>
                        <tr>
                            <td style={{ ...tdStyle, backgroundColor: '#f9fafb' }}><b>Discapacidad:</b></td>
                            <td style={tdStyle}>SI [{nna?.tieneDiscapacidad ? 'X' : ' '}] NO [{!nna?.tieneDiscapacidad ? 'X' : ' '}]</td>
                            <td style={tdStyle}>{nna?.tipoDiscapacidad || '---'}</td>
                        </tr>
                        <tr>
                            <td style={{ ...tdStyle, backgroundColor: '#f9fafb' }}><b>Problemas Psicológicos:</b></td>
                            <td style={tdStyle}>SI [{formData.problemaPsicologico ? 'X' : ' '}] NO [{!formData.problemaPsicologico ? 'X' : ' '}]</td>
                            <td style={tdStyle}>{formData.detalleProblemaPsicologico || '---'}</td>
                        </tr>
                        <tr>
                            <td style={{ ...tdStyle, backgroundColor: '#f9fafb' }}><b>Consume Sustancias:</b></td>
                            <td style={tdStyle}>SI [{formData.consumeSustancias ? 'X' : ' '}] NO [{!formData.consumeSustancias ? 'X' : ' '}]</td>
                            <td style={tdStyle}>{formData.tipoSustancias || '---'}</td>
                        </tr>
                        <tr>
                            <td style={{ ...tdStyle, backgroundColor: '#f9fafb' }}><b>Recibe 3 Alimentos al Día:</b></td>
                            <td style={tdStyle}>SI [{formData.recibeTresAlimentos ? 'X' : ' '}] NO [{!formData.recibeTresAlimentos ? 'X' : ' '}]</td>
                            <td style={tdStyle}></td>
                        </tr>
                        <tr>
                            <td style={{ ...tdStyle, backgroundColor: '#f9fafb' }}><b>Higiene Personal Adecuada:</b></td>
                            <td style={tdStyle}>SI [{formData.higieneAdecuada ? 'X' : ' '}] NO [{!formData.higieneAdecuada ? 'X' : ' '}]</td>
                            <td style={tdStyle}><span style={{ fontSize: '8px' }}>Cabello/uñas limpias y recortadas</span></td>
                        </tr>
                    </tbody>
                </table>

                {/* VIII. RECREACIÓN */}
                <div style={sectionTitle as any}>VIII. RECREACIÓN E INTERESES DEL NNA</div>
                <table style={tableStyle as any}>
                    <tbody>
                        <tr>
                            <td style={{ ...tdStyle, backgroundColor: '#f9fafb' }} width="30%"><b>Cuenta con Tiempo para Jugar:</b></td>
                            <td style={tdStyle} width="20%">SI [{formData.tiempoParaJugar ? 'X' : ' '}] NO [{!formData.tiempoParaJugar ? 'X' : ' '}]</td>
                            <td style={tdStyle} width="25%">
                                <span style={labelStyle as any}>Veces/Semana</span>
                                <b>{formData.vecesJuegaSemana || '---'}</b>
                            </td>
                            <td style={tdStyle} width="25%">
                                <span style={labelStyle as any}>Lugar</span>
                                <b>{formData.lugarJuego || '---'}</b>
                            </td>
                        </tr>
                        <tr>
                            <td style={{ ...tdStyle, backgroundColor: '#f9fafb' }}><b>Participa en Institución:</b></td>
                            <td style={tdStyle}>SI [{formData.participaInstitucion ? 'X' : ' '}] NO [{!formData.participaInstitucion ? 'X' : ' '}]</td>
                            <td style={tdStyle} colSpan={2}>
                                <span style={labelStyle as any}>Tipo</span>
                                {formData.tipoInstitucion || '---'}
                            </td>
                        </tr>
                        <tr>
                            <td style={tdStyle}><span style={labelStyle as any}>Intereses Deportivos</span> SI [{formData.interesesDeportivos ? 'X' : ' '}] NO [{!formData.interesesDeportivos ? 'X' : ' '}]</td>
                            <td style={tdStyle}><span style={labelStyle as any}>Intereses Artísticos</span> SI [{formData.interesesArtisticos ? 'X' : ' '}] NO [{!formData.interesesArtisticos ? 'X' : ' '}]</td>
                            <td style={tdStyle} colSpan={2}><span style={labelStyle as any}>Actividades con Familia</span> SI [{formData.actividadesFamilia ? 'X' : ' '}] NO [{!formData.actividadesFamilia ? 'X' : ' '}]</td>
                        </tr>
                    </tbody>
                </table>

                {/* IX. NECESIDADES Y PLAN DE ACCIÓN */}
                <div style={sectionTitle as any}>IX. NECESIDADES DEL NNA Y PLAN DE ACCIÓN</div>
                <table style={tableStyle as any}>
                    <thead>
                        <tr>
                            <th style={thStyle} width="5%">N°</th>
                            <th style={thStyle} width="15%">Categoría</th>
                            <th style={thStyle} width="20%">Descripción</th>
                            <th style={thStyle} width="20%">Fase I (Contacto)</th>
                            <th style={thStyle} width="20%">Fase II (Desarrollo)</th>
                            <th style={thStyle} width="20%">Fase III (Reinserción)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {formData.necesidades.length > 0 ? (
                            formData.necesidades.map((necesidad, idx) => (
                                <tr key={idx}>
                                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold' }}>{idx + 1}</td>
                                    <td style={{ ...tdStyle, fontSize: '9px', fontWeight: 'bold' }}>{necesidad.categoria}</td>
                                    <td style={{ ...tdStyle, fontSize: '9px' }}>{necesidad.descripcion}</td>
                                    <td style={{ ...tdStyle, fontSize: '8px' }}>{necesidad.faseI || '-'}</td>
                                    <td style={{ ...tdStyle, fontSize: '8px' }}>{necesidad.faseII || '-'}</td>
                                    <td style={{ ...tdStyle, fontSize: '8px' }}>{necesidad.faseIII || '-'}</td>
                                </tr>
                            ))
                        ) : (
                            // Si no hay necesidades, mostrar al menos 3 filas vacías
                            [1, 2, 3].map((i) => (
                                <tr key={i}>
                                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold' }}>{i}</td>
                                    <td style={tdStyle}>&nbsp;</td>
                                    <td style={tdStyle}>&nbsp;</td>
                                    <td style={tdStyle}>&nbsp;</td>
                                    <td style={tdStyle}>&nbsp;</td>
                                    <td style={tdStyle}>&nbsp;</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* FIRMAS */}
                <table style={{ width: '100%', marginTop: '40px', borderCollapse: 'collapse' }}>
                    <tbody>
                        <tr>
                            <td style={{ padding: '8px 0', fontSize: '10px' }}>
                                <b>Educador/a Responsable:</b> {caso?.responsable?.nombreCompleto || '________________________________'}
                            </td>
                        </tr>
                        <tr>
                            <td style={{ padding: '4px 0', fontSize: '10px' }}>
                                <b>DNI:</b> {caso?.responsable?.dni || '________________'}
                            </td>
                        </tr>
                        <tr>
                            <td style={{ padding: '4px 0', fontSize: '10px' }}>
                                <b>Fecha:</b> {new Date().toLocaleDateString()} - <b>Zona:</b> {caso?.zonaIntervencion || '________________'}
                            </td>
                        </tr>
                        <tr>
                            <td style={{ paddingTop: '30px' }}>
                                <div style={{ borderTop: '1px solid black', width: '250px', paddingTop: '5px', textAlign: 'center', fontSize: '10px', fontWeight: 'bold' }}>
                                    FIRMA DEL EDUCADOR
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>

            </div>
        </div >
    );
};
