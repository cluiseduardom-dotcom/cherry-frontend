// Catálogo de tutoriais do sistema. Só dados: o texto de cada passo descreve o que a tela faz hoje.
// Ao mudar uma tela, ajuste o tutorial correspondente.
//
// Formato de um tutorial:
//   id        identificador estável (vai na URL: /tutoriais/:id)
//   titulo    pergunta ou ação que o usuário quer resolver
//   resumo    uma frase
//   minutos   tempo estimado de leitura
//   passos    [{ titulo, texto, dica?, rota?, rotuloRota? }]
//             `rota` abre a tela do passo; só aparece para quem pode acessá-la (config/access.js).

export const TUTORIAIS = [
  {
    id: 'sku',
    titulo: 'Como definir os SKUs dos seus produtos',
    resumo: 'O SKU é gerado sozinho a partir das categorias. Você só precisa organizar as categorias uma vez.',
    minutos: 4,
    passos: [
      {
        titulo: 'Entenda a ideia: você não digita o SKU',
        texto:
          'O sistema monta o SKU de cada produto juntando o código das categorias dele com um número de sequência. ' +
          'Exemplo: produto da categoria BR (Brinco) com material OU (Ouro) pode virar BR-OU-001; o próximo igual vira BR-OU-002 (o separador e o formato dependem do padrão configurado). ' +
          'Por isso o trabalho é organizar as categorias, não inventar código produto a produto.',
        dica: 'O SKU de um produto nunca muda depois de gerado. Pense na organização antes de categorizar muitos produtos.',
      },
      {
        titulo: 'Dê nome aos níveis',
        texto:
          'Cada nível é uma "pergunta" que descreve o produto, e vira uma parte do SKU. ' +
          'Exemplo: Nível 1 = Tipo de peça, Nível 2 = Material. Em Configurações > Categorias de produto, renomeie os níveis para o que faz sentido no seu negócio.',
        rota: '/configuracoes/categorias',
        rotuloRota: 'Abrir categorias de produto',
      },
      {
        titulo: 'Cadastre as categorias de cada nível',
        texto:
          'Em cada nível, crie as categorias com um código curto (só letras e números) e um nome. ' +
          'Exemplo no nível Tipo de peça: BR = Brinco, CO = Colar, AN = Anel. ' +
          'Escolha códigos fáceis de reconhecer: são eles que aparecem no SKU e na etiqueta.',
        dica: 'Se errar o código de uma categoria, o caminho é excluir e criar outra. Só o nome pode ser editado.',
        rota: '/configuracoes/categorias',
        rotuloRota: 'Abrir categorias de produto',
      },
      {
        titulo: 'Confira o formato do SKU',
        texto:
          'Em Configurações > Padrões de SKU você escolhe o separador (por exemplo hífen), quantos dígitos tem a sequência e quais níveis entram no SKU. ' +
          'A prévia na tela mostra exatamente como o SKU vai ficar. Se a prévia agrada, não precisa mexer em mais nada.',
        rota: '/configuracoes/sku',
        rotuloRota: 'Abrir padrões de SKU',
      },
      {
        titulo: 'Categorize o produto para gerar o SKU',
        texto:
          'Ao criar um produto, o assistente de cadastro abre o passo "Categoria e SKU". ' +
          'Para um produto que já existe, em Produtos abra o menu de ações do produto e escolha a categorização. ' +
          'Escolha uma categoria em cada nível e salve: o SKU é gerado na hora.',
        dica: 'Produto sem categoria fica "sem SKU" até ser categorizado.',
        rota: '/produtos',
        rotuloRota: 'Abrir produtos',
      },
    ],
  },
  {
    id: 'cadastrar-produto',
    titulo: 'Como cadastrar um produto do começo ao fim',
    resumo: 'Cadastro, fotos, categoria, preço e estoque inicial, em ordem, sem sair da tela.',
    minutos: 3,
    passos: [
      {
        titulo: 'Crie o produto',
        texto:
          'Em Produtos, use o botão "Novo Produto" e preencha nome e custo. O cadastro cria só o produto: o estoque começa em zero e é lançado em um passo à parte.',
        rota: '/produtos',
        rotuloRota: 'Abrir produtos',
      },
      {
        titulo: 'Siga o assistente',
        texto:
          'Logo depois de criar, abre um assistente com os passos que faltam: fotos, categoria e SKU, preço de venda e estoque inicial. ' +
          'Cada passo salva na hora e pode ser pulado e feito depois.',
      },
      {
        titulo: 'Defina o preço de venda',
        texto: 'Você pode definir o preço por markup sobre o custo ou digitar o preço direto, por canal de venda.',
      },
      {
        titulo: 'Lance o estoque inicial (só administrador)',
        texto:
          'O estoque inicial é a quantidade que já existe hoje. Só o administrador lança, uma única vez por produto, e só em produto sem movimentação. ' +
          'Depois disso, o estoque só aumenta por compra ou recebimento.',
        dica: 'Se o produto já teve alguma movimentação, o estoque inicial não é permitido. Use compra ou recebimento.',
      },
    ],
  },
  {
    id: 'entrada-estoque',
    titulo: 'Como dar entrada de mercadoria no estoque',
    resumo: 'O estoque só aumenta por um motivo rastreável: compra, recebimento ou estoque inicial.',
    minutos: 3,
    passos: [
      {
        titulo: 'Entenda a regra',
        texto:
          'Não existe "entrada livre". O estoque aumenta por compra, por recebimento aprovado, pelo estoque inicial (administrador) ou, com permissão específica, por recebimento sem compra e ajuste para mais. ' +
          'Isso mantém o histórico confiável.',
      },
      {
        titulo: 'Registre a compra',
        texto:
          'Em Compras, clique em "Nova compra" e escolha compra direta. Informe fornecedor e data, a forma de pagamento e os itens. ' +
          'Ao salvar, o estoque entra e as contas a pagar são geradas.',
        rota: '/compras',
        rotuloRota: 'Abrir compras',
      },
      {
        titulo: 'Corrija saídas e perdas',
        texto:
          'Para saída (perda, avaria, brinde, uso interno) ou ajuste de contagem, use a movimentação de estoque no produto, sempre escolhendo o motivo. ' +
          'O sistema nunca deixa o estoque ficar negativo.',
        rota: '/estoque',
        rotuloRota: 'Abrir estoque',
      },
    ],
  },
  {
    id: 'primeira-venda',
    titulo: 'Como fazer uma venda',
    resumo: 'Buscar o produto, escolher o cliente, receber o pagamento e finalizar.',
    minutos: 2,
    passos: [
      {
        titulo: 'Abra a Venda e adicione os produtos',
        texto:
          'Na tela Nova Venda, busque o produto pelo nome ou pelo SKU, ou use o leitor de código de barras. Toque no produto para colocá-lo no carrinho.',
        rota: '/venda',
        rotuloRota: 'Abrir venda',
      },
      {
        titulo: 'Escolha o cliente (opcional)',
        texto:
          'O campo Cliente é opcional: sem escolha, a venda fica como "Cliente não identificado". Vendas para cliente cadastrado entram no histórico dele.',
      },
      {
        titulo: 'Registre o pagamento e finalize',
        texto:
          'Escolha a forma de pagamento e confira os valores Pago e Restante no rodapé do carrinho. ' +
          'O botão "Finalizar Venda" só libera quando o pagamento está completo.',
      },
    ],
  },
];

// Tutorial destacado no topo da página e nos atalhos de ajuda.
export const ID_TUTORIAL_PRINCIPAL = 'sku';
