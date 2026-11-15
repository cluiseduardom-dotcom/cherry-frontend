// Política de privacidade do SISTEMA (ERP). É um PONTO DE PARTIDA escrito a partir do que o sistema realmente faz (código e
// docs/LGPD.md do backend) e PRECISA ser revisado por um advogado. Nada aqui inventa prazo, base legal ou número de contato:
// o que depende de decisão da empresa fica de fora ou aparece como "a combinar".
export const ATUALIZADA_EM = '15/11/2026';

export const SECOES = [
  {
    titulo: 'Quem é quem',
    paragrafos: [
      'O Vertumno é um sistema de gestão operado pela GiroNex. Cada empresa que usa o sistema (a sua loja) é a responsável pelos dados dos seus clientes, fornecedores e equipe que ela cadastra aqui; a GiroNex trata esses dados em nome da empresa, para o sistema funcionar.',
      'Os dados de acesso dos usuários (nome, usuário ou e-mail e senha) são tratados pela GiroNex para permitir o login e manter a segurança do sistema.',
    ],
  },
  {
    titulo: 'Que dados o sistema guarda',
    lista: [
      'Usuários da empresa: nome, usuário ou e-mail e senha (guardada de forma criptografada, nunca em texto). Quando a empresa preenche o cadastro do colaborador, também CPF, data de nascimento, telefone, endereço e foto.',
      'Clientes e fornecedores cadastrados pela empresa: nome, telefone, e-mail, documento (CPF ou CNPJ), endereço e data de nascimento, conforme a empresa preencher.',
      'Vendas, estoque, contas a pagar e a receber e demais registros da operação, com a trilha de quem fez o quê e quando.',
      'Dados de cartão não são guardados: os pagamentos por Pix e cartão passam pelo Mercado Pago, quando a empresa conecta a conta dele.',
    ],
  },
  {
    titulo: 'Com quem os dados passam',
    lista: [
      'Render: hospedagem do sistema (servidores nos Estados Unidos).',
      'Banco de dados em nuvem, onde os registros ficam guardados.',
      'Cloudflare: armazenamento das imagens enviadas (fotos de produtos, de perfil e da vitrine).',
      'Mercado Pago: processamento de Pix e cartão, só nas empresas que conectam a conta.',
      'Serviço de monitoramento de erros técnicos, quando ativado: recebe apenas dados técnicos de falhas, com nome, e-mail, telefone, CPF e CNPJ removidos antes do envio.',
    ],
    paragrafos: ['Não vendemos dados. Parte desses serviços fica fora do Brasil, o que significa transferência internacional de dados.'],
  },
  {
    titulo: 'O que fica no seu navegador',
    paragrafos: ['A sessão de login, o tema e a marca da empresa, os grupos abertos do menu e os avisos já lidos ficam guardados no seu navegador, só para o sistema funcionar. Não usamos cookies de publicidade nem de rastreamento, e as fontes de letra são servidas pelo próprio sistema.'],
  },
  {
    titulo: 'Seus direitos',
    paragrafos: [
      'Pela Lei Geral de Proteção de Dados (Lei 13.709/2018), você pode pedir a confirmação do tratamento, o acesso, a correção, a anonimização ou eliminação do que não for necessário e informações sobre com quem os dados são compartilhados.',
      'Se os seus dados foram cadastrados por uma loja (como cliente ou colaborador), fale primeiro com a própria loja. Para dados de acesso ao sistema ou qualquer dúvida sobre esta política, fale com a GiroNex pelo canal de atendimento do site vertumno.com.br.',
      'Alguns registros (vendas, financeiro e trilhas de auditoria) não podem ser apagados para não esconder operações; nesses casos o dado pessoal é anonimizado e o registro da operação permanece.',
    ],
  },
];
