import { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Printer, ChevronDown, ChevronUp, User, FileText } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Formato13Print } from './Formato13Print';
import { useNnaStore } from '../../../store/nna.store';

/* ── Clases helper para inputs/selects ─────────────────────────────── */
const INP = 'w-full px-3 py-2 border border-border-strong rounded-[6px] text-[13px] bg-surface text-fg outline-none focus:border-primary transition-colors';
const SEL = INP + ' appearance-none';
const TA  = INP + ' resize-vertical min-h-[60px]';
const INP_DISABLED = 'w-full px-3 py-2 border border-border rounded-[6px] text-[13px] bg-surface-muted text-fg-muted outline-none cursor-not-allowed';
const LBL = 'block text-[11px] font-semibold text-fg-muted uppercase tracking-wider mb-1';

/* ── SectionHeader reutilizable (.esec-hd) ─────────────────────────── */
const EsecHeader = ({ title, section, icon: Icon, expanded, onToggle }: any) => (
    <button
        onClick={() => onToggle(section)}
        className="w-full flex items-center justify-between px-4 py-3 bg-surface-muted hover:bg-bg cursor-pointer select-none transition-colors border-b border-border"
    >
        <div className="flex items-center gap-2">
            <Icon size={16} className="text-success" />
            <h3 className="font-semibold text-[13px] text-fg">{title}</h3>
        </div>
        {expanded ? <ChevronUp size={16} className="text-fg-muted" /> : <ChevronDown size={16} className="text-fg-muted" />}
    </button>
);

