import { apiFetch } from './api';

// Modelos prontos por nicho (backend: docs/MODELOS_NICHO.md em cherry-backend). Só admin.
export async function listarModelosNicho() {
  return (await apiFetch('/modelos-nicho')).data;
}

// Cria níveis, categorias e o padrão de SKU de produto de partida. 409 se a empresa já organizou as categorias.
export async function aplicarModeloNicho(id) {
  return (await apiFetch(`/modelos-nicho/${encodeURIComponent(id)}/aplicar`, { method: 'POST', body: '{}' })).data;
}
