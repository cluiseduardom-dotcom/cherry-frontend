// Retorno do OAuth: o backend redireciona para /configuracoes/empresa?mercadopago=conectado|erro.
export function lerResultadoMercadoPago(search) {
  const valor = new URLSearchParams(search || '').get('mercadopago');
  return valor === 'conectado' || valor === 'erro' ? valor : null;
}

// Só segue para o Mercado Pago: https e domínio mercadopago.* (a URL vem da API, mas o navegador
// nunca deve ser levado a um destino inesperado).
export function urlAutorizacaoValida(valor) {
  try {
    const url = new URL(valor);
    return url.protocol === 'https:' && /(^|\.)mercadopago\.com(\.[a-z]{2})?$/.test(url.hostname);
  } catch {
    return false;
  }
}

// Estado exibido na tela de Dados da empresa, a partir da resposta de status.
export function estadoMercadoPago(status) {
  if (!status) return 'indisponivel';
  if (!status.configurado) return 'nao_configurado';
  return status.conectado ? 'conectado' : 'desconectado';
}
