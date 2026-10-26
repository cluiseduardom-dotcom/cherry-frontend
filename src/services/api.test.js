import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from './api';

function respostaOk() {
  return { ok: true, status: 200, json: async () => ({ success: true, data: {} }) };
}

afterEach(() => vi.unstubAllGlobals());

describe('apiFetch', () => {
  it('JSON: envia Content-Type application/json', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respostaOk());
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/x', { method: 'POST', body: JSON.stringify({ a: 1 }) });

    expect(fetchMock.mock.calls[0][1].headers['Content-Type']).toBe('application/json');
  });

  it('FormData (upload): não fixa Content-Type, para o navegador mandar o boundary', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respostaOk());
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/x', { method: 'POST', body: new FormData() });

    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty('Content-Type');
  });

  it('headers passados pelo chamador continuam valendo', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respostaOk());
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/x', { headers: { 'X-Teste': '1' }, body: new FormData() });

    expect(fetchMock.mock.calls[0][1].headers['X-Teste']).toBe('1');
  });
});
