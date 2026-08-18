import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Clock, AlertTriangle } from 'lucide-react';
import { getTrackingFases, type FaseTracking } from '../../../api/logros.api';

/**
 * Línea de tiempo de las fases del servicio.
 *
 * Responde de un vistazo lo que antes no se podía saber: en qué fase va el
 * NNA, desde cuándo, cuánto le queda de plazo y cuánto duró cada fase que ya
 * cerró.
 *
 * Todo el cálculo viene del backend. Este componente solo pinta — si empezara
 * a deducir la fase por su cuenta volveríamos al problema original, con cada
 * pantalla inventando su propia versión.
 *
 * Las fases se muestran SIEMPRE las tres, aunque el NNA no haya llegado a
 * ellas: el educador necesita ver el recorrido completo, no solo lo andado.
 */

interface Props {
    casoId?: number | null;
    /** Compacto para el Resumen del Caso; extendido para el expediente. */
    compacto?: boolean;
}

const FASES_TODAS = ['I', 'II', 'III'] as const;

const NOMBRE_CORTO: Record<string, string> = {
    I:   'Contacto e Integración',
    II:  'Restitución de Derechos',
    III: 'Seguimiento y Egreso',
};

const PLAZO: Record<string, number> = { I: 3, II: 15, III: 6 };

const fmt = (iso: string | null) => {
    if (!iso) return '—';
    // Se parte el texto en vez de usar new Date(): con fechas sin hora, el
    // navegador las interpreta en UTC y muestra el día anterior.
    const [a, m, d] = iso.slice(0, 10).split('-');
    return `${d}/${m}/${a}`;
};

const meses = (dias: number | null) => {
    if (!dias) return '0 días';
    if (dias < 31) return `${dias} días`;
    const m = Math.floor(dias / 30);
    const resto = dias % 30;
    return resto > 0 ? `${m} m ${resto} d` : `${m} meses`;
};

