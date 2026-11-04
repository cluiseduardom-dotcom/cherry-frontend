// Regras puras da tela Bancos. O backend valida de verdade; aqui só se evita ida e volta inútil
// e se monta o corpo exatamente com os campos que o endpoint aceita (strict).

export const TIPOS_CONTA = [
  { valor: 'CONTA_CORRENTE', rotulo: 'Conta corrente' },
  { valor: 'CONTA_POUPANCA', rotulo: 'Poupança' },
  { valor: 'CONTA_PAGAMENTO', rotulo: 'Conta de pagamento (Mercado Pago, etc.)' },
  { valor: 'CAIXA', rotulo: 'Caixa (dinheiro)' },
];

export function rotuloTipoConta(tipo) {
  return TIPOS_CONTA.find(t => t.valor === tipo)?.rotulo.replace(/ \(.*\)/, '') ?? String(tipo ?? '—');
}

const ROTULO_ORIGEM = {
  MANUAL: 'Manual',
  PAGAMENTO: 'Pagamento',
  RECEBIMENTO: 'Recebimento',
  TRANSFERENCIA: 'Transferência',
  OPEN_FINANCE: 'Open Finance',
  API_BANCO: 'Automático',
  AJUSTE: 'Ajuste',
  EXTRATO: 'Extrato',
};

export function rotuloOrigem(origem) {
  return ROTULO_ORIGEM[origem] ?? String(origem ?? '—');
}

// Hoje em Brasília (YYYY-MM-DD), para o limite de data do lançamento manual.
export function hojeBrasilia(agora = new Date()) {
  return agora.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

// "1.234,56" ou "1234.56" → número com 2 casas; vazio/inválido → NaN.
export function lerValor(texto) {
  const bruto = String(texto ?? '').trim();
  if (!bruto) return NaN;
  const normalizado = bruto.includes(',') ? bruto.replace(/\./g, '').replace(',', '.') : bruto;
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalizado)) return NaN;
  return Number(normalizado);
}

export function validarConta(form, { criando }) {
  const erros = {};
  if (String(form.nome ?? '').trim().length < 2) erros.nome = 'Informe o nome da conta';
  if (criando && !form.tipo) erros.tipo = 'Escolha o tipo';
  if (form.saldo_inicial !== '' && form.saldo_inicial !== undefined && Number.isNaN(lerValor(form.saldo_inicial))) {
    erros.saldo_inicial = 'Valor inválido (use até 2 casas decimais)';
  }
  if (form.data_saldo_inicial && form.data_saldo_inicial < '1990-01-01') erros.data_saldo_inicial = 'Data inválida';
  return erros;
}

// Só o que o endpoint aceita. `incluirSaldo` = false quando o saldo inicial não pode mais mudar.
export function corpoConta(form, { criando, incluirSaldo = true }) {
  const texto = v => (String(v ?? '').trim() === '' ? null : String(v).trim());
  const corpo = {
    nome: String(form.nome).trim(),
    instituicao_nome: texto(form.instituicao_nome),
    agencia: texto(form.agencia),
    conta: texto(form.conta),
    observacao: texto(form.observacao),
  };
  if (criando) corpo.tipo = form.tipo;
  if (incluirSaldo) {
    corpo.saldo_inicial = form.saldo_inicial === '' || form.saldo_inicial === undefined ? 0 : lerValor(form.saldo_inicial);
    corpo.data_saldo_inicial = form.data_saldo_inicial || null;
  }
  if (criando && form.principal) corpo.principal = true;
  return corpo;
}

export function validarMovimento(form, hoje = hojeBrasilia()) {
  const erros = {};
  if (!form.conta_bancaria_id) erros.conta_bancaria_id = 'Escolha a conta';
  if (!['ENTRADA', 'SAIDA'].includes(form.tipo)) erros.tipo = 'Escolha entrada ou saída';
  const valor = lerValor(form.valor);
  if (Number.isNaN(valor) || valor <= 0) erros.valor = 'Informe um valor maior que zero';
  if (!form.data_movimento) erros.data_movimento = 'Informe a data';
  else if (form.data_movimento > hoje) erros.data_movimento = 'Não pode ser data futura (use contas a pagar/receber)';
  if (String(form.descricao ?? '').trim().length < 3) erros.descricao = 'Descreva o movimento (mínimo 3 letras)';
  return erros;
}

