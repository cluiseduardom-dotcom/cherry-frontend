// Regras puras da tela de Fiscal (preparo fiscal, só cadastro). Sem DOM, testável.
// Espelha o formato validado pelo backend (docs/FISCAL_PREPARO.md); o backend decide de novo.

export const REGIMES = [
  { valor: 'mei', rotulo: 'MEI (Microempreendedor Individual)' },
  { valor: 'simples_nacional', rotulo: 'Simples Nacional' },
  { valor: 'simples_nacional_excesso', rotulo: 'Simples Nacional, com excesso de sublimite' },
  { valor: 'lucro_presumido', rotulo: 'Lucro presumido' },
  { valor: 'lucro_real', rotulo: 'Lucro real' },
];

export const AMBIENTES = [
  { valor: 'homologacao', rotulo: 'Homologação (testes, sem valor fiscal)' },
  { valor: 'producao', rotulo: 'Produção' },
];

export const ORIGENS = [
  { valor: 0, rotulo: '0 – Nacional' },
  { valor: 1, rotulo: '1 – Estrangeira, importação direta' },
  { valor: 2, rotulo: '2 – Estrangeira, adquirida no mercado interno' },
  { valor: 3, rotulo: '3 – Nacional, conteúdo importado de 40% a 70%' },
  { valor: 4, rotulo: '4 – Nacional, processos produtivos básicos' },
  { valor: 5, rotulo: '5 – Nacional, conteúdo importado até 40%' },
  { valor: 6, rotulo: '6 – Estrangeira, importação direta, sem similar nacional' },
  { valor: 7, rotulo: '7 – Estrangeira, mercado interno, sem similar nacional' },
  { valor: 8, rotulo: '8 – Nacional, conteúdo importado acima de 70%' },
];

export function rotuloDaOrigem(origem) {
  return ORIGENS.find(o => o.valor === origem)?.rotulo ?? '—';
}

export const soDigitos = texto => String(texto ?? '').replace(/\D/g, '');

// 71171900 → 7117.19.00 (só para exibir; o backend recebe e guarda os 8 dígitos).
export function mascararNcm(ncm) {
  const d = soDigitos(ncm);
  if (d.length !== 8) return String(ncm ?? '');
  return `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6)}`;
}

// NCM: 8 dígitos, capítulo de 01 a 97, exceto 77. Só a estrutura: não consulta a tabela oficial.
export function ncmValido(texto) {
  const d = soDigitos(texto);
  if (!/^\d{8}$/.test(d)) return false;
  const capitulo = Number(d.slice(0, 2));
  return capitulo >= 1 && capitulo <= 97 && capitulo !== 77;
}

export const cestValido = texto => /^\d{7}$/.test(soDigitos(texto));

// Erro de um campo do produto ('' = válido; vazio é válido: limpa o campo).
export function validarCampoProduto(campo, valor) {
  const texto = String(valor ?? '').trim();
  if (texto === '') return '';
  if (campo === 'ncm') return ncmValido(texto) ? '' : 'NCM inválido (8 dígitos, capítulo de 01 a 97).';
  if (campo === 'cest') return cestValido(texto) ? '' : 'CEST inválido (7 dígitos).';
  if (campo === 'unidade_fiscal') return /^[A-Za-z]{1,6}$/.test(texto) ? '' : 'Unidade inválida (1 a 6 letras, ex.: UN, KG).';
  return '';
}

// Linha da tabela de produtos → corpo do PATCH só com o que mudou (vazio vira null = limpar).
export function mudancasDoProduto(original, editado) {
  const corpo = {};
  for (const campo of ['ncm', 'cest', 'unidade_fiscal']) {
    const novo = String(editado[campo] ?? '').trim();
    const antigo = String(original[campo] ?? '');
    const normal = campo === 'unidade_fiscal' ? novo.toUpperCase() : soDigitos(novo);
    if (normal !== antigo) corpo[campo] = normal === '' ? null : normal;
  }
  const origemNova = editado.origem_mercadoria === '' || editado.origem_mercadoria === null || editado.origem_mercadoria === undefined ? null : Number(editado.origem_mercadoria);
  if (origemNova !== (original.origem_mercadoria ?? null)) corpo.origem_mercadoria = origemNova;
  return corpo;
}

