import { useState, useEffect } from 'react';
import { getDownloadToken } from '../../utils/auth';
import { useAuthStore } from '../../store/auth.store';
import { Search, FileText, ArrowLeft, RefreshCw, ClipboardCheck, AlertTriangle, ShieldCheck, Check, X, ExternalLink } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { NNA_API_URL, INTERVENCION_API_URL } from '../../config/api';
import { useNnaStore } from '../../store/nna.store';
import { getSedesAll } from '../../api/sedes.api';
import type { Sede } from '../../api/sedes.api';

export const MonitorAuditoriaPage = () => {
    const { token, user } = useAuthStore();
    const navigate = useNavigate();
    const [searchTermCalidad, setSearchTermCalidad] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedSede, setSelectedSede] = useState('TODAS');

    // States for quick drawer audit
    const [selectedNna, setSelectedNna] = useState<any>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [loadingDocs, setLoadingDocs] = useState(false);

    const { documents, loadDocuments } = useNnaStore();

    const handleAuditarNna = async (nna: any) => {
        setSelectedNna(nna);
        setDrawerOpen(true);
        setLoadingDocs(true);
        try {
            const res = await fetch(`${NNA_API_URL}/nna/${nna.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const fullNna = await res.json();
                await loadDocuments(nna.id, fullNna);
            }
        } catch (err) {
            console.error("Error loading NNA for audit drawer:", err);
        } finally {
            setLoadingDocs(false);
        }
    };

    // Datos mock para auditoría de calidad nacional (mantenidos en sintonía con la arquitectura del sistema)
    const [auditoriaNnas, setAuditoriaNnas] = useState<any[]>([]);

    useEffect(() => {
        loadAuditoriaData();
    }, []);

    const loadAuditoriaData = async () => {
        try {
            // Fetch real sedes list from database
            let sedesMap: Record<number, string> = {};
            try {
                const sedesList = await getSedesAll();
                if (Array.isArray(sedesList)) {
                    sedesList.forEach((s: Sede) => {
                        sedesMap[s.id] = s.nombre;
                    });
                }
            } catch (err) {
                console.error('Error fetching sedes for audit mapping:', err);
            }

            const res = await fetch(`${NNA_API_URL}/nna`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                if (data && data.length > 0) {
                    const mapped = await Promise.all(data.map(async (nna: any) => {
                        const activeCase = nna.casos?.[0] || {};
                        const hasF03 = !!nna.codigoFicha03;
                        
                        // Real database check for Diagnóstico Social (F04)
                        let hasF04 = false;
                        try {
                            const diagRes = await fetch(`${INTERVENCION_API_URL}/diagnostico/nna/${nna.id}`, {
                                headers: {
                                    'Authorization': `Bearer ${token}`
                                }
                            });
                            if (diagRes.ok) {
                                const diags = await diagRes.json();
                                hasF04 = Array.isArray(diags) && diags.length > 0;
                            }
                        } catch (err) {
                            console.error(`Error fetching F04 for NNA ${nna.id}:`, err);
                        }

                        const hasSis = nna.afiliadoSIS === 'SÍ' || nna.afiliadoSIS === 'SI' || nna.afiliadoSIS === '1' || nna.afiliadoSIS === 1 || nna.afiliadoSIS === true;
                        const hasDni = !!nna.numeroDoc;

                        let estadoExp = 'ÓPTIMO';
                        if (!hasF03 || !hasF04) {
                            estadoExp = 'CRÍTICO';
                        } else if (!hasSis || !hasDni) {
                            estadoExp = 'ADVERTENCIA';
                        }

                        const caseSedeId = activeCase.sedeId || activeCase.sede_id;
                        const resolvedSedeName = caseSedeId && sedesMap[caseSedeId] ? sedesMap[caseSedeId] : 'Lima Metropolitana';

                        return {
                            id: nna.id,
                            nombre: `${nna.nombres || ''} ${nna.apellidoPaterno || ''} ${nna.apellidoMaterno || ''}`.trim(),
                            carpeta: nna.carpeta?.codigo || `CAR-26-${nna.id.toString().padStart(4, '0')}`,
                            sede: resolvedSedeName,
                            f03: hasF03,
                            f04: hasF04,
                            sis: hasSis,
                            dni: hasDni,
                            estadoExp: estadoExp
                        };
                    }));
                    setAuditoriaNnas(mapped);
                }
            }
        } catch (e) {
            console.error('Error fetching real NNA for quality audit:', e);
        }
    };

    // Extraer sedes disponibles
    const sedesDisponibles = Array.from(new Set(auditoriaNnas.map(n => n.sede)));

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadAuditoriaData();
        setIsRefreshing(false);
    };

    const filteredNnas = auditoriaNnas.filter(nna => {
        if (selectedSede !== 'TODAS' && nna.sede !== selectedSede) return false;

        return nna.nombre.toLowerCase().includes(searchTermCalidad.toLowerCase()) || 
            nna.carpeta.toLowerCase().includes(searchTermCalidad.toLowerCase()) ||
            nna.sede.toLowerCase().includes(searchTermCalidad.toLowerCase());
    });

    // Contadores de estados para KPIs de calidad
    const totalCriticos = auditoriaNnas.filter(n => n.estadoExp === 'CRÍTICO').length;
    const totalAdvertencias = auditoriaNnas.filter(n => n.estadoExp === 'ADVERTENCIA').length;
    const totalOptimos = auditoriaNnas.filter(n => n.estadoExp === 'ÓPTIMO').length;

    return (
        <div className="space-y-6">
            {/* Header / Banner Superior */}
            <div className="bg-gradient-to-r from-[#1e40af] via-[#2563eb] to-[#1d4ed8] text-white p-6 rounded-xl shadow-lg border border-blue-400/20">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Link to="/" className="text-blue-200 hover:text-white transition-colors">
                                <ArrowLeft size={16} />
                            </Link>
                            <h1 className="text-xl font-black tracking-tight">Auditoría de Calidad de Expedientes</h1>
                        </div>
                        <p className="text-blue-100 text-xs font-medium opacity-80">
                            Supervisión nacional del correcto foliado y carga de anexos (DGNNA)
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={handleRefresh}
                            className="bg-white/10 hover:bg-white/20 text-white border-white/10 gap-1.5"
                        >
                            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                            Sincronizar
                        </Button>
                    </div>
                </div>
            </div>

            {/* KPIs de Calidad Documental */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-border flex items-center gap-3">
                    <div className="p-3 bg-red-50 text-red-600 rounded-lg">
                        <AlertTriangle size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Expedientes Críticos</p>
                        <p className="text-xl font-black text-gray-900">{totalCriticos}</p>
                        <p className="text-[10px] text-gray-400">Falta documentación obligatoria</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-border flex items-center gap-3">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                        <ClipboardCheck size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Con Advertencias</p>
                        <p className="text-xl font-black text-gray-900">{totalAdvertencias}</p>
                        <p className="text-[10px] text-gray-400">Falta SIS o DNI, F03/F04 cargado</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-border flex items-center gap-3">
                    <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                        <ShieldCheck size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Expedientes Óptimos</p>
                        <p className="text-xl font-black text-gray-900">{totalOptimos}</p>
                        <p className="text-[10px] text-gray-400">Expediente completo y foliado</p>
                    </div>
                </div>
            </div>

            {/* Sección de Tabla e Inputs */}
            <div className="bg-surface rounded-xl border border-border p-5 space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h3 className="text-sm font-black text-fg uppercase tracking-widest">
                            Bandeja de Expedientes Nacionales
                        </h3>
                        <p className="text-xs text-fg-secondary">
                            Supervisión de Formato 03 (Inscripción), Formato 04 (Diagnóstico), SIS y DNI
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar por beneficiario, carpeta familiar o sede regional..."
                            className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-lg text-[13px] text-fg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors placeholder:text-fg-muted"
                            value={searchTermCalidad}
                            onChange={(e) => setSearchTermCalidad(e.target.value)}
                        />
                    </div>
                    <select
                        className="bg-surface border border-border rounded-lg px-3 py-2 text-[13px] text-fg font-medium focus:outline-none focus:border-primary cursor-pointer transition-colors"
                        value={selectedSede}
                        onChange={(e) => setSelectedSede(e.target.value)}
                    >
                        <option value="TODAS">Todas las Sedes (Nacional)</option>
                        {sedesDisponibles.map(sede => (
                            <option key={sede} value={sede}>{sede}</option>
                        ))}
                    </select>
                </div>

                <div className="overflow-x-auto rounded-lg border border-border bg-white">
                    <table className="w-full text-left text-[13px]">
                        <thead className="bg-surface-muted text-fg-secondary uppercase tracking-wider font-bold text-[10px] border-b border-border">
                            <tr>
                                <th className="px-4 py-3">Beneficiario (NNA)</th>
                                <th className="px-4 py-3">Carpeta</th>
                                <th className="px-4 py-3">Sede</th>
                                <th className="px-4 py-3 text-center">F03</th>
                                <th className="px-4 py-3 text-center">F04</th>
                                <th className="px-4 py-3 text-center">SIS</th>
                                <th className="px-4 py-3 text-center">DNI</th>
                                <th className="px-4 py-3">Semáforo Calidad</th>
                                <th className="px-4 py-3 text-right">Auditoría</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border font-medium">
                            {filteredNnas.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-12 text-center text-fg-muted font-normal italic">
                                        No se encontraron expedientes con los criterios de búsqueda ingresados.
                                    </td>
                                </tr>
                            ) : (
                                filteredNnas.map(nna => (
                                    <tr key={nna.id} onClick={() => handleAuditarNna(nna)} className="hover:bg-surface-muted/30 cursor-pointer transition-colors">
                                        <td className="px-4 py-3.5 font-bold text-fg">{nna.nombre}</td>
                                        <td className="px-4 py-3.5 font-mono text-fg-muted">{nna.carpeta}</td>
                                        <td className="px-4 py-3.5 text-fg-secondary">{nna.sede}</td>
                                        <td className="px-4 py-3.5 text-center">
                                            <span className={`inline-flex items-center justify-center w-5.5 h-5.5 rounded-full ${nna.f03 ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}>
                                                {nna.f03 ? <Check size={11} strokeWidth={3} /> : <X size={11} strokeWidth={3} />}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-center">
                                            <span className={`inline-flex items-center justify-center w-5.5 h-5.5 rounded-full ${nna.f04 ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}>
                                                {nna.f04 ? <Check size={11} strokeWidth={3} /> : <X size={11} strokeWidth={3} />}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-center">
                                            <span className={`inline-flex items-center justify-center w-5.5 h-5.5 rounded-full ${nna.sis ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}>
                                                {nna.sis ? <Check size={11} strokeWidth={3} /> : <X size={11} strokeWidth={3} />}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-center">
                                            <span className={`inline-flex items-center justify-center w-5.5 h-5.5 rounded-full ${nna.dni ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}>
                                                {nna.dni ? <Check size={11} strokeWidth={3} /> : <X size={11} strokeWidth={3} />}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${nna.estadoExp === 'ÓPTIMO' ? 'bg-success-soft text-success' : nna.estadoExp === 'CRÍTICO' ? 'bg-danger-soft text-danger' : 'bg-warning-soft text-warning'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${nna.estadoExp === 'ÓPTIMO' ? 'bg-success' : nna.estadoExp === 'CRÍTICO' ? 'bg-danger' : 'bg-warning'}`} />
                                                {nna.estadoExp}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-right">
                                            <Link
                                                to={`/nna/expediente/${nna.id}`}
                                                onClick={(e) => e.stopPropagation()}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#1e40af] hover:bg-blue-800 text-white rounded-lg text-[11px] font-bold uppercase transition-colors shadow-sm"
                                            >
                                                <FileText size={12} /> Auditar
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Back-drop blur overlay for the drawer */}
            {drawerOpen && (
                <div 
                    className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-opacity"
                    onClick={() => setDrawerOpen(false)}
                />
            )}

            {/* Premium Sliding Audit Drawer */}
            <div className={`fixed right-0 top-0 bottom-0 w-[450px] bg-surface border-l border-border shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col ${
                drawerOpen ? 'translate-x-0' : 'translate-x-full'
            }`}>
                {selectedNna && (
                    <>
                        {/* Drawer Header */}
                        <div className="p-5 border-b border-border bg-surface-muted flex items-center justify-between">
                            <div>
                                <h3 className="text-[15px] font-black text-fg uppercase tracking-wide leading-none">{selectedNna.nombre}</h3>
                                <p className="text-[12px] text-fg-secondary font-mono mt-1.5">{selectedNna.carpeta} · {selectedNna.sede}</p>
                            </div>
                            <button 
                                onClick={() => setDrawerOpen(false)}
                                className="p-1.5 hover:bg-border rounded-full text-fg-muted hover:text-fg transition-colors cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Drawer Content */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-5">
                            {/* General Status Badge */}
                            <div className="flex items-center justify-between p-3 rounded-lg border bg-surface-muted/50 border-border">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-fg-secondary">Estado General</span>
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase ${
                                    selectedNna.estadoExp === 'ÓPTIMO' ? 'bg-success-soft text-success' : selectedNna.estadoExp === 'CRÍTICO' ? 'bg-danger-soft text-danger' : 'bg-warning-soft text-warning'
                                }`}>
                                    <span className={`w-2 h-2 rounded-full ${selectedNna.estadoExp === 'ÓPTIMO' ? 'bg-success' : selectedNna.estadoExp === 'CRÍTICO' ? 'bg-danger' : 'bg-warning'}`} />
                                    {selectedNna.estadoExp}
                                </span>
                            </div>

                            {/* Checklist of Base documents */}
                            <div className="space-y-2">
                                <h4 className="text-[11px] font-bold text-fg-muted uppercase tracking-widest">Documentos Base del Expediente</h4>
                                <div className="space-y-1.5">
                                    {[
                                        { label: 'Ficha de Inscripción (Formato 3)', val: selectedNna.f03 },
                                        { label: 'Diagnóstico Social (Formato 4)', val: selectedNna.f04 },
                                        { label: 'Afiliación al Seguro SIS', val: selectedNna.sis },
                                        { label: 'Número de DNI / Documento', val: selectedNna.dni }
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2.5 rounded-md border border-border bg-surface shadow-xs">
                                            <span className="text-[12px] text-fg-secondary">{item.label}</span>
                                            <span className={`w-5 h-5 rounded-full flex items-center justify-center ${item.val ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}>
                                                {item.val ? <Check size={10} strokeWidth={3} /> : <X size={10} strokeWidth={3} />}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Real documents loaded inside store */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[11px] font-bold text-fg-muted uppercase tracking-widest">Archivos Digitales Registrados</h4>
                                    <span className="text-[11px] font-semibold text-fg-muted bg-surface-muted px-2 py-0.5 rounded-full">{documents.length} archivos</span>
                                </div>

                                {loadingDocs ? (
                                    <div className="py-8 flex flex-col items-center justify-center space-y-2 bg-surface-muted/30 rounded-lg border border-border border-dashed">
                                        <RefreshCw className="animate-spin text-primary" size={20} />
                                        <span className="text-[12px] text-fg-secondary font-medium">Buscando folios digitales...</span>
                                    </div>
                                ) : documents.length === 0 ? (
                                    <div className="py-8 text-center bg-surface-muted/30 rounded-lg border border-border border-dashed">
                                        <p className="text-[12px] text-fg-muted italic">No se encontraron folios registrados en el expediente digital.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        {documents.map((doc, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface shadow-xs hover:border-primary/50 transition-colors">
                                                <div className="space-y-0.5 max-w-[80%]">
                                                    <p className="text-[12px] font-bold text-fg truncate">{doc.type}</p>
                                                    <div className="flex gap-2 text-[10px] text-fg-muted">
                                                        <span>Cód: {doc.code}</span>
                                                        <span>·</span>
                                                        <span>Págs: {doc.pages}</span>
                                                    </div>
                                                </div>
                                                {doc.pdfUrl && (
                                                    <button
                                                        onClick={async () => {
                                                            const t = await getDownloadToken();
                                                            window.open(`${doc.pdfUrl}${doc.pdfUrl.includes('?') ? '&' : '?'}token=${t}`, '_blank');
                                                        }}
                                                        className="p-1.5 text-primary hover:bg-primary-soft rounded-md transition-colors"
                                                        title="Ver PDF"
                                                    >
                                                        <ExternalLink size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Drawer Footer Actions */}
                        <div className="p-4 border-t border-border bg-surface-muted flex gap-2">
                            <Link 
                                to={`/nna/expediente/${selectedNna.id}`}
                                className="flex-1 py-2 bg-primary hover:bg-primary/95 text-white rounded-lg text-[13px] font-bold uppercase text-center transition-colors shadow-sm cursor-pointer"
                            >
                                Expediente Completo
                            </Link>
                            <button 
                                onClick={() => setDrawerOpen(false)}
                                className="px-4 py-2 border border-border rounded-lg text-[13px] font-medium text-fg hover:bg-border transition-colors cursor-pointer"
                            >
                                Cerrar
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
