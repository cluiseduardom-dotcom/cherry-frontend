// Vocabulário do estoque que fica com o vendedor. O tipo técnico do local é sempre `maleta`; aqui só mudam as PALAVRAS, por empresa
// (`rotulo_estoque_vendedor`, vindo de /auth/me): "Maleta" (semijoias e acessórios) ou "Estoque do vendedor" (demais ramos).
// Lista fechada, com gênero e preposição já concordados: nenhuma tela monta "o maleta" ou "da estoque". Espelha o backend
// (src/constants/vocabularioEstoque.js). Chave ausente ou desconhecida cai em "maleta" (comportamento anterior).

// Átomos gramaticais de cada opção; as frases abaixo são compostas a partir deles.
const ATOMOS = {
  maleta: {
    chave: 'maleta',
    sub: 'maleta', Sub: 'Maleta', plural: 'maletas', Plural: 'Maletas',
    curto: 'maleta', // para "minha/sua ___"
    a: 'a', da: 'da', na: 'na', pela: 'pela', um: 'uma', vazio: 'vazia', Minha: 'Minha', sua: 'sua', propria: 'própria',
    descricao: 'Para semijoias e acessórios',
  },
  estoque_vendedor: {
    chave: 'estoque_vendedor',
    sub: 'estoque do vendedor', Sub: 'Estoque do vendedor', plural: 'estoques dos vendedores', Plural: 'Estoques dos vendedores',
    curto: 'estoque',
    a: 'o', da: 'do', na: 'no', pela: 'pelo', um: 'um', vazio: 'vazio', Minha: 'Meu', sua: 'seu', propria: 'próprio',
    descricao: 'Para os demais ramos',
  },
};

export const CHAVES_VOCABULARIO = Object.keys(ATOMOS);
export const OPCOES_VOCABULARIO = CHAVES_VOCABULARIO.map(chave => ({ chave, rotulo: ATOMOS[chave].Sub, descricao: ATOMOS[chave].descricao }));

function compor(t) {
  return {
    chave: t.chave,
    nome: t.Sub,
    nomeMinusculo: t.sub,
    plural: t.Plural,
    pluralMinusculo: t.plural,
    // Menu e títulos
    minha: `${t.Minha} ${t.curto}`,
    paginaSubtitulo: 'Estoque que fica com você',
    transferenciasSubtitulo: `Movimentação de estoque entre Central, ${t.plural} e consignados`,
    maisSubtitulo: `Mover estoque entre Central, ${t.plural} e consignados`,
    // Novo local
    opcaoNovoLocal: `${t.Sub} (estoque que fica com um vendedor)`,
    donoDe: `Dono ${t.da} ${t.sub}`,
    selecioneDono: `Selecione o dono ${t.da} ${t.sub}`,
    todosTem: `Todos os usuários ativos já têm ${t.um} ${t.sub}.`,
    nomeOpcional: `Nome ${t.da} ${t.sub} (opcional)`,
    padraoDoNome: `Padrão: ${t.Sub === 'Maleta' ? 'Maleta' : 'Estoque'} de + nome do usuário`,
    // Transferências
    montar: `Montar ${t.sub}`,
    receberDevolucao: `Receber devolução ${t.da} ${t.sub}`,
    enviarPara: `Enviar para ${t.a} ${t.sub}`,
    saemDa: `As peças saem ${t.da} ${t.sub} e entram no Central agora.`,
    entramNa: `As peças saem do Central agora e entram ${t.na} ${t.sub} quando o vendedor aceitar (ele confere o que recebeu).`,
    saemDaSua: `A mercadoria sai ${t.da} ${t.sua} ${t.curto} agora e entra no Central quando a equipe aceitar.`,
    montarTitulo: `Central → ${t.sub} do vendedor, bipando as peças`,
    devolverTitulo: `${t.Sub} do vendedor → Central, bipando as peças que voltaram`,
    criePrimeiro: `Crie ${t.a} ${t.sub} do vendedor em Estoque → Novo local`,
    paraMontarCrie: `Para montar ${t.plural}, crie primeiro ${t.a} ${t.sub} de cada vendedor em Estoque → Novo local.`,
    toastEnviada: (id) => `${t.Sub}: transferência #${id} enviada. Entra ${t.na} ${t.sub} quando o vendedor aceitar.`,
    // Minha maleta / meu estoque
    naoCarregou: `Não foi possível carregar ${t.a} ${t.sua} ${t.curto}.`,
    naoTemUma: `Você ainda não tem ${t.um} ${t.sub}`,
    criarUmaParaVoce: `criar ${t.um} para você`,
    itensNa: `Itens ${t.na} ${t.sub}`,
    produtosNa: `Produtos ${t.na} ${t.sub}`,
    estaVazia: `${t.Sub === 'Maleta' ? 'Sua maleta' : 'Seu estoque'} está ${t.vazio}`,
    acertoDa: `Acerto ${t.da} ${t.sub}`,
    // Avisos
    avisoSemConferencia: `${t.Sub} sem conferência`,
    avisoSemVender: `${t.Sub} sem vender`,
  };
}

const VOCABULARIOS = Object.fromEntries(CHAVES_VOCABULARIO.map(chave => [chave, Object.freeze(compor(ATOMOS[chave]))]));

/** Vocabulário da chave; ausente ou desconhecida = maleta (nunca quebra). */
export function vocabularioEstoque(chave) {
  return VOCABULARIOS[chave] ?? VOCABULARIOS.maleta;
}

/** Vocabulário da empresa do usuário logado (campo `rotulo_estoque_vendedor` da sessão). */
export function vocabularioDoUsuario(user) {
  return vocabularioEstoque(user?.rotulo_estoque_vendedor);
}