// Formulário em lote → dados para aplicar (só o que foi preenchido; em lote nunca se limpa campo).
export function dadosDoLote({ ncm, cest, origem_mercadoria, unidade_fiscal }) {
  const dados = {};
  if (String(ncm ?? '').trim()) dados.ncm = soDigitos(ncm);
  if (String(cest ?? '').trim()) dados.cest = soDigitos(cest);
  if (origem_mercadoria !== '' && origem_mercadoria !== null && origem_mercadoria !== undefined) dados.origem_mercadoria = Number(origem_mercadoria);
  if (String(unidade_fiscal ?? '').trim()) dados.unidade_fiscal = String(unidade_fiscal).trim().toUpperCase();
  return dados;
}

export function validarLote(selecionados, dados) {
  if (!selecionados.length) return 'Selecione ao menos um produto.';
  if (selecionados.length > 200) return 'No máximo 200 produtos por vez.';
  if (!Object.keys(dados).length) return 'Preencha ao menos um dado para aplicar.';
  for (const campo of ['ncm', 'cest', 'unidade_fiscal']) {
    const erro = campo in dados ? validarCampoProduto(campo, dados[campo]) : '';
    if (erro) return erro;
  }
  return '';
}

// Empresa: formulário → corpo do PUT. Vazio vira null (limpa); só envia o que mudou em relação ao salvo.
export function mudancasDaEmpresa(salvo, form) {
  const corpo = {};
  const texto = campo => String(form[campo] ?? '').trim();
  for (const campo of ['regime_tributario', 'inscricao_estadual', 'inscricao_municipal', 'cnae_principal', 'codigo_municipio_ibge']) {
    let novo = texto(campo);
    if (campo === 'cnae_principal' || campo === 'codigo_municipio_ibge') novo = soDigitos(novo);
    if (campo === 'inscricao_estadual') novo = novo.toUpperCase() === 'ISENTO' ? 'ISENTO' : soDigitos(novo);
    if (novo !== String(salvo[campo] ?? '')) corpo[campo] = novo === '' ? null : novo;
  }
  if (form.ambiente && form.ambiente !== salvo.ambiente) corpo.ambiente = form.ambiente;
  return corpo;
}

export function validarEmpresa(form) {
  const ie = String(form.inscricao_estadual ?? '').trim();
  if (ie && ie.toUpperCase() !== 'ISENTO' && !/^\d{2,14}$/.test(soDigitos(ie))) return 'Inscrição estadual inválida (2 a 14 números, ou ISENTO).';
  const cnae = soDigitos(form.cnae_principal);
  if (String(form.cnae_principal ?? '').trim() && cnae.length !== 7) return 'CNAE inválido (7 dígitos).';
  const ibge = soDigitos(form.codigo_municipio_ibge);
  if (String(form.codigo_municipio_ibge ?? '').trim() && ibge.length !== 7) return 'Código do município inválido (7 dígitos, tabela do IBGE).';
  return '';
}

// Item de prontidão → texto curto para a lista.
export function textoDoItem(item) {
  if (item.total !== undefined) {
    return item.ok ? `Todos os ${item.total} produtos` : `${item.preenchidos} de ${item.total} produtos (faltam ${item.faltando})`;
  }
  if (item.ok) return item.detalhe || 'Ok';
  // "Recomendado" já aparece na etiqueta do item: aqui diz o estado.
  return !item.detalhe || item.detalhe === 'Recomendado' ? 'Não informado' : item.detalhe;
}

// Quantos itens obrigatórios pendentes ainda faltam.
export function pendenciasObrigatorias(prontidao) {
  return (prontidao?.grupos ?? []).flatMap(g => g.itens).filter(i => i.obrigatorio && !i.ok);
}
