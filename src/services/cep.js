import { somenteDigitos } from '../utils/mascaras';

// Consulta pública de CEP (ViaCEP), chamada direto do navegador: não passa pelo backend
// e não envia nenhum dado da empresa, só os 8 dígitos do CEP.
// Devolve { logradouro, bairro, cidade, uf } (string vazia quando o CEP não traz o campo),
// `null` se o CEP não existe, e lança erro se o serviço estiver indisponível.
export async function buscarCep(cep, { signal } = {}) {
  const digitos = somenteDigitos(cep);
  if (digitos.length !== 8) return null;

  const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`, { signal });
  if (!resposta.ok) throw new Error('Serviço de CEP indisponível');

  const dados = await resposta.json();
  if (!dados || dados.erro) return null;

  return {
    logradouro: dados.logradouro || '',
    bairro: dados.bairro || '',
    cidade: dados.localidade || '',
    uf: dados.uf || '',
  };
}
