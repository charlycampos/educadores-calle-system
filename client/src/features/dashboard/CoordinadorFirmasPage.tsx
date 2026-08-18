import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, RefreshCw, FileSignature, MessageSquareWarning, ExternalLink, Loader2, Clock } from 'lucide-react';
import { toast } from '../../components/ui/Toast';
import { PanelFirmas } from '../../components/ui/PanelFirmas';
import { CampoDictado } from '../../components/ui/CampoDictado';
import { useAuthStore } from '../../store/auth.store';
import {
    getFichasPendientesFirma,
    firmarComoCoordinador,
    observarFicha,
    type FichaPendienteFirma,
} from '../../api/cierre.api';

/**
 * Bandeja de fichas por firmar del coordinador.
 *
 * Acuerdo de la reunión del 11/08/2026: "bandeja de documentos pendientes para
 * que los coordinadores visualicen y firmen informes o fichas", accesible desde
 * su perfil. El coordinador es quien firma y sella la ficha de egreso.
 *
 * Además puede **observar** una ficha y devolverla al educador. Hasta ahora eso
 * se hacía por correo o por Zimbra —"te estoy devolviendo el informe, he puesto
 * en rojo estas observaciones"—, con el riesgo de que la corrección se perdiera
 * fuera del sistema.
 */

const diasEspera = (fecha: string | null): number => {
    if (!fecha) return 0;
    return Math.floor((Date.now() - new Date(fecha).getTime()) / 86400000);
};

