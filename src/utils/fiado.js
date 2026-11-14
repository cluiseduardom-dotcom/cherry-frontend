// Regras de tela da Colheita (fiado), sem React. O backend valida de novo; aqui só se avisa antes de enviar.

export const FORMAS_PAGAMENTO = [
  { valor: '', rotulo: 'Não informar' },
  { valor: 'dinheiro', rotulo: 'Dinheiro' },
  { valor: 'pix', rotulo: 'Pix' },
  { valor: 'debito', rotulo: 'Débito' },
  { valor: 'credito', rotulo: 'Crédito' },
  { valor: 'outro', rotulo: 'Outro' },
];

export const VALOR_MAXIMO = 999999.99;
export const LIMITE_DESCRICAO = 200;
export const LIMITE_MOTIVO = 300;

/** Lê "12,50", "1.234,56" ou "12.5": vazio = null; lixo = NaN. Sempre em reais, arredondado a centavos. */
export function lerValor(texto) {
  const t = String(texto ?? '').trim();

  if (t === '') return null;

  // Com vírgula, o ponto é separador de milhar; sem vírgula, o ponto é decimal.
  const normalizado = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;

  if (!/^\d+(\.\d+)?$/.test(normalizado)) return NaN;

  return Math.round(Number(normalizado) * 100) / 100;
}

function problemaDoValor(valor) {
  if (valor === null || Number.isNaN(valor)) return 'Informe o valor em reais (ex.: 25 ou 25,90).';
  if (valor <= 0) return 'O valor deve ser maior que zero.';
  if (valor > VALOR_MAXIMO) return 'O valor máximo por lançamento é R$ 999.999,99.';

  return null;
}

/** Primeiro problema da compra (dívida), ou null. */
export function validarCompra({ valor, descricao }) {
  const v = lerValor(valor);

  // Mais de 2 casas decimais: lerValor arredondaria em silêncio; aqui se avisa.
  if (/[.,]\d{3,}$/.test(String(valor).trim())) return 'Use no máximo 2 casas decimais.';

  return problemaDoValor(v)
    ?? (String(descricao ?? '').trim() === '' ? 'Descreva a compra.' : null)
    ?? (String(descricao).trim().length > LIMITE_DESCRICAO ? `A descrição deve ter no máximo ${LIMITE_DESCRICAO} caracteres.` : null);
}

/** Primeiro problema do pagamento, ou null. `saldo` em reais: pagamento maior que a dívida não é aceito. */
export function validarPagamento({ valor }, saldo) {
  const v = lerValor(valor);

  if (/[.,]\d{3,}$/.test(String(valor).trim())) return 'Use no máximo 2 casas decimais.';

  const problema = problemaDoValor(v);

  if (problema) return problema;

  return Math.round(v * 100) > Math.round(Number(saldo) * 100) ? 'O pagamento não pode ser maior que o saldo devedor.' : null;
}

export function validarMotivo(motivo) {
  const t = String(motivo ?? '').trim();

  if (t.length < 3) return 'Informe o motivo do estorno (mínimo 3 caracteres).';

  return t.length > LIMITE_MOTIVO ? `O motivo deve ter no máximo ${LIMITE_MOTIVO} caracteres.` : null;
}

/** Valor em reais para preencher o campo ("1234.5" -> "1234,50"). */
export function valorParaCampo(valor) {
  return Number(valor).toFixed(2).replace('.', ',');
}

/** "2026-01-31" -> "31/01/2026", sem passar por Date (evita o erro de fuso das datas de calendário). */
export function dataBr(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''));

  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

/** Chave de idempotência de UMA tentativa de lançamento (reaproveitada no "tentar de novo"). */
export function novaChave() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

const ROTULO_TIPO = { compra: 'Dívida', pagamento: 'Pagamento', estorno: 'Estorno' };

export const rotuloDoTipo = (tipo) => ROTULO_TIPO[tipo] ?? tipo;

/** Linha do extrato: "Dívida", "Pagamento (Pix)" ou "Estorno". */
export function tituloDoLancamento(l) {
  const base = rotuloDoTipo(l.tipo);
  const forma = FORMAS_PAGAMENTO.find((f) => f.valor === l.forma && f.valor);

  return l.tipo === 'pagamento' && forma ? `${base} (${forma.rotulo})` : base;
}

/** Sinal para a tela: dívida soma (vermelho), pagamento reduz (verde); estorno depende do que foi estornado (o backend manda `estorna_id`). */
export function efeitoDoLancamento(l, porId = new Map()) {
  if (l.tipo === 'compra') return 'aumenta';
  if (l.tipo === 'pagamento') return 'reduz';

  const original = porId.get(l.estorna_id);

  if (!original) return 'neutro';

  return original.tipo === 'compra' ? 'reduz' : 'aumenta';
}
