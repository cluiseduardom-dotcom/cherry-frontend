import { describe, it, expect } from 'vitest';
import { cnpjValido, formatarCnpj, formDoInstitucional, linkDaRedeValido, montarCorpoInstitucional, validarInstitucional } from './lojaInstitucional';

describe('formDoInstitucional / montarCorpoInstitucional', () => {
  it('nulos viram campo vazio no formulário e vazio vira null no corpo', () => {
    const form = formDoInstitucional({ historia: null, cnpj: '11222333000181' });
    expect(form.historia).toBe('');
    expect(form.cnpj).toBe('11222333000181');
    expect(form.instagram_url).toBe('');

    const corpo = montarCorpoInstitucional({ ...form, fundadora_nome: '  Fulana  ', atendimento: '   ' });
    expect(corpo.fundadora_nome).toBe('Fulana');
    expect(corpo.atendimento).toBeNull();
    expect(corpo.historia).toBeNull();
  });
  it('o corpo só tem os campos que o backend aceita', () => {
    expect(Object.keys(montarCorpoInstitucional({ empresa_id: 9, preco: 1 })).sort()).toEqual(
      ['atendimento', 'avisos', 'cnpj', 'email_contato', 'endereco', 'facebook_url', 'fundadora_nome', 'historia', 'horario_atendimento', 'instagram_url', 'razao_social', 'servicos', 'tiktok_url', 'whatsapp'],
    );
  });
});

describe('linkDaRedeValido', () => {
  it('aceita https do domínio da rede (e subdomínio) e vazio', () => {
    expect(linkDaRedeValido('instagram_url', 'https://www.instagram.com/perfil')).toBe(true);
    expect(linkDaRedeValido('facebook_url', 'https://fb.com/perfil')).toBe(true);
    expect(linkDaRedeValido('tiktok_url', '')).toBe(true);
  });
  it('recusa http, outro domínio, domínio disfarçado, usuário e senha e lixo', () => {
    expect(linkDaRedeValido('instagram_url', 'http://instagram.com/x')).toBe(false);
    expect(linkDaRedeValido('instagram_url', 'https://evil.com/instagram.com')).toBe(false);
    expect(linkDaRedeValido('instagram_url', 'https://instagram.com.evil.com/x')).toBe(false);
    expect(linkDaRedeValido('instagram_url', 'https://u:s@instagram.com/x')).toBe(false);
    expect(linkDaRedeValido('instagram_url', 'javascript:alert(1)')).toBe(false);
    expect(linkDaRedeValido('facebook_url', 'https://instagram.com/x')).toBe(false);
    expect(linkDaRedeValido('tiktok_url', '@perfil')).toBe(false);
  });
});

describe('cnpjValido / formatarCnpj', () => {
  it('confere os dígitos verificadores', () => {
    expect(cnpjValido('11.222.333/0001-81')).toBe(true);
    expect(cnpjValido('11222333000182')).toBe(false);
    expect(cnpjValido('00000000000000')).toBe(false);
  });
  it('formata 14 dígitos', () => {
    expect(formatarCnpj('11222333000181')).toBe('11.222.333/0001-81');
    expect(formatarCnpj('123')).toBe('123');
  });
});

describe('validarInstitucional', () => {
  it('formulário vazio é válido', () => {
    expect(validarInstitucional({})).toBe('');
  });
  it('aponta o primeiro problema', () => {
    expect(validarInstitucional({ historia: 'x'.repeat(6001) })).toMatch(/6000/);
    expect(validarInstitucional({ instagram_url: 'http://instagram.com/x' })).toMatch(/Instagram/);
    expect(validarInstitucional({ email_contato: 'sem-arroba' })).toMatch(/E-mail/);
    expect(validarInstitucional({ whatsapp: '123' })).toMatch(/WhatsApp/);
    expect(validarInstitucional({ cnpj: '11222333000182' })).toMatch(/CNPJ/);
    expect(validarInstitucional({ avisos: 'a\nb\nc\nd\ne\nf' })).toMatch(/5 avisos/);
    expect(validarInstitucional({ avisos: 'x'.repeat(101) })).toMatch(/100 caracteres/);
    expect(validarInstitucional({ avisos: 'Frete combinado\n\nPix ou cartão' })).toBe('');
  });
  it('aceita WhatsApp com e sem o 55 e com máscara', () => {
    expect(validarInstitucional({ whatsapp: '(11) 99999-0000' })).toBe('');
    expect(validarInstitucional({ whatsapp: '5511999990000' })).toBe('');
  });
});
