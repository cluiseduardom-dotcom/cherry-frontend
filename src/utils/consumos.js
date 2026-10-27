export const MOTIVOS_AVULSO = [
  { value: 'uso_interno', label: 'Uso interno' },
  { value: 'perda', label: 'Perda' },
  { value: 'brinde', label: 'Brinde' },
  { value: 'outro', label: 'Outro' },
];

export const MOTIVOS_VENDA = [
  { value: 'brinde', label: 'Brinde' },
  { value: 'substituicao', label: 'Substituição' },
  { value: 'outro', label: 'Outro' },
];

export const ROTULO_MOTIVO = {
  uso_interno: 'Uso interno',
  perda: 'Perda',
  brinde: 'Brinde',
  substituicao: 'Substituição',
  outro: 'Outro',
  ficha: 'Ficha de venda',
};

export const ROTULO_ESTADO = {
  ativa: 'Baixado',
  pendente: 'Pendente (sem saldo)',
  retirada: 'Retirado',
  cancelamento: 'Devolvido (venda cancelada)',
};

export function validarAvulso(form) {
  if (!form.produto_id) return 'Escolha o insumo';
  const q = Number(form.quantidade);
  if (!Number.isInteger(q) || q <= 0) return 'Quantidade deve ser um inteiro maior que zero';
  if (!form.motivo) return 'Escolha o motivo';
  if (form.motivo === 'uso_interno' && !String(form.finalidade ?? '').trim()) {
    return 'Informe a finalidade do uso interno';
  }
  return '';
}

export function montarAvulso(form) {
  const payload = {
    produto_id: Number(form.produto_id),
    quantidade: Number(form.quantidade),
    motivo: form.motivo,
  };
  if (form.responsavel_id) payload.responsavel_id = Number(form.responsavel_id);
  if (String(form.finalidade ?? '').trim()) payload.finalidade = form.finalidade.trim();
  if (String(form.observacao ?? '').trim()) payload.observacao = form.observacao.trim();
  return payload;
}

export function validarLinhaVenda(form) {
  if (!form.produto_id) return 'Escolha o insumo';
  const q = Number(form.quantidade);
  if (!Number.isInteger(q) || q <= 0) return 'Quantidade deve ser um inteiro maior que zero';
  if (!form.motivo) return 'Escolha o motivo';
  return '';
}

export function validarFicha(itens) {
  const vistos = new Set();
  for (const it of itens) {
    if (!it.insumo_produto_id) return 'Escolha o insumo de todas as linhas';
    const q = Number(it.quantidade);
    if (!Number.isInteger(q) || q <= 0) return 'Quantidade deve ser um inteiro maior que zero';
    if (vistos.has(String(it.insumo_produto_id))) return 'Insumo repetido na ficha';
    vistos.add(String(it.insumo_produto_id));
  }
  return '';
}

export function montarFicha(itens) {
  return itens.map(it => ({ insumo_produto_id: Number(it.insumo_produto_id), quantidade: Number(it.quantidade) }));
}

export function podeRetirar(linha) {
  return linha.estado === 'ativa' || linha.estado === 'pendente';
}

export function podeRegularizar(linha) {
  return linha.estado === 'pendente' && Number(linha.quantidade_pendente) > 0;
}

export function formatarCusto(v) {
  if (v === undefined || v === null) return null;
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
