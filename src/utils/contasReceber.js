// Regras de tela de Contas a Receber (recebimento total e parcial), sem React. O backend valida de novo.
import { lerValor } from './fiado';

export const FORMAS_RECEBIMENTO = [
  { valor: 'dinheiro', rotulo: 'Dinheiro' },
  { valor: 'pix', rotulo: 'Pix' },
  { valor: 'debito', rotulo: 'Débito' },
  { valor: 'credito', rotulo: 'Crédito' },
];

export const LIMITE_OBSERVACAO = 300;

const emCentavos = (valor) => Math.round(Number(valor) * 100);

/** Quanto falta receber. Servidor antigo (sem `valor_restante`): conta pendente = valor cheio. */
export function restanteDaConta(conta) {
  if (!conta || conta.status === 'cancelado') return 0;
  if (conta.valor_restante !== undefined && conta.valor_restante !== null) return Number(conta.valor_restante);

  return conta.status === 'recebido' ? 0 : Number(conta.valor);
}

/** Quanto já entrou. Servidor antigo: conta recebida = valor cheio. */
export function recebidoDaConta(conta) {
  if (!conta || conta.status === 'cancelado') return 0;
  if (conta.valor_recebido !== undefined && conta.valor_recebido !== null) return Number(conta.valor_recebido);

  return conta.status === 'recebido' ? Number(conta.valor) : 0;
}

/** Totais dos cards: pendente = soma dos restantes das pendentes; recebido = soma do que já entrou (inclui parciais). */
export function resumirContas(contas) {
  const lista = Array.isArray(contas) ? contas : [];
  const centavosPendente = lista.filter((c) => c.status === 'pendente').reduce((s, c) => s + emCentavos(restanteDaConta(c)), 0);
  const centavosRecebido = lista.reduce((s, c) => s + emCentavos(recebidoDaConta(c)), 0);
  const centavosCancelado = lista.filter((c) => c.status === 'cancelado').reduce((s, c) => s + emCentavos(c.valor), 0);
  const base = centavosPendente + centavosRecebido;

  return {
    pendente: centavosPendente / 100,
    recebido: centavosRecebido / 100,
    cancelado: centavosCancelado / 100,
    taxa: base > 0 ? (centavosRecebido / base) * 100 : 0,
  };
}

/** Conta com recebimento parcial (parte já entrou, parte falta). */
export const ehParcial = (conta) => conta?.status === 'pendente' && recebidoDaConta(conta) > 0;

/** Conta antiga, sem parcela: só pode ser recebida por inteiro (o servidor decide; aqui só se orienta a tela). */
export const soPorInteiro = (conta) => conta?.parcela_id === null || conta?.parcela_id === undefined;

/**
 * Primeiro problema do recebimento, ou null. `valor` em branco = receber o restante todo (válido).
 * Valor maior que o restante, zero ou com mais de 2 casas é barrado antes de enviar.
 */
export function validarRecebimento({ valor, observacao }, restante) {
  const texto = String(valor ?? '').trim();

  if (texto !== '') {
    if (/[.,]\d{3,}$/.test(texto)) return 'Use no máximo 2 casas decimais.';

    const v = lerValor(texto);

    if (v === null || Number.isNaN(v)) return 'Informe o valor em reais (ex.: 25 ou 25,90).';
    if (v <= 0) return 'O valor deve ser maior que zero.';
    if (emCentavos(v) > emCentavos(restante)) return 'O valor não pode ser maior que o que falta receber.';
  } else if (emCentavos(restante) <= 0) {
    return 'Esta conta não tem saldo a receber.';
  }

  return String(observacao ?? '').trim().length > LIMITE_OBSERVACAO ? `A observação deve ter no máximo ${LIMITE_OBSERVACAO} caracteres.` : null;
}

/** Valor a enviar: número em reais, ou undefined quando em branco (o servidor recebe o restante). */
export function valorDoRecebimento(valor) {
  const texto = String(valor ?? '').trim();

  return texto === '' ? undefined : lerValor(texto);
}

/** Rótulo curto do recebimento no histórico: "Pix · 40,00". */
export function rotuloDaForma(forma) {
  return FORMAS_RECEBIMENTO.find((f) => f.valor === forma)?.rotulo ?? forma ?? '';
}
