import { useState, useEffect } from 'react';
import {
    CheckCircle2, FileText,
    ShieldCheck, Home, Flag, GraduationCap, X
} from 'lucide-react';
import { cerrarCaso, getInformeCierre } from '../../../api/casos.api';

interface InformeCierreProps {
    casoId: number;
    onClose?: () => void;
}

export const InformeCierre = ({ casoId, onClose }: InformeCierreProps) => {
    const [motivoEgreso, setMotivoEgreso] = useState<string>('');
    const [fechaEgreso, setFechaEgreso] = useState(new Date().toISOString().split('T')[0]);
    const [situacionEducativa, setSituacionEducativa] = useState<string>('ESTUDIANDO');
    const [situacionFamiliar, setSituacionFamiliar] = useState<string>('REINSERTADO');
    const [logrosAlcanzados, setLogrosAlcanzados] = useState('');
    const [recomendaciones, setRecomendaciones] = useState('');
    const [documentoAdjunto, setDocumentoAdjunto] = useState<string | null>(null);

    const [isSaved, setIsSaved] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isClosed, setIsClosed] = useState(false);

    useEffect(() => {
        if (casoId) {
            loadInforme();
        }
    }, [casoId]);

    const loadInforme = async () => {
        try {
            const data = await getInformeCierre(casoId);
            if (data) {
                setMotivoEgreso(data.motivoEgreso);
                setFechaEgreso(new Date(data.fechaEgreso).toISOString().split('T')[0]);
                setSituacionEducativa(data.situacionEducativa || '');
                setSituacionFamiliar(data.situacionFamiliar || '');
                setLogrosAlcanzados(data.logrosAlcanzados || '');
                setRecomendaciones(data.recomendaciones || '');
                setIsClosed(true); // Ya existe informe, asumimos cerrado
            }
        } catch (error) {
            // No existe informe, es nuevo cierre
            console.log("No existe informe previo, formulario de cierre habilitado.");
        }
    }

    const handleSave = async () => {
        if (!motivoEgreso) {
            alert("Debe seleccionar un motivo de egreso");
            return;
        }

        setIsLoading(true);
        try {
            await cerrarCaso(casoId, {
                motivoEgreso,
                fechaEgreso,
                situacionFamiliar,
                situacionEducativa,
                logrosAlcanzados,
                recomendaciones,
                archivoUrl: documentoAdjunto || undefined
            });
            setIsSaved(true);
            setIsClosed(true);
            // setTimeout(() => onClose && onClose(), 2000);
        } catch (error) {
            console.error(error);
            alert("Error al cerrar el caso");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className={`p-8 rounded-2xl text-white shadow-lg relative overflow-hidden transition-colors
                ${isClosed ? 'bg-gray-700' : 'bg-gradient-to-r from-green-600 to-emerald-600'}`}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-20 -mt-20"></div>
                <div className="relative z-10">
                    <h2 className="text-3xl font-black mb-2 flex items-center gap-3">
                        <Flag size={32} />
                        {isClosed ? 'Caso Cerrado / Egresado' : 'Informe de Cierre / Egreso'}
                    </h2>
                    <p className="text-green-100 max-w-xl text-lg">
                        {isClosed
                            ? 'Este caso ha sido finalizado correctamente. La información se encuentra en modo lectura.'
                            : 'Formalización de la culminación de la intervención debido al cumplimiento de objetivos o cambio de situación del NNA.'}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Columna Izquierda: Formulario Principal */}
                <div className="lg:col-span-2 space-y-6">

                    {/* 1. Motivo del Egreso */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <CheckCircle2 className="text-green-600" size={20} />
                            1. Motivo del Egreso
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { id: 'CUMPLIMIENTO_OBJETIVOS', label: 'Cumplimiento de Objetivos', desc: 'Se lograron las metas del PTI.', color: 'green' },
                                { id: 'MAYORIA_EDAD', label: 'Mayoría de Edad', desc: 'El NNA cumplió 18 años.', color: 'blue' },
                                { id: 'DERIVACION', label: 'Derivación Definitiva', desc: 'Traslado a CAR o UPE.', color: 'indigo' },
                                { id: 'DESERCION', label: 'Deserción Voluntaria', desc: 'Retiro voluntario o no ubicación.', color: 'red' }
                            ].map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => !isClosed && setMotivoEgreso(opt.id)}
                                    disabled={isClosed && motivoEgreso !== opt.id}
                                    className={`p-4 rounded-xl border-2 text-left transition-all 
                                        ${motivoEgreso === opt.id
                                            ? `border-${opt.color}-500 bg-${opt.color}-50 ring-2 ring-${opt.color}-100`
                                            : 'border-gray-100 hover:border-gray-300'}
                                        ${isClosed && motivoEgreso !== opt.id ? 'opacity-40 grayscale' : ''}
                                    `}
                                >
                                    <span className="block font-bold text-gray-900 mb-1">{opt.label}</span>
                                    <span className="text-xs text-gray-500">{opt.desc}</span>
                                </button>
                            ))}
                        </div>

                        <div className="mt-6">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Fecha de Egreso</label>
                            <input
                                type="date"
                                disabled={isClosed}
                                value={fechaEgreso}
                                onChange={(e) => setFechaEgreso(e.target.value)}
                                className="w-full md:w-auto p-3 bg-gray-50 rounded-xl border-none font-bold text-gray-700 disabled:opacity-70"
                            />
                        </div>
                    </div>

                    {/* 2. Situación Final */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <ShieldCheck className="text-blue-600" size={20} />
                            2. Situación Final del NNA
                        </h3>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                    <Home size={16} className="text-gray-400" /> Situación Familiar / Habitacional
                                </label>
                                <select
                                    disabled={isClosed}
                                    className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-70"
                                    value={situacionFamiliar}
                                    onChange={(e) => setSituacionFamiliar(e.target.value)}
                                >
                                    <option value="REINSERTADO">Reinsertado en su núcleo familiar</option>
                                    <option value="ACOGIDA">En familia acogedora / extensa</option>
                                    <option value="CAR">Internado en Centro de Acogida (CAR)</option>
                                    <option value="CALLE">Permanece en situación de calle</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                    <GraduationCap size={16} className="text-gray-400" /> Situación Educativa
                                </label>
                                <select
                                    disabled={isClosed}
                                    className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-70"
                                    value={situacionEducativa}
                                    onChange={(e) => setSituacionEducativa(e.target.value)}
                                >
                                    <option value="ESTUDIANDO">Asiste regularmente a I.E.</option>
                                    <option value="DESERCION">Desertó del sistema educativo</option>
                                    <option value="CULMINADO">Culminó Secundaria</option>
                                    <option value="TECNICO">Estudia carrera técnica/superior</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* 3. Resumen Cualitativo */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <FileText className="text-indigo-600" size={20} />
                            3. Balance Cualitativo
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Principales Logros Alcanzados</label>
                                <textarea
                                    disabled={isClosed}
                                    value={logrosAlcanzados}
                                    onChange={(e) => setLogrosAlcanzados(e.target.value)}
                                    rows={4}
                                    className="w-full p-4 bg-gray-50 rounded-xl border-none resize-none focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all disabled:opacity-70"
                                    placeholder="Describa los avances más significativos en sus habilidades socioemocionales, situación familiar, etc..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Recomendaciones Post-Egreso</label>
                                <textarea
                                    disabled={isClosed}
                                    value={recomendaciones}
                                    onChange={(e) => setRecomendaciones(e.target.value)}
                                    rows={4}
                                    className="w-full p-4 bg-gray-50 rounded-xl border-none resize-none focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all disabled:opacity-70"
                                    placeholder="Sugerencias para la familia, o para la institución de acogida..."
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Columna Derecha: Acciones y Resumen */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm sticky top-6">
                        <h3 className="font-bold text-gray-900 mb-4">Acciones Finales</h3>

                        <div className="space-y-3">
                            <button disabled={isClosed} className="w-full p-4 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 font-medium hover:border-indigo-400 hover:text-indigo-600 transition-all flex flex-col items-center justify-center gap-2 text-sm bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                                <FileText size={24} />
                                {documentoAdjunto ? documentoAdjunto : 'Adjuntar Acta de Cierre Firmada (PDF)'}
                            </button>

                            <div className="border-t border-gray-100 my-4"></div>

                            {!isClosed && (
                                <button
                                    onClick={handleSave}
                                    disabled={isLoading}
                                    className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-200 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isLoading ? 'Guardando...' : <><CheckCircle2 size={20} /> Finalizar Caso</>}
                                </button>
                            )}

                            {isClosed && (
                                <div className="p-4 bg-green-50 text-green-700 rounded-xl text-center font-bold border border-green-200">
                                    CASO CERRADO
                                </div>
                            )}

                            {onClose && (
                                <button
                                    onClick={onClose}
                                    className="w-full py-3 text-gray-500 hover:text-gray-900 font-bold rounded-xl hover:bg-gray-100 transition-colors"
                                >
                                    Volver
                                </button>
                            )}
                        </div>

                        <div className="mt-8 p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                            <p className="text-xs text-yellow-800 leading-relaxed flex gap-2">
                                <ShieldCheck size={32} className="shrink-0" />
                                <strong>Importante:</strong> Al finalizar el caso, el expediente pasará a estado "CERRADO" y no se podrán registrar nuevas intervenciones salvo reactivación.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
