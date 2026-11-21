// Regras puras de apresentação dos relatórios de gestão. Sem DOM, testável.

const MAX_DIAS_PERIODO = 731;

export const FORMAS_PAGAMENTO = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  debito: 'Débito',
  credito: 'Crédito',
  crediario: 'Crediário',
};

export const DIAS_DA_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export const ROTULOS_CURVA = { A: 'A (até 80% da receita)', B: 'B (80% a 95%)', C: 'C (resto)' };

export function rotuloFormaPagamento(codigo) {
  return FORMAS_PAGAMENTO[codigo] ?? String(codigo ?? '—');
}

export function contarVendas(quantidade) {
  const n = Number(quantidade) || 0;
  return `${n} ${n === 1 ? 'venda' : 'vendas'}`;
}

export function rotuloDiaSemana(indice) {
  return DIAS_DA_SEMANA[indice] ?? '—';
}

function paraMs(iso) {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return Date.UTC(ano, mes - 1, dia);
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

// Mensagem de erro do período ('' = válido). Espelha o backend: ordem e no máximo 731 dias.
export function validarPeriodo(inicio, fim) {
  if (!ISO.test(inicio ?? '') || !ISO.test(fim ?? '')) return 'Informe as duas datas.';
  if (inicio > fim) return 'A data início não pode ser depois da data fim.';
  const dias = Math.round((paraMs(fim) - paraMs(inicio)) / 86400000) + 1;
  if (dias > MAX_DIAS_PERIODO) return `O período máximo é de ${MAX_DIAS_PERIODO} dias.`;
  return '';
}

function iso(data) {
  const p = n => String(n).padStart(2, '0');
  return `${data.getFullYear()}-${p(data.getMonth() + 1)}-${p(data.getDate())}`;
}

// Atalhos de período a partir de "hoje" (data local do navegador).
export function atalhosDePeriodo(hoje = new Date()) {
  const dias = n => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - n);
    return iso(d);
  };
  const fim = iso(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()));
  return [
    { chave: '7', rotulo: '7 dias', inicio: dias(6), fim },
    { chave: '30', rotulo: '30 dias', inicio: dias(29), fim },
    { chave: '90', rotulo: '90 dias', inicio: dias(89), fim },
    { chave: 'mes', rotulo: 'Este mês', inicio: iso(new Date(hoje.getFullYear(), hoje.getMonth(), 1)), fim },
  ];
}

// Variação para exibir: sinal explícito, vírgula decimal e tom. Sem base de comparação: "—".
export function descreverVariacao(pct) {
  if (pct === null || pct === undefined || !Number.isFinite(Number(pct))) {
    return { texto: '—', tom: 'neutro' };
  }
  const n = Number(pct);
  const texto = `${n > 0 ? '+' : ''}${n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`;
  return { texto, tom: n > 0 ? 'positivo' : n < 0 ? 'negativo' : 'neutro' };
}

export function formatarPercentual(pct) {
  if (pct === null || pct === undefined || !Number.isFinite(Number(pct))) return '—';
  return `${Number(pct).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`;
}

// Cobertura em dias legível; null = sem venda no período.
export function descreverCobertura(dias) {
  if (dias === null || dias === undefined) return 'Sem venda no período';
  const n = Number(dias);
  if (!Number.isFinite(n)) return '—';
  if (n >= 365) return 'Mais de 1 ano';
  return `${Math.round(n)} dias`;
}

// O relatório traz campos de custo? (o backend os omite para quem não pode ver custos)
export function temCusto(objeto) {
  return Boolean(objeto) && Object.prototype.hasOwnProperty.call(objeto, 'custo');
}

// Maior valor de uma lista de barras (mínimo 1 para nunca dividir por zero no gráfico).
export function maximoDasBarras(itens, campo) {
  return Math.max(1, ...itens.map(i => Number(i[campo]) || 0));
}

export function larguraDaBarra(valor, maximo) {
  if (!(maximo > 0)) return 0;
  return Math.max(0, Math.min(100, (Number(valor) / maximo) * 100));
}
