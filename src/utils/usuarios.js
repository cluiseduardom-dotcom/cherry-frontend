import { somenteDigitos, cpfValido } from './mascaras';

export const UFS = Object.freeze([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]);

// Campos de dados cadastrais aceitos por POST /usuarios e PATCH /usuarios/:id/dados.
export const CAMPOS_DADOS = Object.freeze([
  'telefone', 'cpf', 'data_nascimento', 'cep', 'logradouro', 'numero', 'complemento',
  'bairro', 'cidade', 'uf', 'data_admissao', 'observacoes',
]);

export const DADOS_VAZIOS = Object.freeze(
  Object.fromEntries(CAMPOS_DADOS.map(campo => [campo, '']))
);

const CAMPOS_TEXTO_LIMITE = {
  logradouro: 255, numero: 20, complemento: 100, bairro: 100, cidade: 100, observacoes: 1000,
};

const CAMPOS_MASCARADOS = ['telefone', 'cpf', 'cep'];
const rotuloDoCampo = {
  telefone: 'Telefone', cpf: 'CPF', data_nascimento: 'Data de nascimento', cep: 'CEP',
  logradouro: 'Logradouro', numero: 'Número', complemento: 'Complemento', bairro: 'Bairro',
  cidade: 'Cidade', uf: 'UF', data_admissao: 'Data de admissão', observacoes: 'Observações',
  foto: 'Foto',
};

export function rotuloDeCampoDados(campo) {
  return rotuloDoCampo[campo] || campo;
}

// Converte o `dados` devolvido pelo backend (null = não informado) para o estado do formulário.
export function dadosParaFormulario(dados) {
  const form = { ...DADOS_VAZIOS };
  CAMPOS_DADOS.forEach(campo => {
    const valor = dados?.[campo];
    form[campo] = valor === null || valor === undefined ? '' : String(valor);
  });
  return form;
}

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Normaliza o valor de um campo como o backend espera ('' = vazio; máscaras viram só dígitos).
function normalizar(campo, valor) {
  const texto = String(valor ?? '').trim();
  if (CAMPOS_MASCARADOS.includes(campo)) return somenteDigitos(texto);
  if (campo === 'uf') return texto.toUpperCase();
  return texto;
}

// Valida os dados cadastrais (telefone obrigatório; o resto opcional). O backend valida de novo.
export function validarDadosCadastrais(form) {
  const erros = {};
  const dados = {};
  CAMPOS_DADOS.forEach(campo => { dados[campo] = normalizar(campo, form?.[campo]); });

  if (!dados.telefone) {
    erros.telefone = 'Telefone é obrigatório';
  } else if (!/^\d{10,11}$/.test(dados.telefone)) {
    erros.telefone = 'Telefone deve ter DDD + 8 ou 9 dígitos';
  }

  if (dados.cpf && !cpfValido(dados.cpf)) erros.cpf = 'CPF inválido';

  const hoje = hojeISO();
  const ehData = v => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(`${v}T00:00:00`).getTime());
  if (dados.data_nascimento) {
    if (!ehData(dados.data_nascimento)) erros.data_nascimento = 'Data inválida';
    else if (dados.data_nascimento < '1900-01-01' || dados.data_nascimento > hoje) {
      erros.data_nascimento = 'Data de nascimento fora do intervalo permitido';
    }
  }
  if (dados.data_admissao) {
    if (!ehData(dados.data_admissao)) erros.data_admissao = 'Data inválida';
    else if (dados.data_admissao < '1950-01-01') erros.data_admissao = 'Data de admissão muito antiga';
  }

  if (dados.cep && dados.cep.length !== 8) erros.cep = 'CEP deve ter 8 dígitos';
  if (dados.uf && !UFS.includes(dados.uf)) erros.uf = 'UF inválida';

  Object.entries(CAMPOS_TEXTO_LIMITE).forEach(([campo, limite]) => {
    if (dados[campo].length > limite) erros[campo] = `Máximo de ${limite} caracteres`;
  });

  return { valido: Object.keys(erros).length === 0, erros, dados };
}

// Payload de criação: só os campos preenchidos (o backend trata ausente como não informado).
export function dadosParaCriacao(dados) {
  return Object.fromEntries(CAMPOS_DADOS.filter(c => dados[c] !== '').map(c => [c, dados[c]]));
}

// Payload de edição: só o que mudou em relação ao carregado; campo esvaziado vira null.
export function dadosAlterados(dadosNormalizados, inicialForm) {
  const base = {};
  CAMPOS_DADOS.forEach(campo => { base[campo] = normalizar(campo, inicialForm?.[campo]); });

  const diff = {};
  CAMPOS_DADOS.forEach(campo => {
    if (dadosNormalizados[campo] !== base[campo]) {
      diff[campo] = dadosNormalizados[campo] === '' ? null : dadosNormalizados[campo];
    }
  });
  return diff;
}

