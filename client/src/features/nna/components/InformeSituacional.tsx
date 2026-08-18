import { getToken } from '../../../utils/auth';
import { confirmar } from '../../../components/ui/ConfirmDialog';
import { toast } from '../../../components/ui/Toast';
import { useState, useEffect } from 'react';
import {
    Save, CheckCircle2 as CheckIcon, ClipboardList, MapPin, Users,
    FileSignature, PenLine, AlertTriangle, Target, Lock,
} from 'lucide-react';
import { EXPEDIENTE_API_URL } from '../../../config/api';
import { formatTipoDoc } from '../../../data/ubigeo';
import { useNnaStore } from '../../../store/nna.store';
import { SEXO_MAP, gradoInstruccion, lugarNacimiento } from '../../../data/catalogos-sec';
import { CampoDictado } from '../../../components/ui/CampoDictado';
import {
    TIPOS_INSTITUCION, institucionesPorTipo, fraseDerivacion,
    etiquetaInstitucion, detalleInstitucion, insigniaInstitucion, buscarInstitucion,
} from '../../../data/instituciones-derivacion';
import { ComboBusqueda } from '../../../components/ui/ComboBusqueda';

/**
 * Informe Situacional — estructura del modelo oficial que usan los educadores
 * (informe de los hermanos Ruiz Culqui, 8 secciones en números romanos).
 *
 * Dos cosas lo diferencian del resto de fichas:
 *
 * 1. **Cubre a varios NNA.** "Cuando son hermanos, se hace un solo informe de
 *    todos los hermanos" (Luis). Los expedientes siguen siendo individuales;
 *    lo compartido es este documento. La selección la hace el educador, porque
 *    si los hermanos se inscribieron en momentos distintos el informe va
 *    separado (Mari).
 *
 * 2. **La sección I no se escribe.** Sale de los mismos datos que alimentan el
 *    Resumen del Caso. En el modelo la educadora reescribe a mano el nombre y
 *    la edad de los cinco hermanos en seis párrafos distintos, con el riesgo
 *    de que una edad quede vieja.
 */

const MESES_FASE: Record<number, number> = { 1: 3, 2: 15, 3: 6 };

interface InformeSituacionalProps {
    nna: any;
    caso: any;
    /** Todos los NNA de la carpeta. Es la misma lista que usa el Resumen del Caso. */
    familia?: any[];
    onClose: () => void;
}

const edadDe = (nna: any): string => {
    if (!nna?.fechaNacimiento) return '---';
    const hoy = new Date();
    const nac = new Date(nna.fechaNacimiento);
    let anios = hoy.getFullYear() - nac.getFullYear();
    if (hoy.getMonth() < nac.getMonth() || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) {
        anios--;
    }
    return `${anios} años`;
};

const fechaLarga = (iso: any): string => {
    if (!iso) return '---';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '---';
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
};

/** "los hermanos Kiara (16), Carlos (14) y Liam (3) Ruiz Culqui" */
const frasehermanos = (seleccionados: any[]): string => {
    if (!seleccionados.length) return '';
    const nombres = seleccionados.map(n => `${n.nombres} (${(edadDe(n).split(' ')[0])})`);
    const apellidos = `${seleccionados[0].apellidoPaterno} ${seleccionados[0].apellidoMaterno || ''}`.trim();
    if (nombres.length === 1) return `${nombres[0]} ${apellidos}`;
    const ultimo = nombres.pop();
    return `los hermanos ${nombres.join(', ')} y ${ultimo} ${apellidos}`;
};

const Seccion = ({ icon: Icon, titulo, ayuda, children }: any) => (
    <div className="bg-surface border border-border rounded-[8px] overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-surface-muted flex items-center gap-2">
            <Icon size={14} className="text-fg-muted" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-fg-muted">{titulo}</span>
        </div>
        <div className="p-4">
            {ayuda && <p className="text-[11px] text-fg-muted italic mb-2">{ayuda}</p>}
            {children}
        </div>
    </div>
);

