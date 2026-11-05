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
    // Funcionalidades ligadas da empresa (só para esconder menus; o backend barra de fato). Ausente = não se sabe.
    funcionalidades: Array.isArray(me?.funcionalidades) ? me.funcionalidades : usuarioBase?.funcionalidades,
    role: perfil,
    tema: usuarioBase?.tema,
    // Senha definida por um admin: o backend só deixa trocar a senha até concluir a troca.
    senha_temporaria: me?.senha_temporaria === true,
    // Foto de perfil (null = iniciais). Vem de /auth/me; no login, do próprio retorno do login.
    foto_url: me && 'foto_url' in me ? (me.foto_url ?? null) : (usuarioBase?.foto_url ?? null),
  };
}

// identificador: e-mail ou código de usuário (ex.: EGASIL). O código é único por loja e precisa do
// `empresaSlug` (página /c/<slug> ou a última loja usada neste navegador).
export async function loginRequest(identificador, senha, empresaSlug) {
  const corpo = { identificador: String(identificador).trim(), senha };
  if (empresaSlug) corpo.empresa_slug = empresaSlug;
  const body = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify(corpo),
    skipAuthRedirect: true,
  });

  const { token, usuario } = body.data;

  const baseUser = {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    login: usuario.login ?? null,
    role: usuario.papel,
    perfil: usuario.papel,
    cargo: usuario.papel,
    nivel: null,
    capacidades: [],
    tema: resolverTema(usuario.empresa?.tema),
    // Endereço público da loja (/c/<slug>): o navegador o lembra para o login por código.
    empresa_slug: usuario.empresa?.slug ?? null,
    foto_url: usuario.foto_url ?? null,
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
