// Receita (ficha técnica) vista pela pessoa: custo, peso e "quantas receitas". Sem DOM, testável.
// O backend guarda quantidades INTEIRAS (gramas, ml, unidades). A ordem de produção continua em UNIDADES do produto
// acabado; a tela é que converte "1 receita" / "0,5 receita" em unidades (receitas × rendimento) e o backend
// consome o insumo proporcionalmente (docs/PCP_ORDEM_PRODUCAO.md).

import { ehUnidadeBase, formatarQuantidade, lerDecimal, paraUnidadeBase } from './unidades';

const arredonda = (n, casas = 4) => Math.round(n * 10 ** casas) / 10 ** casas;

// Peso de um insumo contado em unidade. Regra do PO: ovo pesa 60 g. Só ovo tem peso padrão por enquanto
// (reconhecido pelo nome); os demais insumos em unidade não entram no peso.
export const PESO_OVO_G = 60;
const semAcento = texto => String(texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const ehOvo = nome => /^ovos?\b/.test(semAcento(nome));

// Peso em gramas de `quantidadeBase` do insumo ({ unidade, nome }): gramas valem elas mesmas; ovo (UN) = 60 g cada; resto = 0.
export function pesoDoInsumoG(insumo, quantidadeBase) {
  const q = Number(quantidadeBase);
  if (!insumo || !Number.isFinite(q)) return 0;
  if (insumo.unidade === 'G') return q;
  if (insumo.unidade === 'UN' && ehOvo(insumo.nome)) return q * PESO_OVO_G;
  return 0;
}

// Linhas da ficha ({ insumo_produto_id, quantidade, escolha }), insumos ({ id, unidade, custo }) e rendimento (texto).
// Devolve, por linha, a quantidade na unidade-base e o custo (quando o insumo tem custo e a quantidade é válida),
// e os totais: custo da receita, custo por unidade, peso (g) e volume (ml) dos insumos.
export function calcularReceita(linhas, insumos, rendimento) {
  const porId = new Map((insumos ?? []).map(i => [String(i.id), i]));
  let custoReceita = 0;
  let pesoG = 0;
  let volumeMl = 0;
  let completa = (linhas ?? []).length > 0;

  const detalhes = (linhas ?? []).map(linha => {
    const insumo = porId.get(String(linha.insumo_produto_id));
    const { valor, erro } = insumo ? paraUnidadeBase(linha.quantidade, insumo.unidade, linha.escolha) : { valor: NaN, erro: 'x' };
    const custoUnitario = insumo?.custo === undefined || insumo?.custo === null ? NaN : Number(insumo.custo);
    if (erro || !Number.isFinite(valor)) {
      completa = false;
      return { quantidadeBase: NaN, custoUnitario, subtotal: NaN, unidade: insumo?.unidade };
    }
    pesoG += pesoDoInsumoG(insumo, valor);
    if (insumo.unidade === 'ML') volumeMl += valor;
    const subtotal = Number.isFinite(custoUnitario) ? arredonda(valor * custoUnitario) : NaN;
    if (Number.isFinite(subtotal)) custoReceita += subtotal;
    else completa = false;
    return { quantidadeBase: valor, custoUnitario, subtotal, unidade: insumo.unidade };
  });

  const rend = Number(rendimento);
  const temRendimento = Number.isInteger(rend) && rend >= 1;
  return {
    detalhes,
    completa,
    custoReceita: arredonda(custoReceita, 2),
    custoPorUnidade: temRendimento ? arredonda(custoReceita / rend) : NaN,
    pesoG,
    volumeMl,
    pesoPorUnidadeG: temRendimento && pesoG > 0 ? arredonda(pesoG / rend, 1) : NaN,
  };
}

// 2000 → "2 kg"; 350 → "350 g"; 0 → ''. Volume segue a mesma ideia (ml / L).
export function formatarPeso(gramas) {
  const n = Number(gramas);
  if (!Number.isFinite(n) || n <= 0) return '';
  const f = x => x.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  return n >= 1000 ? `${f(n / 1000)} kg` : `${f(n)} g`;
}

export function formatarVolume(ml) {
  const n = Number(ml);
  if (!Number.isFinite(n) || n <= 0) return '';
  const f = x => x.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  return n >= 1000 ? `${f(n / 1000)} L` : `${f(n)} ml`;
}

// Resumo de massa da receita para a tela: "2 kg" (e "250 g por unidade"), ignorando insumos contados em unidade.
export function resumoMassa({ pesoG, volumeMl, pesoPorUnidadeG }) {
  const partes = [];
  const peso = formatarPeso(pesoG);
  const volume = formatarVolume(volumeMl);
  if (peso) partes.push(peso);
  if (volume) partes.push(volume);
  return { total: partes.join(' + '), porUnidade: Number.isFinite(pesoPorUnidadeG) ? formatarPeso(pesoPorUnidadeG) : '' };
}

// "Quantas receitas?" (aceita vírgula: 0,5) → unidades do acabado. A ordem é em unidades inteiras:
// receitas × rendimento precisa fechar em número inteiro (0,5 de uma receita de 8 = 4; de 5 = 2,5, não vale).
export function receitasParaUnidades(texto, rendimento) {
  const receitas = lerDecimal(texto);
  if (Number.isNaN(receitas) || receitas <= 0) return { receitas: NaN, unidades: NaN, erro: 'Informe quantas receitas, um número maior que zero (ex.: 1, 0,5, 2).' };
  const rend = Number(rendimento ?? 1);
  const unidades = arredonda(receitas * rend, 6);
  if (!Number.isInteger(unidades)) {
    const sugeridas = [0.25, 0.5, 1, 2].filter(r => Number.isInteger(arredonda(r * rend, 6)));
    return {
      receitas,
      unidades: NaN,
      erro: `${String(receitas).replace('.', ',')} receita de ${rend} unidades dá ${String(unidades).replace('.', ',')}: não fecha em unidades inteiras.${
        sugeridas.length ? ` Tente ${sugeridas.map(r => String(r).replace('.', ',')).join(', ')}.` : ''}`,
    };
  }
  if (unidades > 1000000) return { receitas, unidades: NaN, erro: 'A quantidade máxima é 1.000.000 de unidades.' };
  return { receitas, unidades, erro: '' };
}

// Unidades → receitas, para mostrar numa ordem já criada ("4 un." = 0,5 receita). null quando não faz sentido.
export function unidadesParaReceitas(unidades, rendimento) {
  const rend = Number(rendimento);
  const un = Number(unidades);
  if (!Number.isFinite(un) || !Number.isFinite(rend) || rend < 1) return null;
  return arredonda(un / rend, 4);
}

export function textoReceitas(receitas) {
  if (receitas === null || receitas === undefined || !Number.isFinite(Number(receitas))) return '';
  const n = Number(receitas);
  return `${n.toLocaleString('pt-BR', { maximumFractionDigits: 4 })} ${n === 1 ? 'receita' : 'receitas'}`;
}

// Peso (g) de UMA receita inteira da ordem, a partir dos insumos da ficha congelada ({ unidade, nome, quantidade_receita }).
// A ordem em R receitas pesa R × isto.
export function pesoDaReceitaDaOrdem(ordem) {
  return (ordem?.insumos ?? []).reduce((soma, i) => soma + pesoDoInsumoG(i, i.quantidade_receita), 0);
}

// "1 receita · 450 g (1 un.)": o que a ordem planejou, em receitas e peso, com as unidades entre parênteses.
// `unidade` = unidade de estoque do produto: g/ml mostram "(570 g)" em vez de "(570 un.)".
export function resumoPlanejado(ordem, unidade) {
  const unidades = Number(ordem?.quantidade_planejada);
  const total = ehUnidadeBase(unidade) ? formatarQuantidade(unidades, unidade) : `${unidades} un.`;
  const receitas = unidadesParaReceitas(unidades, ordem?.rendimento ?? 1);
  if (receitas === null) return total;
  const pesoG = pesoDaReceitaDaOrdem(ordem) * receitas;
  const partes = [textoReceitas(receitas)];
  const peso = formatarPeso(arredonda(pesoG, 2));
  if (peso) partes.push(peso);
  return `${partes.join(' · ')} (${total})`;
}
