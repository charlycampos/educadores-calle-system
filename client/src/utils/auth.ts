// Punto único de acceso al token de sesión.
// Si en el futuro se migra a cookies HttpOnly u otro almacenamiento,
// solo hay que cambiar este archivo.

const TOKEN_KEY = 'token';

export function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
}

/** Cabeceras de autorización listas para fetch: { Authorization: 'Bearer ...' } */
export function authHeaders(): Record<string, string> {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Token corto de descarga (para URLs de PDF) ───────────────────────────────
// El backend solo acepta tokens con scope=download en query params (?token=...),
// así el JWT de sesión de 8h nunca viaja en URLs ni queda en logs/historial.
import { AUTH_API_URL } from '../config/api';

let _downloadToken: { token: string; expiresAt: number } | null = null;

export async function getDownloadToken(): Promise<string> {
    // Caché de 4 min (el token dura 5)
    if (_downloadToken && Date.now() < _downloadToken.expiresAt) {
        return _downloadToken.token;
    }
    const res = await fetch(`${AUTH_API_URL}/auth/download-token`, {
        method: 'POST',
        headers: authHeaders(),
    });
    if (!res.ok) throw new Error('No se pudo obtener el token de descarga');
    const data = await res.json();
    _downloadToken = { token: data.token, expiresAt: Date.now() + 4 * 60 * 1000 };
    return data.token;
}
