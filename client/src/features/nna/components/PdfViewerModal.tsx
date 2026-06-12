import { useState, useEffect } from 'react';
import { X, FileWarning } from 'lucide-react';
import { NNA_API_URL, EXPEDIENTE_API_URL } from '../../../config/api';
import { getDownloadToken } from '../../../utils/auth';

interface PdfViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    nnaId: number;
    nnaName: string;
    documentFilename?: string;
    title?: string;
    pdfUrl?: string;
    codigoFicha03?: string | null;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({ isOpen, onClose, nnaId, nnaName, documentFilename, title, pdfUrl: pdfUrlProp, codigoFicha03 }) => {
    // Token corto de descarga (scope=download): el JWT de sesión nunca va en la URL
    const [dlToken, setDlToken] = useState<string | null>(null);
    useEffect(() => {
        if (isOpen) getDownloadToken().then(setDlToken).catch(() => setDlToken(null));
    }, [isOpen]);

    if (!isOpen) return null;

    // Check if it is a draft F03 sheet
    const isDraftF03 = !documentFilename && !pdfUrlProp && !codigoFicha03;

    const baseUrl = pdfUrlProp
        ?? (documentFilename
            ? `${EXPEDIENTE_API_URL}/expediente/documento/${encodeURIComponent(documentFilename)}`
            : `${NNA_API_URL}/nna/${nnaId}/pdf`);
    const pdfUrl = dlToken ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}token=${dlToken}` : '';

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
                <div className="flex-1 bg-gray-50 flex items-center justify-center relative overflow-hidden p-6">
                    {isDraftF03 ? (
                        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-gray-200 shadow-md flex flex-col items-center text-center space-y-4 animate-scaleUp">
                            <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-200 animate-pulse">
                                <FileWarning size={32} />
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-[16px] font-black text-gray-800 uppercase tracking-wider">
                                    Ficha en Estado Borrador
                                </h4>
                                <p className="text-xs text-gray-500 font-semibold leading-relaxed">
                                    Este registro se guardó como borrador. Aún no se han ingresado los datos obligatorios necesarios para finalizar y registrar la Ficha F03 oficial.
                                </p>
                            </div>
                            <div className="w-full pt-4 border-t border-gray-100">
                                <p className="text-[11px] text-amber-600 font-bold bg-amber-50/50 py-2 px-3 rounded-lg border border-amber-100">
                                    Por favor, complete y registre los datos desde el botón de edición de la grilla para generar el PDF oficial.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <iframe
                            src={pdfUrl}
                            className="w-full h-full border-none"
                            title={`Ficha F03 - ${nnaName}`}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};