/* ── Checkbox card (.rcard style) ─────────────────────────────────── */
const CheckCard = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <label className={`flex items-center gap-2.5 px-3 py-2 rounded-[6px] border cursor-pointer transition-all text-[13px] ${
        checked ? 'border-primary bg-primary-soft text-primary' : 'border-border text-fg-2 hover:border-primary'
    }`}>
        <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
        <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${checked ? 'bg-primary border-primary' : 'border-border-strong bg-surface'}`}>
            {checked && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><polyline points="1 3.5 3.5 6 8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </span>
        {label}
    </label>
);

export const InformeEgresoList = ({ nna }: { nna: any }) => {
    const { registerDocument } = useNnaStore();
    const [isGenerating, setIsGenerating] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        datos: true, modalidad: true, observaciones: false, logros: true, defensaPublica: false, firmas: false
    });
    const [currentPrintFicha, setCurrentPrintFicha] = useState<any>(null);

    const [ficha, setFicha] = useState<any>({
        fechaNacimiento: nna.fechaNacimiento || '', fechaIngreso: nna.fechaIngreso || '',
        fechaEgreso: new Date().toISOString().split('T')[0],
        dni: nna.numeroDoc || '', sexo: nna.sexo || 'M', seguroSalud: nna.seguroSalud || 'NO',
        trabajoInfantil: false, mendicidad: false, vidaCalleTransito: false, vidaCalleConVivienda: false,
        cumplioFases: false, mayoriaEdad: false, derivacionServicios: false, modalidadRetiro: '',
        interesSuperiorTrata: false, interesSuperiorDelincuencia: false, interesSuperiorOtro: '',
        noUbicado: false, noDeseaParticipar: false, noResuelveUPE: false,
        cuentaResolucionUPE: '', situacionResolucionUPE: '',
        recibeDefensaPublica: '', descripcionDefensa: '', faseAlEgreso: '',
        logros: { 1: false, 2: false, 3: false, 4: false, 5: false, 6: false },
        derechosIdentidad: false, derechosSalud: false, derechosEducacion: false, derechosRecreacion: false,
        derechosOtros: '', entregaDirectorio: '', observacionesMayoriaEdad: '',
        institucionDerivada: '', observacionesDerivacion: '',
        retiInterSuperiorAcciones: '', accionesBusqueda: '', motivoNoDesea: '',
        educadorApellidoPaterno: '', educadorApellidoMaterno: '', educadorNombres: '',
        educadorDNI: '', educadorLugarFecha: '',
        coordinadorApellidoPaterno: '', coordinadorApellidoMaterno: '', coordinadorNombres: '',
        coordinadorDNI: '', coordinadorLugarFecha: '',
    });

    useEffect(() => {
        if (nna) setFicha((p: any) => ({
            ...p,
            fechaNacimiento: nna.fechaNacimiento || '', fechaIngreso: nna.fechaIngreso || '',
            dni: nna.numeroDoc || '', sexo: nna.sexo || 'M', seguroSalud: nna.seguroSalud || 'NO'
        }));
    }, [nna]);

    const toggle = (section: string) => setExpandedSections(p => ({ ...p, [section]: !p[section] }));
    const upF = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setFicha((p: any) => ({ ...p, [key]: e.target.value }));
    const upBool = (key: string, val: boolean) => setFicha((p: any) => ({ ...p, [key]: val }));
    const toggleLogro = (id: number) => setFicha((p: any) => ({ ...p, logros: { ...p.logros, [id]: !p.logros[id] } }));

    const handleDownloadPDF = async () => {
        const fichaCompleta = { ...ficha, datosEducador: { dni: '44455566' }, datosCoordinador: { dni: '11122233' } };
        setCurrentPrintFicha(fichaCompleta);
        await new Promise(r => setTimeout(r, 500));
        const element = document.getElementById('formato-13-hidden-print');
        if (!element) return;

        setIsGenerating(true);
        try {
            const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const w = pdf.internal.pageSize.getWidth();
            pdf.addImage(imgData, 'PNG', 0, 0, w, (canvas.height * w) / canvas.width);
            pdf.save(`F13_Ficha_Egreso_${nna.nombres}_${nna.apellidoPaterno}.pdf`);
            registerDocument({
                nnaId: nna.id, type: 'FICHA DE EGRESO (FORMATO 13)',
                code: `EGR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 100)).padStart(3, '0')}`,
                date: new Date().toISOString(), pages: 1, user: 'Usuario Actual', status: 'GENERADO'
            });
            alert('Ficha de Egreso generada y registrada correctamente.');
        } catch (e) {
            console.error(e); alert('Error al generar PDF');
        } finally {
            setIsGenerating(false); setCurrentPrintFicha(null);
        }
    };

    /* ── Render ──────────────────────────────────────────────────────── */
    return (
        <div className="space-y-3">

            {/* Header */}
            <div className="bg-surface border border-border rounded-[8px] shadow-1 px-5 py-4 flex items-center justify-between">
                <div>
                    <h3 className="text-[15px] font-semibold text-fg">Ficha de Egreso / Retiro</h3>
                    <p className="text-[12px] text-fg-2 mt-0.5">
                        Formato 13 · {nna.nombres} {nna.apellidoPaterno}
                    </p>
                </div>
                <button
                    onClick={handleDownloadPDF}
                    disabled={isGenerating}
                    className="flex items-center gap-1.5 bg-success text-white px-4 py-2 rounded-[6px] text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                    <Printer size={15} />
                    {isGenerating ? 'Generando…' : 'Generar PDF'}
                </button>
            </div>

            {/* ── S1: Datos Generales ───────────────────────────────── */}
            <div className="bg-surface border border-border rounded-[8px] overflow-hidden">
                <EsecHeader title="Datos Generales del NNA" section="datos" icon={User} expanded={expandedSections.datos} onToggle={toggle} />
                {expandedSections.datos && (
                    <div className="p-5 space-y-4 bg-primary-soft/10">
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className={LBL}>Apellidos y Nombres</label>
                                <input className={INP_DISABLED} value={`${nna.apellidoPaterno} ${nna.apellidoMaterno} ${nna.nombres}`} disabled />
                            </div>
                            <div>
                                <label className={LBL}>Fecha de Nacimiento</label>
                                <input type="date" className={INP_DISABLED} value={ficha.fechaNacimiento?.split('T')[0] || ''} disabled />
                            </div>
                            <div>
                                <label className={LBL}>DNI</label>
                                <input className={INP_DISABLED} value={ficha.dni} disabled />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className={LBL}>Sexo</label>
                                <div className="flex gap-4 mt-1">
                                    {['M', 'F'].map(s => (
                                        <label key={s} className="flex items-center gap-1.5 text-[13px] text-fg-2">
                                            <input type="radio" checked={ficha.sexo === s} disabled /> {s}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className={LBL}>Seguro de Salud</label>
                                <select className={SEL} value={ficha.seguroSalud} onChange={upF('seguroSalud')}>
                                    {['NO','SIS','ESSALUD','OTRO'].map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-border">
                            <label className={LBL + ' mb-2'}>Perfil del Usuario/a</label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { key: 'trabajoInfantil', label: 'Trabajo Infantil' },
                                    { key: 'mendicidad', label: 'Mendicidad' },
                                    { key: 'vidaCalleTransito', label: 'Vida en calle — Tránsito' },
                                    { key: 'vidaCalleConVivienda', label: 'Vida en calle — Con vivienda' },
                                ].map(opt => (
                                    <CheckCard key={opt.key} label={opt.label} checked={ficha[opt.key]} onChange={v => upBool(opt.key, v)} />
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border">
                            <div>
                                <label className={LBL}>Fecha Ingreso al Servicio</label>
                                <input type="date" className={INP_DISABLED} value={ficha.fechaIngreso?.split('T')[0] || ''} disabled />
                            </div>
                            <div>
                                <label className={LBL}>Fecha Egreso del Servicio</label>
                                <input type="date" className={INP} value={ficha.fechaEgreso} onChange={upF('fechaEgreso')} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── S2: Modalidad de Egreso ────────────────────────────── */}
            <div className="bg-surface border border-border rounded-[8px] overflow-hidden">
                <EsecHeader title="Modalidad de Egreso" section="modalidad" icon={AlertTriangle} expanded={expandedSections.modalidad} onToggle={toggle} />
                {expandedSections.modalidad && (
                    <div className="p-5 space-y-3">
                        {/* Cumplió fases */}
                        <CheckCard label="Cumplió Fases (Culminación Exitosa)" checked={ficha.cumplioFases} onChange={v => upBool('cumplioFases', v)} />

                        {/* Mayoría de Edad */}
                        <div className={`rounded-[8px] border transition-all ${ficha.mayoriaEdad ? 'bg-info-soft border-info/20 p-4' : 'border-border p-3'}`}>
                            <CheckCard label="Mayoría de Edad" checked={ficha.mayoriaEdad} onChange={v => upBool('mayoriaEdad', v)} />
                            {ficha.mayoriaEdad && (
                                <div className="ml-6 mt-3 space-y-3">
                                    <div>
                                        <label className={LBL + ' mb-2'}>Derechos Restituidos</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['derechosIdentidad','derechosSalud','derechosEducacion','derechosRecreacion'].map((k, i) => (
                                                <CheckCard key={k} label={['Identidad','Salud','Educación','Recreación'][i]} checked={ficha[k]} onChange={v => upBool(k, v)} />
                                            ))}
                                        </div>
                                        <input className={INP + ' mt-2'} placeholder="Otros derechos…" value={ficha.derechosOtros} onChange={upF('derechosOtros')} />
                                    </div>
                                    <div>
                                        <label className={LBL}>Observaciones Generales</label>
                                        <textarea className={TA} rows={2} value={ficha.observacionesMayoriaEdad || ''} onChange={upF('observacionesMayoriaEdad')} />
                                    </div>
                                    <div>
                                        <label className={LBL}>Se Entrega Directorio de Instituciones</label>
                                        <select className={SEL} value={ficha.entregaDirectorio} onChange={upF('entregaDirectorio')}>
                                            <option value="">Seleccionar…</option>
                                            <option value="SI">SÍ</option><option value="NO">NO</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Derivación */}
                        <div className={`rounded-[8px] border transition-all ${ficha.derivacionServicios ? 'bg-primary-soft/30 border-primary/20 p-4' : 'border-border p-3'}`}>
                            <CheckCard label="Derivación a Servicios Complementarios" checked={ficha.derivacionServicios} onChange={v => upBool('derivacionServicios', v)} />
                            {ficha.derivacionServicios && (
                                <div className="ml-6 mt-3 space-y-3">
                                    <div>
                                        <label className={LBL}>Institución Derivada</label>
                                        <input className={INP} value={ficha.institucionDerivada} onChange={upF('institucionDerivada')} placeholder="Nombre de la institución…" />
                                    </div>
                                    <div>
                                        <label className={LBL}>Observaciones / Evidencia</label>
                                        <textarea className={TA} rows={2} value={ficha.observacionesDerivacion} onChange={upF('observacionesDerivacion')} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modalidad de Retiro */}
                        <div className="pt-3 border-t border-border">
                            <label className={LBL + ' mb-2'}>Modalidad de Retiro</label>
                            <div className="space-y-2">

                                {/* Interés Superior */}
                                <div className={`rounded-[8px] border transition-all ${ficha.modalidadRetiro === 'INTERES_SUPERIOR' ? 'bg-warning-soft border-warning/20 p-4' : 'border-border p-3'}`}>
                                    <label className="flex items-center gap-2 cursor-pointer text-[13px] font-medium text-fg">
                                        <input type="radio" name="modalidadRetiro" checked={ficha.modalidadRetiro === 'INTERES_SUPERIOR'} onChange={() => setFicha((p: any) => ({ ...p, modalidadRetiro: 'INTERES_SUPERIOR' }))} />
                                        Interés Superior del NNA
                                    </label>
                                    {ficha.modalidadRetiro === 'INTERES_SUPERIOR' && (
                                        <div className="ml-6 mt-3 space-y-2">
                                            <div className="flex gap-3 flex-wrap">
                                                <CheckCard label="Trata" checked={ficha.interesSuperiorTrata} onChange={v => upBool('interesSuperiorTrata', v)} />
                                                <CheckCard label="Infractor" checked={ficha.interesSuperiorDelincuencia} onChange={v => upBool('interesSuperiorDelincuencia', v)} />
                                            </div>
                                            <input className={INP} placeholder="Otros…" value={ficha.interesSuperiorOtro} onChange={upF('interesSuperiorOtro')} />
                                            <div>
                                                <label className={LBL}>Acciones Realizadas</label>
                                                <textarea className={TA} rows={3} value={ficha.retiInterSuperiorAcciones} onChange={upF('retiInterSuperiorAcciones')} placeholder="Adjuntar evidencia…" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* No Ubicado */}
                                <div className={`rounded-[8px] border transition-all ${ficha.modalidadRetiro === 'NO_UBICADO' ? 'bg-danger-soft border-danger/20 p-4' : 'border-border p-3'}`}>
                                    <label className="flex items-center gap-2 cursor-pointer text-[13px] font-medium text-fg">
                                        <input type="radio" name="modalidadRetiro" checked={ficha.modalidadRetiro === 'NO_UBICADO'} onChange={() => setFicha((p: any) => ({ ...p, modalidadRetiro: 'NO_UBICADO', noUbicado: true }))} />
                                        No Ubicado (3 meses o más)
                                    </label>
                                    {ficha.modalidadRetiro === 'NO_UBICADO' && (
                                        <div className="ml-6 mt-3">
                                            <label className={LBL}>Acciones para Ubicarlo</label>
                                            <textarea className={TA} rows={3} value={ficha.accionesBusqueda} onChange={upF('accionesBusqueda')} placeholder="Adjuntar evidencia en cuaderno de campo…" />
                                        </div>
                                    )}
                                </div>

                                {/* No Desea Participar */}
                                <div className={`rounded-[8px] border transition-all ${ficha.modalidadRetiro === 'NO_DESEA' ? 'bg-warning-soft border-warning/20 p-4' : 'border-border p-3'}`}>
                                    <label className="flex items-center gap-2 cursor-pointer text-[13px] font-medium text-fg">
                                        <input type="radio" name="modalidadRetiro" checked={ficha.modalidadRetiro === 'NO_DESEA'} onChange={() => setFicha((p: any) => ({ ...p, modalidadRetiro: 'NO_DESEA', noDeseaParticipar: true }))} />
                                        No Desea Participar
                                    </label>
                                    {ficha.modalidadRetiro === 'NO_DESEA' && (
                                        <div className="ml-6 mt-3">
                                            <label className={LBL}>Motivo y Acciones para Motivarlo</label>
                                            <textarea className={TA} rows={4} value={ficha.motivoNoDesea} onChange={upF('motivoNoDesea')} />
                                        </div>
                                    )}
                                </div>

                                {/* No Resuelve UPE */}
                                <CheckCard label="No Resuelve UPE" checked={ficha.noResuelveUPE} onChange={v => upBool('noResuelveUPE', v)} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border">
                            <div>
                                <label className={LBL}>Cuenta con Resolución UPE</label>
                                <select className={SEL} value={ficha.cuentaResolucionUPE} onChange={upF('cuentaResolucionUPE')}>
                                    <option value="">Seleccionar…</option><option value="SI">SÍ</option><option value="NO">NO</option>
                                </select>
                            </div>
                            <div>
                                <label className={LBL}>Situación Resolución UPE</label>
                                <select className={SEL} value={ficha.situacionResolucionUPE} onChange={upF('situacionResolucionUPE')}>
                                    <option value="">Seleccionar…</option><option value="SI">SÍ</option><option value="NO">NO</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── S3: Defensa Pública ────────────────────────────────── */}
            <div className="bg-surface border border-border rounded-[8px] overflow-hidden">
                <EsecHeader title="Defensa Pública y Fase del Servicio" section="defensaPublica" icon={FileText} expanded={expandedSections.defensaPublica} onToggle={toggle} />
                {expandedSections.defensaPublica && (
                    <div className="p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={LBL}>Recibe Servicio de Defensa Pública</label>
                                <select className={SEL} value={ficha.recibeDefensaPublica} onChange={upF('recibeDefensaPublica')}>
                                    <option value="">Seleccionar…</option><option value="SI">SÍ</option><option value="NO">NO</option>
                                </select>
                            </div>
                            <div>
                                <label className={LBL}>Fase al Momento del Egreso</label>
                                <select className={SEL} value={ficha.faseAlEgreso} onChange={upF('faseAlEgreso')}>
                                    <option value="">Seleccionar…</option>
                                    <option value="FASE I">FASE I</option><option value="FASE II">FASE II</option><option value="FASE III">FASE III</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className={LBL}>Descripción (Defensa Pública)</label>
                            <textarea className={TA} rows={3} value={ficha.descripcionDefensa} onChange={upF('descripcionDefensa')} placeholder="Detalles del servicio de defensa pública…" />
                        </div>
                    </div>
                )}
            </div>

            {/* ── S4: Logros Cumplidos ───────────────────────────────── */}
            <div className="bg-surface border border-border rounded-[8px] overflow-hidden">
                <EsecHeader title="Logros Cumplidos" section="logros" icon={CheckCircle2} expanded={expandedSections.logros} onToggle={toggle} />
                {expandedSections.logros && (
                    <div className="p-5 space-y-2">
                        {[
                            { id: 1, text: 'Niñas, niños y adolescentes dejan la situación de calle, ejerciendo permanentemente sus derechos (identidad, salud, alimentación, educación, recreación, entre otros)' },
                            { id: 2, text: 'Las niñas, niños y adolescentes desarrollan capacidades de autoprotección y habilidades para la vida' },
                            { id: 3, text: 'Las niñas, niños y adolescentes hacen uso de programas y servicios que restituyen el ejercicio de sus derechos' },
                            { id: 4, text: 'Persona adulta responsable presenta capacidades para garantizar la protección integral de las niñas, niños y adolescentes usuarios/as del servicio' },
                            { id: 5, text: 'Las/os NNA presentan y desarrollan sus proyectos de vida con el cumplimiento de algunas de sus metas según su temporalidad' },
                            { id: 6, text: 'Padres, madres o tutor cuenta con herramientas para asumir el cuidado de sus hijos' },
                        ].map(logro => (
                            <label
                                key={logro.id}
                                className={`flex gap-3 items-start px-3 py-2.5 rounded-[6px] border cursor-pointer transition-all ${
                                    ficha.logros[logro.id]
                                        ? 'border-success bg-success-soft'
                                        : 'border-border hover:border-success hover:bg-success-soft/30'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    className="mt-0.5 flex-shrink-0"
                                    checked={ficha.logros[logro.id]}
                                    onChange={() => toggleLogro(logro.id)}
                                />
                                <div className="text-[13px]">
                                    <span className={`font-bold mr-1.5 ${ficha.logros[logro.id] ? 'text-success' : 'text-fg-muted'}`}>
                                        Logro {logro.id}:
                                    </span>
                                    <span className={ficha.logros[logro.id] ? 'text-success' : 'text-fg-2'}>{logro.text}</span>
                                </div>
                            </label>
                        ))}
                    </div>
                )}
            </div>

            {/* ── S5: Datos Educador / Coordinador ──────────────────── */}
            <div className="bg-surface border border-border rounded-[8px] overflow-hidden">
                <EsecHeader title="Datos del Educador/a y Coordinador/a" section="firmas" icon={FileText} expanded={expandedSections.firmas} onToggle={toggle} />
                {expandedSections.firmas && (
                    <div className="p-5 space-y-5">
                        {[
                            { prefix: 'educador', label: 'Educador/a Responsable', colorCls: 'bg-info-soft border-info/20', titleCls: 'text-info' },
                            { prefix: 'coordinador', label: 'Coordinador/a', colorCls: 'bg-primary-soft border-primary/20', titleCls: 'text-primary' },
                        ].map(({ prefix, label, colorCls, titleCls }) => (
                            <div key={prefix} className={`p-4 rounded-[8px] border ${colorCls}`}>
                                <h4 className={`font-bold text-[13px] uppercase mb-3 ${titleCls}`}>{label}</h4>
                                <div className="grid grid-cols-3 gap-3">
                                    {['ApellidoPaterno','ApellidoMaterno','Nombres'].map(f => (
                                        <div key={f}>
                                            <label className={LBL}>{f.replace(/([A-Z])/g, ' $1').trim()}</label>
                                            <input className={INP} value={ficha[`${prefix}${f}`] || ''} onChange={upF(`${prefix}${f}`)} />
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-2 gap-3 mt-3">
                                    <div>
                                        <label className={LBL}>DNI</label>
                                        <input className={INP} maxLength={8} value={ficha[`${prefix}DNI`] || ''} onChange={upF(`${prefix}DNI`)} />
                                    </div>
                                    <div>
                                        <label className={LBL}>Lugar / Fecha</label>
                                        <input className={INP} placeholder="Lima, 09/02/2026" value={ficha[`${prefix}LugarFecha`] || ''} onChange={upF(`${prefix}LugarFecha`)} />
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <label className={LBL}>Firma</label>
                                    <div className="w-full h-20 border-2 border-dashed border-border rounded-[6px] flex items-center justify-center bg-surface">
                                        <span className="text-[12px] text-fg-muted">Firma en documento físico</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Hidden Print */}
            {currentPrintFicha && (
                <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
                    <Formato13Print id="formato-13-hidden-print" nna={nna} ficha={currentPrintFicha} />
                </div>
            )}
        </div>
    );
};
