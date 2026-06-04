import React from 'react';
import { X } from 'lucide-react';
import type { DuplicateCheckResult } from '../types/nna-form.types';

interface DuplicateDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    results: DuplicateCheckResult | null;
}

export const DuplicateDrawer: React.FC<DuplicateDrawerProps> = ({ isOpen, onClose, results }) => {
    if (!isOpen || !results) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-40 overflow-y-auto animate-slideInRight border-l border-gray-200">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                <h2 className="font-bold text-gray-800 text-sm">Verificación Nacional de Duplicados</h2>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                    <X size={20} />
                </button>
            </div>
            <div className="p-4 space-y-4">
                <div className={`p-3 rounded-lg ${results.status === 'duplicate' ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-yellow-50 border border-yellow-200 text-yellow-800'}`}>
                    <p className="text-xs font-black uppercase tracking-wider mb-1">
                        {results.status === 'duplicate' ? '¡Duplicado Crítico!' : 'Alerta de Homónimo'}
                    </p>
                    <p className="text-sm font-semibold">{results.message}</p>
                </div>
                {results.matches && results.matches.map((match: any, i) => (
                    <div key={i} className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm flex flex-col gap-2 hover:border-blue-200 transition-all">
                        <p className="font-bold text-sm text-gray-800 uppercase">{match.nombres} {match.apellidoPaterno} {match.apellidoMaterno}</p>
                        <div className="grid grid-cols-2 gap-2 border-t pt-2 text-xs text-gray-500">
                            <div>
                                <span className="font-bold text-[9px] uppercase text-gray-400 block">DNI / Doc</span>
                                <span className="font-semibold text-gray-700">{match.numeroDoc || 'Sin Doc'}</span>
                            </div>
                            <div>
                                <span className="font-bold text-[9px] uppercase text-gray-400 block">Sede de Origen</span>
                                <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded inline-block mt-0.5">{match.sede || 'No especificada'}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
