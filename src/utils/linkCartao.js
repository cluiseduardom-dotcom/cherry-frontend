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

// Fatores de juros do parcelamento no cartão pelo link do Mercado Pago (pago pelo comprador), medidos nos testes
// reais de 02/11/2026 (total pago / valor): R$ 40 em 2x a 8x, conferidos com R$ 44 (2x a 4x) e R$ 20 (4x).
// ESTIMATIVA: não é tabela publicada pelo Mercado Pago, pode mudar e erra por centavos (a tela do Mercado Pago é a que vale).
// Só existem fatores de 2x a 8x; acima disso não se estima.
export const FATORES_JURO_LINK = { 2: 1.0965, 3: 1.1123, 4: 1.1135, 5: 1.143, 6: 1.1433, 7: 1.1673, 8: 1.1673 };

// { parcelas, valorParcela, total } estimados, ou null quando não há fator (acima de 8x ou entrada inválida).
export function estimarParcelamentoLink(valor, parcelas) {
  const v = Number(valor);
  if (!Number.isFinite(v) || v <= 0 || !Number.isInteger(parcelas) || parcelas < 1) return null;
  const centavos = Math.round(v * 100);
  if (parcelas === 1) return { parcelas, valorParcela: centavos / 100, total: centavos / 100 };
  const fator = FATORES_JURO_LINK[parcelas];
  if (!fator) return null;
  const total = Math.round(centavos * fator);
  return { parcelas, valorParcela: Math.round(total / parcelas) / 100, total: total / 100 };
}

// "6x de R$ 7,62 (total ≈ R$ 45,73)" ou null sem estimativa possível. Usa o formato de moeda do app.
export function textoEstimativaParcela(valor, parcelas) {
  const e = estimarParcelamentoLink(valor, parcelas);
  if (!e || e.parcelas < 2) return null;
  const moeda = n => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return `${e.parcelas}x de ${moeda(e.valorParcela)} (total ≈ ${moeda(e.total)})`;
}
