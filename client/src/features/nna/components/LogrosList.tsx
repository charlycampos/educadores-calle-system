import { useEffect, useState } from 'react';
import { Plus, Edit2, TrendingUp, Calendar, Clock, AlertCircle, Loader2, CheckCircle2, FlagTriangleRight, Lock, BookCheck } from 'lucide-react';
import { getLogrosByNna, finalizarF05, cerrarFase } from '../../../api/logros.api';
import { useAuthStore } from '../../../store/auth.store';
import { useNnaStore } from '../../../store/nna.store';
import { INTERVENCION_API_URL, EXPEDIENTE_API_URL } from '../../../config/api';

interface LogrosListProps {
    nnaId: number;
    nnaFullName?: string;
    refreshKey?: number;
    onNuevoLogro: () => void;
    onEditarLogro: (id: number) => void;
    onFaseCerrada?: () => void;
}

const FASE_1_KEYS = ['f1_i1','f1_i2','f1_i3','f1_i4','f1_i5'];
const FASE_2_KEYS = ['f2_i1','f2_i2','f2_i3','f2_i4','f2_i5','f2_i6','f2_i7','f2_i8','f2_i9','f2_i10'];
const FASE_3_KEYS = ['f3_i1','f3_i2','f3_i3','f3_i4','f3_i5'];
const ALL_KEYS    = [...FASE_1_KEYS, ...FASE_2_KEYS, ...FASE_3_KEYS];

function phaseStats(record: any, keys: string[]) {
    const si   = keys.filter(k => record[k] === 'SI').length;
    const no   = keys.filter(k => record[k] === 'NO').length;
    const proc = keys.filter(k => record[k] === 'PROCESO').length;
    return { si, no, proc, total: keys.length, hasAny: (si + no + proc) > 0 };
}

type PhaseStatus = 'complete' | 'in_progress' | 'empty';

function phaseStatus(stats: ReturnType<typeof phaseStats>): PhaseStatus {
    if (!stats.hasAny) return 'empty';
    if (stats.si === stats.total) return 'complete';
    return 'in_progress';
}

function allComplete(record: any): boolean {
    return ALL_KEYS.every(k => record[k] === 'SI');
}

const PHASE_STYLE: Record<PhaseStatus, { bg: string; text: string; border: string; label: string }> = {
    complete:    { bg: 'bg-success-soft', text: 'text-success', border: 'border-success/20', label: 'Completada' },
    in_progress: { bg: 'bg-primary-soft', text: 'text-primary', border: 'border-primary/20', label: 'En Proceso' },
    empty:       { bg: 'bg-surface-muted', text: 'text-fg-muted', border: 'border-border',   label: 'Sin iniciar' },
};

