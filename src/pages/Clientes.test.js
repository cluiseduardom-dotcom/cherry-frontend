import { describe, it, expect } from 'vitest';
import {
  calcularKpisClientes,
  filtrarClientesPorBusca,
  filtrarClientesPorStatus,
  filtrarClientesPorCompras,
} from './Clientes.jsx';

const clientes = [
  { id: 1, nome: 'Maria Silva', email: 'maria@example.com', telefone: '11988887777', cpf_cnpj: '11144477735', ativo: true, total_compras: 3, total_gasto: 500 },
  { id: 2, nome: 'João Souza', email: 'joao@example.com', telefone: '21999998888', cpf_cnpj: null, ativo: true, total_compras: 0, total_gasto: 0 },
  { id: 3, nome: 'Ana Costa', email: 'ana@example.com', telefone: null, cpf_cnpj: null, ativo: false, total_compras: 0, total_gasto: 0 },
];

describe('calcularKpisClientes', () => {
  it('calcula total, ativos, com compras e total vendido a partir dos dados já carregados', () => {
    expect(calcularKpisClientes(clientes)).toEqual({
      total: 3,
      ativos: 2,
      comCompras: 1,
      totalVendido: 500,
    });
  });

  it('não quebra com lista vazia ou inválida', () => {
    expect(calcularKpisClientes([])).toEqual({ total: 0, ativos: 0, comCompras: 0, totalVendido: 0 });
    expect(calcularKpisClientes(undefined)).toEqual({ total: 0, ativos: 0, comCompras: 0, totalVendido: 0 });
  });
});

describe('filtrarClientesPorBusca', () => {
  it('retorna tudo quando o termo é vazio', () => {
    expect(filtrarClientesPorBusca(clientes, '')).toEqual(clientes);
  });

  it('busca por nome', () => {
    expect(filtrarClientesPorBusca(clientes, 'maria')).toEqual([clientes[0]]);
  });

  it('busca por email', () => {
    expect(filtrarClientesPorBusca(clientes, 'joao@example.com')).toEqual([clientes[1]]);
  });

  it('busca por telefone, com ou sem formatação', () => {
    expect(filtrarClientesPorBusca(clientes, '11988887777')).toEqual([clientes[0]]);
    expect(filtrarClientesPorBusca(clientes, '(11) 98888-7777')).toEqual([clientes[0]]);
  });

  it('busca por documento (CPF/CNPJ)', () => {
    expect(filtrarClientesPorBusca(clientes, '111.444.777-35')).toEqual([clientes[0]]);
  });

  it('não quebra quando telefone/documento são null', () => {
    expect(() => filtrarClientesPorBusca(clientes, '999')).not.toThrow();
  });
});

describe('filtrarClientesPorStatus', () => {
  it('filtra ativos', () => {
    expect(filtrarClientesPorStatus(clientes, 'ativos')).toEqual([clientes[0], clientes[1]]);
  });

  it('filtra inativos', () => {
    expect(filtrarClientesPorStatus(clientes, 'inativos')).toEqual([clientes[2]]);
  });

  it('retorna todos quando status é "todos"', () => {
    expect(filtrarClientesPorStatus(clientes, 'todos')).toEqual(clientes);
  });
});

describe('filtrarClientesPorCompras', () => {
  it('filtra clientes com compras', () => {
    expect(filtrarClientesPorCompras(clientes, 'com')).toEqual([clientes[0]]);
  });

  it('filtra clientes sem compras', () => {
    expect(filtrarClientesPorCompras(clientes, 'sem')).toEqual([clientes[1], clientes[2]]);
  });

  it('retorna todos quando opção é "todos"', () => {
    expect(filtrarClientesPorCompras(clientes, 'todos')).toEqual(clientes);
  });
});
