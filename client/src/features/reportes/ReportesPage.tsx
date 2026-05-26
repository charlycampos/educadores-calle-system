import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { useNnaStore } from '../../store/nna.store';
import { getTalleres } from '../../api/talleres.api';
import {
    BarChart3, FileDown, Calendar, Filter, Building2,
    CheckCircle2, AlertCircle, FileSpreadsheet, Loader2, ArrowLeft, Users
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

// Etiquetas de fases del caso
const ESTADO_LABELS: Record<string, string> = {
    CAPTACION: 'Captación',
    EN_EVALUACION: 'En Evaluación',
    INTERVENCION: 'Intervención',
    SEGUIMIENTO: 'Seguimiento',
    CERRADO: 'Cerrado',
    DERIVADO: 'Derivado'
};

export const ReportesPage = () => {
    const { token } = useAuthStore();
    const { nnas, fetchAllNnas, isLoading: loadingNna } = useNnaStore();
    const [talleres, setTalleres] = useState<any[]>([]);
    const [loadingTalleres, setLoadingTalleres] = useState(false);
    const [exporting, setExporting] = useState<string | null>(null);

    // Filtros de reportería
    const [selectedSede, setSelectedSede] = useState('TODAS');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [selectedPerfil, setSelectedPerfil] = useState('TODOS');

    useEffect(() => {
        if (nnas.length === 0) fetchAllNnas();
        loadTalleresData();
    }, []);

    const loadTalleresData = async () => {
        setLoadingTalleres(true);
        try {
            const list = await getTalleres();
            setTalleres(list);
        } catch (error) {
            console.error('Error loading talleres for reports', error);
        } finally {
            setLoadingTalleres(false);
        }
    };

    // Extraer sedes únicas disponibles en los datos de los NNA
    const sedesDisponibles = Array.from(
        new Set(
            nnas
                .map(nna => nna.casos?.[0]?.sede_id ? `Sede ${nna.casos[0].sede_id}` : null)
                .filter(Boolean)
        )
    );

    // Filtrar NNA según las variables del panel superior
    const getFilteredNnas = () => {
        return nnas.filter(nna => {
            // Filtro de Sede
            if (selectedSede !== 'TODAS') {
                const sedeNna = nna.casos?.[0]?.sede_id ? `Sede ${nna.casos[0].sede_id}` : '';
                if (sedeNna !== selectedSede) return false;
            }

            // Filtro de Perfil
            if (selectedPerfil !== 'TODOS') {
                const perfilNna = nna.casos?.[0]?.perfil || '';
                if (perfilNna !== selectedPerfil) return false;
            }

            // Filtro de Fechas
            if (fechaInicio) {
                const dateNna = new Date(nna.createdAt);
                const dateStart = new Date(fechaInicio);
                if (dateNna < dateStart) return false;
            }
            if (fechaFin) {
                const dateNna = new Date(nna.createdAt);
                const dateEnd = new Date(fechaFin);
                if (dateNna > dateEnd) return false;
            }

            return true;
        });
    };

    // Filtrar talleres según los parámetros
    const getFilteredTalleres = () => {
        return talleres.filter(t => {
            if (selectedSede !== 'TODAS') {
                const sedeIdNum = Number(selectedSede.replace('Sede ', ''));
                if (t.sede_id !== sedeIdNum) return false;
            }
            if (fechaInicio) {
                const dateT = new Date(t.fecha_programada);
                const dateStart = new Date(fechaInicio);
                if (dateT < dateStart) return false;
            }
            if (fechaFin) {
                const dateT = new Date(t.fecha_programada);
                const dateEnd = new Date(fechaFin);
                if (dateT > dateEnd) return false;
            }
            return true;
        });
    };

    // Descarga de CSV en UTF-8 con BOM para MS Excel
    const downloadCSV = (headers: string[], rows: any[][], filename: string) => {
        const csvContent = [
            headers.join(','),
            ...rows.map(row =>
                row.map(val => {
                    if (val === null || val === undefined) return '""';
                    const stringVal = String(val).replace(/"/g, '""');
                    return `"${stringVal}"`;
                }).join(',')
            )
        ].join('\n');

        // \uFEFF es el BOM (Byte Order Mark) para UTF-8 que le avisa a Excel que use la codificación correcta para eñes y acentos.
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // 1. Exportar Padrón de Beneficiarios NNA
    const handleExportNnaPadron = () => {
        setExporting('nna');
        try {
            const filtered = getFilteredNnas();
            const headers = [
                'ID NNA', 'Código Ficha03', 'Carpeta Familiar ID', 'Carpeta Código',
                'Nombres', 'Apellido Paterno', 'Apellido Materno',
                'Tipo Documento', 'Número Documento', 'Tiene Partida', 'Detalle Sin Doc',
                'Fecha Nacimiento', 'Edad', 'Sexo', 'Nacionalidad',
                'Lugar Nacimiento', 'Domicilio Actual', 'Referencia Domicilio',
                'Departamento Domicilio', 'Provincia Domicilio', 'Distrito Domicilio',
                'Teléfono Contacto', 'Nombre Tutor', 'Vive Con', 'Tiene Hermanos',
                'Cantidad Hermanos', 'Sufre Enfermedad', 'Detalle Enfermedad',
                'Tiene Discapacidad', 'Tipo Discapacidad', 'Estudia Actualmente',
                'Nivel Educativo', 'Grado Estudio', 'Institución Educativa',
                'Afiliado SIS', 'Estado Caso', 'Perfil Ingreso', 'Nivel Riesgo',
                'Fecha Registro'
            ];

            const rows = filtered.map(nna => {
                const activeCase = nna.casos?.[0] || {};
                return [
                    nna.id, nna.codigoFicha03 || '—', nna.carpeta?.id || '—', nna.carpeta?.codigo || '—',
                    nna.nombres, nna.apellidoPaterno, nna.apellidoMaterno || '',
                    nna.tipoDoc, nna.numeroDoc || '—', nna.tienePartidaNacimiento ? 'SÍ' : 'NO', nna.detalleSinDoc || '',
                    nna.fechaNacimiento ? new Date(nna.fechaNacimiento).toLocaleDateString() : '—', nna.edad || '', nna.sexo || '', nna.nacionalidad || 'Peruana',
                    `${nna.departamentoNac || ''} - ${nna.distritoNac || ''}`, nna.domicilioActual || '', nna.referenciaDomicilio || '',
                    nna.departamentoDom || '', nna.provinciaDom || '', nna.distritoDom || '',
                    nna.telefonoContacto || '', nna.nombreTutor || '—', nna.viveCon || '—', nna.tieneHermanos ? 'SÍ' : 'NO',
                    nna.cantHermanos || 0, nna.sufreEnfermedad ? 'SÍ' : 'NO', nna.detalleEnfermedad || '',
                    nna.tieneDiscapacidad ? 'SÍ' : 'NO', nna.tipoDiscapacidad || '', nna.estudiaActualmente ? 'SÍ' : 'NO',
                    nna.nivelEducativo || '', nna.gradoEstudio || '', nna.institucionEducativa || '',
                    nna.afiliadoSIS || 'NO', ESTADO_LABELS[activeCase.estado] || activeCase.estado || '—', activeCase.perfil || '—', activeCase.nivel_riesgo || '—',
                    new Date(nna.createdAt).toLocaleDateString()
                ];
            });

            downloadCSV(headers, rows, 'padron_nna_mimp');
        } catch (e) {
            console.error(e);
        } finally {
            setExporting(null);
        }
    };

    // 2. Exportar Talleres y Asistencias
    const handleExportTalleres = () => {
        setExporting('talleres');
        try {
            const filtered = getFilteredTalleres();
            const headers = [
                'ID Taller', 'Sede ID', 'Educador ID', 'Tema / Nombre Taller',
                'Fecha Programada', 'Hora', 'Lugar', 'Estado Taller',
                'Objetivos', 'Metodología', 'Total Participantes',
                'Participante NNA ID', 'Participó / Asistió', 'Evaluación Logros', 'Limitaciones/Sugerencias'
            ];

            const rows: any[][] = [];

            filtered.forEach(t => {
                const totalPart = t.participantes?.length || 0;
                
                // Si el taller no tiene participantes
                if (totalPart === 0) {
                    rows.push([
                        t.id, t.sede_id, t.educador_id, t.nombre || t.tema,
                        new Date(t.fecha_programada).toLocaleDateString(), t.hora || '—', t.lugar || '—', t.estado,
                        t.objetivos || '—', t.metodologia || '—', 0,
                        '—', '—', '—', '—'
                    ]);
                } else {
                    t.participantes.forEach((p: any) => {
                        rows.push([
                            t.id, t.sede_id, t.educador_id, t.nombre || t.tema,
                            new Date(t.fecha_programada).toLocaleDateString(), t.hora || '—', t.lugar || '—', t.estado,
                            t.objetivos || '—', t.metodologia || '—', totalPart,
                            p.nnaId, p.asistio ? 'SÍ' : 'NO', p.logros || '—',
                            `Limitaciones: ${p.limitaciones || '—'} | Sugerencias: ${p.sugerencias || '—'}`
                        ]);
                    });
                }
            });

            downloadCSV(headers, rows, 'bbdd_talleres_asistencia');
        } catch (e) {
            console.error(e);
        } finally {
            setExporting(null);
        }
    };

    // 3. Exportar Casos e Historial de Derivaciones
    const handleExportCasos = () => {
        setExporting('casos');
        try {
            const filtered = getFilteredNnas();
            const headers = [
                'ID Caso', 'Código Caso', 'NNA ID', 'Beneficiario', 'DNI',
                'Sede ID', 'Educador ID', 'Fase', 'Estado Caso', 'Nivel Riesgo',
                'Perfil Ingreso', 'Zona Intervención', 'Fecha Abordaje', 'Fecha Apertura',
                'Fecha Cierre', 'Historial Eventos'
            ];

            const rows = filtered.map(nna => {
                const activeCase = nna.casos?.[0] || {};
                
                // Formatear historial simple
                const historialString = (activeCase.historial || [])
                    .map((h: any) => `[${new Date(h.fecha).toLocaleDateString()}] ${h.tipo_cambio}: ${h.motivo}`)
                    .join(' || ');

                return [
                    activeCase.id || '—', activeCase.codigo_caso || '—', nna.id, `${nna.nombres} ${nna.apellidoPaterno}`, nna.numeroDoc || '—',
                    activeCase.sede_id || '—', activeCase.responsable_id || '—', activeCase.fase || 'I', ESTADO_LABELS[activeCase.estado] || activeCase.estado || '—', activeCase.nivel_riesgo || '—',
                    activeCase.perfil || '—', activeCase.zona_intervencion || '—', activeCase.fecha_abordaje ? new Date(activeCase.fecha_abordaje).toLocaleDateString() : '—',
                    activeCase.fecha_apertura ? new Date(activeCase.fecha_apertura).toLocaleDateString() : '—', activeCase.fecha_cierre ? new Date(activeCase.fecha_cierre).toLocaleDateString() : '—',
                    historialString || 'Sin eventos registrados'
                ];
            });

            downloadCSV(headers, rows, 'historial_casos_derivaciones');
        } catch (e) {
            console.error(e);
        } finally {
            setExporting(null);
        }
    };

    return (
        <div className="min-h-screen bg-[#f1f5f9] pb-10">
            {/* Header Estilo PEC */}
            <div className="bg-[#1e40af] text-white px-6 py-5 shadow-lg">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link to="/" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-xl font-black tracking-tight">Centro de Reportes y Consistencia</h1>
                            <p className="text-blue-100 text-xs font-medium opacity-80 mt-0.5">Exportación de bases de datos consolidadas para la REN del MIMP</p>
                        </div>
                    </div>
                    <div className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/5 flex items-center gap-2">
                        <FileSpreadsheet size={16} className="text-green-400" />
                        <span className="text-[11px] font-bold uppercase tracking-wider">Formato CSV Excel UTF-8</span>
                    </div>
                </div>
            </div>

            <main className="max-w-5xl mx-auto px-6 py-6 space-y-6">
                
                {/* ── PANEL DE FILTROS ── */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
                    <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                        <Filter className="text-blue-600 w-4 h-4" />
                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Filtros de Consistencia</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Selector de Sede */}
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Sede del Programa</label>
                            <select
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[12px] font-semibold text-gray-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                                value={selectedSede}
                                onChange={(e) => setSelectedSede(e.target.value)}
                            >
                                <option value="TODAS">TODAS LAS SEDES (Nacional)</option>
                                {sedesDisponibles.map(sede => (
                                    <option key={sede} value={sede!}>{sede}</option>
                                ))}
                            </select>
                        </div>

                        {/* Selector de Perfil */}
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Perfil de Ingreso</label>
                            <select
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[12px] font-semibold text-gray-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                                value={selectedPerfil}
                                onChange={(e) => setSelectedPerfil(e.target.value)}
                            >
                                <option value="TODOS">TODOS LOS PERFILES</option>
                                <option value="TRABAJO_INFANTIL">Trabajo Infantil</option>
                                <option value="MENDICIDAD">Mendicidad en Calle</option>
                                <option value="VIDA_EN_CALLE">Vida en Calle / Pernocta</option>
                            </select>
                        </div>

                        {/* Fecha Inicio */}
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Fecha Registro Desde</label>
                            <input
                                type="date"
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[12px] font-semibold text-gray-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                                value={fechaInicio}
                                onChange={(e) => setFechaInicio(e.target.value)}
                            />
                        </div>

                        {/* Fecha Fin */}
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Fecha Registro Hasta</label>
                            <input
                                type="date"
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[12px] font-semibold text-gray-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                                value={fechaFin}
                                onChange={(e) => setFechaFin(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* ── SECCIONES DE BASES DE DATOS A DESCARGAR ── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    
                    {/* Tarjeta 1: Padrón NNA */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col justify-between h-64">
                        <div>
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl w-fit mb-4">
                                <Users size={22} />
                            </div>
                            <h4 className="text-[14px] font-black text-gray-900 leading-tight">Padrón de Beneficiarios (NNA)</h4>
                            <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                                Base de datos consolidada de Ficha de Inscripción (F03) y Ficha de Diagnóstico Social (F04). Incluye datos de SIS, DNI, salud, educación y discapacidad.
                            </p>
                        </div>
                        <Button
                            variant="primary"
                            className="w-full justify-center gap-2 mt-4 font-bold uppercase text-[11px] py-2"
                            onClick={handleExportNnaPadron}
                            disabled={exporting === 'nna' || loadingNna}
                        >
                            {exporting === 'nna' ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : (
                                <FileDown size={14} />
                            )}
                            Descargar Base NNA
                        </Button>
                    </div>

                    {/* Tarjeta 2: Talleres e Asistencias */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col justify-between h-64">
                        <div>
                            <div className="p-3 bg-green-50 text-green-600 rounded-xl w-fit mb-4">
                                <FileSpreadsheet size={22} />
                            </div>
                            <h4 className="text-[14px] font-black text-gray-900 leading-tight">Intervenciones y Talleres</h4>
                            <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                                Base de datos unificada de talleres planificados (F07) y ejecutados (F08). Incluye registro de asistencia (F10/F11) y la evaluación de logros y limitaciones por menor.
                            </p>
                        </div>
                        <Button
                            variant="success"
                            className="w-full justify-center gap-2 mt-4 font-bold uppercase text-[11px] py-2 text-white bg-green-600 hover:bg-green-700"
                            onClick={handleExportTalleres}
                            disabled={exporting === 'talleres' || loadingTalleres}
                        >
                            {exporting === 'talleres' ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : (
                                <FileDown size={14} />
                            )}
                            Descargar Base Talleres
                        </Button>
                    </div>

                    {/* Tarjeta 3: Historial Casos y Derivaciones */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col justify-between h-64">
                        <div>
                            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl w-fit mb-4">
                                <BarChart3 size={22} />
                            </div>
                            <h4 className="text-[14px] font-black text-gray-900 leading-tight">Casos e Historial Derivaciones</h4>
                            <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                                Control cronológico e histórico de reasignaciones de responsables, traslados inter-sede, derivaciones a la red y bitácora del historial del caso.
                            </p>
                        </div>
                        <Button
                            variant="secondary"
                            className="w-full justify-center gap-2 mt-4 font-bold uppercase text-[11px] py-2 border border-gray-200 text-gray-700 hover:bg-gray-50"
                            onClick={handleExportCasos}
                            disabled={exporting === 'casos' || loadingNna}
                        >
                            {exporting === 'casos' ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : (
                                <FileDown size={14} />
                            )}
                            Descargar Historial
                        </Button>
                    </div>

                </div>

                {/* ── NOTA DE CONSISTENCIA PARA EL ESTADÍSTICO ── */}
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex gap-3">
                    <AlertCircle size={18} className="text-blue-600 shrink-0 mt-0.5" />
                    <div>
                        <h5 className="text-xs font-bold text-blue-900 uppercase tracking-wide">Nota de Consistencia y Limpieza (Estadístico Central)</h5>
                        <p className="text-[11px] text-blue-700 leading-relaxed mt-1 font-medium">
                            Los reportes generados cuentan con formato de compatibilidad UTF-8 con codificación Byte Order Mark (BOM). Esto garantiza que caracteres como la eñe (ñ) y las vocales con tildes no se corrompan al abrirse en Microsoft Excel. Los filtros aplicados en el panel superior segmentan dinámicamente las tres bases de datos descargadas de forma síncrona.
                        </p>
                    </div>
                </div>

            </main>
        </div>
    );
};
