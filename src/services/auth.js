import { apiFetch } from './api';
import { resolverTema } from '../theme/themes';

export async function loginRequest(email, senha) {
  const body = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, senha }),
    skipAuthRedirect: true,
  });

  const { token, usuario } = body.data;

  return {
    token,
    user: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      role: usuario.papel,
      // O backend fornece apenas um identificador fechado de tema.
      // Valores ausentes ou desconhecidos usam a identidade VERTUMNO.
      tema: resolverTema(usuario.empresa?.tema),
    },
  };
}
