import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Mapa de abordajes (GPS fase 2) ───────────────────────────────────────────
// Pinta los diarios de campo con coordenadas sobre OpenStreetMap (gratuito,
// sin API key). Un punto por registro, coloreado por tipo de actividad.

export interface PuntoDiario {
    latitud: number;
    longitud: number;
    tipoActividad: string;
    nnaNombre: string;
    educadorNombre: string;
    fecha: string;
    ubicacion?: string;
}

const COLOR_TIPO: Record<string, string> = {
    CONSEJERIA: '#6366f1',    // índigo
    VISITA: '#f59e0b',        // ámbar
    COORDINACION: '#a855f7',  // morado
    RECORRIDO: '#10b981',     // esmeralda
};

const LABEL_TIPO: Record<string, string> = {
    CONSEJERIA: 'Consejería',
    VISITA: 'Visita domiciliaria',
    COORDINACION: 'Coordinación',
    RECORRIDO: 'Abordaje / Campo',
};

interface Props {
    puntos: PuntoDiario[];
    /** Alto del mapa en px (default 380) */
    alto?: number;
}

export const MapaDiarios = ({ puntos, alto = 380 }: Props) => {
    const contenedorRef = useRef<HTMLDivElement | null>(null);
    const mapaRef = useRef<L.Map | null>(null);
    const capaRef = useRef<L.LayerGroup | null>(null);

    // Crear el mapa una sola vez
    useEffect(() => {
        if (!contenedorRef.current || mapaRef.current) return;
        const mapa = L.map(contenedorRef.current, {
            center: [-12.0464, -77.0428], // Lima por defecto; se ajusta a los puntos
            zoom: 12,
            scrollWheelZoom: false, // evita zooms accidentales al hacer scroll en la página
        });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(mapa);
        capaRef.current = L.layerGroup().addTo(mapa);
        mapaRef.current = mapa;

        return () => {
            mapa.remove();
            mapaRef.current = null;
            capaRef.current = null;
        };
    }, []);

    // Redibujar puntos cuando cambian
    useEffect(() => {
        const mapa = mapaRef.current;
        const capa = capaRef.current;
        if (!mapa || !capa) return;
        capa.clearLayers();

        const validos = puntos.filter(p => p.latitud != null && p.longitud != null);
        if (!validos.length) return;

        validos.forEach(p => {
            const color = COLOR_TIPO[p.tipoActividad] || '#6b7280';
            const fecha = new Date(p.fecha);
            L.circleMarker([p.latitud, p.longitud], {
                radius: 8,
                color: '#ffffff',
                weight: 2,
                fillColor: color,
                fillOpacity: 0.9,
            }).bindPopup(
                `<div style="font-size:12px;line-height:1.5">
                    <strong>${LABEL_TIPO[p.tipoActividad] || p.tipoActividad}</strong><br/>
                    NNA: ${p.nnaNombre}<br/>
                    Educador: ${p.educadorNombre}<br/>
                    ${p.ubicacion ? `Lugar: ${p.ubicacion}<br/>` : ''}
                    ${fecha.toLocaleDateString('es-PE')} ${fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                </div>`
            ).addTo(capa);
        });

        // Encuadrar el mapa a los puntos
        const bounds = L.latLngBounds(validos.map(p => [p.latitud, p.longitud] as [number, number]));
        mapa.fitBounds(bounds.pad(0.2), { maxZoom: 16 });
    }, [puntos]);

    return (
        <div className="space-y-2">
            <div ref={contenedorRef} style={{ height: alto }} className="rounded-xl border border-gray-200 z-0" />
            <div className="flex items-center gap-3 flex-wrap text-[10px] font-bold text-gray-500">
                {Object.entries(LABEL_TIPO).map(([tipo, label]) => (
                    <span key={tipo} className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full inline-block border border-white shadow-sm"
                            style={{ backgroundColor: COLOR_TIPO[tipo] }} />
                        {label}
                    </span>
                ))}
            </div>
        </div>
    );
};
