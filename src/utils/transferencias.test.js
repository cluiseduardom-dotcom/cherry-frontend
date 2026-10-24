import { describe, it, expect } from 'vitest';
import {
  acoesPermitidas, rotasDisponiveis, validarMotivo, validarNovaTransferencia,
  adicionarItem, removerItem, atualizarQuantidade, totalDeUnidades, FORM_TRANSFERENCIA_VAZIO,
} from './transferencias';

const admin = { id: 1, role: 'admin' };
const estoquista = { id: 2, role: 'estoquista' };
const ana = { id: 10, role: 'vendedor' };
const beto = { id: 11, role: 'vendedor' };

const paraMaletaDaAna = { status: 'pendente', destino_tipo: 'maleta', destino_usuario_id: 10, criado_por: 2 };
const paraCentral = { status: 'pendente', destino_tipo: 'central', destino_usuario_id: null, criado_por: 10 };

describe('acoesPermitidas', () => {
  it('destino maleta: só o dono aceita/recusa (nem admin nem estoquista); criador e admin cancelam', () => {
    expect(acoesPermitidas(paraMaletaDaAna, ana)).toEqual({ aceitar: true, recusar: true, cancelar: false });
    expect(acoesPermitidas(paraMaletaDaAna, admin)).toEqual({ aceitar: false, recusar: false, cancelar: true });
    expect(acoesPermitidas(paraMaletaDaAna, estoquista)).toEqual({ aceitar: false, recusar: false, cancelar: true });
    expect(acoesPermitidas(paraMaletaDaAna, beto)).toEqual({ aceitar: false, recusar: false, cancelar: false });
  });

  it('destino Central/consignado: equipe responde; quem criou (vendedor) só cancela', () => {
    expect(acoesPermitidas(paraCentral, estoquista)).toEqual({ aceitar: true, recusar: true, cancelar: false });
    expect(acoesPermitidas(paraCentral, ana)).toEqual({ aceitar: false, recusar: false, cancelar: true });
    expect(acoesPermitidas(paraCentral, beto)).toEqual({ aceitar: false, recusar: false, cancelar: false });
  });

  it('transferência já resolvida não oferece ação alguma', () => {
    for (const status of ['concluida', 'recusada', 'cancelada']) {
      expect(acoesPermitidas({ ...paraCentral, status }, admin)).toEqual({ aceitar: false, recusar: false, cancelar: false });
    }
    expect(acoesPermitidas(null, admin)).toEqual({ aceitar: false, recusar: false, cancelar: false });
    expect(acoesPermitidas(paraCentral, null)).toEqual({ aceitar: false, recusar: false, cancelar: false });
  });
});

describe('rotasDisponiveis', () => {
  const locais = [
    { id: 1, tipo: 'central' },
    { id: 2, tipo: 'maleta', usuario_id: 10 },
    { id: 3, tipo: 'maleta', usuario_id: 11 },
    { id: 4, tipo: 'consignado' },
  ];

  it('equipe escolhe qualquer origem e destino', () => {
    expect(rotasDisponiveis(locais, admin)).toEqual({ origens: locais, destinos: locais });
    expect(rotasDisponiveis(locais, estoquista).origens).toHaveLength(4);
  });

  it('vendedor só devolve da própria maleta ao Central', () => {
    const r = rotasDisponiveis(locais, ana);
    expect(r.origens.map(l => l.id)).toEqual([2]);
    expect(r.destinos.map(l => l.id)).toEqual([1]);
  });

  it('tolera lista ausente', () => {
    expect(rotasDisponiveis(undefined, ana)).toEqual({ origens: [], destinos: [] });
  });
});

describe('validarMotivo', () => {
  it('exige de 3 a 300 caracteres e devolve o texto aparado', () => {
    expect(validarMotivo('  ').valido).toBe(false);
    expect(validarMotivo('ab').valido).toBe(false);
    expect(validarMotivo('x'.repeat(301)).valido).toBe(false);
    expect(validarMotivo('  Cliente desistiu ')).toEqual({ valido: true, motivo: 'Cliente desistiu' });
  });
});

describe('validarNovaTransferencia', () => {
  const base = {
    ...FORM_TRANSFERENCIA_VAZIO,
    origem: '1',
    destino: '2',
    itens: [{ produto_id: 5, nome: 'Anel', quantidade: 2 }],
  };

  it('monta o corpo só com campos aceitos pelo endpoint', () => {
    const r = validarNovaTransferencia({ ...base, observacao: ' reposição ' }, { 5: 10 });
    expect(r.valido).toBe(true);
    expect(r.dados).toEqual({
      origem_local_id: 1, destino_local_id: 2, itens: [{ produto_id: 5, quantidade: 2 }], observacao: 'reposição',
    });
    expect(validarNovaTransferencia(base, { 5: 10 }).dados).not.toHaveProperty('observacao');
  });

  it.each([
    ['sem origem', { origem: '' }, 'origem'],
    ['sem destino', { destino: '' }, 'destino'],
    ['origem = destino', { destino: '1' }, 'diferentes'],
    ['sem itens', { itens: [] }, 'ao menos um'],
    ['quantidade zero', { itens: [{ produto_id: 5, nome: 'Anel', quantidade: 0 }] }, 'Quantidade inválida'],
    ['quantidade fracionada', { itens: [{ produto_id: 5, nome: 'Anel', quantidade: 1.5 }] }, 'Quantidade inválida'],
    ['produto repetido', { itens: [{ produto_id: 5, nome: 'Anel', quantidade: 1 }, { produto_id: 5, nome: 'Anel', quantidade: 1 }] }, 'repetido'],
    ['observação longa', { observacao: 'x'.repeat(501) }, 'Observação'],
  ])('recusa %s', (_, alteracao, trecho) => {
    const r = validarNovaTransferencia({ ...base, ...alteracao }, { 5: 10 });
    expect(r.valido).toBe(false);
    expect(r.erro.toLowerCase()).toContain(trecho.toLowerCase());
  });

  it('recusa quantidade acima do saldo da origem', () => {
    const r = validarNovaTransferencia({ ...base, itens: [{ produto_id: 5, nome: 'Anel', quantidade: 11 }] }, { 5: 10 });
    expect(r.valido).toBe(false);
    expect(r.erro).toContain('disponível: 10');
  });
});

describe('itens da transferência', () => {
  it('adiciona sem repetir, atualiza quantidade, remove e soma', () => {
    let itens = adicionarItem([], { produto_id: 1, nome: 'A', sku: 'A-1' });
    itens = adicionarItem(itens, { produto_id: 1, nome: 'A' });
    itens = adicionarItem(itens, { produto_id: 2, nome: 'B' });
    expect(itens.map(i => i.produto_id)).toEqual([1, 2]);

    itens = atualizarQuantidade(itens, 2, 4);
    expect(totalDeUnidades(itens)).toBe(5);
    expect(removerItem(itens, 1).map(i => i.produto_id)).toEqual([2]);
    expect(adicionarItem(itens, null)).toBe(itens);
  });
});
