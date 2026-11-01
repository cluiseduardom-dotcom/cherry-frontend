import { podeComCapacidade } from '../config/access';

// Espelha src/constants/motivosEstoque.js do backend. O backend é quem decide (lista, permissão,
// observação obrigatória); aqui só se evita oferecer o que o usuário não pode e se avisa antes de enviar.
export const MOTIVOS_ESTOQUE = {
  entrada: {
    estoque_inicial: { rotulo: 'Estoque inicial', observacaoObrigatoria: false },
    recebimento_sem_compra: { rotulo: 'Recebimento sem compra', observacaoObrigatoria: true },
  },
  saida: {
    perda: { rotulo: 'Perda', observacaoObrigatoria: false },
    avaria: { rotulo: 'Avaria', observacaoObrigatoria: false },
    brinde: { rotulo: 'Brinde', observacaoObrigatoria: false },
    uso_interno: { rotulo: 'Uso interno', observacaoObrigatoria: false },
    outro: { rotulo: 'Outro', observacaoObrigatoria: true },
  },
  ajuste: {
    contagem: { rotulo: 'Contagem de estoque', observacaoObrigatoria: false },
    correcao: { rotulo: 'Correção de lançamento', observacaoObrigatoria: true },
  },
};

export const OBSERVACAO_MINIMA = 3;

export const TIPO_LABEL = {
  entrada: 'Entrada sem compra',
  saida: 'Saída',
  ajuste: 'Ajuste (define o estoque)',
};

// Estoque inicial: só o administrador (não é delegável). Recebimento sem compra: admin ou cargo com a capacidade.
export function motivosDoTipo(tipo, user) {
  const todos = Object.entries(MOTIVOS_ESTOQUE[tipo] ?? {});
  if (tipo !== 'entrada') return todos.map(([codigo, m]) => ({ codigo, ...m }));

  const ehAdmin = user?.role === 'admin' || user?.perfil === 'admin';
  return todos
    .filter(([codigo]) => {
      if (codigo === 'estoque_inicial') return ehAdmin;
      if (codigo === 'recebimento_sem_compra') return podeComCapacidade(user, 'receber_sem_compra');
      return false;
    })
    .map(([codigo, m]) => ({ codigo, ...m }));
}

export function tiposDisponiveis(user) {
  return Object.keys(TIPO_LABEL).filter(tipo => motivosDoTipo(tipo, user).length > 0);
}

export function podeAjustarParaMais(user) {
  return podeComCapacidade(user, 'ajustar_estoque');
}

export function validarMovimentacao(form, produtoSelecionado) {
  if (!form.produtoId) return 'Selecione um produto';
  if (!produtoSelecionado) return 'Produto inválido';

  const quantidade = Number(form.quantidade);
  if (form.quantidade === '' || Number.isNaN(quantidade) || !Number.isInteger(quantidade)) {
    return 'Quantidade inválida';
  }

  if (form.tipo === 'ajuste') {
    if (quantidade < 0) return 'Quantidade inválida';
  } else {
    if (quantidade <= 0) return 'Quantidade deve ser maior que zero';
    if (form.tipo === 'saida' && quantidade > produtoSelecionado.estoque_atual) {
      return `Estoque insuficiente (disponível: ${produtoSelecionado.estoque_atual})`;
    }
  }

  const motivo = MOTIVOS_ESTOQUE[form.tipo]?.[form.motivoCodigo];
  if (!motivo) return 'Selecione o motivo';
  if (motivo.observacaoObrigatoria && form.observacao.trim().length < OBSERVACAO_MINIMA) {
    return 'Informe a observação para este motivo';
  }

  return '';
}

export function montarPayloadMovimentacao(form) {
  const observacao = form.observacao.trim();
  return {
    tipo: form.tipo,
    quantidade: Number(form.quantidade),
    motivo_codigo: form.motivoCodigo,
    observacao: observacao || undefined,
  };
}
