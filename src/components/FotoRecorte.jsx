import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { calcularRecorte, focoDoRecorte, moverFoco, posicaoNaJanela, limitarZoom, ZOOM_MINIMO, ZOOM_MAXIMO } from '../utils/fotoPerfil';
import { recortarFoto } from '../utils/recortarFoto';
import './FotoRecorte.css';

const LADO_JANELA = 260; // px da janela de recorte na tela
const PASSO_TECLADO = 12; // px por toque de seta

/**
 * Recorte quadrado da foto de perfil: o usuário arrasta (ou usa as setas) e ajusta o zoom; o que aparece na
 * janela redonda é exatamente o que será enviado (512 x 512). `onConfirmar(File)` recebe a foto já recortada.
 */
export default function FotoRecorte({ arquivo, onConfirmar, onCancelar, ocupado = false }) {
  const [url, setUrl] = useState(null);
  const [dim, setDim] = useState(null); // { largura, altura } da imagem (já com a orientação EXIF)
  const [zoom, setZoom] = useState(ZOOM_MINIMO);
  const [foco, setFoco] = useState({ focoX: 0.5, focoY: 0.5 });
  const [erro, setErro] = useState('');
  const [gerando, setGerando] = useState(false);
  const arrasto = useRef(null);

  useEffect(() => {
    let cancelado = false;
    const objeto = URL.createObjectURL(arquivo);
    setUrl(objeto);
    setDim(null);
    setErro('');
    setZoom(ZOOM_MINIMO);
    setFoco({ focoX: 0.5, focoY: 0.5 });

    createImageBitmap(arquivo)
      .then(bitmap => {
        if (!cancelado) setDim({ largura: bitmap.width, altura: bitmap.height });
        bitmap.close?.();
      })
      .catch(() => { if (!cancelado) setErro('Não foi possível abrir esta imagem. Tente outra.'); });

    return () => {
      cancelado = true;
      URL.revokeObjectURL(objeto);
    };
  }, [arquivo]);

  const recorte = dim ? calcularRecorte({ ...dim, zoom, ...foco }) : null;
  const posicao = dim && recorte ? posicaoNaJanela(dim, recorte, LADO_JANELA) : null;

  function aplicarZoom(novo) {
    const z = limitarZoom(novo);
    setZoom(z);
    if (dim) {
      // Mantém o centro e só reprende o recorte aos limites com o zoom novo.
      const preso = calcularRecorte({ ...dim, zoom: z, ...foco });
      setFoco(focoDoRecorte(dim, preso));
    }
  }

  function deslocar(dx, dy) {
    if (!dim) return;
    setFoco(moverFoco({ ...dim, zoom, ...foco }, dx, dy, LADO_JANELA));
  }

  function aoPressionar(e) {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    arrasto.current = { x: e.clientX, y: e.clientY };
  }

  function aoMover(e) {
    if (!arrasto.current) return;
    deslocar(e.clientX - arrasto.current.x, e.clientY - arrasto.current.y);
    arrasto.current = { x: e.clientX, y: e.clientY };
  }

  function aoSoltar() {
    arrasto.current = null;
  }

  function aoTeclar(e) {
    const mapa = { ArrowLeft: [PASSO_TECLADO, 0], ArrowRight: [-PASSO_TECLADO, 0], ArrowUp: [0, PASSO_TECLADO], ArrowDown: [0, -PASSO_TECLADO] };
    const passo = mapa[e.key];
    if (!passo) return;
    e.preventDefault();
    deslocar(passo[0], passo[1]);
  }

  async function confirmar() {
    if (!recorte || gerando || ocupado) return;
    setErro('');
    setGerando(true);
    try {
      onConfirmar(await recortarFoto(arquivo, recorte));
    } catch (err) {
      setErro(err.message);
    } finally {
      setGerando(false);
    }
  }

  const trabalhando = gerando || ocupado;

  return (
    <div className="foto-recorte" role="group" aria-label="Recortar foto de perfil">
      {erro && <div className="modal-error" role="alert">{erro}</div>}

      <div
        className="foto-recorte-janela"
        style={{ width: LADO_JANELA, height: LADO_JANELA }}
        tabIndex={0}
        role="img"
        aria-label="Área de recorte: arraste a imagem ou use as setas do teclado"
        onPointerDown={aoPressionar}
        onPointerMove={aoMover}
        onPointerUp={aoSoltar}
        onPointerCancel={aoSoltar}
        onKeyDown={aoTeclar}
      >
        {url && posicao && (
          <img
            className="foto-recorte-img"
            src={url}
            alt=""
            draggable={false}
            style={{ left: posicao.left, top: posicao.top, width: posicao.width, height: posicao.height }}
          />
        )}
        {!posicao && !erro && <Loader2 size={24} className="animate-spin foto-recorte-carregando" />}
      </div>

      <label className="foto-recorte-zoom">
        <span className="input-label">Zoom</span>
        <input
          type="range"
          min={ZOOM_MINIMO}
          max={ZOOM_MAXIMO}
          step="0.05"
          value={zoom}
          disabled={!dim || trabalhando}
          onChange={e => aplicarZoom(Number(e.target.value))}
        />
      </label>

      <span className="campo-dica">Arraste a foto para enquadrar o rosto. A imagem é enviada em formato quadrado.</span>

      <div className="foto-recorte-acoes">
        <button type="button" className="btn btn-ghost" onClick={onCancelar} disabled={trabalhando}>Cancelar</button>
        <button type="button" className="btn btn-primary" onClick={confirmar} disabled={!recorte || trabalhando}>
          {trabalhando ? (<><Loader2 size={16} className="animate-spin" /> Enviando...</>) : 'Usar esta foto'}
        </button>
      </div>
    </div>
  );
}