export const TrackingFases = ({ casoId, compacto = false }: Props) => {
    const [data, setData]   = useState<FaseTracking[]>([]);
    const [loading, setLoad] = useState(true);
    const [error, setError]  = useState(false);

    useEffect(() => {
        if (!casoId) { setLoad(false); return; }
        getTrackingFases(casoId)
            .then(r => setData(r.historial || []))
            .catch(() => setError(true))
            .finally(() => setLoad(false));
    }, [casoId]);

    if (!casoId) return null;

    if (loading) {
        return (
            <div className="bg-surface border border-border rounded-[12px] p-4">
                <p className="text-[12px] text-fg-muted">Cargando el avance de fases…</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-surface border border-border rounded-[12px] p-4">
                <p className="text-[12px] text-fg-muted">
                    No se pudo cargar el avance de fases.
                </p>
            </div>
        );
    }

    const porFase = new Map(data.map(f => [f.fase, f]));
    const vigente = data.find(f => f.vigente);

    // ── Versión compacta: una barra con las tres fases ──────────────────────
    if (compacto) {
        return (
            <div className="flex items-center gap-1.5">
                {FASES_TODAS.map(f => {
                    const d = porFase.get(f);
                    const cerrada = d?.fechaFin != null;
                    const esVigente = d?.vigente;
                    return (
                        <div
                            key={f}
                            title={`Fase ${f}: ${NOMBRE_CORTO[f]}${
                                esVigente ? ` — en curso desde ${fmt(d!.fechaInicio)}` : ''
                            }`}
                            className={`h-[5px] flex-1 rounded-full ${
                                cerrada        ? 'bg-success'
                                : d?.vencida   ? 'bg-danger'
                                : esVigente    ? 'bg-primary'
                                :                'bg-surface-muted'
                            }`}
                        />
                    );
                })}
                <span className="text-[11px] font-semibold text-fg-2 ml-1 whitespace-nowrap">
                    {vigente ? `Fase ${vigente.fase}` : 'Egresado'}
                </span>
            </div>
        );
    }

    // ── Versión completa: la línea de tiempo ────────────────────────────────
    return (
        <div className="bg-surface border border-border rounded-[12px] overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h3 className="text-[15px] font-semibold text-fg">Avance por fases</h3>
                <span className="text-[11px] text-fg-muted">
                    {vigente
                        ? `En curso: Fase ${vigente.fase}`
                        : data.length > 0 ? 'Servicio culminado' : 'Sin iniciar'}
                </span>
            </div>

            <div className="p-4 space-y-1">
                {FASES_TODAS.map((f, idx) => {
                    const d         = porFase.get(f);
                    const cerrada   = d?.fechaFin != null;
                    const esVigente = d?.vigente === true;
                    const noIniciada = !d;
                    const plazo     = d?.plazoMeses ?? PLAZO[f];

                    // El progreso solo tiene sentido en la fase en curso: en una
                    // cerrada da igual si tardó más o menos, ya es historia.
                    const pct = esVigente && d
                        ? Math.min(100, Math.round(((d.diasTranscurridos || 0) / (plazo * 30)) * 100))
                        : cerrada ? 100 : 0;

                    return (
                        <div key={f} className="flex gap-3">
                            {/* Riel de la línea de tiempo */}
                            <div className="flex flex-col items-center pt-1">
                                {cerrada ? (
                                    <CheckCircle2 size={18} className="text-success flex-shrink-0" />
                                ) : d?.vencida ? (
                                    <AlertTriangle size={18} className="text-danger flex-shrink-0" />
                                ) : esVigente ? (
                                    <Clock size={18} className="text-primary flex-shrink-0" />
                                ) : (
                                    <Circle size={18} className="text-fg-muted/40 flex-shrink-0" />
                                )}
                                {idx < 2 && (
                                    <div className={`w-[2px] flex-1 min-h-[36px] my-1 ${
                                        cerrada ? 'bg-success/40' : 'bg-border'
                                    }`} />
                                )}
                            </div>

                            <div className={`flex-1 pb-4 ${noIniciada ? 'opacity-45' : ''}`}>
                                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                                    <p className="text-[14px] font-semibold text-fg">
                                        Fase {f}
                                        <span className="font-normal text-fg-secondary"> · {NOMBRE_CORTO[f]}</span>
                                    </p>
                                    <span className="text-[11px] text-fg-muted whitespace-nowrap">
                                        {plazo} meses
                                        {(d?.mesesExtension ?? 0) > 0 && ` + ${d!.mesesExtension} de extensión`}
                                    </span>
                                </div>

                                {noIniciada ? (
                                    <p className="text-[12px] text-fg-muted mt-1">Aún no iniciada</p>
                                ) : (
                                    <>
                                        <p className="text-[12px] text-fg-muted mt-1">
                                            {fmt(d!.fechaInicio)} → {cerrada ? fmt(d!.fechaFin) : 'en curso'}
                                            {' · '}
                                            <span className={d!.vencida ? 'text-danger font-medium' : ''}>
                                                {meses(d!.diasTranscurridos)}
                                            </span>
                                            {d!.vencida && ` · vencida hace ${d!.diasVencida} días`}
                                        </p>

                                        <div className="h-[5px] bg-surface-muted rounded-full overflow-hidden mt-2">
                                            <div
                                                className={`h-full rounded-full transition-all ${
                                                    cerrada      ? 'bg-success'
                                                    : d!.vencida ? 'bg-danger'
                                                    :              'bg-primary'
                                                }`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>

                                        {!cerrada && !d!.vencida && d!.fechaLimite && (
                                            <p className="text-[11px] text-fg-muted mt-1.5">
                                                Vence el {fmt(d!.fechaLimite)}
                                            </p>
                                        )}
                                        {d!.vencida && (
                                            <p className="text-[11px] text-danger mt-1.5">
                                                Plazo cumplido. Cierra la fase en el F05 cuando corresponda
                                                {d!.extensionMaxima > 0 && d!.mesesExtension === 0 &&
                                                    ', o solicita la extensión de 1 mes con Informe Técnico'}.
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="px-4 py-2.5 border-t border-border bg-surface-muted/40">
                <p className="text-[11px] text-fg-muted">
                    Plazo total del servicio: 24 meses (RDE 069-2021). El avance de fase lo
                    decide el educador al cerrar la fase en el F05 — el sistema no promueve
                    por vencimiento.
                </p>
            </div>
        </div>
    );
};