const Campo = ({ label, valor }: { label: string; valor: any }) => (
    <div>
        <label className="text-[11px] font-medium text-fg-muted block mb-1">{label}</label>
        <div className="text-[13px] font-semibold text-fg px-3 py-2 bg-surface-muted border border-border rounded-[6px]">
            {valor || '---'}
        </div>
    </div>
);

export const InformeSituacional = ({ nna, caso, familia, onClose }: InformeSituacionalProps) => {
    const [isSaving, setIsSaving] = useState(false);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [estadoActual, setEstadoActual] = useState<string>('BORRADOR');
    const [codigoInforme, setCodigoInforme] = useState<string>('');
    const [informeId, setInformeId] = useState<number | null>(null);

    // Candidatos: todos los NNA de la carpeta. Si no llega la lista, al menos
    // el NNA en curso, para que el informe nunca quede sin nadie.
    const candidatos: any[] = (familia && familia.length ? familia : [nna]).filter(Boolean);
    const [nnaIds, setNnaIds] = useState<number[]>([nna.id]);
    const seleccionados = candidatos.filter(c => nnaIds.includes(c.id));

    const [formData, setFormData] = useState({
        fechaInforme:       new Date().toISOString().split('T')[0],
        destinatario:       'COORDINACIÓN DEL SERVICIO DE EDUCADORES DE CALLE',
        asunto:             `INFORME SITUACIONAL DEL NNA ${nna.nombres} ${nna.apellidoPaterno}`.toUpperCase(),
        antecedentes:       '',
        estrategias:        '',   // III. Acciones realizadas
        situacionFamiliar:  '',   // IV
        indicadores:        '',   // V
        piiFase1:           '',   // VI
        piiFase2:           '',
        piiFase3:           '',
        conclusiones:       '',   // VII. Apreciación profesional
        recomendaciones:    '',   // VIII
        // Derivación institucional (VIII). Todo informe se deriva: no hay un
        // "¿requiere derivar?" porque en la reunión quedó que llegan todos.
        tipoInstitucion:    '',   // DEMUNA | UPE
        institucionCodigo:  '',
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
            setInformeId(data.id ?? null);
            if (Array.isArray(data.nna_ids) && data.nna_ids.length) setNnaIds(data.nna_ids);
            setFormData({
                fechaInforme: data.fecha_informe || new Date().toISOString().split('T')[0],
                destinatario: data.destinatario || 'COORDINACIÓN DEL SERVICIO DE EDUCADORES DE CALLE',
                asunto: data.asunto || `INFORME SITUACIONAL DEL NNA ${nna.nombres} ${nna.apellidoPaterno}`.toUpperCase(),
                antecedentes: data.antecedentes || '',
                estrategias: data.estrategias || '',
                // Los informes anteriores partían la situación en tres campos.
                // Al abrirlos se juntan en el texto único que pide el modelo.
                situacionFamiliar: [data.situacion_familiar, data.situacion_salud, data.situacion_educativa]
                    .filter(Boolean).join('\n\n'),
                indicadores: data.indicadores_vulnerab || '',
                piiFase1: data.pii_fase1 || '',
                piiFase2: data.pii_fase2 || '',
                piiFase3: data.pii_fase3 || '',
                conclusiones: data.conclusiones || '',
                recomendaciones: data.recomendaciones || '',
                tipoInstitucion: data.tipo_institucion || '',
                institucionCodigo: data.institucion_codigo || '',
            });
        })
        .catch(err => console.log(err.message));
    }, [caso?.id, nna]);

    const bloqueado = estadoActual === 'FINALIZADO';

    // Opciones del combo de derivación. El filtrado por texto lo hace el
    // propio ComboBusqueda; aquí solo se traduce el catálogo a su formato.
    // Nombre oficial arriba; debajo, la ubicación y —en DEMUNAs— si está
    // acreditada. En las UPEs, debajo va la dirección de la sede.
    const opcionesInstitucion = institucionesPorTipo(formData.tipoInstitucion as any)
        .map(i => ({
            valor: i.codigo,
            etiqueta: etiquetaInstitucion(i),
            detalle: detalleInstitucion(i),
            insignia: insigniaInstitucion(i),
        }));

    const up = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setFormData(prev => ({ ...prev, [key]: e.target.value }));

    /** Igual que `up`, pero recibe el valor ya listo (lo usan los campos con formato). */
    const setCampo = (key: string) => (valor: string) =>
        setFormData(prev => ({ ...prev, [key]: valor }));

    const toggleNna = (id: number) => {
        if (bloqueado) return;
        setNnaIds(prev => {
            if (prev.includes(id)) {
                // El informe no puede quedarse sin nadie.
                return prev.length === 1 ? prev : prev.filter(x => x !== id);
            }
            return [...prev, id];
        });
    };

    const buildBody = (estado: string) => ({
        id: informeId,
        fecha_informe: formData.fechaInforme,
        destinatario: formData.destinatario,
        asunto: formData.asunto,
        antecedentes: formData.antecedentes,
        estrategias: formData.estrategias,
        situacion_familiar: formData.situacionFamiliar,
        indicadores_vulnerab: formData.indicadores,
        pii_fase1: formData.piiFase1,
        pii_fase2: formData.piiFase2,
        pii_fase3: formData.piiFase3,
        conclusiones: formData.conclusiones,
        recomendaciones: formData.recomendaciones,
        tipo_institucion: formData.tipoInstitucion || null,
        institucion_codigo: formData.institucionCodigo || null,
        nna_ids: nnaIds,
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

    const aplicarRespuesta = (data: any) => {
        if (!data) return;
        if (data.codigo_informe) setCodigoInforme(data.codigo_informe);
        if (data.id) setInformeId(data.id);
    };

    const handleSaveBorrador = async () => {
        if (!caso?.id) { toast.error('No existe un caso activo para este NNA'); return; }
        setIsSaving(true);
        try {
            aplicarRespuesta(await saveToApi('BORRADOR'));
            setEstadoActual('BORRADOR');
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
        const cuantos = seleccionados.length;
        const detalle = cuantos > 1
            ? `El informe cubre a ${cuantos} NNA y se archivará en el expediente de cada uno. `
            : '';
        if (!(await confirmar(`${detalle}El informe se registrará en el Expediente Digital y no podrá editarse.`,
            { titulo: 'Finalizar informe situacional', textoConfirmar: 'Finalizar' }))) return;
        setIsFinalizing(true);
        try {
            aplicarRespuesta(await saveToApi('FINALIZADO'));
            setEstadoActual('FINALIZADO');
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

    const areaClass = `w-full text-[13px] px-3 py-2 border border-border-strong rounded-[6px] text-fg outline-none resize-vertical focus:border-primary focus:ring-1 focus:ring-primary ${bloqueado ? 'bg-surface-muted cursor-default' : 'bg-surface'}`;

    return (
        <div className="bg-bg flex flex-col gap-3">

            {/* ── I. Datos generales ── */}
            <div className="bg-surface border border-border rounded-[8px] overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-surface-muted flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <ClipboardList size={14} className="text-fg-muted" />
                        <span className="text-[11px] font-bold uppercase tracking-widest text-fg-muted">
                            I. Datos Generales de la Niña, Niño o Adolescente
                        </span>
                    </div>
                    {codigoInforme && (
                        <span className="text-[12px] font-bold text-primary bg-primary-soft border border-primary/20 px-2.5 py-1 rounded-[6px]">
                            {codigoInforme}
                        </span>
                    )}
                </div>

                <div className="p-4 flex flex-col gap-4">
                    {/* Selector de hermanos */}
                    {candidatos.length > 1 && (
                        <div className="bg-primary-soft/40 border border-primary/20 rounded-[8px] p-3">
                            <p className="text-[11px] font-bold text-fg-2 uppercase mb-1">¿A quiénes cubre este informe?</p>
                            <p className="text-[11px] text-fg-muted mb-2.5">
                                Cuando son hermanos se hace un solo informe. Si se inscribieron en
                                momentos y situaciones distintas, conviene hacerlos por separado.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {candidatos.map(c => {
                                    const activo = nnaIds.includes(c.id);
                                    return (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => toggleNna(c.id)}
                                            disabled={bloqueado}
                                            className={`px-3 py-1.5 rounded-[6px] text-[12px] font-semibold border transition-all ${
                                                activo
                                                    ? 'bg-primary text-white border-primary'
                                                    : 'bg-surface text-fg-2 border-border hover:bg-surface-muted'
                                            } ${bloqueado ? 'cursor-default' : ''}`}
                                        >
                                            {c.nombres} · {edadDe(c)}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Un bloque por NNA, como en el modelo */}
                    {seleccionados.map(n => (
                        <div key={n.id} className="border border-border rounded-[8px] p-3">
                            <p className="text-[13px] font-bold text-fg uppercase mb-2.5">
                                {n.nombres} {n.apellidoPaterno} {n.apellidoMaterno}
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <Campo label="Edad" valor={edadDe(n)} />
                                <Campo label="Lugar de Nacimiento" valor={lugarNacimiento(n)} />
                                <Campo label="Fecha de Nacimiento" valor={fechaLarga(n.fechaNacimiento)} />
                                <Campo label="Documento de Identificación" valor={n.numeroDoc ? `${formatTipoDoc(n.tipoDoc)} ${n.numeroDoc}` : 'S/D'} />
                                <Campo label="Grado de Instrucción" valor={gradoInstruccion(n)} />
                                <Campo label="Sexo" valor={SEXO_MAP[String(n.sexo)] || n.sexo} />
                            </div>
                        </div>
                    ))}

                    {/* Datos comunes de la familia */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <Campo label="Perfil del NNA" valor={caso?.perfil} />
                        <Campo label="Dirección" valor={nna.domicilioActual} />
                        <Campo label="Referencia" valor={nna.referenciaDomicilio} />
                        <Campo label="Referente Familiar de Contacto" valor={nna.nombreTutor} />
                        <Campo label="Teléfono" valor={nna.telefonoContacto || 'No cuentan con teléfono'} />
                        <Campo label="Carpeta" valor={nna.carpeta?.codigo} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[11px] font-medium text-fg-muted block mb-1">Dirigido a</label>
                            <input type="text" value={formData.destinatario} onChange={up('destinatario')} disabled={bloqueado}
                                className={`w-full text-[13px] px-3 py-2 border border-border-strong rounded-[6px] text-fg outline-none focus:border-primary focus:ring-1 focus:ring-primary ${bloqueado ? 'bg-surface-muted cursor-default' : 'bg-surface'}`} />
                        </div>
                        <div>
                            <label className="text-[11px] font-medium text-fg-muted block mb-1">Fecha del Informe</label>
                            <input type="date" value={formData.fechaInforme} onChange={up('fechaInforme')} disabled={bloqueado}
                                className={`w-full text-[13px] px-3 py-2 border border-border-strong rounded-[6px] text-fg outline-none focus:border-primary focus:ring-1 focus:ring-primary ${bloqueado ? 'bg-surface-muted cursor-default' : 'bg-surface'}`} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── II. Antecedentes ── */}
            <Seccion icon={MapPin} titulo="II. Antecedentes del Caso"
                ayuda="¿En qué circunstancias y condiciones se encontró al NNA? ¿Cómo llegó al servicio y cuándo se inscribió?">
                <CampoDictado label="" value={formData.antecedentes} onChange={setCampo('antecedentes')}
                    rows={5} disabled={bloqueado}
                    placeholder="Redacte aquí las circunstancias del contacto inicial y la inscripción..." />
            </Seccion>

            {/* ── III. Acciones realizadas ── */}
            <Seccion icon={Users} titulo="III. Acciones Realizadas"
                ayuda="Estrategias de acercamiento, visitas domiciliarias, orientaciones, consejerías, coordinaciones.">
                <CampoDictado label="" value={formData.estrategias} onChange={setCampo('estrategias')}
                    rows={5} disabled={bloqueado}
                    placeholder="Detalle las acciones desarrolladas con el NNA y su familia..." />
            </Seccion>

            {/* ── IV. Situación familiar ── */}
            <Seccion icon={FileSignature} titulo="IV. Situación Familiar"
                ayuda="Composición y dinámica familiar, situación económica, vivienda, salud y educación de los NNA.">
                <CampoDictado label="" value={formData.situacionFamiliar} onChange={setCampo('situacionFamiliar')}
                    rows={10} disabled={bloqueado}
                    placeholder="Describa la situación a nivel personal, familiar y social..." />
            </Seccion>

            {/* ── V. Indicadores de vulnerabilidad ── */}
            <Seccion icon={AlertTriangle} titulo="V. Indicadores de Vulnerabilidad"
                ayuda="Un factor por línea o con el botón de viñetas. Se imprimen como viñetas en el informe.">
                <CampoDictado label="" value={formData.indicadores} onChange={setCampo('indicadores')}
                    rows={6} disabled={bloqueado}
                    placeholder="Familia nuclear con recursos económicos muy limitados" />
            </Seccion>

            {/* ── VI. Plan de Intervención Individual ── */}
            <div className="bg-surface border border-border rounded-[8px] overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-surface-muted flex items-center gap-2">
                    <Target size={14} className="text-fg-muted" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-fg-muted">
                        VI. Plan de Intervención Individual
                    </span>
                </div>
                <div className="p-4 flex flex-col gap-4">
                    <p className="text-[11px] text-fg-muted italic">
                        El PII va dentro del informe. Por cada fase, los objetivos y actividades
                        previstas — un objetivo por línea. Los plazos son referenciales.
                    </p>
                    {([1, 2, 3] as const).map(fase => (
                        <div key={fase}>
                            <label className="text-[12px] font-bold text-fg-2 block mb-1">
                                Fase {fase} <span className="font-normal text-fg-muted">({MESES_FASE[fase]} meses)</span>
                            </label>
                            <CampoDictado
                                label=""
                                value={formData[`piiFase${fase}` as keyof typeof formData] as string}
                                onChange={setCampo(`piiFase${fase}`)}
                                rows={4}
                                disabled={bloqueado}
                                placeholder={`Objetivos y actividades de la Fase ${fase}...`}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* ── VII. Apreciación profesional ── */}
            <Seccion icon={PenLine} titulo="VII. Apreciación Profesional"
                ayuda="Valoración del educador sobre la familia, su disposición al cambio y los avances observados.">
                <CampoDictado label="" value={formData.conclusiones} onChange={setCampo('conclusiones')}
                    rows={6} disabled={bloqueado}
                    placeholder="Redacte su apreciación profesional del caso..." />
            </Seccion>

            {/* ── VIII. Recomendación ── */}
            <Seccion icon={CheckIcon} titulo="VIII. Recomendación"
                ayuda="A quién se informa y qué se recomienda: continuar en el servicio, derivar o egresar.">
                <CampoDictado label="" value={formData.recomendaciones} onChange={setCampo('recomendaciones')}
                    rows={5} disabled={bloqueado}
                    placeholder="Se informa a... y se recomienda..." />

                {/* Derivación institucional.
                    Va aquí, al final y dentro de Recomendación, porque es donde
                    los educadores lo escriben en su documento real. Luis, en la
                    reunión del 11/08/2026: "eso normalmente lo ponemos en el
                    informe al final, en recomendaciones".

                    Y resuelve el olvido que describió María del Carmen: "en la
                    última parte ahí dice: se deriva a la DEMUNA tal. Si no lo
                    colocamos, urgente nos llaman: ¿a qué DEMUNA?". */}
                <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-[11px] font-semibold text-fg-muted uppercase mb-2">
                        Derivación institucional
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="text-[11px] font-medium text-fg-muted block mb-1">
                                Institución
                            </label>
                            <select
                                value={formData.tipoInstitucion}
                                disabled={bloqueado}
                                onChange={e => {
                                    setFormData(p => ({
                                        ...p,
                                        tipoInstitucion: e.target.value,
                                        // Al cambiar de tipo se limpia la específica:
                                        // dejar una UPE seleccionada bajo "DEMUNA"
                                        // guardaría un destino que no existe.
                                        institucionCodigo: '',
                                    }));
                                }}
                                className={`w-full text-[13px] px-3 py-2 border border-border-strong rounded-[6px] text-fg outline-none focus:border-primary ${bloqueado ? 'bg-surface-muted cursor-default' : 'bg-surface cursor-pointer'}`}
                            >
                                <option value="">Seleccione…</option>
                                {TIPOS_INSTITUCION.map(t => (
                                    <option key={t.valor} value={t.valor}>
                                        {t.etiqueta} — {t.descripcion}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-[11px] font-medium text-fg-muted block mb-1">
                                {formData.tipoInstitucion === 'UPE' ? 'UPE específica' : 'DEMUNA específica'}
                            </label>
                            {/* Combo con búsqueda: son 844 DEMUNAs acreditadas y
                                el educador conoce su distrito, no la posición en
                                la lista. Escribe y se filtra solo. */}
                            <ComboBusqueda
                                opciones={opcionesInstitucion}
                                value={formData.institucionCodigo}
                                onChange={valor => setFormData(p => ({ ...p, institucionCodigo: valor }))}
                                disabled={bloqueado || !formData.tipoInstitucion}
                                placeholder={
                                    formData.tipoInstitucion === 'DEMUNA' ? 'Escriba el distrito o la provincia…'
                                    : formData.tipoInstitucion === 'UPE'  ? 'Escriba la región…'
                                    : 'Elija primero el tipo'
                                }
                                sinResultados="Ninguna coincide con ese texto"
                            />
                        </div>
                    </div>

                    {formData.institucionCodigo && (
                        <p className="text-[12px] text-fg-secondary mt-2.5 italic">
                            {fraseDerivacion(formData.institucionCodigo)}
                            <span className="not-italic text-fg-muted"> — se agrega al informe.</span>
                        </p>
                    )}

                    {/* Aviso, no bloqueo: la no acreditada puede ser la que
                        corresponde por zona y el educador decide. Solo se le
                        recuerda que los casos de riesgo van a las acreditadas. */}
                    {formData.institucionCodigo &&
                     buscarInstitucion(formData.institucionCodigo)?.tipo === 'DEMUNA' &&
                     buscarInstitucion(formData.institucionCodigo)?.acreditada === false && (
                        <p className="text-[12px] text-warning mt-1.5">
                            Esta DEMUNA no cuenta con acreditación vigente. Los casos de riesgo
                            de desprotección deben derivarse a una DEMUNA acreditada.
                        </p>
                    )}
                    {/* Respiro al final de la ficha: sin él, la lista del combo
                        se abre pegada al borde del panel y queda cortada. */}
                    <div className="h-2" />
                </div>
            </Seccion>

            {/* ── Barra de acciones ── */}
            <div className="bg-surface border border-border rounded-[8px] p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="text-[12px] text-fg-muted">
                    {bloqueado ? (
                        <span className="flex items-center gap-1.5 text-success font-semibold">
                            <Lock size={13} /> Informe finalizado y archivado en el Expediente Digital.
                        </span>
                    ) : (
                        <>Cubre a <b className="text-fg">{seleccionados.length}</b> {seleccionados.length === 1 ? 'NNA' : 'NNA'}
                        {seleccionados.length > 1 && <> — {frasehermanos(seleccionados)}</>}</>
                    )}
                </div>
                {!bloqueado && (
                    <div className="flex gap-2">
                        <button onClick={handleSaveBorrador} disabled={isSaving || isFinalizing}
                            className="flex items-center gap-2 px-4 py-2 rounded-[6px] text-[13px] font-bold border border-border text-fg-2 hover:bg-surface-muted disabled:opacity-60">
                            <Save size={14} /> {isSaving ? 'Guardando…' : 'Guardar borrador'}
                        </button>
                        <button onClick={handleFinalizar} disabled={isSaving || isFinalizing}
                            className="flex items-center gap-2 px-4 py-2 rounded-[6px] text-[13px] font-bold bg-primary text-white hover:bg-primary/90 disabled:opacity-60">
                            <CheckIcon size={14} /> {isFinalizing ? 'Finalizando…' : 'Finalizar informe'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
