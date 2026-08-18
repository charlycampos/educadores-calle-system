import { getToken } from '../../../utils/auth';
import { confirmar } from '../../../components/ui/ConfirmDialog';
import { toast } from '../../../components/ui/Toast';
import { getDownloadToken } from '../../../utils/auth';
import { EXPEDIENTE_API_URL } from '../../../config/api';
import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, FileText, AlertCircle, RefreshCw, FileDown, Upload, Share2 } from 'lucide-react';
import { descargarWord, subirInformeFirmado } from '../../../api/informe-situacional.api';
import { useNnaStore } from '../../../store/nna.store';

interface InformeSituacionalListProps {
    casoId: number;
    /** Para refrescar el expediente digital tras archivar el informe firmado. */
    nna?: any;
    nnaFullName?: string;
    onNuevoInforme: () => void;
    onEditarInforme: () => void;
}

export const InformeSituacionalList = ({
    casoId,
    nna,
    nnaFullName,
    onNuevoInforme,
    onEditarInforme,
}: InformeSituacionalListProps) => {
    const [informe, setInforme] = useState<any | null>(null);
    const [subiendo, setSubiendo] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    /**
     * El informe firmado se archiva como folio propio en el expediente de cada
     * NNA que cubre. No reemplaza al PDF que genera el sistema: son dos
     * documentos distintos y el expediente foliado no pisa nada.
     */
    const handleSubirFirmado = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const archivo = e.target.files?.[0];
        e.target.value = '';   // permite volver a elegir el mismo archivo
        if (!archivo) return;

        setSubiendo(true);
        try {
            const titulo = `Informe Situacional firmado ${informe?.codigo_informe || ''}`.trim();
            const r = await subirInformeFirmado(archivo, [casoId], titulo);
            if (nna?.id) await useNnaStore.getState().loadDocuments(nna.id, nna);
            toast.success(
                `Informe firmado archivado (${r.paginas} ${r.paginas === 1 ? 'página' : 'páginas'}).`
            );
        } catch (err: any) {
            toast.error(err.message || 'No se pudo archivar el informe firmado');
        } finally {
            setSubiendo(false);
        }
    };

    const fetchInforme = async () => {
        if (!casoId) return;
        setLoading(true);
        setError(null);
        try {
            const token = getToken();
            const response = await fetch(`${EXPEDIENTE_API_URL}/informe-situacional/caso/${casoId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                if (response.status === 404) {
                    setInforme(null);
                    return;
                }
                throw new Error(`Error del servidor: ${response.status}`);
            }
            const data = await response.json();
            setInforme(data ?? null);
        } catch (err: any) {
            setError(err.message || 'Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInforme();
    }, [casoId]);

    const handleEliminar = async () => {
        if (!(await confirmar('Se eliminará este informe situacional de forma permanente.', { titulo: 'Eliminar informe', textoConfirmar: 'Eliminar', peligro: true }))) return;
        try {
            const token = getToken();
            const res = await fetch(`${EXPEDIENTE_API_URL}/informe-situacional/caso/${casoId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                setInforme(null);
            } else {
                toast.error('No se pudo eliminar el informe');
            }
        } catch (err) {
            console.error('Error eliminando:', err);
        }
    };

    return (
        <div className="bg-surface rounded-[8px] border border-border shadow-1 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div>
                    <h3 className="text-[15px] font-semibold text-fg">Informe Situacional</h3>
                    <p className="text-[12px] text-fg-2 mt-0.5">Sustento de Abordaje y Diagnóstico</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchInforme}
                        title="Recargar"
                        className="p-2 text-fg-muted hover:text-primary hover:bg-primary-soft rounded-[6px] transition-colors"
                    >
                        <RefreshCw size={16} />
                    </button>
                    {!informe && !loading && (
                        <button
                            onClick={onNuevoInforme}
                            className="flex items-center gap-1.5 bg-primary text-primary-fg px-3 py-1.5 rounded-[6px] text-[13px] font-medium hover:bg-primary/90 transition-colors"
                        >
                            <Plus size={15} /> Registrar Informe
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                {loading ? (
                    <div className="py-8 text-center text-fg-muted text-[13px]">Cargando informe situacional...</div>
                ) : error ? (
                    <div className="flex flex-col items-center gap-2 text-danger py-8 text-center">
                        <AlertCircle size={22} />
                        <span className="font-semibold text-[13px]">Error al cargar el informe</span>
                        <span className="text-[11px] text-fg-muted">{error}</span>
                    </div>
                ) : informe ? (
                    <>
                        {/* Tabla (Escritorio) */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-[13px] border-collapse">
                                <thead>
                                    <tr className="bg-surface-muted border-b border-border text-left">
                                        <th className="px-4 py-2.5 text-[11px] font-semibold text-fg-muted uppercase tracking-wider">Asunto</th>
                                        <th className="px-4 py-2.5 text-[11px] font-semibold text-fg-muted uppercase tracking-wider">Fecha Informe</th>
                                        <th className="px-4 py-2.5 text-[11px] font-semibold text-fg-muted uppercase tracking-wider">NNA</th>
                                        <th className="px-4 py-2.5 text-[11px] font-semibold text-fg-muted uppercase tracking-wider">Estado</th>
                                        <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-fg-muted uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b border-border hover:bg-surface-muted/50">
                                        <td className="px-4 py-3 font-semibold text-fg">{informe.asunto}</td>
                                        <td className="px-4 py-3 text-fg-2">{new Date(informe.fecha_informe + 'T00:00:00').toLocaleDateString('es-PE')}</td>
                                        <td className="px-4 py-3 text-fg-2">{nnaFullName}</td>
                                        <td className="px-4 py-3">
                                            {informe.estado === 'FINALIZADO' ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-success-soft text-success border border-success/20">
                                                    ✓ Finalizado
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-warning-soft text-warning border border-warning/20">
                                                    Borrador
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-1.5">
                                                {/* El lápiz va siempre, también en los
                                                    finalizados: el documento oficial es el
                                                    Word que se tramita por el SGD, así que
                                                    la vista HTML no aportaba nada. Lo que sí
                                                    hace falta es entrar a revisar o corregir
                                                    lo registrado y volver a bajar el Word. */}
                                                <button
                                                    onClick={onEditarInforme}
                                                    className="p-1.5 text-fg-muted hover:text-primary hover:bg-primary-soft rounded-[4px] transition-colors"
                                                    title={informe.estado === 'FINALIZADO' ? 'Revisar o corregir' : 'Editar'}
                                                >
                                                    <Edit size={15} />
                                                </button>
                                                {informe.estado === 'FINALIZADO' ? (
                                                    <>
                                                    <button
                                                        onClick={() => descargarWord(casoId, informe.id)}
                                                        className="p-1.5 text-fg-muted hover:text-primary hover:bg-primary-soft rounded-[4px] transition-colors"
                                                        title="Descargar Word para el SGD"
                                                    >
                                                        <FileDown size={15} />
                                                    </button>
                                                    {/* Derivación — todavía inactiva.
                                                        Falta definir a quién se deriva
                                                        exactamente: la idea acordada es un
                                                        combo DEMUNA / UPE y, según lo elegido,
                                                        un segundo combo con la instancia
                                                        concreta (reunión 11/08/2026). Con ese
                                                        dato, la trabajadora social recibe el
                                                        informe ya dirigido.

                                                        Se deja visible y deshabilitado a
                                                        propósito: así el educador sabe que el
                                                        paso existe y está por venir, en vez de
                                                        que aparezca un día sin aviso. */}
                                                    <button
                                                        type="button"
                                                        disabled
                                                        title="Derivar a DEMUNA o UPE — disponible próximamente"
                                                        className="p-1.5 text-fg-muted/40 rounded-[4px] cursor-not-allowed"
                                                    >
                                                        <Share2 size={15} />
                                                    </button>
                                                    <label
                                                        className={`p-1.5 rounded-[4px] transition-colors cursor-pointer ${subiendo ? 'text-fg-muted/40' : 'text-fg-muted hover:text-primary hover:bg-primary-soft'}`}
                                                        title="Subir el informe firmado al Expediente Digital"
                                                    >
                                                        <Upload size={15} />
                                                        <input
                                                            type="file"
                                                            accept="application/pdf,image/*"
                                                            className="hidden"
                                                            disabled={subiendo}
                                                            onChange={handleSubirFirmado}
                                                        />
                                                    </label>
                                                    </>
                                                ) : (
                                                    // Eliminar solo en borrador: un informe ya
                                                    // finalizado salió al SGD y borrarlo dejaría
                                                    // el expediente sin su rastro.
                                                    <button
                                                        onClick={handleEliminar}
                                                        className="p-1.5 text-fg-muted hover:text-danger hover:bg-danger-soft rounded-[4px] transition-colors"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Tarjeta (Móvil) */}
                        <div className="md:hidden border border-border rounded-xl p-4 space-y-3 bg-surface">
                            <div className="flex justify-between items-start">
                                <span className="font-bold text-fg text-sm">{informe.asunto}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${informe.estado === 'FINALIZADO' ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'}`}>
                                    {informe.estado === 'FINALIZADO' ? 'Finalizado' : 'Borrador'}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <span className="text-fg-muted block text-[10px] uppercase font-bold">Fecha Informe</span>
                                    <span className="text-fg-2 font-medium">{new Date(informe.fecha_informe + 'T00:00:00').toLocaleDateString('es-PE')}</span>
                                </div>
                                <div>
                                    <span className="text-fg-muted block text-[10px] uppercase font-bold">Beneficiario</span>
                                    <span className="text-fg-2 font-medium">{nnaFullName}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                                {/* Misma lógica que en la tabla: entrar a la ficha
                                    siempre, y eliminar solo mientras sea borrador. */}
                                <button
                                    onClick={onEditarInforme}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-primary-soft text-primary py-1.5 rounded-lg text-xs font-bold"
                                >
                                    <Edit size={14} />
                                    {informe.estado === 'FINALIZADO' ? 'Revisar' : 'Editar'}
                                </button>
                                {informe.estado !== 'FINALIZADO' && (
                                    <button
                                        onClick={handleEliminar}
                                        className="flex-1 inline-flex items-center justify-center gap-1.5 bg-danger-soft text-danger py-1.5 rounded-lg text-xs font-bold"
                                    >
                                        <Trash2 size={14} /> Eliminar
                                    </button>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="py-12 text-center flex flex-col items-center justify-center gap-2 border border-dashed border-border rounded-[8px] bg-surface-muted/30">
                        <FileText size={32} className="text-fg-muted opacity-40" />
                        <span className="font-semibold text-fg-2 text-[13px]">No se ha registrado el Informe Situacional</span>
                        <p className="text-fg-muted text-[11px] max-w-[280px]">El informe situacional sustenta las condiciones del NNA para su promoción de fase.</p>
                        <button
                            onClick={onNuevoInforme}
                            className="mt-2 text-primary font-bold text-[12px] hover:underline"
                        >
                            Crear ahora mismo
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