export const CARGOS_CATALOGO = Object.freeze({
  admin: { cargo: 'admin', rotulo: 'Admin', nivel: 90, escada: true },
  diretor: { cargo: 'diretor', rotulo: 'Diretor', nivel: 80, escada: true },
  gerente: { cargo: 'gerente', rotulo: 'Gerente', nivel: 70, escada: true },
  coordenador: { cargo: 'coordenador', rotulo: 'Coordenador', nivel: 60, escada: true },
  supervisor: { cargo: 'supervisor', rotulo: 'Supervisor', nivel: 50, escada: true },
  analista: { cargo: 'analista', rotulo: 'Analista', nivel: 40, escada: true },
  vendedor: { cargo: 'vendedor', rotulo: 'Vendedor', nivel: 30, escada: true },
  operador: { cargo: 'operador', rotulo: 'Operador', nivel: 20, escada: true },
  auxiliar: { cargo: 'auxiliar', rotulo: 'Auxiliar', nivel: 10, escada: true },
  estoquista: { cargo: 'estoquista', rotulo: 'Estoquista', nivel: 0, escada: false },
  faturista: { cargo: 'faturista', rotulo: 'Faturista', nivel: 0, escada: false },
});

export function formatarCargo(cargo) {
  if (!cargo) return 'Não informado';
  const item = CARGOS_CATALOGO[String(cargo).toLowerCase()];
  return item ? item.rotulo : cargo;
}

export function nivelDoAtor(ator) {
  if (!ator) return 0;
  if (
    ator.role === 'admin' ||
    ator.perfil === 'admin' ||
    (Array.isArray(ator.capacidades) && ator.capacidades.includes('administrador'))
  ) {
    return 90;
  }
  return ator.nivel ?? 0;
}

export function cargosPermitidosParaCriacao(ator) {
  const nivelAtor = nivelDoAtor(ator);
  return Object.values(CARGOS_CATALOGO).filter(item => {
    if (item.cargo === 'admin') return false;
    return item.nivel < nivelAtor;
  });
}

export function formatarDataHora(valor) {
  if (!valor) return 'Não informada';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return 'Não informada';

  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();
  const hora = String(data.getHours()).padStart(2, '0');
  const min = String(data.getMinutes()).padStart(2, '0');

  return `${dia}/${mes}/${ano} ${hora}:${min}`;
}

export function formatarAcaoEvento(acao) {
  switch (acao) {
    case 'criar':
      return { label: 'Criação', badgeClass: 'badge-info' };
    case 'bloquear':
      return { label: 'Bloqueio', badgeClass: 'badge-danger' };
    case 'desbloquear':
      return { label: 'Desbloqueio', badgeClass: 'badge-success' };
    case 'editar':
      return { label: 'Edição de dados', badgeClass: 'badge-warning' };
    default:
      return { label: acao || 'Ação desconhecida', badgeClass: 'badge-primary' };
  }
}

export function validarCriarUsuario({ nome, email, senha, confirmacaoSenha, papel, ...camposDados }, ator) {
  const erros = {};

  const nomeTrim = nome ? String(nome).trim() : '';
  if (!nomeTrim) {
    erros.nome = 'Nome é obrigatório';
  } else if (nomeTrim.length > 255) {
    erros.nome = 'Nome muito longo';
  }

  const emailTrim = email ? String(email).trim().toLowerCase() : '';
  if (!emailTrim) {
    erros.email = 'Email é obrigatório';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
    erros.email = 'Email inválido';
  } else if (emailTrim.length > 255) {
    erros.email = 'Email muito longo';
  }

  const senhaStr = senha ? String(senha) : '';
  if (!senhaStr) {
    erros.senha = 'Senha deve ter no mínimo 6 caracteres';
  } else if (senhaStr.length < 6) {
    erros.senha = 'Senha deve ter no mínimo 6 caracteres';
  } else if (senhaStr.length > 128) {
    erros.senha = 'Senha muito longa';
  }

  if (confirmacaoSenha !== undefined && confirmacaoSenha !== senhaStr) {
    erros.confirmacaoSenha = 'Confirmação de senha não confere';
  }

  if (!papel) {
    erros.papel = 'Cargo é obrigatório';
  } else if (papel === 'admin') {
    erros.papel = 'Usuários Admin não podem ser criados por aqui';
  } else if (ator) {
    const permitidos = cargosPermitidosParaCriacao(ator);
    if (!permitidos.some(p => p.cargo === papel)) {
      erros.papel = 'Você só pode gerenciar usuários de cargo abaixo do seu nível';
    }
  }

  const cadastrais = validarDadosCadastrais(camposDados);
  Object.assign(erros, cadastrais.erros);

  return {
    valido: Object.keys(erros).length === 0,
    erros,
    dados: {
      nome: nomeTrim,
      email: emailTrim,
      senha: senhaStr,
      papel,
      ...dadosParaCriacao(cadastrais.dados),
    },
  };
}

export function validarBloqueioUsuario(motivo) {
  const motivoTrim = motivo ? String(motivo).trim() : '';
  if (!motivoTrim) {
    return { valido: false, erro: 'Motivo é obrigatório' };
  }
  if (motivoTrim.length < 3) {
    return { valido: false, erro: 'Motivo deve ter ao menos 3 caracteres' };
  }
  if (motivoTrim.length > 300) {
    return { valido: false, erro: 'Motivo muito longo' };
  }
  return { valido: true, motivo: motivoTrim };
}
