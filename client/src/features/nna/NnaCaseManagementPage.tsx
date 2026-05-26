import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNnaStore } from '../../store/nna.store';
import { getPtiByCaso, createPti, addAccion, updateAccion, deleteAccion, type PlanTrabajo, type AccionPTI } from '../../api/pti.api';
import { getDiarioByCaso, createEntradaDiario, deleteEntradaDiario, type EntradaDiario } from '../../api/diario.api';
import { getDerivacionesByCaso, createDerivacion, type Derivacion } from '../../api/derivacion.api';
import { ArrowLeft, Plus, Trash2, CheckCircle, Clock, Calendar, ClipboardList, X, Building2, FileText, AlertTriangle, Send } from 'lucide-react';
import { useForm, useFieldArray, type SubmitHandler } from 'react-hook-form';
import clsx from 'clsx';

type AccionForm = {
    descripcion: string;
    meta: string;
    plazo: string;
    responsable: string;
};

type PtiFormValues = {
    objetivoGeneral: string;
    acciones: AccionForm[];
};

export const NnaCaseManagementPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { fetchExpediente, selectedExpediente, isLoading } = useNnaStore();

    // State
    const [activeTab, setActiveTab] = useState<'pti' | 'diario' | 'derivacion'>('pti');
    // PTI State
    const [currentPti, setCurrentPti] = useState<PlanTrabajo | null>(null);
    const [loadingPti, setLoadingPti] = useState(false);
    const [isCreatingPti, setIsCreatingPti] = useState(false);

    // Diario State
    const [diarioEntries, setDiarioEntries] = useState<EntradaDiario[]>([]);
    const [isCreatingDiario, setIsCreatingDiario] = useState(false);

    // Derivacion State
    const [derivaciones, setDerivaciones] = useState<Derivacion[]>([]);
    const [isCreatingDerivacion, setIsCreatingDerivacion] = useState(false);

    // Get specific NNA from the fetched expediente
    const nna = selectedExpediente?.find(n => n.id === Number(id));
    const activeCase = nna?.casos?.find((c: any) => c.estado !== 'CERRADO');

    // Forms ==================================================================
    const { register, control, handleSubmit, reset } = useForm<PtiFormValues>({
        defaultValues: { acciones: [{ descripcion: '', meta: '', plazo: '', responsable: '' }] }
    });
    const { fields, append, remove } = useFieldArray({ control, name: 'acciones' });

    // New Action Form (for existing PTI)
    const { register: registerNew, handleSubmit: handleNewAction, reset: resetNew } = useForm<AccionForm>();

    // Diario Form
    const { register: registerDiario, handleSubmit: handleDiarioSubmit, reset: resetDiario } = useForm<EntradaDiario>({
        defaultValues: { fecha: new Date().toISOString().slice(0, 16) } // Local datetime default
    });

    // Derivacion Form
    const { register: registerDerivacion, handleSubmit: handleDerivacionSubmit, reset: resetDerivacion } = useForm<Derivacion>();


    // Effects ================================================================
    useEffect(() => {
        if (id) fetchExpediente(Number(id));
    }, [id, fetchExpediente]);

    useEffect(() => {
        if (activeCase?.id) {
            if (activeTab === 'pti') loadPti(activeCase.id);
            if (activeTab === 'diario') loadDiario(activeCase.id);
            if (activeTab === 'derivacion') loadDerivaciones(activeCase.id);
        }
    }, [activeCase, activeTab]);

    // Loaders ================================================================
    const loadPti = async (casoId: number) => {
        setLoadingPti(true);
        try {
            const data = await getPtiByCaso(casoId);
            setCurrentPti(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingPti(false);
        }
    };

    const loadDiario = async (casoId: number) => {
        try {
            const data = await getDiarioByCaso(casoId);
            setDiarioEntries(data);
        } catch (error) {
            console.error(error);
        }
    };

    const loadDerivaciones = async (casoId: number) => {
        try {
            const data = await getDerivacionesByCaso(casoId);
            setDerivaciones(data);
        } catch (error) { console.error(error); }
    };

    // Handlers ===============================================================
    const onSaveDiario: SubmitHandler<EntradaDiario> = async (data) => {
        if (!activeCase) return;
        try {
            await createEntradaDiario(activeCase.id, data);
            setIsCreatingDiario(false);
            resetDiario({ fecha: new Date().toISOString().slice(0, 16) });
            loadDiario(activeCase.id);
        } catch (error) {
            alert('Error al guardar diario');
        }
    };

    const onSaveDerivacion: SubmitHandler<Derivacion> = async (data) => {
        if (!activeCase) return;
        try {
            await createDerivacion({ ...data, casoId: activeCase.id });
            setIsCreatingDerivacion(false);
            resetDerivacion();
            loadDerivaciones(activeCase.id);
        } catch (error) { alert('Error al guardar derivación'); }
    };

    const onDeleteDiario = async (id: number) => {
        if (!confirm('¿Eliminar registro?')) return;
        try {
            await deleteEntradaDiario(id);
            if (activeCase) loadDiario(activeCase.id);
        } catch (error) {
            alert('Error al eliminar');
        }
    };

    const onCreatePti: SubmitHandler<PtiFormValues> = async (data) => {
        if (!activeCase) return;
        try {
            await createPti(activeCase.id, data);
            setIsCreatingPti(false);
            loadPti(activeCase.id);
        } catch (error) {
            alert('Error al crear PTI');
        }
    };

    const onAddAction: SubmitHandler<AccionForm> = async (data) => {
        if (!currentPti) return;
        try {
            await addAccion(currentPti.id, data);
            resetNew();
            loadPti(activeCase.id);
        } catch (error) {
            alert('Error al agregar acción');
        }
    };

    const onDeleteAction = async (accionId?: number) => {
        if (!accionId) return;
        if (!confirm('¿Eliminar acción?')) return;
        try {
            await deleteAccion(accionId);
            loadPti(activeCase.id);
        } catch (error) {
            alert('Error al eliminar');
        }
    };

    const onToggleStatus = async (accion: AccionPTI) => {
        if (!accion.id) return;
        const newStatus = accion.estado === 'CUMPLIDO' ? 'PENDIENTE' : 'CUMPLIDO';
        try {
            await updateAccion(accion.id, { estado: newStatus });
            loadPti(activeCase.id);
        } catch (error) {
            alert('Error al actualizar estado');
        }
    };

    if (isLoading || !nna) return <div className="p-8">Cargando NNA...</div>;

    if (!activeCase) {
        return (
            <div className="p-8 max-w-4xl mx-auto text-center">
                <h1 className="text-2xl font-bold text-gray-800">Este NNA no tiene un caso activo.</h1>
                <p className="text-gray-500 mt-2">Debe registrar un reingreso o apertura de caso.</p>
                <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-gray-200 rounded">Volver</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-20">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900 leading-tight">
                                {nna.nombres} {nna.apellidoPaterno} {nna.apellidoMaterno}
                            </h1>
                            <p className="text-xs text-gray-500 font-medium">
                                Caso Activo: <span className="text-blue-600">{activeCase.codigoCaso}</span> | Estado: {activeCase.estado}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {['pti', 'diario', 'derivacion'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={clsx(
                                    "px-4 py-2 text-sm font-bold rounded-lg transition-colors capitalize",
                                    activeTab === tab ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-100"
                                )}
                            >
                                {tab === 'pti' ? 'Plan de Trabajo' : tab === 'diario' ? 'Diario de Campo' : 'Derivaciones'}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto p-6 md:p-8">

                {activeTab === 'pti' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-black text-gray-800 tracking-tight">Plan de Trabajo Individual (PTI)</h2>
                            {!currentPti && !isCreatingPti && (
                                <button
                                    onClick={() => setIsCreatingPti(true)}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-blue-700 transition"
                                >
                                    Crear PTI
                                </button>
                            )}
                        </div>

                        {loadingPti && <div className="text-gray-500">Cargando plan de trabajo...</div>}

                        {/* MODE: CREATE NEW PTI */}
                        {!currentPti && isCreatingPti && (
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 animate-fade-in">
                                <h3 className="text-lg font-bold text-gray-700 mb-4">Nuevo Plan de Trabajo</h3>
                                <form onSubmit={handleSubmit(onCreatePti)} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Objetivo General</label>
                                        <textarea
                                            {...register('objetivoGeneral', { required: true })}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            rows={3}
                                            placeholder="Describa el objetivo principal de la intervención..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Acciones Iniciales / Metas</label>
                                        <div className="space-y-3">
                                            {fields.map((field, index) => (
                                                <div key={field.id} className="grid grid-cols-12 gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 items-end">
                                                    <div className="col-span-12 md:col-span-4">
                                                        <label className="text-[10px] uppercase font-bold text-gray-400">Acción</label>
                                                        <input {...register(`acciones.${index}.descripcion` as const, { required: true })} className="w-full p-2 border rounded text-sm" placeholder="Ej: Tramitar DNI" />
                                                    </div>
                                                    <div className="col-span-6 md:col-span-3">
                                                        <label className="text-[10px] uppercase font-bold text-gray-400">Meta</label>
                                                        <input {...register(`acciones.${index}.meta` as const)} className="w-full p-2 border rounded text-sm" placeholder="Obtener DNI azul" />
                                                    </div>
                                                    <div className="col-span-6 md:col-span-2">
                                                        <label className="text-[10px] uppercase font-bold text-gray-400">Plazo</label>
                                                        <input {...register(`acciones.${index}.plazo` as const)} className="w-full p-2 border rounded text-sm" placeholder="30 días" />
                                                    </div>
                                                    <div className="col-span-10 md:col-span-2">
                                                        <label className="text-[10px] uppercase font-bold text-gray-400">Responsable</label>
                                                        <input {...register(`acciones.${index}.responsable` as const)} className="w-full p-2 border rounded text-sm" placeholder="Educador" />
                                                    </div>
                                                    <div className="col-span-2 md:col-span-1 flex justify-center pb-2">
                                                        <button type="button" onClick={() => remove(index)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={16} /></button>
                                                    </div>
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => append({ descripcion: '', meta: '', plazo: '', responsable: '' })}
                                                className="text-sm text-blue-600 font-bold flex items-center gap-1 hover:underline"
                                            >
                                                <Plus size={16} /> Agregar Acción
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                        <button type="button" onClick={() => setIsCreatingPti(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancelar</button>
                                        <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md">Guardar PTI</button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* MODE: VIEW EXISTING PTI */}
                        {currentPti && (
                            <div className="space-y-6">
                                {/* Objetive Card */}
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100">
                                    <h3 className="text-xs font-bold text-blue-600 uppercase mb-2">Objetivo General</h3>
                                    <p className="text-lg font-medium text-gray-800">{currentPti.objetivoGeneral || 'Sin objetivo definido'}</p>
                                    <div className="mt-4 flex gap-4 text-xs text-gray-500">
                                        <span>Inicio: {new Date(currentPti.createdAt).toLocaleDateString()}</span>
                                        <span className={clsx("font-bold", currentPti.estado === 'EN_EJECUCION' ? "text-green-600" : "text-gray-500")}>
                                            {currentPti.estado}
                                        </span>
                                    </div>
                                </div>

                                {/* Actions List */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                    <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                                        <h3 className="font-bold text-gray-700">Cronograma de Actividades</h3>
                                    </div>
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-gray-500 bg-gray-50 uppercase border-b border-gray-200">
                                            <tr>
                                                <th className="px-6 py-3">Estado</th>
                                                <th className="px-6 py-3">Actividad / Meta</th>
                                                <th className="px-6 py-3">Plazo</th>
                                                <th className="px-6 py-3">Responsable</th>
                                                <th className="px-6 py-3 text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {currentPti.acciones.map((acc) => (
                                                <tr key={acc.id} className={clsx("hover:bg-gray-50 transition", acc.estado === 'CUMPLIDO' && "bg-green-50/50")}>
                                                    <td className="px-6 py-4">
                                                        <button
                                                            onClick={() => onToggleStatus(acc)}
                                                            className={clsx(
                                                                "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border transition-all",
                                                                acc.estado === 'CUMPLIDO'
                                                                    ? "bg-green-100 text-green-700 border-green-200 hover:bg-green-200"
                                                                    : "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100"
                                                            )}
                                                        >
                                                            {acc.estado === 'CUMPLIDO' ? <CheckCircle size={14} /> : <Clock size={14} />}
                                                            {acc.estado}
                                                        </button>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="font-bold text-gray-900">{acc.descripcion}</p>
                                                        {acc.meta && <p className="text-xs text-gray-500 mt-1">Meta: {acc.meta}</p>}
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-600">{acc.plazo || '-'}</td>
                                                    <td className="px-6 py-4 text-gray-600">{acc.responsable || '-'}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => onDeleteAction(acc.id)}
                                                            className="text-gray-400 hover:text-red-500 transition p-2"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {currentPti.acciones.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                                        No hay acciones registradas.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                        {/* Add New Action Inline Footer */}
                                        <tfoot className="bg-gray-50/50">
                                            <tr>
                                                <td colSpan={5} className="px-4 py-4">
                                                    <form onSubmit={handleNewAction(onAddAction)} className="flex gap-2 items-center">
                                                        <input {...registerNew('descripcion', { required: true })} placeholder="Nueva actividad..." className="flex-1 p-2 text-sm border border-gray-300 rounded" />
                                                        <input {...registerNew('meta')} placeholder="Meta" className="w-32 p-2 text-sm border border-gray-300 rounded" />
                                                        <input {...registerNew('plazo')} placeholder="Plazo" className="w-24 p-2 text-sm border border-gray-300 rounded" />
                                                        <input {...registerNew('responsable')} placeholder="Resp." className="w-24 p-2 text-sm border border-gray-300 rounded" />
                                                        <button type="submit" className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
                                                            <Plus size={16} />
                                                        </button>
                                                    </form>
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        )}

                        {!currentPti && !isCreatingPti && !loadingPti && (
                            <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                                <p className="text-gray-500 mb-4">No se ha creado un Plan de Trabajo para este caso.</p>
                                <button
                                    onClick={() => setIsCreatingPti(true)}
                                    className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg hover:bg-blue-700 transition"
                                >
                                    Comenzar PTI
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'diario' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-black text-gray-800 tracking-tight">Diario de Campo (Atenciones)</h2>
                            <button
                                onClick={() => setIsCreatingDiario(true)}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-green-700 transition flex items-center gap-2"
                            >
                                <Plus size={18} /> Registrar Atención
                            </button>
                        </div>

                        {/* FORMULARIO NUEVA ATENCIÓN */}
                        {isCreatingDiario && (
                            <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-green-500 animate-fade-in relative">
                                <button
                                    onClick={() => setIsCreatingDiario(false)}
                                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                                >
                                    <X size={20} />
                                </button>
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <ClipboardList size={20} className="text-green-600" /> Nueva Entrada de Campo
                                </h3>

                                <form onSubmit={handleDiarioSubmit(onSaveDiario)} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fecha y Hora</label>
                                            <input
                                                type="datetime-local"
                                                {...registerDiario('fecha', { required: true })}
                                                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ubicación del Encuentro</label>
                                            <input
                                                placeholder="Ej: Parque central, Mercado..."
                                                {...registerDiario('ubicacion', { required: true })}
                                                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Actividad Realizada / Temática</label>
                                        <textarea
                                            rows={2}
                                            placeholder="Descripción breve de la intervención..."
                                            {...registerDiario('actividad', { required: true })}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estado Físico (Observación)</label>
                                            <select {...registerDiario('estadoFisico')} className="w-full p-2 border border-gray-300 rounded text-sm bg-white">
                                                <option value="BUENO">Bueno (Sin lesiones visibles)</option>
                                                <option value="REGULAR">Regular (Descuido higiene/ropa)</option>
                                                <option value="MALO">Malo (Lesiones, Enfermo)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estado de Ánimo</label>
                                            <select {...registerDiario('estadoAnimo')} className="w-full p-2 border border-gray-300 rounded text-sm bg-white">
                                                <option value="TRANQUILO">Tranquilo / Estable</option>
                                                <option value="ALEGRE">Alegre / Participativo</option>
                                                <option value="TRISTE">Triste / Aislado</option>
                                                <option value="AGRESIVO">Agresivo / Irritable</option>
                                                <option value="ANSIOSO">Ansioso / Temeroso</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Observaciones Confidenciales</label>
                                        <textarea
                                            rows={2}
                                            placeholder="Detalles relevantes para el expediente..."
                                            {...registerDiario('observaciones')}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm"
                                        />
                                    </div>

                                    <div className="flex justify-end pt-2">
                                        <button type="submit" className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-bold shadow hover:bg-green-700 transition">
                                            Guardar Registro
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* TIMELINE LIST */}
                        <div className="relative border-l-2 border-gray-200 ml-3 space-y-8 pb-8">
                            {diarioEntries.map((entry) => (
                                <div key={entry.id} className="relative pl-8">
                                    {/* Dot */}
                                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-sm box-content"></div>

                                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition group">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1">
                                                    <Calendar size={12} /> {new Date(entry.fecha).toLocaleDateString()}
                                                    <span className="text-gray-300">|</span>
                                                    <Clock size={12} /> {new Date(entry.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                                <h4 className="font-bold text-gray-900 mt-1">{entry.actividad}</h4>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-full uppercase">
                                                    {entry.ubicacion}
                                                </span>
                                                <button
                                                    onClick={() => onDeleteDiario(entry.id!)}
                                                    className="opacity-0 group-hover:opacity-100 transition text-gray-300 hover:text-red-500"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex gap-4 mb-3">
                                            <div className={clsx("text-xs font-bold px-2 py-1 rounded border",
                                                entry.estadoFisico === 'MALO' ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700")}>
                                                Físico: {entry.estadoFisico}
                                            </div>
                                            <div className={clsx("text-xs font-bold px-2 py-1 rounded border", "bg-blue-50 border-blue-200 text-blue-700")}>
                                                Ánimo: {entry.estadoAnimo}
                                            </div>
                                        </div>

                                        {entry.observaciones && (
                                            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 italic">
                                                "{entry.observaciones}"
                                            </p>
                                        )}

                                        <p className="text-[10px] text-gray-400 mt-3 text-right">
                                            Registrado por: {entry.creadoPor?.nombreCompleto || 'Desconocido'}
                                        </p>
                                    </div>
                                </div>
                            ))}

                            {diarioEntries.length === 0 && !isCreatingDiario && (
                                <div className="pl-8 text-gray-500 italic">No hay registros en el diario de campo.</div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'derivacion' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-black text-gray-800 tracking-tight">Derivaciones e Interoperabilidad</h2>
                            <button
                                onClick={() => setIsCreatingDerivacion(true)}
                                className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-purple-700 transition flex items-center gap-2"
                            >
                                <Send size={18} /> Nueva Derivación
                            </button>
                        </div>

                        {/* FORMULARIO NUEVA DERIVACIÓN */}
                        {isCreatingDerivacion && (
                            <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-purple-500 animate-fade-in relative">
                                <button
                                    onClick={() => setIsCreatingDerivacion(false)}
                                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                                >
                                    <X size={20} />
                                </button>
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <Building2 size={20} className="text-purple-600" /> Registrar Derivación Externa
                                </h3>

                                <form onSubmit={handleDerivacionSubmit(onSaveDerivacion)} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Entidad de Destino</label>
                                            <select {...registerDerivacion('entidadDestino', { required: true })} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white">
                                                <option value="">Seleccione Entidad...</option>
                                                <option value="UPE">UPE (Unidad de Protección Especial)</option>
                                                <option value="DEMUNA">DEMUNA</option>
                                                <option value="FISCALIA">Fiscalía de Familia</option>
                                                <option value="MINSA">MINSA (Centro de Salud / Salud Mental)</option>
                                                <option value="MINEDU">MINEDU (UGEL / Colegio)</option>
                                                <option value="COMISARIA">Comisaría PNP</option>
                                                <option value="CAR">CAR (Centro de Acogida Residencial)</option>
                                                <option value="OTROS">Otros</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Prioridad / Riesgo</label>
                                            <select {...registerDerivacion('prioridad')} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white">
                                                <option value="NORMAL">Normal (Trámite regular)</option>
                                                <option value="URGENTE">Urgente (Riesgo alto / Inminente)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Motivo de la Derivación</label>
                                        <textarea
                                            rows={2}
                                            placeholder="Describa por qué se deriva y qué se solicita..."
                                            {...registerDerivacion('motivo', { required: true })}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Documento de Referencia (Oficio/Carta)</label>
                                        <input
                                            placeholder="Ej: Oficio N° 123-2026-INABIF..."
                                            {...registerDerivacion('documentoRef')}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm"
                                        />
                                    </div>

                                    <div className="flex justify-end pt-2">
                                        <button type="submit" className="bg-purple-600 text-white px-6 py-2.5 rounded-lg font-bold shadow hover:bg-purple-700 transition">
                                            Generar Derivación
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* LISTADO DE DERIVACIONES */}
                        <div className="space-y-4">
                            {derivaciones.map((item) => (
                                <div key={item.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-start">
                                    <div className={clsx("p-3 rounded-full shrink-0",
                                        item.prioridad === 'URGENTE' ? "bg-red-100 text-red-600" : "bg-purple-100 text-purple-600"
                                    )}>
                                        {item.prioridad === 'URGENTE' ? <AlertTriangle size={24} /> : <Building2 size={24} />}
                                    </div>

                                    <div className="flex-1 w-full">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                                    {item.entidadDestino}
                                                    {item.tipoDerivacion === 'EXTERNA' && <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full border">Externa</span>}
                                                </h4>
                                                <p className="text-xs text-gray-500 font-bold uppercase mt-1">
                                                    {new Date(item.fechaDerivacion).toLocaleDateString()} | Ref: {item.documentoRef || 'S/N'}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <span className={clsx("px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide",
                                                    item.estado === 'PENDIENTE' ? "bg-yellow-100 text-yellow-700" :
                                                        item.estado === 'ACEPTADO' ? "bg-green-100 text-green-700" :
                                                            "bg-gray-100 text-gray-600"
                                                )}>
                                                    {item.estado}
                                                </span>
                                            </div>
                                        </div>

                                        <p className="text-sm text-gray-700 mt-3 bg-gray-50 p-3 rounded border border-gray-100">
                                            <span className="font-bold text-gray-500 text-xs block uppercase mb-1">Motivo:</span>
                                            {item.motivo}
                                        </p>

                                        <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                                            <FileText size={14} />
                                            Derivado por: <span className="text-gray-600 font-medium">{item.remitente?.nombreCompleto || 'Usuario'}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {derivaciones.length === 0 && !isCreatingDerivacion && (
                                <div className="text-center py-10 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl">
                                    <Building2 size={48} className="mx-auto text-gray-300 mb-2" />
                                    <p>No se han registrado derivaciones.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};
