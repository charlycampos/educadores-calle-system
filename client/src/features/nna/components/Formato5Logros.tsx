import { useState, useEffect, useRef } from 'react';
import { Save, Printer, AlertCircle, Target, Calendar, CheckCircle, CheckCircle2, Loader2, Lock } from 'lucide-react';
import { createLogros, updateLogros, type ProcesoLogrosPayload } from '../../../api/logros.api';
import { useAuthStore } from '../../../store/auth.store';
import { useNnaStore } from '../../../store/nna.store';

interface Formato5LogrosProps {
    nna: any;
    caso?: any;
    initialData?: any;
    onClose?: () => void;
    onSuccess?: (result: any) => void;
}

const ITEMS_FASE_1 = [
    { id: 1, texto: "El/la NNA se integra y colabora con otras/os NNA." },
    { id: 2, texto: "El/la NNA participa regularmente de las actividades del servicio de educadores de calle." },
    { id: 3, texto: "El adulto responsable muestra interés en cubrir necesidades básicas urgentes (identidad, salud y educación) de los NNA, lo cual ha permitido iniciar el proceso de restitución de derechos." },
    { id: 4, texto: "El/la NNA y adulto responsable muestran interés en cubrir sus necesidades básicas urgentes (identidad, salud y educación), lo cual ha permitido iniciar el proceso de restitución de sus derechos." },
    { id: 5, texto: "Muestra interés en acercarse a la comunidad a través de las/os actores sociales más próximos (y acorde a sus necesidades)." },
];

const ITEMS_FASE_2 = [
    { id: 1,  texto: "El NNA tiene cubierto y ejerce su derecho a la educación." },
    { id: 2,  texto: "El NNA tiene cubierto y ejerce su derecho a la salud." },
    { id: 3,  texto: "El NNA tiene cubierto y ejerce su derecho a la identidad." },
    { id: 4,  texto: "El NNA tiene cubierto y ejerce su derecho a la alimentación." },
    { id: 5,  texto: "El/la NNA deja o reduce la situación de calle según perfil." },
    { id: 6,  texto: "El adulto responsable no ejerce violencia física ni psicológica en sus pautas de crianza." },
    { id: 7,  texto: "Aumentaron (respecto a su medición inicial) su participación en actividades vinculadas a su desarrollo integral: deportivas, recreativas, culturales, productivas u otras que demuestren un adecuado uso de su tiempo libre." },
    { id: 8,  texto: "Acceso a servicios especializados según las necesidades de cada caso en concreto (salud mental, adicciones, acceso a la justicia, entre otros)." },
    { id: 9,  texto: "El/la NNA incorpora conductas de autocuidado personal, aseo, higiene y presentación de su aspecto físico general según perfil (respecto a la medición inicial)." },
    { id: 10, texto: "El/la NNA y su familia construye un proyecto o plan de vida con objetivos y metas a corto, mediano y largo plazo por áreas de desarrollo (personal, familiar, educativo y comunitario)." },
];

const ITEMS_FASE_3 = [
    { id: 1, texto: "Niñas, niños y adolescentes dejan la situación de calle ejerciendo permanentemente sus derechos (identidad, salud, alimentación, educación, recreación, entre otros)." },
    { id: 2, texto: "Las niñas, niños y adolescentes desarrollan capacidades de autoprotección y habilidades para la vida." },
    { id: 3, texto: "Las niñas, niños y adolescentes hacen uso de programas y servicios que restituyen el ejercicio de sus derechos." },
    { id: 4, texto: "Persona adulta responsable presenta capacidades para garantizar la protección integral de las niñas, niños y adolescentes usuarias/os del servicio." },
    { id: 5, texto: "Las/os NNA y sus familias presentan y desarrollan sus proyectos de vida con el cumplimiento de algunas de sus metas según su temporalidad." },
];

type LogroVal = 'SI' | 'NO' | 'PROCESO' | null;
type LogrosState = Record<string, LogroVal>;

