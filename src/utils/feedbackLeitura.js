// Retorno ao operador depois de cada leitura de código: bipe (Web Audio, sem arquivo de som) e vibração.
// iPhone: o áudio só toca depois de um toque do usuário (por isso `destravar` no botão "Ativar câmera"), e a
// chave de silencioso do aparelho cala o bipe. Vibração pela web só existe no Android; no iPhone é ignorada.

export function criarFeedbackLeitura(win = typeof window === 'undefined' ? undefined : window) {
  let ctx = null;

  function contexto() {
    if (ctx) return ctx;
    const Ctx = win?.AudioContext ?? win?.webkitAudioContext;
    if (!Ctx) return null;
    try {
      ctx = new Ctx();
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function tocar(notas) {
    const c = contexto();
    if (!c) return;
    try {
      if (c.state === 'suspended') c.resume();
      let t = c.currentTime;
      for (const [frequencia, duracao] of notas) {
        const osc = c.createOscillator();
        const ganho = c.createGain();
        osc.type = 'square';
        osc.frequency.value = frequencia;
        ganho.gain.setValueAtTime(0.0001, t);
        ganho.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
        ganho.gain.exponentialRampToValueAtTime(0.0001, t + duracao);
        osc.connect(ganho).connect(c.destination);
        osc.start(t);
        osc.stop(t + duracao + 0.02);
        t += duracao + 0.04;
      }
    } catch {
      // Sem som não impede a venda.
    }
  }

  function vibrar(padrao) {
    try {
      win?.navigator?.vibrate?.(padrao);
    } catch {
      // idem
    }
  }

  return {
    // Chamar dentro de um toque do usuário (iOS só libera áudio assim).
    destravar() {
      const c = contexto();
      if (c?.state === 'suspended') c.resume().catch(() => {});
    },
    ok() {
      tocar([[1760, 0.12]]); // bipe curto e agudo, como o de caixa
      vibrar(80);
    },
    erro() {
      tocar([[330, 0.18], [220, 0.22]]); // dois tons graves
      vibrar([60, 60, 60]);
    },
  };
}
