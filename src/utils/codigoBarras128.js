// Code 128 (subconjuntos B e C) sem dependência: gera a sequência de módulos (1 = barra, 0 = espaço) de um código.
// Usado nas etiquetas (PNG/PDF). Tabela de padrões = especificação ISO/IEC 15417 (valores 0..105, 11 módulos cada);
// parada = 11000111010 + barra final 11. Validado decodificando as imagens geradas com um leitor real (ver testes).

const PADROES = [
  '11011001100',
  '11001101100',
  '11001100110',
  '10010011000',
  '10010001100',
  '10001001100',
  '10011001000',
  '10011000100',
  '10001100100',
  '11001001000',
  '11001000100',
  '11000100100',
  '10110011100',
  '10011011100',
  '10011001110',
  '10111001100',
  '10011101100',
  '10011100110',
  '11001110010',
  '11001011100',
  '11001001110',
  '11011100100',
  '11001110100',
  '11101101110',
  '11101001100',
  '11100101100',
  '11100100110',
  '11101100100',
  '11100110100',
  '11100110010',
  '11011011000',
  '11011000110',
  '11000110110',
  '10100011000',
  '10001011000',
  '10001000110',
  '10110001000',
  '10001101000',
  '10001100010',
  '11010001000',
  '11000101000',
  '11000100010',
  '10110111000',
  '10110001110',
  '10001101110',
  '10111011000',
  '10111000110',
  '10001110110',
  '11101110110',
  '11010001110',
  '11000101110',
  '11011101000',
  '11011100010',
  '11011101110',
  '11101011000',
  '11101000110',
  '11100010110',
  '11101101000',
  '11101100010',
  '11100011010',
  '11101111010',
  '11001000010',
  '11110001010',
  '10100110000',
  '10100001100',
  '10010110000',
  '10010000110',
  '10000101100',
  '10000100110',
  '10110010000',
  '10110000100',
  '10011010000',
  '10011000010',
  '10000110100',
  '10000110010',
  '11000010010',
  '11001010000',
  '11110111010',
  '11000010100',
  '10001111010',
  '10100111100',
  '10010111100',
  '10010011110',
  '10111100100',
  '10011110100',
  '10011110010',
  '11110100100',
  '11110010100',
  '11110010010',
  '11011011110',
  '11011110110',
  '11110110110',
  '10101111000',
  '10100011110',
  '10001011110',
  '10111101000',
  '10111100010',
  '11110101000',
  '11110100010',
  '10111011110',
  '10111101110',
  '11101011110',
  '11110101110',
  '11010000100',
  '11010010000',
  '11010011100',
];

const PARADA = '1100011101011';
const START_B = 104;
const START_C = 105;
const CODE_C = 99;

// Só ASCII imprimível (espaço a '~'): é o que o subconjunto B cobre. Nosso código interno e EAN cabem aqui.
export function codigoValidoParaEtiqueta(texto) {
  return typeof texto === 'string' && texto.length > 0 && texto.length <= 40 && /^[ -~]+$/.test(texto);
}

// Valores (símbolos) do código, sem o dígito verificador e sem a parada.
// Só dígitos com 4+ caracteres: subconjunto C (2 dígitos por símbolo, bem mais curto: importa em etiqueta pequena).
// Quantidade ímpar: o 1º dígito vai em B e o resto em C. Qualquer outro texto: tudo em B.
export function simbolosCode128(texto) {
  if (!codigoValidoParaEtiqueta(texto)) throw new Error('Código inválido para etiqueta');

  const valoresB = (s) => [...s].map((c) => c.charCodeAt(0) - 32);
  const paresC = (s) => {
    const v = [];
    for (let i = 0; i < s.length; i += 2) v.push(Number(s.slice(i, i + 2)));
    return v;
  };

  if (/^\d{4,}$/.test(texto)) {
    if (texto.length % 2 === 0) return [START_C, ...paresC(texto)];
    return [START_B, ...valoresB(texto[0]), CODE_C, ...paresC(texto.slice(1))];
  }

  return [START_B, ...valoresB(texto)];
}

export function modulosCode128(texto) {
  const simbolos = simbolosCode128(texto);
  const soma = simbolos.reduce((acc, valor, i) => acc + valor * (i === 0 ? 1 : i), 0);
  const verificador = soma % 103;

  return [...simbolos, verificador].map((v) => PADROES[v]).join('') + PARADA;
}

// Largura total em módulos (sem zona de silêncio).
export function larguraEmModulos(texto) {
  return modulosCode128(texto).length;
}

// Barras como retângulos [inicioEmModulos, larguraEmModulos], juntando módulos '1' vizinhos (desenha menos retângulos).
export function barrasCode128(texto) {
  const modulos = modulosCode128(texto);
  const barras = [];
  let inicio = -1;

  for (let i = 0; i <= modulos.length; i += 1) {
    const preto = modulos[i] === '1';

    if (preto && inicio < 0) inicio = i;
    if (!preto && inicio >= 0) {
      barras.push([inicio, i - inicio]);
      inicio = -1;
    }
  }

  return barras;
}
