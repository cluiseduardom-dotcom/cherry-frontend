import { VALOR_MAXIMO, lerValor } from './fiado';
import { formatarMoeda } from './mascaras';

// Pix para RECEBER (fiado da Colheita ou conta a receber/parcela do crediário). O dinheiro cai na conta Mercado Pago da empresa e o
// servidor dá a baixa sozinho quando o Pix é pago. Contrato: backend POST /pagamentos-gateway/pix com `destino` (docs/MERCADOPAGO_PIX.md).
export const destinoFiado = (clienteId) => ({ tipo: 'fiado', cliente_id: Number(clienteId) });
export const destinoConta = (contaId) => ({ tipo: 'conta_receber', conta_id: Number(contaId) });

/** Problema do valor do Pix (ou null). `maximo` = o que falta receber; o servidor confere de novo. */
export function validarValorPix(texto, maximo) {
  const v = lerValor(texto);

  if (/[.,]\d{3,}$/.test(String(texto ?? '').trim())) return 'Use no máximo 2 casas decimais.';
  if (v === null || Number.isNaN(v)) return 'Informe o valor em reais (ex.: 25 ou 25,90).';
  if (v <= 0) return 'O valor deve ser maior que zero.';
  if (v > VALOR_MAXIMO) return 'O valor máximo por Pix é R$ 999.999,99.';
  if (Math.round(v * 100) > Math.round(Number(maximo) * 100)) return `O valor não pode passar do que falta receber (${formatarMoeda(maximo)}).`;

  return null;
}

/**
 * O que mostrar quando o Pix foi pago. `destino` vem da cobrança consultada:
 * - aplicado: o servidor já lançou o recebimento;
 * - falhou: o Pix foi pago mas o servidor não conseguiu lançar (ex.: o saldo mudou); o dinheiro fica em "Pix a devolver";
 * - aguardando: pago, lançamento ainda em andamento (a tela consulta de novo).
 */
export function resultadoDoPixPago(cobranca) {
  const destino = cobranca?.destino;

  if (destino?.aplicado) return { situacao: 'aplicado', mensagem: `Pix de ${formatarMoeda(cobranca.valor)} recebido e lançado.` };
  if (destino?.erro) {
    return {
      situacao: 'falhou',
      mensagem: `O Pix de ${formatarMoeda(cobranca.valor)} foi pago, mas não foi lançado: ${destino.erro} Avise o administrador: o valor fica em "Pix a devolver".`,
    };
  }

  return { situacao: 'aguardando', mensagem: 'Pix pago. Confirmando o lançamento…' };
}
