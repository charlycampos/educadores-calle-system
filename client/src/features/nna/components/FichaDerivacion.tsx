import { useState } from 'react';
import { Send, Printer, Save, FileText, ArrowLeft, Building2, Calendar, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface Derivacion {
    id: number;
    fecha: string;
    institucion: string;
    servicio: string; // Demuna, Salud, Reniec, etc.
    motivo: string;
    observaciones: string;
    estado: 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA' | 'ATENDIDA';
    documentosAdjuntos: string[];
}

interface FichaDerivacionProps {
    nna: any;
    onClose?: () => void;
}

export const FichaDerivacion = ({ nna, onClose }: FichaDerivacionProps) => {
    const [derivaciones, setDerivaciones] = useState<Derivacion[]>([
        {
            id: 1,
            fecha: new Date().toISOString().split('T')[0],
            institucion: 'CENTRO DE SALUD SANTA ROSA',
            servicio: 'SALUD',
            motivo: 'Evaluación nutricional y tamizaje de anemia.',
            observaciones: 'NNA presenta signos de desnutrición.',
            estado: 'PENDIENTE',
            documentosAdjuntos: ['Copia DNI']
        }
    ]);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [currentDerivacion, setCurrentDerivacion] = useState<Derivacion | null>(null);

    const handleNew = () => {
        setCurrentDerivacion({
            id: Date.now(),
            fecha: new Date().toISOString().split('T')[0],
            institucion: '',
            servicio: 'SALUD',
            motivo: '',
            observaciones: '',
            estado: 'PENDIENTE',
            documentosAdjuntos: []
        });
        setIsFormOpen(true);
    };

    const handleSave = () => {
        if (currentDerivacion) {
            // Si existe actualizamos, sino creamos
            const existingIndex = derivaciones.findIndex(d => d.id === currentDerivacion.id);
            if (existingIndex >= 0) {
                const newDerivaciones = [...derivaciones];
                newDerivaciones[existingIndex] = currentDerivacion;
                setDerivaciones(newDerivaciones);
            } else {
                setDerivaciones([...derivaciones, currentDerivacion]);
            }
            setIsFormOpen(false);
            setCurrentDerivacion(null);
        }
    };

    const EstadoBadge = ({ estado }: { estado: string }) => {
        const colors: any = {
            'PENDIENTE': 'bg-amber-100 text-amber-700 border-amber-200',
            'ACEPTADA': 'bg-blue-100 text-blue-700 border-blue-200',
            'RECHAZADA': 'bg-red-100 text-red-700 border-red-200',
            'ATENDIDA': 'bg-green-100 text-green-700 border-green-200',
        };
        return (
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${colors[estado] || 'bg-gray-100'}`}>
                {estado}
            </span>
        );
    };

    if (isFormOpen && currentDerivacion) {
        return (
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                <div className="flex items-center gap-2 mb-6">
                    <button onClick={() => setIsFormOpen(false)} className="text-gray-500 hover:text-gray-700">
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="text-xl font-bold uppercase text-gray-800">
                        {currentDerivacion.id ? 'Editar Derivación' : 'Nueva Derivación - Formato 06'}
                    </h2>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
                    {/* Header Impresión */}
                    <div className="hidden print:block text-center border-b pb-4 mb-4">
                        <h1 className="text-lg font-bold">FICHA DE DERIVACIÓN (FORMATO 06)</h1>
                        <p className="text-xs">Servicio de Educadores de Calle</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Institución de Destino</label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-3 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    value={currentDerivacion.institucion}
                                    onChange={e => setCurrentDerivacion({ ...currentDerivacion, institucion: e.target.value })}
                                    className="w-full pl-10 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700"
                                    placeholder="Ej. Centro de Salud, DEMUNA, Comisaría"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo de Servicio</label>
                            <select
                                value={currentDerivacion.servicio}
                                onChange={e => setCurrentDerivacion({ ...currentDerivacion, servicio: e.target.value })}
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700 bg-white"
                            >
                                <option value="SALUD">SALUD (SIS, Atención Médica)</option>
                                <option value="IDENTIDAD">IDENTIDAD (RENIEC / DNI)</option>
                                <option value="LEGAL">LEGAL (Denuncias, Alimentos)</option>
                                <option value="EDUCACION">EDUCACIÓN (Matrícula)</option>
                                <option value="SOCIAL">SOCIAL (Comedor, Vaso de Leche)</option>
                                <option value="OTROS">OTROS</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Motivo de la Derivación</label>
                        <textarea
                            value={currentDerivacion.motivo}
                            onChange={e => setCurrentDerivacion({ ...currentDerivacion, motivo: e.target.value })}
                            rows={3}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                            placeholder="Describa por qué se deriva al NNA a esta institución..."
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Documentos Adjuntos (Referencia)</label>
                        <input
                            type="text"
                            placeholder="Ej. Copia de DNI, Informe Social"
                            className="w-full p-2.5 border border-gray-300 rounded-lg outline-none"
                            value={currentDerivacion.documentosAdjuntos.join(', ')}
                            onChange={e => setCurrentDerivacion({ ...currentDerivacion, documentosAdjuntos: e.target.value.split(',') })}
                        />
                    </div>

                    <div className="border-t border-gray-100 pt-4 mt-4">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estado de la Gestión</label>
                        <div className="flex gap-4">
                            {['PENDIENTE', 'ATENDIDA'].map((status) => (
                                <label key={status} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="estado"
                                        checked={currentDerivacion.estado === status}
                                        onChange={() => setCurrentDerivacion({ ...currentDerivacion, estado: status as any })}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium">{status}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                        <button
                            onClick={() => window.print()}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-bold text-gray-700"
                        >
                            <Printer size={18} /> Imprimir Ficha
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-md"
                        >
                            <Save size={18} /> Guardar Derivación
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div>
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Send className="text-blue-600" />
                        Registro de Derivaciones
                    </h2>
                    <p className="text-sm text-gray-500">Formato N° 06 - Gestión Interinstitucional</p>
                </div>
                <button
                    onClick={handleNew}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-bold shadow-sm transition-all"
                >
                    <Send size={16} /> Nueva Derivación
                </button>
            </div>

            <div className="grid gap-4">
                {derivaciones.map((derivacion) => (
                    <div key={derivacion.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${derivacion.estado === 'ATENDIDA' ? 'bg-green-500' : 'bg-amber-500'}`}></div>

                        <div className="flex justify-between items-start mb-2 pl-3">
                            <div>
                                <h3 className="font-bold text-gray-900">{derivacion.institucion}</h3>
                                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">{derivacion.servicio}</span>
                            </div>
                            <EstadoBadge estado={derivacion.estado} />
                        </div>

                        <p className="text-sm text-gray-600 mb-3 pl-3 text-justify leading-relaxed">
                            {derivacion.motivo}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-gray-400 pl-3 border-t border-gray-50 pt-3">
                            <span className="flex items-center gap-1"><Calendar size={14} /> {derivacion.fecha}</span>
                            {derivacion.documentosAdjuntos.length > 0 && (
                                <span className="flex items-center gap-1"><FileText size={14} /> {derivacion.documentosAdjuntos.length} docs</span>
                            )}
                            <div className="ml-auto flex gap-2">
                                <button
                                    onClick={() => {
                                        setCurrentDerivacion(derivacion);
                                        setIsFormOpen(true);
                                    }}
                                    className="text-blue-600 hover:text-blue-800 font-bold hover:underline"
                                >
                                    Ver / Editar
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {derivaciones.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <Send className="mx-auto text-gray-300 mb-3" size={48} />
                    <p className="text-gray-500 font-medium">No hay derivaciones registradas</p>
                    <button onClick={handleNew} className="text-blue-600 text-sm font-bold mt-2 hover:underline">
                        Crear la primera derivación
                    </button>
                </div>
            )}
        </div>
    );
};
