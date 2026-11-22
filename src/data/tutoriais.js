// Catálogo de tutoriais do sistema. Só dados: o texto de cada passo descreve o que a tela faz hoje.
// Ao mudar uma tela, ajuste o tutorial correspondente.
//
// Formato de um tutorial:
//   id        identificador estável (vai na URL: /tutoriais/:id)
//   titulo    pergunta ou ação que o usuário quer resolver
//   resumo    uma frase
//   minutos   tempo estimado de leitura
//   rotaPrincipal  (opcional) tela do módulo: o tutorial só aparece para quem pode acessá-la (papel e funcionalidade do plano)
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
  {
    id: 'modelo-nicho',
    titulo: 'Como começar com um modelo pronto para o seu tipo de negócio',
    resumo: 'Confeitaria, lanchonete, adega, semijoias ou moda: o sistema já monta categorias e o padrão de SKU de partida.',
    minutos: 2,
    rotaPrincipal: '/configuracoes/categorias',
    passos: [
      {
        titulo: 'Abra as Categorias de produto de uma empresa nova',
        texto:
          'Enquanto a empresa não tem nenhuma categoria de produto, a tela mostra o cartão "Comece por um modelo pronto". ' +
          'Cada modelo traz as perguntas (níveis), as categorias de cada uma e um exemplo de SKU (como BOL-P-001).',
        rota: '/configuracoes/categorias',
        rotuloRota: 'Abrir categorias de produto',
      },
      {
        titulo: 'Escolha o modelo e confirme',
        texto:
          'Leia a descrição e o exemplo de SKU, escolha o modelo que mais se parece com o seu negócio e use "Usar este modelo". ' +
          'O sistema pede confirmação dizendo o que será criado e recarrega a tela.',
        dica: 'O modelo só pode ser aplicado quando ainda não há nenhuma categoria de produto. Depois de aplicado, tudo é editável.',
      },
      {
        titulo: 'Ajuste ao seu jeito',
        texto:
          'As categorias criadas são só um ponto de partida: renomeie, acrescente ou ajuste nas mesmas telas de sempre. ' +
          'O tutorial "Como definir os SKUs dos seus produtos" explica como o SKU nasce a partir delas.',
      },
    ],
  },
  {
    id: 'receita-insumos',
    titulo: 'Como cadastrar insumos e a receita (ficha técnica) de um produto',
    resumo: 'Insumos em gramas ou mililitros, receita com rendimento e custo calculado sozinho.',
    minutos: 4,
    rotaPrincipal: '/producao',
    passos: [
      {
        titulo: 'Cadastre os insumos em gramas ou mililitros',
        texto:
          'Em Insumos, cadastre cada ingrediente ou material. Para o que é pesado ou medido, escolha a unidade Grama (g) ou Mililitro (ml). ' +
          'O estoque fica em números inteiros (gramas ou ml), mas você digita o custo por kg ou por litro e o sistema converte: R$ 12,50 o kg vira R$ 0,0125 o grama.',
        rota: '/insumos',
        rotuloRota: 'Abrir insumos',
      },
      {
        titulo: 'Dê entrada nos insumos',
        texto:
          'O estoque do insumo sobe pelos mesmos caminhos do restante: compra, recebimento ou estoque inicial. Veja "Como dar entrada de mercadoria no estoque".',
        rota: '/estoque-insumos',
        rotuloRota: 'Abrir estoque de insumos',
      },
      {
        titulo: 'Abra a ficha técnica do produto',
        texto:
          'Em Produção, na seção Fichas técnicas, escolha o produto (por exemplo, o bolo) e use "Abrir ficha técnica". ' +
          'A ficha é a receita: quais insumos entram e em que quantidade.',
        rota: '/producao',
        rotuloRota: 'Abrir produção',
      },
      {
        titulo: 'Informe o rendimento e as quantidades',
        texto:
          'Preencha "rende quantas unidades": se a receita faz 12 brigadeiros, o rendimento é 12. Cada quantidade é POR RECEITA, em g/kg ou ml/L à sua escolha. ' +
          'O sistema mostra o custo da receita e o custo sugerido por unidade, e a cada salvamento cria uma nova versão da ficha.',
        dica: 'Se o consumo por unidade não for exato, o sistema arredonda para cima (nunca baixa menos insumo do que o necessário).',
      },
    ],
  },
  {
    id: 'producao',
    titulo: 'Como produzir e dar baixa nos insumos',
    resumo: 'Crie a ordem, conclua informando o produzido e deixe o sistema baixar os insumos.',
    minutos: 3,
    rotaPrincipal: '/producao',
    passos: [
      {
        titulo: 'Crie uma ordem de produção',
        texto:
          'Em Produção, use "Nova ordem", escolha o produto (ele precisa ter ficha técnica) e a quantidade a produzir. ' +
          'A tela mostra o que cada insumo precisa, quanto há em estoque, o que falta e quantas unidades dá para produzir.',
        rota: '/producao',
        rotuloRota: 'Abrir produção',
      },
      {
        titulo: 'Faltou insumo no sistema? Pode produzir',
        texto:
          'Faltar insumo apenas AVISA: às vezes o ingrediente está na bancada, mas a compra ainda não deu entrada. ' +
          'Você pode produzir mesmo assim; a parte que faltou fica como pendência e o estoque nunca fica negativo.',
      },
      {
        titulo: 'Inicie e conclua',
        texto:
          'Abra a ordem e use "Iniciar" quando começar. Ao terminar, use "Concluir…" e informe a quantidade produzida e, se houver, a perdida. ' +
          'O produto acabado entra no estoque e os insumos são baixados; o custo real por unidade aparece na ordem.',
        dica: 'Ordem concluída não se cancela. Cancelar só vale antes de concluir e pede o motivo.',
      },
      {
        titulo: 'Regularize os insumos pendentes',
        texto:
          'Quando a entrada do insumo for lançada (compra ou recebimento), abra a ordem e use "Regularizar insumos" para dar a baixa que ficou pendente. ' +
          'Ordens com pendência aparecem na lista com o selo "Insumo pendente".',
      },
    ],
  },
  {
    id: 'venda-por-peso',
    titulo: 'Como vender por kg ou litro',
    resumo: 'Para queijo, frios, bebidas e doces vendidos por peso: preço por kg ou litro, peso digitado no caixa.',
    minutos: 3,
    rotaPrincipal: '/venda',
    passos: [
      {
        titulo: 'Cadastre o produto em gramas ou mililitros',
        texto:
          'No cadastro do produto, escolha a unidade Grama (g) ou Mililitro (ml) e marque "Vender por kg" (ou litro). ' +
          'Assim o preço de venda passa a valer por kg ou por litro, e o estoque continua em gramas ou ml. Só o administrador cadastra.',
        rota: '/produtos',
        rotuloRota: 'Abrir produtos',
      },
      {
        titulo: 'Defina o preço por kg ou litro',
        texto:
          'Em Preços do produto, defina o preço de cada canal: ele vale por kg ou por litro. A tela mostra o custo já na mesma base (por exemplo, R$ 30,00/kg) para você enxergar a margem.',
        dica: 'Produto vendido por kg ou litro não é publicado na loja online (a loja vende por unidade).',
      },
      {
        titulo: 'Venda digitando o peso',
        texto:
          'No caixa, o produto entra com 100 g e o cartão mostra o preço como "R$ 45,00/kg". No carrinho, digite o peso em kg ou litros (ex.: 0,35) ou ajuste de 50 em 50 com os botões. ' +
          'O total da linha é calculado na hora e arredondado ao centavo.',
        rota: '/venda',
        rotuloRota: 'Abrir venda',
      },
    ],
  },
  {
    id: 'grade',
    titulo: 'Como cadastrar produtos com tamanho e cor (grade)',
    resumo: 'Uma grade cria todas as variações de uma vez, cada uma com SKU, estoque e preço próprios.',
    minutos: 3,
    rotaPrincipal: '/grades',
    passos: [
      {
        titulo: 'Crie a grade',
        texto:
          'Em Grades de produtos, use "Nova grade": informe nome, custo e preço, e escolha até 3 eixos com seus valores (por exemplo, Tamanho: P, M, G e Cor: Azul, Preta). ' +
          'A pré-visualização mostra todas as combinações, e você pode desmarcar as que não existem.',
        rota: '/grades',
        rotuloRota: 'Abrir grades',
      },
      {
        titulo: 'Entenda o SKU de cada variação',
        texto:
          'Se o nome do eixo for igual ao de um nível de categoria (como Tamanho), o sistema usa a categoria de mesmo nome no SKU (P vira CAM-P-001). ' +
          'A tela avisa quando algum valor não tem categoria correspondente.',
      },
      {
        titulo: 'Dê entrada no estoque de cada variação',
        texto:
          'Cada variação é um produto normal e nasce com estoque zero. Dê a entrada por compra, recebimento ou estoque inicial, variação por variação. ' +
          'Para novas combinações depois, abra a grade e acrescente (as que já existem são ignoradas).',
        rota: '/compras',
        rotuloRota: 'Abrir compras',
      },
      {
        titulo: 'Venda escolhendo a variação',
        texto:
          'No caixa, as variações aparecem num único cartão ("a partir de R$ X"). Toque nele e escolha a variação: as esgotadas ou sem preço aparecem desabilitadas.',
        rota: '/venda',
        rotuloRota: 'Abrir venda',
      },
    ],
  },
  {
    id: 'pedido-compra',
    titulo: 'Como pedir ao fornecedor e receber a mercadoria (pedido de compra)',
    resumo: 'Faça o pedido, acompanhe o que falta chegar e receba aos poucos; o estoque e a conta a pagar entram no recebimento.',
    minutos: 4,
    rotaPrincipal: '/compras/pedidos',
    passos: [
      {
        titulo: 'Crie o pedido',
        texto:
          'Em Compras, abra a aba Pedidos e use "Novo pedido": escolha o fornecedor, a entrega prevista, o prazo para pagar (em dias após o recebimento) e os itens com quantidade e preço. ' +
          'Frete, desconto e outras despesas entram no total. O pedido nasce como rascunho, com número automático.',
        rota: '/compras/pedidos',
        rotuloRota: 'Abrir pedidos de compra',
      },
      {
        titulo: 'Envie ao fornecedor e registre a confirmação',
        texto:
          'Use "Enviar ao fornecedor" quando fizer o pedido (depois disso ele não pode mais ser editado) e "Fornecedor confirmou" quando ele confirmar. ' +
          'Enquanto for rascunho, dá para editar ou cancelar.',
      },
      {
        titulo: 'Receba o que chegou, inteiro ou em parte',
        texto:
          'Abra o pedido e use "Receber": informe a nota ou o romaneio, a data e a quantidade que chegou de cada item. Pode receber em mais de uma vez; o pedido mostra o que ainda falta.',
        dica: 'Pedido já recebido, mesmo em parte, não pode ser cancelado.',
      },
      {
        titulo: 'Confira e aprove o recebimento',
        texto:
          'O sistema leva você ao recebimento já conferido. Ao usar "Aprovar recebimento", o estoque entra e a conta a pagar é criada, com vencimento no prazo combinado no pedido.',
        rota: '/compras/recebimentos',
        rotuloRota: 'Abrir recebimentos',
      },
    ],
  },
  {
    id: 'fiscal-preparo',
    titulo: 'Como deixar o cadastro pronto para a nota fiscal',
    resumo: 'Complete os dados da empresa e o NCM e a origem dos produtos. O sistema ainda não emite nota: só prepara o cadastro.',
    minutos: 3,
    rotaPrincipal: '/fiscal',
    passos: [
      {
        titulo: 'Veja o que falta na Prontidão',
        texto:
          'Em Fiscal, a aba Prontidão lista o que falta para a emissão: CNPJ, razão social, endereço, regime tributário, inscrição estadual, município (IBGE), e NCM e origem dos produtos. ' +
          'O botão "Corrigir" leva ao lugar certo.',
        rota: '/fiscal',
        rotuloRota: 'Abrir fiscal',
      },
      {
        titulo: 'Preencha os dados fiscais da empresa',
        texto:
          'Na aba Empresa, informe o regime tributário, a inscrição estadual (ou ISENTO), a municipal, o CNAE e o código IBGE do município. ' +
          'CNPJ, razão social e endereço ficam em Dados da empresa. O CNPJ pode ser numérico ou alfanumérico (com letras, emitido desde julho de 2026).',
        rota: '/configuracoes/empresa',
        rotuloRota: 'Abrir dados da empresa',
      },
      {
        titulo: 'Informe o NCM e a origem dos produtos',
        texto:
          'Na aba Produtos, preencha NCM, origem, unidade fiscal e CEST de cada produto, linha a linha, ou selecione vários e use "Aplicar aos selecionados" para preencher em lote.',
        dica: 'O estoquista vê só esta aba, porque NCM e origem são dado de catálogo.',
      },
      {
        titulo: 'O que ainda não existe',
        texto:
          'Nenhuma nota é emitida: não há certificado digital, CFOP nem alíquotas. Esta etapa só deixa o cadastro pronto para quando a emissão for ligada.',
      },
    ],
  },
];

// Tutorial destacado no topo da página e nos atalhos de ajuda.
export const ID_TUTORIAL_PRINCIPAL = 'sku';
