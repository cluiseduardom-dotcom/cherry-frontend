// Regras puras da tela de Grade de produtos (variações de tamanho, cor...). Sem DOM, testável.
// Espelha as regras do backend (docs/GRADE_PRODUTOS.md): o backend decide de novo.

export const MAX_EIXOS = 3;
export const MAX_VARIACOES = 100;
export const MAX_VALOR = 40;

const minusculo = texto => String(texto ?? '').trim().toLowerCase();

// "P, M, G" ou uma linha por valor → lista sem vazios e sem repetidos (sem diferenciar maiúsculas), na ordem digitada.
export function lerValores(texto) {
  const vistos = new Set();
  const lista = [];
  for (const bruto of String(texto ?? '').split(/[\n,;]+/)) {
    const valor = bruto.trim();
    if (!valor || vistos.has(minusculo(valor))) continue;
    vistos.add(minusculo(valor));
    lista.push(valor);
  }
  return lista;
}

// Produto cartesiano dos valores de cada eixo: [{ Tamanho: 'P', Cor: 'Azul' }, ...] (primeiro eixo varia mais devagar).
export function combinar(eixos) {
  return eixos.reduce(
    (combinacoes, eixo) => combinacoes.flatMap(base => eixo.valores.map(valor => ({ ...base, [eixo.nome]: valor }))),
    [{}]
  );
}

export function chaveDaCombinacao(nomesEixos, valores) {
  return JSON.stringify(nomesEixos.map(nome => minusculo(valores[nome])));
}

export function nomeDaVariacao(nomeGrade, nomesEixos, valores) {
  return `${String(nomeGrade).trim()} ${nomesEixos.map(nome => valores[nome]).join(' / ')}`;
}

// Erro do formulário de nova grade ('' = válido). `eixos` = [{ nome, valoresTexto }].
export function validarNovaGrade({ nome, custo, preco_venda, eixos }, totalSelecionadas) {
  if (!String(nome ?? '').trim()) return 'Informe o nome da grade.';
  const c = Number(custo);
  if (custo === '' || !Number.isFinite(c) || c <= 0) return 'Informe o custo (maior que zero).';
  if (preco_venda !== '' && preco_venda !== undefined && !(Number(preco_venda) > 0)) return 'O preço de venda deve ser maior que zero.';
  if (!eixos.length) return 'Adicione ao menos um eixo (ex.: Tamanho).';
  if (eixos.length > MAX_EIXOS) return `No máximo ${MAX_EIXOS} eixos.`;
  const nomes = eixos.map(e => minusculo(e.nome));
  if (nomes.some(n => !n)) return 'Dê um nome a cada eixo (ex.: Tamanho, Cor).';
  if (new Set(nomes).size !== nomes.length) return 'Há eixo repetido.';
  for (const eixo of eixos) {
    const valores = lerValores(eixo.valoresTexto);
    if (!valores.length) return `Informe os valores de "${eixo.nome.trim()}" (ex.: P, M, G).`;
    if (valores.some(v => v.length > MAX_VALOR)) return `Cada valor deve ter até ${MAX_VALOR} caracteres.`;
  }
  if (totalSelecionadas < 1) return 'Selecione ao menos uma variação.';
  if (totalSelecionadas > MAX_VARIACOES) return `No máximo ${MAX_VARIACOES} variações por vez. Desmarque algumas.`;
  return '';
}

// Quando um eixo tem o mesmo nome de um nível de categoria (ex.: eixo "Tamanho" e nível "Tamanho"), o valor
// escolhe a categoria daquele nível de mesmo nome (P → categoria "P"), e o SKU passa a usar o tamanho.
// Devolve { categoriaIds, semCategoria: [{ eixo, valor }] } para uma variação.
export function categoriasDaVariacao(valores, niveis, categorias) {
  const categoriaIds = [];
  const semCategoria = [];
  for (const [eixo, valor] of Object.entries(valores)) {
    const nivel = niveis.find(n => minusculo(n.nome) === minusculo(eixo));
    if (!nivel) continue;
    const categoria = categorias.find(c => c.nivel === nivel.nivel && minusculo(c.nome) === minusculo(valor));
    if (categoria) categoriaIds.push(categoria.id);
    else semCategoria.push({ eixo, valor });
  }
  return { categoriaIds, semCategoria };
}

// Corpo do POST /grades no contrato do backend.
export function montarCorpoGrade({ nome, descricao, custo, preco_venda, eixos, categoriaComumIds }, combinacoes, niveis, categorias) {
  const corpo = {
    nome: nome.trim(),
    eixos: eixos.map(e => e.nome.trim()),
    custo: Number(custo),
    variacoes: combinacoes.map(valores => {
      const { categoriaIds } = categoriasDaVariacao(valores, niveis, categorias);
      const variacao = { valores };
      if (categoriaIds.length) variacao.categoria_ids = categoriaIds;
      return variacao;
    }),
  };
  if (String(descricao ?? '').trim()) corpo.descricao = descricao.trim();
  if (preco_venda !== '' && preco_venda !== undefined) corpo.preco_venda = Number(preco_venda);
  if (categoriaComumIds?.length) corpo.categoria_ids = categoriaComumIds;
  return corpo;
}

// Combinações novas para uma grade que já existe: tira as que já existem (sem diferenciar maiúsculas).
export function combinacoesNovas(nomesEixos, valoresPorEixo, variacoesExistentes) {
  const existentes = new Set(variacoesExistentes.map(v => chaveDaCombinacao(nomesEixos, v.variacao)));
  return combinar(nomesEixos.map((nome, i) => ({ nome, valores: valoresPorEixo[i] })))
    .filter(valores => !existentes.has(chaveDaCombinacao(nomesEixos, valores)));
}

export function resumoDeEstoque(variacoes) {
  const total = variacoes.reduce((soma, v) => soma + Number(v.estoque_atual || 0), 0);
  return { total, semEstoque: variacoes.filter(v => !Number(v.estoque_atual)).length };
}
