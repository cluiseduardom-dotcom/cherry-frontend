// Dados do gráfico de Pareto da Curva ABC.
// Fonte: `curva_abc` de GET /dashboard ({ id, nome, faturamento,
// percentual_acumulado, curva }). A Curva ABC é calculada pelo backend sobre
// todas as vendas finalizadas da empresa (não há período); aqui só se ordena,
// abrevia e deriva a participação individual. Nenhuma regra de negócio muda.

export function formatarMoeda(valor) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Versão curta para espaços estreitos: "R$ 9,8 mil".
export function formatarMoedaCompacta(valor) {
  return Number(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  });
}

export function formatarPercentual(valor) {
  return `${Number(valor).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

// Valor ausente, nulo ou não numérico vira 0 (ex.: faturamento null).
export function numeroSeguro(valor) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

// "Camiseta Básica Algodão" -> "Camiseta Básica A…"
export function abreviarNome(nome, max) {
  const texto = String(nome ?? '').trim();
  if (texto.length <= max) return texto;
  return `${texto.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

// Ordena por faturamento decrescente (desempate por id, como o backend) e
// devolve os `limite` primeiros pontos já com participação e acumulado.
// - participacao: faturamento do produto / faturamento total (todos os itens)
// - acumulado: percentual_acumulado do backend; se ausente, recalcula na ordem
export function montarSeriePareto(curvaAbc, limite = 8) {
  const itens = (Array.isArray(curvaAbc) ? curvaAbc : [])
    .filter(Boolean)
    .map(p => ({ ...p, valor: numeroSeguro(p.faturamento) }))
    .sort((a, b) => b.valor - a.valor || numeroSeguro(a.id) - numeroSeguro(b.id));

  const total = itens.reduce((soma, p) => soma + p.valor, 0);

  let corrente = 0;
  const pontos = itens.map((p, i) => {
    corrente += p.valor;
    const informado = p.percentual_acumulado;
    const acumuladoBackend = informado === null || informado === undefined || informado === ''
      ? NaN
      : Number(informado);

    return {
      rank: i + 1,
      id: p.id,
      nome: String(p.nome ?? ''),
      sku: p.sku ? String(p.sku) : null,
      curva: p.curva,
      faturamento: p.valor,
      participacao: total > 0 ? (p.valor / total) * 100 : 0,
      acumulado: Number.isFinite(acumuladoBackend)
        ? acumuladoBackend
        : (total > 0 ? (corrente / total) * 100 : 0),
    };
  });

  return { pontos: pontos.slice(0, limite), total };
}

// Rótulos do eixo X conforme o espaço por coluna: horizontal quando cabe,
// inclinado e mais curto quando não cabe (sem criar rolagem horizontal).
export function configurarRotulos(larguraDisponivel, quantidade) {
  const slot = quantidade > 0 ? larguraDisponivel / quantidade : larguraDisponivel;
  const horizontal = slot >= 96;

  return {
    horizontal,
    maxCaracteres: horizontal
      ? Math.max(8, Math.floor(slot / 6.4))
      : Math.min(16, Math.max(11, Math.floor(slot / 3.8))),
    valorCompleto: slot >= 84,
    valorVertical: slot < 52,
    alturaEixo: horizontal ? 34 : 92,
  };
}

// Escala do eixo de faturamento com 4 intervalos iguais (alinha com 0/25/50/75/100%
// do eixo de percentual) e folga no topo para os valores sobre as colunas.
export function eixoFaturamento(maximo) {
  const base = numeroSeguro(maximo) * 1.15;
  if (base <= 0) return { max: 4, ticks: [0, 1, 2, 3, 4] };

  const bruto = base / 4;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 1.5, 2, 2.5, 3, 4, 5, 10].map(f => f * potencia).find(p => p >= bruto);

  return { max: passo * 4, ticks: [0, 1, 2, 3, 4].map(i => i * passo) };
}
// Comprimento aproximado do texto vertical do valor (ex.: "R$ 9,8 mil"), em px.
export const COMPRIMENTO_VALOR_VERTICAL = 64;

// Posição do valor vertical de uma coluna, evitando o ponto da linha de
// percentual acumulado. Coordenadas em px do SVG (y cresce para baixo).
//  - topoY/baseY: topo e base da coluna; pontoY: y do ponto da linha na coluna
//  - candidatos, nesta ordem: dentro (base), dentro (topo), fora (acima da coluna)
// Devolve { modo, y } onde y é o ponto de ancoragem do texto (base do texto).
export function posicionarValorVertical({ topoY, baseY, pontoY, comprimento = COMPRIMENTO_VALOR_VERTICAL, folga = 10 }) {
  const altura = baseY - topoY;
  const livre = (inicio, fim) => !Number.isFinite(pontoY) || pontoY < inicio - folga || pontoY > fim + folga;

  if (altura >= comprimento + 12) {
    const baseInicio = baseY - 6 - comprimento;
    if (livre(baseInicio, baseY - 6)) return { modo: 'dentro', y: baseY - 6 };

    const topoFim = topoY + 6 + comprimento;
    if (livre(topoY + 6, topoFim)) return { modo: 'dentro', y: topoFim };
  }

  return { modo: 'fora', y: topoY - 6 };
}
// Posição (base do texto) do valor horizontal acima de uma coluna. O selo do percentual
// acumulado fica 12px acima do ponto da linha; se ele invadir a faixa do valor (ponto
// perto do topo da coluna), o valor sobe para logo acima do selo, sem sobreposição.
export function posicionarValorHorizontal({ topoY, pontoY, alturaSelo = 17, alturaTexto = 12, folga = 2 }) {
  const padrao = topoY - 6;
  if (!Number.isFinite(pontoY)) return padrao;

  const seloTopo = pontoY - 12 - alturaSelo / 2;
  const seloBase = pontoY - 12 + alturaSelo / 2;
  const textoTopo = padrao - alturaTexto;
  const sobrepoe = seloBase + folga > textoTopo && seloTopo - folga < padrao;

  // 5px = folga + espaço do texto abaixo da linha de base (descendentes)
  return sobrepoe ? seloTopo - folga - 5 : padrao;
}
// Rótulos do eixo X por posição (rank), como { nome, sufixo }. Nomes repetidos
// (ex.: variações do mesmo produto) ganham o SKU, quando a fonte o fornece, ou
// a posição, para que as colunas continuem distinguíveis depois de abreviadas.
export function rotulosDoEixo(pontos) {
  const repetidos = new Map();
  for (const p of pontos) repetidos.set(p.nome, (repetidos.get(p.nome) ?? 0) + 1);

  return new Map(pontos.map(p => {
    if (repetidos.get(p.nome) <= 1) return [p.rank, { nome: p.nome, sufixo: '' }];
    return [p.rank, { nome: p.nome, sufixo: p.sku ? ` · ${p.sku}` : ` (${p.rank}º)` }];
  }));
}

// Texto final do rótulo: o nome é abreviado para sobrar espaço ao sufixo, que
// nunca é cortado. Sem espaço mínimo para o nome, só o identificador aparece.
export function montarRotuloEixo({ nome, sufixo }, maxCaracteres) {
  if (!sufixo) return abreviarNome(nome, maxCaracteres);

  const espacoNome = maxCaracteres - sufixo.length;
  if (espacoNome < 5) return sufixo.replace(/^ · /, '').trim();

  return `${abreviarNome(nome, espacoNome)}${sufixo}`;
}