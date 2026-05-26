import React from 'react';
import { X } from 'lucide-react';
import { useAuthStore } from '../../../store/auth.store';
import { NNA_API_URL, EXPEDIENTE_API_URL } from '../../../config/api';

interface PdfViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    nnaId: number;
    nnaName: string;
    documentFilename?: string;
    title?: string;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({ isOpen, onClose, nnaId, nnaName, documentFilename, title }) => {
    const token = useAuthStore.getState().token;
    
    if (!isOpen) return null;

    // Direct stream URL using the query parameter token for authentication
    const pdfUrl = documentFilename
        ? `${EXPEDIENTE_API_URL}/expediente/documento/${documentFilename}?token=${token}`
        : `${NNA_API_URL}/nna/${nnaId}/pdf?token=${token}`;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-5xl w-full h-[90vh] flex flex-col overflow-hidden animate-scaleUp">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-150 flex items-center justify-between bg-slate-50">
                    <div className="min-w-0">
                        <h3 className="text-sm font-black text-gray-800 uppercase tracking-wide truncate">
                            {title || "Ficha de Inscripción (F03)"}
                        </h3>
                        <p className="text-xs text-gray-500 font-bold mt-0.5 truncate">
                            Vista previa oficial · {nnaName}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-200 rounded-full transition-all text-gray-600 hover:text-gray-900"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 bg-gray-100 flex items-center justify-center relative overflow-hidden">
                    <iframe
                        src={pdfUrl}
                        className="w-full h-full border-none"
                        title={`Ficha F03 - ${nnaName}`}
                    />
                </div>
            </div>
        </div>
    );
};
