import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./api', () => {
  class ApiError extends Error {
    constructor(message, status) {
      super(message);
      this.status = status;
    }
  }
  return { ApiError, apiFetch: vi.fn() };
});

import { apiFetch, ApiError } from './api';
import { buscarMarcaPublica, carregarMarcaLembrada, esquecerMarca, lembrarMarca, slugValido } from './marca';

function storageFalso(inicial = {}) {
  const dados = { ...inicial };
  return {
    getItem: k => (k in dados ? dados[k] : null),
    setItem: (k, v) => { dados[k] = String(v); },
    removeItem: k => { delete dados[k]; },
    dados,
  };
}

describe('slugValido', () => {
  it('aceita minúsculas, números e hífen no meio', () => {
    expect(slugValido('cherry')).toBe(true);
    expect(slugValido('valvazori-imports')).toBe(true);
    expect(slugValido('a1')).toBe(true);
  });

  it('recusa maiúsculas, espaços, barras, hífen nas pontas, vazio e não-texto', () => {
    for (const ruim of ['Cherry', 'a b', 'a/b', '-a', 'a-', '', '../x', 'a'.repeat(41), null, undefined, 3]) {
      expect(slugValido(ruim), String(ruim)).toBe(false);
    }
  });
});

describe('buscarMarcaPublica', () => {
  beforeEach(() => { apiFetch.mockReset(); });

  it('consulta o endereço público sem redirecionar em 401 e devolve só slug e tema', async () => {
    apiFetch.mockResolvedValue({ success: true, data: { slug: 'cherry', tema: 'cherry', extra: 'x' } });
    await expect(buscarMarcaPublica('Cherry')).resolves.toEqual({ slug: 'cherry', tema: 'cherry' });
    expect(apiFetch).toHaveBeenCalledWith('/publico/marca/cherry', { skipAuthRedirect: true });
  });

  it('slug malformado nem chega ao backend e conta como inexistente', async () => {
    await expect(buscarMarcaPublica('../etc')).resolves.toBeNull();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('404 = marca inexistente (null)', async () => {
    apiFetch.mockImplementation(async () => { throw new ApiError('Marca não encontrada', 404); });
    await expect(buscarMarcaPublica('nao-existe')).resolves.toBeNull();
  });

  it('falha de rede, 429 ou 5xx = desconhecido (undefined), para não apagar a marca lembrada', async () => {
    for (const status of [0, 429, 500]) {
      apiFetch.mockRejectedValueOnce(new ApiError('x', status));
      await expect(buscarMarcaPublica('cherry')).resolves.toBeUndefined();
    }
  });

  it('tema desconhecido devolvido pelo backend é tratado como resposta inválida', async () => {
    apiFetch.mockResolvedValue({ data: { slug: 'x1', tema: 'inexistente' } });
    await expect(buscarMarcaPublica('x1')).resolves.toBeUndefined();
  });
});

describe('marca lembrada no navegador', () => {
  let aviso;
  beforeEach(() => { aviso = vi.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => aviso.mockRestore());

  it('grava e lê só tema e slug', () => {
    const s = storageFalso();
    lembrarMarca({ tema: 'valvazori', slug: 'valvazori' }, s);
    expect(JSON.parse(s.dados['vertumno.marca'])).toEqual({ tema: 'valvazori', slug: 'valvazori' });
    expect(carregarMarcaLembrada(s)).toEqual({ tema: 'valvazori', slug: 'valvazori' });
  });

  it('tema inválido não é gravado; slug inválido é descartado', () => {
    const s = storageFalso();
    lembrarMarca({ tema: 'xpto', slug: 'a' }, s);
    expect(s.dados['vertumno.marca']).toBeUndefined();
    lembrarMarca({ tema: 'cherry', slug: 'A B' }, s);
    expect(carregarMarcaLembrada(s)).toEqual({ tema: 'cherry', slug: null });
  });

  it('conteúdo corrompido ou com tema desconhecido vira null', () => {
    expect(carregarMarcaLembrada(storageFalso({ 'vertumno.marca': '{nao-json' }))).toBeNull();
    expect(carregarMarcaLembrada(storageFalso({ 'vertumno.marca': '{"tema":"hack"}' }))).toBeNull();
    expect(carregarMarcaLembrada(storageFalso())).toBeNull();
  });

  it('esquecerMarca remove', () => {
    const s = storageFalso();
    lembrarMarca({ tema: 'cherry', slug: 'cherry' }, s);
    esquecerMarca(s);
    expect(carregarMarcaLembrada(s)).toBeNull();
  });

  it('storage que lança erro não derruba nada', () => {
    const quebrado = {
      getItem: () => { throw new Error('x'); },
      setItem: () => { throw new Error('x'); },
      removeItem: () => { throw new Error('x'); },
    };
    expect(carregarMarcaLembrada(quebrado)).toBeNull();
    expect(() => lembrarMarca({ tema: 'cherry' }, quebrado)).not.toThrow();
    expect(() => esquecerMarca(quebrado)).not.toThrow();
  });
});
