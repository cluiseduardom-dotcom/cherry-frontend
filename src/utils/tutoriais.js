// Regras puras dos tutoriais e do checklist de primeiros passos. Sem DOM, testável.
import { TUTORIAIS } from '../data/tutoriais';
import { canAccessRoute } from '../config/access';

export function buscarTutorial(id, catalogo = TUTORIAIS) {
  return catalogo.find(t => t.id === id) ?? null;
}

// Tutorial de módulo (PCP, grade, fiscal...) só aparece para quem pode abrir a tela principal dele: o papel e a funcionalidade do plano
// valem. Sem `rotaPrincipal`, é geral e todos veem.
export function tutorialVisivel(tutorial, user) {
  return Boolean(tutorial) && (!tutorial.rotaPrincipal || canAccessRoute(tutorial.rotaPrincipal, user));
}

export function tutoriaisParaUsuario(user, catalogo = TUTORIAIS) {
  return catalogo.filter(t => tutorialVisivel(t, user));
}

// Remove `rota` dos passos que o usuário não pode abrir (o botão só aparece quando há acesso).
export function passosParaUsuario(tutorial, user) {
  if (!tutorial) return [];
  return tutorial.passos.map(passo => {
    if (!passo.rota || canAccessRoute(passo.rota, user)) return passo;
    const { rota: _rota, rotuloRota: _rotulo, ...semRota } = passo;
    return semRota;
  });
}

export function caminhoDoTutorial(id) {
  return id ? `/tutoriais/${id}` : '/tutoriais';
}

// ---- Progresso de leitura (conveniência por navegador; falha de storage nunca quebra a tela) ----

const CHAVE_LIDOS = 'tutoriais:lidos';
const CHAVE_CHECKLIST_OCULTO = 'primeiros-passos:oculto';

function lerJson(chave, storage) {
  try {
    const bruto = storage?.getItem(chave);
    return bruto ? JSON.parse(bruto) : null;
  } catch {
    return null;
  }
}

function gravarJson(chave, valor, storage) {
  try {
    storage?.setItem(chave, JSON.stringify(valor));
  } catch {
    // storage indisponível (janela privada, bloqueio): o recurso segue sem persistir.
  }
}

export function lerTutoriaisLidos(storage = globalThis.localStorage) {
  const dados = lerJson(CHAVE_LIDOS, storage);
  return Array.isArray(dados) ? dados.filter(id => typeof id === 'string') : [];
}

export function marcarTutorialLido(id, storage = globalThis.localStorage) {
  const lidos = new Set(lerTutoriaisLidos(storage));
  lidos.add(id);
  gravarJson(CHAVE_LIDOS, [...lidos], storage);
  return [...lidos];
}

export function checklistOculto(storage = globalThis.localStorage) {
  return lerJson(CHAVE_CHECKLIST_OCULTO, storage) === true;
}

export function ocultarChecklist(storage = globalThis.localStorage) {
  gravarJson(CHAVE_CHECKLIST_OCULTO, true, storage);
}

// ---- Checklist de primeiros passos (admin, no Dashboard) ----

// `sinais` vem das listas já existentes da API: nenhum dado novo é guardado.
//   categorias  quantidade de categorias de produto cadastradas
//   produtos    quantidade de produtos cadastrados
//   produtosComSku quantidade de produtos já com SKU
//   vendas      quantidade de vendas registradas
// Sinal `null` = não foi possível saber (erro de rede): o passo fica pendente, sem acusar conclusão falsa.
export function passosPrimeirosPassos(sinais = {}) {
  const feito = valor => typeof valor === 'number' && valor > 0;
  return [
    {
      id: 'categorias',
      titulo: 'Organizar as categorias',
      ajuda: 'Níveis e códigos que formam o SKU.',
      concluido: feito(sinais.categorias),
      rota: '/configuracoes/categorias',
      tutorial: 'sku',
    },
    {
      id: 'produtos',
      titulo: 'Cadastrar o primeiro produto',
      ajuda: 'Com fotos, preço e estoque inicial.',
      concluido: feito(sinais.produtos),
      rota: '/produtos',
      tutorial: 'cadastrar-produto',
    },
    {
      id: 'sku',
      titulo: 'Gerar o SKU de um produto',
      ajuda: 'Categorize o produto e o SKU nasce sozinho.',
      concluido: feito(sinais.produtosComSku),
      rota: '/produtos',
      tutorial: 'sku',
    },
    {
      id: 'venda',
      titulo: 'Fazer a primeira venda',
      ajuda: 'Busque o produto, receba e finalize.',
      concluido: feito(sinais.vendas),
      rota: '/venda',
      tutorial: 'primeira-venda',
    },
  ];
}

export function resumoChecklist(passos) {
  const feitos = passos.filter(p => p.concluido).length;
  return { feitos, total: passos.length, completo: passos.length > 0 && feitos === passos.length };
}
