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

// ---------------------------------------------------------------------------
// Administração comercial (planos e condição individual por empresa)
// ---------------------------------------------------------------------------

// 'AAAA-MM-DD' de hoje em Brasília (nunca o fuso do aparelho).
export function hojeBrasilia(agora = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(agora);
}

// '2026-10-30' -> '30/10/2026'; ausente -> '—'
export function formatarData(iso) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return '—';
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

// 0.5 -> '0,50%'; 0.1234 -> '0,1234%'; ausente -> '—'
export function formatarPercentual(valor) {
  if (valor === null || valor === undefined || valor === '') return '—';
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return '—';
  return `${numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}%`;
}

// Texto digitado ('0,5', '0.5', ' 1 ') -> número; vazio ou inválido -> NaN. Aceita até 4 casas decimais.
export function interpretarPercentual(texto) {
  if (typeof texto !== 'string') return NaN;
  const limpo = texto.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,4})?$/.test(limpo)) return NaN;
  const numero = Number(limpo);
  return numero >= 0 && numero <= 100 ? numero : NaN;
}

const ROTULOS_ORIGEM = {
  excecao_empresa: 'Exceção da empresa',
  plano_padrao: 'Plano',
  padrao_sem_plano: 'Padrão (sem plano)',
};

export function rotuloOrigem(origem) {
  return ROTULOS_ORIGEM[origem] ?? '—';
}

function validarData(valor, hoje, erros, campo, obrigatoria = false) {
  if (!valor) {
    if (obrigatoria) erros[campo] = 'Informe a data.';
    return;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    erros[campo] = 'Data inválida.';
    return;
  }
  if (valor < hoje) erros[campo] = 'A data não pode ser anterior a hoje: vendas já feitas não são recalculadas.';
}

function validarJustificativa(texto, erros) {
  if (typeof texto !== 'string' || texto.trim().length < 3) erros.justificativa = 'Informe a justificativa.';
  else if (texto.trim().length > 500) erros.justificativa = 'Justificativa muito longa (máx. 500 caracteres).';
}

// Corpo enviado ao backend: só os campos suportados pelo endpoint.
export function validarTrocaPlano(form, hoje) {
  const erros = {};
  if (!form.plano) erros.plano = 'Selecione o plano.';
  validarData(form.vigencia_inicio, hoje, erros, 'vigencia_inicio');
  validarJustificativa(form.justificativa, erros);

  const corpo = { plano: form.plano, justificativa: (form.justificativa ?? '').trim() };
  if (form.vigencia_inicio) corpo.vigencia_inicio = form.vigencia_inicio;
  return { valido: Object.keys(erros).length === 0, erros, corpo };
}

export function validarCondicao(form, hoje) {
  const erros = {};
  const percentual = interpretarPercentual(form.percentual ?? '');
  if (Number.isNaN(percentual)) erros.percentual = 'Informe um percentual entre 0 e 100, com até 4 casas.';
  validarData(form.vigencia_inicio, hoje, erros, 'vigencia_inicio');
  validarData(form.vigencia_fim, hoje, erros, 'vigencia_fim');
  const inicio = form.vigencia_inicio || hoje;
  if (form.vigencia_fim && !erros.vigencia_fim && form.vigencia_fim < inicio) {
    erros.vigencia_fim = 'O fim não pode ser anterior ao início.';
  }
  validarJustificativa(form.justificativa, erros);

  const corpo = { percentual, justificativa: (form.justificativa ?? '').trim() };
  if (form.vigencia_inicio) corpo.vigencia_inicio = form.vigencia_inicio;
  if (form.vigencia_fim) corpo.vigencia_fim = form.vigencia_fim;
  return { valido: Object.keys(erros).length === 0, erros, corpo };
}

export function validarEncerrarCondicao(form, hoje) {
  const erros = {};
  validarData(form.a_partir_de, hoje, erros, 'a_partir_de');
  validarJustificativa(form.justificativa, erros);

  const corpo = { justificativa: (form.justificativa ?? '').trim() };
  if (form.a_partir_de) corpo.a_partir_de = form.a_partir_de;
  return { valido: Object.keys(erros).length === 0, erros, corpo };
}

// Efeito em linguagem de operação, mostrado antes de confirmar.
export function descreverEfeito({ acao, empresa, planoNome, percentual, inicio, hoje }) {
  const quando = !inicio || inicio === hoje ? 'a partir de hoje' : `a partir de ${formatarData(inicio)}`;
  const nota = 'Vendas já feitas não são recalculadas.';
  if (acao === 'plano') return `${empresa} passa para o plano ${planoNome} ${quando}. ${nota}`;
  if (acao === 'condicao') return `${empresa} passa a pagar ${formatarPercentual(percentual)} sobre o Pix ${quando}, como exceção ao plano. ${nota}`;
  return `A exceção de ${empresa} termina ${quando}; depois dela vale o plano. ${nota}`;
}
