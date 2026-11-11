import { apiFetch } from './api';

// Dados institucionais da loja online. Contrato (backend, docs/LOJA_API.md, "Dados institucionais da loja"):
//   GET /loja-institucional   todos os campos (nulos quando vazios)
//   PUT /loja-institucional   estrito: campo ausente não muda; texto vazio limpa
export const CAMPOS_INSTITUCIONAL = [
  'historia', 'fundadora_nome', 'servicos', 'atendimento', 'horario_atendimento', 'email_contato', 'whatsapp',
  'instagram_url', 'facebook_url', 'tiktok_url', 'razao_social', 'cnpj', 'endereco',
];

export async function buscarInstitucional() {
  const body = await apiFetch('/loja-institucional');
  return body.data;
}

export async function salvarInstitucional(dados) {
  const permitido = {};
  for (const campo of CAMPOS_INSTITUCIONAL) {
    if (campo in dados) permitido[campo] = dados[campo];
  }

  const body = await apiFetch('/loja-institucional', { method: 'PUT', body: JSON.stringify(permitido) });
  return body.data;
}
