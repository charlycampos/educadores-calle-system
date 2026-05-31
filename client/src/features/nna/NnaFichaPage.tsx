import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useNnaStore } from '../../store/nna.store';
import { Printer, ArrowLeft, Send } from 'lucide-react';
import { Formato3Print } from './components/Formato3Print';
import { DerivacionModal } from './components/DerivacionModal';

interface NnaFichaPageProps {
    embed?: boolean;
}

export const NnaFichaPage = ({ embed = false }: NnaFichaPageProps) => {
    const { id } = useParams();
    const { selectedExpediente, isLoading, fetchExpediente } = useNnaStore();
    const [isDerivacionOpen, setIsDerivacionOpen] = useState(false);

    useEffect(() => {
        if (id && (!selectedExpediente || selectedExpediente.length === 0)) {
            fetchExpediente(Number(id));
        }
    }, [id, fetchExpediente, selectedExpediente]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64 bg-bg">
                <div className="animate-pulse flex flex-col items-center gap-3">
                    <div className="h-10 w-10 bg-border rounded-full"></div>
                    <div className="h-3 w-40 bg-border rounded"></div>
                </div>
            </div>
        );
    }

    if (!selectedExpediente || selectedExpediente.length === 0) {
        return (
            <div className="p-8 text-center text-danger text-[13px]">
                No se encontró el expediente.
            </div>
        );
    }

    const mainNna = selectedExpediente[0];
    const carpetaCode = mainNna.carpeta?.codigo || '---';
    const activeCase = mainNna.casos?.find((c: any) => c.estado !== 'CERRADO');

    const handleDerivar = () => {
        if (!activeCase) {
            alert('No hay un caso activo para derivar.');
            return;
        }
        setIsDerivacionOpen(true);
    };

    return (
        <div className={`bg-bg print:bg-white ${embed ? '' : 'min-h-screen p-6'} print:p-0`}>

            {/* Toolbar — solo vista independiente */}
            {!embed && (
                <div className="max-w-4xl mx-auto mb-5 flex items-center justify-between print:hidden">
                    <Link
                        to="/nna"
                        className="flex items-center gap-2 text-fg-muted hover:text-fg text-[13px] font-medium px-3 py-2 rounded-[6px] hover:bg-surface border border-transparent hover:border-border transition-all"
                    >
                        <ArrowLeft size={16} /> Cerrar / Volver
                    </Link>
                    <div className="flex gap-2">
                        {activeCase && (
                            <button
                                onClick={handleDerivar}
                                className="flex items-center gap-1.5 bg-warning text-white px-4 py-2 rounded-[6px] text-[13px] font-medium hover:opacity-90 transition-opacity"
                            >
                                <Send size={15} /> Derivar Caso
                            </button>
                        )}
                        <button
                            onClick={() => window.print()}
                            className="flex items-center gap-1.5 bg-primary text-primary-fg px-4 py-2 rounded-[6px] text-[13px] font-medium hover:bg-primary/90 transition-colors"
                        >
                            <Printer size={15} /> Imprimir F03
                        </button>
                    </div>
                </div>
            )}

            {/* Formato impresión (solo al imprimir) */}
            <Formato3Print nna={mainNna} expediente={selectedExpediente} caso={activeCase} />

            {/* Vista Web */}
            <div className="max-w-[210mm] mx-auto bg-surface border border-border rounded-[8px] shadow-2 min-h-[297mm] p-10 print:hidden">

                {/* Encabezado */}
                <div className="border-b-2 border-fg pb-5 mb-8 flex justify-between items-start">
                    <div>
                        <h1 className="text-[20px] font-bold text-fg uppercase tracking-tight">
                            Ficha de Inscripción
                        </h1>
                        <p className="text-[11px] font-semibold text-fg-muted uppercase mt-1 tracking-wide">
                            Servicio de Educadores de Calle · INABIF · Formato F03
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <div className="bg-surface-muted px-4 py-2 rounded-[6px] border border-border text-center w-40">
                            <p className="text-[10px] font-bold text-fg-muted uppercase tracking-wider">Expediente N°</p>
                            <p className="text-[16px] font-mono font-bold text-fg leading-tight">{carpetaCode}</p>
                        </div>
                        <div className="bg-primary-soft px-4 py-2 rounded-[6px] border border-primary/20 text-center w-40">
                            <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Ficha F03</p>
                            <p className="text-[16px] font-mono font-bold text-primary leading-tight">
                                {mainNna.codigoFicha03 || 'PENDIENTE'}
                            </p>
                        </div>
                        <p className="text-[10px] text-fg-muted">
                            Impreso: {new Date().toLocaleDateString('es-PE')}
                        </p>
                    </div>
                </div>

                <div className="space-y-8">

                    {/* I. DATOS GENERALES */}
                    <section>
                        <div className="pb-3 border-b border-border mb-5">
                            <h2 className="text-[15px] font-semibold text-fg">I. Datos Generales de la Intervención</h2>
                            <p className="text-[12px] text-fg-2 mt-0.5">Ubicación, perfil identificado y marco temporal del caso.</p>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-5 text-[13px]">
                            <Field label="Distrito de Intervención" value={activeCase?.zonaIntervencion || '---'} />
                            <Field label="Provincia / Región" value={`${mainNna.provinciaDom || '---'} / ${mainNna.departamentoDom || '---'}`} />
                            <Field label="Modalidad de Permanencia" value={activeCase?.situacionCalle?.replace(/_/g, ' ') || '---'} />
                        </div>

                        {/* Perfil */}
                        <div className="bg-surface-muted border border-border rounded-[8px] p-4 space-y-4">
                            <div className="flex justify-between items-start flex-wrap gap-4">
                                <div>
                                    <span className="text-[11px] font-semibold text-fg-muted uppercase tracking-wider block mb-2">
                                        Perfil del NNA:
                                    </span>
                                    <div className="flex gap-2 flex-wrap">
                                        {[
                                            { key: 'TRABAJO_EN_CALLE', label: 'Trabajo en Calle' },
                                            { key: 'MENDICIDAD', label: 'Mendicidad' },
                                            { key: 'VIDA_EN_CALLE', label: 'Vida en Calle' },
                                        ].map(p => (
                                            <span
                                                key={p.key}
                                                className={`px-3 py-1 rounded-[5px] text-[11px] font-bold border ${
                                                    activeCase?.perfil === p.key
                                                        ? 'bg-primary-soft text-primary border-primary/30'
                                                        : 'bg-surface text-fg-muted border-border'
                                                }`}
                                            >
                                                {p.label}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-[11px] font-semibold text-fg-muted uppercase tracking-wider block mb-2">
                                        ¿Víctima de Explotación Sexual?:
                                    </span>
                                    <span className={`px-3 py-1 rounded-[5px] text-[11px] font-bold border ${
                                        activeCase?.victimaExplotacion === 'SI' || activeCase?.victima_explotacion === 'SI'
                                            ? 'bg-red-50 text-red-600 border-red-200'
                                            : 'bg-green-50 text-green-600 border-green-200'
                                    }`}>
                                        {activeCase?.victimaExplotacion || activeCase?.victima_explotacion || 'NO'}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 pt-3 border-t border-border text-[13px]">
                                <Field label="Fecha Abordaje" value={activeCase?.fechaAbordaje ? new Date(activeCase.fechaAbordaje).toLocaleDateString('es-PE') : '---'} />
                                <Field label="Fecha Ingreso" value={activeCase?.fechaIngreso ? new Date(activeCase.fechaIngreso).toLocaleDateString('es-PE') : '---'} />
                                <Field label="Fecha Reingreso" value={activeCase?.fechaReingreso ? new Date(activeCase.fechaReingreso).toLocaleDateString('es-PE') : '---'} />
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border text-[13px]">
                                <Field label="Horario" value={`${activeCase?.horarioInicio || '--:--'} – ${activeCase?.horarioFin || '--:--'}${activeCase?.horarioInicio2 ? ` / ${activeCase.horarioInicio2} – ${activeCase.horarioFin2}` : ''}`} />
                                <Field label="Días de Actividad" value={activeCase?.diasTrabajo || '---'} />
                            </div>
                        </div>
                    </section>

                    {/* II–VIII: Por cada NNA de la carpeta */}
                    {selectedExpediente.map((nna: any, index: number) => (
                        <div key={nna.id} className="border border-border rounded-[8px] overflow-hidden">
                            {/* Header NNA */}
                            <div className="bg-surface-muted px-5 py-3 border-b border-border flex items-center gap-3">
                                <div className="bg-primary text-primary-fg w-7 h-7 rounded-full flex items-center justify-center font-bold text-[12px] flex-shrink-0">
                                    {index + 1}
                                </div>
                                <div>
                                    <h3 className="font-bold text-[15px] text-fg uppercase tracking-tight">
                                        {nna.apellidoPaterno} {nna.apellidoMaterno}, {nna.nombres}
                                    </h3>
                                    <span className="text-[11px] font-medium text-fg-muted uppercase">
                                        {index === 0 ? 'Beneficiario Principal' : 'Hermano / Grupo Familiar'}
                                    </span>
                                </div>
                            </div>

                            <div className="p-6 space-y-7">

                                {/* II. Datos Personales */}
                                <section>
                                    <SectionHeader label="II. Datos Personales del NNA" />
                                    <div className="grid grid-cols-4 gap-4 text-[13px]">
                                        <Field label="Fecha Nacimiento" value={nna.fechaNacimiento ? new Date(nna.fechaNacimiento).toLocaleDateString('es-PE') : '---'} />
                                        <Field label="Edad" value={nna.fechaNacimiento ? `${new Date().getFullYear() - new Date(nna.fechaNacimiento).getFullYear()} años` : '---'} />
                                        <Field label="Sexo / Nac." value={`${nna.sexo || '---'} / ${nna.nacionalidad || '---'}`} />
                                        <Field label="Lugar Nacimiento" value={nna.distritoNac || '---'} />
                                        <div className="col-span-2">
                                            <Field label="Domicilio Actual" value={nna.domicilioActual || '---'} />
                                        </div>
                                        <Field label="Documento ID" value={`${nna.tipoDoc}: ${nna.numeroDoc || 'SIN DOC'}`} highlight={!nna.numeroDoc} />
                                        <Field label="Partida Nacimiento" value={nna.tienePartidaNacimiento ? 'SÍ' : 'NO'} />
                                    </div>
                                </section>

                                {/* III. Datos Perfil */}
                                <section>
                                    <SectionHeader label="III. Datos Según Perfil (Entrevista)" />
                                    <div className="bg-surface-muted border border-border rounded-[6px] p-4 grid grid-cols-3 gap-4 text-[13px]">
                                        <div className="col-span-3 md:col-span-1">
                                            <Field label="Actividad Realizada" value={activeCase?.actividadRealizada || '---'} />
                                        </div>
                                        <Field label="Tiempo en Calle" value={activeCase?.tiempoEnCalle || '---'} />
                                        <Field label="Condición" value={activeCase?.condicion || '---'} />
                                        <div className="col-span-2">
                                            <Field label="Horario" value={`${activeCase?.horarioInicio || '--:--'} – ${activeCase?.horarioFin || '--:--'}`} />
                                        </div>
                                        <Field label="Días" value={activeCase?.diasTrabajo || '---'} />
                                    </div>
                                </section>

                                {/* IV. Educación */}
                                <section>
                                    <SectionHeader label="IV. Educación" />
                                    <div className="border border-border rounded-[6px] p-4 flex gap-6 text-[13px]">
                                        <div className="flex-shrink-0">
                                            <span className="text-[11px] font-semibold text-fg-muted uppercase block mb-1">¿Estudia?</span>
                                            <span className={`font-bold ${nna.estudiaActualmente ? 'text-success' : 'text-danger'}`}>
                                                {nna.estudiaActualmente ? 'SÍ' : 'NO'}
                                            </span>
                                        </div>
                                        <div className="flex-1">
                                            {nna.estudiaActualmente ? (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <Field label="Nivel / Grado" value={`${nna.nivelEducativo || '---'} – ${nna.gradoEstudio || '---'}`} />
                                                    <Field label="I.E. / Modalidad" value={`${nna.institucionEducativa || 'Sin nombre'} (${nna.modalidadEstudio || '---'})`} />
                                                </div>
                                            ) : (
                                                <Field label="Motivo de no estudio" value={nna.detalleNoEstudia || 'No especificado'} highlight />
                                            )}
                                        </div>
                                    </div>
                                </section>

                                {/* V. Salud */}
                                <section>
                                    <SectionHeader label="V. Salud" />
                                    <div className="grid grid-cols-2 gap-4 text-[13px]">
                                        <Field label="Afiliado SIS" value={nna.afiliadoSIS === 'SI' ? 'SÍ' : (nna.afiliadoSIS || 'NO')} />
                                        <Field label="Otro Seguro" value={nna.afiliadoOtroSeguro === 'SI' ? `SÍ (${nna.detalleOtroSeguro || ''})` : 'NO'} />
                                        <Field label="Discapacidad" value={nna.tieneDiscapacidad ? `SÍ — ${nna.tipoDiscapacidad || ''} ${nna.detalleDiscapacidad ? `(${nna.detalleDiscapacidad})` : ''}` : 'NO'} />
                                        <Field label="Enfermedad Actual" value={nna.sufreEnfermedad ? `SÍ: ${nna.detalleEnfermedad || ''}` : 'NO'} />
                                        <div className="col-span-2">
                                            <Field label="Observaciones de Salud" value={nna.observacionesSalud || '—'} muted />
                                        </div>
                                    </div>
                                </section>

                                {/* VI. Familia y Vivienda */}
                                <section>
                                    <SectionHeader label="VI. Familia y Vivienda" />
                                    <div className="bg-surface-muted border border-border rounded-[6px] p-4 grid grid-cols-2 gap-4 text-[13px]">
                                        <Field label="¿Con quién vive?" value={nna.viveCon === 'OTRO' ? `OTRO: ${nna.detalleViveCon || ''}` : (nna.viveCon?.replace(/_/g, ' ') || '---')} />
                                        <Field label="Lugar de Pernocte" value={nna.lugarPernocte === 'OTRO' ? `OTRO: ${nna.detalleLugarPernocte || ''}` : (nna.lugarPernocte?.replace(/_/g, ' ') || '---')} />
                                        <div className="col-span-2">
                                            <Field label="Responsable / Tutor" value={nna.nombreTutor || '---'} />
                                        </div>
                                        <div className="col-span-2">
                                            <Field
                                                label="Antecedente Institucional"
                                                value={nna.tieneAntecedenteAlbergue ? `SÍ — ${nna.detalleAntecedenteAlbergue || ''}` : 'NO'}
                                            />
                                        </div>
                                    </div>
                                </section>

                                {/* VII. Tiempo Libre */}
                                <section>
                                    <SectionHeader label="VII. Actividades de Tiempo Libre" />
                                    <p className="text-[13px] text-fg-2 bg-surface-muted border border-border rounded-[6px] p-3 min-h-[40px]">
                                        {nna.actividadesTiempoLibre || 'Sin datos registrados'}
                                    </p>
                                </section>

                                {/* VIII. Observaciones */}
                                <section>
                                    <SectionHeader label="VIII. Observaciones y Características" />
                                    <p className="text-[13px] text-fg-2 italic bg-warning-soft border border-warning/20 rounded-[6px] p-3 min-h-[40px]">
                                        "{nna.caracteristicas || 'Ninguna'}"
                                    </p>
                                </section>

                            </div>
                        </div>
                    ))}

                    {/* Firmas */}
                    <div className="pt-8 border-t border-border grid grid-cols-2 gap-16 text-center text-[13px]">
                        <div>
                            <div className="border-t border-fg w-3/4 mx-auto pt-2 mt-10"></div>
                            <p className="font-semibold text-fg">Responsable / Tutor</p>
                        </div>
                        <div>
                            <div className="border-t border-fg w-3/4 mx-auto pt-2 mt-10"></div>
                            <p className="font-semibold text-fg">Educador/a Responsable</p>
                            <p className="text-[11px] text-fg-muted mt-0.5">{activeCase?.responsable?.nombreCompleto}</p>
                        </div>
                    </div>

                </div>
            </div>

            {/* Modal Derivación */}
            {activeCase && (
                <DerivacionModal
                    isOpen={isDerivacionOpen}
                    onClose={() => { setIsDerivacionOpen(false); if (id) fetchExpediente(Number(id)); }}
                    nnaId={mainNna.id}
                    casoId={activeCase.id}
                    nnaName={`${mainNna.nombres} ${mainNna.apellidoPaterno} ${mainNna.apellidoMaterno}`}
                />
            )}
        </div>
    );
};

/* ── Sub-componentes ──────────────────────────────────────────── */

const SectionHeader = ({ label }: { label: string }) => (
    <h4 className="text-[11px] font-bold text-fg-muted uppercase tracking-widest border-b border-border pb-1.5 mb-3">
        {label}
    </h4>
);

const Field = ({
    label,
    value,
    highlight = false,
    muted = false,
}: {
    label: string;
    value: string;
    highlight?: boolean;
    muted?: boolean;
}) => (
    <div>
        <span className="text-[10px] font-semibold text-fg-muted uppercase tracking-wider block mb-0.5">
            {label}
        </span>
        <span className={`text-[13px] font-medium ${highlight ? 'text-danger' : muted ? 'text-fg-2' : 'text-fg'}`}>
            {value}
        </span>
    </div>
);
