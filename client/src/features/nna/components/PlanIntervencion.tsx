import { useState } from 'react';
import {
    Plus, Trash2, Save, Printer, Target, AlertTriangle, ArrowLeft, Loader2, FileDown
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { useNnaStore } from '../../../store/nna.store';
import { Formato9Print } from './Formato9Print';

interface Actividad {
    id: number;
    descripcion: string;
    responsable: string;
    fechaInicio: string;
    fechaFin: string;
    estado: 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO';
}

interface ObjetivoEspecifico {
    id: number;
    area: 'SALUD' | 'EDUCACION' | 'IDENTIDAD' | 'FAMILIA' | 'OTROS';
    descripcion: string;
    indicador: string;
    actividades: Actividad[];
}

interface PIIProps {
    nna: any;
    onClose?: () => void;
}

export const PlanIntervencion = ({ nna, onClose }: PIIProps) => {
    const { registerDocument } = useNnaStore();
    const [showInformeModal, setShowInformeModal] = useState(false);
    const [informeData, setInformeData] = useState({
        antecedentes: 'El NNA ingresó al servicio hace 3 meses...',
        analisis: 'Se observan avances parciales en la integración, sin embargo...',
        sustento: 'Se requiere un mes adicional para consolidar el vínculo de confianza y completar el diagnóstico social.',
        conclusiones: 'Es procedente la ampliación de la Fase I por 30 días.'
    });
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    const handleDownloadPDF = async () => {
        const elementId = 'formato-9-print-pii';
        const element = document.getElementById(elementId);
        if (!element) { alert('Error: No se encontró el formato para imprimir'); return; }

        setIsGeneratingPDF(true);
        try {
            const iframe = document.createElement('iframe');
            iframe.style.cssText = 'position:absolute;left:-9999px;width:210mm;height:297mm';
            document.body.appendChild(iframe);
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (!iframeDoc) throw new Error('No se pudo crear el iframe');

            iframeDoc.open();
            iframeDoc.write(`<!DOCTYPE html><html><head><style>*{margin:0;padding:0;box-sizing:border-box}body{background:white;color:black;font-family:Arial,sans-serif}</style></head><body>${element.outerHTML}</body></html>`);
            iframeDoc.close();
            await new Promise(r => setTimeout(r, 100));

            const iframeElement = iframeDoc.getElementById(elementId);
            if (!iframeElement) throw new Error('Elemento no encontrado en iframe');

            const pdfCanvas = await html2canvas(iframeElement, {
                scale: 2, useCORS: true, logging: false,
                backgroundColor: '#ffffff', windowWidth: 800
            });
            document.body.removeChild(iframe);

            const imgData = pdfCanvas.toDataURL('image/png', 1.0);
            const pdf = new jsPDF('p', 'mm', 'a4');
            const w = pdf.internal.pageSize.getWidth();
            pdf.addImage(imgData, 'PNG', 0, 0, w, (pdfCanvas.height * w) / pdfCanvas.width, undefined, 'FAST');
            pdf.save(`F9_Acta_Compromiso_${nna?.nombres?.replace(/\s+/g, '_')}.pdf`);

            registerDocument({
                nnaId: nna.id,
                type: 'ACTA DE COMPROMISO (FORMATO 09)',
                code: `ACT-${new Date().getFullYear()}-001`,
                date: new Date().toISOString(),
                pages: 1,
                user: 'Usuario Sistema',
                status: 'GENERADO'
            });
        } catch (err) {
            console.error(err);
            alert('Error al generar el PDF.');
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const [objetivoGeneral, setObjetivoGeneral] = useState(
        'Lograr la restitución de los derechos vulnerados del NNA y su reinserción familiar/escolar.'
    );
    const [objetivos, setObjetivos] = useState<ObjetivoEspecifico[]>([
        {
            id: 1,
            area: 'IDENTIDAD',
            descripcion: 'Gestionar la obtención del DNI del NNA.',
            indicador: 'NNA cuenta con DNI físico.',
            actividades: [
                { id: 101, descripcion: 'Coordinación con RENIEC', responsable: 'Educador', fechaInicio: '', fechaFin: '', estado: 'PENDIENTE' }
            ]
        }
    ]);

    const addObjetivo = () => {
        setObjetivos(prev => [...prev, { id: Date.now(), area: 'SALUD', descripcion: '', indicador: '', actividades: [] }]);
    };

    const addActividad = (objId: number) => {
        setObjetivos(prev => prev.map(obj =>
            obj.id !== objId ? obj : {
                ...obj,
                actividades: [...obj.actividades, {
                    id: Date.now(), descripcion: '', responsable: 'Educador',
                    fechaInicio: '', fechaFin: '', estado: 'PENDIENTE'
                }]
            }
        ));
    };

    const removeObjetivo = (id: number) => setObjetivos(prev => prev.filter(o => o.id !== id));

    const removeActividad = (objId: number, actId: number) => {
        setObjetivos(prev => prev.map(obj =>
            obj.id !== objId ? obj : { ...obj, actividades: obj.actividades.filter(a => a.id !== actId) }
        ));
    };

    const updateObjetivo = (index: number, key: string, value: string) => {
        setObjetivos(prev => {
            const next = [...prev];
            (next[index] as any)[key] = value;
            return next;
        });
    };

    const updateActividad = (objIndex: number, actId: number, key: string, value: string) => {
        setObjetivos(prev => {
            const next = [...prev];
            const actIdx = next[objIndex].actividades.findIndex(a => a.id === actId);
            (next[objIndex].actividades[actIdx] as any)[key] = value;
            return next;
        });
    };

    /* ── Informe de Ampliación (documento estilo papel) ── */
    if (showInformeModal) {
        return (
            <div className="bg-bg min-h-screen p-6 print:p-0 print:bg-white">
                <div className="max-w-4xl mx-auto">
                    <div className="flex justify-between items-center mb-5 print:hidden">
                        <button
                            onClick={() => setShowInformeModal(false)}
                            className="flex items-center gap-1.5 text-fg-muted hover:text-fg text-[13px] font-medium px-3 py-2 rounded-[6px] hover:bg-surface border border-transparent hover:border-border transition-all"
                        >
                            <ArrowLeft size={15} /> Volver al Plan
                        </button>
                        <button
                            onClick={() => window.print()}
                            className="flex items-center gap-1.5 bg-surface border border-border-strong text-fg px-4 py-2 rounded-[6px] text-[13px] font-medium hover:bg-surface-muted transition-colors"
                        >
                            <Printer size={15} /> Imprimir Informe
                        </button>
                    </div>

                    <div className="bg-white border border-border rounded-[4px] shadow-2 px-14 py-12 print:shadow-none print:border-none"
                        style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '13px', lineHeight: '1.7' }}>
                        <div className="text-center border-b-2 border-[#333] pb-4 mb-8">
                            <h2 className="text-[15px] font-bold uppercase">Informe Técnico de Ampliación de Fase I</h2>
                            <h3 className="text-[13px] font-bold text-[#555]">Servicio de Educadores de Calle</h3>
                        </div>

                        <div className="flex justify-end mb-6">
                            <p className="text-[13px] font-bold">Fecha: {new Date().toLocaleDateString('es-PE')}</p>
                        </div>

                        <div className="space-y-5 text-justify">
                            {[
                                { roman: 'I', label: 'DATOS DEL USUARIO:',
                                  content: <><p><b>Nombres:</b> {nna?.nombres} {nna?.apellidoPaterno}</p><p><b>DNI:</b> {nna?.numeroDoc || '---'}</p></> },
                            ].map(s => (
                                <div key={s.roman}>
                                    <p className="font-bold underline mb-2">{s.roman}. {s.label}</p>
                                    {s.content}
                                </div>
                            ))}

                            {[
                                { key: 'antecedentes',  label: 'II. ANTECEDENTES:',                          rows: 3 },
                                { key: 'analisis',      label: 'III. ANÁLISIS DE CUMPLIMIENTO DE METAS:',     rows: 4 },
                                { key: 'sustento',      label: 'IV. SUSTENTO DE LA AMPLIACIÓN (1 mes):',      rows: 3 },
                                { key: 'conclusiones',  label: 'V. CONCLUSIÓN:',                              rows: 2 },
                            ].map(({ key, label, rows }) => (
                                <div key={key}>
                                    <p className="font-bold underline mb-2">{label}</p>
                                    {key === 'analisis' && (
                                        <div className="print:hidden bg-warning-soft border border-warning/20 rounded-[5px] px-3 py-2 mb-2 text-[12px] text-warning flex items-center gap-2"
                                            style={{ fontFamily: 'sans-serif' }}>
                                            <AlertTriangle size={13} />
                                            Si no se logran los resultados en 3 meses, se debe sustentar la ampliación.
                                        </div>
                                    )}
                                    <textarea
                                        value={(informeData as any)[key]}
                                        onChange={e => setInformeData(prev => ({ ...prev, [key]: e.target.value }))}
                                        rows={rows}
                                        className="w-full border border-dotted border-[#bbb] p-2 rounded-sm outline-none resize-vertical text-[13px] print:border-none print:p-0"
                                        style={{ fontFamily: 'inherit', lineHeight: 1.5 }}
                                    />
                                </div>
                            ))}

                            <div className="mt-16 pt-8 grid grid-cols-2 gap-16 text-center">
                                <div style={{ borderTop: '1px solid #333', paddingTop: '6px', marginTop: '48px' }}>
                                    <p className="font-bold">Educador/a Responsable</p>
                                </div>
                                <div style={{ borderTop: '1px solid #333', paddingTop: '6px', marginTop: '48px' }}>
                                    <p className="font-bold">V° B° Coordinación</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    /* ── Vista principal del PTI ── */
    return (
        <div className="bg-bg min-h-screen print:bg-white print:p-0">

            {/* Header */}
            <div className="bg-primary px-6 py-4 print:hidden">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-[17px] font-bold text-primary-fg flex items-center gap-2 uppercase">
                            <Target size={18} />
                            Plan de Intervención Individual
                        </h1>
                        <p className="text-primary-fg/70 text-[12px] mt-0.5">
                            Planificación estratégica · Restitución de derechos
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-[10px] text-primary-fg/60 uppercase font-semibold">Usuario</p>
                            <p className="font-semibold text-primary-fg text-[14px]">
                                {nna?.nombres} {nna?.apellidoPaterno}
                            </p>
                        </div>
                        <button
                            onClick={() => setShowInformeModal(true)}
                            className="flex items-center gap-1.5 bg-warning text-white px-3 py-1.5 rounded-[5px] text-[12px] font-bold hover:opacity-90 transition-opacity"
                        >
                            <AlertTriangle size={13} /> Inf. Ampliación
                        </button>
                    </div>
                </div>
            </div>

            {/* Print-only header */}
            <div className="hidden print:block text-center py-8">
                <h2 className="text-xl font-bold uppercase">Plan de Intervención Individual (PTI)</h2>
                <h3 className="text-sm">Servicio de Educadores de Calle · INABIF</h3>
            </div>

            <div className="p-6">
                {/* Objetivo General */}
                <div className="mb-6">
                    <label className="block text-[12px] font-semibold text-fg-muted uppercase tracking-wider mb-2">
                        Objetivo General de la Intervención
                    </label>
                    <textarea
                        value={objetivoGeneral}
                        onChange={e => setObjetivoGeneral(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-border-strong rounded-[6px] bg-surface text-fg text-[13px] font-medium outline-none resize-none focus:border-primary transition-colors print:border-none print:bg-transparent print:p-0"
                    />
                </div>

                {/* Objetivos específicos (.objcard style) */}
                <div className="space-y-4">
                    {objetivos.map((obj, index) => (
                        <div key={obj.id} className="border border-border rounded-[8px] overflow-hidden bg-surface">

                            {/* Header objetivo */}
                            <div className="bg-surface-muted border-b border-border px-4 py-3 flex items-center gap-3 justify-between print:bg-transparent">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <span className="bg-primary-soft text-primary text-[10px] font-bold px-2 py-0.5 rounded uppercase flex-shrink-0">
                                        Obj. {index + 1}
                                    </span>
                                    <select
                                        value={obj.area}
                                        onChange={e => updateObjetivo(index, 'area', e.target.value)}
                                        className="text-[11px] font-semibold text-fg-muted bg-transparent border-none outline-none cursor-pointer hover:text-primary print:appearance-none"
                                    >
                                        <option value="SALUD">ÁREA: SALUD</option>
                                        <option value="EDUCACION">ÁREA: EDUCACIÓN</option>
                                        <option value="IDENTIDAD">ÁREA: IDENTIDAD</option>
                                        <option value="FAMILIA">ÁREA: FAMILIA</option>
                                        <option value="OTROS">ÁREA: OTROS</option>
                                    </select>
                                    <input
                                        type="text"
                                        value={obj.descripcion}
                                        onChange={e => updateObjetivo(index, 'descripcion', e.target.value)}
                                        placeholder="Describa el objetivo específico…"
                                        className="flex-1 bg-transparent font-semibold text-fg text-[13px] placeholder-fg-muted outline-none border-b border-transparent focus:border-primary transition-colors min-w-0"
                                    />
                                </div>
                                <button
                                    onClick={() => removeObjetivo(obj.id)}
                                    className="text-fg-muted hover:text-danger hover:bg-danger-soft p-1.5 rounded-[5px] transition-all print:hidden flex-shrink-0"
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>

                            {/* Actividades */}
                            <div className="p-4">
                                {/* Encabezado columnas */}
                                <div className="grid grid-cols-12 gap-3 mb-2 text-[10px] font-semibold text-fg-muted uppercase tracking-wider pl-2">
                                    <div className="col-span-5">Actividad / Tarea</div>
                                    <div className="col-span-2">Responsable</div>
                                    <div className="col-span-2">Inicio</div>
                                    <div className="col-span-2">Fin</div>
                                    <div className="col-span-1"></div>
                                </div>

                                <div className="space-y-1">
                                    {obj.actividades.map(act => (
                                        <div
                                            key={act.id}
                                            className="grid grid-cols-12 gap-3 items-center px-2 py-1.5 rounded-[5px] hover:bg-surface-muted transition-colors print:border-b print:border-border print:rounded-none"
                                        >
                                            <div className="col-span-5">
                                                <input
                                                    type="text"
                                                    value={act.descripcion}
                                                    onChange={e => updateActividad(index, act.id, 'descripcion', e.target.value)}
                                                    placeholder="Descripción de la actividad"
                                                    className="w-full bg-transparent outline-none text-[12px] text-fg font-medium placeholder-fg-muted border-b border-transparent focus:border-primary transition-colors"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <input
                                                    type="text"
                                                    value={act.responsable}
                                                    onChange={e => updateActividad(index, act.id, 'responsable', e.target.value)}
                                                    className="w-full bg-transparent outline-none text-[12px] text-fg-2 border-b border-transparent focus:border-primary transition-colors"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <input
                                                    type="date"
                                                    value={act.fechaInicio}
                                                    onChange={e => updateActividad(index, act.id, 'fechaInicio', e.target.value)}
                                                    className="w-full bg-transparent outline-none text-[11px] text-fg-muted"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <input
                                                    type="date"
                                                    value={act.fechaFin}
                                                    onChange={e => updateActividad(index, act.id, 'fechaFin', e.target.value)}
                                                    className="w-full bg-transparent outline-none text-[11px] text-fg-muted"
                                                />
                                            </div>
                                            <div className="col-span-1 flex justify-center print:hidden">
                                                <button
                                                    onClick={() => removeActividad(obj.id, act.id)}
                                                    className="text-fg-muted hover:text-danger transition-colors p-1"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => addActividad(obj.id)}
                                    className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:text-primary/80 uppercase tracking-wide print:hidden transition-colors"
                                >
                                    <Plus size={13} /> Agregar Actividad
                                </button>

                                {/* Indicador */}
                                <div className="mt-4 pt-3 border-t border-border flex items-center gap-2">
                                    <Target size={14} className="text-fg-muted flex-shrink-0" />
                                    <span className="text-[10px] font-bold text-fg-muted uppercase flex-shrink-0">Indicador:</span>
                                    <input
                                        type="text"
                                        value={obj.indicador}
                                        onChange={e => updateObjetivo(index, 'indicador', e.target.value)}
                                        placeholder="Ej: El NNA obtiene su documento de identidad."
                                        className="flex-1 bg-transparent border-b border-border focus:border-primary outline-none text-[12px] text-fg-2 italic placeholder-fg-muted py-0.5"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Agregar objetivo */}
                <button
                    onClick={addObjetivo}
                    className="mt-4 w-full flex items-center justify-center gap-2 border-2 border-dashed border-border text-fg-muted hover:text-primary hover:border-primary px-6 py-3 rounded-[8px] font-medium text-[13px] transition-all print:hidden"
                >
                    <Plus size={16} /> Agregar Objetivo Específico
                </button>

                {/* Firmas */}
                <div className="mt-16 pt-8 border-t border-border grid grid-cols-2 gap-20 text-center text-[13px]">
                    <div>
                        <div className="h-px bg-fg w-48 mx-auto mb-2 mt-12"></div>
                        <p className="font-semibold text-fg">Firma del Educador/a</p>
                    </div>
                    <div>
                        <div className="h-px bg-fg w-48 mx-auto mb-2 mt-12"></div>
                        <p className="font-semibold text-fg">V° B° Coordinación</p>
                    </div>
                </div>
            </div>

            {/* Footer acciones */}
            <div className="bg-surface-muted border-t border-border px-6 py-3 flex justify-end gap-2 print:hidden">
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 bg-surface border border-border-strong text-fg px-4 py-2 rounded-[6px] text-[13px] font-medium hover:bg-surface-muted transition-colors"
                >
                    <Printer size={15} /> Imprimir PTI
                </button>
                <button
                    onClick={handleDownloadPDF}
                    disabled={isGeneratingPDF}
                    className="flex items-center gap-1.5 bg-surface border border-border-strong text-fg px-4 py-2 rounded-[6px] text-[13px] font-medium hover:bg-surface-muted transition-colors disabled:opacity-50"
                >
                    {isGeneratingPDF ? <Loader2 className="animate-spin" size={15} /> : <FileDown size={15} />}
                    F9: Acta de Compromiso
                </button>
                <button
                    onClick={() => alert('Plan guardado correctamente')}
                    className="flex items-center gap-1.5 bg-primary text-primary-fg px-4 py-2 rounded-[6px] text-[13px] font-medium hover:bg-primary/90 transition-colors"
                >
                    <Save size={15} /> Guardar Plan
                </button>
            </div>

            {/* F9 oculto para PDF */}
            <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
                <Formato9Print nna={nna} id="formato-9-print-pii" />
            </div>
        </div>
    );
};
