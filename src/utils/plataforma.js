const NOMES_MES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

const MES_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function mesValido(mes) {
  return typeof mes === 'string' && MES_RE.test(mes);
}

// 'AAAA-MM' do mês civil em Brasília (nunca o fuso do aparelho).
export function mesAtualBrasilia(agora = new Date()) {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' })
    .formatToParts(agora);
  const ano = partes.find(p => p.type === 'year').value;
  const mes = partes.find(p => p.type === 'month').value;
  return `${ano}-${mes}`;
}

export function deslocarMes(mes, delta) {
  if (!mesValido(mes)) return mes;
  const [ano, m] = mes.split('-').map(Number);
  const indice = ano * 12 + (m - 1) + delta;
  const novoAno = Math.floor(indice / 12);
  const novoMes = (indice % 12) + 1;
  return `${novoAno}-${String(novoMes).padStart(2, '0')}`;
}

export function rotuloMes(mes) {
  if (!mesValido(mes)) return '';
  const [ano, m] = mes.split('-').map(Number);
  const nome = NOMES_MES[m - 1];
  return `${nome[0].toUpperCase()}${nome.slice(1)} de ${ano}`;
}

// [0.1, 0.15] -> '0,10% e 0,15%'; [] -> '—'
export function formatarPercentuais(percentuais) {
  const lista = (Array.isArray(percentuais) ? percentuais : []).map(Number).filter(Number.isFinite);
  if (lista.length === 0) return '—';
  const textos = lista.map(p => `${p.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}%`);
  if (textos.length === 1) return textos[0];
  return `${textos.slice(0, -1).join(', ')} e ${textos[textos.length - 1]}`;
}
