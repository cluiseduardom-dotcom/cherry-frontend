// Venda por peso/volume (backend migration 128). O produto em G ou ML pode ter o preço por 100 ou 1000 unidades-base
// (`preco_base_quantidade`): R$ 45,00 o kg com a quantidade em gramas. Sem DOM, testável. Com base 1 tudo é como sempre foi.
import { ehUnidadeBase } from './unidades';

export const PASSO_PESO = 50; // +/- do PDV, em g ou ml

export const baseDoProduto = (p) => (Number(p?.base) > 1 ? Number(p.base) : 1);
export const ehPorPeso = (p) => baseDoProduto(p) > 1 && ehUnidadeBase(p?.unidade);

// Mesma conta do backend: round(quantidade × preço em centavos ÷ base) / 100. Com base 1 é quantidade × preço.
export function totalDaLinha(preco, quantidade, base = 1) {
  const b = Number(base) > 1 ? Number(base) : 1;
  if (b === 1) return Number(preco) * Number(quantidade);
  return Math.round((Number(quantidade) * Math.round(Number(preco) * 100)) / b) / 100;
}

// "R$ 45,00/kg" ou "R$ 9,90/L"; sem peso devolve só o valor formatado pelo chamador.
export function sufixoDoPreco(unidade, base) {
  if (!ehUnidadeBase(unidade) || !(Number(base) > 1)) return '';
  const grande = unidade === 'G' ? 'kg' : 'L';
  const n = Number(base);
  return n === 1000 ? `/${grande}` : `/${n} ${unidade === 'G' ? 'g' : 'ml'}`;
}

// Quantidade que entra no carrinho ao tocar no produto, e o passo do "+": 100 g/ml (ou o que houver em estoque).
export const quantidadeInicial = (p) => (ehPorPeso(p) ? Math.min(100, Math.max(1, Number(p.stock) || 0)) : 1);
export const passoDaQuantidade = (p) => (ehPorPeso(p) ? PASSO_PESO : 1);

// Nova quantidade ao apertar +/−, sem passar do estoque nem ficar abaixo de 1.
export function somarQuantidade(item, delta) {
  const proxima = Number(item.qty) + delta * passoDaQuantidade(item);
  return Math.min(Number(item.stock), Math.max(1, proxima));
}

// Valor digitado (kg/L ou g/ml) → quantidade inteira na unidade-base, conferindo o estoque. { valor, erro }.
export function validarQuantidadeDigitada(valorBase, estoque, rotuloEstoque = '') {
  if (!Number.isInteger(valorBase) || valorBase < 1) return { valor: NaN, erro: 'A quantidade deve ser maior que zero.' };
  if (Number.isFinite(estoque) && valorBase > estoque) return { valor: NaN, erro: `Só há ${rotuloEstoque || estoque} em estoque.` };
  return { valor: valorBase, erro: '' };
}
