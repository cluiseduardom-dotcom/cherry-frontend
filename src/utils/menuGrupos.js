// Estrutura do menu lateral: quais rotas ficam soltas e quais ficam agrupadas em um dropdown.
// Só organiza a APRESENTAÇÃO — quem pode ver cada rota continua sendo decidido por canAccessRoute
// (config/access.js) e pelo backend. Sem DOM, testável.

export const ESTRUTURA_MENU = [
  { tipo: 'item', path: '/' },
  { tipo: 'item', path: '/venda' },
  { tipo: 'grupo', id: 'vendas', label: 'Vendas', itens: ['/historico', '/clientes', '/minha-maleta'] },
  {
    tipo: 'grupo',
    id: 'estoque',
    label: 'Estoque',
    itens: ['/estoque', '/transferencias', '/acerto-estoque', '/consumo', '/produtos'],
  },
  { tipo: 'grupo', id: 'compras', label: 'Compras', itens: ['/compras', '/fornecedores'] },
  {
    tipo: 'grupo',
    id: 'financeiro',
    label: 'Financeiro',
    itens: ['/contas-pagar', '/contas-receber', '/despesas-fixas', '/ponto-equilibrio', '/comissoes'],
  },
  { tipo: 'item', path: '/relatorios' },
  { tipo: 'grupo', id: 'administracao', label: 'Administração', itens: ['/usuarios', '/configuracoes'] },
];

// Monta o menu do usuário. `rotasDisponiveis` = rotas que existem como item de menu; `podeVer(path)`
// decide a permissão. Regras:
//  - grupo sem nenhum item visível some;
//  - grupo com UM item visível vira item simples (dropdown de um filho só é ruído);
//  - rota visível que não consta na estrutura nunca some do menu: entra no fim como item simples.
export function montarMenu(rotasDisponiveis, podeVer, estrutura = ESTRUTURA_MENU) {
  const existentes = new Set(rotasDisponiveis);
  const visivel = path => existentes.has(path) && podeVer(path);
  const usadas = new Set();
  const menu = [];

  for (const entrada of estrutura) {
    if (entrada.tipo === 'item') {
      usadas.add(entrada.path);
      if (visivel(entrada.path)) menu.push({ tipo: 'item', path: entrada.path });
      continue;
    }
    entrada.itens.forEach(path => usadas.add(path));
    const itens = entrada.itens.filter(visivel);
    if (itens.length === 1) menu.push({ tipo: 'item', path: itens[0] });
    else if (itens.length > 1) menu.push({ tipo: 'grupo', id: entrada.id, label: entrada.label, itens });
  }

  for (const path of rotasDisponiveis) {
    if (!usadas.has(path) && podeVer(path)) menu.push({ tipo: 'item', path });
  }
  return menu;
}

// A rota atual pertence ao item? Inclui subrotas (/compras/recebimentos → /compras).
export function rotaPertence(pathname, path) {
  if (path === '/') return pathname === '/';
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function grupoContemRota(itens, pathname) {
  return itens.some(path => rotaPertence(pathname, path));
}

const CHAVE_STORAGE = 'sidebar:grupos-abertos';

// Preferência de grupos abertos é só conveniência: qualquer falha de storage cai em "nada salvo".
export function lerGruposAbertos(storage = globalThis.localStorage) {
  try {
    const bruto = storage?.getItem(CHAVE_STORAGE);
    const dados = bruto ? JSON.parse(bruto) : {};
    return dados && typeof dados === 'object' && !Array.isArray(dados) ? dados : {};
  } catch {
    return {};
  }
}

export function salvarGruposAbertos(estado, storage = globalThis.localStorage) {
  try {
    storage?.setItem(CHAVE_STORAGE, JSON.stringify(estado));
  } catch {
    // storage indisponível (janela privada, bloqueio): o menu segue funcionando sem persistir.
  }
}
