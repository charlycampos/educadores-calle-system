import { useState } from 'react';
import {
    Users,
    Home,
    Activity,
    User,
    CheckCircle2,
    AlertCircle,
    XCircle,
    HeartPulse,
    GraduationCap,
    FileText,
    MapPin,
    Phone,
    Shield,
    BookOpen,
    Smile,
    Baby,
    Clock, // Forced recompile for HMR
    FolderOpen,
} from 'lucide-react';
import { ExpedienteDigitalDocs } from '../ExpedientePage';

interface ResumenCasoProps {
    nna: any;
    caso: any;
    familia: any[];
}

const TABS = [
    { id: 'atendidos', label: 'NNA en Carpeta', icon: Users },
    { id: 'perfil', label: 'Perfil Personal', icon: User },
    { id: 'familiar', label: 'Entorno y Familia', icon: Home },
    { id: 'intervencion', label: 'Situación de Calle', icon: Activity },
    { id: 'expediente', label: 'Expediente Digital', icon: FolderOpen },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (s: string) => s ? s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) : '—';

const calcEdad = (fechaNacimiento: string | null): string => {
    if (!fechaNacimiento) return '—';
    const hoy = new Date();
    const nac = new Date(fechaNacimiento);
    const edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) {
        return `${edad - 1} años`;
    }
    return `${edad} años`;
};

const estadoBadge = (estado: string | undefined) => {
    const st: any = {
        'CAPTACION': { bg: 'bg-info-soft', text: 'text-info', label: 'CAPTACIÓN', dot: 'bg-info' },
        'EN_EVALUACION': { bg: 'bg-warning-soft', text: 'text-warning', label: 'EVALUACIÓN', dot: 'bg-warning' },
        'INTERVENCION': { bg: 'bg-primary-soft', text: 'text-primary', label: 'INTERVENCIÓN', dot: 'bg-primary' },
        'SEGUIMIENTO': { bg: 'bg-success-soft', text: 'text-success', label: 'SEGUIMIENTO', dot: 'bg-success' },
        'DERIVADO': { bg: 'bg-purple-soft', text: 'text-purple', label: 'DERIVADO', dot: 'bg-purple' },
        'CERRADO': { bg: 'bg-surface-muted', text: 'text-fg-muted', label: 'CERRADO', dot: 'bg-fg-muted' },
    };
    const s = st[estado || 'EN_EVALUACION'] || st['EN_EVALUACION'];
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border border-current/10 ${s.bg} ${s.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            {s.label}
        </span>
    );
};

const InfoRow = ({ label, value, highlight = false, icon: Icon }: { label: string; value: string | null | undefined; highlight?: boolean; icon?: any }) => (
    <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-fg-muted/70 flex items-center gap-1">
            {Icon && <Icon size={10} />} {label}
        </span>
        <span className={`text-[13px] font-medium leading-tight ${highlight ? 'text-fg font-bold' : 'text-fg-2'} ${!value ? 'italic text-fg-muted/60' : ''}`}>
            {value || 'Sin registrar'}
        </span>
    </div>
);

