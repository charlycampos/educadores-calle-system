import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { Search, MapPin, ArrowRight, RefreshCw, Check, X, Clock, ArrowLeftRight, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { NNA_API_URL } from '../../config/api';

export const MonitorTrasladosPage = () => {
    const { token } = useAuthStore();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrigen, setSelectedOrigen] = useState('TODAS');
    const [selectedDestino, setSelectedDestino] = useState('TODAS');

    // Datos reactivos de traslados nacionales para pruebas locales e interactividad en frontend
    const [trasladosNacionales, setTrasladosNacionales] = useState([
        {
            id: 1,
            nnaNombre: 'Álvarez Ríos Juan',
            edad: 12,
            origen: 'Lima Metropolitana (LIM-01)',
            destino: 'Trujillo (LAL-01)',
            solicitante: 'María Pérez (Coordinadora)',
            motivo: 'Traslado familiar debido al cambio de empleo del tutor y reubicación en la zona norte de Trujillo.',
            fecha: '2026-05-20',
            estado: 'PENDIENTE'
        },
        {
            id: 2,
            nnaNombre: 'Salvatierra Paredes Rosa',
            edad: 15,
            origen: 'Arequipa (AQP-01)',
            destino: 'Cusco (CUS-01)',
            solicitante: 'Julio Salas (Coordinador)',
            motivo: 'Traslado por ingreso formal a Centro de Acogida Residencial (CAR) de destino en Cusco.',
            fecha: '2026-05-22',
            estado: 'PENDIENTE'
        },
        {
            id: 3,
            nnaNombre: 'Huamán Castro Kevin',
            edad: 10,
            origen: 'Huancayo (JUN-01)',
            destino: 'Lima Metropolitana (LIM-01)',
            solicitante: 'Rosario Flores (Coordinadora)',
            motivo: 'Traslado por reunificación familiar tras retorno voluntario de la madre a la capital.',
            fecha: '2026-05-18',
            estado: 'PENDIENTE'
        }
    ]);

    useEffect(() => {
        loadTraslados();
    }, []);

    const loadTraslados = async () => {
        try {
            const res = await fetch(`${NNA_API_URL}/traslados/pendientes`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                if (data && data.length > 0) {
                    const mapped = data.map((t: any) => ({
                        id: t.id,
                        nnaNombre: t.nnaNombre || `Caso ID: ${t.caso_id}`,
                        edad: t.edad || 12,
                        origen: `Sede ${t.sede_origen_id}`,
                        destino: `Sede ${t.sede_destino_id || 'Sin sede'}`,
                        solicitante: `Coordinador ID: ${t.coordinador_origen_id || '—'}`,
                        motivo: t.motivo || 'Sin motivo especificado',
                        fecha: t.fecha_solicitud ? t.fecha_solicitud.split(' ')[0] : '2026-05-23',
                        estado: t.estado || 'PENDIENTE'
                    }));
                    setTrasladosNacionales(mapped);
                }
            }
        } catch (e) {
            console.error('Error loading real traslados:', e);
        }
    };

    // Extraer orígenes y destinos únicos
    const sedesOrigen = Array.from(new Set(trasladosNacionales.map(t => t.origen)));
    const sedesDestino = Array.from(new Set(trasladosNacionales.map(t => t.destino)));

    const handleAprobarTraslado = async (id: number) => {
        try {
            const res = await fetch(`${NNA_API_URL}/traslados/${id}/responder`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    aceptar: true,
                    observaciones: 'Aprobado formalmente por la DGNNA Sector Central'
                })
            });
            if (res.ok) {
                setTrasladosNacionales(prev =>
                    prev.map(t => t.id === id ? { ...t, estado: 'APROBADO' } : t)
                );
                alert('Traslado externo nacional aprobado con éxito. Se ha emitido automáticamente el Oficio de Aprobación de la Dirección de la DGNNA.');
            } else {
                alert('Error al responder el traslado en el servidor.');
            }
        } catch (e) {
            console.error(e);
            alert('Error al conectar con la base de datos.');
        }
    };

    const handleRechazarTraslado = async (id: number) => {
        const obs = prompt('Ingrese detalladamente el motivo técnico del rechazo de la solicitud:');
        if (obs === null) return; // cancelado
        if (!obs.trim()) {
            alert('Debe ingresar un motivo para el rechazo.');
            return;
        }
        try {
            const res = await fetch(`${NNA_API_URL}/traslados/${id}/responder`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    aceptar: false,
                    observaciones: obs
                })
            });
            if (res.ok) {
                setTrasladosNacionales(prev =>
                    prev.map(t => t.id === id ? { ...t, estado: 'RECHAZADO' } : t)
                );
                alert('Traslado rechazado con éxito.');
            } else {
                alert('Error al responder el traslado en el servidor.');
            }
        } catch (e) {
            console.error(e);
            alert('Error al conectar con la base de datos.');
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadTraslados();
        setIsRefreshing(false);
    };

    const filteredTraslados = trasladosNacionales.filter(t => {
        if (selectedOrigen !== 'TODAS' && t.origen !== selectedOrigen) return false;
        if (selectedDestino !== 'TODAS' && t.destino !== selectedDestino) return false;

        return t.nnaNombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
            t.origen.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.destino.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.solicitante.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const totalPendientes = trasladosNacionales.filter(t => t.estado === 'PENDIENTE').length;
    const totalAprobados = trasladosNacionales.filter(t => t.estado === 'APROBADO').length;

    return (
        <div className="space-y-6">
            {/* Header / Banner Superior */}
            <div className="bg-[#1e40af] text-white p-6 rounded-xl shadow-md">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Link to="/" className="text-blue-200 hover:text-white transition-colors">
                                <ArrowLeft size={16} />
                            </Link>
                            <h1 className="text-xl font-black tracking-tight">Bandeja de Traslados Nacionales</h1>
                        </div>
                        <p className="text-blue-100 text-xs font-medium opacity-80">
                            Autorización inter-departamental y emisión de Oficios de Coordinación (DGNNA)
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={handleRefresh}
                            className="bg-white/10 hover:bg-white/20 text-white border-white/10 gap-1.5"
                        >
                            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                            Actualizar Cola
                        </Button>
                    </div>
                </div>
            </div>

            {/* KPIs de Traslados */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-border flex items-center gap-3">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                        <Clock size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Traslados Pendientes</p>
                        <p className="text-xl font-black text-gray-900">{totalPendientes}</p>
                        <p className="text-[10px] text-gray-400">Requieren dictamen técnico inmediato</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-border flex items-center gap-3">
                    <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                        <Check size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Aprobados este mes</p>
                        <p className="text-xl font-black text-gray-900">{totalAprobados}</p>
                        <p className="text-[10px] text-gray-400">Con oficio de canalización emitido</p>
                    </div>
                </div>
            </div>

            {/* Listado de Solicitudes */}
            <div className="bg-surface rounded-xl border border-border p-5 space-y-4 shadow-sm">
                <div>
                    <h3 className="text-sm font-black text-fg uppercase tracking-widest">
                        Cola de Solicitudes Nacionales
                    </h3>
                    <p className="text-xs text-fg-secondary">
                        Revisión técnica de justificaciones para derivar y reubicar expedientes entre sedes regionales
                    </p>
                </div>

                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar solicitud por NNA o solicitante..."
                            className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-lg text-[13px] text-fg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors placeholder:text-fg-muted"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="bg-surface border border-border rounded-lg px-3 py-2 text-[13px] text-fg font-medium focus:outline-none focus:border-primary cursor-pointer transition-colors"
                        value={selectedOrigen}
                        onChange={(e) => setSelectedOrigen(e.target.value)}
                    >
                        <option value="TODAS">Sede Origen: Todas</option>
                        {sedesOrigen.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                    <select
                        className="bg-surface border border-border rounded-lg px-3 py-2 text-[13px] text-fg font-medium focus:outline-none focus:border-primary cursor-pointer transition-colors"
                        value={selectedDestino}
                        onChange={(e) => setSelectedDestino(e.target.value)}
                    >
                        <option value="TODAS">Sede Destino: Todas</option>
                        {sedesDestino.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-4">
                    {filteredTraslados.length === 0 ? (
                        <div className="p-12 text-center border-2 border-dashed border-border rounded-xl text-fg-muted italic text-xs">
                            No hay solicitudes de traslados en cola con el filtro actual.
                        </div>
                    ) : (
                        filteredTraslados.map(t => (
                            <div 
                                key={t.id} 
                                className="p-5 rounded-xl border border-border bg-white flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div className="space-y-2 flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-[14px] font-black text-fg truncate">{t.nnaNombre}</span>
                                        <span className="text-[11px] text-fg-muted font-semibold">({t.edad} años)</span>
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                            t.estado === 'PENDIENTE' 
                                                ? 'bg-warning-soft text-warning' 
                                                : t.estado === 'APROBADO' 
                                                    ? 'bg-success-soft text-success' 
                                                    : 'bg-danger-soft text-danger'
                                        }`}>
                                            {t.estado === 'PENDIENTE' && <Clock size={10} />}
                                            {t.estado === 'APROBADO' && <Check size={10} />}
                                            {t.estado === 'RECHAZADO' && <X size={10} />}
                                            {t.estado}
                                        </span>
                                    </div>
                                    
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-fg-muted font-medium">
                                        <span className="flex items-center gap-1.5 bg-primary-soft text-primary px-2.5 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase">
                                            <ArrowLeftRight size={11} /> 
                                            {t.origen} → {t.destino}
                                        </span>
                                        <span>• Solicitante: <strong className="text-fg-secondary">{t.solicitante}</strong></span>
                                        <span>• Fecha: <strong className="text-fg-secondary">{t.fecha}</strong></span>
                                    </div>

                                    <div className="bg-bg p-3.5 rounded-lg border border-border max-w-3xl">
                                        <p className="text-[12px] text-fg-secondary leading-relaxed">
                                            <strong className="text-fg font-semibold">Motivo del Traslado:</strong> {t.motivo}
                                        </p>
                                    </div>
                                </div>

                                <div className="shrink-0 flex flex-row lg:flex-col gap-2 w-full lg:w-auto items-stretch lg:items-end justify-start">
                                    {t.estado === 'PENDIENTE' && (
                                        <div className="flex items-center gap-2 w-full lg:w-auto">
                                            <button
                                                onClick={() => handleAprobarTraslado(t.id)}
                                                className="flex-1 lg:flex-initial px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[11px] font-black uppercase transition-colors shadow-sm flex items-center justify-center gap-1.5"
                                            >
                                                <Check size={13} /> Aprobar
                                            </button>
                                            <button
                                                onClick={() => handleRechazarTraslado(t.id)}
                                                className="flex-1 lg:flex-initial px-4 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-lg text-[11px] font-black uppercase transition-colors shadow-sm flex items-center justify-center gap-1.5"
                                            >
                                                <X size={13} /> Rechazar
                                            </button>
                                        </div>
                                    )}

                                    {t.estado === 'APROBADO' && (
                                        <span className="text-[11px] font-bold text-success flex items-center gap-1.5 bg-success-soft px-3 py-1.5 rounded-lg border border-success/20">
                                            <Check size={14} /> Oficio N° {202600 + t.id} Emitido
                                        </span>
                                    )}

                                    {t.estado === 'RECHAZADO' && (
                                        <span className="text-[11px] font-bold text-danger flex items-center gap-1.5 bg-danger-soft px-3 py-1.5 rounded-lg border border-danger/20">
                                            <X size={14} /> Solicitud Rechazada
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
