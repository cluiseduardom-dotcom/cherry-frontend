import { describe, it, expect } from 'vitest';
import { CHAVES_VOCABULARIO, OPCOES_VOCABULARIO, vocabularioDoUsuario, vocabularioEstoque } from './vocabularioEstoque';

const maleta = vocabularioEstoque('maleta');
const estoque = vocabularioEstoque('estoque_vendedor');

describe('vocabulário do estoque do vendedor', () => {
  it('lista fechada e opções para o seletor', () => {
    expect(CHAVES_VOCABULARIO).toEqual(['maleta', 'estoque_vendedor']);
    expect(OPCOES_VOCABULARIO.map(o => o.rotulo)).toEqual(['Maleta', 'Estoque do vendedor']);
  });

  it('chave ausente, nula ou desconhecida cai em maleta; vem da sessão do usuário', () => {
    for (const ruim of [undefined, null, '', 'outra']) expect(vocabularioEstoque(ruim)).toBe(maleta);
    expect(vocabularioDoUsuario({ rotulo_estoque_vendedor: 'estoque_vendedor' })).toBe(estoque);
    expect(vocabularioDoUsuario(null)).toBe(maleta);
    expect(vocabularioDoUsuario({})).toBe(maleta);
  });

  it('maleta: o texto é o de sempre (nada muda para quem já usa)', () => {
    expect(maleta).toMatchObject({
      nome: 'Maleta', minha: 'Minha maleta', opcaoNovoLocal: 'Maleta (estoque que fica com um vendedor)', donoDe: 'Dono da maleta',
      todosTem: 'Todos os usuários ativos já têm uma maleta.', nomeOpcional: 'Nome da maleta (opcional)', padraoDoNome: 'Padrão: Maleta de + nome do usuário',
      montar: 'Montar maleta', receberDevolucao: 'Receber devolução da maleta', enviarPara: 'Enviar para a maleta',
      saemDa: 'As peças saem da maleta e entram no Central agora.',
      entramNa: 'As peças saem do Central agora e entram na maleta quando o vendedor aceitar (ele confere o que recebeu).',
      saemDaSua: 'A mercadoria sai da sua maleta agora e entra no Central quando a equipe aceitar.',
      transferenciasSubtitulo: 'Movimentação de estoque entre Central, maletas e consignados',
      naoCarregou: 'Não foi possível carregar a sua maleta.', naoTemUma: 'Você ainda não tem uma maleta', criarUmaParaVoce: 'criar uma para você', itensNa: 'Itens na maleta', produtosNa: 'Produtos na maleta',
      estaVazia: 'Sua maleta está vazia', acertoDa: 'Acerto da maleta', avisoSemConferencia: 'Maleta sem conferência', avisoSemVender: 'Maleta sem vender',
    });
    expect(maleta.toastEnviada(7)).toBe('Maleta: transferência #7 enviada. Entra na maleta quando o vendedor aceitar.');
  });

  it('estoque do vendedor: gênero e preposição concordam em todas as frases', () => {
    expect(estoque).toMatchObject({
      nome: 'Estoque do vendedor', minha: 'Meu estoque', opcaoNovoLocal: 'Estoque do vendedor (estoque que fica com um vendedor)', donoDe: 'Dono do estoque do vendedor',
      todosTem: 'Todos os usuários ativos já têm um estoque do vendedor.', nomeOpcional: 'Nome do estoque do vendedor (opcional)', padraoDoNome: 'Padrão: Estoque de + nome do usuário',
      montar: 'Montar estoque do vendedor', receberDevolucao: 'Receber devolução do estoque do vendedor', enviarPara: 'Enviar para o estoque do vendedor',
      saemDa: 'As peças saem do estoque do vendedor e entram no Central agora.',
      entramNa: 'As peças saem do Central agora e entram no estoque do vendedor quando o vendedor aceitar (ele confere o que recebeu).',
      saemDaSua: 'A mercadoria sai do seu estoque agora e entra no Central quando a equipe aceitar.',
      transferenciasSubtitulo: 'Movimentação de estoque entre Central, estoques dos vendedores e consignados',
      naoCarregou: 'Não foi possível carregar o seu estoque.', naoTemUma: 'Você ainda não tem um estoque do vendedor', criarUmaParaVoce: 'criar um para você', itensNa: 'Itens no estoque do vendedor', produtosNa: 'Produtos no estoque do vendedor',
      estaVazia: 'Seu estoque está vazio', acertoDa: 'Acerto do estoque do vendedor', avisoSemConferencia: 'Estoque do vendedor sem conferência', avisoSemVender: 'Estoque do vendedor sem vender',
    });
    expect(estoque.toastEnviada(7)).toBe('Estoque do vendedor: transferência #7 enviada. Entra no estoque do vendedor quando o vendedor aceitar.');
  });

  it('nenhuma frase sai com concordância errada', () => {
    const todas = (v) => Object.values(v).filter(x => typeof x === 'string').join(' | ');

    expect(todas(estoque)).not.toMatch(/\b(a|da|na|uma|sua|vazia|própria) estoque|\bo maleta|\bdo maleta|\bno maleta|\bum maleta/i);
    expect(todas(maleta)).not.toMatch(/\b(o|do|no|um|seu|vazio|próprio) maleta|\bo estoque do vendedor/i);
  });
});
