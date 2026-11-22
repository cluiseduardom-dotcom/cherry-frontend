import { describe, it, expect } from 'vitest';
import {
  acoesDaCotacao, badgeStatusCotacao, escolhaInicial, escolhaValida, formVazio, linhasDaProposta, montarCorpoCotacao, montarEscolhas,
  montarItensProposta, resumoPorFornecedor, rotuloStatusCotacao, rotuloStatusFornecedor, validarCotacaoForm, validarProposta,
} from './cotacao';

const cotacao = {
  status: 'ABERTA',
  itens: [
    { id: 10, produto_nome: 'Anel', descricao_snapshot: 'Anel', quantidade_solicitada: 10, melhor_fornecedor_id: 2 },
    { id: 11, produto_nome: 'Colar', descricao_snapshot: 'Colar', quantidade_solicitada: 4, melhor_fornecedor_id: 3 },
    { id: 12, produto_nome: 'Pulseira', descricao_snapshot: 'Pulseira', quantidade_solicitada: 2, melhor_fornecedor_id: null },
  ],
  fornecedores: [
    { id: 100, fornecedor_id: 1, fornecedor_nome: 'Alfa' }, { id: 200, fornecedor_id: 2, fornecedor_nome: 'Beta' }, { id: 300, fornecedor_id: 3, fornecedor_nome: 'Gama' },
  ],
  ofertas: [
    { cotacao_item_id: 10, fornecedor_id: 1, preco_unitario: 12.5, desconto: 0, quantidade_ofertada: 10, total: 125 },
    { cotacao_item_id: 10, fornecedor_id: 2, preco_unitario: 13, desconto: 20, quantidade_ofertada: 10, total: 110 },
    { cotacao_item_id: 11, fornecedor_id: 3, preco_unitario: 29, desconto: 0, quantidade_ofertada: 4, total: 116 },
  ],
};

describe('rótulos e ações', () => {
  it('status em linguagem do dia a dia', () => {
    expect(rotuloStatusCotacao('ENCERRADA')).toBe('Pedidos gerados');
    expect(rotuloStatusFornecedor('PENDENTE')).toBe('Aguardando proposta');
    expect(badgeStatusCotacao('CANCELADA')).toBe('badge badge-danger');
  });

  it('só cotação aberta aceita proposta, recusa, geração e cancelamento', () => {
    expect(acoesDaCotacao({ status: 'ABERTA' })).toEqual({ registrarProposta: true, recusar: true, gerarPedidos: true, cancelar: true });
    for (const status of ['ENCERRADA', 'CANCELADA']) expect(Object.values(acoesDaCotacao({ status })).every(v => v === false)).toBe(true);
  });
});

describe('nova cotação', () => {
  const ok = () => ({ ...formVazio(), itens: [{ produto_id: '1', quantidade: 10 }, { produto_id: '2', quantidade: 4 }], fornecedor_ids: ['5', '6'] });

  it('aceita o preenchimento completo', () => expect(validarCotacaoForm(ok())).toBeNull());

  it.each([
    [{ itens: [] }, 'ao menos um item'],
    [{ itens: [{ produto_id: '', quantidade: 1 }] }, 'escolha o produto'],
    [{ itens: [{ produto_id: '1', quantidade: 1.5 }] }, 'inteiro'],
    [{ itens: [{ produto_id: '1', quantidade: 0 }] }, 'inteiro'],
    [{ itens: [{ produto_id: '1', quantidade: 1 }, { produto_id: '1', quantidade: 2 }] }, 'repetido'],
    [{ fornecedor_ids: [] }, 'ao menos um fornecedor'],
  ])('recusa %j', (extra, trecho) => expect(validarCotacaoForm({ ...ok(), ...extra }).toLowerCase()).toContain(trecho));

  it('monta o corpo com números e só o que foi preenchido', () => {
    expect(montarCorpoCotacao(ok())).toEqual({ itens: [{ produto_id: 1, quantidade: 10 }, { produto_id: 2, quantidade: 4 }], fornecedor_ids: [5, 6] });
    expect(montarCorpoCotacao({ ...ok(), data_limite: '2026-12-20', observacoes: ' urgente ' })).toMatchObject({ data_limite: '2026-12-20', observacoes: 'urgente' });
  });
});

