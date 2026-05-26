import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { Clock, Check, X, ArrowLeft, RefreshCw, AlertCircle, Inbox } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getDerivacionesPendientes, responderDerivacion } from '../../api/derivacion.api';
import { Button } from '../../components/ui/Button';

export const CoordinadorDerivacionesPage = () => {
    const { user } = useAuthStore();
    const [derivacionesPendientes, setDerivacionesPendientes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const loadDerivaciones = async () => {
        try {
            setLoading(true);
            const list = await getDerivacionesPendientes();
            setDerivacionesPendientes(list);
        } catch (error) {
            console.error('Error al cargar derivaciones pendientes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleResponder = async (id: number, accion: 'ACEPTAR' | 'RECHAZAR') => {
        let obs = '';
        if (accion === 'RECHAZAR') {
            const input = prompt('Ingrese detalladamente el motivo del rechazo de esta derivación:');
            if (input === null) return; // cancelado
            if (!input.trim()) {
                alert('Debe ingresar un motivo para el rechazo.');
                return;
            }
            obs = input;
        } else {
            const input = prompt('Ingrese observaciones de aprobación (opcional):');
            if (input !== null) obs = input;
        }

        try {
            setLoading(true);
            await responderDerivacion(id, accion, obs);
            alert(`Derivación ${accion === 'ACEPTAR' ? 'aprobada' : 'rechazada'} con éxito.`);
            await loadDerivaciones();
        } catch (error) {
            console.error(error);
            alert('Ocurrió un error al responder la derivación.');
        } finally {
            setLoading(false);
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

            {/* KPIs de Derivaciones */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-border flex items-center gap-3">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                        <Inbox size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Pendientes</p>
                        <p className="text-xl font-black text-gray-900">{derivacionesPendientes.length}</p>
                        <p className="text-[10px] text-gray-400">Solicitudes pendientes en sede</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-border flex items-center gap-3">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                        <Clock size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Derivaciones Internas</p>
                        <p className="text-xl font-black text-gray-900">{totalInternas}</p>
                        <p className="text-[10px] text-gray-400">A Psicología, Trabajo Social o Legal</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-border flex items-center gap-3">
                    <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
                        <AlertCircle size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Canalizaciones Externas</p>
                        <p className="text-xl font-black text-gray-900">{totalExternas}</p>
                        <p className="text-[10px] text-gray-400">A DEMUNA, UPE, Fiscalía, etc.</p>
                    </div>
                </div>
            </div>

            {/* Listado Principal de Derivaciones */}
            <div className="bg-surface rounded-xl border border-border p-5 space-y-4 shadow-sm">
                <div>
                    <h3 className="text-sm font-black text-fg uppercase tracking-widest">
                        Cola de Derivaciones Pendientes
                    </h3>
                    <p className="text-xs text-fg-secondary">
                        Revise el sustento ingresado por el educador antes de derivar formalmente al beneficiario
                    </p>
                </div>

                {loading && !isRefreshing ? (
                    <div className="text-center py-12 text-fg-muted italic text-xs">
                        Cargando solicitudes...
                    </div>
                ) : derivacionesPendientes.length === 0 ? (
                    <div className="text-center py-10 text-fg-muted bg-surface-muted/30 rounded-xl border border-dashed border-border">
                        <Check className="mx-auto mb-2 text-success w-8 h-8" />
                        <p className="font-bold text-[13px] text-fg">¡Bandeja al día!</p>
                        <p className="text-xs text-fg-muted mt-1">
                            El equipo de educadores no tiene derivaciones pendientes de aprobación.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {derivacionesPendientes.map((d) => (
                            <div 
                                key={d.id} 
                                className="p-4 rounded-xl border border-border bg-white flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 transition-all hover:shadow-md"
                            >
                                <div className="space-y-2 flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-[13px] font-bold text-fg">Caso ID: {d.caso_id}</span>
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                            d.tipo === 'INTERNA' 
                                                ? 'bg-blue-soft text-blue border border-blue/10' 
                                                : 'bg-warning-soft text-warning border border-warning/10'
                                        }`}>
                                            {d.tipo}
                                        </span>
                                        <span className="text-[10px] text-fg-muted bg-surface-muted border border-border px-2 py-0.5 rounded-md font-mono font-medium">
                                            Fecha: {new Date(d.fecha_derivacion).toLocaleDateString()}
                                        </span>
                                    </div>
                                    
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-fg-muted font-medium">
                                        <span>Remitente (Educador ID): <strong className="text-fg-secondary">{d.remitente_id}</strong></span>
                                        {d.tipo === 'INTERNA' ? (
                                            <span>Destinatario (Especialista ID): <strong className="text-fg-secondary">{d.destinatario_id}</strong></span>
                                        ) : (
                                            <span>Entidad Externa: <strong className="text-fg-secondary">{d.entidad_externa}</strong></span>
                                        )}
                                    </div>

                                    <div className="bg-bg p-3.5 rounded-lg border border-border max-w-3xl">
                                        <p className="text-[12px] text-fg-secondary leading-relaxed">
                                            <strong className="text-fg font-semibold">Motivo de la Derivación:</strong> {d.motivo}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 self-end lg:self-center w-full lg:w-auto">
                                    <button
                                        onClick={() => handleResponder(d.id, 'ACEPTAR')}
                                        className="flex-1 lg:flex-initial px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[11px] font-black uppercase transition-colors shadow-sm flex items-center justify-center gap-1.5"
                                    >
                                        <Check size={13} /> Aprobar
                                    </button>
                                    <button
                                        onClick={() => handleResponder(d.id, 'RECHAZAR')}
                                        className="flex-1 lg:flex-initial px-4 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-lg text-[11px] font-black uppercase transition-colors shadow-sm flex items-center justify-center gap-1.5"
                                    >
                                        <X size={13} /> Rechazar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
