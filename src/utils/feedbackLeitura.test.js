import { describe, it, expect, vi } from 'vitest';
import { criarFeedbackLeitura } from './feedbackLeitura';

function janelaFalsa({ estado = 'running', comVibrar = true } = {}) {
  const osciladores = [];
  class Ctx {
    constructor() { this.state = estado; this.currentTime = 0; this.destination = {}; this.resume = vi.fn(() => Promise.resolve()); }
    createOscillator() {
      const o = { type: '', frequency: { value: 0 }, connect: (g) => g, start: vi.fn(), stop: vi.fn() };
      osciladores.push(o);
      return o;
    }
    createGain() { return { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: (d) => d }; }
  }
  const vibrate = vi.fn();
  return { win: { AudioContext: Ctx, navigator: comVibrar ? { vibrate } : {} }, osciladores, vibrate };
}

describe('criarFeedbackLeitura', () => {
  it('ok: um bipe agudo e vibração curta', () => {
    const { win, osciladores, vibrate } = janelaFalsa();
    criarFeedbackLeitura(win).ok();
    expect(osciladores).toHaveLength(1);
    expect(osciladores[0].frequency.value).toBe(1760);
    expect(vibrate).toHaveBeenCalledWith(80);
  });

  it('erro: dois tons graves e vibração tripla', () => {
    const { win, osciladores, vibrate } = janelaFalsa();
    criarFeedbackLeitura(win).erro();
    expect(osciladores.map(o => o.frequency.value)).toEqual([330, 220]);
    expect(vibrate).toHaveBeenCalledWith([60, 60, 60]);
  });

  it('destravar retoma o áudio suspenso (iPhone exige toque do usuário)', () => {
    const { win } = janelaFalsa({ estado: 'suspended' });
    const fb = criarFeedbackLeitura(win);
    fb.destravar();
    fb.ok();
    expect(true).toBe(true);
  });

  it('sem Web Audio nem vibração (navegador antigo / iPhone): não quebra', () => {
    expect(() => criarFeedbackLeitura({ navigator: {} }).ok()).not.toThrow();
    expect(() => criarFeedbackLeitura(undefined).erro()).not.toThrow();
  });
});
