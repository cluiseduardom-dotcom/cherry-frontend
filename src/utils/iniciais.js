// Iniciais (até duas) do nome, em maiúsculas; `vazio` quando não há nome.
export function iniciaisDoNome(nome, vazio = '') {
  if (!nome) return vazio;
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(parte => parte[0].toUpperCase())
    .join('');
}
