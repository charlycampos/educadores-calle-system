/**
 * SEC · NnaListPage rediseñado
 * - Tabla limpia: solo divisores horizontales, sin bordes por celda
 * - Agrupación por carpeta con fila-encabezado (no rowSpan frágil)
 * - Avatar plano (sin gradiente)
 * - Acciones: 1 botón primario + menú "⋯" colapsado
 * - Empty state con CTA
 * - Sin alert() — toast / UI propio
 */

import React, { useEffect, useState } from 'react';
import { useNnaStore } from '../../store/nna.store';
import { Plus, Search, FileDown, MoreHorizontal, ArrowRightCircle, Briefcase, FileText, Pencil, FolderOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DerivacionModal } from './components/DerivacionModal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';

const calculateAge = (dob: string | Date | null): string | number => {
    if (!dob) return '—';
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 0 ? age : '—';
};

const ESTADO_TONE: Record<string, 'success' | 'warning' | 'neutral' | 'info'> = {
    ACTIVO:      'success',
    EN_PROCESO:  'info',
    PENDIENTE:   'warning',
    CERRADO:     'neutral',
};

export const NnaListPage = () => {
    const { nnas, isLoading, fetchAllNnas } = useNnaStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const [isDerivacionOpen, setIsDerivacionOpen] = useState(false);
    const [selectedCase, setSelectedCase] = useState<{ nnaId: number; casoId: number; nnaName: string } | null>(null);

    useEffect(() => { fetchAllNnas(); }, [fetchAllNnas]);

    const handleDerivar = (nna: any) => {
        const activeCase = nna.casos.find((c: any) => c.estado !== 'CERRADO');
        if (activeCase) {
            setSelectedCase({ nnaId: nna.id, casoId: activeCase.id, nnaName: `${nna.nombres} ${nna.apellidoPaterno} ${nna.apellidoMaterno}` });
            setIsDerivacionOpen(true);
        }
        setOpenMenuId(null);
    };

    const filteredNnas = nnas.filter(nna => {
        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        return [
            `${nna.nombres} ${nna.apellidoPaterno} ${nna.apellidoMaterno}`,
            nna.numeroDoc ?? '',
            nna.carpeta?.codigo ?? '',
        ].some(s => s.toLowerCase().includes(q));
    });

    const handleExport = () => {
        const headers = ['Expediente','Nombres','Apellido Paterno','Apellido Materno','Documento','Edad','Sexo','Estado','Responsable','Fecha Reg.'];
        const rows = filteredNnas.map(nna => {
            const c = nna.casos?.[0];
            return [
                nna.carpeta?.codigo ?? '',
                `"${nna.nombres}"`,
                `"${nna.apellidoPaterno}"`,
                `"${nna.apellidoMaterno}"`,
                nna.numeroDoc ?? '',
                calculateAge(nna.fechaNacimiento),
                nna.sexo === 'M' ? 'Masculino' : nna.sexo === 'F' ? 'Femenino' : '',
                c?.estado ?? '',
                c?.responsable?.nombreCompleto ? `"${c.responsable.nombreCompleto}"` : '',
                nna.createdAt ? new Date(nna.createdAt).toLocaleDateString() : '',
            ].join(',');
        });
        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `padron_nna_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    /* Agrupa NNA por código de carpeta */
    const groups: Record<string, typeof nnas> = {};
    filteredNnas.forEach(nna => {
        const key = nna.carpeta?.codigo ?? 'Sin expediente';
        if (!groups[key]) groups[key] = [];
        groups[key].push(nna);
    });

    return (
        <div className="space-y-6">

            {/* Cabecera */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-h1 text-fg">Beneficiarios (NNA)</h1>
                    <p className="text-body text-fg-secondary mt-1">Gestión del padrón de Niños, Niñas y Adolescentes</p>
                </div>
                <Link to="/nna/nuevo">
                    <Button iconLeft={<Plus size={15} />}>Nuevo registro</Button>
                </Link>
            </div>

            {/* Barra de filtros */}
            <div className="bg-surface border border-border rounded-lg p-3 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" size={15} aria-hidden="true" />
                    <input
                        type="search"
                        placeholder="Buscar por nombre, DNI o código de expediente…"
                        className="w-full pl-9 pr-4 py-2 bg-surface-muted border border-border rounded-md text-body text-fg placeholder:text-fg-muted focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button variant="secondary" iconLeft={<FileDown size={14} />} onClick={handleExport}>
                    Exportar CSV
                </Button>
            </div>

            {/* Tabla */}
            <div className="bg-surface border border-border rounded-lg overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center text-fg-secondary text-body">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        Cargando beneficiarios…
                    </div>
                ) : Object.keys(groups).length === 0 ? (
                    <div className="p-8">
                        <EmptyState
                            icon={FileText}
                            title={searchTerm ? 'Sin resultados' : 'Aún no hay beneficiarios registrados'}
                            description={searchTerm
                                ? `No se encontraron NNA para "${searchTerm}". Intenta con otro término.`
                                : 'Comienza creando la primera ficha 03 para abrir un expediente familiar.'}
                            action={!searchTerm ? (
                                <Link to="/nna/nuevo">
                                    <Button iconLeft={<Plus size={14} />} size="sm">Crear primer registro</Button>
                                </Link>
                            ) : undefined}
                        />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[13px]">
                            <thead className="border-b border-border bg-surface-muted">
                                <tr>
                                    <th className="px-5 py-3 font-semibold text-fg-secondary">Beneficiario</th>
                                    <th className="px-5 py-3 font-semibold text-fg-secondary">Documento</th>
                                    <th className="px-5 py-3 font-semibold text-fg-secondary">Edad / Sexo</th>
                                    <th className="px-5 py-3 font-semibold text-fg-secondary">Ficha 03</th>
                                    <th className="px-5 py-3 font-semibold text-fg-secondary">Estado</th>
                                    <th className="px-5 py-3 font-semibold text-fg-secondary">Fecha reg.</th>
                                    <th className="px-5 py-3 text-right"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(groups).map(([codigo, group]) => (
                                    <React.Fragment key={codigo}>
                                        {/* Fila-encabezado de expediente */}
                                        <tr className="bg-surface-muted border-y border-border">
                                            <td colSpan={7} className="px-5 py-2">
                                                <div className="flex items-center gap-2.5">
                                                    <Briefcase size={13} className="text-fg-muted" aria-hidden="true" />
                                                    <span className="font-mono text-[12px] font-semibold text-fg">{codigo}</span>
                                                    <span className="text-fg-muted text-[11px]">·</span>
                                                    <span className="text-[11px] text-fg-muted">
                                                        {group.length} {group.length === 1 ? 'beneficiario' : 'beneficiarios'}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Filas de NNA */}
                                        {group.map((nna: any) => {
                                            const activeCase = nna.casos?.find((c: any) => c.estado !== 'CERRADO') ?? nna.casos?.[0];
                                            const tone = activeCase ? (ESTADO_TONE[activeCase.estado] ?? 'neutral') : 'neutral';
                                            return (
                                                <tr key={nna.id} className="border-b border-border last:border-0 hover:bg-surface-muted/50 transition-colors">

                                                    {/* Beneficiario */}
                                                    <td className="px-5 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-primary-soft text-primary text-[11px] font-bold grid place-items-center flex-shrink-0" aria-hidden="true">
                                                                {nna.nombres.charAt(0)}{(nna.apellidoPaterno ?? '').charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-fg">{nna.nombres} {nna.apellidoPaterno}</p>
                                                                <p className="text-fg-muted text-[11px]">{nna.apellidoMaterno}</p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Documento */}
                                                    <td className="px-5 py-3">
                                                        <p className="text-[11px] font-semibold text-fg-muted uppercase">{nna.tipoDoc}</p>
                                                        <p className="font-mono text-fg">{nna.numeroDoc ?? '—'}</p>
                                                    </td>

                                                    {/* Edad / Sexo */}
                                                    <td className="px-5 py-3">
                                                        <p className="font-medium text-fg">{calculateAge(nna.fechaNacimiento)} años</p>
                                                        <p className="text-fg-muted text-[11px]">
                                                            {nna.sexo === 'M' ? 'Masculino' : nna.sexo === 'F' ? 'Femenino' : '—'}
                                                        </p>
                                                    </td>

                                                    {/* Ficha 03 */}
                                                    <td className="px-5 py-3">
                                                        {nna.codigoFicha03
                                                            ? <span className="font-mono text-[12px] font-semibold text-primary bg-primary-soft px-2 py-0.5 rounded-md">{nna.codigoFicha03}</span>
                                                            : <span className="text-fg-muted text-[12px]">—</span>
                                                        }
                                                    </td>

                                                    {/* Estado */}
                                                    <td className="px-5 py-3">
                                                        {activeCase
                                                            ? <Badge tone={tone} dot>{activeCase.estado}</Badge>
                                                            : <span className="text-fg-muted text-[12px]">Sin caso</span>
                                                        }
                                                    </td>

                                                    {/* Fecha */}
                                                    <td className="px-5 py-3 text-fg-muted font-mono text-[12px]">
                                                        {nna.createdAt ? new Date(nna.createdAt).toLocaleDateString('es-PE') : '—'}
                                                    </td>

                                                    {/* Acciones */}
                                                    <td className="px-5 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <Link
                                                                to={`/nna/expediente/${nna.id}`}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-fg text-[12px] font-medium rounded-md hover:bg-primary-hover transition-colors"
                                                                title="Abrir expediente"
                                                            >
                                                                <FolderOpen size={13} /> Expediente
                                                            </Link>

                                                            {/* Menú contextual */}
                                                            <div className="relative">
                                                                <button
                                                                    onClick={() => setOpenMenuId(openMenuId === nna.id ? null : nna.id)}
                                                                    className="p-1.5 text-fg-muted hover:text-fg hover:bg-surface-muted rounded-md transition-colors"
                                                                    aria-label="Más acciones"
                                                                >
                                                                    <MoreHorizontal size={15} />
                                                                </button>
                                                                {openMenuId === nna.id && (
                                                                    <>
                                                                        <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} aria-hidden="true" />
                                                                        <div className="absolute right-0 top-8 z-20 bg-surface border border-border rounded-lg shadow-[var(--shadow-3)] py-1 w-44">
                                                                            <Link
                                                                                to={`/nna/ficha/${nna.id}`}
                                                                                className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-fg hover:bg-surface-muted"
                                                                                onClick={() => setOpenMenuId(null)}
                                                                            >
                                                                                <FileText size={13} className="text-fg-muted" /> Ver ficha
                                                                            </Link>
                                                                            <Link
                                                                                to={`/nna/editar/${nna.id}`}
                                                                                className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-fg hover:bg-surface-muted"
                                                                                onClick={() => setOpenMenuId(null)}
                                                                            >
                                                                                <Pencil size={13} className="text-fg-muted" /> Editar ficha
                                                                            </Link>
                                                                            <hr className="my-1 border-border" />
                                                                            <button
                                                                                onClick={() => handleDerivar(nna)}
                                                                                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-fg hover:bg-surface-muted"
                                                                            >
                                                                                <ArrowRightCircle size={13} className="text-fg-muted" /> Derivar caso
                                                                            </button>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {selectedCase && (
                <DerivacionModal
                    isOpen={isDerivacionOpen}
                    onClose={() => setIsDerivacionOpen(false)}
                    nnaId={selectedCase.nnaId}
                    casoId={selectedCase.casoId}
                    nnaName={selectedCase.nnaName}
                />
            )}
        </div>
    );
};
