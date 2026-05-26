import { Plus, Edit2, Eye, TrendingUp, Calendar, User, Clock } from 'lucide-react';
import { useState } from 'react';

interface LogrosListProps {
    nnaId: number;
    nnaFullName: string;
    onNuevoLogro: () => void;
    onVerLogro: (id: number) => void;
    onEditarLogro: (id: number) => void;
}

export const LogrosList = ({ nnaId, nnaFullName, onNuevoLogro, onVerLogro, onEditarLogro }: LogrosListProps) => {
    // TODO: reemplazar con fetch real al backend
    const [logros] = useState([
        { id: 1, fecha: '2024-01-15', fase: 'Fase I (Inicial)',  responsable: 'CARLOS CAMPOS', estado: 'FINALIZADO', avance: '100%' },
        { id: 2, fecha: '2024-02-10', fase: 'Fase II (Proceso)', responsable: 'CARLOS CAMPOS', estado: 'EN PROCESO', avance: '40%'  },
    ]);

    return (
        <div className="bg-surface rounded-[8px] border border-border shadow-1 overflow-hidden">

            {/* Header */}
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div>
                    <h3 className="text-[15px] font-semibold text-fg flex items-center gap-2">
                        <TrendingUp size={16} className="text-primary" />
                        Ficha de Proceso de Logros
                    </h3>
                    <p className="text-[12px] text-fg-2 mt-0.5">Formato 5 — Historial de evaluaciones de logros</p>
                </div>
                <button
                    onClick={onNuevoLogro}
                    className="flex items-center gap-1.5 bg-primary text-primary-fg px-3 py-1.5 rounded-[6px] text-[13px] font-medium hover:bg-primary/90 transition-colors"
                >
                    <Plus size={15} /> Nueva Ficha F05
                </button>
            </div>

            {/* Tabla */}
            <div className="overflow-x-auto">
                <table className="w-full text-[13px] border-collapse">
                    <thead>
                        <tr className="bg-surface-muted border-b border-border">
                            <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-fg-muted uppercase tracking-wider">Fase Evaluada</th>
                            <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-fg-muted uppercase tracking-wider">Fecha Evaluación</th>
                            <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-fg-muted uppercase tracking-wider">Responsable</th>
                            <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-fg-muted uppercase tracking-wider">Estado</th>
                            <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-fg-muted uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logros.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-14 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="p-4 bg-surface-muted rounded-full">
                                            <TrendingUp size={28} className="text-fg-muted" />
                                        </div>
                                        <p className="font-semibold text-fg text-[13px]">Sin registros de logros</p>
                                        <p className="text-[12px] text-fg-muted">
                                            Crea la primera ficha para comenzar el seguimiento.
                                        </p>
                                        <button
                                            onClick={onNuevoLogro}
                                            className="flex items-center gap-1.5 text-primary bg-primary-soft px-3 py-1.5 rounded-[6px] text-[12px] font-medium border border-primary/20 hover:bg-primary/10 transition-colors"
                                        >
                                            <Plus size={13} /> Crear primera ficha
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            logros.map(logro => (
                                <tr
                                    key={logro.id}
                                    className="border-b border-border last:border-b-0 hover:bg-surface-muted transition-colors group"
                                >
                                    <td className="px-4 py-3">
                                        <p className="font-semibold text-fg">{logro.fase}</p>
                                        <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-[11px] font-bold bg-primary-soft text-primary border border-primary/20">
                                            Avance: {logro.avance}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5 text-fg-2">
                                            <Calendar size={13} className="text-fg-muted" />
                                            {new Date(logro.fecha).toLocaleDateString('es-PE')}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5 text-fg-2 uppercase text-[11px] font-semibold">
                                            <User size={13} className="text-fg-muted" />
                                            {logro.responsable}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                            logro.estado === 'FINALIZADO'
                                                ? 'bg-success-soft text-success'
                                                : 'bg-warning-soft text-warning'
                                        }`}>
                                            {logro.estado === 'FINALIZADO'
                                                ? <TrendingUp size={10} />
                                                : <Clock size={10} />}
                                            {logro.estado}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => onVerLogro(logro.id)}
                                                title="Ver Ficha"
                                                className="p-1.5 text-fg-muted hover:text-primary hover:bg-primary-soft rounded-[5px] transition-all"
                                            >
                                                <Eye size={15} />
                                            </button>
                                            <button
                                                onClick={() => onEditarLogro(logro.id)}
                                                title="Editar Ficha"
                                                className="p-1.5 text-fg-muted hover:text-warning hover:bg-warning-soft rounded-[5px] transition-all"
                                            >
                                                <Edit2 size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            {logros.length > 0 && (
                <div className="px-5 py-3 bg-surface-muted border-t border-border text-[12px] text-fg-muted text-center">
                    Total:{' '}
                    <span className="font-semibold text-fg">{logros.length}</span>{' '}
                    ficha(s) de logros registrada(s)
                </div>
            )}
        </div>
    );
};
