// Comparação estrutural profunda entre o estado atual de um formulário e o
// snapshot capturado quando o modal foi aberto (Issue #42). Usada para
// decidir se há "alterações não salvas" antes de permitir o fechamento
// silencioso de um modal. Evita `JSON.stringify` puro porque a ordem das
// chaves de um objeto não é garantida entre duas construções independentes
// (mesmo com o mesmo conteúdo) — a comparação por chave é estável a isso.
function iguais(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (typeof a !== 'object') return false;

  const chavesA = Object.keys(a);
  const chavesB = Object.keys(b);
  if (chavesA.length !== chavesB.length) return false;

  return chavesA.every(chave => Object.hasOwn(b, chave) && iguais(a[chave], b[chave]));
}

export function formularioAlterado(atual, inicial) {
  return !iguais(atual, inicial);
}
