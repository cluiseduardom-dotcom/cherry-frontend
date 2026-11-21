// Utilitários centralizados de máscara/validação para campos cadastrais
// (Issue #41). Regra do próprio issue: "Criar/reutilizar componentes ou
// utilitários centralizados de máscara/formatação. Não duplicar lógica em
// cada página." Todas as funções são puras — a normalização para envio à
// API (somente dígitos) é sempre feita por `somenteDigitos`, nunca
// implícita dentro da máscara de exibição.

export function somenteDigitos(valor) {
  return String(valor ?? '').replace(/\D/g, '');
}

// 000.000.000-00
export function aplicarMascaraCPF(valor) {
  return somenteDigitos(valor)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

// Documento (CPF ou CNPJ) como vai para a API: só letras e números, em maiúsculas. Desde julho de 2026 o CNPJ pode ser
// ALFANUMÉRICO (12 posições 0-9/A-Z + 2 dígitos verificadores), então `somenteDigitos` não serve mais para ele.
export function normalizarDocumento(valor) {
  return String(valor ?? '').replace(/[^0-9A-Za-z]/g, '').toUpperCase();
}

// 00.000.000/0000-00 (com letras nas 12 primeiras posições, se for o caso: 12.ABC.345/01DE-35)
export function aplicarMascaraCNPJ(valor) {
  return normalizarDocumento(valor)
    .slice(0, 14)
    .replace(/([0-9A-Z]{2})([0-9A-Z])/, '$1.$2')
    .replace(/([0-9A-Z]{3})([0-9A-Z])/, '$1.$2')
    .replace(/([0-9A-Z]{3})([0-9A-Z])/, '$1/$2')
    .replace(/([0-9A-Z]{4})([0-9A-Z]{1,2})$/, '$1-$2');
}

// Alterna CPF/CNPJ conforme o que já foi digitado: CPF é só números e tem 11; vira CNPJ a partir do 12º caractere ou assim
// que aparece uma letra (CNPJ alfanumérico). Usado em campos que aceitam pessoa física ou jurídica no mesmo input.
export function pareceCnpj(valor) {
  const d = normalizarDocumento(valor);
  return d.length > 11 || /[A-Z]/.test(d);
}

export function aplicarMascaraCpfCnpj(valor) {
  return pareceCnpj(valor) ? aplicarMascaraCNPJ(valor) : aplicarMascaraCPF(valor);
}

// (00) 00000-0000 para celular (11 dígitos) ou (00) 0000-0000 para fixo
// (10 dígitos) — a máscara se ajusta sozinha pela quantidade de dígitos.
export function aplicarMascaraTelefone(valor) {
  return somenteDigitos(valor)
    .slice(0, 11)
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{4,5})(\d{4})$/, '$1-$2');
}

// 00000-000
export function aplicarMascaraCEP(valor) {
  return somenteDigitos(valor)
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, '$1-$2');
}

// Chave de acesso da NF-e: 44 dígitos, agrupados de 4 em 4 para leitura
// (mesma convenção usada no DANFE/consulta pública da SEFAZ). Utilitário
// pronto para uso futuro — hoje não existe nenhum campo de chave de acesso
// no frontend (só "número da NF-e", um campo diferente), então não é
// aplicado em nenhuma tela nesta entrega.
export function aplicarMascaraChaveNFe(valor) {
  return somenteDigitos(valor)
    .slice(0, 44)
    .replace(/(\d{4})(?=\d)/g, '$1 ');
}

// Formatação de exibição em Real — centraliza o padrão
// `Number(x).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })`
// hoje duplicado em várias páginas.
export function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Validação de CPF por dígito verificador (algoritmo módulo 11 padrão da
// Receita Federal) — checagem de formato/integridade dos dígitos, não uma
// regra de negócio do VERTUMNO; a autoridade sobre o cadastro continua
// sendo o backend.
export function cpfValido(valor) {
  const d = somenteDigitos(valor);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;

  const calcularDigito = (tamanho) => {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(d[i]) * (tamanho + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return calcularDigito(9) === Number(d[9]) && calcularDigito(10) === Number(d[10]);
}

// Validação de CNPJ (numérico ou alfanumérico) por dígito verificador: módulo 11, com cada caractere valendo o código ASCII
// menos 48 (0-9 = 0-9; A = 17 ... Z = 42), o que mantém o mesmo dígito dos CNPJ numéricos. As 2 últimas posições são números.
export function cnpjValido(valor) {
  const d = normalizarDocumento(valor);
  if (!/^[0-9A-Z]{12}\d{2}$/.test(d) || /^(.)\1{13}$/.test(d)) return false;

  const PESOS_12 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const PESOS_13 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const calcularDigito = (tamanho, pesos) => {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += (d.charCodeAt(i) - 48) * pesos[i];
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  return calcularDigito(12, PESOS_12) === Number(d[12]) && calcularDigito(13, PESOS_13) === Number(d[13]);
}

// Valida CPF ou CNPJ (numérico ou alfanumérico) pelo mesmo critério de aplicarMascaraCpfCnpj (`pareceCnpj`).
export function cpfCnpjValido(valor) {
  return pareceCnpj(valor) ? cnpjValido(valor) : cpfValido(valor);
}
