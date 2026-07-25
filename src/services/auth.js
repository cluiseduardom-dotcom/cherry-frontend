import { apiFetch } from './api';

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
    },
  };
}
