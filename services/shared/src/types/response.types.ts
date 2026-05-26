/**
 * Formato estándar de respuesta para todos los microservicios.
 * Garantiza consistencia en la API.
 */
export interface ApiResponse<T = void> {
  success: boolean;
  data?:   T;
  message?: string;
  errors?:  string[];
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total:   number;
  page:    number;
  limit:   number;
  pages:   number;
}

/** Helper para crear respuestas exitosas */
export const ok = <T>(data: T, message?: string): ApiResponse<T> => ({
  success: true,
  data,
  message,
});

/** Helper para crear respuestas de error */
export const fail = (message: string, errors?: string[]): ApiResponse => ({
  success: false,
  message,
  errors,
});
