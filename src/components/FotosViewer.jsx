import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { listarImagens } from '../services/produtoImagens';
import { moverIndice, fotosVisiveis, direcaoDoSwipe } from '../utils/carrosselFotos';
import './FotosViewer.css';

/**
 * FotosViewer — visualizador de fotos de um produto (setas, deslizar, pontinhos, teclado).
 * Busca a galeria ao abrir; enquanto carrega (ou se falhar) mostra a foto principal do card
 * (`fotoInicial`), que já está em mãos.
 */
export default function FotosViewer({ produtoId, nome, fotoInicial, onClose }) {
  const [fotos, setFotos] = useState([]);
  const [indice, setIndice] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const inicioX = useRef(null);

  useEffect(() => {
    let cancelado = false;
    listarImagens(produtoId)
      .then(lista => { if (!cancelado) setFotos(fotosVisiveis(lista)); })
      .catch(() => { /* mantém a foto do card */ })
      .finally(() => { if (!cancelado) setCarregando(false); });
    return () => { cancelado = true; };
  }, [produtoId]);

  const lista = fotos.length > 0 ? fotos : (fotoInicial ? [{ id: 'inicial', url: fotoInicial }] : []);
  const total = lista.length;
  const atual = lista[Math.min(indice, Math.max(total - 1, 0))];

  function ir(delta) {
    setIndice(i => moverIndice(i, delta, total));
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') setIndice(i => moverIndice(i, 1, total));
      else if (e.key === 'ArrowLeft') setIndice(i => moverIndice(i, -1, total));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [total, onClose]);

  function onTouchStart(e) { inicioX.current = e.touches[0].clientX; }
  function onTouchEnd(e) {
    if (inicioX.current == null) return;
    const dir = direcaoDoSwipe(e.changedTouches[0].clientX - inicioX.current);
    inicioX.current = null;
    if (dir !== 0) ir(dir);
  }

  return createPortal(
    <div
      className="fotos-viewer-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Fotos de ${nome}`}
      onClick={onClose}
    >
      <div className="fotos-viewer" onClick={e => e.stopPropagation()}>
        <div className="fotos-viewer-header">
          <span className="fotos-viewer-titulo" title={nome}>{nome}</span>
          <button type="button" className="fotos-viewer-fechar" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <div className="fotos-viewer-palco" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {atual && <img key={atual.id} src={atual.url} alt={`${nome} — foto ${indice + 1}`} className="fotos-viewer-img" />}
          {!atual && !carregando && <p className="fotos-viewer-vazio">Este produto não tem fotos.</p>}
          {total > 1 && (
            <>
              <button type="button" className="fotos-viewer-seta fotos-viewer-seta--esq" onClick={() => ir(-1)} aria-label="Foto anterior">
                <ChevronLeft size={22} />
              </button>
              <button type="button" className="fotos-viewer-seta fotos-viewer-seta--dir" onClick={() => ir(1)} aria-label="Próxima foto">
                <ChevronRight size={22} />
              </button>
            </>
          )}
        </div>

        {total > 1 && (
          <div className="fotos-viewer-rodape">
            <span className="fotos-viewer-contagem">{Math.min(indice, total - 1) + 1}/{total}</span>
            <div className="fotos-viewer-pontos">
              {lista.map((f, i) => (
                <button
                  key={f.id}
                  type="button"
                  className={`fotos-viewer-ponto ${i === indice ? 'fotos-viewer-ponto--ativo' : ''}`}
                  onClick={() => setIndice(i)}
                  aria-label={`Ir para a foto ${i + 1}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
