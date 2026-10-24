import { afterEach, describe, expect, it, vi } from 'vitest';
import { buscarCep } from './cep';

afterEach(() => vi.unstubAllGlobals());

const resposta = (corpo, ok = true) => ({ ok, json: async () => corpo });

describe('services/cep', () => {
  it('consulta o ViaCEP só com os 8 dígitos e normaliza a resposta', async () => {
    const fetchMock = vi.fn().mockResolvedValue(resposta({
      logradouro: 'Praça da Sé', bairro: 'Sé', localidade: 'São Paulo', uf: 'SP',
    }));
    vi.stubGlobal('fetch', fetchMock);

    const r = await buscarCep('01001-000');

    expect(fetchMock.mock.calls[0][0]).toBe('https://viacep.com.br/ws/01001000/json/');
    expect(r).toEqual({ logradouro: 'Praça da Sé', bairro: 'Sé', cidade: 'São Paulo', uf: 'SP' });
  });

  it('CEP inexistente devolve null; CEP incompleto nem chama a rede', async () => {
    const fetchMock = vi.fn().mockResolvedValue(resposta({ erro: true }));
    vi.stubGlobal('fetch', fetchMock);

    expect(await buscarCep('99999999')).toBeNull();
    expect(await buscarCep('123')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('CEP geral (sem rua/bairro) volta com strings vazias', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta({ localidade: 'Santos', uf: 'SP' })));
    expect(await buscarCep('11000000')).toEqual({ logradouro: '', bairro: '', cidade: 'Santos', uf: 'SP' });
  });

  it('lança erro quando o serviço está indisponível', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta({}, false)));
    await expect(buscarCep('01001000')).rejects.toThrow();
  });
});
