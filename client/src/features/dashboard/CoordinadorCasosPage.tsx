import { useState, useEffect } from 'react';
import { toast } from '../../components/ui/Toast';
import { confirmar } from '../../components/ui/ConfirmDialog';
import { ampliarVigencia } from '../../api/pti.api';
import { useAuthStore } from '../../store/auth.store';
import { 
    Users, Clock, Check, X, ArrowLeft, RefreshCw, AlertTriangle, 
    UserPlus, ShieldAlert, MapPin, Compass, CheckCircle2, ChevronRight, FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { NNA_API_URL } from '../../config/api';
import { getUsers } from '../../api/usuario.api';

export const CoordinadorCasosPage = () => {
    const { token } = useAuthStore();
    const [activeTab, setActiveTab] = useState<'asignaciones' | 'semaforo' | 'territorial'>('asignaciones');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // --- ESTADO 1: ASIGNACIONES Y RATIOS (datos reales del endpoint de supervisión) ---
    const [casosNna, setCasosNna] = useState<any[]>([]);
    const [educadoresDisponibles, setEducadoresDisponibles] = useState<any[]>([]);

    // --- ESTADO 2: SEMÁFORO METODOLÓGICO (datos reales) ---
    const [casosSemaforo, setCasosSemaforo] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoadingData(true);
        try {
            const res = await fetch(`${NNA_API_URL}/casos/supervision/sede`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Error consultando supervisión de sede');
            const data = await res.json();

            const PERFIL_LABEL: Record<string, string> = {
                VIDA_EN_CALLE: 'Vida en Calle', MENDICIDAD: 'Mendicidad', TRABAJO_INFANTIL: 'Trabajo Infantil',
            };

            setCasosNna((data.casos || []).map((c: any) => ({
                id: c.id,
                nombre: c.nna_nombre || `NNA ID: ${c.nna_id}`,
                edad: c.edad ?? '—',
                perfil: PERFIL_LABEL[c.perfil] || c.perfil || '—',
                educadorId: c.responsable_id,
                educadorNombre: c.responsable_nombre || 'Sin educador asignado',
                carpeta: c.codigo_caso || `CAS-${c.id}`,
                nnaId: c.nna_id,
                carpetaId: c.carpeta_id,
            })));

            setCasosSemaforo((data.casos || []).map((c: any) => ({
                id: c.id,
                nombre: c.nna_nombre || `NNA ID: ${c.nna_id}`,
                fase: c.fase,
                diasTranscurridos: c.dias_transcurridos,
                diasLimite: c.dias_limite,
                faltaF04: !c.tiene_f04,
                faltaPti: !c.tiene_pti,
                estadoPlazo: c.estado_plazo,
                ptiId: c.pti_id,
                ampliado: false,
            })));

            setEducadoresDisponibles((data.educadores || []).map((e: any) => ({
                id: e.id, nombre: e.nombre, carga: e.carga, max: e.max || 30,
                perfilExclusivo: '',
            })));
        } catch (e) {
            console.error('Error loadData in CoordinadorCasosPage:', e);
            toast.error('No se pudieron cargar los datos de supervisión de la sede.');
        } finally {
            setLoadingData(false);
        }
    };

    const handleReasignarEducador = async (nnaId: number, nuevoEducadorId: number) => {
        const educador = educadoresDisponibles.find(e => e.id === nuevoEducadorId);
        if (!educador) return;

        // Validar candado de ratio de carga de trabajo
        if (educador.carga >= educador.max) {
            toast.error(`⚠️ ALERTA DE RATIO: ${educador.nombre} ha alcanzado su límite máximo de carga laboral (${educador.carga}/${educador.max} NNA). No se puede asignar más casos según el protocolo del INABIF.`);
            return;
        }

        try {
            const res = await fetch(`${NNA_API_URL}/casos/${nnaId}/reasignar`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    nuevo_responsable_id: nuevoEducadorId,
                    motivo: 'Reasignación desde el Tablero de Control Metodológico'
                })
            });
            if (res.ok) {
                setCasosNna(prev => 
                    prev.map(c => c.id === nnaId ? { ...c, educadorId: nuevoEducadorId, educadorNombre: educador.nombre } : c)
                );
                toast.success(`Caso reasignado exitosamente a: ${educador.nombre}. Se notificará al educador vía alerta en su tablero.`);
            } else {
                toast.error('Error al reasignar caso en la base de datos.');
            }
        } catch (e) {
            console.error(e);
            toast.error('Error al conectar con el servidor.');
        }
    };

    // --- ESTADO 2: SEMÁFORO METODOLÓGICO Y CANDADOS ---
    // (Mapeado dinámico ya inicializado en loadData)

    const handleAutorizarAmpliacion = async (id: number) => {
        const caso = casosSemaforo.find(c => c.id === id);
        if (!caso) return;
        if (!caso.ptiId) {
            toast.info('Este caso no tiene un Plan de Intervención activo. La ampliación de plazo se autoriza desde el PII (Informe de Ampliación).');
            return;
        }
        if (!(await confirmar(
            `Se ampliará en 30 días la vigencia del plan de ${caso.nombre}. Registra el sustento en el Informe de Ampliación del PII.`,
            { titulo: 'Autorizar ampliación de plazo', textoConfirmar: 'Autorizar +30 días' }
        ))) return;
        try {
            await ampliarVigencia(caso.ptiId, 30);
            toast.success('Ampliación de 30 días autorizada. El plazo del caso fue actualizado.');
            await loadData();
        } catch {
            toast.error('No se pudo registrar la ampliación.');
        }
    };

    // --- ESTADO 3: CONTROL TERRITORIAL F01 ---
    // Módulo no operativo: el mapeo de zonas F01 aún no está implementado en el sistema.
    // No mostrar datos simulados para evitar decisiones sobre información falsa.

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadData();
        setIsRefreshing(false);
    };

    const filteredCasos = casosNna.filter(c => 
        c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.carpeta.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.educadorNombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                            <h1 className="text-xl font-black tracking-tight">Tablero de Control Metodológico</h1>
                        </div>
                        <p className="text-blue-100 text-xs font-medium opacity-80">
                            Supervisión de plazos de intervención, reasignación ágil de educadores y aprobación de zonas (F01)
                        </p>
                    </div>
                    <div className="flex items-center bg-white/10 p-1 rounded-lg border border-white/5 shrink-0">
                        <button
                            onClick={() => setActiveTab('asignaciones')}
                            className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase transition-all duration-150 ${activeTab === 'asignaciones' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-100 hover:text-white'}`}
                        >
                            Asignaciones ({casosNna.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('semaforo')}
                            className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase transition-all duration-150 ${activeTab === 'semaforo' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-100 hover:text-white'}`}
                        >
                            Plazos y Alertas ({casosSemaforo.filter(s => s.estadoPlazo !== 'ÓPTIMO').length})
                        </button>
                        <button
                            onClick={() => setActiveTab('territorial')}
                            className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase transition-all duration-150 ${activeTab === 'territorial' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-100 hover:text-white'}`}
                        >
                            Zonas F01
                        </button>
                    </div>
                </div>
            </div>

            {/* CONTENIDO PESTAÑA 1: ASIGNACIONES Y RATIOS */}
            {activeTab === 'asignaciones' && (
                <div className="bg-surface rounded-xl border border-border p-5 space-y-4 shadow-sm animate-fadeIn">
                    <div>
                        <h3 className="text-sm font-black text-fg uppercase tracking-widest">
                            Asignación Inteligente y Ratios de Sede
                        </h3>
                        <p className="text-xs text-fg-secondary">
                            Reasigne educadores en caliente controlando los límites estrictos de carga laboral (Ratio máx: 30 Vida en calle / 60 Trabajo infantil)
                        </p>
                    </div>

                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Buscar NNA o educador en la sede..."
                            className="w-full pl-3 pr-3 py-2 bg-surface border border-border rounded-lg text-[13px] text-fg focus:outline-none focus:border-primary transition-colors placeholder:text-fg-muted"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-border bg-white">
                        <table className="w-full text-left text-[13px]">
                            <thead className="bg-surface-muted text-fg-secondary uppercase tracking-wider font-bold text-[10px] border-b border-border">
                                <tr>
                                    <th className="px-4 py-3">Beneficiario (NNA)</th>
                                    <th className="px-4 py-3">Carpeta Familiar</th>
                                    <th className="px-4 py-3">Perfil de Calle</th>
                                    <th className="px-4 py-3">Educador Responsable</th>
                                    <th className="px-4 py-3 text-right">Reasignación Rápida</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border font-medium">
                                {filteredCasos.map(nna => (
                                    <tr key={nna.id} className="hover:bg-surface-muted/30 transition-colors">
                                        <td className="px-4 py-3.5 font-bold text-fg">{nna.nombre}</td>
                                        <td className="px-4 py-3.5 font-mono text-fg-muted">{nna.carpeta}</td>
                                        <td className="px-4 py-3.5">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                nna.perfil === 'Vida en Calle' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                                            }`}>
                                                {nna.perfil}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-fg-secondary">
                                            {nna.educadorNombre}
                                        </td>
                                        <td className="px-4 py-3.5 text-right">
                                            <select
                                                onChange={(e) => handleReasignarEducador(nna.id, Number(e.target.value))}
                                                value={nna.educadorId}
                                                className="bg-surface border border-border rounded-md px-2.5 py-1 text-[11px] font-bold text-fg-secondary focus:outline-none focus:border-primary cursor-pointer hover:bg-surface-muted transition-colors"
                                            >
                                                {educadoresDisponibles.map(e => (
                                                    <option key={e.id} value={e.id}>
                                                        {e.nombre} ({e.carga}/{e.max})
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* CONTENIDO PESTAÑA 2: PLAZOS Y ALERTAS (SEMÁFORO METODOLÓGICO) */}
            {activeTab === 'semaforo' && (
                <div className="bg-surface rounded-xl border border-border p-5 space-y-4 shadow-sm animate-fadeIn">
                    <div>
                        <h3 className="text-sm font-black text-fg uppercase tracking-widest">
                            Control Metodológico de Plazos de Intervención
                        </h3>
                        <p className="text-xs text-fg-secondary">
                            Supervise el cumplimiento de tiempos del protocolo e ingrese resoluciones de ampliación técnica para desbloquear casos expirados
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {casosSemaforo.map(c => {
                            const porcentaje = Math.round((c.diasTranscurridos / c.diasLimite) * 100);
                            return (
                                <div key={c.id} className="p-4 rounded-xl bg-white border border-border shadow-sm flex flex-col gap-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold text-[13px] text-fg">{c.nombre}</h4>
                                            <span className="text-[10px] text-fg-muted font-bold font-mono">{c.fase}</span>
                                        </div>
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                            c.estadoPlazo === 'CRÍTICO' ? 'bg-danger-soft text-danger' : c.estadoPlazo === 'ADVERTENCIA' ? 'bg-warning-soft text-warning' : 'bg-success-soft text-success'
                                        }`}>
                                            {c.estadoPlazo === 'CRÍTICO' && <ShieldAlert size={10} />}
                                            {c.estadoPlazo}
                                        </span>
                                    </div>

                                    {/* Barra de Progreso */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[11px] font-medium text-fg-muted">
                                            <span>Tiempo Transcurrido</span>
                                            <span>{c.diasTranscurridos} / {c.diasLimite} días ({porcentaje}%)</span>
                                        </div>
                                        <div className="w-full bg-bg rounded-full h-2 overflow-hidden border border-border">
                                            <div 
                                                className={`h-full rounded-full transition-all ${
                                                    c.estadoPlazo === 'CRÍTICO' ? 'bg-danger' : c.estadoPlazo === 'ADVERTENCIA' ? 'bg-warning' : 'bg-primary'
                                                }`}
                                                style={{ width: `${Math.min(porcentaje, 100)}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Documentos Pendientes */}
                                    <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
                                        {c.faltaF04 && (
                                            <span className="flex items-center gap-1 bg-danger-soft text-danger px-2.5 py-0.5 rounded-md border border-danger/10">
                                                <X size={10} /> Falta F04 Diagnóstico
                                            </span>
                                        )}
                                        {c.faltaPti && (
                                            <span className="flex items-center gap-1 bg-danger-soft text-danger px-2.5 py-0.5 rounded-md border border-danger/10">
                                                <X size={10} /> Falta PTI
                                            </span>
                                        )}
                                        {!c.faltaF04 && !c.faltaPti && (
                                            <span className="flex items-center gap-1 bg-success-soft text-success px-2.5 py-0.5 rounded-md border border-success/10">
                                                <Check size={10} /> Documentación Metodológica Completa
                                            </span>
                                        )}
                                    </div>

                                    {/* Botones de acción */}
                                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-border">
                                        {c.ampliado ? (
                                            <span className="text-[10px] text-success font-bold flex items-center gap-1 bg-success-soft px-2 py-1 rounded-md">
                                                <CheckCircle2 size={11} /> Ampliado +30 días
                                            </span>
                                        ) : (
                                            <span className="text-[10px] text-fg-muted font-medium italic">
                                                {c.estadoPlazo === 'CRÍTICO' ? 'Requiere ampliación urgente' : 'Dentro del plazo regular'}
                                            </span>
                                        )}

                                        {(c.estadoPlazo === 'CRÍTICO' || c.estadoPlazo === 'ADVERTENCIA') && !c.ampliado && (
                                            <button
                                                onClick={() => handleAutorizarAmpliacion(c.id)}
                                                className="px-2.5 py-1.5 bg-[#1e40af] hover:bg-blue-800 text-white rounded-md text-[10px] font-bold uppercase transition-colors"
                                            >
                                                Autorizar Ampliación
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* CONTENIDO PESTAÑA 3: APROBACIÓN TERRITORIAL (F01) — módulo pendiente de implementación */}
            {activeTab === 'territorial' && (
                <div className="bg-surface rounded-xl border border-border p-5 shadow-sm animate-fadeIn">
                    <div className="text-center py-12 bg-surface-muted/30 rounded-xl border border-dashed border-border max-w-xl mx-auto">
                        <MapPin className="mx-auto mb-3 text-fg-muted" size={28} />
                        <p className="font-bold text-[13px] text-fg">Módulo en construcción</p>
                        <p className="text-xs text-fg-muted mt-2 max-w-sm mx-auto leading-relaxed">
                            La aprobación de Zonas de Intervención (F01 Conteo) estará disponible cuando
                            el registro de zonas esté mapeado en el sistema. Mientras tanto, las zonas se
                            gestionan según el procedimiento manual vigente.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
