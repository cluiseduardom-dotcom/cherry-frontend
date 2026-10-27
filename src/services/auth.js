import { apiFetch, ApiError } from './api';
import { resolverTema } from '../theme/themes';

export async function buscarMe(token) {
  const body = await apiFetch('/auth/me', {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return body?.data ?? body;
}

export function formatarUsuario(me, usuarioBase = {}) {
  // Mantém compatibilidade com o modelo de role legado:
  // usa me.perfil (admin/vendedor/estoquista/faturista) como role principal para access.js
  const perfil = me?.perfil || usuarioBase?.perfil || usuarioBase?.role;

  return {
    ...usuarioBase,
    id: me?.id ?? usuarioBase?.id,
    nome: usuarioBase?.nome ?? me?.nome,
    email: usuarioBase?.email ?? me?.email,
    empresa_id: me?.empresa_id ?? usuarioBase?.empresa_id,
    perfil,
    cargo: me?.cargo ?? usuarioBase?.cargo ?? usuarioBase?.role,
    nivel: me?.nivel !== undefined ? me.nivel : (usuarioBase?.nivel ?? null),
    capacidades: Array.isArray(me?.capacidades) ? me.capacidades : (usuarioBase?.capacidades || []),
    role: perfil,
    tema: usuarioBase?.tema,
    // Senha definida por um admin: o backend só deixa trocar a senha até concluir a troca.
    senha_temporaria: me?.senha_temporaria === true,
  };
}

export async function loginRequest(email, senha) {
  const body = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, senha }),
    skipAuthRedirect: true,
  });

  const { token, usuario } = body.data;

  const baseUser = {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    role: usuario.papel,
    perfil: usuario.papel,
    cargo: usuario.papel,
    nivel: null,
    capacidades: [],
    tema: resolverTema(usuario.empresa?.tema),
  };

  let me;
  try {
    me = await buscarMe(token);
  } catch (err) {
    throw new ApiError(
      err?.message || 'Falha ao consultar permissões do usuário.',
      err?.status || 500
    );
  }

  const user = formatarUsuario(me, baseUser);

  return {
    token,
    user,
  };
}

// Troca da própria senha. O backend devolve um token novo (as demais sessões caem).
export async function alterarSenha({ senha_atual, nova_senha }) {
  const body = await apiFetch('/auth/senha', {
    method: 'POST',
    body: JSON.stringify({ senha_atual, nova_senha }),
  });
  return (body?.data ?? body).token;
}
