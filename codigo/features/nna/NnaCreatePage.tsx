/**
 * SEC · NnaCreatePage rediseñado
 * - Sidebar: bg-primary en lugar de bg-blue-600 hardcodeado
 * - Steps: active usa primary-soft/text-primary
 * - Profile cards: usa primary tokens
 * - Inputs: usa FormFields rediseñados (ya aplican tokens)
 * - FooterButtons: sin shadow coloreada
 * - Sin alert() — errores en UI
 * Nota: toda la lógica de negocio (useFieldArray, ubigeo, submit) intacta.
 */

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useNnaStore } from '../../store/nna.store';
import { MapPin, Users, Briefcase, School, HeartPulse, Home, Plus, Trash2, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { InputField, SelectField, SectionHeader, FooterButtons } from '../../components/ui/FormFields';
import { UbigeoFields } from '../../components/forms/UbigeoFields';
import { DISCAPACIDADES_CONADIS } from '../../data/ubigeo';

// ── Tipos ──────────────────────────────────────────────────────
interface UsoTiempoDia {
    estudiar: number;
    trabajar: number;
    dormir: number;
    jugar: number;
}

interface NnaPersonalData {
    nombres: string; apellidoPaterno: string; apellidoMaterno: string;
    sexo: string; fechaNacimiento: string;
    departamentoNac: string; provinciaNac: string; distritoNac: string;
    tipoDoc: string; numeroDoc: string; tienePartidaNacimiento: string; detalleSinDoc: string;
    estudiaActualmente: boolean; nivelEducativo: string; gradoEstudio: string;
    institucionEducativa: string; modalidadEstudio: string; detalleNoEstudia: string;
    afiliadoSIS: string; afiliadoOtroSeguro: string; detalleOtroSeguro: string;
    sufreEnfermedad: string; detalleEnfermedad: string; observacionesSalud: string;
    tieneDiscapacidad: boolean; tipoDiscapacidad: string;
    actividadesTiempoLibre: string; caracteristicas: string;
    tieneAntecedenteAlbergue: boolean; detalleAntecedenteAlbergue: string;
    usoTiempo?: Record<string, UsoTiempoDia>;
}
interface NnaFormData {
    zonaIntervencion: string;
    departamentoDom: string; provinciaDom: string; distritoDom: string;
    perfil: string; situacionCalle: string;
    fechaAbordaje: string; fechaIngreso: string; fechaReingreso: string; fechaCambioPerfil: string;
    domicilioActual: string; referenciaDomicilio: string; telefonoContacto: string;
    nnas: NnaPersonalData[];
    actividadRealizada: string; tiempoEnCalle: string;
    horarioInicio: string; horarioFin: string; horarioInicio2: string; horarioFin2: string;
    diasTrabajo: string; condicion: string;
    viveCon: string; detalleViveCon: string; lugarPernocte: string; detalleLugarPernocte: string;
    nombreTutor: string;
}

const SECTIONS = [
    { id: 'paso1_generales', label: 'Datos Generales',    icon: MapPin,     description: 'Intervención y fechas' },
    { id: 'paso2_personales', label: 'Datos Personales',  icon: Users,      description: 'Identidad y domicilio' },
    { id: 'paso3_perfil',    label: 'Datos Perfil',        icon: Briefcase,  description: 'Actividad en calle' },
    { id: 'paso4_educacion', label: 'Educación',           icon: School,     description: 'Situación educativa' },
    { id: 'paso5_salud',     label: 'Salud',               icon: HeartPulse, description: 'Seguro y discapacidad' },
    { id: 'paso6_familia',   label: 'Familia / Otros',     icon: Home,       description: 'Vivienda y observaciones' },
];

export const NnaCreatePage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { createNna, updateExpediente, fetchExpediente, selectedExpediente, isLoading, error: storeError } = useNnaStore();
    const [submitting, setSubmitting] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [activeSection, setActiveSection] = useState('paso1_generales');

    const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<NnaFormData>({
        defaultValues: {
            nnas: [{ nombres: '', apellidoPaterno: '', apellidoMaterno: '', numeroDoc: '', fechaNacimiento: '',
                tipoDoc: 'DNI', sexo: '', estudiaActualmente: false, tieneDiscapacidad: false, tienePartidaNacimiento: 'true',
                usoTiempo: {} as Record<string, UsoTiempoDia> }],
            situacionCalle: '', perfil: '', condicion: '', diasTrabajo: ''
        }
    });

    const { fields, append, remove } = useFieldArray({ control, name: 'nnas' });

    useEffect(() => {
        if (id) { setIsEditMode(true); fetchExpediente(Number(id)); }
    }, [id, fetchExpediente]);

    useEffect(() => {
        if (!isEditMode || !selectedExpediente?.length) return;
        const mainNna = selectedExpediente[0];
        const activeCase = mainNna.casos?.find((c: any) => c.estado !== 'CERRADO') || mainNna.casos?.[0];
        const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        const emptyUso = () => {
            const u: any = {};
            DIAS.forEach(d => { u[d] = { estudiar: 0, trabajar: 0, dormir: 0, jugar: 0 }; });
            return u;
        };
        const parseUsoTiempo = (nna: any) => {
            if (nna.datosF03) {
                try { const p = typeof nna.datosF03 === 'string' ? JSON.parse(nna.datosF03) : nna.datosF03; if (p?.usoTiempo) return p.usoTiempo; } catch {}
            }
            const saved = nna.actividadesTiempoLibre || '';
            if (saved.startsWith('JSON:')) { try { const p = JSON.parse(saved.slice(5)); if (p?.grid) return p.grid; } catch {} }
            return emptyUso();
        };
        reset({
            zonaIntervencion: activeCase?.zonaIntervencion || '',
            perfil: activeCase?.perfil || '',
            situacionCalle: activeCase?.situacionCalle || '',
            fechaAbordaje: activeCase?.fechaAbordaje?.split('T')[0] || '',
            fechaIngreso: activeCase?.fechaIngreso?.split('T')[0] || '',
            fechaReingreso: activeCase?.fechaReingreso?.split('T')[0] || '',
            fechaCambioPerfil: activeCase?.fechaCambioPerfil?.split('T')[0] || '',
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
            viveCon: mainNna.viveCon || '',
            detalleViveCon: mainNna.detalleViveCon || '',
            lugarPernocte: mainNna.lugarPernocte || '',
            detalleLugarPernocte: mainNna.detalleLugarPernocte || '',
            nombreTutor: mainNna.nombreTutor || '',
            nnas: selectedExpediente.map((nna: any) => ({
                id: nna.id,
                nombres: nna.nombres, apellidoPaterno: nna.apellidoPaterno, apellidoMaterno: nna.apellidoMaterno,
                numeroDoc: nna.numeroDoc || '', fechaNacimiento: nna.fechaNacimiento?.split('T')[0] || '',
                tipoDoc: nna.tipoDoc, sexo: nna.sexo || '',
                tienePartidaNacimiento: nna.tienePartidaNacimiento ? 'true' : 'false',
                detalleSinDoc: nna.detalleSinDoc || '',
                departamentoNac: nna.departamentoNac || '', provinciaNac: nna.provinciaNac || '', distritoNac: nna.distritoNac || '',
                estudiaActualmente: nna.estudiaActualmente, nivelEducativo: nna.nivelEducativo || '',
                gradoEstudio: nna.gradoEstudio || '', institucionEducativa: nna.institucionEducativa || '',
                modalidadEstudio: nna.modalidadEstudio || '', detalleNoEstudia: nna.detalleNoEstudia || '',
                afiliadoSIS: nna.afiliadoSIS || '', afiliadoOtroSeguro: nna.afiliadoOtroSeguro || '',
                detalleOtroSeguro: nna.detalleOtroSeguro || '', sufreEnfermedad: nna.sufreEnfermedad || '',
                detalleEnfermedad: nna.detalleEnfermedad || '', observacionesSalud: nna.observacionesSalud || '',
                tieneDiscapacidad: nna.tieneDiscapacidad, tipoDiscapacidad: nna.tipoDiscapacidad || '',
                actividadesTiempoLibre: nna.actividadesTiempoLibre || '', caracteristicas: nna.caracteristicas || '',
                tieneAntecedenteAlbergue: nna.tieneAntecedenteAlbergue, detalleAntecedenteAlbergue: nna.detalleAntecedenteAlbergue || '',
                usoTiempo: parseUsoTiempo(nna),
            }))
        });
    }, [isEditMode, selectedExpediente, reset]);

    const onSubmit = async (data: NnaFormData) => {
        setSubmitting(true);
        setFormError(null);
        const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        data.nnas = data.nnas.map(nna => {
            const ut = nna.usoTiempo || {};
            const sum: Record<string, number> = { estudiar: 0, trabajar: 0, dormir: 0, jugar: 0 };
            DIAS.forEach(d => {
                const dd = (ut as any)[d] || { estudiar: 0, trabajar: 0, dormir: 0, jugar: 0 };
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
            } else {
                await createNna({ createNewCarpeta: true, ...data });
            }
            navigate('/nna');
        } catch (e: any) {
            setFormError(e?.message ?? 'Error al guardar el expediente. Verifica los datos e intenta nuevamente.');
        } finally {
            setSubmitting(false);
        }
    };

    const currentIndex = SECTIONS.findIndex(s => s.id === activeSection);
    const handleNext = () => { if (currentIndex < SECTIONS.length - 1) setActiveSection(SECTIONS[currentIndex + 1].id); };
    const handlePrev = () => { if (currentIndex > 0) setActiveSection(SECTIONS[currentIndex - 1].id); };
    const isLastStep = currentIndex === SECTIONS.length - 1;

    // ── Input class compartido para textareas y time inputs ──
    const inputCls = 'w-full bg-surface text-fg text-body px-3 py-2.5 rounded-md border border-border-strong outline-none transition-shadow focus:border-primary focus:shadow-[0_0_0_3px_color-mix(in_oklch,var(--color-primary)_18%,transparent)] placeholder:text-fg-muted';

    return (
        <div className="flex h-[calc(100vh-3.5rem)] lg:h-screen gap-0 bg-bg overflow-hidden">

            {/* ── Sidebar de secciones ── */}
            <aside className="w-52 flex-shrink-0 bg-surface border-r border-border flex flex-col overflow-hidden">
                <div className="px-4 py-4 border-b border-primary/20 bg-primary">
                    <p className="text-primary-fg font-semibold text-[13px] leading-tight">Ficha de Inscripción</p>
                    <p className="text-primary-fg/70 text-[11px] mt-0.5">Formato F03 · Registro Oficial</p>
                </div>

                <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
                    {SECTIONS.map((section, idx) => {
                        const isActive = activeSection === section.id;
                        const isPast   = currentIndex > idx;
                        const Icon     = section.icon;
                        return (
                            <button
                                key={section.id}
                                type="button"
                                onClick={() => setActiveSection(section.id)}
                                className={clsx(
                                    'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md transition-colors text-left',
                                    isActive
                                        ? 'bg-primary-soft text-primary'
                                        : 'text-fg-secondary hover:bg-surface-muted hover:text-fg'
                                )}
                            >
                                <div className={clsx(
                                    'w-5 h-5 rounded-full grid place-items-center text-[10px] font-bold flex-shrink-0',
                                    isActive ? 'bg-primary text-primary-fg'
                                        : isPast ? 'bg-primary-soft text-primary'
                                        : 'bg-surface-muted text-fg-muted border border-border'
                                )}>
                                    {idx + 1}
                                </div>
                                <div className="min-w-0">
                                    <p className={clsx('text-[12px] font-semibold leading-tight truncate', isActive ? 'text-primary' : '')}>{section.label}</p>
                                    <p className="text-[10px] text-fg-muted truncate">{section.description}</p>
                                </div>
                            </button>
                        );
                    })}
                </nav>

                <div className="px-4 py-3 border-t border-border bg-surface-muted">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] text-fg-muted font-medium">Progreso</span>
                        <span className="text-[10px] text-primary font-semibold">{currentIndex + 1}/{SECTIONS.length}</span>
                    </div>
                    <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                        <div className="bg-primary h-full rounded-full transition-all duration-300"
                            style={{ width: `${((currentIndex + 1) / SECTIONS.length) * 100}%` }} />
                    </div>
                </div>
            </aside>

            {/* ── Formulario principal ── */}
            <main className="flex-1 bg-surface flex flex-col overflow-hidden">
                <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
                    <div className="flex-1 overflow-y-auto p-8">

                        {/* Error global */}
                        {(storeError || formError) && (
                            <div className="flex items-start gap-2 bg-danger-soft border border-danger/20 text-danger rounded-md px-4 py-3 text-[13px] mb-6">
                                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                                {formError || storeError}
                            </div>
                        )}

                        {/* ── PASO 1: Datos Generales ── */}
                        {activeSection === 'paso1_generales' && (
                            <div className="space-y-6">
                                <SectionHeader title="I. Datos Generales" subtitle="Ubicación de la intervención y marco temporal." />

                                <InputField
                                    label="Zona de Intervención"
                                    register={register('zonaIntervencion', { required: 'La zona es obligatoria' })}
                                    placeholder="Ej: Plaza de Armas, Jr. Comercio…"
                                    error={errors.zonaIntervencion}
                                    required
                                />

                                {/* Perfil */}
                                <div>
                                    <label className="text-caption text-fg-secondary block mb-2">Perfil del NNA</label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {['TRABAJO_EN_CALLE', 'MENDICIDAD', 'VIDA_EN_CALLE', 'EXPLOTACION_SEXUAL'].map(perf => (
                                            <label key={perf} className={clsx(
                                                'cursor-pointer border rounded-lg p-3 flex flex-col items-center gap-2 transition-colors hover:bg-primary-soft/50',
                                                watch('perfil') === perf ? 'border-primary bg-primary-soft' : 'border-border'
                                            )}>
                                                <input type="radio" value={perf} {...register('perfil', { required: true })} className="sr-only" />
                                                <span className={clsx('text-[11px] font-semibold text-center', watch('perfil') === perf ? 'text-primary' : 'text-fg-secondary')}>
                                                    {perf.replace(/_/g, ' ')}
                                                </span>
                                                <div className={clsx('w-3.5 h-3.5 rounded-full border-2 grid place-items-center', watch('perfil') === perf ? 'border-primary' : 'border-border-strong')}>
                                                    {watch('perfil') === perf && <div className="w-1.5 h-1.5 bg-primary rounded-full" />}
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Modalidad */}
                                <div>
                                    <label className="text-caption text-fg-secondary block mb-2">Modalidad de permanencia</label>
                                    <div className="flex gap-3">
                                        {[
                                            { val: 'TRANSITO_EN_CALLE', label: 'Tránsito en Calle' },
                                            { val: 'CONVIVENCIA_EN_CALLE', label: 'Convivencia en Calle (Pernocte)' },
                                        ].map(opt => (
                                            <label key={opt.val} className={clsx(
                                                'flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-md border transition-colors',
                                                watch('situacionCalle') === opt.val ? 'border-primary bg-primary-soft text-primary' : 'border-border text-fg-secondary hover:border-primary/40'
                                            )}>
                                                <input type="radio" value={opt.val} {...register('situacionCalle', { required: true })} className="accent-primary" />
                                                <span className="text-[13px] font-medium">{opt.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                    {errors.situacionCalle && <p className="text-danger text-[11px] mt-1">Este campo es requerido.</p>}
                                </div>

                                {/* Fechas */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-border">
                                    <InputField type="date" label="Fecha de Abordaje"     register={register('fechaAbordaje')} />
                                    <InputField type="date" label="Fecha de Ingreso"       register={register('fechaIngreso')} />
                                    <InputField type="date" label="Fecha Reingreso"        register={register('fechaReingreso')} />
                                    <InputField type="date" label="Fecha Cambio de Perfil" register={register('fechaCambioPerfil')} />
                                </div>
                            </div>
                        )}

                        {/* ── PASO 2: Datos Personales ── */}
                        {activeSection === 'paso2_personales' && (
                            <div className="space-y-8">
                                <SectionHeader title="II. Datos Personales del NNA" subtitle="Información de identidad y ubicación." />

                                {/* Domicilio compartido */}
                                <div className="bg-primary-soft/40 border border-primary/15 rounded-lg p-5">
                                    <h3 className="text-[13px] font-semibold text-primary mb-4 flex items-center gap-2">
                                        <MapPin size={14} /> Domicilio actual y contacto
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <InputField label="Domicilio Actual" register={register('domicilioActual')} placeholder="Dirección exacta" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <InputField label="Referencia" register={register('referenciaDomicilio')} placeholder="Referencia de ubicación" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="text-caption text-fg-secondary block mb-1.5">Ubicación Geográfica</label>
                                            <UbigeoFields
                                                departamento={watch('departamentoDom')} provincia={watch('provinciaDom')} distrito={watch('distritoDom')}
                                                onChange={({ departamento, provincia, distrito }) => {
                                                    setValue('departamentoDom', departamento);
                                                    setValue('provinciaDom', provincia);
                                                    setValue('distritoDom', distrito);
                                                }}
                                            />
                                        </div>
                                        <InputField label="Teléfono de Referencia" register={register('telefonoContacto')} placeholder="999…" />
                                    </div>
                                </div>

                                {/* NNA list */}
                                {fields.map((field, index) => (
                                    <div key={field.id} className="bg-surface border border-border rounded-lg p-5">
                                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                                            <h3 className="text-[14px] font-semibold text-fg flex items-center gap-2">
                                                <span className="w-6 h-6 rounded-full bg-primary text-primary-fg text-[11px] font-bold grid place-items-center">{index + 1}</span>
                                                {index === 0 ? 'NNA Principal' : 'NNA Hermano/a'}
                                            </h3>
                                            {index > 0 && (
                                                <button type="button" onClick={() => remove(index)} className="flex items-center gap-1 text-[12px] text-danger hover:text-danger/80 font-medium">
                                                    <Trash2 size={13} /> Eliminar
                                                </button>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <InputField label="Apellido Paterno *" register={register(`nnas.${index}.apellidoPaterno`, { required: true })} placeholder="Ap. Paterno" />
                                            <InputField label="Apellido Materno"   register={register(`nnas.${index}.apellidoMaterno`)} placeholder="Ap. Materno" />
                                            <InputField label="Nombres *"          register={register(`nnas.${index}.nombres`, { required: true })} placeholder="Nombres" />
                                            <SelectField label="Sexo" register={register(`nnas.${index}.sexo`)} options={[{ value:'M', label:'Masculino' },{ value:'F', label:'Femenino' }]} />
                                            <InputField type="date" label="Fecha de Nacimiento" register={register(`nnas.${index}.fechaNacimiento`)} />

                                            {/* Lugar nacimiento */}
                                            <div className="md:col-span-3 bg-surface-muted border border-border rounded-md p-3">
                                                <label className="text-micro text-fg-muted block mb-2">Lugar de Nacimiento</label>
                                                <UbigeoFields
                                                    departamento={watch(`nnas.${index}.departamentoNac`)} provincia={watch(`nnas.${index}.provinciaNac`)} distrito={watch(`nnas.${index}.distritoNac`)}
                                                    onChange={({ departamento, provincia, distrito }) => {
                                                        setValue(`nnas.${index}.departamentoNac`, departamento);
                                                        setValue(`nnas.${index}.provinciaNac`, provincia);
                                                        setValue(`nnas.${index}.distritoNac`, distrito);
                                                    }}
                                                />
                                            </div>

                                            {/* Documento */}
                                            <div className="md:col-span-3 bg-surface-muted border border-border rounded-md p-4">
                                                <label className="text-micro text-fg-muted block mb-3">Documento de Identidad</label>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <SelectField label="Tipo" register={register(`nnas.${index}.tipoDoc`)} options={[
                                                        { value:'DNI', label:'DNI' },{ value:'SIN_DOC', label:'Sin Documento' },
                                                        { value:'CEDULA', label:'Cédula Ext.' },{ value:'PARTIDA', label:'Partida Nac.' }
                                                    ]} />
                                                    <div className="md:col-span-2">
                                                        <InputField label="N° de Documento" register={register(`nnas.${index}.numeroDoc`)} placeholder="Ingrese número si tiene" />
                                                    </div>
                                                    <div>
                                                        <label className="text-caption text-fg-secondary block mb-1.5">¿Tiene Partida Nac.?</label>
                                                        <div className="flex gap-4">
                                                            {[{ val:'true', label:'SÍ' },{ val:'false', label:'NO' }].map(opt => (
                                                                <label key={opt.val} className="flex items-center gap-1.5 text-[13px] text-fg cursor-pointer">
                                                                    <input type="radio" value={opt.val} {...register(`nnas.${index}.tienePartidaNacimiento`)} className="accent-primary" />
                                                                    {opt.label}
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <InputField label="¿Por qué no tiene documento?" register={register(`nnas.${index}.detalleSinDoc`)} placeholder="Motivo…" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <button type="button"
                                    onClick={() => {
                                        const p = watch('nnas.0');
                                        append({ nombres:'', apellidoPaterno: p?.apellidoPaterno||'', apellidoMaterno: p?.apellidoMaterno||'',
                                            tipoDoc:'DNI', departamentoNac: p?.departamentoNac||'', provinciaNac: p?.provinciaNac||'', distritoNac: p?.distritoNac||'',
                                            institucionEducativa: p?.institucionEducativa||'', estudiaActualmente:true, tienePartidaNacimiento:'true', tieneDiscapacidad:false,
                                            sexo:'', fechaNacimiento:'', numeroDoc:'', detalleSinDoc:'', detalleNoEstudia:'', modalidadEstudio:'',
                                            nivelEducativo:'', gradoEstudio:'', tipoDiscapacidad:'', afiliadoSIS:'', afiliadoOtroSeguro:'', detalleOtroSeguro:'',
                                            sufreEnfermedad:'', detalleEnfermedad:'', observacionesSalud:'', actividadesTiempoLibre:'', caracteristicas:'',
                                            tieneAntecedenteAlbergue:false, detalleAntecedenteAlbergue:'',
                                            usoTiempo: {} as Record<string, UsoTiempoDia> });
                                    }}
                                    className="w-full py-3 border-2 border-dashed border-border-strong rounded-lg text-fg-secondary hover:border-primary hover:text-primary hover:bg-primary-soft/30 text-[13px] font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <Plus size={16} /> Agregar hermano/a (copia apellidos)
                                </button>
                            </div>
                        )}

                        {/* ── PASO 3: Datos de Perfil ── */}
                        {activeSection === 'paso3_perfil' && (
                            <div className="space-y-6">
                                <SectionHeader title="III. Datos Según Perfil" subtitle="Características de la situación en calle (entrevista)." />
                                <div className="bg-surface border border-border rounded-lg p-6 space-y-6">
                                    <div>
                                        <label className="text-caption text-fg-secondary block mb-1.5">Actividades que realiza en calle</label>
                                        <textarea {...register('actividadRealizada')} rows={2} className={inputCls} placeholder="Detalle la actividad…" />
                                    </div>
                                    <InputField label="¿Hace cuánto tiempo?" register={register('tiempoEnCalle')} placeholder="Ej: 6 meses, 1 año…" />

                                    {/* Horario */}
                                    <div>
                                        <label className="text-caption text-fg-secondary block mb-2">Horario de actividad</label>
                                        <div className="space-y-2 bg-surface-muted border border-border rounded-md p-4">
                                            {[['horarioInicio','horarioFin'],['horarioInicio2','horarioFin2']].map(([ini, fin], i) => (
                                                <div key={i} className={clsx('flex gap-4', i > 0 && 'pt-2 border-t border-border')}>
                                                    <div className="flex-1 flex items-center gap-2">
                                                        <span className="text-caption text-fg-secondary w-8">De:</span>
                                                        <input type="time" {...register(ini as any)} className={clsx(inputCls,'flex-1')} />
                                                    </div>
                                                    <div className="flex-1 flex items-center gap-2">
                                                        <span className="text-caption text-fg-secondary w-5">A:</span>
                                                        <input type="time" {...register(fin as any)} className={clsx(inputCls,'flex-1')} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Días */}
                                    <div>
                                        <label className="text-caption text-fg-secondary block mb-2">Días a la semana</label>
                                        <div className="grid grid-cols-7 border border-border rounded-lg overflow-hidden bg-surface">
                                            {['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].map(day => {
                                                const checked = (watch('diasTrabajo')||'').includes(day);
                                                return (
                                                    <label key={day} className={clsx('flex flex-col items-center p-3 cursor-pointer border-r last:border-r-0 border-border transition-colors', checked ? 'bg-primary-soft' : 'hover:bg-surface-muted')}>
                                                        <span className={clsx('text-[10px] font-semibold uppercase mb-1.5', checked ? 'text-primary' : 'text-fg-muted')}>{day.substring(0,3)}</span>
                                                        <input type="checkbox" className="accent-primary h-4 w-4" checked={checked}
                                                            onChange={e => {
                                                                let arr = (watch('diasTrabajo')||'').split(', ').filter(Boolean);
                                                                if (e.target.checked) { if (!arr.includes(day)) arr.push(day); } else { arr = arr.filter(d => d !== day); }
                                                                setValue('diasTrabajo', arr.join(', '));
                                                            }}
                                                        />
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Condición */}
                                    <div>
                                        <label className="text-caption text-fg-secondary block mb-2">Realiza la actividad</label>
                                        <div className="grid grid-cols-3 border border-border rounded-lg overflow-hidden">
                                            {[{val:'SOLO',label:'Solo'},{val:'PARES',label:'Con pares'},{val:'FAMILIA',label:'Con familiar/adulto'}].map(opt => (
                                                <label key={opt.val} className={clsx('flex flex-col items-center p-3 cursor-pointer border-r last:border-r-0 border-border transition-colors', watch('condicion') === opt.val ? 'bg-primary-soft text-primary' : 'hover:bg-surface-muted text-fg-secondary')}>
                                                    <input type="radio" value={opt.val} {...register('condicion', { required: true })} className="accent-primary mb-1.5" />
                                                    <span className="text-[12px] font-medium text-center">{opt.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── PASO 4: Educación ── */}
                        {activeSection === 'paso4_educacion' && (
                            <div className="space-y-6">
                                <SectionHeader title="IV. Educación" subtitle="Situación educativa de cada NNA." />
                                {fields.map((field, index) => (
                                    <div key={field.id} className="border border-border rounded-lg p-5 bg-surface">
                                        <h3 className="text-[13px] font-semibold text-fg mb-4 inline-flex items-center gap-2 bg-surface-muted px-3 py-1 rounded-md">
                                            <span className="w-5 h-5 rounded-full bg-primary text-primary-fg text-[10px] font-bold grid place-items-center">{index+1}</span>
                                            {watch(`nnas.${index}.nombres`)||'NNA Sin Nombre'} {watch(`nnas.${index}.apellidoPaterno`)}
                                        </h3>
                                        <label className="flex items-center gap-2 cursor-pointer bg-primary-soft border border-primary/20 px-3 py-2 rounded-md w-fit mb-4">
                                            <input type="checkbox" {...register(`nnas.${index}.estudiaActualmente`)} className="accent-primary w-4 h-4" />
                                            <span className="text-[13px] font-medium text-primary">¿Estudia actualmente?</span>
                                        </label>
                                        {watch(`nnas.${index}.estudiaActualmente`) ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <SelectField label="Nivel Educativo" register={register(`nnas.${index}.nivelEducativo`)} options={[{value:'INICIAL',label:'Inicial'},{value:'PRIMARIA',label:'Primaria'},{value:'SECUNDARIA',label:'Secundaria'},{value:'NO_ESCOLARIZADO',label:'No Escolarizado'}]} />
                                                <InputField label="Grado / Año" register={register(`nnas.${index}.gradoEstudio`)} placeholder="Ej: 3ro" />
                                                <InputField label="Institución Educativa" register={register(`nnas.${index}.institucionEducativa`)} placeholder="Nombre del colegio" />
                                                <SelectField label="Modalidad" register={register(`nnas.${index}.modalidadEstudio`)} options={[{value:'EBR',label:'EBR (Regular)'},{value:'EBA',label:'EBA (Alternativa)'},{value:'EBE',label:'EBE (Especial)'},{value:'CETPRO',label:'CETPRO'}]} />
                                            </div>
                                        ) : (
                                            <div className="bg-danger-soft border border-danger/15 p-4 rounded-md">
                                                <InputField label="¿Por qué no estudia?" register={register(`nnas.${index}.detalleNoEstudia`)} placeholder="Motivo de deserción…" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ── PASO 5: Salud ── */}
                        {activeSection === 'paso5_salud' && (
                            <div className="space-y-6">
                                <SectionHeader title="V. Salud" subtitle="Aseguramiento y condición de salud de cada NNA." />
                                {fields.map((field, index) => (
                                    <div key={field.id} className="border border-border rounded-lg p-5 bg-surface">
                                        <h3 className="text-[13px] font-semibold text-fg mb-4 inline-flex items-center gap-2 bg-surface-muted px-3 py-1 rounded-md">
                                            <span className="w-5 h-5 rounded-full bg-primary text-primary-fg text-[10px] font-bold grid place-items-center">{index+1}</span>
                                            {watch(`nnas.${index}.nombres`)||'NNA Sin Nombre'} {watch(`nnas.${index}.apellidoPaterno`)}
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <SelectField label="¿Afiliado al SIS?" register={register(`nnas.${index}.afiliadoSIS`)} options={[{value:'SI',label:'Sí'},{value:'NO',label:'No'},{value:'NO_SABE',label:'No sabe'}]} />
                                            <SelectField label="¿Otro seguro?" register={register(`nnas.${index}.afiliadoOtroSeguro`)} options={[{value:'SI',label:'Sí'},{value:'NO',label:'No'}]} />
                                            {watch(`nnas.${index}.afiliadoOtroSeguro`) === 'SI' && (
                                                <InputField label="¿Cuál seguro?" register={register(`nnas.${index}.detalleOtroSeguro`)} placeholder="Nombre del seguro…" />
                                            )}
                                            <SelectField label="¿Sufre alguna enfermedad?" register={register(`nnas.${index}.sufreEnfermedad`)} options={[{value:'SI',label:'Sí'},{value:'NO',label:'No'}]} />
                                            {watch(`nnas.${index}.sufreEnfermedad`) === 'SI' && (
                                                <InputField label="Detalle" register={register(`nnas.${index}.detalleEnfermedad`)} placeholder="Detalle la enfermedad…" />
                                            )}
                                            <div className="md:col-span-2">
                                                <InputField label="Observaciones de salud" register={register(`nnas.${index}.observacionesSalud`)} placeholder="Observaciones generales…" />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="flex items-center gap-2 cursor-pointer bg-warning-soft border border-warning/20 px-3 py-2 rounded-md w-fit mb-3">
                                                    <input type="checkbox" {...register(`nnas.${index}.tieneDiscapacidad`)} className="accent-primary w-4 h-4" />
                                                    <span className="text-[13px] font-medium text-fg">¿Tiene alguna discapacidad?</span>
                                                </label>
                                                {watch(`nnas.${index}.tieneDiscapacidad`) && (
                                                    <SelectField label="Tipo de Discapacidad" register={register(`nnas.${index}.tipoDiscapacidad`)}>
                                                        {DISCAPACIDADES_CONADIS.map(d => <option key={d} value={d}>{d}</option>)}
                                                    </SelectField>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ── PASO 6: Familia / Otros ── */}
                        {activeSection === 'paso6_familia' && (
                            <div className="space-y-6">
                                <SectionHeader title="VI. Familia / Otros" subtitle="Convivencia, vivienda y observaciones generales." />
                                <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <SelectField label="Vive con" register={register('viveCon')} options={[
                                            {value:'PADRE_MADRE',label:'Padre y Madre'},{value:'SOLO_PADRE',label:'Solo Padre'},
                                            {value:'SOLO_MADRE',label:'Solo Madre'},{value:'ABUELOS',label:'Abuelos'},
                                            {value:'OTROS_FAMILIARES',label:'Otros Familiares'},{value:'SOLO',label:'Solo'},
                                            {value:'OTRO',label:'Otro'}
                                        ]} />
                                        {watch('viveCon') === 'OTRO' && (
                                            <InputField label="Especificar" register={register('detalleViveCon')} placeholder="Detalle…" />
                                        )}
                                        <SelectField label="Lugar de Pernocte" register={register('lugarPernocte')} options={[
                                            {value:'DOMICILIO_FAMILIAR',label:'Domicilio Familiar'},{value:'CALLE',label:'Calle'},
                                            {value:'ALBERGUE',label:'Albergue'},{value:'OTRO',label:'Otro'}
                                        ]} />
                                        {watch('lugarPernocte') === 'OTRO' && (
                                            <InputField label="Especificar" register={register('detalleLugarPernocte')} placeholder="Detalle…" />
                                        )}
                                        <InputField label="Nombre del Tutor / Apoderado" register={register('nombreTutor')} placeholder="Nombre completo…" />
                                    </div>

                                    {/* Observaciones por NNA */}
                                    {fields.map((field, index) => (
                                        <div key={field.id} className="border-t border-border pt-4">
                                            <label className="text-[13px] font-semibold text-fg block mb-2">
                                                Observaciones — {watch(`nnas.${index}.nombres`)||`NNA ${index+1}`}
                                            </label>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="md:col-span-2">
                                                    {(() => {
                                                        const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
                                                        const ut = watch(`nnas.${index}.usoTiempo`) || {} as Record<string, UsoTiempoDia>;
                                                        const gv = (d: string, a: string) => Number((ut as any)[d]?.[a]) || 0;
                                                        const sv = (d: string, a: string, v: number) => {
                                                            const cur = { ...((ut as any)[d] || { estudiar: 0, trabajar: 0, dormir: 0, jugar: 0 }), [a]: v };
                                                            setValue(`nnas.${index}.usoTiempo` as any, { ...ut, [d]: cur });
                                                        };
                                                        const td = (d: string) => gv(d, 'estudiar') + gv(d, 'trabajar') + gv(d, 'dormir') + gv(d, 'jugar');
                                                        const sem = (a: string) => DIAS.reduce((s, d) => s + gv(d, a), 0);
                                                        const promSueño = Math.round((sem('dormir') / 7) * 10) / 10;
                                                        const cols: Record<string, string> = { estudiar: '#6366f1', trabajar: '#f59e0b', dormir: '#14b8a6', jugar: '#10b981' };
                                                        let riesgo = 'Sin Riesgo'; let rColor = 'var(--color-fg-muted)'; let rBg = 'var(--color-surface-muted)';
                                                        if (sem('trabajar') > 30 || promSueño < 6) { riesgo = 'Riesgo Crítico'; rColor = 'var(--color-danger)'; rBg = 'var(--color-danger-soft)'; }
                                                        else if (sem('trabajar') > 14 || promSueño < 8 || sem('trabajar') > sem('estudiar')) { riesgo = 'Riesgo Moderado'; rColor = 'var(--color-warning)'; rBg = 'var(--color-warning-soft)'; }
                                                        else if (sem('trabajar') > 0) { riesgo = 'Riesgo Leve'; rColor = '#ca8a04'; rBg = '#fefce8'; }
                                                        return (
                                                            <div className="space-y-2 mb-4 p-3 bg-surface border border-border rounded-lg">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[12px] font-semibold text-fg">Matriz de Uso de Tiempo (horas/día)</span>
                                                                    {riesgo !== 'Sin Riesgo' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: rColor, backgroundColor: rBg }}>{riesgo}</span>}
                                                                </div>
                                                                <div className="overflow-x-auto">
                                                                    <table className="w-full text-[11px] border-collapse">
                                                                        <thead><tr className="bg-surface-muted">
                                                                            <th className="p-1 text-left font-semibold text-fg-muted w-14">Día</th>
                                                                            {['Est','Tra','Dor','Jug'].map((l,i) => <th key={l} className="p-1 text-center font-semibold" style={{ color: Object.values(cols)[i] }}>{l}</th>)}
                                                                            <th className="p-1 text-center font-semibold text-fg-muted w-12">Σ</th>
                                                                            <th className="p-1 w-24">Distrib.</th>
                                                                        </tr></thead>
                                                                        <tbody>{DIAS.map(d => {
                                                                            const t = td(d); const ok = t <= 24;
                                                                            return <tr key={d} className="border-t border-border" style={!ok ? { backgroundColor: 'var(--color-danger-soft)' } : {}}>
                                                                                <td className="p-1 font-medium text-fg-secondary text-[10px]">{d.substring(0, 3)}</td>
                                                                                {['estudiar','trabajar','dormir','jugar'].map(a => <td key={a} className="p-0.5">
                                                                                    <input type="number" min={0} max={24} step={0.5} value={gv(d, a) || ''}
                                                                                        onChange={e => sv(d, a, Math.max(0, Math.min(24, Number(e.target.value) || 0)))}
                                                                                        className={`w-full text-center text-[11px] p-1 rounded border ${!ok ? 'border-danger' : 'border-border'} outline-none focus:border-primary`}
                                                                                    />
                                                                                </td>)}
                                                                                <td className={`p-1 text-center font-bold text-[11px] ${ok ? 'text-success' : 'text-danger'}`}>{t}</td>
                                                                                <td className="p-1"><div className="w-full h-2.5 rounded-full bg-border flex overflow-hidden">
                                                                                    {['estudiar','trabajar','dormir','jugar'].map(a => { const p = t > 0 ? (gv(d, a) / t) * 100 : 0; return p > 0 ? <div key={a} style={{ width: `${p}%`, backgroundColor: cols[a] }} className="h-full transition-all" /> : null; })}
                                                                                </div></td>
                                                                            </tr>;
                                                                        })}</tbody>
                                                                        <tfoot><tr className="bg-surface-muted font-semibold border-t-2 border-border">
                                                                            <td className="p-1 text-fg-muted text-[10px]">Semanal</td>
                                                                            {['estudiar','trabajar','dormir','jugar'].map(a => <td key={a} className="p-1 text-center text-[11px]" style={{ color: sem(a) > 0 ? cols[a] : 'var(--color-fg-muted)' }}>{sem(a)}h</td>)}
                                                                            <td className="p-1 text-center text-[11px] text-fg">{DIAS.reduce((s, d) => s + td(d), 0)}h</td>
                                                                            <td></td>
                                                                        </tr></tfoot>
                                                                    </table>
                                                                </div>
                                                                {!DIAS.every(d => td(d) <= 24) && <div className="text-[10px] text-danger font-semibold">⚠ Algunos días superan las 24h</div>}
                                                                {promSueño < 8 && <div className="text-[10px] text-info font-semibold bg-info-soft px-2 py-1 rounded">💤 Prom. sueño: {promSueño}h/día {promSueño < 6 ? '(Crítico)' : '(Bajo recomendado)'}</div>}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                                <div>
                                                    <label className="text-caption text-fg-secondary block mb-1.5">Características del NNA</label>
                                                    <textarea {...register(`nnas.${index}.caracteristicas`)} rows={2} className={inputCls} placeholder="Actitudes, comportamiento…" />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="flex items-center gap-2 cursor-pointer bg-info-soft border border-info/20 px-3 py-2 rounded-md w-fit mb-2">
                                                        <input type="checkbox" {...register(`nnas.${index}.tieneAntecedenteAlbergue`)} className="accent-primary w-4 h-4" />
                                                        <span className="text-[13px] font-medium text-fg">¿Tiene antecedente en albergue?</span>
                                                    </label>
                                                    {watch(`nnas.${index}.tieneAntecedenteAlbergue`) && (
                                                        <InputField label="Detalle" register={register(`nnas.${index}.detalleAntecedenteAlbergue`)} placeholder="Nombre del albergue, fecha…" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <FooterButtons
                        onBack={currentIndex > 0 ? handlePrev : undefined}
                        onNext={!isLastStep ? handleNext : undefined}
                        onSave={isLastStep ? () => {} : undefined}
                        loading={submitting || isLoading}
                        submitLabel={isEditMode ? 'Actualizar Expediente' : 'Crear Expediente'}
                    />
                </form>
            </main>
        </div>
    );
};
