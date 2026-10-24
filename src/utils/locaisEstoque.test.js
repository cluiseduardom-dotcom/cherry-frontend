import { describe, it, expect } from 'vitest';
import {
  rotuloDoLocal, usuariosSemMaleta, validarNovoLocal, filtrarSaldos, totalDeUnidades, FORM_LOCAL_VAZIO,
} from './locaisEstoque';

describe('rotuloDoLocal', () => {
  it('usa o nome do local e acrescenta o dono da maleta quando o nome não o cita', () => {
    expect(rotuloDoLocal({ tipo: 'central', nome: 'Central' })).toBe('Central');
    expect(rotuloDoLocal({ tipo: 'maleta', nome: 'Maleta 1', usuario_nome: 'Ana Souza' })).toBe('Maleta 1 (Ana Souza)');
    expect(rotuloDoLocal({ tipo: 'maleta', nome: 'Maleta de Ana Souza', usuario_nome: 'Ana Souza' })).toBe('Maleta de Ana Souza');
    expect(rotuloDoLocal({ tipo: 'consignado', nome: 'Loja da Maria' })).toBe('Loja da Maria');
  });

  it('não quebra sem local ou sem nome', () => {
    expect(rotuloDoLocal(null)).toBe('');
    expect(rotuloDoLocal({ tipo: 'consignado' })).toBe('Consignado');
  });
});

describe('usuariosSemMaleta', () => {
  const usuarios = [
    { id: 1, nome: 'A', ativo: true },
    { id: 2, nome: 'B', ativo: true },
    { id: 3, nome: 'C', ativo: false },
  ];

  it('lista só ativos que ainda não têm maleta', () => {
    const locais = [{ tipo: 'maleta', usuario_id: 1 }, { tipo: 'central' }];
    expect(usuariosSemMaleta(usuarios, locais).map(u => u.id)).toEqual([2]);
  });

  it('aceita listas ausentes', () => {
    expect(usuariosSemMaleta(undefined, undefined)).toEqual([]);
    expect(usuariosSemMaleta(usuarios, undefined)).toHaveLength(2);
  });
});

describe('validarNovoLocal', () => {
  it('maleta exige dono; nome é opcional e só vai se informado', () => {
    expect(validarNovoLocal({ ...FORM_LOCAL_VAZIO }).erros.usuario_id).toBeTruthy();

    const r = validarNovoLocal({ ...FORM_LOCAL_VAZIO, usuario_id: '7', nome: '  ' });
    expect(r.valido).toBe(true);
    expect(r.dados).toEqual({ tipo: 'maleta', usuario_id: 7 });

    expect(validarNovoLocal({ ...FORM_LOCAL_VAZIO, usuario_id: '7', nome: ' Maleta Ana ' }).dados)
      .toEqual({ tipo: 'maleta', usuario_id: 7, nome: 'Maleta Ana' });
  });

  it('consignado exige nome; cliente é opcional e não envia campos de maleta', () => {
    expect(validarNovoLocal({ ...FORM_LOCAL_VAZIO, tipo: 'consignado' }).erros.nome).toBeTruthy();

    expect(validarNovoLocal({ ...FORM_LOCAL_VAZIO, tipo: 'consignado', nome: 'Loja', usuario_id: '9' }).dados)
      .toEqual({ tipo: 'consignado', nome: 'Loja' });
    expect(validarNovoLocal({ ...FORM_LOCAL_VAZIO, tipo: 'consignado', nome: 'Loja', cliente_id: '4' }).dados)
      .toEqual({ tipo: 'consignado', nome: 'Loja', cliente_id: 4 });
  });

  it('recusa nome acima de 100 caracteres e tipo desconhecido', () => {
    expect(validarNovoLocal({ ...FORM_LOCAL_VAZIO, usuario_id: '1', nome: 'x'.repeat(101) }).erros.nome).toBeTruthy();
    expect(validarNovoLocal({ ...FORM_LOCAL_VAZIO, tipo: 'central' }).valido).toBe(false);
  });
});

describe('filtrarSaldos / totalDeUnidades', () => {
  const items = [
    { produto_id: 1, nome: 'Anel Prata', sku: 'AN-1', saldo: 3 },
    { produto_id: 2, nome: 'Brinco', sku: null, saldo: 2 },
  ];

  it('filtra por nome ou SKU sem diferenciar maiúsculas; vazio devolve tudo', () => {
    expect(filtrarSaldos(items, 'anel').map(i => i.produto_id)).toEqual([1]);
    expect(filtrarSaldos(items, 'an-1').map(i => i.produto_id)).toEqual([1]);
    expect(filtrarSaldos(items, '  ')).toHaveLength(2);
    expect(filtrarSaldos(undefined, 'x')).toEqual([]);
  });

  it('soma as unidades', () => {
    expect(totalDeUnidades(items)).toBe(5);
    expect(totalDeUnidades(undefined)).toBe(0);
  });
});
