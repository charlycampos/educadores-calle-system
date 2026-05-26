import { useState } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { Search, FileText, ArrowLeft, RefreshCw, ClipboardCheck, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

export const MonitorAuditoriaPage = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [searchTermCalidad, setSearchTermCalidad] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedSede, setSelectedSede] = useState('TODAS');

    // Datos mock para auditoría de calidad nacional (mantenidos en sintonía con la arquitectura del sistema)
    const [auditoriaNnas, setAuditoriaNnas] = useState([
        { id: 1, nombre: 'Álvarez Ríos Juan', carpeta: 'CAR-26-0043', sede: 'Lima Metropolitana', f03: true, f04: true, sis: true, dni: true, estadoExp: 'ÓPTIMO' },
        { id: 2, nombre: 'Méndez Castro Luis', carpeta: 'CAR-26-0089', sede: 'Huancayo', f03: true, f04: false, sis: true, dni: false, estadoExp: 'CRÍTICO' },
        { id: 3, nombre: 'Quispe Choque Carmen', carpeta: 'CAR-26-0105', sede: 'Puno', f03: true, f04: true, sis: false, dni: true, estadoExp: 'ADVERTENCIA' },
        { id: 4, nombre: 'Gómez Ruiz Sofía', carpeta: 'CAR-26-0112', sede: 'Huaral', f03: true, f04: true, sis: true, dni: true, estadoExp: 'ÓPTIMO' },
        { id: 5, nombre: 'Mendoza Ticona Raúl', carpeta: 'CAR-26-0145', sede: 'Arequipa', f03: true, f04: false, sis: true, dni: true, estadoExp: 'ADVERTENCIA' },
        { id: 6, nombre: 'Rojas Paredes María', carpeta: 'CAR-26-0210', sede: 'Cusco', f03: true, f04: true, sis: true, dni: false, estadoExp: 'ADVERTENCIA' },
        { id: 7, nombre: 'Huamán Torres Carlos', carpeta: 'CAR-26-0301', sede: 'Trujillo', f03: false, f04: false, sis: false, dni: false, estadoExp: 'CRÍTICO' },
        { id: 8, nombre: 'Salvatierra Elena', carpeta: 'CAR-26-0315', sede: 'Iquitos', f03: true, f04: true, sis: true, dni: true, estadoExp: 'ÓPTIMO' }
    ]);

    // Extraer sedes disponibles
    const sedesDisponibles = Array.from(new Set(auditoriaNnas.map(n => n.sede)));

    const handleRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => {
            setIsRefreshing(false);
        }, 800);
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
            <div className="bg-[#1e40af] text-white p-6 rounded-xl shadow-md">
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
                                    <tr key={nna.id} className="hover:bg-surface-muted/30 transition-colors">
                                        <td className="px-4 py-3.5 font-bold text-fg">{nna.nombre}</td>
                                        <td className="px-4 py-3.5 font-mono text-fg-muted">{nna.carpeta}</td>
                                        <td className="px-4 py-3.5 text-fg-secondary">{nna.sede}</td>
                                        <td className="px-4 py-3.5 text-center">
                                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${nna.f03 ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}>
                                                {nna.f03 ? '✓' : '✗'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-center">
                                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${nna.f04 ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}>
                                                {nna.f04 ? '✓' : '✗'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-center">
                                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${nna.sis ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}>
                                                {nna.sis ? '✓' : '✗'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-center">
                                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${nna.dni ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}>
                                                {nna.dni ? '✓' : '✗'}
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
        </div>
    );
};
