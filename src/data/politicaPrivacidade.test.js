import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ATUALIZADA_EM, SECOES } from './politicaPrivacidade';

const ler = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('política de privacidade do sistema', () => {
  it('tem as seções essenciais e data', () => {
    expect(ATUALIZADA_EM).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(SECOES.map((s) => s.titulo)).toEqual(expect.arrayContaining(['Quem é quem', 'Que dados o sistema guarda', 'Com quem os dados passam', 'Seus direitos']));
  });

  it('cita a transferência internacional e os terceiros reais (Mercado Pago, Render, Cloudflare)', () => {
    const texto = JSON.stringify(SECOES);
    expect(texto).toMatch(/transferência internacional/);
    for (const t of ['Mercado Pago', 'Render', 'Cloudflare']) expect(texto).toContain(t);
  });
});

describe('conformidade do ERP (guarda contra regressão)', () => {
  it('o index.html não carrega nada do Google (a fonte é local)', () => {
    expect(ler('index.html')).not.toMatch(/googleapis|gstatic/);
    expect(ler('src/index.css')).toMatch(/@font-face[\s\S]*inter-latin-wght-normal\.woff2/);
  });

  it('a política é pública (fora das rotas protegidas) e o login tem o link', () => {
    expect(ler('src/App.jsx')).toMatch(/path: '\/privacidade'/);
    expect(ler('src/pages/Login.jsx')).toMatch(/to="\/privacidade"/);
  });

  it('o layout tem o "Pular para o conteúdo" apontando para um alvo existente', () => {
    const layout = ler('src/components/Layout.jsx');
    expect(layout).toMatch(/href="#conteudo-principal"/);
    expect(layout).toMatch(/id="conteudo-principal"/);
  });

  it('botões de fechar só com ícone têm nome acessível', () => {
    for (const arq of ['src/components/compras/BarcodeScannerModal.jsx', 'src/components/compras/CancelarCompraModal.jsx', 'src/pages/Compras.jsx']) {
      expect(ler(arq)).not.toMatch(/className="produto-action-btn" onClick=\{(solicitarFechamento|closeCreate)\}(?: disabled=\{cancelando\})?>\s*<X /);
    }
  });
});
