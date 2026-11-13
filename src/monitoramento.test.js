import { describe, it, expect } from 'vitest';
import { iniciarMonitoramento, limparEvento, mascarar } from './monitoramento';

describe('mascarar', () => {
  it.each([
    ['maria.silva@exemplo.com.br', '[email]'],
    ['CPF 123.456.789-09', '[cpf]'],
    ['CNPJ 12.345.678/0001-95', '[cnpj]'],
    ['tel (11) 91234-5678', '[telefone]'],
    ['Bearer eyJhbGciOi.abc.def', 'Bearer [token]'],
  ])('%s', (entrada, esperado) => {
    const saida = mascarar(entrada);
    expect(saida).toContain(esperado);
    expect(saida).not.toMatch(/maria\.silva|123\.456\.789|12\.345\.678|91234|eyJhbGci/);
  });
});

describe('limparEvento', () => {
  const bruto = {
    message: 'Erro joao@x.com',
    user: { id: 1, email: 'joao@x.com', ip_address: '1.2.3.4' },
    extra: { dados: 'x' },
    breadcrumbs: [{ message: 'clicou em Salvar cliente Maria' }],
    request: { url: 'https://app.exemplo/clientes?busca=maria@x.com#topo', headers: { cookie: 'a=b' } },
    exception: { values: [{ type: 'Error', value: 'falhou para 123.456.789-09' }] },
  };

  it('remove usuário, extra, breadcrumbs, cabeçalhos e query da URL', () => {
    const limpo = limparEvento(bruto);

    expect(limpo.user).toBeUndefined();
    expect(limpo.extra).toBeUndefined();
    expect(limpo.breadcrumbs).toEqual([]);
    expect(limpo.request).toEqual({ url: 'https://app.exemplo/clientes' });
    expect(JSON.stringify(limpo)).not.toMatch(/joao@x|maria@x|123\.456|1\.2\.3\.4|cookie/);
  });

  it('não altera o original e aceita entrada vazia', () => {
    limparEvento(bruto);
    expect(bruto.user).toBeDefined();
    expect(limparEvento(null)).toBeNull();
  });
});

describe('sem VITE_SENTRY_DSN nada é carregado', () => {
  it('devolve false e não importa a biblioteca', async () => {
    expect(await iniciarMonitoramento({})).toBe(false);
    expect(await iniciarMonitoramento({ VITE_SENTRY_DSN: '  ' })).toBe(false);
  });
});
