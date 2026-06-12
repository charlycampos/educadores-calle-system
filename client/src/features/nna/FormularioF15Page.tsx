import React, { useEffect, useState, useMemo } from 'react';
import { confirmar } from '../../components/ui/ConfirmDialog';
import { toast } from '../../components/ui/Toast';
import { useNavigate, useParams } from 'react-router-dom';
import { createUrgencia, getUrgenciaById, updateUrgencia, type UrgenciaF15, updateEstadoUrgencia } from '../../api/urgencia.api';
import { Siren, ArrowLeft, Save, AlertCircle, Sparkles } from 'lucide-react';
import { UbigeoSelectorSimple } from './components/UbigeoSelectorSimple';
import { FamiliarModal } from './components/FamiliarModal';
import { useNnaStore } from '../../store/nna.store';
import { ActividadModal } from './components/ActividadModal';

const SEGUROS_PREDEFINIDOS = [
    "EsSalud",
    "Seguro Privado / EPS",
    "Seguro de FF.AA. o Policiales",
    "Seguro Escolar Privado",
    "Seguro Universitario"
];

const diffHours = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    if (isNaN(h1) || isNaN(h2)) return 0;
    const date1 = new Date(2000, 1, 1, h1, m1);
    let date2 = new Date(2000, 1, 1, h2, m2);
    if (date2 < date1) date2.setDate(date2.getDate() + 1);
    return (date2.getTime() - date1.getTime()) / (1000 * 60 * 60);
};

const calcularHorasSemanales = (agenda: any): number => {
    let total = 0;
    const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const;
    dias.forEach(dia => {
        const d = agenda[dia];
        if (d && d.activo) {
            total += diffHours(d.turno1Inicio, d.turno1Fin);
            total += diffHours(d.turno2Inicio, d.turno2Fin);
        }
    });
    return total;
};

const DIAS_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DIAS_KEYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const;

