import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from './api';
import { buscarMarcacaoDaLoja, listarProdutosDaLoja, preencherTextosDoCadastro, salvarMarcacaoDaLoja } from './lojaProdutos';

vi.mock('./api', () => ({ apiFetch: vi.fn() }));

describe('services/lojaProdutos', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lista com os padrões (todos, página 1, 20 por página) e sem busca vazia', async () => {
    api.apiFetch.mockResolvedValueOnce({ data: { itens: [], total: 0 } });

    await listarProdutosDaLoja();

    expect(api.apiFetch).toHaveBeenCalledWith('/loja-produtos?situacao=todos&pagina=1&limite=20');
  });

  it('manda a busca já sem espaços nas pontas e a situação escolhida', async () => {
    api.apiFetch.mockResolvedValueOnce({ data: { itens: [], total: 0 } });

    await listarProdutosDaLoja({ situacao: 'publicados', busca: '  anel 50% ', pagina: 2, limite: 10 });

    const url = api.apiFetch.mock.calls[0][0];
    expect(url).toContain('situacao=publicados');
    expect(url).toContain('pagina=2');
    expect(url).toContain('limite=10');
    expect(new URL(`http://x${url}`).searchParams.get('busca')).toBe('anel 50%');
  });

  it('busca a marcação de um produto', async () => {
    api.apiFetch.mockResolvedValueOnce({ data: { produto_id: 7, visivel: false } });

    expect(await buscarMarcacaoDaLoja(7)).toEqual({ produto_id: 7, visivel: false });
    expect(api.apiFetch).toHaveBeenCalledWith('/produtos/7/loja');
  });

  it('salva por PUT, só com os campos que o backend aceita (o corpo dele é estrito)', async () => {
    api.apiFetch.mockResolvedValue({ data: { produto_id: 7 } });

    await salvarMarcacaoDaLoja(7, { visivel: true, titulo: 'Anel', custo: 9, preco: 10, empresa_id: 3 });

    const [url, opcoes] = api.apiFetch.mock.calls[0];
    expect(url).toBe('/produtos/7/loja');
    expect(opcoes.method).toBe('PUT');
    expect(JSON.parse(opcoes.body)).toEqual({ visivel: true, titulo: 'Anel' });
  });

  it('escolhe a peça para o carrossel de novidades (campo aceito pelo backend)', async () => {
    api.apiFetch.mockResolvedValue({ data: { produto_id: 7, carrossel_novidades: true } });

    await salvarMarcacaoDaLoja(7, { carrossel_novidades: true, preco: 1 });

    expect(JSON.parse(api.apiFetch.mock.calls[0][1].body)).toEqual({ carrossel_novidades: true });
  });

  it('escolhe a peça do destaque da Home (campo aceito pelo backend)', async () => {
    api.apiFetch.mockResolvedValue({ data: { produto_id: 7, destaque_home: true } });

    await salvarMarcacaoDaLoja(7, { destaque_home: true, preco: 1 });

    expect(JSON.parse(api.apiFetch.mock.calls[0][1].body)).toEqual({ destaque_home: true });
  });

  it('preenche em lote por POST, sem corpo, e devolve quantas peças foram atualizadas', async () => {
    api.apiFetch.mockResolvedValueOnce({ data: { atualizados: 3 } });

    expect(await preencherTextosDoCadastro()).toEqual({ atualizados: 3 });
    expect(api.apiFetch).toHaveBeenCalledWith('/loja-produtos/preencher-do-cadastro', { method: 'POST' });
  });
});
