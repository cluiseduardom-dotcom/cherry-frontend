import { useEffect, useRef, useState } from 'react';
import { Camera, Keyboard, X } from 'lucide-react';
import { buscarProdutoPorCodigo } from '../../services/produtosCodigos';
import { useConfirmarFechamentoModal } from '../../hooks/useConfirmarFechamentoModal';
import { cameraSuportada, criarDetector, criarFiltroRepeticao } from '../../utils/leitorCodigoBarras';
import './BarcodeScannerModal.css';

export function normalizarCodigoLido(codigo) {
  return String(codigo || '').trim();
}

// Leitor USB/Bluetooth: chega como uma sequência de keydown muito rápida
// seguida de Enter. Entrada manual normal (uma tecla por vez, mais devagar)
// não deve disparar leitura prematura.
const INTERVALO_MAX_LEITOR_MS = 50;
// A leitura pela biblioteca (iPhone) é pesada: um quadro a cada 200 ms basta e não esquenta o celular.
const INTERVALO_QUADROS_MS = 200;

// continuo: o modal fica aberto depois de cada leitura (PDV: bipar vários itens seguidos). onDetect pode devolver
// uma mensagem de sucesso (ex.: "teste01 adicionado") ou lançar um erro, que aparece no próprio modal.
export default function BarcodeScannerModal({ onDetect, onClose, continuo = false, titulo = 'Leitor de código' }) {
  const [manualCodigo, setManualCodigo] = useState('');
  const [erro, setErro] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [cameraDisponivel] = useState(() => cameraSuportada());
  const [carregandoLeitor, setCarregandoLeitor] = useState(false);
  const [sucesso, setSucesso] = useState('');
  const [cameraAtiva, setCameraAtiva] = useState(false);
  const [cameraErro, setCameraErro] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const bufferRef = useRef('');
  const ultimoEventoRef = useRef(0);
  const buscandoRef = useRef(false);
  const ultimoQuadroRef = useRef(0);
  const aceitarLeituraRef = useRef(criarFiltroRepeticao());
  // A câmera roda num laço criado na ativação: sem ref, ele chamaria o onDetect daquele momento (carrinho antigo).
  const onDetectRef = useRef(onDetect);
  onDetectRef.current = onDetect;

  // Leitor de código, não cadastro — o código digitado manualmente e ainda
  // não enviado é transitório, então isDirty fica sempre falso. Usa o hook
  // compartilhado só para padronizar o ESC (Issue #42); o componente só
  // existe montado enquanto está "aberto", por isso open: true.
  const { solicitarFechamento } = useConfirmarFechamentoModal({ open: true, isDirty: false, onClose });

  async function tentarCodigo(codigoBruto) {
    const codigo = normalizarCodigoLido(codigoBruto);
    if (!codigo || buscandoRef.current) return;

    buscandoRef.current = true;
    setBuscando(true);
    setErro('');
    setSucesso('');
    try {
      const produto = await buscarProdutoPorCodigo(codigo);
      const mensagem = await onDetectRef.current(produto);
      if (continuo) setSucesso(typeof mensagem === 'string' ? mensagem : `${produto?.nome ?? 'Produto'} encontrado.`);
    } catch (err) {
      setErro(err.status === 404 ? `Nenhum produto encontrado para o código "${codigo}".` : err.message);
    } finally {
      buscandoRef.current = false;
      setBuscando(false);
    }
  }

  function handleManualSubmit(e) {
    e.preventDefault();
    tentarCodigo(manualCodigo);
    setManualCodigo('');
  }

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
  }, []);

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

      setCarregandoLeitor(true);
      let detector;
      try {
        detector = await criarDetector();
      } finally {
        setCarregandoLeitor(false);
      }

      const loop = async (instante) => {
        if (!videoRef.current || !streamRef.current) return;
        if (!buscandoRef.current && instante - ultimoQuadroRef.current >= INTERVALO_QUADROS_MS && videoRef.current.readyState >= 2) {
          ultimoQuadroRef.current = instante;
          try {
            const codigos = await detector.detect(videoRef.current);
            const lido = codigos.length > 0 ? normalizarCodigoLido(codigos[0].rawValue) : '';
            if (lido && aceitarLeituraRef.current(lido)) {
              await tentarCodigo(lido);
            }
          } catch {
            // frame não decodificável — tenta de novo no próximo tick
          }
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch {
      setCameraErro('Não foi possível usar a câmera (permissão negada ou leitor indisponível). Use o leitor USB/Bluetooth ou a entrada manual abaixo.');
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
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
    <div className="compra-modal-backdrop" onMouseDown={e => e.target === e.currentTarget && solicitarFechamento()}>
      <div className="compra-modal scanner-modal">
        <div className="compra-modal-header">
          <h2>{titulo}</h2>
          <button type="button" className="produto-action-btn" onClick={solicitarFechamento}><X size={16} /></button>
        </div>

        {erro && <div className="compra-alert error">{erro}</div>}
        {sucesso && !erro && <div className="compra-alert success" role="status">{sucesso}</div>}
        {buscando && <p className="text-sm text-secondary">Buscando produto...</p>}

        <div className="scanner-section">
          <div className="scanner-section-title"><Camera size={16} /> Câmera</div>
          {cameraDisponivel ? (
            <>
              {!cameraAtiva && (
                <button type="button" className="btn btn-secondary" onClick={ativarCamera}>Ativar câmera</button>
              )}
              {/* O <video> fica sempre montado: a câmera é ligada nele ANTES de a tela trocar de estado
                  (com ele só montado depois, a primeira ativação ficava sem imagem). */}
              <div className="scanner-video-wrap" hidden={!cameraAtiva}>
                <video ref={videoRef} className="scanner-video" muted playsInline />
                {carregandoLeitor && <p className="text-sm text-secondary">Preparando o leitor…</p>}
                <p className="text-sm text-secondary">Aproxime a etiqueta (10 a 15 cm), com boa luz, com as barras na horizontal.</p>
                <button type="button" className="btn btn-ghost" onClick={pararCamera}>Parar câmera</button>
              </div>
              {cameraErro && <p className="text-sm compra-alert error">{cameraErro}</p>}
            </>
          ) : (
            <p className="text-sm text-secondary">Este navegador não deu acesso à câmera (abra o sistema pelo endereço https). Use o leitor USB/Bluetooth (digita como teclado) ou a entrada manual abaixo.</p>
          )}
        </div>

        <div className="scanner-section">
          <div className="scanner-section-title"><Keyboard size={16} /> Entrada manual / leitor USB-Bluetooth</div>
          <form className="scanner-manual-form" onSubmit={handleManualSubmit}>
            <input
              type="text"
              className="input-field"
              placeholder="Digite ou bipe o código do produto"
              value={manualCodigo}
              onChange={e => setManualCodigo(e.target.value)}
              autoFocus
            />
            <button type="submit" className="btn btn-primary" disabled={buscando}>Buscar</button>
          </form>
          <p className="text-sm text-secondary">Um leitor USB/Bluetooth conectado funciona como teclado — basta bipar com este modal aberto.</p>
        </div>
      </div>
    </div>
  );
}
