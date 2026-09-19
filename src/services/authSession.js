const STORAGE_KEY = 'cherry.auth.session';

function storageDisponivel() {
  try {
    return typeof window !== 'undefined' && window.sessionStorage;
  } catch {
    return null;
  }
}

export function carregarSessao() {
  const storage = storageDisponivel();
  if (!storage) return null;

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw);
    if (!data?.token || !data?.user) {
      storage.removeItem(STORAGE_KEY);
      return null;
    }

    return data;
  } catch {
    storage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function salvarSessao(session) {
  const storage = storageDisponivel();
  if (!storage) return;

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Sessão continua em memória mesmo se o storage não estiver disponível.
  }
}

export function limparSessao() {
  const storage = storageDisponivel();
  if (!storage) return;

  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Nada a fazer: logout em memória continua válido.
  }
}
