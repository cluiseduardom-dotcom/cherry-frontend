import { describe, it, expect, vi } from 'vitest';
import { aoConfirmar } from './useConfirmAction';

describe('aoConfirmar', () => {
  it('executa a ação pendente quando o usuário confirma', () => {
    const execute = vi.fn();
    aoConfirmar({ execute });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('não quebra quando não há ação pendente (diálogo já fechado por cancelar/ESC/clique fora)', () => {
    expect(() => aoConfirmar(null)).not.toThrow();
    expect(() => aoConfirmar(undefined)).not.toThrow();
  });
});
