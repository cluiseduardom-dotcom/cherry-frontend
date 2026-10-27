export const SENHA_MINIMA = 8;

export function validarTrocaSenha({ senha_atual, nova_senha, confirmacao }) {
  if (!senha_atual) return 'Informe a senha atual';
  if (!nova_senha || nova_senha.length < SENHA_MINIMA) return `A nova senha deve ter no mínimo ${SENHA_MINIMA} caracteres`;
  if (nova_senha.length > 128) return 'Senha muito longa';
  if (nova_senha === senha_atual) return 'A nova senha deve ser diferente da atual';
  if (nova_senha !== confirmacao) return 'A confirmação não confere com a nova senha';
  return '';
}
