import { barrasCode128, codigoValidoParaEtiqueta, larguraEmModulos } from './codigoBarras128';

// Plano de desenho de UMA etiqueta com código de barras, em milímetros. Puro (sem DOM): os renderizadores
// (PNG para a Nimbot, PDF para folha A4) só desenham o que este plano manda, então o layout é testável.
//
// Layout (altura A): nome em cima, barras no meio, código à esquerda e preço à direita embaixo.
// Zona de silêncio de 10 módulos nas laterais (mínimo do Code 128); nunca encolhemos abaixo disso.

export const ZONA_SILENCIO_MODULOS = 10;
// Abaixo disto muitos leitores (principalmente câmera de celular) deixam de ler. Só avisamos; quem decide é o usuário.
export const MODULO_MINIMO_RECOMENDADO_MM = 0.19;

export const PRESET_NIMBOT_D110 = { larguraMm: 30, alturaMm: 15 };
// Padrão de folha A4 de etiquetas pequenas. NÃO verificado contra uma folha real: o usuário ajusta ao seu modelo.
export const PRESET_FOLHA_A4 = {
  larguraMm: 38.1, alturaMm: 21.2, colunas: 5, linhas: 13,
  margemEsquerdaMm: 4.7, margemTopoMm: 10.7, espacoHorizontalMm: 2.5, espacoVerticalMm: 0,
};

const MM_POR_PT = 25.4 / 72;
export const mmParaPt = (mm) => mm / MM_POR_PT;

export function formatarPrecoEtiqueta(preco) {
  const n = Number(preco);

  if (preco === null || preco === undefined || preco === '' || !Number.isFinite(n) || n < 0) return '';

  return `R$ ${n.toFixed(2).replace('.', ',')}`;
}

// Corta o nome para caber (estimativa: largura média de um caractere ≈ 0,55 da altura da fonte).
export function ajustarTexto(texto, larguraMm, alturaFonteMm) {
  const limpo = String(texto ?? '').replace(/\s+/g, ' ').trim();
  const maximo = Math.max(1, Math.floor(larguraMm / (alturaFonteMm * 0.55)));

  return limpo.length <= maximo ? limpo : `${limpo.slice(0, Math.max(1, maximo - 1)).trimEnd()}…`;
}

// passoMm (opcional): grade de impressão (1 pixel da impressora). Com ele a largura do módulo é arredondada
// PARA BAIXO a um número inteiro de pixels, para as barras não ficarem borradas em impressora térmica.
export function planoDaEtiqueta({ codigo, nome, preco }, { larguraMm, alturaMm, passoMm = 0 }) {
  if (!codigoValidoParaEtiqueta(codigo)) throw new Error('Código inválido para etiqueta');
  if (!(larguraMm > 0) || !(alturaMm > 0)) throw new Error('Tamanho de etiqueta inválido');

  const margem = Math.max(0.6, Math.min(larguraMm, alturaMm) * 0.05);
  const modulos = larguraEmModulos(codigo);
  const disponivel = larguraMm - 2 * margem;
  let modulo = disponivel / (modulos + 2 * ZONA_SILENCIO_MODULOS);

  if (passoMm > 0) modulo = Math.max(passoMm, Math.floor(modulo / passoMm) * passoMm);

  const larguraBarras = modulos * modulo;
  const x0 = (larguraMm - larguraBarras) / 2;

  const fonteNome = alturaMm * 0.16;
  const fonteRodape = alturaMm * 0.15;
  const fontePreco = alturaMm * 0.2;
  const precoTexto = formatarPrecoEtiqueta(preco);

  const yBarras = margem + alturaMm * 0.2;
  const alturaBarras = alturaMm * 0.46;
  const yRodape = alturaMm - margem - alturaMm * 0.02;

  const barras = barrasCode128(codigo).map(([inicio, largura]) => ({
    x: x0 + inicio * modulo, y: yBarras, w: largura * modulo, h: alturaBarras,
  }));

  const textos = [];
  const nomeAjustado = ajustarTexto(nome, disponivel, fonteNome);

  if (nomeAjustado) {
    textos.push({ texto: nomeAjustado, x: larguraMm / 2, y: margem + fonteNome * 0.9, alturaFonteMm: fonteNome, alinhamento: 'center', negrito: false });
  }

  if (precoTexto) {
    textos.push({ texto: codigo, x: margem, y: yRodape, alturaFonteMm: fonteRodape, alinhamento: 'left', negrito: false });
    textos.push({ texto: precoTexto, x: larguraMm - margem, y: yRodape, alturaFonteMm: fontePreco, alinhamento: 'right', negrito: true });
  } else {
    textos.push({ texto: codigo, x: larguraMm / 2, y: yRodape, alturaFonteMm: fonteRodape, alinhamento: 'center', negrito: false });
  }

  return {
    larguraMm, alturaMm, barras, textos, moduloMm: modulo,
    pequenaDemais: modulo < MODULO_MINIMO_RECOMENDADO_MM,
  };
}

// ---- Folha A4 ----

export function validarFolha(cfg) {
  const { larguraMm, alturaMm, colunas, linhas, margemEsquerdaMm, margemTopoMm, espacoHorizontalMm, espacoVerticalMm } = cfg;
  const numeros = [larguraMm, alturaMm, margemEsquerdaMm, margemTopoMm, espacoHorizontalMm, espacoVerticalMm];

  if (numeros.some((n) => !Number.isFinite(n) || n < 0)) return 'Preencha todas as medidas com números.';
  if (!(larguraMm > 0) || !(alturaMm > 0)) return 'Largura e altura da etiqueta devem ser maiores que zero.';
  if (!Number.isInteger(colunas) || !Number.isInteger(linhas) || colunas < 1 || linhas < 1) return 'Colunas e linhas devem ser números inteiros a partir de 1.';

  const larguraTotal = margemEsquerdaMm + colunas * larguraMm + (colunas - 1) * espacoHorizontalMm;
  const alturaTotal = margemTopoMm + linhas * alturaMm + (linhas - 1) * espacoVerticalMm;

  if (larguraTotal > 210.01) return `As colunas passam da largura da folha A4 (${larguraTotal.toFixed(1)} mm de 210 mm).`;
  if (alturaTotal > 297.01) return `As linhas passam da altura da folha A4 (${alturaTotal.toFixed(1)} mm de 297 mm).`;

  return '';
}

// Posições (mm, canto superior esquerdo) de cada etiqueta, em ordem de leitura, página por página.
export function posicoesNaFolha(total, cfg) {
  const porPagina = cfg.colunas * cfg.linhas;
  const posicoes = [];

  for (let i = 0; i < total; i += 1) {
    const naPagina = i % porPagina;
    const coluna = naPagina % cfg.colunas;
    const linha = Math.floor(naPagina / cfg.colunas);

    posicoes.push({
      pagina: Math.floor(i / porPagina),
      x: cfg.margemEsquerdaMm + coluna * (cfg.larguraMm + cfg.espacoHorizontalMm),
      y: cfg.margemTopoMm + linha * (cfg.alturaMm + cfg.espacoVerticalMm),
    });
  }

  return posicoes;
}

// Lista de itens {codigo, nome, preco, copias} -> uma etiqueta por cópia, em sequência.
export function expandirCopias(itens) {
  const lista = [];

  for (const item of itens) {
    const copias = Math.max(0, Math.min(999, Math.floor(Number(item.copias) || 0)));

    for (let i = 0; i < copias; i += 1) lista.push({ codigo: item.codigo, nome: item.nome, preco: item.preco });
  }

  return lista;
}
