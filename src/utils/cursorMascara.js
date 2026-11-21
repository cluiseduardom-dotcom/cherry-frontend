// Posição do cursor num campo com máscara: conta os caracteres significativos (números e letras; a máscara só insere
// separadores como . - / ( ) e espaço) antes do cursor e põe o cursor depois da mesma quantidade no valor já mascarado.
// Antes contava só dígitos, e no CNPJ alfanumérico as letras digitadas faziam o cursor ficar para trás. Sem DOM, testável.

const SIGNIFICATIVO = /[0-9A-Za-z]/;

export function contarSignificativos(texto) {
  return String(texto ?? '').split('').filter(c => SIGNIFICATIVO.test(c)).length;
}

export function posicaoAposMascara(valorMascarado, significativosAntes) {
  if (significativosAntes <= 0) return 0;
  let contados = 0;
  for (let i = 0; i < valorMascarado.length; i++) {
    if (SIGNIFICATIVO.test(valorMascarado[i])) contados++;
    if (contados === significativosAntes) return i + 1;
  }
  return valorMascarado.length;
}