describe('proposta do fornecedor', () => {
  it('linhas do modal: traz o que o fornecedor já tinha proposto e a quantidade pedida como padrão', () => {
    const linhas = linhasDaProposta(cotacao, 2);

    expect(linhas[0]).toMatchObject({ cotacao_item_id: 10, preco_unitario: '13', desconto: '20', quantidade_ofertada: '10', solicitada: 10 });
    expect(linhas[1]).toMatchObject({ preco_unitario: '', quantidade_ofertada: '4' });
  });

  it('linha sem preço não vai; prazo e condição valem para todos os itens cotados', () => {
    const linhas = [
      { cotacao_item_id: 10, rotulo: 'Anel', solicitada: 10, preco_unitario: '13', desconto: '20', quantidade_ofertada: '10' },
      { cotacao_item_id: 11, rotulo: 'Colar', solicitada: 4, preco_unitario: '', desconto: '', quantidade_ofertada: '4' },
      { cotacao_item_id: 12, rotulo: 'Pulseira', solicitada: 2, preco_unitario: '5', desconto: '', quantidade_ofertada: '1' },
    ];

    expect(montarItensProposta(linhas, { prazo_entrega_dias: '10', condicao_pagamento: ' 30 dias ' })).toEqual([
      { cotacao_item_id: 10, preco_unitario: 13, desconto: 20, prazo_entrega_dias: 10, condicao_pagamento: '30 dias' },
      { cotacao_item_id: 12, preco_unitario: 5, quantidade_ofertada: 1, prazo_entrega_dias: 10, condicao_pagamento: '30 dias' },
    ]);
    expect(montarItensProposta(linhas, { prazo_entrega_dias: '', condicao_pagamento: '' })[0]).toEqual({ cotacao_item_id: 10, preco_unitario: 13, desconto: 20 });
  });

  it('validações da proposta', () => {
    const base = { cotacao_item_id: 10, rotulo: 'Anel', solicitada: 10, preco_unitario: '13', desconto: '', quantidade_ofertada: '10' };

    expect(validarProposta([base], { prazo_entrega_dias: '' })).toBeNull();
    expect(validarProposta([{ ...base, preco_unitario: '' }], { prazo_entrega_dias: '' })).toContain('ao menos um item');
    expect(validarProposta([{ ...base, quantidade_ofertada: '11' }], { prazo_entrega_dias: '' })).toContain('mais do que o pedido');
    expect(validarProposta([{ ...base, quantidade_ofertada: '1.5' }], { prazo_entrega_dias: '' })).toContain('inteiro');
    expect(validarProposta([{ ...base, desconto: '500' }], { prazo_entrega_dias: '' })).toContain('desconto');
    expect(validarProposta([base], { prazo_entrega_dias: '400' })).toContain('prazo');
  });
});

describe('comparação e escolha', () => {
  it('a escolha inicial é a melhor oferta de cada item; item sem oferta fica sem escolha', () => {
    expect(escolhaInicial(cotacao)).toEqual({ 10: 2, 11: 3 });
  });

  it('só vale a escolha de fornecedor que cotou o item', () => {
    expect(escolhaValida(cotacao, { 10: 1, 11: 1, 12: 2 }).map(([i, f]) => [Number(i), f])).toEqual([[10, 1]]);
    expect(montarEscolhas(cotacao, { 10: 2, 11: 3, 12: 1 })).toEqual([{ cotacao_item_id: 10, fornecedor_id: 2 }, { cotacao_item_id: 11, fornecedor_id: 3 }]);
  });

  it('resumo por fornecedor: itens e total, para conferir antes de gerar os pedidos', () => {
    expect(resumoPorFornecedor(cotacao, { 10: 2, 11: 3 })).toEqual([
      { fornecedor_id: 2, nome: 'Beta', itens: 1, total: 110 },
      { fornecedor_id: 3, nome: 'Gama', itens: 1, total: 116 },
    ]);
    expect(resumoPorFornecedor(cotacao, { 10: 1 })[0]).toMatchObject({ nome: 'Alfa', total: 125 });
    expect(resumoPorFornecedor(cotacao, {})).toEqual([]);
  });
});
