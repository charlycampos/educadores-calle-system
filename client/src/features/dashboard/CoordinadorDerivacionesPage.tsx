import { useEffect, useState } from 'react';
import { toast } from '../../components/ui/Toast';
import { Clock, Check, X, ArrowLeft, RefreshCw, AlertCircle, Inbox, ExternalLink, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getDerivacionesPendientes, responderDerivacion } from '../../api/derivacion.api';
import { Button } from '../../components/ui/Button';

type FiltroTipo = 'TODOS' | 'INTERNA' | 'EXTERNA';

function diasEspera(fecha: string): number {
    return Math.floor((Date.now() - new Date(fecha).getTime()) / 86400000);
}

export const CoordinadorDerivacionesPage = () => {
    const [derivacionesPendientes, setDerivacionesPendientes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [filtro, setFiltro] = useState<FiltroTipo>('TODOS');

    // Modal de respuesta (aprobar/rechazar con observaciones)
    const [respuesta, setRespuesta] = useState<{ derivacion: any; accion: 'ACEPTAR' | 'RECHAZAR' } | null>(null);
    const [obs, setObs] = useState('');
    const [enviando, setEnviando] = useState(false);

    const loadDerivaciones = async () => {
        try {
            setLoading(true);
            const list = await getDerivacionesPendientes();
            setDerivacionesPendientes(list);
        } catch (error) {
            console.error('Error al cargar derivaciones pendientes:', error);
            toast.error('No se pudieron cargar las derivaciones pendientes.');
        } finally {
            setLoading(false);
        }
    };

    const abrirRespuesta = (derivacion: any, accion: 'ACEPTAR' | 'RECHAZAR') => {
        setObs('');
        setRespuesta({ derivacion, accion });
    };

    const enviarRespuesta = async () => {
        if (!respuesta) return;
        if (respuesta.accion === 'RECHAZAR' && !obs.trim()) {
            toast.info('Debe ingresar un motivo para el rechazo.');
            return;
        }
        setEnviando(true);
        try {
            await responderDerivacion(respuesta.derivacion.id, respuesta.accion, obs.trim());
            toast.success(`Derivación ${respuesta.accion === 'ACEPTAR' ? 'aprobada' : 'rechazada'} con éxito.`);
            setRespuesta(null);
            await loadDerivaciones();
        } catch (error) {
            console.error(error);
            toast.error('Ocurrió un error al responder la derivación.');
        } finally {
            setEnviando(false);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadDerivaciones();
        setIsRefreshing(false);
    };

    useEffect(() => {
        loadDerivaciones();
    }, []);

    const totalInternas = derivacionesPendientes.filter(d => d.tipo === 'INTERNA').length;
    const totalExternas = derivacionesPendientes.filter(d => d.tipo === 'EXTERNA').length;
    const visibles = derivacionesPendientes.filter(d => filtro === 'TODOS' || d.tipo === filtro);

    const kpis: { id: FiltroTipo; label: string; valor: number; sub: string; icon: React.ReactNode; cls: string }[] = [
        { id: 'TODOS',   label: 'Total Pendientes',       valor: derivacionesPendientes.length, sub: 'Solicitudes pendientes en sede',        icon: <Inbox size={20} />,       cls: 'bg-purple-50 text-purple-600' },
        { id: 'INTERNA', label: 'Derivaciones Internas',  valor: totalInternas,                 sub: 'A Psicología, Trabajo Social o Legal',  icon: <Clock size={20} />,       cls: 'bg-blue-50 text-blue-600' },
        { id: 'EXTERNA', label: 'Canalizaciones Externas', valor: totalExternas,                sub: 'A DEMUNA, UPE, Fiscalía, etc.',          icon: <AlertCircle size={20} />, cls: 'bg-orange-50 text-orange-600' },
    ];

    return (
        <div className="space-y-6 font-sans">
            {/* Header / Banner Superior */}
            <div className="bg-[#1e40af] text-white p-6 rounded-xl shadow-md">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Link to="/dashboard" className="text-blue-200 hover:text-white transition-colors">
                                <ArrowLeft size={16} />
                            </Link>
                            <h1 className="text-xl font-black tracking-tight">Bandeja de Aprobaciones de Sede</h1>
                        </div>
                        <p className="text-blue-100 text-xs font-medium opacity-80">
                            Autorización de derivaciones internas a especialistas y canalizaciones externas
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={handleRefresh}
                            className="bg-white/10 hover:bg-white/20 text-white border-white/10 gap-1.5"
                            loading={isRefreshing}
                        >
                            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                            Sincronizar
                        </Button>
                    </div>
                </div>
            </div>

            {/* KPIs que además filtran la cola */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {kpis.map(k => (
                    <button key={k.id} onClick={() => setFiltro(k.id)}
                        className={`bg-white p-4 rounded-xl border text-left flex items-center gap-3 transition-all ${
                            filtro === k.id ? 'border-primary ring-2 ring-primary/20 shadow-sm' : 'border-border hover:border-border-strong'
                        }`}>
                        <div className={`p-3 rounded-lg ${k.cls}`}>{k.icon}</div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{k.label}</p>
                            <p className="text-xl font-black text-gray-900">{k.valor}</p>
                            <p className="text-[10px] text-gray-400">{k.sub}</p>
                        </div>
                    </button>
                ))}
            </div>

            {/* Listado Principal de Derivaciones */}
            <div className="bg-surface rounded-xl border border-border p-5 space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <h3 className="text-sm font-black text-fg uppercase tracking-widest">
                            Cola de Derivaciones Pendientes
                        </h3>
                        <p className="text-xs text-fg-secondary">
                            Ordenadas por antigüedad — la más antigua primero. Revisa el expediente antes de aprobar.
                        </p>
                    </div>
                    {filtro !== 'TODOS' && (
                        <button onClick={() => setFiltro('TODOS')}
                            className="text-[11px] font-bold text-primary hover:underline self-start sm:self-auto">
                            Quitar filtro ({filtro === 'INTERNA' ? 'internas' : 'externas'})
                        </button>
                    )}
                </div>

                {loading && !isRefreshing ? (
                    <div className="text-center py-12 text-fg-muted italic text-xs">
                        Cargando solicitudes...
                    </div>
                ) : visibles.length === 0 ? (
                    <div className="text-center py-10 text-fg-muted bg-surface-muted/30 rounded-xl border border-dashed border-border">
                        <Check className="mx-auto mb-2 text-success w-8 h-8" />
                        <p className="font-bold text-[13px] text-fg">¡Bandeja al día!</p>
                        <p className="text-xs text-fg-muted mt-1">
                            {filtro === 'TODOS'
                                ? 'El equipo de educadores no tiene derivaciones pendientes de aprobación.'
                                : 'No hay derivaciones pendientes de este tipo.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {visibles.map((d) => {
                            const dias = diasEspera(d.fecha_derivacion);
                            const esperaCls = dias >= 7 ? 'bg-danger-soft text-danger' : dias >= 3 ? 'bg-warning-soft text-warning' : 'bg-surface-muted text-fg-muted';
                            return (
                                <div 
                                    key={d.id} 
                                    className="p-4 rounded-xl border border-border bg-white flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 transition-all hover:shadow-md"
                                >
                                    <div className="space-y-2 flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-[13px] font-bold text-fg">
                                                {d.nna_nombre || `Caso ID: ${d.caso_id}`}
                                            </span>
                                            {d.codigo_caso && (
                                                <span className="text-[10px] font-mono font-bold text-primary bg-primary-soft px-2 py-0.5 rounded-md">
                                                    {d.codigo_caso}
                                                </span>
                                            )}
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                d.tipo === 'INTERNA' 
                                                    ? 'bg-blue-soft text-blue border border-blue/10' 
                                                    : 'bg-warning-soft text-warning border border-warning/10'
                                            }`}>
                                                {d.tipo}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${esperaCls}`}>
                                                {dias === 0 ? 'Hoy' : `Hace ${dias} día${dias === 1 ? '' : 's'}`}
                                            </span>
                                        </div>
                                        
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-fg-muted font-medium">
                                            <span>Solicita: <strong className="text-fg-secondary">{d.remitente_nombre || `Educador ID ${d.remitente_id}`}</strong></span>
                                            {d.tipo === 'INTERNA' ? (
                                                <span>Para: <strong className="text-fg-secondary">{d.destinatario_nombre || `Especialista ID ${d.destinatario_id}`}</strong></span>
                                            ) : (
                                                <span>Entidad Externa: <strong className="text-fg-secondary">{d.entidad_externa}</strong></span>
                                            )}
                                            <span className="text-[10px] text-fg-muted font-mono">
                                                {new Date(d.fecha_derivacion).toLocaleDateString('es-PE')}
                                            </span>
                                        </div>

                                        <div className="bg-bg p-3.5 rounded-lg border border-border max-w-3xl">
                                            <p className="text-[12px] text-fg-secondary leading-relaxed">
                                                <strong className="text-fg font-semibold">Motivo de la Derivación:</strong> {d.motivo}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0 self-end lg:self-center w-full lg:w-auto">
                                        {d.nna_id && (
                                            <Link
                                                to={`/nna/expediente/${d.carpeta_id ?? d.nna_id}?nnaId=${d.nna_id}`}
                                                className="flex-1 lg:flex-initial px-3 py-2 bg-white hover:bg-primary-soft text-primary border border-primary/30 rounded-lg text-[11px] font-black uppercase transition-colors flex items-center justify-center gap-1.5"
                                                title="Abrir expediente digital del NNA"
                                            >
                                                <ExternalLink size={13} /> Expediente
                                            </Link>
                                        )}
                                        <button
                                            onClick={() => abrirRespuesta(d, 'ACEPTAR')}
                                            className="flex-1 lg:flex-initial px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[11px] font-black uppercase transition-colors shadow-sm flex items-center justify-center gap-1.5"
                                        >
                                            <Check size={13} /> Aprobar
                                        </button>
                                        <button
                                            onClick={() => abrirRespuesta(d, 'RECHAZAR')}
                                            className="flex-1 lg:flex-initial px-4 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-lg text-[11px] font-black uppercase transition-colors shadow-sm flex items-center justify-center gap-1.5"
                                        >
                                            <X size={13} /> Rechazar
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal de respuesta */}
            {respuesta && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                    onClick={() => !enviando && setRespuesta(null)}>
                    <div className="bg-surface rounded-xl w-full max-w-md shadow-[var(--shadow-3)] overflow-hidden"
                        onClick={e => e.stopPropagation()}>
                        <div className="border-b border-border px-4 py-3.5">
                            <h3 className="text-[14px] font-semibold text-fg">
                                {respuesta.accion === 'ACEPTAR' ? 'Aprobar derivación' : 'Rechazar derivación'}
                            </h3>
                            <p className="text-[11px] text-fg-muted mt-0.5">
                                {respuesta.derivacion.nna_nombre || `Caso ${respuesta.derivacion.caso_id}`} · solicitada por {respuesta.derivacion.remitente_nombre || `ID ${respuesta.derivacion.remitente_id}`}
                            </p>
                        </div>
                        <div className="px-4 py-4">
                            <label className="block text-[11px] font-bold text-fg-muted uppercase tracking-wider mb-1.5">
                                {respuesta.accion === 'RECHAZAR' ? 'Motivo del rechazo (obligatorio)' : 'Observaciones (opcional)'}
                            </label>
                            <textarea value={obs} onChange={e => setObs(e.target.value)} rows={3} autoFocus
                                placeholder={respuesta.accion === 'RECHAZAR'
                                    ? 'Explica detalladamente por qué se rechaza esta derivación...'
                                    : 'Indicaciones para el especialista o entidad...'}
                                className="w-full border border-border rounded-lg bg-surface text-fg text-[13px] outline-none resize-none focus:border-primary transition-colors p-2.5" />
                        </div>
                        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
                            <button onClick={() => setRespuesta(null)} disabled={enviando}
                                className="text-[13px] font-medium text-fg-muted hover:text-fg px-4 py-2 rounded-lg hover:bg-surface-muted transition-colors">
                                Cancelar
                            </button>
                            <button onClick={enviarRespuesta} disabled={enviando}
                                className={`flex items-center gap-1.5 text-white px-4 py-2 rounded-lg text-[13px] font-bold active:scale-95 transition-all disabled:opacity-50 ${
                                    respuesta.accion === 'ACEPTAR' ? 'bg-green-600 hover:bg-green-700' : 'bg-danger hover:opacity-90'
                                }`}>
                                {enviando ? <Loader2 size={13} className="animate-spin" /> : respuesta.accion === 'ACEPTAR' ? <Check size={13} /> : <X size={13} />}
                                {respuesta.accion === 'ACEPTAR' ? 'Aprobar' : 'Rechazar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
