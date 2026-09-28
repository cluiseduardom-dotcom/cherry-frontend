import { useCallback, useEffect, useState } from 'react';

// Núcleo puro da regra da Issue #42 — decide O QUE fazer, sem tocar em
// estado React. O projeto não tem React Testing Library/jsdom (só testes
// de lógica pura via Vitest em ambiente 'node'), então a decisão fica aqui,
// isolada e testável, e o hook abaixo só liga isso a useState/useEffect.
//
// Backdrop, botão X e botão Cancelar chamam todos a mesma
// `solicitarFechamento` no hook — não há lógica diferente por gatilho, por
// isso uma única função pura cobre os três casos.
export function decidirTentativaFechamento(isDirty) {
  return isDirty ? 'ABRIR_CONFIRMACAO' : 'FECHAR';
}

// ESC quando a confirmação de descarte já está na tela nunca fecha nada —
// volta para "continuar editando" (ação segura). Caso contrário, ESC segue
// a mesma regra de qualquer outra tentativa de fechamento.
export function decidirTeclaEsc(confirmando, isDirty) {
  if (confirmando) return 'CONTINUAR_EDITANDO';
  return decidirTentativaFechamento(isDirty);
}

// Efeito de "Descartar alterações": perde os dados de propósito, fecha o
// modal chamando onClose.
export function aoConfirmarDescarte(onClose) {
  onClose();
}

// Efeito de "Continuar editando": nunca chama onClose — é exatamente o que
// garante que os dados digitados são preservados.
export function aoContinuarEditando() {
  // Não há nada para fazer além de fechar a confirmação (isso é estado
  // React, tratado no hook) — existe como função própria para que o
  // "não chamar onClose" seja uma decisão explícita e testável, não uma
  // ausência de código.
}

// Uso: cada modal chama `solicitarFechamento` no lugar de `onClose` direto
// em TODOS os caminhos de fechamento (backdrop, X, Cancelar) e deixa este
// hook cuidar do ESC. Quando `isDirty` é falso, fecha imediatamente — o
// comportamento padrão de sempre. Quando é verdadeiro, abre a confirmação
// de descarte em vez de fechar; o modal só fecha de fato via
// `confirmarDescarte`.
export function useConfirmarFechamentoModal({ open, isDirty, onClose }) {
  const [confirmando, setConfirmando] = useState(false);

  const continuarEditando = useCallback(() => {
    aoContinuarEditando();
    setConfirmando(false);
  }, []);

  const confirmarDescarte = useCallback(() => {
    setConfirmando(false);
    aoConfirmarDescarte(onClose);
  }, [onClose]);

  const solicitarFechamento = useCallback(() => {
    if (decidirTentativaFechamento(isDirty) === 'ABRIR_CONFIRMACAO') {
      setConfirmando(true);
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  useEffect(() => {
    if (!open) {
      setConfirmando(false);
      return undefined;
    }

    function handleKeyDown(e) {
      if (e.key !== 'Escape') return;
      const acao = decidirTeclaEsc(confirmando, isDirty);
      if (acao === 'CONTINUAR_EDITANDO') continuarEditando();
      else if (acao === 'ABRIR_CONFIRMACAO') setConfirmando(true);
      else onClose();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, confirmando, isDirty, onClose, continuarEditando]);

  return { confirmando, solicitarFechamento, confirmarDescarte, continuarEditando };
}
