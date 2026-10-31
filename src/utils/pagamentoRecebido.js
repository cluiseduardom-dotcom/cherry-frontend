// Textos da página pública de retorno do link de cartão. Só informativos: o resultado na URL não confirma pagamento.
export const TEXTOS_RESULTADO = {
  sucesso: {
    titulo: 'Pagamento enviado',
    texto: 'Obrigado! O Mercado Pago recebeu o seu pagamento. A loja confirma em instantes. Você já pode fechar esta página.',
  },
  pendente: {
    titulo: 'Pagamento em análise',
    texto: 'O Mercado Pago ainda está analisando o seu pagamento. A loja avisa quando for confirmado. Se quiser, volte ao pagamento ou feche esta página.',
  },
  falha: {
    titulo: 'Pagamento não concluído',
    texto: 'O pagamento não foi concluído. Toque em "Voltar ao pagamento" para tentar de novo ou fale com a loja.',
  },
};

export function textoDoResultado(resultado) {
  return TEXTOS_RESULTADO[resultado] ?? {
    titulo: 'Você pode fechar esta página',
    texto: 'Se você acabou de pagar, a loja confirma em instantes. Se tiver dúvida, fale com a loja.',
  };
}

// Só faz sentido oferecer "voltar" quando o pagamento não foi enviado com sucesso.
export function podeVoltarAoPagamento(resultado) {
  return resultado !== 'sucesso';
}