function buildPayload(
    nna: any, caso: any,
    logros: LogrosState,
    observaciones: Record<number, string>,
    fechas: Record<number, string>,
    educadorResponsable: string | null,
): ProcesoLogrosPayload {
    const f = (fase: number, item: number): string | null => logros[`f${fase}_${item}`] || null;
    return {
        nnaId: nna.id,
        casoId: caso?.id ?? null,
        perfilUsuario: caso?.perfil ?? null,
        fechaIngreso: caso?.fechaApertura ? caso.fechaApertura.split('T')[0] : null,
        educadorResponsable,
        f1Fecha: fechas[1] || null,
        f1I1: f(1,1), f1I2: f(1,2), f1I3: f(1,3), f1I4: f(1,4), f1I5: f(1,5),
        f1Obs: observaciones[1] || null,
        f2Fecha: fechas[2] || null,
        f2I1: f(2,1), f2I2: f(2,2), f2I3: f(2,3), f2I4: f(2,4), f2I5: f(2,5),
        f2I6: f(2,6), f2I7: f(2,7), f2I8: f(2,8), f2I9: f(2,9), f2I10: f(2,10),
        f2Obs: observaciones[2] || null,
        f3Fecha: fechas[3] || null,
        f3I1: f(3,1), f3I2: f(3,2), f3I3: f(3,3), f3I4: f(3,4), f3I5: f(3,5),
        f3Obs: observaciones[3] || null,
    };
}

function hydrateFromData(data: any) {
    const logros: LogrosState = {};
    const toDate = (v: any) => (v ? String(v).split('T')[0] : '');
    for (let i = 1; i <= 5;  i++) { if (data[`f1_i${i}`]) logros[`f1_${i}`] = data[`f1_i${i}`]; }
    for (let i = 1; i <= 10; i++) { if (data[`f2_i${i}`]) logros[`f2_${i}`] = data[`f2_i${i}`]; }
    for (let i = 1; i <= 5;  i++) { if (data[`f3_i${i}`]) logros[`f3_${i}`] = data[`f3_i${i}`]; }
    return {
        logros,
        observaciones: { 1: data.f1_obs || '', 2: data.f2_obs || '', 3: data.f3_obs || '' },
        fechas: { 1: toDate(data.f1_fecha), 2: toDate(data.f2_fecha), 3: toDate(data.f3_fecha) },
    };
}

