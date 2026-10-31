// Textos da página pública de retorno do link de cartão. Só informativos: o resultado na URL não confirma pagamento.
export const TEXTOS_RESULTADO = {
  sucesso: {
    titulo: 'Pagamento enviado',
    texto: 'Obrigado! O Mercado Pago recebeu o seu pagamento. A loja confirma em instantes. Você já pode fechar esta página.',
  },
  pendente: {
    titulo: 'Pagamento em análise',
    texto: 'O Mercado Pago ainda está analisando o seu pagamento. A loja avisa quando for confirmado. Você pode fechar esta página.',
  },
  falha: {
    titulo: 'Pagamento não concluído',
    texto: 'O pagamento não foi concluído e nada foi cobrado. Peça um novo link à loja para tentar de novo.',
  },
};

export function textoDoResultado(resultado) {
  return TEXTOS_RESULTADO[resultado] ?? {
    titulo: 'Você pode fechar esta página',
    texto: 'Se você acabou de pagar, a loja confirma em instantes. Se tiver dúvida, fale com a loja.',
  };
}
