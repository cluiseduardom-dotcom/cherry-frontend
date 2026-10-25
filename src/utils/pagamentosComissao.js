// Pagamento da comissão ao vendedor: a empresa PAGA (Pix, transferência...) e registra aqui.
// O sistema só registra; não move dinheiro. O backend valida tudo de novo (inclusive o valor).

export const FORMAS_PAGAMENTO_COMISSAO = [
  { valor: 'pix', rotulo: 'Pix' },
  { valor: 'transferencia', rotulo: 'Transferência' },
  { valor: 'dinheiro', rotulo: 'Dinheiro' },
  { valor: 'outro', rotulo: 'Outro' },
];

export function rotuloDaFormaComissao(forma) {
  return FORMAS_PAGAMENTO_COMISSAO.find(f => f.valor === forma)?.rotulo ?? forma;
}

export function hojeISO(agora = new Date()) {
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

// Só quem tem líquido positivo pode ser pago; negativo/zero = descontos de estorno ainda não cobertos.
export function podePagar(linha) {
  return Number(linha?.a_pagar) > 0;
}

export const FORM_PAGAMENTO_VAZIO = { forma: 'pix', pagoEm: '', observacao: '' };

export function validarPagamentoComissao(linha, form, hoje = hojeISO()) {
  if (!podePagar(linha)) return { valido: false, erro: 'Não há comissão liberada a pagar para este vendedor.' };

  if (!FORMAS_PAGAMENTO_COMISSAO.some(f => f.valor === form.forma)) {
    return { valido: false, erro: 'Escolha a forma de pagamento.' };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.pagoEm)) return { valido: false, erro: 'Informe a data do pagamento.' };
  if (form.pagoEm > hoje) return { valido: false, erro: 'A data do pagamento não pode ser futura.' };

  const observacao = form.observacao.trim();

  return {
    valido: true,
    dados: {
      vendedor_id: Number(linha.vendedor_id),
      // O valor que a tela mostrou: o backend recusa (409) se mudou, em vez de pagar um valor diferente.
      valor_esperado: Number(linha.a_pagar),
      forma: form.forma,
      pago_em: form.pagoEm,
      ...(observacao ? { observacao } : {}),
    },
  };
}
