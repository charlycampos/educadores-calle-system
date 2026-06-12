import { getToken } from '../../../utils/auth';
import { confirmar } from '../../../components/ui/ConfirmDialog';
import { toast } from '../../../components/ui/Toast';
import { useState, useEffect } from 'react';
import { Printer, Save, CheckCircle2 as CheckIcon, ClipboardList, MapPin, Users, CheckCircle2, FileSignature, PenLine } from 'lucide-react';
import { EXPEDIENTE_API_URL } from '../../../config/api';
import { formatTipoDoc } from '../../../data/ubigeo';
import { useNnaStore } from '../../../store/nna.store';

const formatSexo = (sexo: any): string => {
    if (!sexo) return '---';
    const s = String(sexo).trim();
    if (s.startsWith('1')) return 'Masculino';
    if (s.startsWith('2')) return 'Femenino';
    return s;
};

interface InformeSituacionalProps {
    nna: any;
    caso: any;
    onClose: () => void;
}

export const InformeSituacional = ({ nna, caso, onClose }: InformeSituacionalProps) => {
    const [isSaving, setIsSaving] = useState(false);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [estadoActual, setEstadoActual] = useState<string>('BORRADOR');
    const [codigoInforme, setCodigoInforme] = useState<string>('');
 
    const [formData, setFormData] = useState({
        fechaInforme:       new Date().toISOString().split('T')[0],
        destinatario:       'COORDINACIÓN DEL SERVICIO DE EDUCADORES DE CALLE',
        asunto:             `INFORME SITUACIONAL DEL NNA ${nna.nombres} ${nna.apellidoPaterno}`.toUpperCase(),
        antecedentes:       '',
        estrategias:        '',
        situacionSalud:     '',
        situacionEducacion: '',
        situacionFamiliar:  '',
        conclusiones:       '',
        recomendaciones:    '',
    });
 
    useEffect(() => {
        if (!caso?.id) return;
        const token = getToken();
        fetch(`${EXPEDIENTE_API_URL}/informe-situacional/caso/${caso.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => {
            if (!res.ok) throw new Error('Error del servidor');
            return res.json();
        })
        .then(data => {
            if (!data) return;
            setEstadoActual(data.estado || 'BORRADOR');
            setCodigoInforme(data.codigo_informe || '');
            setFormData({
                fechaInforme: data.fecha_informe || new Date().toISOString().split('T')[0],
                destinatario: data.destinatario || 'COORDINACIÓN DEL SERVICIO DE EDUCADORES DE CALLE',
                asunto: data.asunto || `INFORME SITUACIONAL DEL NNA ${nna.nombres} ${nna.apellidoPaterno}`.toUpperCase(),
                antecedentes: data.antecedentes || '',
                estrategias: data.estrategias || '',
                situacionSalud: data.situacion_salud || '',
                situacionEducacion: data.situacion_educativa || '',
                situacionFamiliar: data.situacion_familiar || '',
                conclusiones: data.conclusiones || '',
                recomendaciones: data.recomendaciones || '',
            });
        })
        .catch(err => {
            console.log(err.message);
        });
    }, [caso?.id, nna]);
 
    const up = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setFormData(prev => ({ ...prev, [key]: e.target.value }));
 
    const buildBody = (estado: string) => ({
        fecha_informe: formData.fechaInforme,
        destinatario: formData.destinatario,
        asunto: formData.asunto,
        antecedentes: formData.antecedentes,
        estrategias: formData.estrategias,
        situacion_salud: formData.situacionSalud,
        situacion_educativa: formData.situacionEducacion,
        situacion_familiar: formData.situacionFamiliar,
        conclusiones: formData.conclusiones,
        recomendaciones: formData.recomendaciones,
        estado,
    });
 
    const saveToApi = async (estado: string) => {
        const token = getToken();
        const res = await fetch(`${EXPEDIENTE_API_URL}/informe-situacional/caso/${caso.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(buildBody(estado)),
        });
        if (!res.ok) throw new Error('Error al guardar el informe');
        return res.json();
    };
 
    const handleSaveBorrador = async () => {
        if (!caso?.id) { toast.error('No existe un caso activo para este NNA'); return; }
        setIsSaving(true);
        try {
            const data = await saveToApi('BORRADOR');
            setEstadoActual('BORRADOR');
            if (data && data.codigo_informe) {
                setCodigoInforme(data.codigo_informe);
            }
            toast.success('Borrador guardado correctamente');
        } catch (e) {
            console.error(e);
            toast.error('Error al guardar el borrador');
        } finally {
            setIsSaving(false);
        }
    };
 
    const handleFinalizar = async () => {
        if (!caso?.id) { toast.error('No existe un caso activo para este NNA'); return; }
        if (!(await confirmar('El informe se registrará en el Expediente Digital y no podrá editarse.', { titulo: 'Finalizar informe situacional', textoConfirmar: 'Finalizar' }))) return;
        setIsFinalizing(true);
        try {
            const data = await saveToApi('FINALIZADO');
            setEstadoActual('FINALIZADO');
            if (data && data.codigo_informe) {
                setCodigoInforme(data.codigo_informe);
            }
 
            // Recargar los documentos en el store del expediente digital
            await useNnaStore.getState().loadDocuments(nna.id, nna);
 
            toast.success('Informe finalizado y registrado en el Expediente Digital.');
            onClose();
        } catch (e) {
            console.error(e);
            toast.error('Error al finalizar el informe');
        } finally {
            setIsFinalizing(false);
        }
    };
 
    const edad = (() => {
        if (!nna.fechaNacimiento) return '---';
        const hoy = new Date();
        const nac = new Date(nna.fechaNacimiento);
        let años = hoy.getFullYear() - nac.getFullYear();
        if (hoy.getMonth() < nac.getMonth() || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) {
            años--;
        }
        return `${años} años`;
    })();
 
    return (
        <div className="bg-bg flex flex-col gap-3">
 
            {/* ── I. Datos de Identificación ── */}
            <div className="bg-surface border border-border rounded-[8px] overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-surface-muted flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <ClipboardList size={14} className="text-fg-muted" />
                        <span className="text-[11px] font-bold uppercase tracking-widest text-fg-muted">I. Datos de Identificación</span>
                    </div>
                    {codigoInforme && (
                        <span className="text-[12px] font-bold text-primary bg-primary-soft border border-primary/20 px-2.5 py-1 rounded-[6px]">
                            N° {codigoInforme}
                        </span>
                    )}
                </div>
                <div className="p-4 flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[12px] font-medium text-fg-2 block mb-1">Nombres y Apellidos</label>
                            <div className="text-[13px] font-semibold text-fg px-3 py-2 bg-surface-muted border border-border rounded-[6px]">
                                {nna.nombres} {nna.apellidoPaterno} {nna.apellidoMaterno}
                            </div>
                        </div>
                        <div>
                            <label className="text-[12px] font-medium text-fg-2 block mb-1">Documento de Identidad</label>
                            <div className="text-[13px] font-semibold text-fg px-3 py-2 bg-surface-muted border border-border rounded-[6px]">
                                {formatTipoDoc(nna.tipoDoc)} {nna.numeroDoc || 'S/D'}
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="text-[12px] font-medium text-fg-2 block mb-1">Edad</label>
                            <div className="text-[13px] font-semibold text-fg px-3 py-2 bg-surface-muted border border-border rounded-[6px]">{edad}</div>
                        </div>
                        <div>
                            <label className="text-[12px] font-medium text-fg-2 block mb-1">Sexo</label>
                            <div className="text-[13px] font-semibold text-fg px-3 py-2 bg-surface-muted border border-border rounded-[6px]">{formatSexo(nna.sexo)}</div>
                        </div>
                        <div>
                            <label className="text-[12px] font-medium text-fg-2 block mb-1">Carpeta</label>
                            <div className="text-[13px] font-semibold text-fg px-3 py-2 bg-surface-muted border border-border rounded-[6px]">{nna.carpeta?.codigo || '---'}</div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[12px] font-medium text-fg-2 block mb-1">Dirigido a</label>
                            <input
                                type="text"
                                value={formData.destinatario}
                                onChange={up('destinatario')}
                                className="w-full text-[13px] px-3 py-2 border border-border-strong rounded-[6px] bg-surface text-fg outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                        </div>
                        <div>
                            <label className="text-[12px] font-medium text-fg-2 block mb-1">Fecha del Informe</label>
                            <input
                                type="date"
                                value={formData.fechaInforme}
                                onChange={up('fechaInforme')}
                                className="w-full text-[13px] px-3 py-2 border border-border-strong rounded-[6px] bg-surface text-fg outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── II. Antecedentes ── */}
            <div className="bg-surface border border-border rounded-[8px] overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-surface-muted flex items-center gap-2">
                    <MapPin size={14} className="text-fg-muted" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-fg-muted">II. Antecedentes y Circunstancias del Hallazgo</span>
                </div>
                <div className="p-4">
                    <p className="text-[11px] text-fg-muted italic mb-2">¿En qué circunstancias y condiciones se encontró al NNA? (Ubicación, horario, actividad, compañía, apariencia).</p>
                    <textarea
                        value={formData.antecedentes}
                        onChange={up('antecedentes')}
                        rows={4}
                        placeholder="Redacte aquí las circunstancias del contacto inicial..."
                        className="w-full text-[13px] px-3 py-2 border border-border-strong rounded-[6px] bg-surface text-fg outline-none resize-vertical focus:border-primary focus:ring-1 focus:ring-primary"
                        style={{ lineHeight: 1.6 }}
                    />
                </div>
            </div>

            {/* ── III. Estrategias ── */}
            <div className="bg-surface border border-border rounded-[8px] overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-surface-muted flex items-center gap-2">
                    <Users size={14} className="text-fg-muted" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-fg-muted">III. Estrategias de Acercamiento</span>
                </div>
                <div className="p-4">
                    <p className="text-[11px] text-fg-muted italic mb-2">¿Qué estrategias utilizó para establecer la relación de confianza?</p>
                    <textarea
                        value={formData.estrategias}
                        onChange={up('estrategias')}
                        rows={3}
                        placeholder="Técnicas de abordaje, lúdicas, observación participante..."
                        className="w-full text-[13px] px-3 py-2 border border-border-strong rounded-[6px] bg-surface text-fg outline-none resize-vertical focus:border-primary focus:ring-1 focus:ring-primary"
                        style={{ lineHeight: 1.6 }}
                    />
                </div>
            </div>

            {/* ── IV. Análisis ── */}
            <div className="bg-surface border border-border rounded-[8px] overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-surface-muted flex items-center gap-2">
                    <FileSignature size={14} className="text-fg-muted" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-fg-muted">IV. Análisis de la Situación</span>
                </div>
                <div className="p-4 flex flex-col gap-4">
                    <div className="flex gap-3 items-start">
                        <div className="w-[3px] self-stretch rounded-full bg-danger flex-shrink-0" />
                        <div className="flex-1">
                            <label className="text-[12px] font-medium text-fg-2 block mb-1">4.1 Situación de Salud</label>
                            <textarea value={formData.situacionSalud} onChange={up('situacionSalud')} rows={2}
                                placeholder="Estado de salud, nutrición, higiene…"
                                className="w-full text-[13px] px-3 py-2 border border-border-strong rounded-[6px] bg-surface text-fg outline-none resize-vertical focus:border-primary focus:ring-1 focus:ring-primary"
                                style={{ lineHeight: 1.6 }} />
                        </div>
                    </div>
                    <div className="flex gap-3 items-start">
                        <div className="w-[3px] self-stretch rounded-full bg-info flex-shrink-0" />
                        <div className="flex-1">
                            <label className="text-[12px] font-medium text-fg-2 block mb-1">4.2 Situación Educativa</label>
                            <textarea value={formData.situacionEducacion} onChange={up('situacionEducacion')} rows={2}
                                placeholder="Escolaridad, deserción, rezago…"
                                className="w-full text-[13px] px-3 py-2 border border-border-strong rounded-[6px] bg-surface text-fg outline-none resize-vertical focus:border-primary focus:ring-1 focus:ring-primary"
                                style={{ lineHeight: 1.6 }} />
                        </div>
                    </div>
                    <div className="flex gap-3 items-start">
                        <div className="w-[3px] self-stretch rounded-full bg-success flex-shrink-0" />
                        <div className="flex-1">
                            <label className="text-[12px] font-medium text-fg-2 block mb-1">4.3 Situación Familiar y Social</label>
                            <textarea value={formData.situacionFamiliar} onChange={up('situacionFamiliar')} rows={3}
                                placeholder="Dinámica familiar, violencia, soporte…"
                                className="w-full text-[13px] px-3 py-2 border border-border-strong rounded-[6px] bg-surface text-fg outline-none resize-vertical focus:border-primary focus:ring-1 focus:ring-primary"
                                style={{ lineHeight: 1.6 }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── V. Conclusiones ── */}
            <div className="bg-surface border border-border rounded-[8px] overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-surface-muted flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-fg-muted" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-fg-muted">V. Conclusiones y Recomendaciones</span>
                </div>
                <div className="p-4 flex flex-col gap-3">
                    <div>
                        <label className="text-[12px] font-medium text-fg-2 block mb-1">Conclusiones principales</label>
                        <textarea value={formData.conclusiones} onChange={up('conclusiones')} rows={3}
                            placeholder="Conclusiones principales del caso..."
                            className="w-full text-[13px] px-3 py-2 border border-border-strong rounded-[6px] bg-surface text-fg outline-none resize-vertical focus:border-primary focus:ring-1 focus:ring-primary"
                            style={{ lineHeight: 1.6 }} />
                    </div>
                    <div className="bg-surface-muted border border-border rounded-[6px] p-3">
                        <label className="text-[12px] font-medium text-fg-2 block mb-2">Se recomienda:</label>
                        <textarea value={formData.recomendaciones} onChange={up('recomendaciones')} rows={2}
                            placeholder="Acciones inmediatas, derivaciones, ingreso a Fase II..."
                            className="w-full text-[13px] px-3 py-2 border border-border-strong rounded-[6px] bg-surface text-fg outline-none resize-vertical focus:border-primary focus:ring-1 focus:ring-primary"
                            style={{ lineHeight: 1.6 }} />
                    </div>
                </div>
            </div>

            {/* ── Firmas ── */}
            <div className="bg-surface border border-border rounded-[8px] overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-surface-muted flex items-center gap-2">
                    <PenLine size={14} className="text-fg-muted" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-fg-muted">Firmas</span>
                </div>
                <div className="p-4">
                    <div className="grid grid-cols-2 gap-12 text-center mt-8">
                        <div className="border-t border-border-strong pt-2">
                            <p className="text-[13px] font-semibold text-fg">Educador/a de Calle</p>
                            <p className="text-[12px] text-fg-muted mt-1">Responsable del Caso</p>
                        </div>
                        <div className="border-t border-border-strong pt-2">
                            <p className="text-[13px] font-semibold text-fg">Coordinador/a</p>
                            <p className="text-[12px] text-fg-muted mt-1">V° B°</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Footer con botones ── */}
            <div className="bg-surface border border-border rounded-[8px] px-5 py-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    {estadoActual === 'FINALIZADO' && (
                        <span className="flex items-center gap-1.5 text-[12px] font-bold text-success bg-success-soft border border-success/20 px-3 py-1.5 rounded-[6px]">
                            <CheckIcon size={13} /> Informe Finalizado
                        </span>
                    )}
                    {estadoActual === 'BORRADOR' && (
                        <span className="text-[11px] text-fg-muted font-medium px-2 py-1 bg-warning-soft border border-warning/20 rounded-[6px]">
                            Borrador
                        </span>
                    )}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-1.5 bg-surface border border-border-strong text-fg px-4 py-2 rounded-[6px] text-[13px] font-medium hover:bg-surface-muted transition-colors"
                    >
                        <Printer size={14} /> Imprimir
                    </button>
                    {estadoActual !== 'FINALIZADO' && (
                        <button
                            onClick={handleSaveBorrador}
                            disabled={isSaving || isFinalizing}
                            className="flex items-center gap-1.5 bg-surface border border-border-strong text-fg px-4 py-2 rounded-[6px] text-[13px] font-medium hover:bg-surface-muted transition-colors disabled:opacity-50"
                        >
                            <Save size={14} /> {isSaving ? 'Guardando…' : 'Guardar Borrador'}
                        </button>
                    )}
                    {estadoActual !== 'FINALIZADO' && (
                        <button
                            onClick={handleFinalizar}
                            disabled={isSaving || isFinalizing}
                            className="flex items-center gap-1.5 bg-success text-white px-4 py-2 rounded-[6px] text-[13px] font-medium hover:bg-success/90 transition-colors disabled:opacity-50"
                        >
                            <CheckIcon size={14} /> {isFinalizing ? 'Finalizando…' : 'Finalizar'}
                        </button>
                    )}
                </div>
            </div>

        </div>
    );
};
