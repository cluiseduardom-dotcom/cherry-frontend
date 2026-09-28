// Parser tolerante para datas vindas do backend: aceita tanto 'YYYY-MM-DD'
// (DATE do Postgres, retornado como string simples — ver comentário em
// comprasRepository.js) quanto um timestamp ISO completo
// ('YYYY-MM-DDTHH:mm:ss.sssZ', caso de colunas TIMESTAMP). Qualquer valor
// ausente ou em formato inesperado vira "Não informada" em vez de deixar
// `new Date(...)` produzir a string literal "Invalid Date" na tela.
export function formatarData(valor) {
  if (!valor) return 'Não informada';

  const dataApenas = String(valor).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataApenas)) return 'Não informada';

  const data = new Date(dataApenas + 'T12:00:00');
  if (Number.isNaN(data.getTime())) return 'Não informada';

  return data.toLocaleDateString('pt-BR');
}
