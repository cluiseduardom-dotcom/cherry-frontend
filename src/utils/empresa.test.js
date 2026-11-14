import { describe, it, expect } from 'vitest';
import { dadosParaFormulario, validarEmpresa, montarPayloadEmpresa, EMPRESA_VAZIA } from './empresa';

const base = { ...EMPRESA_VAZIA, nome: 'Cherry Semijoias' };

describe('validarEmpresa', () => {
  it('só o nome é obrigatório', () => expect(validarEmpresa(base)).toEqual({}));
  it('recusa nome vazio, CNPJ com dígito errado, telefone, e-mail, CEP e UF inválidos', () => {
    const erros = validarEmpresa({ ...base, nome: ' ', cnpj: '11.222.333/0001-82', telefone: '123', email_contato: 'x', cep: '123', uf: 'XX' });
    expect(Object.keys(erros).sort()).toEqual(['cep', 'cnpj', 'email_contato', 'nome', 'telefone', 'uf']);
  });
  it('aceita CNPJ válido mascarado', () => expect(validarEmpresa({ ...base, cnpj: '11.222.333/0001-81' })).toEqual({}));
});

describe('montarPayloadEmpresa', () => {
  const inicial = dadosParaFormulario({ nome: 'Cherry', cnpj: '11222333000181', cidade: 'São Paulo' });
  it('não envia nada quando não há mudança (mesmo mascarado)', () => {
    expect(montarPayloadEmpresa({ ...inicial, cnpj: '11.222.333/0001-81' }, inicial)).toEqual({});
  });
  it('envia só o que mudou, com dígitos, e string vazia para limpar', () => {
    expect(montarPayloadEmpresa({ ...inicial, telefone: '(11) 99999-8888', cidade: '' }, inicial))
      .toEqual({ telefone: '11999998888', cidade: '' });
  });
});

describe('dadosParaFormulario', () => {
  it('troca null por string vazia', () => expect(dadosParaFormulario({ nome: 'X', cnpj: null }).cnpj).toBe(''));
});

describe('rótulo do estoque do vendedor', () => {
  it('vem do backend no formulário e só vai no payload quando muda', () => {
    const inicial = dadosParaFormulario({ nome: 'Cherry', rotulo_estoque_vendedor: 'maleta' });

    expect(inicial.rotulo_estoque_vendedor).toBe('maleta');
    expect(montarPayloadEmpresa({ ...inicial }, inicial)).toEqual({});
    expect(montarPayloadEmpresa({ ...inicial, rotulo_estoque_vendedor: 'estoque_vendedor' }, inicial)).toEqual({ rotulo_estoque_vendedor: 'estoque_vendedor' });
  });

  it('servidor antigo (sem o campo): formulário vazio e nada é enviado', () => {
    const inicial = dadosParaFormulario({ nome: 'Cherry' });

    expect(inicial.rotulo_estoque_vendedor).toBe('');
    expect(montarPayloadEmpresa({ ...inicial }, inicial)).toEqual({});
  });
});
