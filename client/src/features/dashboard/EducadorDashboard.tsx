import { AUTH_API_URL } from '../../config/api';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { Users, AlertTriangle, PlusCircle, ClipboardList, Calendar, BarChart3, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PendientesTicker } from '../../components/dashboard/PendientesTicker';
import { ResumenPeriodo } from '../../components/dashboard/ResumenPeriodo';
import { DiarioCampoModal } from './DiarioCampoModal';
import { getTalleres } from '../../api/talleres.api';

/**
 * Tablero del educador.
 *
 * Reordenado para que responda a lo que el educador hace cada día:
 *
 * 1. Accesos rápidos
 * 2. Requiere tu atención — los contadores de calidad: CUÁNTOS casos tienen
 *    un problema. Es la foto del estado de la carga.
 * 3. La agenda de hoy, los casos por fase y Mis Pendientes al costado.
 *    Mis Pendientes es la otra cara: CUÁLES son, con nombre y clic al
 *    expediente. Es la cola de trabajo.
 *
 * La barra de eficiencia salió: medía al educador sin decirle qué hacer.
 */

const API_URL = AUTH_API_URL;

const getHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${useAuthStore.getState().token}`,
});

/**
 * Traduce el título de cada alerta al filtro de la lista de NNA.
 *
 * Se compara por el texto que manda el backend en `alertas[].tipo`. Si mañana
 * se reescribe ese texto, la tarjeta deja de filtrar pero sigue llevando al
 * listado: falla hacia el lado seguro.
 */
const ALERTA_FILTRO: Record<string, string> = {
    'Sin Diagnóstico (F04)':        'sin-f04',
    'Evaluación Retrasada (>30d)':  'estancado',
};

// El plazo de cada fase lo manda el backend en `plazoMeses`. Antes había aquí
// un diccionario con claves 'Fase 1'/'Fase 2'/'Fase 3' que se comparaba contra
// etiquetas como 'Fase 1: Contacto': no coincidían nunca, así que el plazo no
// llegó a mostrarse una sola vez.

const esHoy = (fecha?: string) => {
    if (!fecha) return false;
    return String(fecha).slice(0, 10) === new Date().toISOString().slice(0, 10);
};

export const EducadorDashboard = () => {
    const { user } = useAuthStore();
    const [stats, setStats]         = useState<any>(null);
    const [talleresHoy, setTalleresHoy] = useState<any[]>([]);
    const [loading, setLoading]     = useState(true);
    const [diarioOpen, setDiarioOpen] = useState(false);

    useEffect(() => {
        const cargar = async () => {
            try {
                const response = await fetch(`${API_URL}/statistics/dashboard`, { headers: getHeaders() });
                if (response.ok) setStats(await response.json());
            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
            } finally {
                setLoading(false);
            }

            // La agenda no debe tumbar el tablero si el servicio de talleres
            // está caído: se carga aparte y su fallo solo vacía ese bloque.
            try {
                const talleres = await getTalleres();
                setTalleresHoy(talleres.filter((t: any) => esHoy(t.fecha || t.fecha_programada)));
            } catch {
                setTalleresHoy([]);
            }
        };
        cargar();
    }, []);

    if (loading) {
        return <div className="h-full flex items-center justify-center text-fg-muted">Cargando tu tablero…</div>;
    }

    const fases   = stats?.fases || [];
    const alertas = stats?.alertas || [];
    const totalFases = fases.reduce((s: number, f: any) => s + (f.cantidad || 0), 0) || 1;

    return (
        <>
        <div className="max-w-6xl w-full mx-auto">
            <div className="mb-6">
                <h1 className="text-[22px] font-semibold tracking-tight text-fg">Mi Tablero</h1>
                <p className="text-fg-secondary mt-1">Hola, {user?.nombre?.split(' ')[0]} — aquí está el resumen de tu gestión.</p>
            </div>

            {/* 1. ACCIONES RÁPIDAS — la cabecera del tablero */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-6">
                <Link to="/nna/nuevo" className="bg-primary text-primary-fg px-4 py-3.5 rounded-lg flex items-center justify-between cursor-pointer hover:bg-primary/90 transition-colors">
                    <div>
                        <p className="font-semibold text-[14px] leading-tight">Nuevo NNA</p>
                        <p className="text-[11px] opacity-75 mt-0.5">Registrar Ficha 03</p>
                    </div>
                    <PlusCircle size={26} className="opacity-80" />
                </Link>

                <Link to="/nna" className="bg-surface border border-border px-4 py-3.5 rounded-lg flex items-center justify-between cursor-pointer hover:bg-surface-muted transition-colors">
                    <div>
                        <p className="font-semibold text-[14px] text-fg leading-tight">Mis Casos</p>
                        <p className="text-[11px] text-fg-muted mt-0.5">{stats?.totalCasos || 0} activos</p>
                    </div>
                    <Users size={22} className="text-fg-muted" />
                </Link>

                <button
                    type="button"
                    onClick={() => setDiarioOpen(true)}
                    className="bg-surface border border-border px-4 py-3.5 rounded-lg flex items-center justify-between cursor-pointer hover:bg-surface-muted transition-colors w-full text-left"
                >
                    <div>
                        <p className="font-semibold text-[14px] text-fg leading-tight">Diario de Campo</p>
                        <p className="text-[11px] text-fg-muted mt-0.5">Nueva entrada rápida</p>
                    </div>
                    <ClipboardList size={22} className="text-fg-muted" />
                </button>
            </div>

            {/* 2. CANTIDADES DEL PERIODO */}
            <ResumenPeriodo />

            {/* 3. REQUIERE TU ATENCIÓN — los contadores, no la lista */}
            {alertas.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-[15px] font-semibold text-fg flex items-center gap-2 mb-3">
                        <AlertTriangle size={17} className="text-warning" /> Requiere tu atención
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {alertas.map((a: any) => {
                            const critico = a.nivel === 'CRITICO' && a.cantidad > 0;
                            const activa  = a.cantidad > 0;
                            // Cada tarjeta abre la lista filtrada a SUS casos.
                            // Antes todas llevaban a /nna sin filtro: te decían
                            // que había 5 con problema y te soltaban entre 90.
                            const filtro = ALERTA_FILTRO[a.tipo];
                            return (
                                <Link
                                    key={a.tipo}
                                    to={activa && filtro ? `/nna?alerta=${filtro}` : '/nna'}
                                    className={`px-4 py-3.5 rounded-lg border flex items-center justify-between transition-colors ${
                                        critico ? 'border-danger-soft bg-danger-soft hover:bg-danger-soft/70'
                                        : activa ? 'border-warning-soft bg-warning-soft hover:bg-warning-soft/70'
                                        : 'border-border bg-surface hover:bg-surface-muted'
                                    }`}
                                >
                                    <span>
                                        <span className={`block text-[13px] font-medium ${critico ? 'text-danger' : activa ? 'text-warning' : 'text-fg-secondary'}`}>
                                            {a.tipo}
                                        </span>
                                        <span className="block text-[11px] text-fg-muted mt-0.5">
                                            {activa ? 'Casos que necesitan acción' : 'Sin casos en esta situación'}
                                        </span>
                                    </span>
                                    <span className={`text-[26px] font-semibold leading-none ${critico ? 'text-danger' : activa ? 'text-warning' : 'text-fg-muted'}`}>
                                        {a.cantidad}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 3. HOY, CASOS POR FASE Y MIS PENDIENTES
                 El widget de pendientes va al costado: es la cola de trabajo
                 que el educador mira de reojo mientras trabaja. */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 mb-6">
                <div className="bg-surface border border-border rounded-[12px] overflow-hidden">
                    <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                        <h3 className="text-[15px] font-semibold text-fg flex items-center gap-2">
                            <Calendar size={17} className="text-fg-muted" /> Hoy
                        </h3>
                        <Link to="/educador/calendario" className="text-[12px] text-primary hover:underline">Ver calendario</Link>
                    </div>
                    {talleresHoy.length === 0 ? (
                        <p className="px-4 py-8 text-center text-[12px] text-fg-muted">
                            No tienes talleres programados para hoy
                        </p>
                    ) : (
                        talleresHoy.slice(0, 4).map((t: any) => (
                            <Link
                                key={t.id}
                                // Abre ese taller, no la lista entera.
                                to={`/talleres?tallerId=${t.id}`}
                                className="flex gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-surface-muted transition-colors"
                            >
                                <span className="text-[12px] text-fg-muted min-w-[40px]">
                                    {(t.hora || String(t.fecha_programada || '').slice(11, 16)) || '--:--'}
                                </span>
                                <span className="min-w-0">
                                    <span className="block text-[14px] text-fg truncate">{t.nombre || t.tema}</span>
                                    <span className="block text-[12px] text-fg-muted truncate">
                                        <MapPin size={11} className="inline mr-1 -mt-0.5" />{t.lugar || 'Sin lugar'}
                                    </span>
                                </span>
                            </Link>
                        ))
                    )}
                </div>

                <div className="bg-surface border border-border rounded-[12px] overflow-hidden">
                    <div className="px-4 py-3 border-b border-border">
                        <h3 className="text-[15px] font-semibold text-fg flex items-center gap-2">
                            <BarChart3 size={17} className="text-fg-muted" /> Mis casos por fase
                        </h3>
                    </div>
                    <div className="p-4 space-y-3">
                        {fases.length === 0 ? (
                            <p className="text-[12px] text-fg-muted text-center py-4">Aún no tienes casos asignados</p>
                        ) : fases.map((f: any) => (
                            <div key={f.fase}>
                                <div className="flex justify-between items-baseline text-[13px] mb-1">
                                    <span className="text-fg-2">
                                        {f.fase}
                                        {f.plazoMeses && (
                                            <span className="text-fg-muted text-[11px]"> · {f.plazoMeses} meses</span>
                                        )}
                                    </span>
                                    <span className="font-semibold text-fg">{f.cantidad}</span>
                                </div>
                                <div className="h-[6px] bg-surface-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all"
                                        style={{
                                            width: `${Math.round((f.cantidad / totalFases) * 100)}%`,
                                            backgroundColor: f.color || 'var(--primary)',
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* El widget de pendientes, con su desplazamiento */}
                <PendientesTicker />
            </div>
        </div>

        <DiarioCampoModal open={diarioOpen} onClose={() => setDiarioOpen(false)} />
        </>
    );
};
