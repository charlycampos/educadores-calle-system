import { useEffect, useState } from 'react';
import {
    BookOpen, Users, Send, ClipboardCheck, HeartHandshake, FileText, Loader2, History,
} from 'lucide-react';
import {
    INTERVENCION_API_URL, TALLERES_API_URL, DERIVACION_API_URL, EXPEDIENTE_API_URL,
} from '../../../config/api';
import { authHeaders } from '../../../utils/auth';

// ── Cronología unificada del NNA ─────────────────────────────────────────────
// Mezcla en una sola línea de tiempo: diarios de campo, talleres, derivaciones,
// planes de intervención, diagnósticos F04, seguimientos F12 y folios del expediente.
// Solo lee de endpoints existentes — no requiere backend nuevo.

interface Evento {
    fecha: string;            // ISO
    tipo: TipoEvento;
    titulo: string;
    detalle?: string;
    estado?: string;
}

type TipoEvento = 'DIARIO' | 'TALLER' | 'DERIVACION' | 'PLAN' | 'DIAGNOSTICO' | 'SEGUIMIENTO' | 'DOCUMENTO';

const TIPO_CFG: Record<TipoEvento, { label: string; icon: React.ReactNode; dot: string; chip: string }> = {
    DIARIO:      { label: 'Diario de campo', icon: <BookOpen size={13} />,       dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    TALLER:      { label: 'Taller',          icon: <Users size={13} />,          dot: 'bg-purple-500',  chip: 'bg-purple-50 text-purple-700 border-purple-200' },
    DERIVACION:  { label: 'Derivación',      icon: <Send size={13} />,           dot: 'bg-blue-500',    chip: 'bg-blue-50 text-blue-700 border-blue-200' },
    PLAN:        { label: 'Plan (PII)',      icon: <ClipboardCheck size={13} />, dot: 'bg-indigo-500',  chip: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    DIAGNOSTICO: { label: 'Diagnóstico F04', icon: <HeartHandshake size={13} />, dot: 'bg-rose-500',    chip: 'bg-rose-50 text-rose-700 border-rose-200' },
    SEGUIMIENTO: { label: 'Seguimiento F12', icon: <HeartHandshake size={13} />, dot: 'bg-amber-500',   chip: 'bg-amber-50 text-amber-700 border-amber-200' },
    DOCUMENTO:   { label: 'Documento',       icon: <FileText size={13} />,       dot: 'bg-gray-400',    chip: 'bg-gray-50 text-gray-600 border-gray-200' },
};

function safeFecha(...candidatos: any[]): string {
    for (const c of candidatos) {
        if (c && !isNaN(new Date(c).getTime())) return new Date(c).toISOString();
    }
    return new Date(0).toISOString();
}

async function fetchJson(url: string): Promise<any> {
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) return null;
    return res.json();
}

interface Props { nnaId: number; casoId: number; }

export const CronologiaNna = ({ nnaId, casoId }: Props) => {
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtro, setFiltro] = useState<TipoEvento | 'TODOS'>('TODOS');

    useEffect(() => {
        let cancelado = false;

        const cargar = async () => {
            setLoading(true);
            const [diarios, talleres, derivaciones, planes, diagnosticos, seguimientos, folios] =
                await Promise.all([
                    fetchJson(`${INTERVENCION_API_URL}/diario/caso/${casoId}`),
                    fetchJson(`${TALLERES_API_URL}/talleres/historial/${nnaId}`),
                    fetchJson(`${DERIVACION_API_URL}/derivaciones/caso/${casoId}`),
                    fetchJson(`${INTERVENCION_API_URL}/pti/caso/${casoId}/all`),
                    fetchJson(`${INTERVENCION_API_URL}/diagnostico/nna/${nnaId}`),
                    fetchJson(`${INTERVENCION_API_URL}/seguimiento/caso/${casoId}`),
                    fetchJson(`${EXPEDIENTE_API_URL}/expediente/caso/${casoId}`),
                ]);
            if (cancelado) return;

            const evs: Evento[] = [];

            (diarios || []).forEach((d: any) => {
                let tipoAct = '';
                try {
                    const p = JSON.parse(d.observaciones || '{}');
                    if (p?.tipoActividad) tipoAct = ` · ${p.tipoActividad.toLowerCase()}`;
                } catch { /* texto plano */ }
                evs.push({
                    fecha: safeFecha(d.fecha, d.created_at),
                    tipo: 'DIARIO',
                    titulo: `Registro de campo${tipoAct}`,
                    detalle: d.actividad,
                });
            });

            (talleres || []).forEach((t: any) => evs.push({
                fecha: safeFecha(t.fecha_programada, t.created_at),
                tipo: 'TALLER',
                titulo: t.nombre || 'Taller',
                detalle: t.descripcion,
                estado: t.estado,
            }));

            (derivaciones || []).forEach((d: any) => evs.push({
                fecha: safeFecha(d.fecha_derivacion),
                tipo: 'DERIVACION',
                titulo: d.tipo === 'EXTERNA'
                    ? `Derivación externa a ${d.entidad_externa || 'entidad'}`
                    : 'Derivación interna a especialista',
                detalle: d.motivo,
                estado: d.estado,
            }));

            (planes || []).forEach((p: any) => {
                evs.push({
                    fecha: safeFecha(p.fechaInicio, p.createdAt),
                    tipo: 'PLAN',
                    titulo: `Plan de Intervención ${p.codigoPti || `#${p.id}`} creado`,
                    detalle: p.objetivoGeneral,
                });
                if (p.fechaCierre) {
                    evs.push({
                        fecha: safeFecha(p.fechaCierre),
                        tipo: 'PLAN',
                        titulo: `Plan ${p.codigoPti || `#${p.id}`} cerrado`,
                        detalle: p.observacionCierre,
                    });
                }
            });

            (diagnosticos || []).forEach((d: any) => evs.push({
                fecha: safeFecha(d.created_at, d.fecha),
                tipo: 'DIAGNOSTICO',
                titulo: `Diagnóstico social ${d.codigo_ficha_04 || ''}`.trim(),
                estado: d.estado,
            }));

            (seguimientos || []).forEach((s: any) => evs.push({
                fecha: safeFecha(s.fecha, s.created_at),
                tipo: 'SEGUIMIENTO',
                titulo: 'Ficha de seguimiento familiar',
                detalle: s.acuerdos || s.observaciones,
            }));

            (folios || []).forEach((f: any) => evs.push({
                fecha: safeFecha(f.fecha_creacion),
                tipo: 'DOCUMENTO',
                titulo: f.titulo || f.tipo_documento || 'Documento del expediente',
                detalle: `Folio ${f.numero_folio}`,
            }));

            evs.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
            setEventos(evs);
            setLoading(false);
        };

        cargar();
        return () => { cancelado = true; };
    }, [nnaId, casoId]);

    const visibles = eventos.filter(e => filtro === 'TODOS' || e.tipo === filtro);
    const conteo = (t: TipoEvento) => eventos.filter(e => e.tipo === t).length;

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Loader2 className="animate-spin mb-2" size={26} />
            <p className="text-xs font-medium">Reuniendo la historia del NNA...</p>
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Filtros */}
            <div className="flex items-center gap-1.5 flex-wrap">
                <button onClick={() => setFiltro('TODOS')}
                    className={`px-3 py-1.5 rounded-full border text-[11px] font-bold transition-all ${
                        filtro === 'TODOS' ? 'bg-gray-800 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
                    }`}>
                    Todos ({eventos.length})
                </button>
                {(Object.keys(TIPO_CFG) as TipoEvento[]).map(t => conteo(t) > 0 && (
                    <button key={t} onClick={() => setFiltro(t)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-[11px] font-bold transition-all ${
                            filtro === t ? 'bg-gray-800 border-gray-800 text-white' : `${TIPO_CFG[t].chip} hover:opacity-80`
                        }`}>
                        {TIPO_CFG[t].icon} {TIPO_CFG[t].label} ({conteo(t)})
                    </button>
                ))}
            </div>

            {/* Línea de tiempo */}
            {visibles.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <History size={30} className="text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-400 font-bold text-sm">Sin eventos registrados</p>
                    <p className="text-gray-400 text-xs mt-1">
                        Los diarios, talleres, derivaciones e informes del NNA aparecerán aquí.
                    </p>
                </div>
            ) : (
                <div className="relative pl-6">
                    {/* Línea vertical */}
                    <div className="absolute left-[9px] top-2 bottom-2 w-px bg-gray-200" />
                    <div className="space-y-4">
                        {visibles.map((e, i) => {
                            const cfg = TIPO_CFG[e.tipo];
                            const fecha = new Date(e.fecha);
                            return (
                                <div key={`${e.tipo}-${i}`} className="relative">
                                    <span className={`absolute -left-6 top-1.5 w-[11px] h-[11px] rounded-full border-2 border-white shadow ${cfg.dot}`} />
                                    <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold ${cfg.chip}`}>
                                                {cfg.icon} {cfg.label}
                                            </span>
                                            <span className="text-[11px] text-gray-400 font-medium">
                                                {fecha.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                {' · '}
                                                {fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {e.estado && (
                                                <span className="text-[10px] font-bold text-gray-400 uppercase ml-auto">{e.estado}</span>
                                            )}
                                        </div>
                                        <p className="text-[13px] font-semibold text-gray-800">{e.titulo}</p>
                                        {e.detalle && (
                                            <p className="text-[12px] text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{e.detalle}</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
