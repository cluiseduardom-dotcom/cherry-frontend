// Registro dos temas visuais. As cores ficam em src/theme/themes.css;
// aqui ficam só a identificação do tema e os textos de marca.

import vertumnoLogo from '../assets/vertumno-logo.svg';
import vertumnoSimbolo from '../assets/vertumno-simbolo.svg';
import cherryLogo from '../assets/cherry-logo.png';
import cherrySimbolo from '../assets/cherry-simbolo.png';
import cherryOrnamento from '../assets/cherry-ornamento.png';

export const TEMA_PADRAO = 'vertumno';

export const TEMAS = {
  vertumno: {
    id: 'vertumno',
    marca: {
      nome: 'VERTUMNO',
      subtitulo: null,
      // Wordmark vetorial para evitar serrilhado em telas de alta densidade.
      logo: vertumnoLogo,
      simbolo: vertumnoSimbolo,
      logoAlt: 'VERTUMNO — Gestão que impulsiona',
      slogan: 'Informação organizada gera decisões melhores.',
      sloganAutor: 'VERTUMNO',
      ornamento: null,
      mostrarIcone: false,
      loginTitulo: 'VERTUMNO',
      loginDescricao: 'Sistema completo de gestão. Vendas, estoque, clientes e relatórios em um só lugar.',
    },
  },
  cherry: {
    id: 'cherry',
    marca: {
      nome: 'Cherry',
      subtitulo: 'SEMIJOIAS',
      // Logo raster da referência aprovada; substituir quando o original vetorial estiver disponível.
      logo: cherryLogo,
      simbolo: cherrySimbolo,
      logoAlt: 'Cherry Semijoias',
      slogan: 'Detalhes que brilham todos os dias.',
      sloganAutor: 'Cherry Semijoias',
      // Silhueta da cereja dourada usada como marca-d'água no cabeçalho do dashboard.
      ornamento: cherryOrnamento,
      mostrarIcone: true,
      loginTitulo: 'Cherry Semijoias',
      loginDescricao: 'Sistema completo de gestão para semijoias. Vendas, estoque, clientes e relatórios em um só lugar.',
    },
  },
};

export const CHAVE_TEMA_DEV = 'vertumno.dev.tema';

// Tema desconhecido, vazio ou ausente sempre cai no padrão.
export function resolverTema(chave) {
  return Object.prototype.hasOwnProperty.call(TEMAS, chave) ? chave : TEMA_PADRAO;
}

// Pré-visualização explícita, só em desenvolvimento:
//   ?tema=cherry | ?tema=vertumno escolhe o tema (e guarda na sessão)
//   ?tema=padrao limpa a escolha
// Em produção (isDev falso) isto é ignorado por completo.
export function lerTemaDev({ search = '', storage = null, isDev = false } = {}) {
  if (!isDev) return null;

  const param = new URLSearchParams(search).get('tema');

  try {
    if (param !== null) {
      if (Object.prototype.hasOwnProperty.call(TEMAS, param)) {
        storage?.setItem(CHAVE_TEMA_DEV, param);
        return param;
      }
      storage?.removeItem(CHAVE_TEMA_DEV);
      return null;
    }

    const guardado = storage?.getItem(CHAVE_TEMA_DEV);
    return Object.prototype.hasOwnProperty.call(TEMAS, guardado) ? guardado : null;
  } catch {
    return null;
  }
}

export function aplicarTema(elemento, chave) {
  elemento.dataset.theme = resolverTema(chave);
}
