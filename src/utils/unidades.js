// Unidade-base inteira (Fracionado, etapa 1). O banco guarda quantidades INTEIRAS: produto fracionado fica em
// gramas (G) ou mililitros (ML). kg e L não existem no banco: são só conversão da tela (1 kg = 1000 g).
// Sem DOM, testável.

export const UNIDADES_PRODUTO = [
  { valor: 'UN', rotulo: 'UN' },
  { valor: 'PAR', rotulo: 'PAR' },
  { valor: 'CX', rotulo: 'CX' },
  { valor: 'PCT', rotulo: 'PCT' },
  { valor: 'G', rotulo: 'Grama (g)' },
  { valor: 'ML', rotulo: 'Mililitro (ml)' },
];

const BASE = {
  G: { pequena: 'g', grande: 'kg', nomeGrande: 'kg' },
  ML: { pequena: 'ml', grande: 'L', nomeGrande: 'litro' },
};

const MILHAR = 1000;

export function ehUnidadeBase(unidade) {
  return unidade === 'G' || unidade === 'ML';
}

// Opções do campo de quantidade para uma unidade-base (ex.: G → g ou kg). Outras unidades: null (só inteiros).
export function opcoesDeEntrada(unidade) {
  if (!ehUnidadeBase(unidade)) return null;
  const { pequena, grande } = BASE[unidade];
  return [
    { valor: 'base', rotulo: pequena, fator: 1 },
    { valor: 'grande', rotulo: grande, fator: MILHAR },
  ];
}

// Aceita vírgula ou ponto decimal. Vazio ou inválido = NaN.
export function lerDecimal(texto) {
  const limpo = String(texto ?? '').trim().replace(/\./g, (m, i, s) => (s.includes(',') ? '' : m)).replace(',', '.');
  if (limpo === '' || !/^\d+(\.\d+)?$/.test(limpo)) return NaN;
  return Number(limpo);
}

// Texto digitado + unidade escolhida ('base' | 'grande') → quantidade INTEIRA na unidade-base. { valor, erro }.
export function paraUnidadeBase(texto, unidadeProduto, escolha = 'base') {
  const numero = lerDecimal(texto);
  if (Number.isNaN(numero)) return { valor: NaN, erro: 'Informe uma quantidade válida.' };
  const fator = ehUnidadeBase(unidadeProduto) && escolha === 'grande' ? MILHAR : 1;
  // Multiplicação inteira via arredondamento: 0,35 × 1000 em ponto flutuante dá 350,00000000000006.
  const base = Math.round(numero * fator * 1e6) / 1e6;
  if (!Number.isInteger(base)) {
    return {
      valor: NaN,
      erro: ehUnidadeBase(unidadeProduto)
        ? `Use até 3 casas decimais em ${BASE[unidadeProduto].grande} (o menor passo é 1 ${BASE[unidadeProduto].pequena}).`
        : 'Esta unidade só aceita quantidades inteiras.',
    };
  }
  if (base < 1) return { valor: NaN, erro: 'A quantidade deve ser maior que zero.' };
  return { valor: base, erro: '' };
}

// Quantidade na unidade-base → { texto, escolha } para preencher o campo (1250 g → "1,25" em kg).
export function paraCampoDeEntrada(quantidadeBase, unidadeProduto) {
  const n = Number(quantidadeBase);
  if (ehUnidadeBase(unidadeProduto) && n >= MILHAR && n % 10 === 0) {
    return { texto: String(n / MILHAR).replace('.', ','), escolha: 'grande' };
  }
  return { texto: String(n), escolha: 'base' };
}

const numeroBR = n => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 3 });

// "250 g", "1,25 kg", "300 ml", "2 L"; UN e demais seguem como número puro (com a sigla quando não é UN).
export function formatarQuantidade(quantidade, unidade) {
  const n = Number(quantidade);
  if (!Number.isFinite(n)) return '—';
  if (ehUnidadeBase(unidade)) {
    const { pequena, grande } = BASE[unidade];
    return n >= MILHAR ? `${numeroBR(n / MILHAR)} ${grande}` : `${numeroBR(n)} ${pequena}`;
  }
  return !unidade || unidade === 'UN' ? numeroBR(n) : `${numeroBR(n)} ${unidade}`;
}

// Custo é guardado POR unidade-base (R$ 0,0125 por g); a pessoa pensa em R$ por kg (12,50).
export function custoParaExibicao(custoBase, unidade) {
  if (custoBase === '' || custoBase === null || custoBase === undefined) return '';
  const n = Number(custoBase);
  if (!Number.isFinite(n)) return '';
  return ehUnidadeBase(unidade) ? String(Math.round(n * MILHAR * 1e4) / 1e4) : String(n);
}

export function custoParaEnvio(custoExibido, unidade) {
  const n = Number(custoExibido);
  return ehUnidadeBase(unidade) ? Math.round((n / MILHAR) * 1e6) / 1e6 : n;
}

export function rotuloDoCusto(unidade) {
  return ehUnidadeBase(unidade) ? `Custo por ${BASE[unidade].nomeGrande}` : 'Custo';
}

// Linhas da ficha ({ insumo_produto_id, quantidade, escolha }) → itens do contrato ({ insumo_produto_id, quantidade_necessaria })
// ou o primeiro erro, já convertendo kg/L para g/ml. `insumos` = lista com { id, unidade }.
export function montarItensDaFicha(linhas, insumos) {
  if (!linhas.length) return { itens: [], erro: 'Adicione ao menos um insumo à ficha.' };
  const porId = new Map(insumos.map(i => [String(i.id), i]));
  const vistos = new Set();
  const itens = [];
  for (const linha of linhas) {
    if (!linha.insumo_produto_id) return { itens: [], erro: 'Escolha o insumo em todas as linhas.' };
    if (vistos.has(String(linha.insumo_produto_id))) return { itens: [], erro: 'Há insumo repetido na ficha.' };
    vistos.add(String(linha.insumo_produto_id));
    const insumo = porId.get(String(linha.insumo_produto_id));
    const { valor, erro } = paraUnidadeBase(linha.quantidade, insumo?.unidade, linha.escolha);
    if (erro) return { itens: [], erro };
    itens.push({ insumo_produto_id: Number(linha.insumo_produto_id), quantidade_necessaria: valor });
  }
  return { itens, erro: '' };
}

export function validarRendimento(texto) {
  const n = Number(texto);
  if (!Number.isInteger(n) || n < 1) return 'O rendimento deve ser um número inteiro maior que zero.';
  if (n > 1000000) return 'O rendimento máximo é 1.000.000.';
  return '';
}
