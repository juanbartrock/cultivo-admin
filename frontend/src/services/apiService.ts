/**
 * API Service - Cliente HTTP base para todas las llamadas al backend
 *
 * Centraliza todas las comunicaciones con el backend NestJS.
 * Maneja errores y headers de forma consistente.
 */

const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    // Si estamos en el navegador, usar el mismo hostname pero con el puerto 4000
    return `${window.location.protocol}//${window.location.hostname}:4000/api`;
  }
  return 'http://localhost:4000/api';
};

export const API_BASE = getApiUrl();

/**
 * Realiza una petición HTTP al backend
 */
async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  // Buscar token con ambos nombres por compatibilidad
  const token = typeof window !== 'undefined' 
    ? (localStorage.getItem('access_token') || localStorage.getItem('token')) 
    : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options?.headers) {
    Object.assign(headers, options.headers);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers,
    ...options,
  });

  if (!response.ok) {
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('token');
        // Evitar bucle de redirección si ya estamos en login
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  // Manejar respuestas vacías (204 No Content)
  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  return JSON.parse(text);
}

/**
 * Cliente API con métodos para cada tipo de petición HTTP
 */
export const api = {
  /**
   * GET request
   */
  get: <T>(endpoint: string) => request<T>(endpoint),

  /**
   * POST request
   */
  post: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  /**
   * PUT request
   */
  put: <T>(endpoint: string, data: unknown) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /**
   * PATCH request
   */
  patch: <T>(endpoint: string, data: unknown) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  /**
   * DELETE request
   */
  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
};

export default api;
