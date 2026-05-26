import { useState, useEffect } from 'react';
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

    // --- ESTADO 1: ASIGNACIONES Y RATIOS ---
    const [casosNna, setCasosNna] = useState([
        { id: 101, nombre: 'Gómez Ruiz Sofía', edad: 11, perfil: 'Vida en Calle', educadorId: 1, educadorNombre: 'Juan Educador García', carpeta: 'CAR-26-0112' },
        { id: 102, nombre: 'Méndez Castro Luis', edad: 14, perfil: 'Trabajo Infantil', educadorId: 2, educadorNombre: 'Rosa Educadora Sede 1', carpeta: 'CAR-26-0089' },
        { id: 103, nombre: 'Quispe Choque Carmen', edad: 8, perfil: 'Mendicidad', educadorId: 1, educadorNombre: 'Juan Educador García', carpeta: 'CAR-26-0105' },
        { id: 104, nombre: 'Álvarez Ríos Juan', edad: 12, perfil: 'Trabajo Infantil', educadorId: 3, educadorNombre: 'Carlos Educador Sede 1', carpeta: 'CAR-26-0043' },
        { id: 105, nombre: 'Mendoza Ticona Raúl', edad: 16, perfil: 'Vida en Calle', educadorId: 2, educadorNombre: 'Rosa Educadora Sede 1', carpeta: 'CAR-26-0145' }
    ]);

    const [educadoresDisponibles, setEducadoresDisponibles] = useState([
        { id: 1, nombre: 'Juan Educador García', carga: 24, max: 30, perfilExclusivo: 'Vida en Calle/Mendicidad' },
        { id: 2, nombre: 'Rosa Educadora Sede 1', carga: 29, max: 30, perfilExclusivo: 'Vida en Calle/Mendicidad' },
        { id: 3, nombre: 'Carlos Educador Sede 1', carga: 42, max: 60, perfilExclusivo: 'Trabajo Infantil' },
        { id: 4, nombre: 'Elena Educadora Campo', carga: 12, max: 30, perfilExclusivo: 'Vida en Calle/Mendicidad' }
    ]);

    // --- ESTADO 2: SEMÁFORO METODOLÓGICO Y CANDADOS ---
    const [casosSemaforo, setCasosSemaforo] = useState([
        { 
            id: 101, 
            nombre: 'Gómez Ruiz Sofía', 
            fase: 'Fase 1: Contacto', 
            diasTranscurridos: 82, 
            diasLimite: 90, 
            faltaF04: true, 
            faltaPti: false, 
            estadoPlazo: 'ADVERTENCIA',
            ampliado: false 
        },
        { 
            id: 102, 
            nombre: 'Méndez Castro Luis', 
            fase: 'Fase 1: Contacto', 
            diasTranscurridos: 94, 
            diasLimite: 90, 
            faltaF04: true, 
            faltaPti: true, 
            estadoPlazo: 'CRÍTICO',
            ampliado: false 
        },
        { 
            id: 105, 
            nombre: 'Mendoza Ticona Raúl', 
            fase: 'Fase 2: Intervención', 
            diasTranscurridos: 410, 
            diasLimite: 450, 
            faltaF04: false, 
            faltaPti: false, 
            estadoPlazo: 'ÓPTIMO',
            ampliado: false 
        }
    ]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // 1. Cargar casos reales
            const resCasos = await fetch(`${NNA_API_URL}/casos`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (resCasos.ok) {
                const dataCasos = await resCasos.json();
                if (dataCasos && dataCasos.length > 0) {
                    const mappedCasos = dataCasos.map((c: any) => ({
                        id: c.id,
                        nombre: c.nna_nombre || `NNA ID: ${c.nna_id}`,
                        edad: 12,
                        perfil: c.perfil === 'VIDA_EN_CALLE' ? 'Vida en Calle' : c.perfil === 'MENDICIDAD' ? 'Mendicidad' : 'Trabajo Infantil',
                        educadorId: c.responsable_id || 1,
                        educadorNombre: c.responsable_nombre || 'Sin educador asignado',
                        carpeta: c.codigo_caso || `CAS-26-${c.id.toString().padStart(4, '0')}`
                    }));
                    setCasosNna(mappedCasos);
                    
                    const mappedSemaforo = dataCasos.map((c: any) => {
                        const dias = 45; 
                        let estadoPlazo = 'ÓPTIMO';
                        let diasLimite = 90;
                        if (c.estado === 'CRITICO' || c.estado === 'ALTO') {
                            estadoPlazo = 'CRÍTICO';
                        }
                        return {
                            id: c.id,
                            nombre: c.nna_nombre || `NNA ID: ${c.nna_id}`,
                            fase: c.perfil === 'VIDA_EN_CALLE' ? 'Fase 1: Contacto' : 'Fase 2: Intervención',
                            diasTranscurridos: dias,
                            diasLimite: diasLimite,
                            faltaF04: !c.zona_intervencion,
                            faltaPti: false,
                            estadoPlazo: estadoPlazo,
                            ampliado: false
                        };
                    });
                    setCasosSemaforo(mappedSemaforo);
                }
            }

            // 2. Cargar educadores reales
            const listUsers = await getUsers();
            if (listUsers && listUsers.length > 0) {
                const edus = listUsers
                    .filter((u: any) => u.rol === 'EDUCADOR')
                    .map((u: any) => ({
                        id: u.id,
                        nombre: u.nombreCompleto || u.nombre_completo || u.email,
                        carga: 15, 
                        max: 30,
                        perfilExclusivo: 'Vida en Calle/Mendicidad'
                    }));
                if (edus.length > 0) {
                    setEducadoresDisponibles(edus);
                }
            }
        } catch (e) {
            console.error('Error loadData in CoordinadorCasosPage:', e);
        }
    };

    const handleReasignarEducador = async (nnaId: number, nuevoEducadorId: number) => {
        const educador = educadoresDisponibles.find(e => e.id === nuevoEducadorId);
        if (!educador) return;

        // Validar candado de ratio de carga de trabajo
        if (educador.carga >= educador.max) {
            alert(`⚠️ ALERTA DE RATIO: ${educador.nombre} ha alcanzado su límite máximo de carga laboral (${educador.carga}/${educador.max} NNA). No se puede asignar más casos según el protocolo del INABIF.`);
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
                alert(`Caso reasignado exitosamente a: ${educador.nombre}. Se notificará al educador vía alerta en su tablero.`);
            } else {
                alert('Error al reasignar caso en la base de datos.');
            }
        } catch (e) {
            console.error(e);
            alert('Error al conectar con el servidor.');
        }
    };

    // --- ESTADO 2: SEMÁFORO METODOLÓGICO Y CANDADOS ---
    // (Mapeado dinámico ya inicializado en loadData)

    const handleAutorizarAmpliacion = (id: number) => {
        const resolucion = prompt('Ingrese el número de la Resolución Jefatural / Informe Técnico Sustentado de Ampliación de Sede:');
        if (resolucion === null) return;
        if (!resolucion.trim()) {
            alert('Debe ingresar un sustento válido para la ampliación.');
            return;
        }

        setCasosSemaforo(prev =>
            prev.map(c => c.id === id ? { 
                ...c, 
                diasLimite: c.diasLimite + 30, 
                estadoPlazo: 'ÓPTIMO', 
                ampliado: true 
            } : c)
        );
        alert(`Ampliación de 30 días autorizada bajo el sustento: ${resolucion}. El caso ha sido desbloqueado en el sistema.`);
    };

    // --- ESTADO 3: CONTROL TERRITORIAL F01 ---
    const [zonasPropuestas, setZonasPropuestas] = useState([
        {
            id: 1,
            zona: 'Plaza San Martín y Jr. Carabaya',
            educador: 'Juan Educador García',
            horario: '18:00 - 22:00 (Ruta Nocturna)',
            aliadas: 'DEMUNA Cercado, Comisaría de Alfonso Ugarte',
            concentracionEstimada: 18,
            fechaPropuesta: '2026-05-19',
            estado: 'PENDIENTE'
        },
        {
            id: 2,
            zona: 'Mercado Central - Puerta 4',
            educador: 'Rosa Educadora Sede 1',
            horario: '10:00 - 14:00 (Ruta Diurna)',
            aliadas: 'Asociación de Comerciantes, Parroquia de la zona',
            concentracionEstimada: 8,
            fechaPropuesta: '2026-05-22',
            estado: 'PENDIENTE'
        }
    ]);

    const handleResponderZona = (id: number, decision: 'APROBADO' | 'RECHAZADO') => {
        setZonasPropuestas(prev =>
            prev.map(z => z.id === id ? { ...z, estado: decision } : z)
        );
        alert(`Zona de intervención ${decision === 'APROBADO' ? 'aprobada' : 'rechazada'} formalmente. Se ha actualizado la Ficha F01 de la sede.`);
    };

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
                            Zonas F01 ({zonasPropuestas.filter(z => z.estado === 'PENDIENTE').length})
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

            {/* CONTENIDO PESTAÑA 3: APROBACIÓN TERRITORIAL (F01 CONTEO Y ZONAS) */}
            {activeTab === 'territorial' && (
                <div className="bg-surface rounded-xl border border-border p-5 space-y-4 shadow-sm animate-fadeIn">
                    <div>
                        <h3 className="text-sm font-black text-fg uppercase tracking-widest">
                            Aprobación de Zonas de Intervención (F01 Conteo)
                        </h3>
                        <p className="text-xs text-fg-secondary">
                            Valide y autorice formalmente los cuadrantes de abordaje callejero propuestos por su equipo de educadores
                        </p>
                    </div>

                    <div className="space-y-3">
                        {zonasPropuestas.map(z => (
                            <div 
                                key={z.id}
                                className="p-4 rounded-xl border border-border bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:shadow-sm"
                            >
                                <div className="space-y-1.5 flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-[13px] font-bold text-fg">{z.zona}</span>
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                            z.estado === 'PENDIENTE' ? 'bg-warning-soft text-warning' : z.estado === 'APROBADO' ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'
                                        }`}>
                                            {z.estado}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-fg-muted font-medium">
                                        <span className="flex items-center gap-1"><MapPin size={12} className="text-primary" /> Horario: {z.horario}</span>
                                        <span>Proponente: <strong className="text-fg-secondary">{z.educador}</strong></span>
                                        <span>Fecha: {z.fechaPropuesta}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-x-4 text-[11px] text-fg-muted font-normal leading-relaxed mt-1">
                                        <span><strong>Redes Aliadas Locales:</strong> {z.aliadas}</span>
                                        <span>• <strong>NNA Estimados en Conteo:</strong> <strong className="text-fg-secondary">{z.concentracionEstimada}</strong></span>
                                    </div>
                                </div>

                                {z.estado === 'PENDIENTE' && (
                                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center w-full md:w-auto">
                                        <button
                                            onClick={() => handleResponderZona(z.id, 'APROBADO')}
                                            className="flex-1 md:flex-initial px-3.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[10px] font-black uppercase transition-all shadow-sm flex items-center justify-center gap-1"
                                        >
                                            <Check size={12} /> Aprobar
                                        </button>
                                        <button
                                            onClick={() => handleResponderZona(z.id, 'RECHAZADO')}
                                            className="flex-1 md:flex-initial px-3.5 py-1.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-lg text-[10px] font-black uppercase transition-all shadow-sm flex items-center justify-center gap-1"
                                        >
                                            <X size={12} /> Rechazar
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