export const Formato5Logros = ({ nna, caso, initialData, onClose, onSuccess }: Formato5LogrosProps) => {
    const { documents } = useNnaStore();

    const [activeFase, setActiveFase]           = useState<1 | 2 | 3>(1);
    const [logros, setLogros]                   = useState<LogrosState>({});
    const [observaciones, setObservaciones]     = useState<Record<number, string>>({ 1: '', 2: '', 3: '' });
    const [fechas, setFechas]                   = useState<Record<number, string>>({ 1: '', 2: '', 3: '' });
    const [isSaving, setIsSaving]               = useState(false);
    const [saveError, setSaveError]             = useState<string | null>(null);
    const [savedOk, setSavedOk]                 = useState(false);
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);

    useEffect(() => {
        if (initialData) {
            const { logros: l, observaciones: o, fechas: f } = hydrateFromData(initialData);
            setLogros(l);
            setObservaciones(o);
            setFechas(f);
        }
    }, [initialData]);

    // Fase N se desbloquea si fue oficialmente cerrada (folio en expediente) O si todos sus ítems están en SI en el estado local (en tiempo real)
    const fase1Cerrada = documents.some(d => d.pdfUrl?.includes('/pdf/fase/1'));
    const fase2Cerrada = documents.some(d => d.pdfUrl?.includes('/pdf/fase/2'));
    
    const fase1TodoSi = ITEMS_FASE_1.every(it => logros[`f1_${it.id}`] === 'SI');
    const fase2TodoSi = ITEMS_FASE_2.every(it => logros[`f2_${it.id}`] === 'SI');
    
    const fase2Desbloqueada = fase1Cerrada || fase1TodoSi;
    const fase3Desbloqueada = fase2Cerrada || fase2TodoSi;
    const fase3Cerrada = documents.some(d => d.type === 'FICHA DE LOGROS (FORMATO 5)');

    // Auto-jump: when opening an existing record, go straight to the first non-archived phase
    const didAutoJump = useRef(false);
    useEffect(() => {
        if (didAutoJump.current || !initialData) return;
        if (fase1Cerrada) {
            setActiveFase(fase2Cerrada ? 3 : 2);
            didAutoJump.current = true;
        }
    }, [fase1Cerrada, fase2Cerrada, initialData]);

    const getItems = (fase: number) => {
        if (fase === 1) return ITEMS_FASE_1;
        if (fase === 2) return ITEMS_FASE_2;
        return ITEMS_FASE_3;
    };

    const countLogros = (fase: number) => {
        const items = getItems(fase);
        return {
            done:  items.filter(it => logros[`f${fase}_${it.id}`] === 'SI').length,
            total: items.length,
        };
    };

    const handleSave = async () => {
        setIsSaving(true);
        setSaveError(null);
        setSavedOk(false);
        try {
            const authUser = useAuthStore.getState().user;
            const educadorResponsable = authUser?.nombreCompleto || authUser?.nombre || null;
            const payload = buildPayload(nna, caso, logros, observaciones, fechas, educadorResponsable);

                let result: any;

            if (initialData?.id) {
                result = await updateLogros(initialData.id, payload);
            } else {
                result = await createLogros(nna.id, payload);
            }

            setSavedOk(true);
            onSuccess?.(result);
        } catch (err: any) {
            setSaveError(err.message || 'Error al guardar');
        } finally {
            setIsSaving(false);
        }
    };

    const faseCerradaActual =
        (activeFase === 1 && fase1Cerrada) ||
        (activeFase === 2 && fase2Cerrada) ||
        (activeFase === 3 && fase3Cerrada);

    const StatusButton = ({ fase, itemId, value, label, colorClass }: any) => {
        const current  = logros[`f${fase}_${itemId}`];
        const selected = current === value;
        return (
            <button
                onClick={() => !faseCerradaActual && setLogros(prev => ({
                    ...prev,
                    [`f${fase}_${itemId}`]: selected ? null : value
                }))}
                disabled={faseCerradaActual}
                title={faseCerradaActual ? 'Esta fase ya fue cerrada oficialmente' : undefined}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border
                    ${faseCerradaActual
                        ? 'opacity-60 cursor-not-allowed bg-surface-muted text-fg-muted border-border'
                        : selected
                            ? `${colorClass} ring-2 ring-offset-1 ring-opacity-60`
                            : 'bg-surface text-fg-muted border-border hover:bg-surface-muted'
                    }`}
            >
                {label}
            </button>
        );
    };

    const faseConfig = [
        { id: 1 as const, label: 'Fase I',   sub: 'Contacto e Integración',    color: 'text-warning', bar: 'bg-warning' },
        { id: 2 as const, label: 'Fase II',  sub: 'Desarrollo e Intervención', color: 'text-primary', bar: 'bg-primary' },
        { id: 3 as const, label: 'Fase III', sub: 'Seguimiento y Egreso',       color: 'text-success', bar: 'bg-success' },
    ];

    return (
        <div className="bg-bg min-h-screen p-6">
            <div className="max-w-5xl mx-auto bg-surface rounded-[8px] shadow-lg overflow-hidden border border-border">

                {/* Header */}
                <div className="bg-primary px-6 py-5 text-primary-fg">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-xl font-bold uppercase tracking-wide">Ficha de Proceso de Logros</h1>
                            <p className="text-primary-fg/60 text-xs mt-1 font-medium">
                                Servicio de Educadores de Calle — INABIF (Formato 5)
                                {initialData?.codigo_f05 && (
                                    <span className="ml-2 font-mono opacity-70">#{initialData.codigo_f05}</span>
                                )}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold">{nna?.nombres} {nna?.apellidoPaterno}</p>
                            <p className="text-xs text-primary-fg/50">DNI: {nna?.numeroDoc || '---'}</p>
                            {caso?.perfil && <p className="text-xs text-primary-fg/50 mt-0.5">Perfil: {caso.perfil}</p>}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border bg-surface-muted">
                    {faseConfig.map(fc => {
                        const { done, total } = countLogros(fc.id);
                        const isActive = activeFase === fc.id;
                        const bloqueada = (fc.id === 2 && !fase2Desbloqueada) || (fc.id === 3 && !fase3Desbloqueada);
                        const isCerrada = (fc.id === 1 && fase1Cerrada) || (fc.id === 2 && fase2Cerrada) || (fc.id === 3 && fase3Cerrada);
                        return (
                            <button
                                key={fc.id}
                                onClick={() => !bloqueada && setActiveFase(fc.id)}
                                disabled={bloqueada}
                                title={bloqueada ? `Completa la Fase ${fc.id === 2 ? 'I' : 'II'} primero` : isCerrada ? 'Fase cerrada oficialmente — solo lectura' : undefined}
                                className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors relative
                                    ${bloqueada
                                        ? 'text-fg-muted opacity-40 cursor-not-allowed'
                                        : isCerrada && !isActive
                                            ? 'text-success bg-success-soft/30 hover:bg-success-soft/50'
                                            : isActive
                                                ? `${fc.color} bg-surface`
                                                : 'text-fg-muted hover:text-fg-2 hover:bg-border/30'
                                    }`}
                            >
                                <div className="flex flex-col items-center gap-0.5">
                                    <div className="flex items-center gap-1.5">
                                        {bloqueada
                                            ? <Lock size={13} />
                                            : isCerrada
                                                ? <CheckCircle2 size={13} className="text-success" />
                                                : <Target size={15} />}
                                        <span>{fc.label}</span>
                                    </div>
                                    <span className="text-[10px] font-normal normal-case opacity-70">
                                        {bloqueada ? 'Bloqueada' : isCerrada ? 'Archivada en Expediente' : fc.sub}
                                    </span>
                                    {!bloqueada && (
                                        <span className={`text-[10px] font-bold mt-0.5 ${isCerrada ? 'text-success' : done === total ? 'text-success' : 'text-fg-muted'}`}>
                                            {isCerrada ? `${total}/${total} — Cerrada` : `${done}/${total} logros`}
                                        </span>
                                    )}
                                </div>
                                {isActive && !bloqueada && <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${fc.bar}`} />}
                                {isCerrada && !isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-success opacity-40" />}
                            </button>
                        );
                    })}
                </div>

                <div className="p-8">
                    {/* Fecha */}
                    <div className="flex items-center gap-4 mb-6 bg-primary-soft/10 p-4 rounded-[6px] border border-primary/20">
                        <Calendar className="text-primary" size={20} />
                        <div>
                            <label className="block text-xs font-bold text-primary uppercase mb-1">
                                Fecha de Evaluación — Fase {activeFase === 1 ? 'I' : activeFase === 2 ? 'II' : 'III'}
                            </label>
                            <input
                                type="date"
                                value={fechas[activeFase]}
                                onChange={e => !faseCerradaActual && setFechas({ ...fechas, [activeFase]: e.target.value })}
                                disabled={faseCerradaActual}
                                className={`px-3 py-1.5 border border-primary/30 rounded text-sm text-fg bg-surface focus:ring-2 focus:ring-primary outline-none ${faseCerradaActual ? 'opacity-60 cursor-not-allowed' : ''}`}
                            />
                        </div>
                    </div>

                    {/* Tabla */}
                    <div className="overflow-hidden rounded-[8px] border border-border shadow-sm">
                        <table className="w-full">
                            <thead className="bg-surface-muted text-xs text-fg-muted uppercase font-bold border-b border-border">
                                <tr>
                                    <th className="px-5 py-3 w-10 text-center">N°</th>
                                    <th className="px-5 py-3 text-left">Indicador de Logro</th>
                                    <th className="px-5 py-3 w-60 text-center">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {getItems(activeFase).map(item => (
                                    <tr key={item.id} className="hover:bg-surface-muted transition-colors">
                                        <td className="px-5 py-4 text-center font-bold text-fg-muted text-sm">{item.id}</td>
                                        <td className="px-5 py-4">
                                            <p className="text-sm text-fg-2 font-medium leading-relaxed">{item.texto}</p>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <StatusButton fase={activeFase} itemId={item.id} value="SI"
                                                    label="SÍ"         colorClass="bg-success-soft text-success border-success/30 ring-success/40" />
                                                <StatusButton fase={activeFase} itemId={item.id} value="NO"
                                                    label="NO"         colorClass="bg-danger-soft text-danger border-danger/30 ring-danger/40" />
                                                <StatusButton fase={activeFase} itemId={item.id} value="PROCESO"
                                                    label="EN PROCESO" colorClass="bg-warning-soft text-warning border-warning/30 ring-warning/40" />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Observaciones */}
                    <div className="mt-6">
                        <label className="block text-sm font-bold text-fg-2 mb-2 uppercase flex items-center gap-2">
                            <AlertCircle size={15} />
                            Observaciones — Fase {activeFase === 1 ? 'I' : activeFase === 2 ? 'II' : 'III'}
                        </label>
                        <textarea
                            value={observaciones[activeFase]}
                            onChange={e => !faseCerradaActual && setObservaciones({ ...observaciones, [activeFase]: e.target.value })}
                            disabled={faseCerradaActual}
                            rows={4}
                            className={`w-full px-4 py-3 border border-border rounded-[8px] focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none text-sm bg-surface ${faseCerradaActual ? 'opacity-60 cursor-not-allowed' : ''}`}
                            placeholder={faseCerradaActual ? 'Fase cerrada oficialmente — solo lectura' : 'Observaciones, dificultades encontradas o logros específicos...'}
                        />
                    </div>

                    {/* Firmas */}
                    <div className="mt-8 pt-6 border-t border-border grid grid-cols-2 gap-8">
                        <div className="text-center">
                            <p className="text-xs font-bold text-fg-muted uppercase mb-6">Educador/a Responsable</p>
                            <div className="h-px bg-border mx-4" />
                            <p className="text-xs text-fg-muted mt-2">Firma y Sello</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs font-bold text-fg-muted uppercase mb-6">Coordinador/a del Servicio</p>
                            <div className="h-px bg-border mx-4" />
                            <p className="text-xs text-fg-muted mt-2">Firma y Sello</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-surface-muted px-8 py-4 border-t border-border flex items-center justify-between">
                    <div className="text-sm">
                        {saveError && (
                            <span className="text-danger font-medium flex items-center gap-1.5">
                                <AlertCircle size={15} /> {saveError}
                            </span>
                        )}
                        {savedOk && !saveError && (
                            <span className="text-success font-medium flex items-center gap-1.5">
                                <CheckCircle size={15} /> Guardado correctamente
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => window.print()}
                            className="flex items-center gap-2 text-fg-2 font-bold hover:text-fg px-4 py-2 hover:bg-border/30 rounded-[6px] transition-colors text-sm"
                        >
                            <Printer size={16} /> Imprimir
                        </button>
                        <button
                            onClick={() => setShowSaveConfirm(true)}
                            disabled={isSaving}
                            className="flex items-center gap-2 bg-primary text-primary-fg font-bold px-6 py-2 rounded-[6px] shadow hover:bg-primary/90 transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            {isSaving ? 'Guardando...' : initialData?.id ? 'Actualizar F05' : 'Guardar F05'}
                        </button>
                    </div>
                </div>
            </div>

        {/* ── Modal de confirmación de guardado ── */}
        {showSaveConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-surface rounded-2xl shadow-2xl border border-border w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="h-1.5 bg-gradient-to-r from-primary via-primary/70 to-primary/30" />
                    <div className="p-7">
                        {/* Ícono */}
                        <div className="flex justify-center mb-5">
                            <div className="relative">
                                <div className="w-16 h-16 rounded-full bg-primary-soft flex items-center justify-center">
                                    <Save size={28} className="text-primary" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-success flex items-center justify-center border-2 border-surface">
                                    <CheckCircle2 size={13} className="text-white" />
                                </div>
                            </div>
                        </div>

                        {/* Texto */}
                        <div className="text-center mb-5">
                            <h3 className="text-[17px] font-black text-fg mb-1.5">
                                {initialData?.id ? '¿Actualizar ficha de logros?' : '¿Guardar ficha de logros?'}
                            </h3>
                            <p className="text-[13px] text-fg-muted leading-relaxed">
                                Se {initialData?.id ? 'actualizará' : 'guardará'} el <span className="font-bold text-fg">Proceso de Logros (F05)</span> del beneficiario:
                            </p>
                            <p className="text-[13px] font-bold text-primary mt-1 truncate">
                                {nna?.nombres} {nna?.apellidoPaterno} {nna?.apellidoMaterno}
                            </p>
                        </div>

                        {/* Nota */}
                        <div className="flex items-start gap-2.5 bg-info-soft/60 border border-info/20 rounded-xl px-4 py-3 mb-6">
                            <AlertCircle size={14} className="text-info shrink-0 mt-0.5" />
                            <p className="text-[11px] text-fg-2 font-medium leading-relaxed">
                                Los logros registrados quedarán en el expediente digital y podrán revisarse o actualizarse en cualquier momento.
                            </p>
                        </div>

                        {/* Botones */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowSaveConfirm(false)}
                                disabled={isSaving}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-fg font-semibold text-[13px] hover:bg-surface-muted transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={async () => {
                                    setShowSaveConfirm(false);
                                    await handleSave();
                                }}
                                disabled={isSaving}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-fg font-bold text-[13px] hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-primary-fg/30 border-t-primary-fg rounded-full animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Save size={14} />
                                        {initialData?.id ? 'Sí, actualizar' : 'Sí, guardar'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
    );
};
