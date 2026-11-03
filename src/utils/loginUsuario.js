// Código de login (usuário) no estilo iniciais + sobrenome — mesma regra do backend
// (cherry-backend src/utils/loginUsuario.js): Luís Eduardo Martins Cardoso → LEMCAR;
// Emilly Graziela Alves da Silva → EGASIL. Aqui só sugere e valida para a tela; quem decide é o backend
// (único por empresa; repetido ganha número).

const PARTICULAS = new Set(['DA', 'DE', 'DO', 'DAS', 'DOS', 'E', 'D']);
const LOGIN_RE = /^[A-Z0-9]{2,20}$/;

function semAcento(texto) {
  return String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function normalizarLogin(texto) {
  return semAcento(texto).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function loginValido(login) {
  return typeof login === 'string' && LOGIN_RE.test(login);
}

export function gerarLoginBase(nome) {
  const palavras = semAcento(nome).toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
  const uteis = palavras.filter((p, i) => i === palavras.length - 1 || !PARTICULAS.has(p));

  if (uteis.length === 0) return '';
  if (uteis.length === 1) return uteis[0].slice(0, 6).padEnd(2, 'X');

  const iniciais = uteis.slice(0, -1).map(p => p[0]).join('');
  return `${iniciais}${uteis[uteis.length - 1].slice(0, 3)}`.slice(0, 20);
}

// Tela de login: e-mail (tem @) vale em qualquer endereço; código precisa da loja (slug).
export function ehEmail(identificador) {
  return String(identificador ?? '').includes('@');
}
