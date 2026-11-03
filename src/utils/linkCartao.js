// Regras de apresentação do link de cartão no PDV. A garantia real é do Mercado Pago: aqui só se evita
// prometer ao cliente um parcelamento que a página do Mercado Pago não vai oferecer.

// Parcela mínima observada nos testes reais (R$ 20 -> até 4x; R$ 40 -> até 8x). É uma inferência
// (floor(valor / 5)), não uma regra publicada pelo Mercado Pago; por isso o texto sempre diz "até".
export const PARCELA_MINIMA_LINK = 5;
export const TETO_LINK_PADRAO = 12;

// Maior número de parcelas que o PDV pode anunciar para um link deste valor.
// `tetoGlobal` vem do backend (parcelas_maximas_link); sem ele, usa o padrão do backend (12).
export function parcelasPossiveisLink(valor, tetoGlobal) {
  const teto = Number.isInteger(tetoGlobal) && tetoGlobal >= 1 ? tetoGlobal : TETO_LINK_PADRAO;
  const v = Number(valor);
  if (!Number.isFinite(v) || v <= 0) return 1;
  const porValor = Math.floor(Math.round(v * 100) / (PARCELA_MINIMA_LINK * 100));
  return Math.max(1, Math.min(teto, porValor));
}

// Frase única usada na tela e na mensagem do WhatsApp.
export function textoParcelasLink(maximo) {
  if (maximo == null) return 'O cliente escolhe as parcelas na página do Mercado Pago. O juro do parcelamento é pago pelo cliente.';
  if (!(maximo > 1)) return 'Pagamento à vista no cartão de crédito.';
  return `O cliente escolhe as parcelas na página do Mercado Pago, em até ${maximo}x. O juro do parcelamento é pago pelo cliente.`;
}