const SectionCard = ({ title, icon: Icon, children, color = 'default' }: any) => {
    const colors: any = {
        default: 'border-border',
        success: 'border-success/30',
        warning: 'border-warning/30',
        danger: 'border-danger/30',
        info: 'border-info/30',
    };
    return (
        <div className={`bg-surface rounded-xl border ${colors[color]} overflow-hidden shadow-sm`}>
            <div className="px-5 py-3 border-b border-border bg-surface-muted/50 flex items-center gap-2">
                <Icon size={14} className="text-fg-muted" />
                <span className="text-[11px] font-black uppercase tracking-widest text-fg-muted">{title}</span>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
};

const AlertChip = ({ text, type = 'warning' }: { text: string; type?: 'warning' | 'danger' | 'success' }) => {
    const styles: any = {
        warning: 'bg-warning-soft text-warning border-warning/20',
        danger: 'bg-danger-soft text-danger border-danger/20',
        success: 'bg-success-soft text-success border-success/20',
    };
    const icons: any = {
        warning: AlertCircle,
        danger: XCircle,
        success: CheckCircle2,
    };
    const Ic = icons[type];
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${styles[type]}`}>
            <Ic size={12} /> {text}
        </span>
    );
};

// Dictionaries for numerical values/keys to Spanish text translation
const TIPO_DOC_MAP: Record<string, string> = {
    '1': 'DNI',
    '2': 'SIN_DOC',
    '3': 'PARTIDA_NACIMIENTO',
    '4': 'CE',
    'DNI': 'DNI',
    'SIN_DOC': 'Sin Documento',
    'PARTIDA_NACIMIENTO': 'Partida de Nacimiento',
    'CE': 'Carné de Extranjería',
};

const SEXO_MAP: Record<string, string> = {
    '1': 'Hombre',
    '2': 'Mujer',
    'HOMBRE': 'Hombre',
    'MUJER': 'Mujer',
};

const TIPO_DISCAPACIDAD_MAP: Record<string, string> = {
    '1': 'Motriz o física',
    '2': 'Sensorial',
    '3': 'Cognitivo-intelectual',
    '4': 'Psicosocial o psíquica',
    '5': 'Otros (especificar)',
    '1: Motriz o física': 'Motriz o física',
    '2: Sensorial': 'Sensorial',
    '3: Cognitivo-intelectual': 'Cognitivo-intelectual',
    '4: Psicosocial o psíquica': 'Psicosocial o psíquica',
    '5: Otros (especificar)': 'Otros (especificar)',
};

const MODALIDAD_ESTUDIO_MAP: Record<string, string> = {
    '1': 'Básica / Regular (EBR)',
    '2': 'Alternativa (EBA)',
    '3': 'Especial (EBE)',
    '4': 'Superior Técnica',
    '5': 'Superior Universitaria',
    '6': 'CETPRO',
    '1: Básica / regular': 'Básica / Regular (EBR)',
    '2: Alternativa (EBA)': 'Alternativa (EBA)',
    '3: Especial': 'Especial (EBE)',
    '4: Superior Técnica': 'Superior Técnica',
    '5: Superior Universitaria': 'Superior Universitaria',
    '6: CETPRO': 'CETPRO',
    'EBR': 'Básica / Regular (EBR)',
    'EBA': 'Alternativa (EBA)',
    'EBE': 'Especial (EBE)',
};

const GRADO_ESTUDIO_MAP: Record<string, string> = {
    '1': 'Inicial',
    '2': '1ro primaria',
    '3': '2do primaria',
    '4': '3ro primaria',
    '5': '4to primaria',
    '6': '5to primaria',
    '7': '6to primaria',
    '8': '1ro secundaria',
    '9': '2do secundaria',
    '10': '3ro secundaria',
    '11': '4to secundaria',
    '12': '5to secundaria',
    '13': 'Ciclo I (EBA)',
    '14': 'Ciclo II (EBA)',
    '15': 'Ciclo III (EBA)',
    '16': 'Ciclo IV (EBA)',
    '17': 'Ciclo V (EBA)',
    '18': 'Ciclo VI (EBA)',
    '19': 'Ciclo VII (EBA)',
    '20': 'Ciclo VIII (EBA)',
    '21': 'Ciclo IX (EBA)',
    '22': 'Ciclo X (EBA)',
    '99': 'No aplica / No sabe',
    '1: Inicial': 'Inicial',
    '2: 1ro prim': '1ro primaria',
    '3: 2do prim': '2do primaria',
    '4: 3ro prim': '3ro primaria',
    '5: 4to prim': '4to primaria',
    '6: 5to prim': '5to primaria',
    '7: 6to prim': '6to primaria',
    '8: 1ro sec': '1ro secundaria',
    '9: 2do sec': '2do secundaria',
    '10: 3ro sec': '3ro secundaria',
    '11: 4to sec': '4to secundaria',
    '12: 5to sec': '5to secundaria',
    '13: Ciclo I': 'Ciclo I (EBA)',
    '14: Ciclo II': 'Ciclo II (EBA)',
    '15: Ciclo III': 'Ciclo III (EBA)',
    '16: Ciclo IV': 'Ciclo IV (EBA)',
    '17: Ciclo V': 'Ciclo V (EBA)',
    '18: Ciclo VI': 'Ciclo VI (EBA)',
    '19: Ciclo VII': 'Ciclo VII (EBA)',
    '20: Ciclo VIII': 'Ciclo VIII (EBA)',
    '21: Ciclo IX': 'Ciclo IX (EBA)',
    '22: Ciclo X': 'Ciclo X (EBA)',
    '99: No aplica / No sabe': 'No aplica / No sabe',
};

const NIVEL_EDUCATIVO_MAP: Record<string, string> = {
    '1': 'Sin Instrucción',
    '2': 'Inicial',
    '3': 'Primaria Completa',
    '4': 'Primaria Incompleta',
    '5': 'Secundaria Completa',
    '6': 'Secundaria Incompleta',
    '7': 'EBE (Esp. Básica)',
    '8': 'Superior',
    '1: Sin nivel': 'Sin nivel',
    '2: Inicial': 'Inicial',
    '3: Primaria Incompleta': 'Primaria Incompleta',
    '4: Primaria Completa': 'Primaria Completa',
    '5: Secundaria Incompleta': 'Secundaria Incompleta',
    '6: Secundaria Completa': 'Secundaria Completa',
    '7: Superior No Universitaria Incompleta': 'Superior No Univ. Incompleta',
    '8: Superior No Universitaria Completa': 'Superior No Univ. Completa',
    '9: Superior Universitario Incompleto': 'Superior Univ. Incompleto',
    '10: Superior Universitario Completo': 'Superior Univ. Completo',
    '11: Básica Especial': 'Básica Especial',
};

const TabAtendidos = ({ nnaActual, familia }: { nnaActual: any; familia: any[] }) => {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h3 className="text-[14px] font-bold text-fg">Grupo Familiar en esta Carpeta</h3>
                    <p className="text-[12px] text-fg-muted">Todos los NNA registrados bajo el código de carpeta familiar.</p>
                </div>
                <span className="px-2 py-1 rounded-lg bg-surface-muted border border-border text-[12px] font-bold text-fg">
                    {familia.length} {familia.length === 1 ? 'NNA' : 'NNAs'}
                </span>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
                {familia.map((miembro: any) => {
                    const casoActivo = miembro.casos?.find((c: any) => c.estado !== 'CERRADO')
                        || (miembro.casos?.length > 0 ? miembro.casos[0] : null);
                    const esPrincipal = miembro.id === nnaActual.id;

                    const tipoDocLabel = TIPO_DOC_MAP[miembro.tipoDoc] || miembro.tipoDoc || 'DNI';
                    const sexoLabel = SEXO_MAP[miembro.sexo] || miembro.sexo || '—';
                    const nivelEducativoLabel = miembro.estudiaActualmente 
                        ? (NIVEL_EDUCATIVO_MAP[miembro.nivelEducativo] || fmt(miembro.nivelEducativo))
                        : 'No estudia';

                    return (
                        <div
                            key={miembro.id}
                            className={`rounded-xl border p-4 transition-all relative overflow-hidden ${esPrincipal
                                ? 'border-primary/40 bg-primary-soft/30'
                                : 'border-border bg-surface hover:border-border/60 hover:shadow-md'
                                }`}
                        >
                            {esPrincipal && (
                                <div className="absolute top-0 right-0 px-2 py-0.5 bg-primary text-primary-fg text-[9px] font-black uppercase tracking-tighter">
                                    Viendo ahora
                                </div>
                            )}
                            
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${esPrincipal ? 'bg-primary text-primary-fg' : 'bg-surface-muted text-fg-muted'}`}>
                                        {miembro.fotoUrl ? (
                                            <img src={miembro.fotoUrl} alt="" className="w-full h-full object-cover rounded-2xl" />
                                        ) : (
                                            <Baby size={22} />
                                        )}
                                    </div>
                                    <div>
                                        <p className={`font-bold text-[15px] leading-tight ${esPrincipal ? 'text-primary' : 'text-fg'}`}>
                                            {miembro.nombres} {miembro.apellidoPaterno} {miembro.apellidoMaterno || ''}
                                        </p>
                                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                            <span className="flex items-center gap-1 text-[12px] text-fg-muted font-bold">
                                                <FileText size={12} /> {tipoDocLabel}: {miembro.numeroDoc || 'S/D'}
                                            </span>
                                            <span className="w-1 h-1 bg-border rounded-full" />
                                            <span className="text-[12px] text-fg-muted font-medium">
                                                {calcEdad(miembro.fechaNacimiento)}
                                            </span>
                                            <span className="w-1 h-1 bg-border rounded-full" />
                                            <span className="text-[12px] text-fg-muted capitalize font-medium">
                                                {sexoLabel}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    {estadoBadge(casoActivo?.estado)}
                                    <span className="text-[10px] font-bold text-fg-muted uppercase tracking-tighter">
                                        Fase {casoActivo?.fase || 'I'}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-border/40 grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <p className="text-[9px] text-fg-muted/70 uppercase font-black tracking-widest">Código F03</p>
                                    <p className="text-[11px] font-mono font-bold text-fg">{miembro.codigoFicha03 || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] text-fg-muted/70 uppercase font-black tracking-widest">Salud</p>
                                    <p className="text-[11px] font-bold text-fg">
                                        {(miembro.afiliadoSIS === 'SI' || miembro.afiliadoSIS === 'SÍ' || miembro.afiliadoSIS === '1' || miembro.afiliadoSIS === 1 || miembro.afiliadoSIS === true) 
                                            ? '✓ SIS' 
                                            : (miembro.afiliadoOtroSeguro === 'SI' || miembro.afiliadoOtroSeguro === 'SÍ' || miembro.afiliadoOtroSeguro === '1' || miembro.afiliadoOtroSeguro === 1 || miembro.afiliadoOtroSeguro === true)
                                                ? `✓ ${miembro.detalleOtroSeguro || miembro.afiliadoOtroSeguro || 'Otro Seguro'}`
                                                : 'Sin SIS'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[9px] text-fg-muted/70 uppercase font-black tracking-widest">Educación</p>
                                    <p className="text-[11px] font-bold text-fg">
                                        {nivelEducativoLabel}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[9px] text-fg-muted/70 uppercase font-black tracking-widest">Responsable</p>
                                    <p className="text-[11px] font-bold text-fg truncate">{casoActivo?.responsableNombre || 'No asignado'}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ─── Tab 2: Perfil Personal ───────────────────────────────────────────────────

const TabPerfil = ({ nna }: { nna: any }) => {
    // Alertas automáticas
    const alertas: { text: string; type: 'warning' | 'danger' | 'success' }[] = [];
    if (!nna.numeroDoc) alertas.push({ text: 'Sin DNI', type: 'danger' });
    if (!nna.tienePartidaNacimiento) alertas.push({ text: 'Sin Partida', type: 'warning' });
    
    const tieneSIS = nna.afiliadoSIS === 'SI' || nna.afiliadoSIS === 'SÍ' || nna.afiliadoSIS === '1' || nna.afiliadoSIS === 1 || nna.afiliadoSIS === true;
    const tieneOtroSeguro = nna.afiliadoOtroSeguro === 'SI' || nna.afiliadoOtroSeguro === 'SÍ' || nna.afiliadoOtroSeguro === '1' || nna.afiliadoOtroSeguro === 1 || nna.afiliadoOtroSeguro === true;
    
    if (!tieneSIS && !tieneOtroSeguro) alertas.push({ text: 'Sin Seguro', type: 'warning' });
    if (!nna.estudiaActualmente) alertas.push({ text: 'No Escolarizado', type: 'danger' });
    if (nna.tieneDiscapacidad) alertas.push({ text: 'Discapacidad', type: 'warning' });
    if (nna.sufreEnfermedad === 'SI' || nna.sufreEnfermedad === true) alertas.push({ text: 'Padece Enfermedad', type: 'warning' });

    return (
        <div className="space-y-5">
            {alertas.length > 0 && (
                <div className="bg-surface rounded-xl border border-border p-4 shadow-sm">
                    <p className="text-[11px] font-black uppercase tracking-widest text-fg-muted mb-3">Alertas y Situaciones de Riesgo</p>
                    <div className="flex flex-wrap gap-2">
                        {alertas.map((a, i) => (
                            <AlertChip key={i} text={a.text} type={a.type} />
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Identidad */}
                <SectionCard title="Identidad y Documentación" icon={FileText} color={nna.numeroDoc ? 'default' : 'danger'}>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                        <InfoRow label="Nombres" value={nna.nombres} highlight />
                        <InfoRow label="Apellidos" value={`${nna.apellidoPaterno} ${nna.apellidoMaterno || ''}`} highlight />
                        <InfoRow label="Documento" value={nna.numeroDoc ? `${TIPO_DOC_MAP[nna.tipoDoc] || nna.tipoDoc || 'DNI'}: ${nna.numeroDoc}` : 'No cuenta'} />
                        <InfoRow label="Partida Nac." value={nna.tienePartidaNacimiento ? 'Sí' : 'No'} />
                        <InfoRow label="Nacionalidad" value={nna.nacionalidad} />
                        <InfoRow label="Sexo" value={SEXO_MAP[nna.sexo] || fmt(nna.sexo)} />
                        <InfoRow label="Fecha Nac." value={nna.fechaNacimiento ? new Date(nna.fechaNacimiento).toLocaleDateString() : null} />
                        <InfoRow label="Lugar Nac." value={[nna.distritoNac, nna.provinciaNac, nna.departamentoNac].filter(Boolean).join(', ') || null} />
                    </div>
                    {nna.detalleSinDoc && (
                        <div className="mt-4 pt-3 border-t border-border/40">
                            <InfoRow label="Detalle sobre Documentación" value={nna.detalleSinDoc} />
                        </div>
                    )}
                </SectionCard>

                {/* Salud */}
                <SectionCard title="Salud y Seguros" icon={HeartPulse} color={(tieneSIS || tieneOtroSeguro) ? 'success' : 'warning'}>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                        <InfoRow label="Afiliación SIS" value={tieneSIS ? 'Sí — Activo' : 'No cuenta'} highlight />
                        <InfoRow label="Otro Seguro" value={tieneOtroSeguro ? `Sí (${nna.detalleOtroSeguro || 'Especificado'})` : 'No cuenta'} />
                        <InfoRow label="Enfermedad" value={nna.sufreEnfermedad === 'SI' || nna.sufreEnfermedad === true ? 'Sí — Requiere atención' : 'No'} />
                        <InfoRow label="Discapacidad" value={nna.tieneDiscapacidad ? 'Sí — Registrado' : 'No'} />
                    </div>
                    {(nna.detalleEnfermedad || nna.tipoDiscapacidad || nna.observacionesSalud) && (
                        <div className="mt-4 pt-3 border-t border-border/40 space-y-3">
                            {nna.detalleEnfermedad && <InfoRow label="Detalle de Enfermedad" value={nna.detalleEnfermedad} />}
                            {nna.tipoDiscapacidad && (
                                <InfoRow 
                                    label="Tipo de Discapacidad" 
                                    value={`${TIPO_DISCAPACIDAD_MAP[nna.tipoDiscapacidad] || nna.tipoDiscapacidad} ${nna.detalleDiscapacidad ? '(' + nna.detalleDiscapacidad + ')' : ''}`} 
                                />
                            )}
                            {nna.observacionesSalud && <InfoRow label="Observaciones de Salud" value={nna.observacionesSalud} />}
                        </div>
                    )}
                </SectionCard>

                {/* Educación */}
                <SectionCard title="Escolaridad y Educación" icon={GraduationCap} color={nna.estudiaActualmente ? 'success' : 'danger'}>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                        <InfoRow label="Estado Actual" value={nna.estudiaActualmente ? 'Estudiando' : 'No escolarizado'} highlight />
                        <InfoRow label="Nivel Educativo" value={NIVEL_EDUCATIVO_MAP[nna.nivelEducativo] || fmt(nna.nivelEducativo)} />
                        <InfoRow label="Grado / Año" value={GRADO_ESTUDIO_MAP[nna.gradoEstudio] || nna.gradoEstudio} />
                        <InfoRow label="Modalidad" value={MODALIDAD_ESTUDIO_MAP[nna.modalidadEstudio] || fmt(nna.modalidadEstudio)} />
                        <div className="col-span-2">
                            <InfoRow label="Institución Educativa" value={nna.institucionEducativa} />
                        </div>
                    </div>
                    {nna.detalleNoEstudia && (
                        <div className="mt-4 pt-3 border-t border-border/40">
                            <InfoRow label="Motivo de Deserción" value={nna.detalleNoEstudia} />
                        </div>
                    )}
                </SectionCard>

                {/* Otros Datos */}
                <SectionCard title="Características y Otros" icon={Smile}>
                    <div className="space-y-4">
                        <div className="flex flex-col gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-fg-muted/70 flex items-center gap-1.5 mb-1">
                                Actividades de Tiempo Libre y Rutinas
                            </span>
                            {(() => {
                                const texto = nna.actividadesTiempoLibre || '';
                                const esRiesgoCritico = texto.includes('Riesgo');
                                
                                // Clean up the string to extract numerical statistics using regex
                                // Standard format: Est:XXh Tra:XXh Dor:XXh Jug:XXh | Prom.sueño:XXh/día
                                const estMatch = texto.match(/Est:?(\d+)h?/i);
                                const traMatch = texto.match(/Tra:?(\d+)h?/i);
                                const dorMatch = texto.match(/Dor:?(\d+)h?/i);
                                const jugMatch = texto.match(/Jug:?(\d+)h?/i);
                                const suenoMatch = texto.match(/Prom\.sueño:?(\d+)h?/i);
                                
                                if (estMatch || traMatch || dorMatch || jugMatch || suenoMatch) {
                                    const est = estMatch ? estMatch[1] : '0';
                                    const tra = traMatch ? traMatch[1] : '0';
                                    const dor = dorMatch ? dorMatch[1] : '0';
                                    const jug = jugMatch ? jugMatch[1] : '0';
                                    const sueno = suenoMatch ? suenoMatch[1] : '0';
                                    
                                    return (
                                        <div className="space-y-4">
                                            {esRiesgoCritico && (
                                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-danger-soft text-danger border border-danger/20 text-[10px] font-black tracking-wider uppercase animate-pulse shadow-sm">
                                                    <AlertCircle size={12} /> Riesgo Crítico en la Distribución del Tiempo
                                                </div>
                                            )}
                                            
                                            <div className="grid grid-cols-2 gap-3 mt-1">
                                                {/* Estudio */}
                                                <div className="p-3 rounded-xl border border-border/60 bg-surface-muted/30 flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-info-soft text-info flex items-center justify-center flex-shrink-0">
                                                        <BookOpen size={16} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-bold text-fg-muted uppercase">Horas de Estudio</span>
                                                        <span className="text-[14px] font-black text-fg">{est} horas / sem</span>
                                                    </div>
                                                </div>
                                                
                                                {/* Trabajo */}
                                                <div className={`p-3 rounded-xl border flex items-center gap-3 ${Number(tra) > 0 ? 'border-danger/30 bg-danger-soft/10' : 'border-border/60 bg-surface-muted/30'}`}>
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${Number(tra) > 0 ? 'bg-danger/20 text-danger' : 'bg-surface-muted text-fg-muted'}`}>
                                                        <Activity size={16} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-bold text-fg-muted uppercase">Horas de Trabajo</span>
                                                        <span className={`text-[14px] font-black ${Number(tra) > 0 ? 'text-danger' : 'text-fg'}`}>{tra} horas / sem</span>
                                                    </div>
                                                </div>
                                                
                                                {/* Ocio / Descanso */}
                                                <div className="p-3 rounded-xl border border-border/60 bg-surface-muted/30 flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-success-soft text-success flex items-center justify-center flex-shrink-0">
                                                        <Clock size={16} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-bold text-fg-muted uppercase">Horas Descanso/Ocio</span>
                                                        <span className="text-[14px] font-black text-fg">{dor} horas / sem</span>
                                                    </div>
                                                </div>
                                                
                                                {/* Juego / Recreación */}
                                                <div className="p-3 rounded-xl border border-border/60 bg-surface-muted/30 flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-warning-soft text-warning flex items-center justify-center flex-shrink-0">
                                                        <Smile size={16} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-bold text-fg-muted uppercase">Horas Recreación</span>
                                                        <span className="text-[14px] font-black text-fg">{jug} horas / sem</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Promedio Sueño Diario */}
                                            <div className="p-3 rounded-xl border border-primary/20 bg-primary-soft/10 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center flex-shrink-0">
                                                        <HeartPulse size={16} />
                                                    </div>
                                                    <span className="text-[11px] font-bold text-fg-2 uppercase">Promedio de Sueño Diario</span>
                                                </div>
                                                <span className={`text-[14px] font-black px-2.5 py-1 rounded-lg ${Number(sueno) < 6 ? 'bg-danger text-white' : 'bg-surface border border-primary/10 text-primary'}`}>
                                                    {sueno} horas / día
                                                </span>
                                            </div>
                                        </div>
                                    );
                                }
                                
                                return (
                                    <span className="text-[13px] font-medium leading-tight text-fg-2 italic">
                                        {texto || 'Sin registrar'}
                                    </span>
                                );
                            })()}
                        </div>
                        <InfoRow 
                            label="Características Generales (Observaciones / Detalle Cualitativo)" 
                            value={nna.caracteristicas || 'Sin observaciones o características especiales registradas.'} 
                        />
                    </div>
                </SectionCard>
            </div>
        </div>
    );
};

// ─── Tab 3: Entorno y Familia ─────────────────────────────────────────────────

const TabFamiliar = ({ nna }: { nna: any }) => {
    return (
        <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Referente y Grupo */}
                <SectionCard title="Referente Familiar y Tutor" icon={User}>
                    <div className="space-y-4">
                        <div className="p-4 rounded-2xl bg-primary-soft/20 border border-primary/10">
                            <InfoRow label="Nombre del Tutor/Referente" value={nna.nombreTutor} highlight icon={Shield} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <InfoRow label="Teléfono" value={nna.telefonoContacto} icon={Phone} />
                            <InfoRow label="Vive con NNA" value={fmt(nna.viveCon)} icon={Home} />
                        </div>
                        {nna.detalleViveCon && (
                            <div className="p-3 rounded-xl bg-surface-muted/50 border border-border text-[12px] text-fg-2">
                                <span className="font-bold text-fg-muted uppercase text-[9px] block mb-1">Detalles de Convivencia</span>
                                {nna.detalleViveCon}
                            </div>
                        )}
                    </div>
                </SectionCard>

                {/* Hermanos */}
                <SectionCard title="Vínculos y Hermanos" icon={Users}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <InfoRow label="Tiene Hermanos" value={nna.tieneHermanos ? `Sí — (${nna.cantHermanos || 0})` : 'No'} highlight />
                            <InfoRow label="Antecedente Albergue" value={nna.tieneAntecedenteAlbergue ? 'Sí' : 'No'} />
                        </div>
                        {(nna.detallesHermanos || nna.detalleAntecedenteAlbergue) && (
                            <div className="space-y-3 pt-3 border-t border-border/40">
                                {nna.detallesHermanos && <InfoRow label="Detalle de Hermanos" value={nna.detallesHermanos} />}
                                {nna.detalleAntecedenteAlbergue && <InfoRow label="Institución de Acogida" value={nna.detalleAntecedenteAlbergue} />}
                            </div>
                        )}
                    </div>
                </SectionCard>
            </div>

            {/* Familiares Adultos */}
            <SectionCard title="Otros Miembros de la Familia / Responsables (F03)" icon={Users}>
                {!nna.familiares || nna.familiares.length === 0 ? (
                    <div className="text-center py-10 bg-surface-muted/20 rounded-2xl border-2 border-dashed border-border/40 text-fg-muted italic text-[13px]">
                        No se registraron otros familiares adultos en la ficha inicial.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {nna.familiares.map((f: any, idx: number) => (
                            <div key={idx} className="p-4 rounded-2xl border border-border bg-surface-muted/30 flex flex-col gap-3 hover:border-primary/30 transition-colors">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary-soft text-primary flex items-center justify-center">
                                            <User size={14} />
                                        </div>
                                        <span className="text-[14px] font-bold text-fg leading-tight">{f.nombres}</span>
                                    </div>
                                    <span className="text-[9px] font-black px-2 py-0.5 rounded bg-primary text-primary-fg uppercase tracking-widest">
                                        {f.parentesco}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-y-3 gap-x-4 mt-1">
                                    <InfoRow label="DNI" value={f.dni} />
                                    <InfoRow label="Teléfono" value={f.telefono} />
                                    <InfoRow label="Ocupación" value={f.ocupacion} />
                                    <InfoRow label="Vive con NNA" value={f.viveCon === 'SI' ? 'Sí' : 'No'} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </SectionCard>

            {/* Vivienda */}
            <SectionCard title="Domicilio y Condiciones de Pernocte" icon={MapPin}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <InfoRow label="Dirección Actual" value={nna.domicilioActual} highlight />
                        <InfoRow label="Referencia de Ubicación" value={nna.referenciaDomicilio} />
                        <div className="grid grid-cols-3 gap-4">
                            <InfoRow label="Distrito" value={nna.distritoDom} />
                            <InfoRow label="Provincia" value={nna.provinciaDom} />
                            <InfoRow label="Departamento" value={nna.departamentoDom} />
                        </div>
                    </div>
                    <div className="space-y-4 p-5 rounded-2xl bg-warning-soft/20 border border-warning/10 shadow-inner">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-warning-dark">Situación Habitacional</span>
                        </div>
                        <InfoRow label="Lugar de Pernocte" value={fmt(nna.lugarPernocte)} highlight />
                        {nna.detalleLugarPernocte && (
                            <div className="text-[12px] text-warning-dark font-medium italic mt-2 border-l-2 border-warning/30 pl-3">
                                "{nna.detalleLugarPernocte}"
                            </div>
                        )}
                    </div>
                </div>
            </SectionCard>
        </div>
    );
};

// ─── Tab 4: Situación de Calle ────────────────────────────────────────────────

const TabIntervencion = ({ nna, caso }: { nna: any; caso: any }) => {
    return (
        <div className="space-y-5">
            {/* Perfil F03 */}
            <SectionCard title="Perfil de Ingreso y Situación de Calle" icon={Activity} color="info">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-y-6 gap-x-8">
                    <InfoRow label="Perfil Identificado" value={fmt(caso?.perfil)} highlight />
                    <InfoRow label="Situación de Calle" value={fmt(caso?.situacionCalle)} highlight />
                    <InfoRow label="Tiempo en Calle" value={caso?.tiempoEnCalle} />
                    
                    <InfoRow label="Actividad Realizada" value={caso?.actividadRealizada} />
                    <InfoRow label="Condición" value={
                        caso?.condicion === 'SOLO' ? 'Solo' :
                        caso?.condicion === 'PARES' ? 'Acompañado de Pares' :
                        caso?.condicion === 'FAMILIA' ? 'Acompañado de Familiar' :
                        fmt(caso?.condicion)
                    } />
                    <InfoRow label="Días de Trabajo" value={caso?.diasTrabajo} />
                    <InfoRow label="Antecedente Institucional" value={caso?.antecedenteInstitucional} />
                    
                    <InfoRow label="Distrito de Abordaje" value={caso?.distritoIntervencion} />
                    <InfoRow label="Zona Específica" value={caso?.zonaIntervencion} />
                    <InfoRow label="Horarios" value={
                        [
                            caso?.horarioInicio && `${caso.horarioInicio}-${caso.horarioFin}`,
                            caso?.horarioInicio2 && `${caso.horarioInicio2}-${caso.horarioFin2}`
                        ].filter(Boolean).join(' / ') || null
                    } />
                </div>
            </SectionCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Fechas */}
                <SectionCard title="Hitos y Tiempos del Proceso" icon={Clock}>
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 p-3 rounded-xl bg-surface-muted/50 border border-border">
                            <div className="w-10 h-10 rounded-lg bg-info-soft text-info flex items-center justify-center font-bold">1</div>
                            <InfoRow label="Primer Abordaje" value={caso?.fechaAbordaje ? new Date(caso.fechaAbordaje).toLocaleDateString('es-PE', { day:'2-digit', month:'long', year:'numeric' }) : 'No registrada'} highlight />
                        </div>
                        <div className="flex items-center gap-4 p-3 rounded-xl bg-surface-muted/50 border border-border">
                            <div className="w-10 h-10 rounded-lg bg-success-soft text-success flex items-center justify-center font-bold">2</div>
                            <InfoRow label="Ingreso al Servicio" value={caso?.fechaIngreso ? new Date(caso.fechaIngreso).toLocaleDateString('es-PE', { day:'2-digit', month:'long', year:'numeric' }) : 'Pendiente'} highlight />
                        </div>
                        <div className="flex items-center gap-4 p-3 rounded-xl bg-surface-muted/50 border border-border">
                            <div className="w-10 h-10 rounded-lg bg-primary-soft text-primary flex items-center justify-center font-bold">3</div>
                            <InfoRow label="Apertura de Expediente" value={caso?.fechaApertura ? new Date(caso.fechaApertura).toLocaleDateString('es-PE', { day:'2-digit', month:'long', year:'numeric' }) : 'Pendiente'} highlight />
                        </div>
                    </div>
                </SectionCard>

                {/* Gestión */}
                <SectionCard title="Asignación y Estado" icon={Shield}>
                    <div className="space-y-5">
                        <InfoRow label="Sede de Atención" value={nna.sede?.nombre || 'Sede Central'} />
                        <InfoRow label="Profesional Responsable Actual" value={caso?.responsableNombre} highlight icon={User} />
                        <div className="pt-4 border-t border-border">
                            <p className="text-[10px] font-black uppercase tracking-widest text-fg-muted mb-2">Estado del Expediente</p>
                            <div className="flex items-center gap-3">
                                {estadoBadge(caso?.estado)}
                                <span className="text-[13px] font-bold text-fg-2">Fase {caso?.fase || 'I'}</span>
                            </div>
                        </div>
                    </div>
                </SectionCard>
            </div>
        </div>
    );
};

// ─── Componente Principal ─────────────────────────────────────────────────────

export const ResumenCaso = ({ nna, caso, familia }: ResumenCasoProps) => {
    const [activeTab, setActiveTab] = useState('atendidos');

    return (
        <div className="space-y-6">
            {/* Header Profesional */}
            <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <Users size={120} />
                </div>

                <div className="flex flex-col md:flex-row gap-6 relative z-10">
                    {/* Foto o Avatar */}
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-primary-soft border-4 border-surface shadow-xl flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {nna.fotoUrl ? (
                            <img src={nna.fotoUrl} alt={nna.nombres} className="w-full h-full object-cover" />
                        ) : (
                            <User size={48} className="text-primary" />
                        )}
                    </div>

                    <div className="flex-1 flex flex-col justify-center">
                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-2">
                            <h1 className="text-2xl md:text-3xl font-black text-fg tracking-tight uppercase">
                                {nna.nombres} {nna.apellidoPaterno} {nna.apellidoMaterno || ''}
                            </h1>
                            <div className="flex items-center gap-2">
                                {estadoBadge(caso?.estado)}
                                {caso?.nivelRiesgo && (
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter border ${
                                        caso.nivelRiesgo === 'ALTO' ? 'bg-danger-soft text-danger border-danger/20' : 
                                        caso.nivelRiesgo === 'MEDIO' ? 'bg-warning-soft text-warning border-warning/20' : 
                                        'bg-success-soft text-success border-success/20'
                                    }`}>
                                        Riesgo {caso.nivelRiesgo}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-2 gap-x-6">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-fg-muted uppercase tracking-widest">Expediente</span>
                                <span className="text-[14px] font-mono font-bold text-fg">{nna.carpeta?.codigo || '—'}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-fg-muted uppercase tracking-widest">Documento</span>
                                <span className="text-[14px] font-bold text-fg">
                                    {nna.numeroDoc ? `${TIPO_DOC_MAP[nna.tipoDoc] || nna.tipoDoc || 'DNI'}: ${nna.numeroDoc}` : 'S/D'}
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-fg-muted uppercase tracking-widest">Edad</span>
                                <span className="text-[14px] font-bold text-fg">{calcEdad(nna.fechaNacimiento)}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-fg-muted uppercase tracking-widest">Fase Actual</span>
                                <span className="text-[14px] font-black text-primary uppercase">Fase {caso?.fase || 'I'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs de Navegación */}
            <div className="flex gap-1 bg-surface-muted p-1 rounded-2xl border border-border sticky top-4 z-20 shadow-sm">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-bold transition-all ${isActive
                                ? 'bg-surface text-primary shadow-md border border-primary/10'
                                : 'text-fg-muted hover:text-fg hover:bg-surface/50'
                                }`}
                        >
                            <Icon size={16} />
                            <span className="hidden md:inline">{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Contenido Dinámico */}
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeTab === 'atendidos' && (
                    <TabAtendidos nnaActual={nna} familia={familia} />
                )}
                {activeTab === 'perfil' && (
                    <TabPerfil nna={nna} />
                )}
                {activeTab === 'familiar' && (
                    <TabFamiliar nna={nna} />
                )}
                {activeTab === 'intervencion' && (
                    <TabIntervencion nna={nna} caso={caso} />
                )}
                {activeTab === 'expediente' && (
                    <ExpedienteDigitalDocs nna={nna} caso={caso} />
                )}
            </div>
        </div>
    );
};
