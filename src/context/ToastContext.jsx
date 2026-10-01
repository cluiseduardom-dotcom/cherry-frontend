import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import './ToastContext.css';

// UX-06 (Issue #52): única infraestrutura global de notificações temporárias
// do projeto. Convive com o ConfirmDialog (UX-05) — o ConfirmDialog pede
// autorização, o Toast comunica o resultado depois que a ação já rodou.

const DURACAO_POR_TIPO = { success: 4000, info: 4000, warning: 5000, error: 7000 };
const ICONE_POR_TIPO = { success: CheckCircle2, warning: AlertTriangle, error: XCircle, info: Info };
// Erro/aviso usam aria-live assertive (interrompem o leitor de tela na hora,
// porque indicam algo que deu errado ou precisa de atenção); sucesso/info
// usam polite (anunciados sem interromper o que o usuário está fazendo).
const ROLE_POR_TIPO = { success: 'status', info: 'status', warning: 'alert', error: 'alert' };
const ARIA_LIVE_POR_TIPO = { success: 'polite', info: 'polite', warning: 'assertive', error: 'assertive' };

// Funções puras extraídas pelo mesmo motivo de useConfirmarFechamentoModal/
// useConfirmAction — o projeto não tem jsdom/React Testing Library para
// renderizar o Provider de verdade, então a lógica de lista fica isolada e
// testável sem DOM.
export function adicionarToast(lista, toast) {
  return [...lista, toast];
}

export function removerToast(lista, id) {
  return lista.filter(t => t.id !== id);
}

export function duracaoPorTipo(tipo) {
  return DURACAO_POR_TIPO[tipo] ?? DURACAO_POR_TIPO.info;
}

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idCounterRef = useRef(0);

  const dismiss = useCallback(id => {
    setToasts(prev => removerToast(prev, id));
  }, []);

  const show = useCallback((tipo, mensagem) => {
    idCounterRef.current += 1;
    const id = idCounterRef.current;
    setToasts(prev => adicionarToast(prev, { id, tipo, mensagem }));
    window.setTimeout(() => dismiss(id), duracaoPorTipo(tipo));
  }, [dismiss]);

  const api = {
    success: mensagem => show('success', mensagem),
    error: mensagem => show('error', mensagem),
    warning: mensagem => show('warning', mensagem),
    info: mensagem => show('info', mensagem),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-container" aria-label="Notificações">
        {toasts.map(t => {
          const Icone = ICONE_POR_TIPO[t.tipo] ?? Info;
          return (
            <div
              key={t.id}
              className={`toast toast--${t.tipo}`}
              role={ROLE_POR_TIPO[t.tipo] ?? 'status'}
              aria-live={ARIA_LIVE_POR_TIPO[t.tipo] ?? 'polite'}
            >
              <Icone size={18} className="toast-icon" aria-hidden="true" />
              <span className="toast-message">{t.mensagem}</span>
              <button
                type="button"
                className="toast-close"
                aria-label="Fechar notificação"
                onClick={() => dismiss(t.id)}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast deve ser usado dentro de ToastProvider');
  return ctx;
}
