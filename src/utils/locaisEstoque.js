export const TIPOS_DE_LOCAL = {
  central: 'Central',
  maleta: 'Maleta',
  consignado: 'Consignado',
};

const NOME_MAX = 100;

// "Maleta Ana (Ana Souza)": o dono aparece quando o nome do local não o cita.
export function rotuloDoLocal(local) {
  if (!local) return '';
  const nome = local.nome || TIPOS_DE_LOCAL[local.tipo] || 'Local';

  if (local.tipo === 'maleta' && local.usuario_nome && !nome.toLowerCase().includes(local.usuario_nome.toLowerCase())) {
    return `${nome} (${local.usuario_nome})`;
  }

  return nome;
}

// Quem ainda pode receber uma Maleta: usuário ativo que não tem uma.
export function usuariosSemMaleta(usuarios, locais) {
  const comMaleta = new Set((locais ?? []).filter(l => l.tipo === 'maleta').map(l => l.usuario_id));
  return (usuarios ?? []).filter(u => u.ativo && !comMaleta.has(u.id));
}

export const FORM_LOCAL_VAZIO = { tipo: 'maleta', usuario_id: '', nome: '', cliente_id: '' };

// Devolve { valido, erros, dados } — dados só com os campos que o endpoint aceita para o tipo.
export function validarNovoLocal(form) {
  const erros = {};
  const nome = (form.nome ?? '').trim();

  if (nome.length > NOME_MAX) erros.nome = `Máximo de ${NOME_MAX} caracteres`;

  if (form.tipo === 'maleta') {
    if (!form.usuario_id) erros.usuario_id = 'Selecione o dono da maleta';
  } else if (form.tipo === 'consignado') {
    if (!nome) erros.nome = 'Informe o nome do consignatário';
  } else {
    erros.tipo = 'Tipo de local inválido';
  }

  if (Object.keys(erros).length) return { valido: false, erros, dados: null };

  const dados = form.tipo === 'maleta'
    ? { tipo: 'maleta', usuario_id: Number(form.usuario_id), ...(nome ? { nome } : {}) }
    : { tipo: 'consignado', nome, ...(form.cliente_id ? { cliente_id: Number(form.cliente_id) } : {}) };

  return { valido: true, erros: {}, dados };
}

// Busca local (nome ou SKU) sobre os saldos de um local, sem diferenciar maiúsculas.
export function filtrarSaldos(items, termo) {
  const t = (termo ?? '').trim().toLowerCase();
  if (!t) return items ?? [];
  return (items ?? []).filter(i => i.nome.toLowerCase().includes(t) || (i.sku ?? '').toLowerCase().includes(t));
}

export function totalDeUnidades(items) {
  return (items ?? []).reduce((soma, i) => soma + i.saldo, 0);
}
