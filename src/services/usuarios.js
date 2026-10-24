import { apiFetch } from './api';

export async function listarUsuarios() {
  const body = await apiFetch('/usuarios');
  return body.data;
}

// Cargos que o backend aceitaria ao criar (ativos na empresa, abaixo do nível do ator).
export async function listarCargosAtribuiveis() {
  const body = await apiFetch('/usuarios/cargos');
  return body.data;
}

const CAMPOS_DADOS = [
  'telefone', 'cpf', 'data_nascimento', 'cep', 'logradouro', 'numero', 'complemento',
  'bairro', 'cidade', 'uf', 'data_admissao', 'observacoes',
];

// Só os campos de dados cadastrais que o endpoint conhece (nada além disso vai no corpo).
function somenteCamposDados(origem) {
  return Object.fromEntries(
    CAMPOS_DADOS.filter(c => origem?.[c] !== undefined).map(c => [c, origem[c]])
  );
}

export async function criarUsuario({ nome, email, senha, papel, ...dados }) {
  const payload = {
    nome: String(nome).trim(),
    email: String(email).trim(),
    senha: String(senha),
    papel: String(papel).trim(),
    ...somenteCamposDados(dados),
  };

  const body = await apiFetch('/usuarios', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return body.data;
}

// Detalhe com dados cadastrais (único endpoint que devolve CPF).
export async function obterUsuario(id) {
  const body = await apiFetch(`/usuarios/${id}`);
  return body.data;
}

// Edição parcial: manda só os campos informados; null limpa um campo opcional.
export async function editarDadosUsuario(id, dados) {
  const body = await apiFetch(`/usuarios/${id}/dados`, {
    method: 'PATCH',
    body: JSON.stringify(somenteCamposDados(dados)),
  });
  return body.data;
}

export async function alterarBloqueioUsuario(id, { bloqueado, motivo }) {
  const payload = {
    bloqueado: Boolean(bloqueado),
    motivo: String(motivo).trim(),
  };

  const body = await apiFetch(`/usuarios/${id}/bloqueio`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return body.data;
}

export async function listarEventosUsuarios({ page = 1, pageSize = 20 } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  const body = await apiFetch(`/usuarios/eventos?${params.toString()}`);
  return body.data;
}
