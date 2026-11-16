// Resultado (lucro) de vendas: formatação, soma de uma lista e períodos prontos.
// Os valores de cada venda vêm calculados do backend (`venda.resultado`); aqui só se soma e se mostra.
// Regras de cálculo: cherry-backend docs/RESULTADO_VENDAS_API.md.

const arredondar = (n, casas = 2) => Math.round((n + Number.EPSILON) * 10 ** casas) / 10 ** casas;

export function formatarMoeda(valor) {
  return Number(valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatarPct(valor) {
  if (valor === null || valor === undefined || !Number.isFinite(Number(valor))) return '—';
  return `${Number(valor).toFixed(1).replace('.', ',')}%`;
}

function pct(lucro, receita) {
  return receita > 0 ? arredondar((lucro / receita) * 100) : null;
}

// Soma o resultado das vendas concluídas da lista. Devolve null quando nenhuma venda traz `resultado`
// (usuário sem permissão de custos: o backend não envia o campo), para a tela esconder os cartões.
export function somarResultados(vendas) {
  const comResultado = (vendas ?? []).filter(v => v.status === 'finalizada' && v.resultado);
  const algumaVendaTemCampo = (vendas ?? []).some(v => v.resultado);

  if (!algumaVendaTemCampo) return null;

  const soma = comResultado.reduce(
    (acc, { resultado: r }) => ({
      receita: acc.receita + r.receita,
      custo: acc.custo + r.custo,
      comissao: acc.comissao + r.comissao,
      impostos: acc.impostos + r.impostos,
    }),
    { receita: 0, custo: 0, comissao: 0, impostos: 0 }
  );

  const lucroBruto = arredondar(soma.receita - soma.custo);
  const lucroLiquido = arredondar(lucroBruto - soma.comissao - soma.impostos);

  return {
    vendas: comResultado.length,
    receita: arredondar(soma.receita),
    custo: arredondar(soma.custo),
    comissao: arredondar(soma.comissao),
    impostos: arredondar(soma.impostos),
    lucro_bruto: lucroBruto,
    margem_bruta_pct: pct(lucroBruto, soma.receita),
    lucro_liquido: lucroLiquido,
    margem_liquida_pct: pct(lucroLiquido, soma.receita),
  };
}

const doisDigitos = n => String(n).padStart(2, '0');

function primeiroDia(ano, mes) {
  return `${ano}-${doisDigitos(mes)}-01`;
}

function ultimoDia(ano, mes) {
  return `${ano}-${doisDigitos(mes)}-${doisDigitos(new Date(Date.UTC(ano, mes, 0)).getUTCDate())}`;
}

function mesesAtras(ano, mes, n) {
  const indice = ano * 12 + (mes - 1) - n;
  return { ano: Math.floor(indice / 12), mes: (indice % 12) + 1 };
}

// Períodos prontos a partir de "hoje" ('YYYY-MM-DD'). `agrupar` pede a série mês a mês quando o período passa de um mês.
export function periodosPredefinidos(hoje) {
  const [ano, mes] = hoje.split('-').map(Number);
  const anterior = mesesAtras(ano, mes, 1);
  const tresMeses = mesesAtras(ano, mes, 2);

  return [
    { key: 'mes_atual', rotulo: 'Este mês', data_de: primeiroDia(ano, mes), data_ate: hoje, agrupar: undefined },
    { key: 'mes_anterior', rotulo: 'Mês anterior', data_de: primeiroDia(anterior.ano, anterior.mes), data_ate: ultimoDia(anterior.ano, anterior.mes), agrupar: undefined },
    { key: 'tres_meses', rotulo: 'Últimos 3 meses', data_de: primeiroDia(tresMeses.ano, tresMeses.mes), data_ate: hoje, agrupar: 'mes' },
    { key: 'ano', rotulo: 'Este ano', data_de: primeiroDia(ano, 1), data_ate: hoje, agrupar: 'mes' },
  ];
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function rotuloMes(chave) {
  const [ano, mes] = String(chave).split('-').map(Number);
  return MESES[mes - 1] ? `${MESES[mes - 1]}/${ano}` : String(chave);
}

// Os últimos `n` meses terminando no mês de `hoje` (inclusive), com a série mês a mês pedida ao backend.
export function periodoUltimosMeses(hoje, n) {
  const [ano, mes] = hoje.split('-').map(Number);
  const inicio = mesesAtras(ano, mes, n - 1);

  return { data_de: primeiroDia(inicio.ano, inicio.mes), data_ate: hoje, agrupar: 'mes' };
}

// Série do backend -> pontos do gráfico (faturamento, lucro bruto e lucro líquido por mês).
export function montarSerieGrafico(serie) {
  return (serie ?? []).map(s => ({
    mes: s.mes,
    rotulo: rotuloMes(s.mes),
    receita: Number(s.receita ?? 0),
    lucro_bruto: Number(s.lucro_bruto ?? 0),
    lucro_liquido: Number(s.lucro_liquido ?? 0),
    margem_bruta_pct: s.margem_bruta_pct ?? null,
    margem_liquida_pct: s.margem_liquida_pct ?? null,
  }));
}
