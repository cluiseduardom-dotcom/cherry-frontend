// Conferência de estoque de um local: a equipe conta fisicamente, o sistema compara com o saldo.
// O backend valida tudo de novo; aqui só se evita enviar o que ele recusaria.

export const MAX_CONTAGEM = 1000000;
export const MAX_ITENS = 200;

export const FORM_CONFERENCIA_VAZIO = { contagens: {}, observacao: '', aplicarAjuste: false };

// Diferença = contado − saldo do sistema (positivo = sobra, negativo = falta).
export function diferencaDaContagem(saldo, contado) {
  return Number(contado) - Number(saldo);
}

export function contagemValida(valor) {
  const texto = String(valor ?? '').trim();
  if (!/^\d+$/.test(texto)) return false;
  return Number(texto) <= MAX_CONTAGEM;
}

// Só entram na conferência os produtos com contagem digitada; vazio = não contado.
export function itensContados(saldos, contagens) {
  return saldos.filter((s) => String(contagens[s.produto_id] ?? '').trim() !== '');
}

export function resumoDaConferencia(saldos, contagens) {
  const contados = itensContados(saldos, contagens).filter((s) => contagemValida(contagens[s.produto_id]));
  let sobra = 0;
  let falta = 0;
  let comDiferenca = 0;

  for (const s of contados) {
    const dif = diferencaDaContagem(s.saldo, contagens[s.produto_id]);
    if (dif > 0) sobra += dif;
    if (dif < 0) falta += -dif;
    if (dif !== 0) comDiferenca += 1;
  }

  return { contados: contados.length, comDiferenca, sobra, falta };
}

export function rotuloDaDiferenca(dif) {
  if (dif === 0) return 'confere';
  return dif > 0 ? `+${dif}` : `−${Math.abs(dif)}`;
}

export function validarConferencia(saldos, form, { admin = false } = {}) {
  const contados = itensContados(saldos, form.contagens);

  if (contados.length === 0) return { valido: false, erro: 'Informe a quantidade contada de ao menos um produto.' };
  if (contados.length > MAX_ITENS) return { valido: false, erro: `Máximo de ${MAX_ITENS} produtos por conferência.` };

  const invalido = contados.find((s) => !contagemValida(form.contagens[s.produto_id]));
  if (invalido) {
    return { valido: false, erro: `Quantidade contada inválida em "${invalido.nome}". Use um número inteiro, 0 ou maior.` };
  }

  if (form.aplicarAjuste && !admin) {
    return { valido: false, erro: 'Só o administrador pode aplicar o ajuste ao estoque.' };
  }

  const observacao = form.observacao.trim();
  const dados = {
    itens: contados.map((s) => ({ produto_id: s.produto_id, quantidade_contada: Number(form.contagens[s.produto_id]) })),
    ...(observacao ? { observacao } : {}),
    ...(form.aplicarAjuste ? { aplicar_ajuste: true } : {}),
  };

  return { valido: true, dados };
}

// Colunas do acerto, na ordem da conta: inicial + recebido − enviado − vendido + ajustes + outros = atual.
export const COLUNAS_ACERTO = [
  { campo: 'saldo_inicial', rotulo: 'Saldo inicial' },
  { campo: 'recebido', rotulo: 'Recebido' },
  { campo: 'enviado', rotulo: 'Enviado' },
  { campo: 'vendido', rotulo: 'Vendido' },
  { campo: 'ajustes', rotulo: 'Ajustes' },
  { campo: 'outros', rotulo: 'Outros' },
  { campo: 'saldo_atual', rotulo: 'Saldo atual' },
];

// Mesma conta do backend, para sinalizar na tela uma linha que não fecha.
export function contaFecha(item) {
  return item.saldo_inicial + item.recebido - item.enviado - item.vendido + item.ajustes + item.outros === item.saldo_atual;
}

export function dataValida(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const d = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(valor);
}