export const LogrosList = ({ nnaId, refreshKey, onNuevoLogro, onEditarLogro, onFaseCerrada }: LogrosListProps) => {
    const [record, setRecord]           = useState<any | null>(null);
    const [loading, setLoading]         = useState(true);
    const [error, setError]             = useState<string | null>(null);
    const [isFinalizing, setIsFinalizing]   = useState(false);
    const [isFinalized, setIsFinalized]     = useState(false);
    const [finalizeError, setFinalizeError] = useState<string | null>(null);
    const [cerrando, setCerrando]           = useState<1 | 2 | 3 | null>(null);
    const [cerradas, setCerradas]           = useState<Set<number>>(new Set());
    const [cerrarError, setCerrarError]     = useState<string | null>(null);
    const { documents }                     = useNnaStore();

    useEffect(() => {
        setLoading(true);
        setError(null);
        setIsFinalized(false);
        getLogrosByNna(nnaId)
            .then(list => setRecord(list.length > 0 ? list[0] : null))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [nnaId, refreshKey]);

    const handleCerrarFase = async (faseNum: 1 | 2 | 3) => {
        if (!record?.id) return;
        const casoId = record.caso_id;
        if (!casoId) {
            setCerrarError('El F05 no tiene caso asociado. Edita el F05, guárdalo y vuelve a intentar.');
            return;
        }
        setCerrando(faseNum);
        setCerrarError(null);
        try {
            const result = await cerrarFase(record.id, faseNum);

            const token = useAuthStore.getState().token || '';
            const LABELS = ['I', 'II', 'III'];
            const pdfUrl = `${INTERVENCION_API_URL}/proceso-logros/${record.id}/pdf/fase/${faseNum}`;

            const folioRes = await fetch(`${EXPEDIENTE_API_URL}/expediente/caso/${casoId}/folio`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    tipo_documento: `F05-FASE-${faseNum}`,
                    titulo: `FICHA DE LOGROS F05 — FASE ${LABELS[faseNum - 1]} — ${result.codigo_f05}`,
                    archivo_url: pdfUrl,
                    contenido_hash: `${result.codigo_f05}-F${faseNum}`.substring(0, 40),
                }),
            });

            if (!folioRes.ok) throw new Error('PDF generado pero no se pudo registrar en el Expediente.');

            setCerradas(prev => new Set(prev).add(faseNum));
            onFaseCerrada?.();
        } catch (err: any) {
            setCerrarError(err.message || `Error al cerrar Fase ${faseNum}`);
        } finally {
            setCerrando(null);
        }
    };

    const handleFinalizar = async () => {
        if (!record?.id) return;
        const casoId = record.caso_id;
        if (!casoId) {
            setFinalizeError('El F05 no tiene caso asociado. Edita el F05, guárdalo y vuelve a intentar.');
            return;
        }
        setIsFinalizing(true);
        setFinalizeError(null);
        try {
            // 1. Genera el PDF final de forma síncrona en el backend
            await finalizarF05(record.id);

            const token  = useAuthStore.getState().token || '';
            const pdfUrl = `${INTERVENCION_API_URL}/proceso-logros/${record.id}/pdf`;

            const folioRes = await fetch(`${EXPEDIENTE_API_URL}/expediente/caso/${casoId}/folio`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    tipo_documento: 'F05',
                    titulo: `FICHA DE LOGROS (F05) — ${record.codigo_f05}`,
                    archivo_url: pdfUrl,
                    contenido_hash: record.codigo_f05?.substring(0, 40) || null,
                }),
            });

            if (!folioRes.ok) {
                throw new Error('El PDF se generó pero no se pudo registrar en el Expediente Digital.');
            }

            setIsFinalized(true);
            onFaseCerrada?.();
        } catch (err: any) {
            setFinalizeError(err.message || 'Error al finalizar');
        } finally {
            setIsFinalizing(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-surface rounded-[8px] border border-border shadow-1 p-12 flex items-center justify-center gap-3 text-fg-muted">
                <Loader2 size={20} className="animate-spin" />
                <span className="text-sm">Cargando ficha de logros...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-surface rounded-[8px] border border-danger/30 p-8 flex items-center gap-3 text-danger">
                <AlertCircle size={18} />
                <span className="text-sm font-medium">{error}</span>
            </div>
        );
    }

    const fases = record ? [
        { num: 1, label: 'Fase I',   sub: 'Contacto e Integración · 3 meses',       keys: FASE_1_KEYS, fecha: record.f1_fecha },
        { num: 2, label: 'Fase II',  sub: 'Desarrollo e Intervención · 15 meses',    keys: FASE_2_KEYS, fecha: record.f2_fecha },
        { num: 3, label: 'Fase III', sub: 'Seguimiento y Egreso · 6 meses',           keys: FASE_3_KEYS, fecha: record.f3_fecha },
    ] : [];

    const fase1Done = record && FASE_1_KEYS.every(k => record[k] === 'SI');
    const fase2Done = record && FASE_2_KEYS.every(k => record[k] === 'SI');
    const fase3Done = record && FASE_3_KEYS.every(k => record[k] === 'SI');

    // Detectar fases ya cerradas desde los folios reales del expediente (persiste entre recargas)
    const fase1Cerrada = cerradas.has(1) || documents.some(d => d.pdfUrl?.includes('/pdf/fase/1'));
    const fase2Cerrada = cerradas.has(2) || documents.some(d => d.pdfUrl?.includes('/pdf/fase/2'));
    const fase3Cerrada = isFinalized || cerradas.has(3) || documents.some(d => d.type === 'FICHA DE LOGROS (FORMATO 5)');

    return (
        <div className="bg-surface rounded-[8px] border border-border shadow-1 overflow-hidden">

            {/* Header */}
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div>
                    <h3 className="text-[15px] font-semibold text-fg flex items-center gap-2">
                        <TrendingUp size={16} className="text-primary" />
                        Ficha de Proceso de Logros
                    </h3>
                    <p className="text-[12px] text-fg-2 mt-0.5">
                        Formato 5 — {record ? 'Registrado en el Expediente Digital' : 'Sin ficha creada'}
                    </p>
                </div>
                {!record ? (
                    <button
                        onClick={onNuevoLogro}
                        className="flex items-center gap-1.5 bg-primary text-primary-fg px-3 py-1.5 rounded-[6px] text-[13px] font-medium hover:bg-primary/90 transition-colors"
                    >
                        <Plus size={15} /> Crear Ficha F05
                    </button>
                ) : !fase3Cerrada ? (
                    <button
                        onClick={() => onEditarLogro(record.id)}
                        className="flex items-center gap-1.5 bg-surface border border-border text-fg-2 px-3 py-1.5 rounded-[6px] text-[13px] font-medium hover:bg-surface-muted transition-colors"
                    >
                        <Edit2 size={14} /> Editar F05
                    </button>
                ) : null}
            </div>

            {/* Sin ficha */}
            {!record ? (
                <div className="px-5 py-14 flex flex-col items-center gap-3 text-center">
                    <div className="p-4 bg-surface-muted rounded-full">
                        <TrendingUp size={28} className="text-fg-muted" />
                    </div>
                    <p className="font-semibold text-fg text-[14px]">No hay ficha de logros</p>
                    <p className="text-[12px] text-fg-muted max-w-xs">
                        Crea el F05 para registrar los logros del NNA en las 3 fases.
                    </p>
                    <button
                        onClick={onNuevoLogro}
                        className="flex items-center gap-1.5 text-primary bg-primary-soft px-4 py-2 rounded-[6px] text-[13px] font-semibold border border-primary/20 hover:bg-primary/10 transition-colors mt-1"
                    >
                        <Plus size={14} /> Crear primera ficha
                    </button>
                </div>
            ) : (
                <div className="p-5 space-y-4">

                    {/* Metadatos */}
                    <div className="flex items-center gap-4 text-[12px] text-fg-muted flex-wrap">
                        <span className="font-mono font-semibold text-warning bg-warning-soft px-2 py-0.5 rounded border border-warning/20">
                            {record.codigo_f05}
                        </span>
                        {record.educador_responsable && (
                            <span className="uppercase font-semibold">{record.educador_responsable}</span>
                        )}
                        <span className="flex items-center gap-1">
                            <Calendar size={11} />
                            Actualizado: {record.updated_at ? new Date(record.updated_at).toLocaleDateString('es-PE') : '---'}
                        </span>
                    </div>

                    {/* Tarjetas por fase */}
                    <div className="grid grid-cols-3 gap-4">
                        {fases.map(fase => {
                            const stats  = phaseStats(record, fase.keys);
                            const status = phaseStatus(stats);
                            const style  = PHASE_STYLE[status];
                            const isFaseCerrada = (fase.num === 1 && fase1Cerrada) ||
                                                  (fase.num === 2 && fase2Cerrada) ||
                                                  (fase.num === 3 && fase3Cerrada);
                            return (
                                <div key={fase.num} onClick={() => !fase3Cerrada && onEditarLogro(record.id)} className={`rounded-[8px] border p-4 ${style.bg} ${style.border} transition-all ${fase3Cerrada ? 'cursor-default opacity-80' : 'cursor-pointer hover:brightness-95'}`}>
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <p className={`font-bold text-[13px] ${style.text}`}>{fase.label}</p>
                                            <p className="text-[11px] text-fg-muted mt-0.5 leading-tight">{fase.sub}</p>
                                        </div>
                                        {isFaseCerrada
                                            ? <Lock size={14} className="text-fg-muted opacity-60" />
                                            : status === 'complete'
                                                ? <CheckCircle2 size={16} className="text-success" />
                                                : status === 'in_progress'
                                                    ? <Clock size={16} className="text-primary" />
                                                    : null}
                                    </div>

                                    <div className="w-full bg-black/10 rounded-full h-1.5 mb-3">
                                        <div
                                            className={`h-1.5 rounded-full transition-all ${status === 'complete' ? 'bg-success' : 'bg-primary'}`}
                                            style={{ width: `${(stats.si / stats.total) * 100}%` }}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${isFaseCerrada ? 'bg-success-soft text-success border-success/20' : `${style.bg} ${style.text} ${style.border}`}`}>
                                            {isFaseCerrada ? 'Archivada' : style.label}
                                        </span>
                                        <span className={`text-[11px] font-semibold ${style.text}`}>
                                            {stats.si}/{stats.total}
                                        </span>
                                    </div>

                                    {fase.fecha && (
                                        <p className={`text-[10px] mt-2 flex items-center gap-1 ${style.text} opacity-70`}>
                                            <Calendar size={10} />
                                            {new Date(fase.fecha).toLocaleDateString('es-PE')}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Error de cerrar fase */}
                    {cerrarError && (
                        <div className="mt-2 rounded-[8px] border border-danger/30 bg-danger-soft p-3 flex items-center gap-2">
                            <AlertCircle size={14} className="text-danger flex-shrink-0" />
                            <p className="text-danger text-[12px] font-medium">{cerrarError}</p>
                        </div>
                    )}

                    {/* Banner Fase I */}
                    {fase1Done && !fase1Cerrada && (
                        <div className="mt-2 rounded-[8px] border border-warning/40 bg-warning-soft p-4 flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <CheckCircle2 size={18} className="text-warning flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold text-warning text-[13px]">Fase I completada — todos los logros en SÍ</p>
                                    <p className="text-[12px] text-fg-muted mt-0.5">
                                        Cierra la Fase I para generar su PDF y registrarlo en el Expediente Digital.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleCerrarFase(1)}
                                disabled={cerrando === 1}
                                className="flex items-center gap-2 bg-warning text-white font-bold px-4 py-2 rounded-[6px] text-[12px] hover:bg-warning/90 transition-all disabled:opacity-60 whitespace-nowrap flex-shrink-0"
                            >
                                {cerrando === 1 ? <Loader2 size={13} className="animate-spin" /> : <BookCheck size={13} />}
                                {cerrando === 1 ? 'Cerrando...' : 'Cerrar Fase I'}
                            </button>
                        </div>
                    )}
                    {fase1Cerrada && (
                        <div className="mt-2 rounded-[8px] border border-warning/20 bg-warning-soft/40 p-3 flex items-center gap-2">
                            <CheckCircle2 size={14} className="text-warning" />
                            <p className="text-[12px] text-warning font-semibold">Fase I archivada en el Expediente Digital.</p>
                        </div>
                    )}

                    {/* Banner Fase II */}
                    {fase1Cerrada && fase2Done && !fase2Cerrada && (
                        <div className="mt-2 rounded-[8px] border border-primary/40 bg-primary-soft p-4 flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <CheckCircle2 size={18} className="text-primary flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold text-primary text-[13px]">Fase II completada — todos los logros en SÍ</p>
                                    <p className="text-[12px] text-fg-muted mt-0.5">
                                        Cierra la Fase II para generar su PDF y registrarlo en el Expediente Digital.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleCerrarFase(2)}
                                disabled={cerrando === 2}
                                className="flex items-center gap-2 bg-primary text-primary-fg font-bold px-4 py-2 rounded-[6px] text-[12px] hover:bg-primary/90 transition-all disabled:opacity-60 whitespace-nowrap flex-shrink-0"
                            >
                                {cerrando === 2 ? <Loader2 size={13} className="animate-spin" /> : <BookCheck size={13} />}
                                {cerrando === 2 ? 'Cerrando...' : 'Cerrar Fase II'}
                            </button>
                        </div>
                    )}
                    {fase2Cerrada && (
                        <div className="mt-2 rounded-[8px] border border-primary/20 bg-primary-soft/40 p-3 flex items-center gap-2">
                            <CheckCircle2 size={14} className="text-primary" />
                            <p className="text-[12px] text-primary font-semibold">Fase II archivada en el Expediente Digital.</p>
                        </div>
                    )}

                    {/* Banner Fase III — lista para finalizar */}
                    {fase2Cerrada && fase3Done && !fase3Cerrada && (
                        <div className="mt-2 rounded-[8px] border border-success/30 bg-success-soft p-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3">
                                    <CheckCircle2 size={20} className="text-success flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-success text-[14px]">
                                            Fase III completada — los 20 logros en SÍ
                                        </p>
                                        <p className="text-[12px] text-fg-muted mt-1">
                                            Al finalizar se genera el PDF de Fase III y se archiva en el Expediente Digital. El NNA estará listo para el egreso.
                                        </p>
                                        {finalizeError && (
                                            <p className="text-danger text-[12px] font-medium mt-2 flex items-center gap-1">
                                                <AlertCircle size={13} /> {finalizeError}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={handleFinalizar}
                                    disabled={isFinalizing}
                                    className="flex items-center gap-2 bg-success text-white font-bold px-5 py-2.5 rounded-[6px] shadow hover:bg-success/90 transition-all text-[13px] disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0"
                                >
                                    {isFinalizing
                                        ? <><Loader2 size={15} className="animate-spin" /> Finalizando...</>
                                        : <><FlagTriangleRight size={15} /> Cerrar Fase III y Egresar</>
                                    }
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Confirmación post-finalización */}
                    {fase3Cerrada && (
                        <div className="mt-2 rounded-[8px] border border-success/30 bg-success-soft p-4 flex items-center gap-3">
                            <CheckCircle2 size={20} className="text-success flex-shrink-0" />
                            <div>
                                <p className="font-bold text-success text-[14px]">Ficha de Logros finalizada y registrada en el Expediente</p>
                                <p className="text-[12px] text-fg-muted mt-0.5">
                                    El PDF está disponible en el Expediente Digital del NNA.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
