import { describe, it, expect } from 'vitest';
import { validar, montarPayload } from './ClienteModal.jsx';

const formBase = {
  nome: 'Maria Silva',
  telefone: '(11) 98888-7777',
  email: 'maria@example.com',
  cpf_cnpj: '111.444.777-35',
  cep: '01310-100',
  endereco: 'Av. Paulista',
  numero: '1000',
  complemento: 'Apto 12',
  bairro: 'Bela Vista',
  cidade: 'São Paulo',
  uf: 'SP',
  data_nascimento: '1990-05-20',
  observacoes: 'Cliente frequente',
  ativo: true,
};

describe('validar', () => {
  it('aceita formulário completo e válido', () => {
    expect(validar(formBase)).toBe('');
  });

  it('exige nome', () => {
    expect(validar({ ...formBase, nome: '' })).toBe('Nome é obrigatório');
  });

  it('valida formato de email quando preenchido', () => {
    expect(validar({ ...formBase, email: 'invalido' })).toBe('Email inválido');
  });

  it('aceita email vazio (campo opcional)', () => {
    expect(validar({ ...formBase, email: '' })).toBe('');
  });

  it('valida CPF/CNPJ por dígito verificador quando preenchido', () => {
    expect(validar({ ...formBase, cpf_cnpj: '123.456.789-00' })).toBe('CPF/CNPJ inválido');
  });

  it('aceita CPF/CNPJ vazio (campo opcional) — não quebra cadastros sem documento', () => {
    expect(validar({ ...formBase, cpf_cnpj: '' })).toBe('');
  });
});

describe('montarPayload', () => {
  it('normaliza telefone, CPF/CNPJ e CEP para somente dígitos', () => {
    const payload = montarPayload(formBase, 'create');
    expect(payload.telefone).toBe('11988887777');
    expect(payload.cpf_cnpj).toBe('11144477735');
    expect(payload.cep).toBe('01310100');
  });

  it('envia campos opcionais vazios como undefined, não string vazia', () => {
    const vazio = { ...formBase, telefone: '', cpf_cnpj: '', cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', data_nascimento: '', observacoes: '' };
    const payload = montarPayload(vazio, 'create');
    expect(payload.telefone).toBeUndefined();
    expect(payload.cpf_cnpj).toBeUndefined();
    expect(payload.cep).toBeUndefined();
    expect(payload.endereco).toBeUndefined();
  });

  it('não inclui "ativo" ao criar (campo só existe em edição)', () => {
    const payload = montarPayload(formBase, 'create');
    expect(payload.ativo).toBeUndefined();
  });

  it('inclui "ativo" ao editar', () => {
    const payload = montarPayload({ ...formBase, ativo: false }, 'edit');
    expect(payload.ativo).toBe(false);
  });

  it('preserva compatibilidade: cliente existente sem os campos novos gera payload igual ao formulário antigo', () => {
    const clienteAntigo = {
      nome: 'João', telefone: '', email: '', cpf_cnpj: '', cep: '', endereco: '',
      numero: '', complemento: '', bairro: '', cidade: '', uf: '', data_nascimento: '', observacoes: '', ativo: true,
    };
    const payload = montarPayload(clienteAntigo, 'edit');
    expect(payload).toEqual({
      nome: 'João',
      telefone: undefined,
      email: undefined,
      cpf_cnpj: undefined,
      cep: undefined,
      endereco: undefined,
      numero: undefined,
      complemento: undefined,
      bairro: undefined,
      cidade: undefined,
      uf: undefined,
      data_nascimento: undefined,
      observacoes: undefined,
      ativo: true,
    });
  });
});
