import { describe, it, expect } from 'vitest';
import { produtoLidoParaCarrinho } from './Venda.jsx';

const produtos = [
  { id: 1, name: 'teste01', sku: 'COL-BO-MSC-001', price: 5.5, stock: 12 },
  { id: 2, name: 'sem preço', sku: 'X', price: null, stock: 3 },
  { id: 3, name: 'esgotado', sku: 'Y', price: 9, stock: 0 },
];

describe('produtoLidoParaCarrinho', () => {
  it('devolve o produto da vitrine (com o preço do canal) para o código lido', () => {
    expect(produtoLidoParaCarrinho({ id: 1, nome: 'teste01' }, produtos)).toEqual({ produto: produtos[0] });
  });

  it('usa produto_id da resposta real de /buscar-codigo (o id é do código, não do produto)', () => {
    // Formato real: SELECT pc.*, p.nome, p.sku, p.ativo AS produto_ativo FROM produtos_codigos pc ...
    const resposta = { id: 2, produto_id: 1, codigo: '000002', tipo: 'INTERNO', nome: 'teste01', sku: 'COL-BO-MSC-001', produto_ativo: true };
    expect(produtoLidoParaCarrinho(resposta, produtos)).toEqual({ produto: produtos[0] });
  });

  it('aceita id numérico em texto', () => {
    expect(produtoLidoParaCarrinho({ produto_id: '1' }, produtos).produto).toBe(produtos[0]);
  });

  it.each([
    [{ id: 99, nome: 'Inativo' }, [], /não está à venda/],
    [{ id: 2, nome: 'sem preço' }, [], /sem preço/],
    [{ id: 3, nome: 'esgotado' }, [], /sem estoque/],
    [{ id: 1, nome: 'teste01' }, [{ type: 'avulso', id: 1, qty: 12 }], /Todo o estoque/],
  ])('recusa com mensagem: %j', (lido, cart, msg) => {
    expect(produtoLidoParaCarrinho(lido, produtos, cart).erro).toMatch(msg);
  });

  it('item de kit no carrinho não conta como avulso', () => {
    expect(produtoLidoParaCarrinho({ id: 1 }, produtos, [{ type: 'kit', id: 1, qty: 12 }]).produto).toBe(produtos[0]);
  });
});
