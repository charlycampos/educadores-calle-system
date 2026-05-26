import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useNnaStore } from '../../store/nna.store';
import { MapPin, Users, Briefcase, School, HeartPulse, Home, Plus, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { InputField, SelectField, SectionHeader, FooterButtons } from '../../components/ui/FormFields';
import { UbigeoFields } from '../../components/forms/UbigeoFields';
import { DISCAPACIDADES_CONADIS } from '../../data/ubigeo';

// TIPOS DE DATOS
interface UsoTiempoDia {
    estudiar: number;
    trabajar: number;
    dormir: number;
    jugar: number;
}

interface NnaPersonalData {
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
    sexo: string; // M, F
    fechaNacimiento: string;

    // Lugar Nacimiento
    departamentoNac: string;
    provinciaNac: string;
    distritoNac: string;

    // Identidad
    tipoDoc: string; // DNI, SIN_DOC, PARTIDA, ETC
    numeroDoc: string;
    tienePartidaNacimiento: string; // "true" | "false" (string para radio buttons facil)
    detalleSinDoc: string;

    // Edu & Salud (Individuales)
    estudiaActualmente: boolean;
    nivelEducativo: string;
    gradoEstudio: string;
    institucionEducativa: string;
    modalidadEstudio: string;
    detalleNoEstudia: string;
    // Salud (Nuevos campos Formato 3)
    afiliadoSIS: string; // "SI", "NO", "NO_SABE"
    afiliadoOtroSeguro: string;
    detalleOtroSeguro: string;
    sufreEnfermedad: string; // "SI", "NO" (Usando string para radio)
    detalleEnfermedad: string;
    observacionesSalud: string;
    tieneDiscapacidad: boolean;
    tipoDiscapacidad: string; // AlmacenarÃ¡ selecciÃ³n Ãºnica de la lista

    // Tiempo Libre y Obs (Individuales)
    actividadesTiempoLibre: string;
    caracteristicas: string;
    tieneAntecedenteAlbergue: boolean;
    detalleAntecedenteAlbergue: string;
    usoTiempo?: Record<string, UsoTiempoDia>;
}

interface NnaFormData {
    // I. DATOS GENERALES
    zonaIntervencion: string;
    // Ubigeo del Domicilio (Estos se muestran en Paso 2 visualmente, pero son globales)
    departamentoDom: string;
    provinciaDom: string;
    distritoDom: string;

    perfil: string;
    situacionCalle: string; // TRANSITO, CONVIVENCIA
    fechaAbordaje: string;
    fechaIngreso: string;
    fechaReingreso: string;
    fechaCambioPerfil: string;

    // II. DATOS PERSONALES (Lista NNA + Domicilio compartido)
    domicilioActual: string;
    referenciaDomicilio: string;
    telefonoContacto: string;

    nnas: NnaPersonalData[];

    // III. DATOS SEGÃšN PERFIL
    actividadRealizada: string;
    tiempoEnCalle: string;
    horarioInicio: string;
    horarioFin: string;
    horarioInicio2: string;
    horarioFin2: string;
    diasTrabajo: string;
    condicion: string;

    // VI. FAMILIA
    viveCon: string;
    detalleViveCon: string; // Para "Otro"
    lugarPernocte: string;
    detalleLugarPernocte: string; // Para "Otro"
    nombreTutor: string;
}

export const NnaCreatePage = () => {
    const navigate = useNavigate();
    const { id } = useParams(); // Obtener ID para ediciÃ³n
    const { createNna, updateExpediente, fetchExpediente, selectedExpediente, isLoading, error: storeError } = useNnaStore();
    const [submitting, setSubmitting] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    const [activeSection, setActiveSection] = useState('paso1_generales');

    // SECCIONES SEPARADAS LOGICAMENTE
    const sections = [
        { id: 'paso1_generales', label: 'I. Datos Generales', icon: MapPin, description: 'IntervenciÃ³n y Fechas' },
        { id: 'paso2_personales', label: 'II. Datos Personales', icon: Users, description: 'Identidad, Domicilio y Contacto' },
        { id: 'paso3_perfil', label: 'III. Datos Perfil', icon: Briefcase, description: 'Actividad en Calle' },
        { id: 'paso4_educacion', label: 'IV. EducaciÃ³n', icon: School, description: 'SituaciÃ³n Educativa' },
        { id: 'paso5_salud', label: 'V. Salud', icon: HeartPulse, description: 'Seguro y Discapacidad' },
        { id: 'paso6_familia', label: 'VI. Familia / Otros', icon: Home, description: 'Vivienda y Observaciones' },
    ];

    const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<NnaFormData>({
        defaultValues: {
            nnas: [{
                nombres: '', apellidoPaterno: '', apellidoMaterno: '', numeroDoc: '', fechaNacimiento: '',
                tipoDoc: 'DNI', sexo: '', estudiaActualmente: false, tieneDiscapacidad: false,
                tienePartidaNacimiento: "true",
                usoTiempo: {} as Record<string, UsoTiempoDia>
            }],
            situacionCalle: '',
            perfil: '',
            condicion: '',
            diasTrabajo: ''
        }
    });

    const { fields, append, remove } = useFieldArray({ control, name: "nnas" });

    // CARGAR DATOS SI ES EDICIÃ“N
    useEffect(() => {
        if (id) {
            setIsEditMode(true);
            fetchExpediente(Number(id));
        }
    }, [id, fetchExpediente]);

    // POPULAR FORMULARIO CUANDO LLEGAN DATOS
    useEffect(() => {
        if (isEditMode && selectedExpediente && selectedExpediente.length > 0) {
            const mainNna = selectedExpediente[0];
            const activeCase = mainNna.casos?.find((c: any) => c.estado !== 'CERRADO') || mainNna.casos?.[0];

            const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
            const emptyUso = (): Record<string, UsoTiempoDia> => {
                const u: any = {};
                DIAS.forEach(d => { u[d] = { estudiar: 0, trabajar: 0, dormir: 0, jugar: 0 }; });
                return u;
            };

            const parseUsoTiempo = (nna: any): Record<string, UsoTiempoDia> => {
                if (nna.datosF03) {
                    try {
                        const parsed = typeof nna.datosF03 === 'string' ? JSON.parse(nna.datosF03) : nna.datosF03;
                        if (parsed?.usoTiempo) return parsed.usoTiempo;
                    } catch {}
                }
                const saved = nna.actividadesTiempoLibre || '';
                if (saved.startsWith('JSON:')) {
                    try {
                        const parsed = JSON.parse(saved.slice(5));
                        if (parsed?.grid) return parsed.grid;
                    } catch {}
                }
                return emptyUso();
            };

            const mappedNnas = selectedExpediente.map((nna: any) => ({
                id: nna.id, // Guardamos ID para updates (si es necesario backend support)
                nombres: nna.nombres,
                apellidoPaterno: nna.apellidoPaterno,
                apellidoMaterno: nna.apellidoMaterno,
                numeroDoc: nna.numeroDoc || '',
                fechaNacimiento: nna.fechaNacimiento ? nna.fechaNacimiento.split('T')[0] : '', // Format YYYY-MM-DD
                tipoDoc: nna.tipoDoc,
                sexo: nna.sexo || '',
                tienePartidaNacimiento: nna.tienePartidaNacimiento ? "true" : "false",
                detalleSinDoc: nna.detalleSinDoc || '',

                // Ubicacion Nac
                departamentoNac: nna.departamentoNac || '',
                provinciaNac: nna.provinciaNac || '',
                distritoNac: nna.distritoNac || '',

                // Educacion
                estudiaActualmente: nna.estudiaActualmente,
                nivelEducativo: nna.nivelEducativo || '',
                gradoEstudio: nna.gradoEstudio || '',
                institucionEducativa: nna.institucionEducativa || '',
                modalidadEstudio: nna.modalidadEstudio || '',
                detalleNoEstudia: nna.detalleNoEstudia || '',

                // Salud
                afiliadoSIS: nna.afiliadoSIS || '',
                afiliadoOtroSeguro: nna.afiliadoOtroSeguro || '',
                detalleOtroSeguro: nna.detalleOtroSeguro || '',
                sufreEnfermedad: nna.sufreEnfermedad || '',
                detalleEnfermedad: nna.detalleEnfermedad || '',
                observacionesSalud: nna.observacionesSalud || '',
                tieneDiscapacidad: nna.tieneDiscapacidad,
                tipoDiscapacidad: nna.tipoDiscapacidad || '',
                detalleDiscapacidad: nna.detalleDiscapacidad || '',

                // Extra
                actividadesTiempoLibre: nna.actividadesTiempoLibre || '',
                caracteristicas: nna.caracteristicas || '',
                tieneAntecedenteAlbergue: nna.tieneAntecedenteAlbergue,
                detalleAntecedenteAlbergue: nna.detalleAntecedenteAlbergue || '',
                usoTiempo: parseUsoTiempo(nna)
            }));

            // Reset del form con todos los datos
            reset({
                // Global datos (del caso activo o primer nna)
                zonaIntervencion: activeCase?.zonaIntervencion || '',
                perfil: activeCase?.perfil || '',
                situacionCalle: activeCase?.situacionCalle || '',
                fechaAbordaje: activeCase?.fechaAbordaje ? activeCase.fechaAbordaje.split('T')[0] : '',
                fechaIngreso: activeCase?.fechaIngreso ? activeCase.fechaIngreso.split('T')[0] : '',
                fechaReingreso: activeCase?.fechaReingreso ? activeCase.fechaReingreso.split('T')[0] : '',
                fechaCambioPerfil: activeCase?.fechaCambioPerfil ? activeCase.fechaCambioPerfil.split('T')[0] : '',
                actividadRealizada: activeCase?.actividadRealizada || '',
                tiempoEnCalle: activeCase?.tiempoEnCalle || '',
                condicion: activeCase?.condicion || '',
                horarioInicio: activeCase?.horarioInicio || '',
                horarioFin: activeCase?.horarioFin || '',
                horarioInicio2: activeCase?.horarioInicio2 || '',
                horarioFin2: activeCase?.horarioFin2 || '',
                diasTrabajo: activeCase?.diasTrabajo || '',

                // Familia / Domicilio (compartido, tomamos del main)
                domicilioActual: mainNna.domicilioActual || '',
                referenciaDomicilio: mainNna.referenciaDomicilio || '',
                departamentoDom: mainNna.departamentoDom || '',
                provinciaDom: mainNna.provinciaDom || '',
                distritoDom: mainNna.distritoDom || '',
                telefonoContacto: mainNna.telefonoContacto || '',
                viveCon: mainNna.viveCon || '',
                detalleViveCon: mainNna.detalleViveCon || '',
                lugarPernocte: mainNna.lugarPernocte || '',
                detalleLugarPernocte: mainNna.detalleLugarPernocte || '',
                nombreTutor: mainNna.nombreTutor || '',

                // Array de personas
                nnas: mappedNnas
            });
        }
    }, [isEditMode, selectedExpediente, reset]);

    const onSubmit = async (data: NnaFormData) => {
        setSubmitting(true);
        const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        data.nnas = data.nnas.map(nna => {
            const ut = nna.usoTiempo || {};
            const sum: Record<string, number> = { estudiar: 0, trabajar: 0, dormir: 0, jugar: 0 };
            DIAS.forEach(d => {
                const dd = ut[d] || { estudiar: 0, trabajar: 0, dormir: 0, jugar: 0 };
                sum.estudiar += Number(dd.estudiar) || 0;
                sum.trabajar += Number(dd.trabajar) || 0;
                sum.dormir += Number(dd.dormir) || 0;
                sum.jugar += Number(dd.jugar) || 0;
            });
            const promSueño = Math.round((sum.dormir / 7) * 10) / 10;
            let riesgo = 'Sin Riesgo';
            if (sum.trabajar > 30 || promSueño < 6) riesgo = 'Riesgo Crítico';
            else if (sum.trabajar > 14 || promSueño < 8 || sum.trabajar > sum.estudiar) riesgo = 'Riesgo Moderado';
            else if (sum.trabajar > 0) riesgo = 'Riesgo Leve';
            const diag = `[${riesgo}] Semanal→ Est:${sum.estudiar}h Tra:${sum.trabajar}h Dor:${sum.dormir}h Jug:${sum.jugar}h | Prom.sueño:${promSueño}h/día`;
            const libreTxt = nna.actividadesTiempoLibre?.startsWith('JSON:') ? '' : (nna.actividadesTiempoLibre || '');
            nna.actividadesTiempoLibre = `JSON:${JSON.stringify({ grid: ut, diag })} | ${libreTxt}${libreTxt ? ' | ' : ''}${diag}`;
            return nna;
        });
        try {
            if (isEditMode) {
                await updateExpediente(data);
                navigate('/nna');
            } else {
                await createNna({ createNewCarpeta: true, ...data });
                navigate('/nna');
            }
        } catch (e) {
            console.error("Submission failed", e);
            alert("Error al guardar: " + e);
        } finally {
            setSubmitting(false);
        }
    };

    const handleNext = () => {
        const currentIndex = sections.findIndex(s => s.id === activeSection);
        if (currentIndex < sections.length - 1) setActiveSection(sections[currentIndex + 1].id);
    };

    const handlePrev = () => {
        const currentIndex = sections.findIndex(s => s.id === activeSection);
        if (currentIndex > 0) setActiveSection(sections[currentIndex - 1].id);
    };

    return (
        <div className="flex h-[calc(100vh-3.5rem)] lg:h-[calc(100vh-0px)] gap-0 bg-slate-50 overflow-hidden">
            {/* SIDEBAR DE SECCIONES */}
            <aside className="w-52 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-4 py-4 border-b border-gray-100 bg-blue-600">
                    <p className="text-white font-bold text-sm leading-tight">Ficha de InscripciÃ³n</p>
                    <p className="text-blue-200 text-[11px] mt-0.5">Formato F03 Â· Registro Oficial</p>
                </div>

                {/* Steps */}
                <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
                    {sections.map((section, idx) => {
                        const isActive = activeSection === section.id;
                        const isPast = sections.findIndex(s => s.id === activeSection) > idx;
                        const Icon = section.icon;
                        return (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id)}
                                type="button"
                                className={clsx(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 text-left",
                                    isActive
                                        ? "bg-blue-600 text-white shadow-sm"
                                        : isPast
                                            ? "text-gray-500 hover:bg-blue-50 hover:text-blue-700"
                                            : "text-gray-500 hover:bg-blue-50 hover:text-blue-700"
                                )}
                            >
                                {/* NÃºmero del paso */}
                                <div className={clsx(
                                    "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0",
                                    isActive
                                        ? "bg-white/20 text-white"
                                        : isPast
                                            ? "bg-blue-100 text-blue-600"
                                            : "bg-gray-100 text-gray-400"
                                )}>
                                    {idx + 1}
                                </div>
                                {/* Ãcono + TÃ­tulo */}
                                <div className="flex items-center gap-2 min-w-0">
                                    <Icon size={14} className="flex-shrink-0" />
                                    <span className="text-xs font-semibold truncate leading-tight">
                                        {section.label.replace(/^[IVX]+\.\s/, '')}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </nav>

                {/* Progress indicator */}
                <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-gray-400 font-medium">Progreso</span>
                        <span className="text-[10px] text-blue-600 font-bold">
                            {sections.findIndex(s => s.id === activeSection) + 1}/{sections.length}
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1">
                        <div
                            className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                            style={{ width: `${((sections.findIndex(s => s.id === activeSection) + 1) / sections.length) * 100}%` }}
                        />
                    </div>
                </div>
            </aside>

            {/* MAIN FORM */}
            <main className="flex-1 bg-white flex flex-col overflow-hidden relative">
                <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
                    <div className="flex-1 overflow-y-auto p-8">
                        {storeError && (
                            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                {storeError}
                            </div>
                        )}

                        {/* ========================================================================================= */}
                        {/* PASO 1: I. DATOS GENERALES */}
                        {/* ========================================================================================= */}
                        {activeSection === 'paso1_generales' && (
                            <div className="space-y-6 animate-fadeIn">
                                <SectionHeader title="I. Datos Generales" subtitle="UbicaciÃ³n de la intervenciÃ³n y marco temporal." />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <InputField
                                            label="Zona de IntervenciÃ³n (Lugar especÃ­fico)"
                                            register={register('zonaIntervencion', { required: 'La zona es obligatoria' })}
                                            placeholder="Ej: Plaza de Armas, Jr. Comercio..."
                                            error={errors.zonaIntervencion}
                                        />
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 pt-6 mt-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-3">Perfil del NNA (SituaciÃ³n Identificada)</label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {['TRABAJO_EN_CALLE', 'MENDICIDAD', 'VIDA_EN_CALLE', 'EXPLOTACION_SEXUAL'].map((perf) => (
                                            <label key={perf} className={clsx(
                                                "cursor-pointer border rounded-xl p-4 flex flex-col items-center gap-2 transition-all hover:bg-gray-50",
                                                watch('perfil') === perf ? "border-blue-500 bg-blue-50/50 ring-1 ring-blue-500" : "border-gray-200"
                                            )}>
                                                <input type="radio" value={perf} {...register('perfil', { required: true })} className="sr-only" />
                                                <span className="font-bold text-xs text-gray-600 block text-center uppercase">{perf.replace(/_/g, ' ')}</span>
                                                <div className={clsx("w-4 h-4 rounded-full border flex items-center justify-center", watch('perfil') === perf ? "border-blue-600 bg-blue-600" : "border-gray-300")}>
                                                    {watch('perfil') === perf && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 pt-6 mt-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Modalidad de Permanencia (SituaciÃ³n)</label>
                                    <div className="flex gap-6">
                                        <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2 rounded-lg border border-yellow-200 shadow-sm transition-all hover:bg-yellow-50">
                                            <input type="radio" value="TRANSITO_EN_CALLE" {...register('situacionCalle', { required: 'Debe marcar la situaciÃ³n' })} className="text-yellow-600 focus:ring-yellow-500" />
                                            <span className="font-bold text-sm text-gray-800">TrÃ¡nsito en Calle</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2 rounded-lg border border-yellow-200 shadow-sm transition-all hover:bg-yellow-50">
                                            <input type="radio" value="CONVIVENCIA_EN_CALLE" {...register('situacionCalle', { required: 'Debe marcar la situaciÃ³n' })} className="text-yellow-600 focus:ring-yellow-500" />
                                            <span className="font-bold text-sm text-gray-800">Convivencia en Calle (Pernocte)</span>
                                        </label>
                                    </div>
                                    {errors.situacionCalle && <span className="text-red-500 text-xs font-bold mt-1">Este campo es requerido.</span>}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 border-t border-gray-100 pt-6">
                                    <InputField type="date" label="Fecha de Abordaje" register={register('fechaAbordaje')} />
                                    <InputField type="date" label="Fecha de Ingreso" register={register('fechaIngreso')} />
                                    <InputField type="date" label="Fecha Reingreso" register={register('fechaReingreso')} />
                                    <InputField type="date" label="Fecha Cambio Perfil" register={register('fechaCambioPerfil')} />
                                </div>
                            </div>
                        )}

                        {/* ========================================================================================= */}
                        {/* PASO 2: II. DATOS PERSONALES */}
                        {/* ========================================================================================= */}
                        {activeSection === 'paso2_personales' && (
                            <div className="space-y-8 animate-fadeIn">
                                <SectionHeader title="II. Datos Personales del NNA" subtitle="InformaciÃ³n de identidad y ubicaciÃ³n." />

                                {/* BLOQUE INICIAL DE DOMICILIO Y CONTACTO (COMPARTIDO) */}
                                <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 mb-6 group hover:border-blue-300 transition-all">
                                    <h3 className="text-sm font-black text-blue-900 uppercase mb-4 flex items-center gap-2">
                                        <MapPin size={16} /> Domicilio Actual y Contacto
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div className="md:col-span-2">
                                            <InputField label="Domicilio Actual" register={register('domicilioActual')} placeholder="DirecciÃ³n exacta" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <InputField label="Referencia" register={register('referenciaDomicilio')} placeholder="Referencia de ubicaciÃ³n" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="label"><span className="label-text font-bold text-gray-700">UbicaciÃ³n GeogrÃ¡fica</span></label>
                                            <UbigeoFields
                                                departamento={watch('departamentoDom')}
                                                provincia={watch('provinciaDom')}
                                                distrito={watch('distritoDom')}
                                                onChange={({ departamento, provincia, distrito }) => {
                                                    setValue('departamentoDom', departamento);
                                                    setValue('provinciaDom', provincia);
                                                    setValue('distritoDom', distrito);
                                                }}
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <InputField label="TelÃ©fono de Referencia" register={register('telefonoContacto')} placeholder="999..." />
                                        </div>
                                    </div>
                                </div>

                                {/* LISTA DE NNAS */}
                                {fields.map((field, index) => (
                                    <div key={field.id} className="bg-gray-50 rounded-xl border border-gray-200 p-5 relative mt-6">
                                        <div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-2">
                                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                                <span className="bg-gray-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">{index + 1}</span>
                                                Datos del NNA {index > 0 ? '(Hermano)' : ''}
                                            </h3>
                                            {index > 0 && (
                                                <button type="button" onClick={() => remove(index)} className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1">
                                                    <Trash2 size={14} /> Eliminar
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {/* FILA 1: APELLIDOS Y NOMBRES */}
                                            <InputField label="Apellido Paterno" register={register(`nnas.${index}.apellidoPaterno` as const, { required: true })} placeholder="Ap. Paterno" />
                                            <InputField label="Apellido Materno" register={register(`nnas.${index}.apellidoMaterno` as const)} placeholder="Ap. Materno" />
                                            <InputField label="Nombres" register={register(`nnas.${index}.nombres` as const, { required: true })} placeholder="Nombres" />

                                            {/* FILA 2: SEXO Y NACIMIENTO */}
                                            <div className="md:col-span-1">
                                                <SelectField label="Sexo" register={register(`nnas.${index}.sexo` as const)} options={[
                                                    { value: 'M', label: 'Masculino' },
                                                    { value: 'F', label: 'Femenino' }
                                                ]} />
                                            </div>
                                            <InputField type="date" label="Fecha Nacimiento (DD/MM/AAAA)" register={register(`nnas.${index}.fechaNacimiento` as const)} />

                                            {/* FILA 3: LUGAR NACIMIENTO */}
                                            <div className="md:col-span-3 grid grid-cols-3 gap-2 bg-white p-3 rounded border border-gray-200">
                                                <label className="col-span-3 text-[10px] font-bold text-gray-500 uppercase">Lugar de Nacimiento</label>
                                                <div className="col-span-3">
                                                    <UbigeoFields
                                                        departamento={watch(`nnas.${index}.departamentoNac`)}
                                                        provincia={watch(`nnas.${index}.provinciaNac`)}
                                                        distrito={watch(`nnas.${index}.distritoNac`)}
                                                        onChange={({ departamento, provincia, distrito }) => {
                                                            setValue(`nnas.${index}.departamentoNac` as const, departamento);
                                                            setValue(`nnas.${index}.provinciaNac` as const, provincia);
                                                            setValue(`nnas.${index}.distritoNac` as const, distrito);
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            {/* SECCIÃ“N IDENTIDAD */}
                                            <div className="md:col-span-3 bg-white p-4 rounded border border-gray-200 mt-2">
                                                <h4 className="text-xs font-bold text-gray-700 uppercase mb-3 border-b pb-1">Documento de Identidad</h4>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <SelectField label="Tipo Documento" register={register(`nnas.${index}.tipoDoc` as const)} options={[
                                                        { value: 'DNI', label: 'DNI' },
                                                        { value: 'SIN_DOC', label: 'Sin Documento' },
                                                        { value: 'CEDULA', label: 'CÃ©dula Ext.' },
                                                        { value: 'PARTIDA', label: 'Partida Nac.' }
                                                    ]} />

                                                    <div className="md:col-span-2">
                                                        <InputField label="NÂ° de Documento / DNI" register={register(`nnas.${index}.numeroDoc` as const)} placeholder="Ingrese nÃºmero si tiene" />
                                                    </div>

                                                    <div className="flex flex-col justify-end pb-2">
                                                        <label className="text-xs font-bold text-gray-500 mb-1 block">Â¿Tiene Partida Nac.?</label>
                                                        <div className="flex gap-4">
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input type="radio" value="true" {...register(`nnas.${index}.tienePartidaNacimiento` as const)} className="text-blue-600" />
                                                                <span className="text-sm">SÃ</span>
                                                            </label>
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input type="radio" value="false" {...register(`nnas.${index}.tienePartidaNacimiento` as const)} className="text-blue-600" />
                                                                <span className="text-sm">NO</span>
                                                            </label>
                                                        </div>
                                                    </div>

                                                    <div className="md:col-span-2">
                                                        <InputField label="Â¿Por quÃ©? (En caso no tenga documento)" register={register(`nnas.${index}.detalleSinDoc` as const)} placeholder="Especifique motivo..." />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <button type="button" onClick={() => {
                                    const primerNna = watch('nnas.0');
                                    append({
                                        nombres: '',
                                        apellidoPaterno: primerNna?.apellidoPaterno || '',
                                        apellidoMaterno: primerNna?.apellidoMaterno || '',
                                        tipoDoc: 'DNI',
                                        departamentoNac: primerNna?.departamentoNac || '',
                                        provinciaNac: primerNna?.provinciaNac || '',
                                        distritoNac: primerNna?.distritoNac || '',
                                        institucionEducativa: primerNna?.institucionEducativa || '',
                                        estudiaActualmente: true,
                                        tienePartidaNacimiento: "true",
                                        tieneDiscapacidad: false,
                                        sexo: '',
                                        fechaNacimiento: '',
                                        numeroDoc: '',
                                        detalleSinDoc: '',
                                        detalleNoEstudia: '',
                                        modalidadEstudio: '',
                                        nivelEducativo: '',
                                        gradoEstudio: '',
                                        tipoDiscapacidad: '', // Nuevo campo
                                        afiliadoSIS: '',
                                        afiliadoOtroSeguro: '',
                                        detalleOtroSeguro: '',
                                        sufreEnfermedad: '',
                                        detalleEnfermedad: '',
                                        observacionesSalud: '',
                                        actividadesTiempoLibre: '',
                                        caracteristicas: '',
                                        tieneAntecedenteAlbergue: false,
                                        detalleAntecedenteAlbergue: '',
                                        usoTiempo: {} as Record<string, UsoTiempoDia>
                                    });
                                }} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 text-gray-500 hover:text-blue-600 font-bold transition-all flex items-center justify-center gap-2">
                                    <Plus size={20} /> Agregar Hermano (Copiar apellidos)
                                </button>
                            </div>
                        )}

                        {/* ========================================================================================= */}
                        {/* PASO 3: III. DATOS SEGÃšN PERFIL */}
                        {/* ========================================================================================= */}
                        {activeSection === 'paso3_perfil' && (
                            <div className="space-y-6 animate-fadeIn">
                                <SectionHeader title="III. Datos SegÃºn Perfil" subtitle="CaracterÃ­sticas de la situaciÃ³n en calle (Entrevista)." />

                                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-6">
                                    {/* Actividad */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-800 block">Â¿QuÃ© actividades realizas? (caracterÃ­sticas que lo califica como NNA en situaciÃ³n de calle)</label>
                                        <textarea
                                            {...register('actividadRealizada')}
                                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                                            rows={2}
                                            placeholder="Detalle la actividad..."
                                        />
                                    </div>

                                    {/* Tiempo */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-800 block">Â¿Hace cuÃ¡nto tiempo realizas esta actividad en calle?</label>
                                        <InputField label="" register={register('tiempoEnCalle')} placeholder="Ej: 6 meses, 1 aÃ±o..." />
                                    </div>

                                    {/* Horario */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-800 block">Â¿En quÃ© horario la realiza?</label>
                                        <div className="space-y-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                            {/* Turno 1 */}
                                            <div className="flex flex-col md:flex-row gap-4 border-b border-gray-200 pb-2">
                                                <div className="flex-1 flex items-center gap-3">
                                                    <span className="font-bold text-gray-700 text-sm w-8">De:</span>
                                                    <input type="time" {...register('horarioInicio')} className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border text-sm" />
                                                </div>
                                                <div className="flex-1 flex items-center gap-3">
                                                    <span className="font-bold text-gray-700 text-sm w-8">A:</span>
                                                    <input type="time" {...register('horarioFin')} className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border text-sm" />
                                                </div>
                                            </div>
                                            {/* Turno 2 */}
                                            <div className="flex flex-col md:flex-row gap-4 pt-1">
                                                <div className="flex-1 flex items-center gap-3">
                                                    <span className="font-bold text-gray-700 text-sm w-8">De:</span>
                                                    <input type="time" {...register('horarioInicio2')} className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border text-sm" />
                                                </div>
                                                <div className="flex-1 flex items-center gap-3">
                                                    <span className="font-bold text-gray-700 text-sm w-8">A:</span>
                                                    <input type="time" {...register('horarioFin2')} className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border text-sm" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dias - Checkboxes estilo tabla */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-800 block">Â¿CuÃ¡ntos dÃ­as a la semana trabajas o realizas esta actividad en calle?</label>
                                        <div className="grid grid-cols-7 border border-gray-300 rounded-lg overflow-hidden bg-white">
                                            {['Lunes', 'Martes', 'MiÃ©rcoles', 'Jueves', 'Viernes', 'SÃ¡bado', 'Domingo'].map((day) => (
                                                <label key={day} className="flex flex-col items-center justify-center p-3 cursor-pointer hover:bg-blue-50 transition-colors border-r last:border-r-0 border-gray-200">
                                                    <span className="text-[10px] sm:text-xs font-bold uppercase text-gray-600 mb-2">{day.substring(0, 3)}</span>
                                                    <input
                                                        type="checkbox"
                                                        className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                                                        checked={(watch('diasTrabajo') || '').includes(day)}
                                                        onChange={(e) => {
                                                            const current = watch('diasTrabajo') || '';
                                                            let daysArray = current ? current.split(', ').filter(Boolean) : [];
                                                            if (e.target.checked) {
                                                                if (!daysArray.includes(day)) daysArray.push(day);
                                                            } else {
                                                                daysArray = daysArray.filter(d => d !== day);
                                                            }
                                                            setValue('diasTrabajo', daysArray.join(', '));
                                                        }}
                                                    />
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Condicion - "Realizas la actividad:" */}
                                    <div className="space-y-2 pt-2">
                                        <div className="grid grid-cols-1 sm:grid-cols-4 border border-gray-300 rounded-lg overflow-hidden bg-white">
                                            <div className="bg-gray-100 p-4 flex items-center justify-center sm:justify-start border-b sm:border-b-0 sm:border-r border-gray-300">
                                                <span className="text-sm font-bold text-gray-900">Realizas la actividad:</span>
                                            </div>

                                            {[
                                                { val: 'SOLO', label: 'Solo' },
                                                { val: 'PARES', label: 'AcompaÃ±ado de Pares' },
                                                { val: 'FAMILIA', label: 'AcompaÃ±ado de familiar/adulto' }
                                            ].map((opt) => (
                                                <label key={opt.val} className={`cursor-pointer p-4 flex flex-col items-center justify-center gap-2 hover:bg-blue-50 transition-colors border-b sm:border-b-0 sm:border-r last:border-r-0 border-gray-200 ${watch('condicion') === opt.val ? 'bg-blue-100' : ''}`}>
                                                    <input type="radio" value={opt.val} {...register('condicion', { required: true })} className="h-5 w-5 text-blue-600 focus:ring-blue-500" />
                                                    <span className="text-xs font-bold text-center text-gray-700">{opt.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                </div>
                            </div>
                        )}

                        {/* ========================================================================================= */}
                        {/* PASO 4: IV. EDUCACIÃ“N */}
                        {/* ========================================================================================= */}
                        {activeSection === 'paso4_educacion' && (
                            <div className="space-y-8 animate-fadeIn">
                                <SectionHeader title="IV. EducaciÃ³n" subtitle="SituaciÃ³n educativa de cada NNA." />

                                {fields.map((field, index) => (
                                    <div key={field.id} className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm">
                                        <h3 className="font-bold text-gray-800 text-sm mb-4 bg-gray-100 px-3 py-1 rounded inline-block">
                                            {index + 1}. {watch(`nnas.${index}.nombres`) || 'NNA Sin Nombre'} {watch(`nnas.${index}.apellidoPaterno`)}
                                        </h3>

                                        <div className="mb-2">
                                            <div className="flex items-center gap-4 mb-4">
                                                <label className="flex items-center gap-2 cursor-pointer bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
                                                    <input type="checkbox" {...register(`nnas.${index}.estudiaActualmente` as const)} className="w-4 h-4 text-blue-600 rounded" />
                                                    <span className="font-bold text-sm text-blue-900">Â¿Estudia Actualmente?</span>
                                                </label>
                                            </div>

                                            {watch(`nnas.${index}.estudiaActualmente`) ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slideDown">
                                                    <SelectField label="Nivel Educativo" register={register(`nnas.${index}.nivelEducativo` as const)} options={[
                                                        { value: 'INICIAL', label: 'Inicial' },
                                                        { value: 'PRIMARIA', label: 'Primaria' },
                                                        { value: 'SECUNDARIA', label: 'Secundaria' },
                                                        { value: 'NO_ESCOLARIZADO', label: 'No Escolarizado' }
                                                    ]} />
                                                    <InputField label="Grado / AÃ±o" register={register(`nnas.${index}.gradoEstudio` as const)} placeholder="Ej: 3ro" />
                                                    <InputField label="InstituciÃ³n Educativa" register={register(`nnas.${index}.institucionEducativa` as const)} placeholder="Nombre del Colegio" />
                                                    <SelectField label="Modalidad" register={register(`nnas.${index}.modalidadEstudio` as const)} options={[
                                                        { value: 'EBR', label: 'EBR (Regular)' },
                                                        { value: 'EBA', label: 'EBA (Alternativa)' },
                                                        { value: 'EBE', label: 'EBE (Especial)' },
                                                        { value: 'CETPRO', label: 'CETPRO' }
                                                    ]} />
                                                </div>
                                            ) : (
                                                <div className="bg-red-50 p-4 rounded-lg border border-red-100 animate-fadeIn">
                                                    <InputField label="Â¿Por quÃ© no estudia?" register={register(`nnas.${index}.detalleNoEstudia` as const)} placeholder="Motivo de deserciÃ³n..." />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ========================================================================================= */}
                        {/* PASO 5: V. SALUD */}
                        {/* ========================================================================================= */}
                        {activeSection === 'paso5_salud' && (
                            <div className="space-y-8 animate-fadeIn">
                                <SectionHeader title="V. Salud" subtitle="Aseguramiento y condiciÃ³n de salud." />

                                {fields.map((field, index) => (
                                    <div key={field.id} className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm">
                                        <h3 className="font-bold text-gray-800 text-sm mb-4 bg-gray-100 px-3 py-1 rounded inline-block">
                                            {index + 1}. {watch(`nnas.${index}.nombres`) || 'NNA Sin Nombre'} {watch(`nnas.${index}.apellidoPaterno`)}
                                        </h3>

                                        <div className="space-y-6">
                                            {/* SEGUROS DE SALUD */}
                                            <div className="border rounded-lg overflow-hidden">
                                                {/* SIS */}
                                                <div className="grid grid-cols-[2fr_1fr_1fr_1fr] border-b divide-x items-center bg-gray-50">
                                                    <div className="p-3 text-sm font-bold text-gray-700">Â¿EstÃ¡s afiliado al Seguro Universal de Salud (SIS)?</div>
                                                    {['SI', 'NO', 'NO_SABE'].map((opt) => (
                                                        <label key={opt} className={`p-3 flex items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors h-full ${watch(`nnas.${index}.afiliadoSIS` as const) === opt ? 'bg-blue-100 text-blue-900 font-bold' : ''}`}>
                                                            <input type="radio" value={opt} {...register(`nnas.${index}.afiliadoSIS` as const)} className="mr-2" />
                                                            <span className="text-xs font-bold">{opt.replace('_', ' ')}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                                {/* OTRO SEGURO */}
                                                <div className="grid grid-cols-[2fr_1fr_1fr_1fr] divide-x items-center bg-white">
                                                    <div className="p-3 text-sm font-bold text-gray-700">Â¿EstÃ¡s afiliado a algÃºn otro tipo de seguro de salud?</div>
                                                    {['SI', 'NO', 'NO_SABE'].map((opt) => (
                                                        <label key={opt} className={`p-3 flex items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors h-full ${watch(`nnas.${index}.afiliadoOtroSeguro` as const) === opt ? 'bg-blue-100 text-blue-900 font-bold' : ''}`}>
                                                            <input type="radio" value={opt} {...register(`nnas.${index}.afiliadoOtroSeguro` as const)} className="mr-2" />
                                                            <span className="text-xs font-bold">{opt.replace('_', ' ')}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                                {watch(`nnas.${index}.afiliadoOtroSeguro` as const) === 'SI' && (
                                                    <div className="p-3 bg-blue-50 animate-slideDown border-t">
                                                        <InputField label="De ser afirmativo especificar: Â¿CuÃ¡l?" register={register(`nnas.${index}.detalleOtroSeguro` as const)} placeholder="Especifique el seguro..." />
                                                    </div>
                                                )}
                                            </div>

                                            {/* ENFERMEDAD */}
                                            <div className="border rounded-lg overflow-hidden">
                                                <div className="grid grid-cols-[2fr_1fr_1fr] border-b divide-x items-center bg-gray-50">
                                                    <div className="p-3 text-sm font-bold text-gray-700">Â¿Sufres alguna enfermedad actualmente?</div>
                                                    {['SI', 'NO'].map((opt) => (
                                                        <label key={opt} className={`p-3 flex items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors h-full ${watch(`nnas.${index}.sufreEnfermedad` as const) === opt ? 'bg-blue-100 text-blue-900 font-bold' : ''}`}>
                                                            <input type="radio" value={opt} {...register(`nnas.${index}.sufreEnfermedad` as const)} className="mr-2" />
                                                            <span className="text-xs font-bold">{opt}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                                {(watch(`nnas.${index}.sufreEnfermedad` as const) === 'SI' || watch(`nnas.${index}.sufreEnfermedad` as const) === 'yes') && ( // handle "yes" if boolean to string coercion happens weirdly, though radio value is string
                                                    <div className="p-3 bg-red-50 animate-slideDown">
                                                        <InputField label="De ser afirmativo especificar: Â¿CuÃ¡l?" register={register(`nnas.${index}.detalleEnfermedad` as const)} placeholder="Especifique la enfermedad..." />
                                                    </div>
                                                )}
                                            </div>

                                            {/* DISCAPACIDAD */}
                                            <div className="border rounded-lg overflow-hidden">
                                                <div className="grid grid-cols-[2fr_1fr_1fr] border-b divide-x items-center bg-gray-50">
                                                    <div className="p-3 text-sm font-bold text-gray-700">Â¿Presenta algÃºn tipo de discapacidad?</div>
                                                    <label className={`p-3 flex items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors h-full ${watch(`nnas.${index}.tieneDiscapacidad` as const) === true ? 'bg-blue-100 text-blue-900 font-bold' : ''}`}>
                                                        <input
                                                            type="radio"
                                                            value="true" // Radio uses string value, but react-hook-form handles boolean if we use boolean true? No, radio values are strings usually. Let's cast or handle in onChange if needed, but simple string comparison 'true' is safer for DOM.
                                                            {...register(`nnas.${index}.tieneDiscapacidad` as const)}
                                                            className="mr-2"
                                                            checked={String(watch(`nnas.${index}.tieneDiscapacidad`)) === 'true'}
                                                            onChange={() => setValue(`nnas.${index}.tieneDiscapacidad`, true)}
                                                        />
                                                        <span className="text-xs font-bold">SÃ</span>
                                                    </label>
                                                    <label className={`p-3 flex items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors h-full ${watch(`nnas.${index}.tieneDiscapacidad` as const) === false ? 'bg-blue-100 text-blue-900 font-bold' : ''}`}>
                                                        <input
                                                            type="radio"
                                                            value="false"
                                                            {...register(`nnas.${index}.tieneDiscapacidad` as const)}
                                                            className="mr-2"
                                                            checked={String(watch(`nnas.${index}.tieneDiscapacidad`)) === 'false'}
                                                            onChange={() => setValue(`nnas.${index}.tieneDiscapacidad`, false)}
                                                        />
                                                        <span className="text-xs font-bold">NO</span>
                                                    </label>
                                                </div>

                                                {(String(watch(`nnas.${index}.tieneDiscapacidad`)) === 'true') && (
                                                    <div className="p-4 bg-gray-50 animate-slideDown">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            {DISCAPACIDADES_CONADIS.map((discap) => (
                                                                <label key={discap} className={`flex items-center gap-3 p-3 rounded border cursor-pointer hover:bg-white transition-all ${watch(`nnas.${index}.tipoDiscapacidad` as const) === discap ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 bg-white'}`}>
                                                                    <input
                                                                        type="radio"
                                                                        value={discap}
                                                                        {...register(`nnas.${index}.tipoDiscapacidad` as const)}
                                                                        className="h-4 w-4 text-blue-600"
                                                                    />
                                                                    <span className="text-sm text-gray-700 font-medium">{discap}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="pt-2">
                                                <InputField label="Observaciones Salud / Lugar de AtenciÃ³n" register={register(`nnas.${index}.observacionesSalud` as const)} />
                                            </div>

                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}


                        {/* ========================================================================================= */}
                        {/* PASO 6: VI. FAMILIA y OTROS (VII, VIII) */}
                        {/* ========================================================================================= */}
                        {activeSection === 'paso6_familia' && (
                            <div className="space-y-8 animate-fadeIn">
                                <SectionHeader title="VI. Familia / VII. Tiempo Libre" subtitle="Datos de vivienda y detalles finales." />

                                {/* VI. FAMILIA */}
                                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
                                    <h3 className="bg-purple-50 text-purple-900 font-bold px-4 py-3 border-b border-purple-100 flex items-center gap-2">
                                        <Home size={18} /> VI. FAMILIA
                                    </h3>
                                    <div className="p-5 space-y-6">

                                        {/* Â¿Con quiÃ©nes vives? */}
                                        <div className="space-y-3">
                                            <div className="text-sm font-bold text-gray-800">Â¿Con quiÃ©nes vives?</div>
                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                                {[
                                                    { val: 'AMBOS_PADRES', lbl: 'Ambos padres' },
                                                    { val: 'SOLO_MADRE', lbl: 'Solo Madre' },
                                                    { val: 'SOLO_PADRE', lbl: 'Solo Padre' },
                                                    { val: 'OTROS_FAMILIARES', lbl: 'Otros Familiares' },
                                                    { val: 'AMIGOS', lbl: 'Amigos' },
                                                    { val: 'SOLO', lbl: 'Solo' },
                                                    { val: 'OTRO', lbl: 'Otro' }
                                                ].map(opt => (
                                                    <label key={opt.val} className={`border rounded-lg p-3 cursor-pointer hover:bg-purple-50 transition-colors flex items-center gap-2 ${watch('viveCon') === opt.val ? 'bg-purple-100 border-purple-300 ring-1 ring-purple-300' : 'border-gray-200'}`}>
                                                        <input type="radio" value={opt.val} {...register('viveCon', { required: 'Este campo es obligatorio' })} className="text-purple-600 focus:ring-purple-500" />
                                                        <span className="text-xs font-bold text-gray-700 capitalize">{opt.lbl}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            {watch('viveCon') === 'OTRO' && (
                                                <div className="animate-slideDown pl-2 border-l-4 border-purple-200">
                                                    <InputField label="Detallar (Otro):" register={register('detalleViveCon')} placeholder="Especifique con quiÃ©n vive..." />
                                                </div>
                                            )}
                                        </div>

                                        <div className="border-t border-gray-100 my-4"></div>

                                        {/* Â¿DÃ³nde duermes habitualmente? */}
                                        <div className="space-y-3">
                                            <div className="text-sm font-bold text-gray-800">
                                                En caso que no viva con sus padres u otros familiares preguntar: <br />
                                                <span className="text-base text-blue-900 mt-1 block">Â¿DÃ³nde duermes habitualmente?</span>
                                            </div>
                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                                {[
                                                    { val: 'SU_CASA', lbl: 'Su casa' },
                                                    { val: 'CALLES_PARQUES', lbl: 'Calles, Parques' },
                                                    { val: 'CUARTO_ALQUILADO', lbl: 'Cuarto alquilado' },
                                                    { val: 'OTRO', lbl: 'Otro' }
                                                ].map(opt => (
                                                    <label key={opt.val} className={`border rounded-lg p-3 cursor-pointer hover:bg-blue-50 transition-colors flex items-center gap-2 ${watch('lugarPernocte') === opt.val ? 'bg-blue-100 border-blue-300 ring-1 ring-blue-300' : 'border-gray-200'}`}>
                                                        <input type="radio" value={opt.val} {...register('lugarPernocte', { required: 'Este campo es obligatorio' })} className="text-blue-600 focus:ring-blue-500" />
                                                        <span className="text-xs font-bold text-gray-700 capitalize">{opt.lbl}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            {watch('lugarPernocte') === 'OTRO' && (
                                                <div className="animate-slideDown pl-2 border-l-4 border-blue-200">
                                                    <InputField label="Detallar (Otro):" register={register('detalleLugarPernocte')} placeholder="Especifique dÃ³nde duerme..." />
                                                </div>
                                            )}
                                        </div>

                                        <div className="border-t border-gray-100 my-4"></div>

                                        {/* Responsable Legal */}
                                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                            <InputField label="Nombre de Padre/Madre/Tutor/Responsable:" register={register('nombreTutor')} placeholder="Nombre completo del adulto responsable" />
                                        </div>

                                    </div>
                                </div>

                                {/* VII y VIII. OTROS DATOS */}
                                <div className="space-y-4">
                                    <h3 className="font-bold text-gray-800 border-b border-gray-200 pb-2 mt-2">VII. Tiempo Libre, VIII. Observaciones y H. Institucional</h3>
                                    {fields.map((field, index) => (
                                        <div key={field.id} className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
                                            <div className="text-xs font-bold text-white bg-gray-800 px-3 py-1 rounded inline-block mb-4">NNA: {watch(`nnas.${index}.nombres`) || 'Sin Nombre'}</div>

                                            <div className="grid grid-cols-1 gap-4">
                                                {/* Antecedente Institucional (Casa/Albergue) - Pregunta EspecÃ­fica de la Imagen */}
                                                <div className="border rounded-lg overflow-hidden bg-orange-50/50 border-orange-100">
                                                    <div className="grid grid-cols-[3fr_1fr_1fr] border-b border-orange-200 divide-x divide-orange-200 items-center">
                                                        <div className="p-3 text-sm font-bold text-gray-800">Â¿Ha estado en una casa de estancia, hogar o albergue?</div>
                                                        <label className={`p-3 flex items-center justify-center cursor-pointer hover:bg-orange-100 transition-colors h-full ${watch(`nnas.${index}.tieneAntecedenteAlbergue` as const) === true ? 'bg-orange-200 text-orange-900 font-bold' : ''}`}>
                                                            <input
                                                                type="radio"
                                                                value="true" // String value for radio but handled as boolean via onChange if needed, usually react-hook-form handles standard inputs well, but for radio 'true' string != boolean true.
                                                                // Better approach: use onChange to set boolean.
                                                                {...register(`nnas.${index}.tieneAntecedenteAlbergue` as const)}
                                                                className="mr-2"
                                                                checked={String(watch(`nnas.${index}.tieneAntecedenteAlbergue`)) === 'true'}
                                                                onChange={() => setValue(`nnas.${index}.tieneAntecedenteAlbergue`, true)}
                                                            />
                                                            <span className="text-xs font-bold">SÃ</span>
                                                        </label>
                                                        <label className={`p-3 flex items-center justify-center cursor-pointer hover:bg-orange-100 transition-colors h-full ${watch(`nnas.${index}.tieneAntecedenteAlbergue` as const) === false ? 'bg-orange-200 text-orange-900 font-bold' : ''}`}>
                                                            <input
                                                                type="radio"
                                                                value="false"
                                                                {...register(`nnas.${index}.tieneAntecedenteAlbergue` as const)}
                                                                className="mr-2"
                                                                checked={String(watch(`nnas.${index}.tieneAntecedenteAlbergue`)) === 'false'}
                                                                onChange={() => {
                                                                    setValue(`nnas.${index}.tieneAntecedenteAlbergue`, false);
                                                                    setValue(`nnas.${index}.detalleAntecedenteAlbergue`, ''); // Clear detail on NO
                                                                }}
                                                            />
                                                            <span className="text-xs font-bold">NO</span>
                                                        </label>
                                                    </div>
                                                    {String(watch(`nnas.${index}.tieneAntecedenteAlbergue` as const)) === 'true' && (
                                                        <div className="p-3 bg-white animate-slideDown">
                                                            <InputField
                                                                label="Â¿CuÃ¡l? (Nombre de la instituciÃ³n)"
                                                                register={register(`nnas.${index}.detalleAntecedenteAlbergue` as const)}
                                                                placeholder="Especifique nombre del albergue..."
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* VII. CUADRICULA DE USO DE TIEMPO INTERACTIVA */}
                                                {(() => {
                                                    const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
                                                    const ut = watch(`nnas.${index}.usoTiempo`) || {} as Record<string, UsoTiempoDia>;
                                                    const getVal = (d: string, a: string) => Number((ut as any)[d]?.[a]) || 0;
                                                    const setVal = (d: string, a: string, v: number) => {
                                                        const cur = { ...((ut as any)[d] || { estudiar: 0, trabajar: 0, dormir: 0, jugar: 0 }), [a]: v };
                                                        setValue(`nnas.${index}.usoTiempo` as any, { ...ut, [d]: cur });
                                                    };
                                                    const totalDia = (d: string) => getVal(d, 'estudiar') + getVal(d, 'trabajar') + getVal(d, 'dormir') + getVal(d, 'jugar');
                                                    const validDia = (d: string) => totalDia(d) <= 24;
                                                    const sem = (a: string) => DIAS.reduce((s, d) => s + getVal(d, a), 0);
                                                    const promSueño = Math.round((sem('dormir') / 7) * 10) / 10;
                                                    const actColores: Record<string, string> = { estudiar: 'bg-indigo-500', trabajar: 'bg-amber-500', dormir: 'bg-teal-500', jugar: 'bg-emerald-500' };
                                                    const actLabels: Record<string, string> = { estudiar: 'Est', trabajar: 'Tra', dormir: 'Dor', jugar: 'Jug' };
                                                    let riesgo = 'Sin Riesgo'; let color = 'text-green-700 bg-green-50 border-green-200';
                                                    if (sem('trabajar') > 30 || promSueño < 6) { riesgo = 'Riesgo Crítico'; color = 'text-rose-700 bg-rose-50 border-rose-200'; }
                                                    else if (sem('trabajar') > 14 || promSueño < 8 || sem('trabajar') > sem('estudiar')) { riesgo = 'Riesgo Moderado'; color = 'text-amber-700 bg-amber-50 border-amber-200'; }
                                                    else if (sem('trabajar') > 0) { riesgo = 'Riesgo Leve'; color = 'text-yellow-700 bg-yellow-50 border-yellow-200'; }
                                                    return (
                                                        <div className="space-y-3">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-sm font-bold text-gray-800">VII. Matriz de Uso de Tiempo (horas/día)</span>
                                                                {riesgo !== 'Sin Riesgo' && (
                                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${color}`}>{riesgo}</span>
                                                                )}
                                                            </div>
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-[11px] border-collapse">
                                                                    <thead>
                                                                        <tr className="bg-gray-100">
                                                                            <th className="p-1.5 text-left font-bold text-gray-600 w-16">Día</th>
                                                                            <th className="p-1.5 text-center font-bold text-indigo-700 w-14">Est</th>
                                                                            <th className="p-1.5 text-center font-bold text-amber-700 w-14">Tra</th>
                                                                            <th className="p-1.5 text-center font-bold text-teal-700 w-14">Dor</th>
                                                                            <th className="p-1.5 text-center font-bold text-emerald-700 w-14">Jug</th>
                                                                            <th className="p-1.5 text-center font-bold text-gray-600 w-12">Total</th>
                                                                            <th className="p-1.5 w-28">Distribución</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {DIAS.map(d => {
                                                                            const t = totalDia(d); const ok = validDia(d);
                                                                            return (
                                                                                <tr key={d} className={`border-t border-gray-100 ${!ok ? 'bg-red-50' : ''}`}>
                                                                                    <td className="p-1.5 font-semibold text-gray-700 text-[10px]">{d.substring(0, 3)}</td>
                                                                                    {['estudiar', 'trabajar', 'dormir', 'jugar'].map(a => (
                                                                                        <td key={a} className="p-0.5">
                                                                                            <input type="number" min={0} max={24} step={0.5}
                                                                                                value={getVal(d, a) || ''}
                                                                                                onChange={e => setVal(d, a, Math.max(0, Math.min(24, Number(e.target.value) || 0)))}
                                                                                                className="w-full text-center text-[11px] p-1 rounded border border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none"
                                                                                            />
                                                                                        </td>
                                                                                    ))}
                                                                                    <td className={`p-1.5 text-center font-bold ${ok ? 'text-green-600' : 'text-red-600'}`}>{t}{!ok ? '⚠' : ''}</td>
                                                                                    <td className="p-1">
                                                                                        <div className="w-full h-3 rounded-full bg-gray-100 flex overflow-hidden">
                                                                                            {['estudiar', 'trabajar', 'dormir', 'jugar'].map(a => {
                                                                                                const pct = t > 0 ? (getVal(d, a) / t) * 100 : 0;
                                                                                                return pct > 0 ? <div key={a} className={`${actColores[a]} h-full transition-all`} style={{ width: `${pct}%` }} title={`${actLabels[a]}: ${getVal(d, a)}h`} /> : null;
                                                                                            })}
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                    <tfoot>
                                                                        <tr className="bg-gray-50 font-bold border-t-2 border-gray-200">
                                                                            <td className="p-1.5 text-gray-600">Semanal</td>
                                                                            {['estudiar', 'trabajar', 'dormir', 'jugar'].map(a => (
                                                                                <td key={a} className={`p-1.5 text-center ${a === 'trabajar' && sem(a) > 14 ? 'text-amber-600' : a === 'dormir' && sem(a) < 56 ? 'text-teal-600' : 'text-gray-800'}`}>{sem(a)}h</td>
                                                                            ))}
                                                                            <td className="p-1.5 text-center text-gray-800">{DIAS.reduce((s, d) => s + totalDia(d), 0)}h</td>
                                                                            <td></td>
                                                                        </tr>
                                                                    </tfoot>
                                                                </table>
                                                            </div>
                                                            {!DIAS.every(d => validDia(d)) && (
                                                                <div className="text-[10px] text-red-600 font-bold">⚠ Algunos días superan las 24h. Corrige los valores.</div>
                                                            )}
                                                            {promSueño < 8 && (
                                                                <div className="text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-1 rounded">💤 Promedio de sueño: {promSueño}h/día {promSueño < 6 ? '(Crítico)' : '(Debajo de lo recomendado)'}</div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                                <InputField label="VIII. Observaciones / Detalle Cualitativo" register={register(`nnas.${index}.caracteristicas` as const)} placeholder="Ej: Jugar fútbol, ver TV, detalles sobre actividades..." />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>

                    <FooterButtons
                        onBack={activeSection !== 'paso1_generales' ? handlePrev : undefined}
                        onNext={activeSection !== 'paso6_familia' ? handleNext : undefined}
                        onSave={activeSection === 'paso6_familia' ? handleSubmit(onSubmit) : undefined}
                        loading={submitting}
                        nextLabel="Siguiente Paso"
                        submitLabel="Guardar Ficha"
                    />
                </form>
            </main>
        </div>
    );
};
