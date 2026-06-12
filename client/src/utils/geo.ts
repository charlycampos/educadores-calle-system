// ── Geolocalización para el diario de campo ──────────────────────────────────
// La API del navegador requiere HTTPS (o localhost) y permiso del usuario.
// Si falla, el registro sigue funcionando solo con la ubicación en texto.

export interface Coordenadas {
    latitud: number;
    longitud: number;
    /** Precisión reportada por el dispositivo, en metros */
    precision: number;
}

export function capturarUbicacion(): Promise<Coordenadas> {
    return new Promise((resolve, reject) => {
        if (!('geolocation' in navigator)) {
            reject(new Error('Este dispositivo no soporta geolocalización'));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            pos => resolve({
                latitud: Number(pos.coords.latitude.toFixed(7)),
                longitud: Number(pos.coords.longitude.toFixed(7)),
                precision: Math.round(pos.coords.accuracy),
            }),
            err => {
                const msgs: Record<number, string> = {
                    1: 'Permiso de ubicación denegado',
                    2: 'No se pudo determinar la ubicación',
                    3: 'La captura de ubicación tardó demasiado',
                };
                reject(new Error(msgs[err.code] || 'Error de geolocalización'));
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    });
}

/** URL para ver unas coordenadas en OpenStreetMap (pestaña nueva, sin API key) */
export function urlMapa(latitud: number, longitud: number): string {
    return `https://www.openstreetmap.org/?mlat=${latitud}&mlon=${longitud}#map=18/${latitud}/${longitud}`;
}
