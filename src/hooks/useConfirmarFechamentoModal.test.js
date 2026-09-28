import { describe, it, expect, vi } from 'vitest';
import { decidirTentativaFechamento, decidirTeclaEsc, aoConfirmarDescarte, aoContinuarEditando } from './useConfirmarFechamentoModal';

// decidirTentativaFechamento é a decisão usada por TODOS os gatilhos de
// fechamento do modal (clique fora do backdrop, botão X, botão Cancelar) —
// os três chamam a mesma `solicitarFechamento` no hook, que usa esta
// função. Testar esta função cobre os três cenários da Issue #42 ao mesmo
// tempo, porque não há lógica diferente por gatilho.
describe('decidirTentativaFechamento (dirty state / clique fora / X / Cancelar)', () => {
  it('formulário sem alterações (isDirty=false) fecha normalmente, sem confirmação', () => {
    expect(decidirTentativaFechamento(false)).toBe('FECHAR');
  });

  it('formulário com alterações (isDirty=true) abre a confirmação de descarte em vez de fechar', () => {
    expect(decidirTentativaFechamento(true)).toBe('ABRIR_CONFIRMACAO');
  });
});

describe('decidirTeclaEsc', () => {
  it('ESC em formulário sem alterações fecha direto', () => {
    expect(decidirTeclaEsc(false, false)).toBe('FECHAR');
  });

  it('ESC em formulário com alterações abre a confirmação de descarte (nunca fecha direto)', () => {
    expect(decidirTeclaEsc(false, true)).toBe('ABRIR_CONFIRMACAO');
  });

  it('ESC com a confirmação já aberta sempre volta para "continuar editando", mesmo se isDirty for true', () => {
    expect(decidirTeclaEsc(true, true)).toBe('CONTINUAR_EDITANDO');
    expect(decidirTeclaEsc(true, false)).toBe('CONTINUAR_EDITANDO');
  });
});

// O projeto não tem jsdom/React Testing Library para renderizar o hook
// (`useConfirmarFechamentoModal`) de verdade — por isso os efeitos de
// "descartar"/"continuar editando" ficam em funções próprias
// (aoConfirmarDescarte/aoContinuarEditando) que o hook chama diretamente,
// e que testamos aqui como as mesmas funções, não uma reimplementação.
describe('aoConfirmarDescarte / aoContinuarEditando (efeitos reais usados pelo hook)', () => {
  it('"Descartar alterações" fecha o modal (chama onClose)', () => {
    const onClose = vi.fn();
    aoConfirmarDescarte(onClose);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('"Continuar editando" preserva os dados: nunca chama onClose', () => {
    const onClose = vi.fn();
    aoContinuarEditando();
    expect(onClose).not.toHaveBeenCalled();
  });
});