export const FormularioF15Page = () => {
    const { id } = useParams<{ id?: string }>();
    const navigate = useNavigate();
    const isEditMode = !!id;

    const [isLoading, setIsLoading] = useState(isEditMode);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'general' | 'diagnostico' | 'riesgos' | 'acciones'>('general');

    const { fetchParametros, parametros } = useNnaStore();
    const [showTutorModal, setShowTutorModal] = useState(false);
    const [editingFamiliarIndex, setEditingFamiliarIndex] = useState<number | null>(null);
    const [showActivityModal, setShowActivityModal] = useState(false);
    const [editingActivityIndex, setEditingActivityIndex] = useState<number | null>(null);

    useEffect(() => {
        fetchParametros();
    }, [fetchParametros]);

    const [formData, setFormData] = useState<UrgenciaF15>({
        fecha_atencion: new Date().toISOString().slice(0, 16),
        hora_atencion: new Date().toTimeString().slice(0, 5),
        zona_atencion: '',
        nna_ubicado: false,
        perfil: '',
        antecedentes: '',
        actividades_realiza: '',
        nombre_referido: '',
        direccion_referida: '',
        asiste_escuela: false,
        escuela_detalle: '',
        grado_escuela: '',
        tiene_dni: false,
        tiene_sis: false,
        familiares_vive: '',
        horarios_dias: '',
        riesgo_salud: '',
        riesgo_violencia: '',
        riesgo_escolar: '',
        riesgo_laboral_padres: '',
        riesgo_familiar: '',
        acciones_realizadas: '',
        otra_situacion: '',
        acuerdos: '',
        estado: 'PENDIENTE'
    });

    const [extraFields, setExtraFields] = useState({
        lugar_pernocte: '',
        detalle_lugar_pernocte: '',
        situacion_calle: '',
        nombres: '',
        apellido_paterno: '',
        apellido_materno: '',
        sexo: '',
        fecha_nacimiento: '',
        edad: '',
        unidad_edad: 'ANIOS',
        domicilio_actual: '',
        departamento_dom: '',
        provincia_dom: '',
        distrito_dom: '',
        tipo_doc: '7',
        numero_doc: '',
        asiste_escuela_situacion: 'NO',
        nivel_educativo: '',
        grado_estudio: '',
        institucion_educativa: '',
        modalidad_estudio: '',
        afiliado_sis: 'NO_SABE',
        afiliado_otro_seguro: 'NO',
        detalle_otro_seguro: '',
        tutor_nombre: '',
        tutor_parentesco: '',
        tutor_dni: '',
        tutor_telefono: '',
        personas_vive: '',
        vive_con: '3',
        detalle_vive_con: '',
        familiares: [] as any[],
        actividadesCalle: [] as any[],
        dias_trabajo: [] as string[],
        turno1_inicio: '',
        turno1_fin: '',
        turno2_inicio: '',
        turno2_fin: '',
        actividades_detalle: '',
        detalle_no_estudia: ''
    });

    // Auto-calculate age based on birth date
    useEffect(() => {
        const fechaStr = extraFields.fecha_nacimiento;
        if (fechaStr) {
            const fechaNac = new Date(fechaStr + 'T00:00:00');
            if (!isNaN(fechaNac.getTime())) {
                const hoy = new Date();
                let edadCalculada = hoy.getFullYear() - fechaNac.getFullYear();
                const m = hoy.getMonth() - fechaNac.getMonth();
                if (m < 0 || (m === 0 && hoy.getDate() < fechaNac.getDate())) {
                    edadCalculada--;
                }

                let edadFinal = edadCalculada;
                let unidadFinal = 'ANIOS';

                if (edadCalculada < 0) {
                    edadFinal = 0;
                    unidadFinal = 'ANIOS';
                } else if (edadCalculada === 0) {
                    const diffTime = Math.abs(hoy.getTime() - fechaNac.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    const diffMonths = Math.floor(diffDays / 30.44);

                    if (diffMonths > 0) {
                        edadFinal = diffMonths;
                        unidadFinal = 'MESES';
                    } else {
                        edadFinal = diffDays;
                        unidadFinal = 'DIAS';
                    }
                }

                setExtraFields(prev => ({
                    ...prev,
                    edad: String(edadFinal),
                    unidad_edad: unidadFinal
                }));
            }
        }
    }, [extraFields.fecha_nacimiento]);

    useEffect(() => {
        if (isEditMode && id) {
            const loadData = async () => {
                try {
                    const data = await getUrgenciaById(Number(id));
                    if (data.fecha_atencion) {
                        data.fecha_atencion = new Date(data.fecha_atencion).toISOString().slice(0, 16);
                    }
                    setFormData(data);

                    if (data.datos_extra) {
                        setExtraFields({
                            lugar_pernocte: data.datos_extra.lugar_pernocte || '',
                            detalle_lugar_pernocte: data.datos_extra.detalle_lugar_pernocte || '',
                            situacion_calle: data.datos_extra.situacion_calle || '',
                            nombres: data.datos_extra.nombres || '',
                            apellido_paterno: data.datos_extra.apellido_paterno || '',
                            apellido_materno: data.datos_extra.apellido_materno || '',
                            sexo: data.datos_extra.sexo || '',
                            fecha_nacimiento: data.datos_extra.fecha_nacimiento || '',
                            edad: data.datos_extra.edad || '',
                            unidad_edad: data.datos_extra.unidad_edad || 'ANIOS',
                            domicilio_actual: data.datos_extra.domicilio_actual || '',
                            departamento_dom: data.datos_extra.departamento_dom || '',
                            provincia_dom: data.datos_extra.provincia_dom || '',
                            distrito_dom: data.datos_extra.distrito_dom || '',
                            tipo_doc: data.datos_extra.tipo_doc || '7',
                            numero_doc: data.datos_extra.numero_doc || '',
                            asiste_escuela_situacion: data.datos_extra.asiste_escuela_situacion || 'NO',
                            nivel_educativo: data.datos_extra.nivel_educativo || '',
                            grado_estudio: data.datos_extra.grado_estudio || '',
                            institucion_educativa: data.datos_extra.institucion_educativa || '',
                            modalidad_estudio: data.datos_extra.modalidad_estudio || '',
                            afiliado_sis: data.datos_extra.afiliado_sis || 'NO_SABE',
                            afiliado_otro_seguro: data.datos_extra.afiliado_otro_seguro || 'NO',
                            detalle_otro_seguro: data.datos_extra.detalle_otro_seguro || '',
                            tutor_nombre: data.datos_extra.tutor_nombre || '',
                            tutor_parentesco: data.datos_extra.tutor_parentesco || '',
                            tutor_dni: data.datos_extra.tutor_dni || '',
                            tutor_telefono: data.datos_extra.tutor_telefono || '',
                            personas_vive: data.datos_extra.personas_vive || '',
                            vive_con: data.datos_extra.vive_con || '3',
                            detalle_vive_con: data.datos_extra.detalle_vive_con || '',
                            familiares: data.datos_extra.familiares || [],
                            actividadesCalle: data.datos_extra.actividadesCalle || [],
                            dias_trabajo: data.datos_extra.dias_trabajo || [],
                            turno1_inicio: data.datos_extra.turno1_inicio || '',
                            turno1_fin: data.datos_extra.turno1_fin || '',
                            turno2_inicio: data.datos_extra.turno2_inicio || '',
                            turno2_fin: data.datos_extra.turno2_fin || '',
                            actividades_detalle: data.datos_extra.actividades_detalle || '',
                            detalle_no_estudia: data.datos_extra.detalle_no_estudia || ''
                        });
                    } else {
                        // Fallback from existing flat properties
                        setExtraFields(prev => ({
                            ...prev,
                            lugar_pernocte: data.zona_atencion || '',
                            nombres: data.nombre_referido || '',
                            domicilio_actual: data.direccion_referida || '',
                            tipo_doc: data.tiene_dni ? '1' : '7',
                            asiste_escuela_situacion: data.asiste_escuela ? 'SI' : 'NO',
                            institucion_educativa: data.escuela_detalle || '',
                            grado_estudio: data.grado_escuela || '',
                            afiliado_sis: data.tiene_sis ? 'SI' : 'NO_SABE',
                            afiliado_otro_seguro: 'NO',
                            detalle_otro_seguro: '',
                            personas_vive: data.familiares_vive || '',
                            vive_con: '3',
                            detalle_vive_con: '',
                            familiares: [],
                            actividadesCalle: [],
                            actividades_detalle: data.actividades_realiza || '',
                            detalle_no_estudia: (data as any).detalle_no_estudia || ''
                        }));
                    }
                } catch (error) {
                    console.error(error);
                    setErrorMessage("Error al cargar la ficha de urgencia.");
                } finally {
                    setIsLoading(false);
                }
            };
            loadData();
        }
    }, [id, isEditMode]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleExtraInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setExtraFields(prev => ({ ...prev, [name]: value }));
    };

    const syncTutorFromFamiliares = (list: any[]) => {
        const tutor = list.find(f => f.esTutorPrincipal === 'true' || f.esTutorPrincipal === true);
        if (tutor) {
            setExtraFields(prev => ({
                ...prev,
                tutor_nombre: tutor.nombres || '',
                tutor_parentesco: tutor.parentesco || tutor.vinTutUsu || '',
                tutor_dni: tutor.dni || tutor.nroDocTutApo || '',
                tutor_telefono: tutor.telefono || tutor.telefonoReferencia || ''
            }));
        } else {
            setExtraFields(prev => ({
                ...prev,
                tutor_nombre: '',
                tutor_parentesco: '',
                tutor_dni: '',
                tutor_telefono: ''
            }));
        }
    };

    const handleSaveFamiliar = (familiarData: any) => {
        const updatedList = [...(extraFields.familiares || [])];
        const isTutor = familiarData.esTutorPrincipal === 'true' || familiarData.esTutorPrincipal === true;
        
        if (isTutor) {
            updatedList.forEach((fam, i) => {
                if (i !== editingFamiliarIndex) {
                    updatedList[i] = { ...fam, esTutorPrincipal: 'false' };
                }
            });
        }

        if (editingFamiliarIndex !== null) {
            updatedList[editingFamiliarIndex] = familiarData;
        } else {
            updatedList.push(familiarData);
        }
        
        setExtraFields(prev => ({ ...prev, familiares: updatedList }));
        syncTutorFromFamiliares(updatedList);
        setShowTutorModal(false);
        setEditingFamiliarIndex(null);
    };

    const handleSaveActivity = (actividad: any) => {
        const updatedList = [...(extraFields.actividadesCalle || [])];
        const isEdit = editingActivityIndex !== null;
        
        if (isEdit) {
            updatedList[editingActivityIndex!] = actividad;
        } else {
            updatedList.push(actividad);
        }

        const daysSet = new Set<string>();
        const formattedList: string[] = [];
        const daysOrder = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
        const daysMapEs: Record<string, string> = {
            'lunes': 'Lunes', 'martes': 'Martes', 'miercoles': 'Miércoles', 'jueves': 'Jueves', 
            'viernes': 'Viernes', 'sabado': 'Sábado', 'domingo': 'Domingo'
        };

        updatedList.forEach(act => {
            if (act.agenda) {
                daysOrder.forEach(dayKey => {
                    const d = act.agenda[dayKey];
                    if (d && d.activo) {
                        daysSet.add(daysMapEs[dayKey]);
                        const t1 = d.turno2Inicio ? `${d.turno1Inicio}-${d.turno1Fin}/${d.turno2Inicio}-${d.turno2Fin}` : `${d.turno1Inicio}-${d.turno1Fin}`;
                        formattedList.push(`${dayKey.substring(0,3).toUpperCase()}: ${t1}`);
                    }
                });
            }
        });

        const computedDays = Array.from(daysSet);
        const computedScheduleStr = formattedList.join(' | ');

        setExtraFields(prev => ({
            ...prev,
            actividadesCalle: updatedList,
            dias_trabajo: computedDays,
            actividades_detalle: updatedList.map(a => a.actividad === 'Otro (especificar)' ? a.actividadEspecifique : a.actividad).join(', ')
        }));

        setFormData(prev => ({
            ...prev,
            horarios_dias: computedScheduleStr || prev.horarios_dias,
            actividades_realiza: updatedList.map(a => a.actividad === 'Otro (especificar)' ? a.actividadEspecifique : a.actividad).join(', ')
        }));

        setShowActivityModal(false);
        setEditingActivityIndex(null);
    };

    const horasSemanalesCalculadas = useMemo(() => {
        let total = 0;
        (extraFields.actividadesCalle || []).forEach(act => {
            if (act.agenda) {
                total += calcularHorasSemanales(act.agenda);
            }
        });
        return Number(total.toFixed(1));
    }, [extraFields.actividadesCalle]);

    const horasMensualesCalculadas = Number((horasSemanalesCalculadas * 4.28).toFixed(1));

    const riesgoActividad = useMemo(() => {
        if (horasSemanalesCalculadas === 0) return { color: 'border-border text-fg-muted bg-surface', etiqueta: 'Sin Actividad', desc: 'No se han registrado horas.' };
        if (horasSemanalesCalculadas < 15) return { color: 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10', etiqueta: 'Riesgo Bajo', desc: 'Jornada leve o esporádica.' };
        if (horasSemanalesCalculadas <= 35) return { color: 'border-amber-500/30 text-amber-500 bg-amber-500/10', etiqueta: 'Riesgo Moderado', desc: 'Jornada que requiere seguimiento.' };
        return { color: 'border-rose-500/30 text-rose-500 bg-rose-500/10', etiqueta: 'Riesgo Crítico (Explotación Severa)', desc: '¡Peligro!: Jornada severa que atenta contra la integridad del menor.' };
    }, [horasSemanalesCalculadas]);

    const handleCheckboxChange = (name: keyof UrgenciaF15, checked: boolean) => {
        setFormData(prev => ({ ...prev, [name]: checked }));
    };

    const handleDiaCheckboxChange = (dia: string, checked: boolean) => {
        setExtraFields(prev => {
            const list = checked 
                ? [...prev.dias_trabajo, dia]
                : prev.dias_trabajo.filter(d => d !== dia);
            return { ...prev, dias_trabajo: list };
        });
    };

    const handleUbigeoChange = (field: 'departamento' | 'provincia' | 'distrito', value: string) => {
        const key = `${field}_dom`;
        setExtraFields(prev => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSaving(true);
            setErrorMessage(null);

            // Validaciones alineadas con las reglas del Formulario F03
            if (extraFields.tipo_doc === '1' && extraFields.numero_doc?.trim()) {
                if (!/^\d{8}$/.test(extraFields.numero_doc.trim())) {
                    setErrorMessage("El número de DNI del NNA debe contener exactamente 8 dígitos numéricos.");
                    setIsSaving(false);
                    return;
                }
            }

            if (extraFields.tutor_dni?.trim()) {
                if (!/^\d{8}$/.test(extraFields.tutor_dni.trim())) {
                    setErrorMessage("El número de DNI del tutor/apoderado debe contener exactamente 8 dígitos numéricos.");
                    setIsSaving(false);
                    return;
                }
            }

            if (extraFields.edad && extraFields.unidad_edad === 'ANIOS') {
                const edadNum = Number(extraFields.edad);
                if (!isNaN(edadNum) && edadNum >= 18) {
                    setErrorMessage("El beneficiario debe ser menor de edad (menos de 18 años) para ingresar al servicio.");
                    setIsSaving(false);
                    return;
                }
            }

            // Construct payload with flat mappings for legacy compatibility plus complete datos_extra CLOB
            const fullName = `${extraFields.nombres} ${extraFields.apellido_paterno} ${extraFields.apellido_materno}`.trim();
            const formattedSchedule = `${extraFields.dias_trabajo.join(', ')} | T1: ${extraFields.turno1_inicio}-${extraFields.turno1_fin} | T2: ${extraFields.turno2_inicio}-${extraFields.turno2_fin}`.trim();

            const payload: UrgenciaF15 = {
                ...formData,
                nombre_referido: fullName || formData.nombre_referido,
                direccion_referida: extraFields.domicilio_actual || formData.direccion_referida,
                tiene_dni: extraFields.tipo_doc === '1',
                asiste_escuela: extraFields.asiste_escuela_situacion === 'SI',
                tiene_sis: extraFields.afiliado_sis === 'SI',
                escuela_detalle: extraFields.institucion_educativa || formData.escuela_detalle,
                grado_escuela: extraFields.grado_estudio || formData.grado_escuela,
                familiares_vive: extraFields.personas_vive || formData.familiares_vive,
                horarios_dias: formattedSchedule || formData.horarios_dias,
                actividades_realiza: extraFields.actividades_detalle || formData.actividades_realiza,
                datos_extra: {
                    ...extraFields
                }
            };

            if (isEditMode && id) {
                await updateUrgencia(Number(id), payload);
            } else {
                await createUrgencia(payload);
            }

            navigate('/urgencias');
        } catch (error) {
            console.error(error);
            setErrorMessage(error instanceof Error ? error.message : "Error al guardar el formulario.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleNoLocalizado = async () => {
        if (!id) return;
        if (await confirmar('Se marcará al NNA como NO LOCALIZADO y se cerrará el caso de urgencia.', { titulo: 'Marcar como no localizado', textoConfirmar: 'Confirmar', peligro: true })) {
            try {
                setIsSaving(true);
                await updateEstadoUrgencia(Number(id), 'NO_LOCALIZADO');
                navigate('/urgencias');
            } catch {
                toast.error("Error al actualizar estado");
            } finally {
                setIsSaving(false);
            }
        }
    };

    const handleDerivacionExterna = async () => {
        if (!id) return;
        const entidad = window.prompt("Ingresa el nombre de la institución externa a la que se derivará el caso (p.ej. UPE, DEMUNA):");
        if (entidad) {
            try {
                setIsSaving(true);
                const updatedData = { 
                    ...formData, 
                    acciones_realizadas: `${formData.acciones_realizadas || ''}\nDerivado externamente a: ${entidad}`.trim()
                };
                await updateUrgencia(Number(id), updatedData);
                await updateEstadoUrgencia(Number(id), 'DERIVADO_EXTERNO');
                navigate('/urgencias');
            } catch {
                toast.error("Error al derivar el caso");
            } finally {
                setIsSaving(false);
            }
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-fg-muted mt-4 font-medium">Cargando datos del Formato 15...</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1000px] mx-auto p-4 md:p-6 space-y-6 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-surface p-6 rounded-xl border border-border shadow-sm">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate('/urgencias')}
                        className="p-2 text-fg-muted hover:text-fg hover:bg-surface-muted rounded-lg transition-colors border border-border"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 rounded-md">
                                <Siren size={20} />
                            </span>
                            <h1 className="text-xl font-bold text-fg">
                                {isEditMode ? `Editar Formato 15 (${formData.codigo_reporte})` : 'Nuevo Formato 15 — Atención Inmediata'}
                            </h1>
                        </div>
                        <p className="text-xs text-fg-muted mt-1">
                            Llene los datos observados en campo para consolidar la atención de urgencia.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isEditMode && formData.estado === 'PENDIENTE' && (
                        <>
                            <button
                                type="button"
                                onClick={handleNoLocalizado}
                                className="px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-lg transition-all"
                            >
                                No Localizado
                            </button>
                            <button
                                type="button"
                                onClick={handleDerivacionExterna}
                                className="px-3.5 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-lg transition-all"
                            >
                                Derivación Externa
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate(`/nna/nuevo?prefillFromUrgencia=${formData.id}`)}
                                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all shadow-sm"
                            >
                                <Sparkles size={14} /> Promover a F03
                            </button>
                        </>
                    )}
                </div>
            </div>

            {errorMessage && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/10 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-start gap-3">
                    <AlertCircle className="text-rose-600 shrink-0 mt-0.5" size={18} />
                    <p className="text-sm font-medium text-rose-800 dark:text-rose-400">{errorMessage}</p>
                </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-border overflow-x-auto gap-2 bg-surface p-1 rounded-t-xl">
                {([
                    { id: 'general', label: '1. Ubicación y Abordaje' },
                    { id: 'diagnostico', label: '2. Diagnóstico Inmediato' },
                    { id: 'riesgos', label: '3. Indicadores de Riesgo' },
                    { id: 'acciones', label: '4. Acciones y Acuerdos' }
                ] as const).map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2.5 text-xs font-bold whitespace-nowrap rounded-lg transition-all ${
                            activeTab === tab.id 
                                ? 'bg-primary text-white' 
                                : 'text-fg-muted hover:text-fg hover:bg-surface-muted'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="bg-surface border border-border border-t-0 rounded-b-xl p-6 shadow-sm space-y-6">
                
                {/* TAB 1: GENERAL */}
                {activeTab === 'general' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-fg-muted mb-1">Fecha de Atención *</label>
                                <input
                                    type="datetime-local"
                                    name="fecha_atencion"
                                    value={formData.fecha_atencion}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-3.5 py-2 bg-surface border border-border rounded-lg text-sm text-fg focus:ring-2 focus:ring-primary focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-fg-muted mb-1">Hora de Atención</label>
                                <input
                                    type="text"
                                    name="hora_atencion"
                                    placeholder="p.ej. 18:30"
                                    value={formData.hora_atencion}
                                    onChange={handleInputChange}
                                    className="w-full px-3.5 py-2 bg-surface border border-border rounded-lg text-sm text-fg focus:ring-2 focus:ring-primary focus:outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-fg-muted mb-1">Zona de Atención (Distrito, Avenida, Intersección) *</label>
                            <input
                                type="text"
                                name="zona_atencion"
                                placeholder="Avenida Tacna cuadra 4, Cercado de Lima"
                                value={formData.zona_atencion}
                                onChange={handleInputChange}
                                required
                                className="w-full px-3.5 py-2 bg-surface border border-border rounded-lg text-sm text-fg focus:ring-2 focus:ring-primary focus:outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-border rounded-lg p-4 bg-surface-muted/30">
                            <div>
                                <label className="block text-xs font-bold text-fg-muted mb-1">Lugar de Pernocte</label>
                                <select
                                    name="lugar_pernocte"
                                    value={extraFields.lugar_pernocte}
                                    onChange={handleExtraInputChange}
                                    className="w-full px-3.5 py-2 bg-surface border border-border rounded-lg text-sm text-fg focus:ring-2 focus:ring-primary focus:outline-none"
                                >
                                    <option value="">-- SELECCIONAR --</option>
                                    <option value="Casa Propia">Casa Propia</option>
                                    <option value="Casa Familiar">Casa Familiar</option>
                                    <option value="Calle">Calle</option>
                                    <option value="Albergue">Albergue</option>
                                    <option value="Refugio Temporal">Refugio Temporal</option>
                                    <option value="Obra">Obra</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-fg-muted mb-1">Detalle Lugar de Pernocte</label>
                                <input
                                    type="text"
                                    name="detalle_lugar_pernocte"
                                    placeholder="Hotel, Plaza de armas, etc."
                                    value={extraFields.detalle_lugar_pernocte}
                                    onChange={handleExtraInputChange}
                                    className="w-full px-3.5 py-2 bg-surface border border-border rounded-lg text-sm text-fg focus:ring-2 focus:ring-primary focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-surface-muted rounded-lg border border-border">
                            <input
                                type="checkbox"
                                id="nna_ubicado"
                                checked={formData.nna_ubicado}
                                onChange={(e) => handleCheckboxChange('nna_ubicado', e.target.checked)}
                                className="w-4.5 h-4.5 text-primary bg-surface border-border rounded focus:ring-primary"
                            />
                            <label htmlFor="nna_ubicado" className="text-sm font-semibold text-fg cursor-pointer select-none">
                                ¿Se logró ubicar al NNA en el abordaje de campo?
                            </label>
                        </div>

                        {formData.nna_ubicado && (
                            <div className="border border-border rounded-lg p-4 bg-surface-muted/30 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-fg-muted mb-1">Perfil de NNA</label>
                                        <select
                                            name="perfil"
                                            value={formData.perfil}
                                            onChange={handleInputChange}
                                            className="w-full px-3.5 py-2 bg-surface border border-border rounded-lg text-sm text-fg focus:ring-2 focus:ring-primary focus:outline-none"
                                        >
                                            <option value="">Seleccione perfil...</option>
                                            <option value="TRABAJO_CALLE">Trabajo en Calle</option>
                                            <option value="MENDICIDAD">Mendicidad</option>
                                            <option value="VIDA_CALLE">Vida en Calle</option>
                                            <option value="OTRO">Otro Perfil / Riesgo</option>
                                        </select>
                                    </div>

                                    {(formData.perfil === 'VIDA_CALLE' || formData.perfil === 'VIDA_EN_CALLE') && (
                                        <div>
                                            <label className="block text-xs font-bold text-fg-muted mb-1">Situación de Calle (Pernocte)</label>
                                            <select
                                                name="situacion_calle"
                                                value={extraFields.situacion_calle}
                                                onChange={handleExtraInputChange}
                                                className="w-full px-3.5 py-2 bg-surface border border-border rounded-lg text-sm text-fg focus:ring-2 focus:ring-primary focus:outline-none"
                                            >
                                                <option value="">-- SELECCIONAR --</option>
                                                <option value="TRANSITO_EN_CALLE">Tránsito en Calle</option>
                                                <option value="CONVIVENCIA_EN_CALLE">Convivencia en Calle (Pernocte)</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-fg-muted mb-1">Antecedentes (Descripción breve de la referencia, CEM, Línea 100 o denuncia)</label>
                            <textarea
                                name="antecedentes"
                                rows={3}
                                placeholder="NNA referido por el CEM del sector..."
                                value={formData.antecedentes}
                                onChange={handleInputChange}
                                className="w-full px-3.5 py-2 bg-surface border border-border rounded-lg text-sm text-fg focus:ring-2 focus:ring-primary focus:outline-none resize-none"
                            />
                        </div>
                    </div>
                )}

                {/* TAB 2: DIAGNÓSTICO INMEDIATO */}
                {activeTab === 'diagnostico' && (
                    <div className="space-y-6">
                        {/* Nombre Referido */}
                        <div className="border border-border rounded-lg p-4 bg-surface-muted/30 space-y-4">
                            <h3 className="text-xs font-bold uppercase text-primary border-b pb-1">Identidad de NNA</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-fg-muted mb-1">Primer Nombre / Nombres</label>
                                    <input
                                        type="text"
                                        name="nombres"
                                        placeholder="Nombres"
                                        value={extraFields.nombres}
                                        onChange={handleExtraInputChange}
                                        className="w-full px-3.5 py-2 bg-surface border border-border rounded-lg text-sm text-fg focus:ring-2 focus:ring-primary focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-fg-muted mb-1">Apellido Paterno</label>
                                    <input
                                        type="text"
                                        name="apellido_paterno"
                                        placeholder="Ap. Paterno"
                                        value={extraFields.apellido_paterno}
                                        onChange={handleExtraInputChange}
                                        className="w-full px-3.5 py-2 bg-surface border border-border rounded-lg text-sm text-fg focus:ring-2 focus:ring-primary focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-fg-muted mb-1">Apellido Materno</label>
                                    <input
                                        type="text"
                                        name="apellido_materno"
                                        placeholder="Ap. Materno"
                                        value={extraFields.apellido_materno}
                                        onChange={handleExtraInputChange}
                                        className="w-full px-3.5 py-2 bg-surface border border-border rounded-lg text-sm text-fg focus:ring-2 focus:ring-primary focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-fg-muted mb-1">Sexo</label>
                                    <select
                                        name="sexo"
                                        value={extraFields.sexo}
                                        onChange={handleExtraInputChange}
                                        className="w-full px-3.5 py-2 bg-surface border border-border rounded-lg text-sm text-fg focus:ring-2 focus:ring-primary focus:outline-none"
                                    >
                                        <option value="">Seleccione sexo...</option>
                                        <option value="1">Masculino</option>
                                        <option value="2">Femenino</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-fg-muted mb-1">Fecha de Nacimiento</label>
                                    <input
                                        type="date"
                                        name="fecha_nacimiento"
                                        value={extraFields.fecha_nacimiento}
                                        onChange={handleExtraInputChange}
                                        className="w-full px-3.5 py-2 bg-surface border border-border rounded-lg text-sm text-fg focus:ring-2 focus:ring-primary focus:outline-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-bold text-fg-muted mb-1">Edad</label>
                                        <input
                                            type="number"
                                            name="edad"
                                            value={extraFields.edad}
                                            onChange={handleExtraInputChange}
                                            className="w-full px-3.5 py-2 bg-surface border border-border rounded-lg text-sm text-fg focus:ring-2 focus:ring-primary focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-fg-muted mb-1">Unidad</label>
                                        <select
                                            name="unidad_edad"
                                            value={extraFields.unidad_edad}
                                            onChange={handleExtraInputChange}
                                            className="w-full px-3.5 py-2 bg-surface border border-border rounded-lg text-sm text-fg focus:ring-2 focus:ring-primary focus:outline-none"
                                        >
                                            <option value="ANIOS">Años</option>
                                            <option value="MESES">Meses</option>
                                            <option value="DIAS">Días</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Dirección Referida y Ubigeo */}
                        <div className="border border-border rounded-lg p-4 bg-surface-muted/30 space-y-4">
                            <h3 className="text-xs font-bold uppercase text-primary border-b pb-1">Domicilio y Ubicación Geográfica</h3>
                            <div>
                                <label className="block text-xs font-bold text-fg-muted mb-1">Domicilio Actual</label>
                                <input
                                    type="text"
                                    name="domicilio_actual"
                                    placeholder="Av. Aviación 1420 Int 4..."
                                    value={extraFields.domicilio_actual}
                                    onChange={handleExtraInputChange}
                                    className="w-full px-3.5 py-2 bg-surface border border-border rounded-lg text-sm text-fg focus:ring-2 focus:ring-primary focus:outline-none"
                                />
                            </div>
                            <div className="pt-2">
                                <UbigeoSelectorSimple
                                    departamento={extraFields.departamento_dom}
                                    provincia={extraFields.provincia_dom}
                                    distrito={extraFields.distrito_dom}
                                    onChange={handleUbigeoChange}
                                />
                            </div>
                        </div>

                        {/* Refiere contar con DNI */}
                        <div className="border border-border rounded-lg p-4 bg-surface-muted/30 space-y-4">
                            <h3 className="text-xs font-bold uppercase text-primary border-b pb-1">Documento de Identidad</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-fg-muted mb-1">Tipo Documento</label>
                                    <select
                                        name="tipo_doc"
                                        value={extraFields.tipo_doc}
                                        onChange={handleExtraInputChange}
                                        className="w-full px-3.5 py-2 bg-surface border border-border rounded-lg text-sm text-fg focus:ring-2 focus:ring-primary focus:outline-none"
                                    >
                                        <option value="1">1: DNI</option>
                                        <option value="2">2: Carné de extranjería</option>
                                        <option value="3">3: Pasaporte</option>
                                        <option value="4">4: Documento de Identidad Extranjero</option>
                                        <option value="5">5: CUI o Acta de Nacimiento</option>
                                        <option value="6">6: Certificado de Nacido Vivo - CNV</option>
                                        <option value="7">7: No tiene / Sin Documento</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-fg-muted mb-1">Nº de Documento</label>
                                    <input
                                        type="text"
                                        name="numero_doc"
                                        placeholder="Número de documento"
                                        value={extraFields.numero_doc}
                                        onChange={handleExtraInputChange}
                                        className="w-full px-3.5 py-2 bg-surface border border-border rounded-lg text-sm text-fg focus:ring-2 focus:ring-primary focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Refiere asistir a la escuela */}
                        <div className="border border-border rounded-lg p-4 bg-surface-muted/30 space-y-4">
                            <h3 className="text-xs font-bold uppercase text-primary border-b pb-1">Situación Educativa</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-fg-muted mb-1">¿Asiste a la escuela? / Situación</label>
                                    <select
                                        name="asiste_escuela_situacion"
                                        value={extraFields.asiste_escuela_situacion}
                                        onChange={handleExtraInputChange}
                                        className="w-full px-3.5 py-2 bg-surface border border-border rounded-lg text-sm text-fg focus:ring-2 focus:ring-primary focus:outline-none"
                                    >
                                        <option value="SI">Sí</option>
                                        <option value="NO">No</option>
                                        <option value="PROCESO">En Proceso</option>
                                        <option value="NO_APLICA">No Aplica</option>
                                    </select>
                                </div>
                            </div>
                            {['SI', 'PROCESO'].includes(extraFields.asiste_escuela_situacion) ? (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-200">
                                        <div>
                                            <label className="block text-xs font-bold text-fg-muted mb-1">Nivel Educativo</label>
                                            <select
                                                name="nivel_educativo"
                                                value={extraFields.nivel_educativo}
                                                onChange={handleExtraInputChange}
                                                className="w-full px-3.5 py-2 bg-surface border border-border rounded-lg text-sm text-fg focus:ring-2 focus:ring-primary focus:outline-none"
                                            >
                                                <option value="">-- SELECCIONAR --</option>
                                                <option value="1">Sin nivel (No escolarizado)</option>
                                                <option value="2">Inicial</option>
                                                <option value="3">Primaria Incompleta</option>
                                                <option value="4">Primaria Completa</option>
                                                <option value="5">Secundaria Incompleta</option>
                                                <option value="6">Secundaria Completa</option>
                                                <option value="7">Superior Técnico Incompleto</option>
                                                <option value="8">Superior Técnico Completo</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-fg-muted mb-1">Grado Escolar</label>
                                            <input
                                                type="text"
                                                name="grado_estudio"
                                                placeholder="p.ej. 3ero de Primaria"
                                                value={extraFields.grado_estudio}
                                                onChange={handleExtraInputChange}
                                                className="w-full px-3.5 py-2 bg-surface border border-border rounded-lg text-sm text-fg focus:ring-2 focus:ring-primary focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-200">
                                        <div>
                                            <label className="block text-xs font-bold text-fg-muted mb-1">Institución Educativa</label>
                                            <input
                                                type="text"
                                                name="institucion_educativa"
                                                placeholder="IE República de Panamá"
                                                value={extraFields.institucion_educativa}
                                                onChange={handleExtraInputChange}
                                                className="w-full px-3.5 py-2 bg-surface border border-border rounded-lg text-sm text-fg focus:ring-2 focus:ring-primary focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-fg-muted mb-1">Modalidad de Estudio</label>
                                            <select
                                                name="modalidad_estudio"
                                                value={extraFields.modalidad_estudio}
                                                onChange={handleExtraInputChange}
                                                className="w-full px-3.5 py-2 bg-surface border border-border rounded-lg text-sm text-fg focus:ring-2 focus:ring-primary focus:outline-none"
                                            >
                                                <option value="">-- SELECCIONAR --</option>
                                                <option value="1">EBR (Regular)</option>
                                                <option value="2">EBA (Alternativa)</option>
                                                <option value="3">EBE (Especial)</option>
                                                <option value="6">CETPRO</option>
                                            </select>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="bg-rose-50 dark:bg-rose-950/10 p-4 rounded-lg border border-rose-200 dark:border-rose-900/50 animate-in fade-in duration-200">
                                    <label className="block text-xs font-bold text-fg-muted mb-1">¿Por qué no estudia?</label>
                                    <input
                                        type="text"
                                        name="detalle_no_estudia"
                                        placeholder="Motivo de deserción o no escolaridad..."
                                        value={extraFields.detalle_no_estudia}
                                        onChange={handleExtraInputChange}
                                        className="w-full px-3.5 py-2 bg-surface border border-border rounded-lg text-sm text-fg focus:ring-2 focus:ring-primary focus:outline-none"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Seguro de Salud */}
                        <div className="border border-border rounded-lg p-4 bg-surface-muted/30 space-y-4">
                            <h3 className="text-xs font-bold uppercase text-primary border-b pb-1">Seguro de Salud</h3>
                            <div className="border rounded-lg overflow-hidden bg-surface">
                                <div className="grid grid-cols-[2fr_1fr_1fr_1fr] border-b divide-x divide-border items-center bg-surface-muted/20">
                                    <div className="p-3 text-xs font-bold text-fg-muted">¿Estás afiliado al Seguro Universal de Salud (SIS)?</div>
                                    {['SI', 'NO', 'NO_SABE'].map((opt) => (
                                        <label key={opt} className={`p-3 flex items-center justify-center cursor-pointer hover:bg-primary/5 transition-colors h-full ${extraFields.afiliado_sis === opt ? 'bg-primary/10 text-primary font-bold' : ''}`}>
                                            <input
                                                type="radio"
                                                name="afiliado_sis"
                                                value={opt}
                                                checked={extraFields.afiliado_sis === opt}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setExtraFields(prev => {
                                                        const updated = { ...prev, afiliado_sis: val };
                                                        if (val === 'SI') {
                                                            updated.afiliado_otro_seguro = 'NO';
                                                            updated.detalle_otro_seguro = '';
                                                        }
                                                        return updated;
                                                    });
                                                }}
                                                className="mr-2 accent-primary"
                                            />
                                            <span className="text-xs font-semibold">{opt === 'NO_SABE' ? 'NO SABE' : opt}</span>
                                        </label>
                                    ))}
                                </div>
                                <div className="grid grid-cols-[2fr_1fr_1fr_1fr] divide-x divide-border items-center bg-surface">
                                    <div className="p-3 text-xs font-bold text-fg-muted">¿Estás afiliado a algún otro tipo de seguro de salud?</div>
                                    {['SI', 'NO', 'NO_SABE'].map((opt) => (
                                        <label key={opt} className={`p-3 flex items-center justify-center cursor-pointer hover:bg-primary/5 transition-colors h-full ${extraFields.afiliado_otro_seguro === opt ? 'bg-primary/10 text-primary font-bold' : ''}`}>
                                            <input
                                                type="radio"
                                                name="afiliado_otro_seguro"
                                                value={opt}
                                                checked={extraFields.afiliado_otro_seguro === opt}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setExtraFields(prev => {
                                                        const updated = { ...prev, afiliado_otro_seguro: val };
                                                        if (val === 'SI') {
                                                            updated.afiliado_sis = 'NO';
                                                        } else {
                                                            updated.detalle_otro_seguro = '';
                                                        }
                                                        return updated;
                                                    });
                                                }}
                                                className="mr-2 accent-primary"
                                            />
                                            <span className="text-xs font-semibold">{opt === 'NO_SABE' ? 'NO SABE' : opt}</span>
                                        </label>
                                    ))}
                                </div>
                                {extraFields.afiliado_otro_seguro === 'SI' && (
                                    <div className="p-4 bg-primary/5 border-t border-border animate-in fade-in duration-200">
                                        <label className="block text-xs font-bold text-fg-muted mb-1">Seleccione el seguro de salud</label>
                                        <select
                                            value={
                                                SEGUROS_PREDEFINIDOS.includes(extraFields.detalle_otro_seguro || '')
                                                    ? extraFields.detalle_otro_seguro
                                                    : (extraFields.detalle_otro_seguro ? 'OTRO' : '')
                                            }
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setExtraFields(prev => ({
                                                    ...prev,
                                                    detalle_otro_seguro: val === 'OTRO' ? '' : val
                                                }));
                                            }}
                                            className="w-full px-3.5 py-2 bg-surface border border-border rounded-lg text-sm text-fg focus:ring-2 focus:ring-primary focus:outline-none"
                                        >
                                            <option value="">Seleccione un seguro...</option>
                                            {SEGUROS_PREDEFINIDOS.map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                            <option value="OTRO">Otro (Especificar)</option>
                                        </select>

                                        {(!SEGUROS_PREDEFINIDOS.includes(extraFields.detalle_otro_seguro || '') || 
                                         extraFields.detalle_otro_seguro === '') && 
                                         (extraFields.detalle_otro_seguro !== undefined) && (
                                            <div className="animate-in fade-in duration-200 mt-2">
                                                <label className="block text-xs font-bold text-fg-muted mb-1">Especifique el seguro de salud alternativo</label>
                                                <input
                                                    type="text"
                                                    name="detalle_otro_seguro"
                                                    placeholder="Ej: Mapfre, Seguro universitario particular..."
                                                    value={extraFields.detalle_otro_seguro}
                                                    onChange={handleExtraInputChange}
                                                    className="w-full px-3.5 py-2 bg-surface border border-border rounded-lg text-sm text-fg focus:ring-2 focus:ring-primary focus:outline-none"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Familiares / Apoderado */}
                        <div className="border border-border rounded-lg p-4 bg-surface-muted/30 space-y-4">
                            <div className="flex justify-between items-center border-b pb-2 border-border">
                                <h3 className="text-xs font-bold uppercase text-primary">Familiares con quienes refiere vivir</h3>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingFamiliarIndex(null);
                                        setShowTutorModal(true);
                                    }}
                                    className="px-3.5 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/95 transition-all flex items-center gap-1 shadow-sm"
                                >
                                    Agregar Familiar Responsable
                                </button>
                            </div>

                            {extraFields.familiares && extraFields.familiares.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {extraFields.familiares.map((field: any, idx: number) => {
                                        const isTutor = field.esTutorPrincipal === 'true' || field.esTutorPrincipal === true;
                                        return (
                                            <div key={idx} className={`bg-surface p-4 rounded-xl border shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${isTutor ? 'border-primary ring-1 ring-primary' : 'border-border'}`}>
                                                <div>
                                                    <div className="flex justify-between items-start">
                                                        <span className="text-[10px] font-black text-primary uppercase bg-primary/10 px-2 py-0.5 rounded">
                                                            {field.parentesco || field.vinTutUsu || 'Familiar'}
                                                        </span>
                                                        {isTutor && (
                                                            <span className="px-2.5 py-0.5 bg-primary text-white text-[9px] font-black rounded-full uppercase tracking-wider">
                                                                Tutor Principal
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-sm font-black text-fg mt-2">
                                                        {field.nombres}
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-border text-xs">
                                                        <div>
                                                            <span className="text-fg-muted font-bold text-[9px] uppercase block">DNI / Documento</span>
                                                            <span className="font-bold text-fg">{field.dni || field.nroDocTutApo || 'Sin Documento'}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-fg-muted font-bold text-[9px] uppercase block">Teléfono</span>
                                                            <span className="font-bold text-fg">{field.telefono || field.telefonoReferencia || 'No registra'}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-fg-muted font-bold text-[9px] uppercase block">Vive con NNA</span>
                                                            <span className="font-bold text-fg">{field.viveCon || 'NO'}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-fg-muted font-bold text-[9px] uppercase block">Ocupación</span>
                                                            <span className="font-bold text-fg">{field.ocupacion || 'No registra'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 justify-end mt-4 pt-2 border-t border-border">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEditingFamiliarIndex(idx);
                                                            setShowTutorModal(true);
                                                        }}
                                                        className="px-2.5 py-1 hover:bg-primary/10 rounded text-primary text-xs font-bold flex items-center gap-1 transition-all"
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const updated = extraFields.familiares.filter((_, i) => i !== idx);
                                                            setExtraFields(prev => ({ ...prev, familiares: updated }));
                                                            syncTutorFromFamiliares(updated);
                                                        }}
                                                        className="px-2.5 py-1 hover:bg-rose-500/10 rounded text-rose-500 text-xs font-bold flex items-center gap-1 transition-all"
                                                    >
                                                        Eliminar
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-6 text-xs text-fg-muted border border-dashed border-border rounded-lg bg-surface">
                                    No se han registrado familiares responsables. Registre uno utilizando el botón superior.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 3: INDICADORES DE RIESGO */}
                {activeTab === 'riesgos' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-fg-muted mb-1">Problemas de Salud (En el niño o familiar directo)</label>
                            <textarea
                                name="riesgo_salud"
                                rows={2}
                                placeholder="Describe si presenta indicios de desnutrición, asma, discapacidad..."
                                value={formData.riesgo_salud}
                                onChange={handleInputChange}
                                className="w-full px-3.5 py-2 bg-surface border border-border rounded-lg text-sm text-fg focus:ring-2 focus:ring-primary focus:outline-none resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-fg-muted mb-1">Situación de Violencia (Si refiere o se encuentra evidencia)</label>
                            <textarea
                                name="riesgo_violencia"
                                rows={2}
                                placeholder="Marcas físicas, hostilidad por parte de cuidadores en vía pública..."
                                value={formData.riesgo_violencia}
                                onChange={handleInputChange}
                                className="w-full px-3.5 py-2 bg-surface border border-border rounded-lg text-sm text-fg focus:ring-2 focus:ring-primary focus:outline-none resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-fg-muted mb-1">Situación Escolar (Deserción, atraso escolar severo)</label>
                            <textarea
                                name="riesgo_escolar"
                                rows={2}
                                placeholder="No asiste a clases hace 2 años por motivos económicos..."
                                value={formData.riesgo_escolar}
                                onChange={handleInputChange}
                                className="w-full px-3.5 py-2 bg-surface border border-border rounded-lg text-sm text-fg focus:ring-2 focus:ring-primary focus:outline-none resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-fg-muted mb-1">Situación laboral de padres</label>
                            <textarea
                                name="riesgo_laboral_padres"
                                rows={2}
                                placeholder="Padres desempleados o dedicados al comercio informal ambulatorio..."
                                value={formData.riesgo_laboral_padres}
                                onChange={handleInputChange}
                                className="w-full px-3.5 py-2 bg-surface border border-border rounded-lg text-sm text-fg focus:ring-2 focus:ring-primary focus:outline-none resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-fg-muted mb-1">Situación Familiar (Abandono, hacinamiento, desestructuración)</label>
                            <textarea
                                name="riesgo_familiar"
                                rows={2}
                                placeholder="NNA pernocta con conocidos en cuartos compartidos de hotel..."
                                value={formData.riesgo_familiar}
                                onChange={handleInputChange}
                                className="w-full px-3.5 py-2 bg-surface border border-border rounded-lg text-sm text-fg focus:ring-2 focus:ring-primary focus:outline-none resize-none"
                            />
                        </div>
                    </div>
                )}

                {/* TAB 4: ACCIONES Y ACUERDOS */}
                {activeTab === 'acciones' && (
                    <div className="space-y-6">
                        {/* Actividades en Calle (Desglosadas) */}
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Panel Izquierdo: Lista de Actividades */}
                                <div className="lg:col-span-2 bg-surface rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
                                    <div className="p-4 border-b border-border flex items-center justify-between bg-surface-muted/20">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-black text-fg uppercase tracking-wide text-xs">HORARIOS Y DÍAS EN LOS QUE REALIZA LA ACTIVIDAD</h3>
                                        </div>
                                        <span className="text-xs font-bold text-fg-muted bg-surface px-3 py-1 rounded-full shadow-sm border border-border">
                                            {(extraFields.actividadesCalle || []).length} actividades
                                        </span>
                                    </div>

                                    <div className="p-6 flex-1 space-y-6">
                                        {(!extraFields.actividadesCalle || extraFields.actividadesCalle.length === 0) ? (
                                            <div className="text-center py-10 bg-surface-muted/20 border-2 border-dashed border-border rounded-xl">
                                                <p className="text-fg-muted font-bold text-sm">No hay actividades registradas</p>
                                                <p className="text-fg-muted text-xs mb-4">Añade la primera actividad para generar la agenda.</p>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingActivityIndex(null);
                                                        setShowActivityModal(true);
                                                    }}
                                                    className="px-4 py-2 bg-primary/10 text-primary font-bold text-xs rounded-lg hover:bg-primary/20 transition-colors"
                                                >
                                                    + Agregar Actividad
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                <div className="hidden md:grid grid-cols-12 gap-4 text-[10px] font-black text-fg-muted uppercase tracking-wider pb-3 border-b border-border">
                                                    <div className="col-span-4">Actividad / Trabajo</div>
                                                    <div className="col-span-2 text-center">Acompañamiento</div>
                                                    <div className="col-span-2 text-center">Permanencia</div>
                                                    <div className="col-span-4 text-center">Agenda Semanal</div>
                                                </div>
                                         
                                                {extraFields.actividadesCalle.map((act: any, index: number) => (
                                                    <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center group relative border-b border-border py-5 last:border-0 last:pb-0">
                                                        <div className="md:col-span-4 flex items-center gap-3">
                                                            <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
                                                            <div>
                                                                <p className="font-extrabold text-fg text-xs tracking-wide uppercase">
                                                                    {act.actividad === 'Otro (especificar)' ? act.actividadEspecifique : act.actividad?.replace(/_/g, ' ')}
                                                                </p>
                                                            </div>
                                                        </div>
                                         
                                                        <div className="md:col-span-2 text-center flex justify-start md:justify-center">
                                                            <span className="text-[10px] font-bold px-3 py-1 bg-surface-muted text-fg-muted rounded-full border border-border tracking-wider uppercase">
                                                                {act.acompanamiento}
                                                            </span>
                                                        </div>
                                         
                                                        <div className="md:col-span-2 text-center flex items-center justify-start md:justify-center gap-1.5 text-fg-muted font-semibold text-xs">
                                                            <span>{act.tiempoValor} {act.tiempoUnidad?.toLowerCase()}</span>
                                                        </div>
                                         
                                                        <div className="md:col-span-4 flex flex-col items-start md:items-center">
                                                            <div className="flex gap-1.5 mb-2.5">
                                                                {DIAS_KEYS.map((k, i) => {
                                                                    const isActive = act.agenda?.[k]?.activo;
                                                                    return (
                                                                        <div key={k} className={`w-5.5 h-5.5 rounded-full flex items-center justify-center text-[9px] font-black transition-all ${isActive ? "bg-primary text-white shadow-sm border border-primary" : "bg-surface text-fg-muted border border-border"}`}>
                                                                            {DIAS_SHORT[i]}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                            
                                                            <div className="grid grid-cols-2 gap-1.5 w-full max-w-[280px]">
                                                                {DIAS_KEYS.filter(k => act.agenda?.[k]?.activo).map(k => {
                                                                    const d = act.agenda[k];
                                                                    const text = d.turno2Inicio ? `${d.turno1Inicio}-${d.turno1Fin} / ${d.turno2Inicio}-${d.turno2Fin}` : `${d.turno1Inicio}-${d.turno1Fin}`;
                                                                    return (
                                                                        <div key={k} className="bg-primary/5 border border-primary/10 rounded-lg px-2 py-1 text-primary font-bold text-[9px] flex items-center justify-between gap-1 uppercase shadow-sm">
                                                                            <span className="text-primary font-extrabold">{k.substring(0,2)}:</span>
                                                                            <span className="font-mono tracking-tighter text-[8.5px]">{text}</span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>

                                                        {/* Acciones Hover/Click */}
                                                        <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity bg-surface/90 backdrop-blur pl-2 flex gap-1 shadow-sm rounded-lg border border-border">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setEditingActivityIndex(index);
                                                                    setShowActivityModal(true);
                                                                }}
                                                                className="p-2 text-primary hover:bg-primary/10 rounded-md transition-colors"
                                                            >
                                                                Editar
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const updated = extraFields.actividadesCalle.filter((_, i) => i !== index);
                                                                    setExtraFields(prev => ({ ...prev, actividadesCalle: updated }));
                                                                }}
                                                                className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors"
                                                            >
                                                                Eliminar
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingActivityIndex(null);
                                                        setShowActivityModal(true);
                                                    }}
                                                    className="w-full py-4 border-2 border-dashed border-primary/20 rounded-xl text-primary font-bold text-sm uppercase tracking-wider hover:bg-primary/5 hover:border-primary/30 transition-all flex items-center justify-center gap-2"
                                                >
                                                    Agregar Actividad
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Panel Derecho: Cómputo General Horario */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-fg uppercase border-b pb-2 flex items-center gap-2">
                                        Cómputo General Horario
                                    </h3>

                                    <div className="bg-gradient-to-br from-primary to-indigo-600 text-white rounded-xl p-5 relative shadow overflow-hidden">
                                        <span className="text-[10px] font-black uppercase tracking-wider block opacity-85">Horas por Semana</span>
                                        <span className="text-5xl font-extrabold block mt-2 tracking-tight">{horasSemanalesCalculadas} <span className="text-sm font-normal">hrs</span></span>
                                        <span className="text-[10px] block mt-2 opacity-80">Suma total de todas las actividades</span>
                                    </div>

                                    <div className="bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white rounded-xl p-5 relative shadow overflow-hidden">
                                        <span className="text-[10px] font-black uppercase tracking-wider block opacity-85">Horas Mensuales (Est.)</span>
                                        <span className="text-5xl font-extrabold block mt-2 tracking-tight">{horasMensualesCalculadas} <span className="text-sm font-normal">hrs</span></span>
                                        <span className="text-[10px] block mt-2 opacity-80">Promedio mensual global</span>
                                    </div>

                                    <div className={`border-2 rounded-xl p-5 space-y-3 transition-all duration-300 ${riesgoActividad.color}`}>
                                        <div className="flex items-center justify-between border-b border-current/15 pb-2">
                                            <span className="text-[10px] font-black uppercase tracking-wider block">Intensidad Laboral</span>
                                        </div>
                                        <span className="text-base font-black block leading-tight">{riesgoActividad.etiqueta}</span>
                                        <p className="text-xs leading-relaxed opacity-90">{riesgoActividad.desc}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-fg-muted mb-1">Acciones realizadas (En caso de requerir coordinación inmediata)</label>
                            <textarea
                                name="acciones_realizadas"
                                rows={3}
                                placeholder="Se brindó contención inicial y se coordinó con la fiscalía de familia..."
                                value={formData.acciones_realizadas}
                                onChange={handleInputChange}
                                className="w-full px-3.5 py-2 bg-surface border border-border rounded-lg text-sm text-fg focus:ring-2 focus:ring-primary focus:outline-none resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-fg-muted mb-1">Otra situación encontrada (Fuera del perfil regular)</label>
                            <textarea
                                name="otra_situacion"
                                rows={3}
                                placeholder="Describe hallazgos adicionales relevantes..."
                                value={formData.otra_situacion}
                                onChange={handleInputChange}
                                className="w-full px-3.5 py-2 bg-surface border border-border rounded-lg text-sm text-fg focus:ring-2 focus:ring-primary focus:outline-none resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-fg-muted mb-1">Acuerdos (Compromisos para siguiente visita o posterior encuentro)</label>
                            <textarea
                                name="acuerdos"
                                rows={3}
                                placeholder="Se coordinó nueva visita para mañana a las 5:00 PM con la madre..."
                                value={formData.acuerdos}
                                onChange={handleInputChange}
                                className="w-full px-3.5 py-2 bg-surface border border-border rounded-lg text-sm text-fg focus:ring-2 focus:ring-primary focus:outline-none resize-none"
                            />
                        </div>
                    </div>
                )}

                {/* Submit Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                    <button
                        type="button"
                        onClick={() => navigate('/urgencias')}
                        className="px-4 py-2 text-sm font-semibold text-fg hover:bg-surface-muted rounded-lg border border-border transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors shadow-sm disabled:opacity-50"
                    >
                        <Save size={16} />
                        {isSaving ? 'Guardando...' : 'Guardar Formato 15'}
                    </button>
                </div>
            </form>

            <FamiliarModal
                isOpen={showTutorModal}
                onClose={() => {
                    setShowTutorModal(false);
                    setEditingFamiliarIndex(null);
                }}
                onSave={handleSaveFamiliar}
                initialData={editingFamiliarIndex !== null ? extraFields.familiares[editingFamiliarIndex] : null}
                parametros={parametros}
                editingIndex={editingFamiliarIndex}
            />

            <ActividadModal
                isOpen={showActivityModal}
                onClose={() => {
                    setShowActivityModal(false);
                    setEditingActivityIndex(null);
                }}
                onSave={handleSaveActivity}
                initialData={editingActivityIndex !== null ? extraFields.actividadesCalle[editingActivityIndex] : undefined}
            />
        </div>
    );
};
