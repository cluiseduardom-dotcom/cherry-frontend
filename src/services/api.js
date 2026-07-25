const BASE_URL = import.meta.env.VITE_API_URL;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

let bridge = { getToken: () => null, onUnauthorized: () => {} };

export function setAuthBridge(next) {
  bridge = next;
}

export async function apiFetch(path, { skipAuthRedirect = false, headers, ...options } = {}) {
  const token = bridge.getToken();

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch {
    throw new ApiError('Não foi possível conectar ao servidor. Verifique se o backend está no ar.', 0);
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    // resposta sem corpo JSON (ex: 204)
  }

  if (response.status === 401 && !skipAuthRedirect) {
    bridge.onUnauthorized();
  }

  if (!response.ok) {
    throw new ApiError(body?.message || 'Erro inesperado. Tente novamente.', response.status);
  }

  return body;
}
