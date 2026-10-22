// Registro dos temas visuais. As cores ficam em src/theme/themes.css;
// aqui ficam só a identificação do tema e os textos de marca.
//
// Nesta fase NÃO existe seleção automática pela empresa autenticada: o tema
// padrão vale sempre, e um tema personalizado só pode ser pré-visualizado em
// desenvolvimento (ver lerTemaDev). A ligação com a empresa virá do backend.

import vertumnoLogo from '../assets/vertumno-logo.png';
import vertumnoSimbolo from '../assets/vertumno-simbolo.png';
import cherryLogo from '../assets/cherry-logo.png';
import cherrySimbolo from '../assets/cherry-simbolo.png';
import cherryOrnamento from '../assets/cherry-ornamento.png';

export const TEMA_PADRAO = 'vertumno';

export const TEMAS = {
  vertumno: {
    id: 'vertumno',
    marca: {
      nome: 'VERTUMNO',
      // Nome completo para documentos (PDF etc.): no padrão é só a marca.
      nomeCompleto: 'VERTUMNO',
      subtitulo: null,
      // Logo oficial metálico da marca aprovada, em alta resolução e fundo transparente:
      // símbolo V 3D, tipografia metálica, proporções e cores preservados.
      logo: vertumnoLogo,
      simbolo: vertumnoSimbolo,
      logoAlt: 'VERTUMNO — Gestão que impulsiona',
      slogan: 'Informação organizada gera decisões melhores.',
      sloganAutor: 'VERTUMNO',
      ornamento: null,
      mostrarIcone: false,
      // Cores de avatar de produto (precisam ser hex: recebem sufixo de transparência).
      // Tons médios/escuros da paleta do tema, para o texto das iniciais ter contraste.
      paleta: ['#0B2545', '#1F5FBF', '#13315C', '#3F4D63', '#6B7A90', '#B8922E', '#2466C9', '#5B6B82', '#091D38'],
      loginTitulo: 'VERTUMNO',
      loginDescricao: 'Sistema completo de gestão. Vendas, estoque, clientes e relatórios em um só lugar.',
    },
  },
  cherry: {
    id: 'cherry',
    marca: {
      nome: 'Cherry',
      nomeCompleto: 'Cherry Semijoias',
      subtitulo: 'SEMIJOIAS',
      // Logo da referência aprovada: cereja dourada + lettering "Cherry SEMIJOIAS".
      logo: cherryLogo,
      simbolo: cherrySimbolo,
      logoAlt: 'Cherry Semijoias',
      slogan: 'Detalhes que brilham todos os dias.',
      sloganAutor: 'Cherry Semijoias',
      ornamento: cherryOrnamento,
      mostrarIcone: true,
      paleta: ['#A70636', '#D33A63', '#760426', '#B8860B', '#C58B55', '#91052F', '#5D031E', '#6F5F66', '#E0527A'],
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
//   ?tema=cherry | ?tema=vertumno   escolhe o tema (e guarda na sessão)
//   ?tema=padrao                    limpa a escolha
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

const raizDoDocumento = () => (typeof document === 'undefined' ? null : document.documentElement);

// Marca do tema que está aplicado no documento (para código que não é componente,
// como a exportação de PDF). Sem documento ou sem data-theme, vale o tema padrão.
export function marcaAtiva(elemento = raizDoDocumento()) {
  return TEMAS[resolverTema(elemento?.dataset?.theme)].marca;
}

// Cor de avatar de um produto, sempre da paleta do tema ativo.
export function corDoProduto(id, marca = marcaAtiva()) {
  const indice = Math.abs(Math.trunc(Number(id))) || 0;
  return marca.paleta[indice % marca.paleta.length];
}

// Cor primária do tema ativo como [r, g, b], lida do token --color-primary-rgb de
// themes.css (única fonte das cores). Fora do navegador usa o padrão VERTUMNO.
export function corPrimariaRgb(elemento = raizDoDocumento()) {
  try {
    const valor = elemento ? getComputedStyle(elemento).getPropertyValue('--color-primary-rgb') : '';
    const partes = String(valor).split(',').map(n => Number(n.trim()));
    if (partes.length === 3 && partes.every(n => Number.isInteger(n) && n >= 0 && n <= 255)) return partes;
  } catch {
    // sem estilo disponível: cai no padrão
  }
  return [11, 37, 69];
}