export const CoordinadorFirmasPage = () => {
    const { user } = useAuthStore();
    const [fichas, setFichas]       = useState<FichaPendienteFirma[]>([]);
    const [cargando, setCargando]   = useState(true);
    const [firmando, setFirmando]   = useState<FichaPendienteFirma | null>(null);
    const [observando, setObservando] = useState<FichaPendienteFirma | null>(null);
    const [observacion, setObservacion] = useState('');
    const [enviando, setEnviando]   = useState(false);

    const cargar = async () => {
        try {
            setCargando(true);
            setFichas(await getFichasPendientesFirma());
        } catch (e: any) {
            toast.error(e.message || 'No se pudieron cargar las fichas pendientes.');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => { cargar(); }, []);

    const confirmarFirma = async (firmas: Record<string, string>) => {
        if (!firmando) return;
        if (!firmas.coordinador) {
            toast.error('Dibuje su firma antes de continuar.');
            return;
        }
        try {
            await firmarComoCoordinador(firmando.id, firmas.coordinador);
            toast.success(`Ficha de ${firmando.nna} firmada.`);
            setFirmando(null);
            cargar();
        } catch (e: any) {
            toast.error(e.message || 'No se pudo firmar la ficha.');
        }
    };

    const confirmarObservacion = async () => {
        if (!observando) return;
        setEnviando(true);
        try {
            await observarFicha(observando.id, observacion);
            toast.success('Ficha devuelta al educador con la observación.');
            setObservando(null);
            setObservacion('');
            cargar();
        } catch (e: any) {
            toast.error(e.message || 'No se pudo registrar la observación.');
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="bg-surface border border-border rounded-[8px] shadow-[var(--shadow-1)] px-5 py-4 flex items-center justify-between">
                <div>
                    <h3 className="text-[15px] font-semibold text-fg flex items-center gap-2">
                        <FileSignature size={18} className="text-primary" /> Fichas por Firmar
                    </h3>
                    <p className="text-[12px] text-fg-secondary mt-0.5">
                        Fichas de egreso – retiro que los educadores enviaron para su firma y sello
                    </p>
                </div>
                <button
                    onClick={cargar}
                    disabled={cargando}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-[6px] text-[13px] text-fg-secondary hover:text-fg hover:bg-surface-muted transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={14} className={cargando ? 'animate-spin' : ''} /> Actualizar
                </button>
            </div>

            {cargando ? (
                <div className="bg-surface border border-border rounded-[8px] py-12 text-center">
                    <Loader2 size={28} className="mx-auto mb-3 text-primary animate-spin" />
                    <p className="text-[12px] text-fg-muted">Cargando fichas…</p>
                </div>
            ) : fichas.length === 0 ? (
                <div className="bg-surface border-2 border-dashed border-border rounded-[8px] py-14 text-center">
                    <Inbox size={40} className="mx-auto mb-3 text-fg-muted opacity-40" />
                    <p className="text-[13px] font-medium text-fg-muted">No hay fichas esperando su firma</p>
                    <p className="text-[12px] text-fg-muted mt-1">
                        Cuando un educador firme una ficha de egreso, aparecerá aquí.
                    </p>
                </div>
            ) : (
                <div className="bg-surface border border-border rounded-[8px] overflow-hidden">
                    <table className="w-full text-[13px]" style={{ tableLayout: 'fixed' }}>
                        <thead>
                            <tr className="bg-surface-muted text-[10px] text-fg-muted uppercase tracking-wider text-left">
                                <th style={{ width: '26%' }} className="px-3 py-2.5 font-bold">NNA</th>
                                <th style={{ width: '20%' }} className="px-3 py-2.5 font-bold">Educador</th>
                                <th style={{ width: '14%' }} className="px-3 py-2.5 font-bold">Código</th>
                                <th style={{ width: '14%' }} className="px-3 py-2.5 font-bold">Fecha de egreso</th>
                                <th style={{ width: '12%' }} className="px-3 py-2.5 font-bold">Esperando</th>
                                <th style={{ width: '14%' }} className="px-3 py-2.5 font-bold text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fichas.map(f => {
                                const dias = diasEspera(f.enviadoEl);
                                return (
                                    <tr key={f.id} className="border-t border-border hover:bg-surface-muted/50 align-top">
                                        <td className="px-3 py-2.5 font-medium text-fg">{f.nna}</td>
                                        <td className="px-3 py-2.5 text-fg-2">{f.educador || '—'}</td>
                                        <td className="px-3 py-2.5 text-fg-muted">{f.codigoInforme || '—'}</td>
                                        <td className="px-3 py-2.5 text-fg-2">
                                            {f.fechaEgreso ? f.fechaEgreso.split('T')[0].split('-').reverse().join('/') : '—'}
                                        </td>
                                        <td className="px-3 py-2.5">
                                            {/* El tiempo de espera se ve de un vistazo: una ficha
                                                sin firmar detiene el cierre del caso. */}
                                            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                                                dias >= 7 ? 'text-danger' : dias >= 3 ? 'text-warning' : 'text-fg-muted'
                                            }`}>
                                                <Clock size={11} /> {dias === 0 ? 'Hoy' : `${dias} d`}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <div className="flex items-center justify-center gap-1">
                                                <Link
                                                    to={`/nna/expediente/${f.casoId}?nnaId=${f.nnaId}`}
                                                    title="Ver el expediente del NNA"
                                                    className="p-1.5 text-fg-muted hover:text-primary hover:bg-primary-soft rounded-[5px] transition-all"
                                                >
                                                    <ExternalLink size={14} />
                                                </Link>
                                                <button
                                                    onClick={() => { setObservacion(''); setObservando(f); }}
                                                    title="Observar y devolver al educador"
                                                    className="p-1.5 text-fg-muted hover:text-warning hover:bg-warning-soft rounded-[5px] transition-all"
                                                >
                                                    <MessageSquareWarning size={14} />
                                                </button>
                                                <button
                                                    onClick={() => setFirmando(f)}
                                                    title="Firmar la ficha"
                                                    className="p-1.5 text-primary hover:bg-primary-soft rounded-[5px] transition-all"
                                                >
                                                    <FileSignature size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {firmando && (
                <PanelFirmas
                    titulo={`Firmar ficha de ${firmando.nna}`}
                    subtitulo={`Formato 13 · ${firmando.codigoInforme || 'Sin código'}`}
                    firmantes={[{
                        clave: 'coordinador',
                        etiqueta: 'Coordinador/a',
                        rol: 'Nombre y firma del coordinador/a',
                        nombre: user?.nombreCompleto || user?.nombre || '',
                        conHuella: false,
                    }]}
                    onFirmar={confirmarFirma}
                    onDescargarParaFirmar={() => toast.info('Abra el expediente del NNA para descargar la ficha.')}
                    onSubirFirmado={() => toast.info('Para el proceso en papel, súbalo desde el expediente digital.')}
                    onClose={() => setFirmando(null)}
                />
            )}

            {observando && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-surface rounded-[10px] shadow-3 w-full max-w-[560px] border border-border overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-border">
                            <h3 className="text-[14px] font-semibold text-fg">Observar ficha</h3>
                            <p className="text-[11px] text-fg-muted mt-0.5">
                                {observando.nna} · se devolverá a {observando.educador || 'el educador'} para su corrección
                            </p>
                        </div>
                        <div className="p-5">
                            <CampoDictado
                                label="Observación"
                                value={observacion}
                                onChange={setObservacion}
                                rows={4}
                                placeholder="Indique qué debe corregirse…"
                            />
                        </div>
                        <div className="px-5 py-3 border-t border-border flex justify-end gap-2 bg-surface-muted">
                            <button
                                onClick={() => setObservando(null)}
                                className="px-4 py-2 bg-surface border border-border-strong text-fg text-[13px] font-medium rounded-[6px] hover:bg-surface-muted transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmarObservacion}
                                disabled={enviando || !observacion.trim()}
                                className="flex items-center gap-2 px-4 py-2 bg-warning text-white text-[13px] font-medium rounded-[6px] hover:bg-warning/90 transition-colors disabled:opacity-60"
                            >
                                <MessageSquareWarning size={15} />
                                {enviando ? 'Enviando…' : 'Devolver al educador'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
