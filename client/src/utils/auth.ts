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
