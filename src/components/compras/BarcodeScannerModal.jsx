import { useEffect, useRef, useState } from 'react';
import { Camera, Keyboard, X } from 'lucide-react';
import './BarcodeScannerModal.css';

// Casa o código lido (câmera, leitor USB/Bluetooth ou digitação manual)
// contra o SKU dos produtos informados. Não existe campo de código de
// barras no backend hoje (só `sku`, ver docs/ai/COMPRAS-UX-GPT-VALIDATION.md),
// então o "scanner" é uma camada de entrada que localiza produto por SKU —
// não cria nenhuma regra de estoque nova.
export function encontrarProdutoPorCodigo(produtos, codigo) {
  const alvo = String(codigo || '').trim().toLowerCase();
  if (!alvo) return null;
  const lista = Array.isArray(produtos) ? produtos : [];
  return lista.find(p => String(p.sku || '').trim().toLowerCase() === alvo) || null;
}

// Buffer de eventos de teclado: leitores USB/Bluetooth digitam o código
// muito rápido e terminam com Enter. Entrada manual normal (uma tecla por
// vez, mais devagar) não deve disparar leitura prematura.
const INTERVALO_MAX_LEITOR_MS = 50;

export default function BarcodeScannerModal({ produtos, onDetect, onClose }) {
  const [manualCodigo, setManualCodigo] = useState('');
  const [erro, setErro] = useState('');
  const [cameraDisponivel] = useState(() => typeof window !== 'undefined' && 'BarcodeDetector' in window);
  const [cameraAtiva, setCameraAtiva] = useState(false);
  const [cameraErro, setCameraErro] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const bufferRef = useRef('');
  const ultimoEventoRef = useRef(0);

  function tentarCodigo(codigo) {
    const produto = encontrarProdutoPorCodigo(produtos, codigo);
    if (!produto) {
      setErro(`Nenhum produto encontrado para o código "${codigo}".`);
      return;
    }
    setErro('');
    onDetect(produto);
  }

  function handleManualSubmit(e) {
    e.preventDefault();
    tentarCodigo(manualCodigo);
    setManualCodigo('');
  }

  // Leitor USB/Bluetooth: chega como uma sequência de keydown muito rápida
  // seguida de Enter. Ignoramos quando o campo manual está focado, para não
  // duplicar a leitura.
  useEffect(() => {
    function handleKeydown(e) {
      if (document.activeElement?.tagName === 'INPUT') return;

      const agora = Date.now();
      const intervalo = agora - ultimoEventoRef.current;
      ultimoEventoRef.current = agora;

      if (intervalo > INTERVALO_MAX_LEITOR_MS) {
        bufferRef.current = '';
      }

      if (e.key === 'Enter') {
        if (bufferRef.current) tentarCodigo(bufferRef.current);
        bufferRef.current = '';
        return;
      }

      if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    }

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produtos]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  async function ativarCamera() {
    setCameraErro('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraAtiva(true);

      const detector = new window.BarcodeDetector();
      const loop = async () => {
        if (!videoRef.current) return;
        try {
          const codigos = await detector.detect(videoRef.current);
          if (codigos.length > 0) {
            tentarCodigo(codigos[0].rawValue);
          }
        } catch {
          // frame não decodificável — tenta de novo no próximo tick
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch {
      setCameraErro('Não foi possível acessar a câmera. Use o leitor USB/Bluetooth ou a entrada manual abaixo.');
      setCameraAtiva(false);
    }
  }

  function pararCamera() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setCameraAtiva(false);
  }

  return (
    <div className="compra-modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="compra-modal scanner-modal">
        <div className="compra-modal-header">
          <h2>Leitor de código</h2>
          <button type="button" className="produto-action-btn" onClick={onClose}><X size={16} /></button>
        </div>

        {erro && <div className="compra-alert error">{erro}</div>}

        <div className="scanner-section">
          <div className="scanner-section-title"><Camera size={16} /> Câmera</div>
          {cameraDisponivel ? (
            <>
              {!cameraAtiva ? (
                <button type="button" className="btn btn-secondary" onClick={ativarCamera}>Ativar câmera</button>
              ) : (
                <div className="scanner-video-wrap">
                  <video ref={videoRef} className="scanner-video" muted playsInline />
                  <button type="button" className="btn btn-ghost" onClick={pararCamera}>Parar câmera</button>
                </div>
              )}
              {cameraErro && <p className="text-sm compra-alert error">{cameraErro}</p>}
            </>
          ) : (
            <p className="text-sm text-secondary">Leitura por câmera não é suportada neste navegador. Use o leitor USB/Bluetooth (digita como teclado) ou a entrada manual abaixo.</p>
          )}
        </div>

        <div className="scanner-section">
          <div className="scanner-section-title"><Keyboard size={16} /> Entrada manual / leitor USB-Bluetooth</div>
          <form className="scanner-manual-form" onSubmit={handleManualSubmit}>
            <input
              type="text"
              className="input-field"
              placeholder="Digite ou bipe o SKU do produto"
              value={manualCodigo}
              onChange={e => setManualCodigo(e.target.value)}
              autoFocus
            />
            <button type="submit" className="btn btn-primary">Buscar</button>
          </form>
          <p className="text-sm text-secondary">Um leitor USB/Bluetooth conectado funciona como teclado — basta bipar com este modal aberto.</p>
        </div>
      </div>
    </div>
  );
}
