// Remove o fundo LISO de uma foto (estúdio, parede lisa, cor chapada) no navegador, sem biblioteca nem serviço externo.
// Funciona assim: a cor do fundo é a cor típica do TOPO da foto (e da parte alta das laterais), onde a pessoa não costuma encostar;
// tudo que for parecido com ela e estiver CONECTADO à borda vira transparente (o corpo que encosta no rodapé e nos lados continua). Fundo com paisagem, móveis ou degradê forte não é liso: nesse caso não mexe na foto (devolve o motivo).
// Lógica pura sobre os pixels (Uint8ClampedArray RGBA), testável sem navegador.

const TOLERANCIA = 30;          // distância de cor (euclidiana, 0 a 441) para ainda ser "fundo"
const UNIFORME_MINIMO = 0.85;   // fração da amostra (topo e parte alta das laterais) que precisa parecer a cor do fundo
const FUNDO_MINIMO = 0.06;      // abaixo disso quase não há fundo para tirar
const FUNDO_MAXIMO = 0.85;      // acima disso o fundo "comeu" a pessoa: desfaz

const distancia = (d, i, ref) => Math.hypot(d[i] - ref[0], d[i + 1] - ref[1], d[i + 2] - ref[2]);

function mediana(valores) {
  const ordenado = Float64Array.from(valores).sort();
  return ordenado[Math.floor(ordenado.length / 2)];
}

/**
 * Altera `dados` (RGBA) no lugar quando consegue. Devolve { acao, fundo } onde `acao` é:
 *  'removido' | 'ja_transparente' | 'fundo_complexo' | 'sem_fundo' | 'excessivo'; `fundo` é a fração removida (0 a 1).
 */
export function removerFundoLiso(dados, largura, altura) {
  const total = largura * altura;
  if (!(largura > 2) || !(altura > 2) || dados.length < total * 4) return { acao: 'sem_fundo', fundo: 0 };

  // Perímetro da foto
  const borda = [];
  for (let x = 0; x < largura; x += 1) { borda.push(x, (altura - 1) * largura + x); }
  for (let y = 1; y < altura - 1; y += 1) { borda.push(y * largura, y * largura + largura - 1); }

  // Já tem transparência de verdade na borda: não há o que fazer
  if (borda.filter((p) => dados[p * 4 + 3] < 250).length > borda.length * 0.3) return { acao: 'ja_transparente', fundo: 0 };

  // Amostra do fundo: linha de cima inteira e os 40% de cima das laterais (num busto, o corpo toca o rodapé e os lados de baixo)
  const amostra = [];
  for (let x = 0; x < largura; x += 1) amostra.push(x);
  for (let y = 1; y < Math.ceil(altura * 0.4); y += 1) amostra.push(y * largura, y * largura + largura - 1);

  const ref = [0, 1, 2].map((c) => mediana(amostra.map((p) => dados[p * 4 + c])));

  if (amostra.filter((p) => distancia(dados, p * 4, ref) <= TOLERANCIA).length / amostra.length < UNIFORME_MINIMO) {
    return { acao: 'fundo_complexo', fundo: 0 };
  }

  // Sementes do preenchimento: toda a borda que se parece com o fundo (o que for corpo não entra)
  const parecidos = borda.filter((p) => distancia(dados, p * 4, ref) <= TOLERANCIA);

  // Preenchimento a partir da borda (só pixels parecidos com o fundo e ligados a ela)
  const fundo = new Uint8Array(total);
  const fila = new Int32Array(total);
  let ini = 0;
  let fim = 0;
  for (const p of parecidos) { if (!fundo[p]) { fundo[p] = 1; fila[fim] = p; fim += 1; } }

  while (ini < fim) {
    const p = fila[ini];
    ini += 1;
    const x = p % largura;
    const vizinhos = [x > 0 ? p - 1 : -1, x < largura - 1 ? p + 1 : -1, p - largura, p + largura];

    for (const v of vizinhos) {
      if (v >= 0 && v < total && !fundo[v] && distancia(dados, v * 4, ref) <= TOLERANCIA) {
        fundo[v] = 1;
        fila[fim] = v;
        fim += 1;
      }
    }
  }

  const fracao = fim / total;

  if (fracao < FUNDO_MINIMO) return { acao: 'sem_fundo', fundo: fracao };
  if (fracao > FUNDO_MAXIMO) return { acao: 'excessivo', fundo: fracao };

  // Aplica: fundo some; o contorno (1 px) fica semitransparente conforme a distância ao fundo, sem halo de cor do fundo
  for (let p = 0; p < total; p += 1) {
    if (fundo[p]) {
      dados[p * 4 + 3] = 0;
      continue;
    }

    const x = p % largura;
    const encosta = (x > 0 && fundo[p - 1]) || (x < largura - 1 && fundo[p + 1]) || (p >= largura && fundo[p - largura]) || (p + largura < total && fundo[p + largura]);

    if (encosta) {
      const d = distancia(dados, p * 4, ref);
      dados[p * 4 + 3] = Math.round(255 * Math.min(1, Math.max(0, (d - TOLERANCIA * 0.5) / (TOLERANCIA * 1.2))));
    }
  }

  return { acao: 'removido', fundo: fracao };
}
