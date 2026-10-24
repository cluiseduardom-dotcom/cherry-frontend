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
    default:
      return { label: acao || 'Ação desconhecida', badgeClass: 'badge-primary' };
  }
}

export function validarCriarUsuario({ nome, email, senha, confirmacaoSenha, papel }, ator) {
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

  return {
    valido: Object.keys(erros).length === 0,
    erros,
    dados: {
      nome: nomeTrim,
      email: emailTrim,
      senha: senhaStr,
      papel,
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
