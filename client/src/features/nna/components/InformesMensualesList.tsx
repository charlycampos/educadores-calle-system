
import { useState } from 'react';
import { Plus, FileText, Printer, Calendar, Save, Trash2, Edit, Loader2, FileDown } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Formato12Print } from './Formato12Print';
import { useNnaStore } from '../../../store/nna.store';

export const InformesMensualesList = ({ nna }: { nna: any }) => {
    const { registerDocument } = useNnaStore();
    const [isGenerating, setIsGenerating] = useState(false);
    const [showModal, setShowModal] = useState(false);

    // Lista simulada de informes (idealmente vendría de API)
    const [informes, setInformes] = useState<any[]>([
        // Ejemplo vacio inicial
    ]);

    // Estado para nuevo informe
    const [currentInforme, setCurrentInforme] = useState<any>({
        mes: new Date().toLocaleString('es-PE', { month: 'long' }).toUpperCase(),
        anio: new Date().getFullYear(),
        educador: 'USUARIO ACTUAL',
        actividades: [
            { dimension: 'EDUCACIÓN', objetivo: 'Reinserción escolar', realizado: 'Visita a colegio', avance: '50%' },
            { dimension: 'SALUD', objetivo: 'Afiliación SIS', realizado: 'Trámite administrativo', avance: '100%' }
        ],
        logros: '',
        dificultades: '',
        conclusiones: ''
    });

    const handleDownloadPDF = async (informe: any) => {
        const elementId = `formato-12-${informe.id || 'new'}`;
        const filename = `F12_Informe_${informe.mes}_${informe.anio}_${nna.nombres}`;

        // Renderizamos temporalmente para capturar si no está en vista
        // Pero como usaremos un modal, asumiremos que está visible o usamos el truco del fixed

        // En este caso, usaremos el truco del componente oculto dinámico
        const hiddenDiv = document.createElement('div');
        hiddenDiv.style.position = 'absolute';
        hiddenDiv.style.left = '-9999px';
        hiddenDiv.style.top = '0';
        document.body.appendChild(hiddenDiv);

        // Render React component to static HTML string is hard without ReactDOMServer
        // Así que usaremos el componente que ya está renderizado en el DOM o forzaremos uno.
        // TRUCO: Usaremos el componente <Formato12Print> que renderizaremos oculto en el return principal
        // y pasaremos el 'currentInforme' a un estado específico para impresión.

        // Simplificación: Asumimos que "imprimir" es guardar el actual
        setCurrentPrintInforme(informe);
        await new Promise(r => setTimeout(r, 500)); // Esperar render

        const element = document.getElementById('formato-12-hidden-print');
        if (!element) return;

        setIsGenerating(true);
        try {
            const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`${filename}.pdf`);

            // Registrar en Expediente
            registerDocument({
                nnaId: nna.id,
                type: 'INFORME MENSUAL (FORMATO 12)',
                code: `INF-${informe.anio}-${informe.mes.substring(0, 3)}`,
                date: new Date().toISOString(),
                pages: 1, // o calc
                user: informe.educador,
                status: 'GENERADO'
            });

        } catch (e) {
            console.error(e);
            alert('Error al generar PDF');
        } finally {
            setIsGenerating(false);
            document.body.removeChild(hiddenDiv);
        }
    };

    const [currentPrintInforme, setCurrentPrintInforme] = useState<any>(null);

    const handleSave = () => {
        const newInforme = {
            ...currentInforme,
            id: Date.now(),
            fechaRegistro: new Date()
        };
        setInformes([newInforme, ...informes]);
        setShowModal(false);
        // Opcional: Descargar automático
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Informes Mensuales (Fase 2)</h2>
                    <p className="text-sm text-gray-500">Registro y evaluación periódica del NNA</p>
                </div>
                <button
                    onClick={() => {
                        setCurrentInforme({
                            mes: new Date().toLocaleString('es-PE', { month: 'long' }).toUpperCase(),
                            anio: new Date().getFullYear(),
                            educador: 'USUARIO ACTUAL', // TODO: Get from auth
                            actividades: [],
                            logros: '',
                            dificultades: '',
                            conclusiones: ''
                        });
                        setShowModal(true);
                    }}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <Plus size={18} /> Nuevo Informe (F12)
                </button>
            </div>

            {/* Lista de Informes */}
            {informes.length === 0 ? (
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-10 text-center text-gray-400">
                    <FileText size={48} className="mx-auto mb-3 opacity-20" />
                    <p>No hay informes registrados aún.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {informes.map((inf) => (
                        <div key={inf.id} className="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative group">
                            <div className="flex justify-between items-start mb-3">
                                <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
                                    {inf.mes} {inf.anio}
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handleDownloadPDF(inf)}
                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Descargar PDF"
                                    >
                                        <FileDown size={18} />
                                    </button>
                                </div>
                            </div>

                            <h4 className="font-bold text-gray-800 text-sm mb-1">{nna.nombres} {nna.apellidoPaterno}</h4>
                            <p className="text-xs text-gray-500 line-clamp-2">{inf.conclusiones || 'Sin conclusiones registradas.'}</p>

                            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
                                <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(inf.fechaRegistro).toLocaleDateString()}</span>
                                <span>{inf.actividades?.length || 0} Actividades</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de Edición */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                            <h3 className="font-bold text-lg">Nuevo Informe Mensual (F12)</h3>
                            <button onClick={() => setShowModal(false)}><Plus className="rotate-45 text-gray-400" /></button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold uppercase text-gray-500 block mb-1">Mes</label>
                                    <select
                                        className="w-full border rounded-lg p-2 text-sm"
                                        value={currentInforme.mes}
                                        onChange={e => setCurrentInforme({ ...currentInforme, mes: e.target.value })}
                                    >
                                        {['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'].map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-gray-500 block mb-1">Año</label>
                                    <input
                                        className="w-full border rounded-lg p-2 text-sm"
                                        value={currentInforme.anio}
                                        onChange={e => setCurrentInforme({ ...currentInforme, anio: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase text-gray-500 block mb-1">Conclusiones del Mes</label>
                                <textarea
                                    className="w-full border rounded-lg p-2 text-sm"
                                    rows={4}
                                    value={currentInforme.conclusiones}
                                    onChange={e => setCurrentInforme({ ...currentInforme, conclusiones: e.target.value })}
                                    placeholder="Resumen del avance..."
                                />
                            </div>

                            <div className="bg-yellow-50 p-4 rounded-lg text-xs text-yellow-700">
                                <strong>Nota:</strong> Las actividades se cargarán automáticamente desde el PII activo (Simulado).
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 font-bold text-sm">Cancelar</button>
                            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-200">
                                Guardar Informe
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden Print Component */}
            {currentPrintInforme && (
                <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
                    <Formato12Print id="formato-12-hidden-print" nna={nna} informe={currentPrintInforme} />
                </div>
            )}
        </div>
    );
};
