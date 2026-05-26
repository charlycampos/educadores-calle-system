import React, { useEffect, useState } from 'react';
import { useNnaStore } from '../../store/nna.store';
import { useAuthStore } from '../../store/auth.store';
import { ROLES } from '../../config/api';
import { clsx } from 'clsx';
import { Plus, Search, FileDown, MoreHorizontal, ArrowRightCircle, Briefcase, FileText, User, Pencil, FolderOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DerivacionModal } from './components/DerivacionModal';
import { Button } from '../../components/ui/Button';
import { PdfViewerModal } from './components/PdfViewerModal';

const calculateAge = (dobString: string | Date | null) => {
    if (!dobString) return '-';
    const today = new Date();
    const birthDate = new Date(dobString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age >= 0 ? age : '-';
};

export const NnaListPage = () => {
    const { nnas, isLoading, fetchAllNnas } = useNnaStore();
    const { user } = useAuthStore();
    const canEdit = user && user.rol !== ROLES.MONITOR && user.rol !== ROLES.ESTADISTICO;

    useEffect(() => {
        fetchAllNnas();
    }, [fetchAllNnas]);

    const [searchTerm, setSearchTerm] = useState('');
    const [isDerivacionOpen, setIsDerivacionOpen] = useState(false);
    const [selectedCase, setSelectedCase] = useState<{ nnaId: number, casoId: number, nnaName: string } | null>(null);
    const [isPdfOpen, setIsPdfOpen] = useState(false);
    const [selectedPdfNna, setSelectedPdfNna] = useState<{ id: number, name: string, codigoFicha03?: string | null } | null>(null);

    const isNacional = user && [ROLES.ADMIN_NACIONAL, ROLES.MONITOR, ROLES.ESTADISTICO].includes(user.rol);
    const [selectedSede, setSelectedSede] = useState('TODAS');

    // Extraer sedes únicas disponibles
    const sedesDisponibles = Array.from(
        new Set(
            nnas
                .map(nna => nna.casos?.[0]?.sede_id ? `Sede ${nna.casos[0].sede_id}` : null)
                .filter(Boolean)
        )
    );

    const handleModalClose = () => {
        setIsDerivacionOpen(false);
        setSelectedCase(null);
        fetchAllNnas(); // Refresca la grilla tras cerrar (derivación exitosa o cancelada)
    };

    const handleDerivar = (nna: any) => {
        const activeCase = nna.casos?.find((c: any) => c.estado !== 'CERRADO');
        if (activeCase) {
            setSelectedCase({
                nnaId: nna.id,
                casoId: activeCase.id,
                nnaName: `${nna.nombres} ${nna.apellidoPaterno} ${nna.apellidoMaterno}`
            });
            setIsDerivacionOpen(true);
        } else {
            alert('Este beneficiario no tiene casos activos para derivar.');
        }
    };

    // Filter Logic
    const filteredNnas = nnas.filter(nna => {
        // Filtro de Sede para roles nacionales
        if (isNacional && selectedSede !== 'TODAS') {
            const sedeNna = nna.casos?.[0]?.sede_id ? `Sede ${nna.casos[0].sede_id}` : '';
            if (sedeNna !== selectedSede) return false;
        }

        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        const fullName = `${nna.nombres} ${nna.apellidoPaterno} ${nna.apellidoMaterno}`.toLowerCase();
        const dni = nna.numeroDoc?.toLowerCase() || '';
        const expediente = nna.carpeta?.codigo?.toLowerCase() || '';

        return fullName.includes(searchLower) ||
            dni.includes(searchLower) ||
            expediente.includes(searchLower);
    });

    const handleExport = () => {
        const headers = [
            'Expediente',
            'Carpeta Familiar',
            'Nombres',
            'Apellido Paterno',
            'Apellido Materno',
            'Documento',
            'Fecha Nacimiento',
            'Edad',
            'Sexo',
            'Estado Caso',
            'Educador Responsable',
            'Fecha Registro'
        ];

        const csvContent = [
            headers.join(','),
            ...filteredNnas.map(nna => {
                const activeCase = nna.casos?.[0]; // Usually latest or active
                const edad = calculateAge(nna.fechaNacimiento);
                return [
                    nna.carpeta?.codigo || '',
                    nna.carpeta?.id || '',
                    `"${nna.nombres}"`,
                    `"${nna.apellidoPaterno}"`,
                    `"${nna.apellidoMaterno}"`,
                    nna.numeroDoc || '',
                    nna.fechaNacimiento ? new Date(nna.fechaNacimiento).toLocaleDateString() : '',
                    edad,
                    nna.sexo || '',
                    activeCase?.estado || '',
                    activeCase?.responsable?.nombreCompleto ? `"${activeCase.responsable.nombreCompleto}"` : '',
                    new Date(nna.createdAt).toLocaleDateString()
                ].join(',');
            })
        ].join('\n');

        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `padron_nna_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-[22px] font-semibold text-fg tracking-tight">Beneficiarios (NNA)</h1>
                    <p className="text-fg-secondary text-[13px] mt-1">Gestión del padrón de Niños, Niñas y Adolescentes</p>
                </div>
                {canEdit && (
                    <Link to="/nna/nuevo">
                        <Button variant="primary" className="gap-2">
                            <Plus size={16} />
                            Nuevo Registro
                        </Button>
                    </Link>
                )}
            </div>

            {/* Filters Bar */}
            <div className="bg-surface p-4 rounded-lg border border-border flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" size={16} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, DNI o código..."
                        className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-md text-[13px] text-fg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors placeholder:text-fg-muted"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                {isNacional && (
                    <select
                        className="bg-surface border border-border rounded-md px-3 py-2 text-[13px] text-fg font-medium focus:outline-none focus:border-primary cursor-pointer transition-colors"
                        value={selectedSede}
                        onChange={(e) => setSelectedSede(e.target.value)}
                    >
                        <option value="TODAS">Todas las Sedes</option>
                        {sedesDisponibles.map(sede => (
                            <option key={sede} value={sede!}>{sede}</option>
                        ))}
                    </select>
                )}
                <Button variant="secondary" className="whitespace-nowrap">
                    Filtros Avanzados
                </Button>
                <Button variant="secondary" onClick={handleExport} className="gap-2 whitespace-nowrap">
                    <FileDown size={16} />
                    Exportar
                </Button>
            </div>

            {/* Table */}
            <div className="bg-surface rounded-lg border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-[13px]">
                        <thead className="bg-surface-muted border-b border-border">
                            <tr>
                                <th className="px-4 py-3 font-semibold text-fg-secondary w-56 whitespace-nowrap">Expediente</th>
                                <th className="px-4 py-3 font-semibold text-fg-secondary">Beneficiario</th>
                                <th className="px-4 py-3 font-semibold text-fg-secondary">Ficha 03</th>
                                <th className="px-4 py-3 font-semibold text-fg-secondary">Edad / Sexo</th>
                                <th className="px-4 py-3 font-semibold text-fg-secondary">Fecha Reg.</th>
                                <th className="px-4 py-3 font-semibold text-fg-secondary">Casos Activos</th>
                                <th className="px-4 py-3 font-semibold text-fg-secondary text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-fg-muted">
                                        Cargando datos...
                                    </td>
                                </tr>
                            ) : filteredNnas.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-fg-muted">
                                        {searchTerm ? 'No se encontraron resultados.' : 'No hay beneficiarios registrados.'}
                                    </td>
                                </tr>
                            ) : (
                                // Grouping Logic — usar carpetaId como clave para no depender del objeto carpeta
                                Object.values(filteredNnas.reduce((acc: any, nna) => {
                                    const key = nna.carpeta?.id != null ? `carpeta-${nna.carpeta?.id}` : `nna-${nna.id}`;
                                    if (!acc[key]) acc[key] = [];
                                    acc[key].push(nna);
                                    return acc;
                                }, {})).map((group: any, groupIndex) => (
                                    <React.Fragment key={groupIndex}>
                                        {/* Spacer Row between groups (except first) */}
                                        {groupIndex > 0 && (
                                            <tr>
                                                <td colSpan={7} className="h-3 bg-bg border-none"></td>
                                            </tr>
                                        )}

                                        {group.map((nna: any, idx: number) => (
                                            <tr key={nna.id} className="hover:bg-surface-muted/50 transition-colors bg-surface relative">
                                                {/* Render Expediente Cell only for the first item in the group */}
                                                {idx === 0 && (
                                                    <td className="px-4 py-3 align-top border-r border-border bg-surface-muted/30" rowSpan={group.length}>
                                                        <div className="flex flex-col gap-2.5 sticky top-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="bg-warning-soft text-warning p-1.5 rounded-md">
                                                                    <Briefcase size={16} />
                                                                </div>
                                                                <div>
                                                                    <span className="font-mono text-[13px] font-semibold text-fg block whitespace-nowrap">
                                                                        {nna.carpeta?.codigo || '---'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            {group.length > 1 && (
                                                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-info-soft text-info rounded-md text-[11px] font-semibold w-fit ml-0.5">
                                                                    <User size={12} />
                                                                    {group.length} Beneficiarios
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                )}

                                                <td className={clsx("px-4 py-3 border-r border-border", idx > 0 ? "border-t border-border" : "")}>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-primary-soft flex items-center justify-center text-primary font-bold text-[12px] shrink-0">
                                                            {(nna?.nombres || '').charAt(0)}{(nna?.apellidoPaterno || '').charAt(0)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-semibold text-fg text-[13px] truncate">{nna.nombres} {nna.apellidoPaterno}</p>
                                                                {isNacional && nna.casos?.[0]?.sede_id && (
                                                                    <span className="inline-flex px-1.5 py-0.5 bg-[#f1f5f9] border border-gray-200 text-gray-600 rounded text-[9px] font-bold uppercase shrink-0">
                                                                        Sede {nna.casos[0].sede_id}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-[11px] text-fg-muted truncate max-w-[150px]">{nna.apellidoMaterno}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className={clsx("px-4 py-3 border-r border-border", idx > 0 ? "border-t border-border" : "")}>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${nna.codigoFicha03 ? 'bg-primary-soft text-primary' : 'text-fg-muted bg-surface-muted'}`}>
                                                        {nna.codigoFicha03 || '---'}
                                                    </span>
                                                </td>
                                                <td className={clsx("px-4 py-3 border-r border-border", idx > 0 ? "border-t border-border" : "")}>
                                                    <p className="text-fg font-medium text-[13px]">{calculateAge(nna.fechaNacimiento)} años</p>
                                                    <p className="text-[11px] text-fg-muted capitalize">
                                                        {['1', 'M'].includes(String(nna.sexo).trim().toUpperCase()) ? 'Hombre' : ['2', 'F'].includes(String(nna.sexo).trim().toUpperCase()) ? 'Mujer' : '-'}
                                                    </p>
                                                </td>
                                                <td className={clsx("px-4 py-3 border-r border-border", idx > 0 ? "border-t border-border" : "")}>
                                                    <p className="text-[13px] text-fg font-mono">
                                                        {nna.createdAt ? new Date(nna.createdAt).toLocaleDateString() : '-'}
                                                    </p>
                                                </td>
                                                <td className={clsx("px-4 py-3 border-r border-border", idx > 0 ? "border-t border-border" : "")}>
                                                    {nna.casos?.length > 0 ? (
                                                        <div className="flex flex-col gap-1.5">
                                                            {nna.casos.map((c: any) => (
                                                                <span key={c.id} className="inline-flex items-center px-2 py-0.5 rounded-md bg-success-soft text-success text-[11px] font-semibold w-fit">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-success mr-1.5"></div>
                                                                    {c.estado}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-fg-muted text-[11px] italic">Sin caso activo</span>
                                                    )}
                                                </td>
                                                {/* Actions Column */}
                                                {idx === 0 && (
                                                    <td className="px-4 py-3 text-right align-middle bg-surface-muted/30" rowSpan={group.length}>
                                                        <div className="flex items-center justify-end gap-1.5 h-full">
                                                            <Link
                                                                to={`/nna/expediente/${nna.carpeta?.id ?? nna.id}?nnaId=${nna.id}`}
                                                                title="Abrir Expediente"
                                                                className="p-1.5 bg-primary text-primary-fg rounded-md hover:bg-primary/90 transition-colors"
                                                            >
                                                                <FolderOpen size={15} />
                                                            </Link>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedPdfNna({
                                                                        id: nna.id,
                                                                        name: `${nna.nombres} ${nna.apellidoPaterno} ${nna.apellidoMaterno}`,
                                                                        codigoFicha03: nna.codigoFicha03
                                                                    });
                                                                    setIsPdfOpen(true);
                                                                }}
                                                                title="Ver Ficha PDF"
                                                                className="p-1.5 bg-surface text-fg-muted border border-border rounded-md hover:text-primary hover:border-primary/30 hover:bg-primary-soft transition-colors"
                                                            >
                                                                <FileText size={15} />
                                                            </button>
                                                            {canEdit && (
                                                                <Link
                                                                    to={`/nna/editar/${nna.id}`}
                                                                    title="Editar"
                                                                    className="p-1.5 bg-surface text-fg-muted border border-border rounded-md hover:text-primary hover:border-primary/30 hover:bg-primary-soft transition-colors"
                                                                >
                                                                    <Pencil size={15} />
                                                                </Link>
                                                            )}
                                                            {canEdit && (
                                                                <button
                                                                    onClick={() => handleDerivar(nna)}
                                                                    title="Derivar"
                                                                    className="p-1.5 bg-surface text-fg-muted border border-border rounded-md hover:text-warning hover:border-warning/30 hover:bg-warning-soft transition-colors"
                                                                >
                                                                    <ArrowRightCircle size={15} />
                                                                </button>
                                                            )}
                                                            <button className="p-1.5 bg-surface text-fg-muted border border-border rounded-md hover:bg-surface-muted transition-colors">
                                                                <MoreHorizontal size={15} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedCase && (
                <DerivacionModal
                    isOpen={isDerivacionOpen}
                    onClose={handleModalClose}
                    nnaId={selectedCase.nnaId}
                    casoId={selectedCase.casoId}
                    nnaName={selectedCase.nnaName}
                />
            )}

            {selectedPdfNna && (
                <PdfViewerModal
                    isOpen={isPdfOpen}
                    onClose={() => {
                        setIsPdfOpen(false);
                        setSelectedPdfNna(null);
                    }}
                    nnaId={selectedPdfNna.id}
                    nnaName={selectedPdfNna.name}
                />
            )}
        </div>
    );
};