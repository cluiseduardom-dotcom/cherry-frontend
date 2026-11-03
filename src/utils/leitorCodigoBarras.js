// Leitura de código de barras pela câmera em qualquer navegador.
// Chrome/Android tem o BarcodeDetector nativo; o iPhone (Safari e qualquer navegador no iOS, que usam o mesmo
// motor) e o Chrome no Windows não têm. Nesses, usa a biblioteca `barcode-detector` (ZXing em WebAssembly),
// carregada só quando a câmera abre. O arquivo .wasm é servido pelo nosso próprio site (sem CDN de terceiros).

// Code 128 é o das nossas etiquetas; os demais cobrem códigos de fornecedor (EAN etc.).
export const FORMATOS_LEITURA = ['code_128', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_39'];

export function cameraSuportada(nav = typeof navigator === 'undefined' ? undefined : navigator) {
  return Boolean(nav?.mediaDevices && typeof nav.mediaDevices.getUserMedia === 'function');
}

async function detectorNativo(win) {
  if (!win || !('BarcodeDetector' in win)) return null;

  try {
    const suportados = await win.BarcodeDetector.getSupportedFormats();
    if (!suportados.includes('code_128')) return null;

    return new win.BarcodeDetector({ formats: FORMATOS_LEITURA.filter((f) => suportados.includes(f)) });
  } catch {
    return null;
  }
}

let detectorZxing = null;

async function detectorBiblioteca() {
  if (detectorZxing) return detectorZxing;

  const [{ BarcodeDetector, prepareZXingModule }, { default: wasmUrl }] = await Promise.all([
    import('barcode-detector/ponyfill'),
    import('zxing-wasm/reader/zxing_reader.wasm?url'),
  ]);

  prepareZXingModule({
    overrides: { locateFile: (caminho, prefixo) => (caminho.endsWith('.wasm') ? wasmUrl : prefixo + caminho) },
  });

  detectorZxing = new BarcodeDetector({ formats: FORMATOS_LEITURA });
  return detectorZxing;
}

// Devolve um objeto com detect(video) → [{ rawValue }]. Prefere o nativo; senão, a biblioteca.
export async function criarDetector(win = typeof window === 'undefined' ? undefined : window) {
  return (await detectorNativo(win)) ?? detectorBiblioteca();
}

// Evita ler o mesmo código várias vezes enquanto ele continua na frente da câmera.
export function criarFiltroRepeticao(intervaloMs = 2500, agora = () => Date.now()) {
  let ultimo = null;
  let quando = 0;

  return (codigo) => {
    const t = agora();
    if (codigo === ultimo && t - quando < intervaloMs) return false;
    ultimo = codigo;
    quando = t;
    return true;
  };
}