export function corpoMovimento(form) {
  const corpo = {
    conta_bancaria_id: Number(form.conta_bancaria_id),
    tipo: form.tipo,
    valor: lerValor(form.valor),
    data_movimento: form.data_movimento,
    descricao: String(form.descricao).trim(),
  };
  const obs = String(form.observacao ?? '').trim();
  if (obs) corpo.observacao = obs;
  return corpo;
}

// Soma só contas ativas: conta bloqueada/inativa não entra no "total em caixa".
export function totaisDasContas(contas) {
  const ativas = (contas ?? []).filter(c => c.status === 'ATIVA');
  const soma = campo => Math.round(ativas.reduce((s, c) => s + Number(c[campo] || 0), 0) * 100) / 100;
  return { saldo: soma('saldo_atual'), aLiberar: soma('a_liberar'), ativas: ativas.length };
}

// Situação do movimento para exibição.
export function situacaoMovimento(m) {
  if (m.cancelado_em) return { chave: 'cancelado', rotulo: 'Cancelado', classe: 'badge-danger' };
  if (m.conciliado) return { chave: 'conciliado', rotulo: 'Conferido', classe: 'badge-success' };
  return { chave: 'pendente', rotulo: 'A conferir', classe: 'badge-warning' };
}

export function podeCancelar(m) {
  return !m.cancelado_em && !m.conciliado;
}

export function sinalDoValor(m) {
  return m.tipo === 'ENTRADA' ? 1 : -1;
}

export function filtrosParaConsulta({ conta, tipo, conciliado, inicio, fim, cancelados, pagina, porPagina }) {
  const f = { limit: porPagina, offset: (pagina - 1) * porPagina };
  if (conta) f.conta_bancaria_id = conta;
  if (tipo) f.tipo = tipo;
  if (conciliado !== '') f.conciliado = conciliado;
  if (inicio) f.data_inicio = inicio;
  if (fim) f.data_fim = fim;
  if (cancelados) f.incluir_cancelados = true;
  return f;
}

// Lê o arquivo do extrato como texto. Bancos brasileiros ainda exportam OFX/CSV em Windows-1252: tenta UTF-8
// estrito e, se houver byte inválido, cai para Windows-1252 (acentos preservados).
export function decodificarExtrato(buffer) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('windows-1252').decode(buffer);
  }
}

export const TAMANHO_MAXIMO_EXTRATO = 3_000_000;

const SITUACOES = {
  nova: { rotulo: 'Nova', classe: 'badge-success' },
  ja_importada: { rotulo: 'Já importada', classe: 'badge-primary' },
  possivel_duplicado: { rotulo: 'Possível duplicado', classe: 'badge-warning' },
  fora_do_saldo: { rotulo: 'Antes do saldo inicial', classe: 'badge-danger' },
  futura: { rotulo: 'Data futura', classe: 'badge-danger' },
};

export function situacaoLinhaExtrato(situacao) {
  return SITUACOES[situacao] ?? { rotulo: String(situacao), classe: 'badge-primary' };
}

// Quantas linhas serão gravadas: as novas + as suspeitas que a pessoa marcou.
export function totalAImportar(linhas, incluidas) {
  const marcadas = incluidas instanceof Set ? incluidas : new Set(incluidas ?? []);
  return (linhas ?? []).filter(l => l.situacao === 'nova' || (l.situacao === 'possivel_duplicado' && marcadas.has(l.referencia_externa))).length;
}

export function resumoTexto(r) {
  if (!r) return '';
  const partes = [`${r.novas} nova(s)`];
  if (r.possiveis_duplicadas) partes.push(`${r.possiveis_duplicadas} possível(is) duplicado(s)`);
  if (r.ja_importadas) partes.push(`${r.ja_importadas} já importada(s)`);
  if (r.fora_do_saldo) partes.push(`${r.fora_do_saldo} antes do saldo inicial`);
  if (r.futuras) partes.push(`${r.futuras} com data futura`);
  if (r.erros) partes.push(`${r.erros} ilegível(is)`);
  return partes.join(' · ');
}

export function textoResultadoMercadoPago(r) {
  const base = `${r.entradas} entrada(s) e ${r.saidas} saída(s) lançadas`;
  const extra = [];
  if (r.ja_lancados) extra.push(`${r.ja_lancados} já estavam lançadas`);
  if (r.erros?.length) extra.push(`${r.erros.length} com erro`);
  if (r.tem_mais) extra.push('há mais: sincronize de novo');
  return extra.length ? `${base} (${extra.join('; ')}).` : `${base}.`;
}
