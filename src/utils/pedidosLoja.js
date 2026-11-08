// Regras puras da tela "Pedidos da loja" (sem DOM, testável).

// Telefone da cliente como foi digitado na loja (só dígitos, com DDD). Para o WhatsApp precisa do código do país:
// 10 ou 11 dígitos = número brasileiro sem o 55; 12 ou 13 começando em 55 já vem completo; o resto não vira link.
export function linkWhatsApp(telefone, codigoCurto) {
  const digitos = String(telefone ?? '').replace(/\D/g, '');
  let completo = null;

  if (digitos.length === 10 || digitos.length === 11) completo = `55${digitos}`;
  else if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith('55')) completo = digitos;

  if (!completo) return null;

  const texto = codigoCurto ? `Olá! Aqui é da Cherry Semijoias, sobre o seu pedido ${codigoCurto}. Vamos combinar a entrega?` : 'Olá! Aqui é da Cherry Semijoias.';

  return `https://wa.me/${completo}?text=${encodeURIComponent(texto)}`;
}

// "(11) 91234-5678" para exibir; número fora do padrão aparece como veio.
export function formatarTelefone(telefone) {
  const d = String(telefone ?? '').replace(/\D/g, '');

  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;

  return telefone ?? '';
}

// Há quanto tempo o pedido foi pago, em palavras. `agora` injetável para teste.
// `new Date(null)` é 1970: data ausente nunca vira "há décadas".
const instante = (dataIso) => (dataIso === null || dataIso === undefined || dataIso === '' ? NaN : new Date(dataIso).getTime());

export function tempoDesde(dataIso, agora = Date.now()) {
  const t = instante(dataIso);

  if (!Number.isFinite(t)) return '';

  const minutos = Math.max(0, Math.floor((agora - t) / 60000));

  if (minutos < 1) return 'agora há pouco';
  if (minutos < 60) return `há ${minutos} min`;

  const horas = Math.floor(minutos / 60);

  if (horas < 48) return `há ${horas} h`;

  return `há ${Math.floor(horas / 24)} dias`;
}

// Resumo dos itens do pedido numa linha: "2 × Brinco, 1 × Colar".
export function resumoDosItens(itens) {
  return (Array.isArray(itens) ? itens : []).map((i) => `${i.quantidade} × ${i.nome}`).join(', ');
}

// Pedido pago há 24 horas ou mais sem contato: a equipe precisa agir (mesma regra do aviso do backend).
export function esperaCritica(pagoEm, agora = Date.now()) {
  const t = instante(pagoEm);

  return Number.isFinite(t) && agora - t >= 24 * 3600 * 1000;
}
