import { apiFetch } from './api';

export async function buscarResumoDashboard({ dias } = {}) {
  const params = dias ? `?${new URLSearchParams({ dias })}` : '';
  const body = await apiFetch(`/dashboard${params}`);
  return body.data;
}
