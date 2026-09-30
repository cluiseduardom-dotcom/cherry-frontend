import { describe, it, expect } from 'vitest';
import {
  somenteDigitos,
  aplicarMascaraCPF,
  aplicarMascaraCNPJ,
  aplicarMascaraCpfCnpj,
  aplicarMascaraTelefone,
  aplicarMascaraCEP,
  aplicarMascaraChaveNFe,
  formatarMoeda,
  cpfValido,
  cnpjValido,
  cpfCnpjValido,
} from './mascaras';

describe('somenteDigitos', () => {
  it('remove tudo que não é dígito', () => {
    expect(somenteDigitos('123.456.789-00')).toBe('12345678900');
    expect(somenteDigitos('(11) 98888-7777')).toBe('11988887777');
  });

  it('não quebra com valores ausentes', () => {
    expect(somenteDigitos(null)).toBe('');
    expect(somenteDigitos(undefined)).toBe('');
  });
});

describe('aplicarMascaraCPF', () => {
  it('formata progressivamente enquanto o usuário digita (entrada crua)', () => {
    expect(aplicarMascaraCPF('1')).toBe('1');
    expect(aplicarMascaraCPF('123')).toBe('123');
    expect(aplicarMascaraCPF('1234')).toBe('123.4');
    expect(aplicarMascaraCPF('123456789')).toBe('123.456.789');
    expect(aplicarMascaraCPF('12345678900')).toBe('123.456.789-00');
  });

  it('aceita colar um valor já formatado sem duplicar pontuação', () => {
    expect(aplicarMascaraCPF('123.456.789-00')).toBe('123.456.789-00');
  });

  it('limita a 11 dígitos mesmo recebendo mais', () => {
    expect(aplicarMascaraCPF('123456789001234')).toBe('123.456.789-00');
  });
});

describe('aplicarMascaraCNPJ', () => {
  it('formata progressivamente enquanto o usuário digita', () => {
    expect(aplicarMascaraCNPJ('11')).toBe('11');
    expect(aplicarMascaraCNPJ('11222333')).toBe('11.222.333');
    expect(aplicarMascaraCNPJ('11222333000181')).toBe('11.222.333/0001-81');
  });

  it('aceita colar um valor já formatado', () => {
    expect(aplicarMascaraCNPJ('11.222.333/0001-81')).toBe('11.222.333/0001-81');
  });

  it('limita a 14 dígitos', () => {
    expect(aplicarMascaraCNPJ('112223330001819999')).toBe('11.222.333/0001-81');
  });
});

describe('aplicarMascaraCpfCnpj', () => {
  it('usa máscara de CPF até 11 dígitos', () => {
    expect(aplicarMascaraCpfCnpj('12345678900')).toBe('123.456.789-00');
  });

  it('muda para máscara de CNPJ a partir do 12º dígito', () => {
    expect(aplicarMascaraCpfCnpj('112223330001')).toBe('11.222.333/0001');
    expect(aplicarMascaraCpfCnpj('11222333000181')).toBe('11.222.333/0001-81');
  });
});

describe('aplicarMascaraTelefone', () => {
  it('formata celular (11 dígitos)', () => {
    expect(aplicarMascaraTelefone('11988887777')).toBe('(11) 98888-7777');
  });

  it('formata fixo (10 dígitos)', () => {
    expect(aplicarMascaraTelefone('1133334444')).toBe('(11) 3333-4444');
  });

  it('aceita valor já formatado colado', () => {
    expect(aplicarMascaraTelefone('(11) 98888-7777')).toBe('(11) 98888-7777');
  });

  it('limita a 11 dígitos', () => {
    expect(aplicarMascaraTelefone('119888877779999')).toBe('(11) 98888-7777');
  });
});

describe('aplicarMascaraCEP', () => {
  it('formata progressivamente', () => {
    expect(aplicarMascaraCEP('12345')).toBe('12345');
    expect(aplicarMascaraCEP('12345678')).toBe('12345-678');
  });

  it('aceita valor colado já formatado', () => {
    expect(aplicarMascaraCEP('12345-678')).toBe('12345-678');
  });

  it('limita a 8 dígitos', () => {
    expect(aplicarMascaraCEP('123456789999')).toBe('12345-678');
  });
});

describe('aplicarMascaraChaveNFe', () => {
  it('agrupa os 44 dígitos de 4 em 4', () => {
    const chave = '12345678901234567890123456789012345678901234';
    expect(aplicarMascaraChaveNFe(chave)).toBe(
      '1234 5678 9012 3456 7890 1234 5678 9012 3456 7890 1234'
    );
  });

  it('limita a 44 dígitos', () => {
    const chave44 = '1'.repeat(44);
    const comExcesso = chave44 + '99999';
    expect(somenteDigitos(aplicarMascaraChaveNFe(comExcesso))).toHaveLength(44);
  });
});

describe('formatarMoeda', () => {
  it('formata no padrão monetário brasileiro', () => {
    expect(formatarMoeda(1234.5)).toBe('R$ 1.234,50');
  });

  it('trata valores ausentes como zero', () => {
    expect(formatarMoeda(null)).toBe('R$ 0,00');
    expect(formatarMoeda(undefined)).toBe('R$ 0,00');
  });
});

describe('cpfValido', () => {
  it('aceita CPF válido, formatado ou não', () => {
    expect(cpfValido('11144477735')).toBe(true);
    expect(cpfValido('111.444.777-35')).toBe(true);
  });

  it('rejeita CPF com dígito verificador incorreto', () => {
    expect(cpfValido('12345678900')).toBe(false);
  });

  it('rejeita sequência de dígitos repetidos', () => {
    expect(cpfValido('00000000000')).toBe(false);
    expect(cpfValido('11111111111')).toBe(false);
  });

  it('rejeita quantidade de dígitos incorreta', () => {
    expect(cpfValido('123')).toBe(false);
  });
});

describe('cnpjValido', () => {
  it('aceita CNPJ válido, formatado ou não', () => {
    expect(cnpjValido('11222333000181')).toBe(true);
    expect(cnpjValido('11.222.333/0001-81')).toBe(true);
  });

  it('rejeita CNPJ com dígito verificador incorreto', () => {
    expect(cnpjValido('12345678000190')).toBe(false);
  });

  it('rejeita sequência de dígitos repetidos', () => {
    expect(cnpjValido('00000000000000')).toBe(false);
  });
});

describe('cpfCnpjValido', () => {
  it('valida como CPF quando tem até 11 dígitos', () => {
    expect(cpfCnpjValido('11144477735')).toBe(true);
    expect(cpfCnpjValido('12345678900')).toBe(false);
  });

  it('valida como CNPJ quando tem mais de 11 dígitos', () => {
    expect(cpfCnpjValido('11222333000181')).toBe(true);
    expect(cpfCnpjValido('12345678000190')).toBe(false);
  });
});
