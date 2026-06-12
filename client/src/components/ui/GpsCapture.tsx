import { useState } from 'react';
import { LocateFixed, Loader2, X } from 'lucide-react';
import { capturarUbicacion, type Coordenadas } from '../../utils/geo';

// Botón de captura GPS para el diario de campo.
// Opcional por diseño: si el permiso falla, el registro sigue con la ubicación en texto.

interface Props {
    coords: Coordenadas | null;
    onChange: (c: Coordenadas | null) => void;
}

export const GpsCapture = ({ coords, onChange }: Props) => {
    const [capturando, setCapturando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const capturar = async () => {
        setCapturando(true);
        setError(null);
        try {
            onChange(await capturarUbicacion());
        } catch (e: any) {
            setError(e.message || 'No se pudo capturar');
            onChange(null);
        } finally {
            setCapturando(false);
        }
    };

    return (
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {coords ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-lg">
                    <LocateFixed size={12} />
                    Ubicación capturada (±{coords.precision} m)
                    <button type="button" onClick={() => onChange(null)}
                        className="opacity-50 hover:opacity-100 transition-opacity" title="Quitar coordenadas">
                        <X size={11} />
                    </button>
                </span>
            ) : (
                <button type="button" onClick={capturar} disabled={capturando}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-gray-600 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-colors disabled:opacity-50">
                    {capturando ? <Loader2 size={12} className="animate-spin" /> : <LocateFixed size={12} />}
                    {capturando ? 'Capturando...' : 'Capturar ubicación GPS'}
                </button>
            )}
            {error && <span className="text-[10px] text-amber-600 font-medium">{error} — el registro se guardará solo con el texto</span>}
        </div>
    );
};
