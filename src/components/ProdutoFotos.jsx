import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Trash2, ArrowLeft, ArrowRight, Star } from 'lucide-react';
import { listarImagens, enviarImagem, removerImagem, reordenarImagens } from '../services/produtoImagens';
import { reduzirImagem } from '../utils/reduzirImagem';
import { MAX_FOTOS, TIPOS_ACEITOS, definirPrincipal, moverFoto, podeAdicionarFoto, validarArquivoFoto } from '../utils/fotoProduto';
import './ProdutoFotos.css';

/**
 * Galeria de fotos do produto (até 5). Cada ação (enviar, apagar, reordenar) é salva na hora, independente do
 * botão Salvar do formulário. A primeira foto é a principal (a que aparece nos cards).
 * `onChange(imagens)` avisa a tela para atualizar a foto principal sem recarregar tudo.
 */
export default function ProdutoFotos({ produtoId, onChange }) {
  const [imagens, setImagens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    // O componente monta do zero a cada abertura do modal, então loading já começa true e erro vazio.
    let cancelado = false;
    listarImagens(produtoId)
      .then(lista => { if (!cancelado) setImagens(lista); })
      .catch(err => { if (!cancelado) setErro(err.message); })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, [produtoId]);

  function aplicar(lista) {
    setImagens(lista);
    onChange?.(lista);
  }

  async function executar(acao) {
    setErro('');
    setOcupado(true);
    try {
      await acao();
    } catch (err) {
      setErro(err.message);
    } finally {
      setOcupado(false);
    }
  }

  function handleEscolherArquivo(e) {
    const arquivo = e.target.files?.[0];
    e.target.value = ''; // permite escolher o mesmo arquivo de novo
    if (!arquivo) return;

    const problema = validarArquivoFoto(arquivo);
    if (problema) {
      setErro(problema);
      return;
    }

    executar(async () => {
      const reduzida = await reduzirImagem(arquivo);
      await enviarImagem(produtoId, reduzida);
      aplicar(await listarImagens(produtoId));
    });
  }

  function handleRemover(imagem) {
    executar(async () => {
      await removerImagem(produtoId, imagem.id);
      aplicar(await listarImagens(produtoId));
    });
  }

  function handleReordenar(novosIds) {
    executar(async () => {
      aplicar(await reordenarImagens(produtoId, novosIds));
    });
  }

  const ids = imagens.map(i => i.id);

  return (
    <div className="produto-fotos">
      <div className="produto-fotos-header">
        <span className="input-label">Fotos</span>
        <span className="produto-fotos-contagem">{imagens.length}/{MAX_FOTOS}</span>
      </div>

      {erro && <div className="modal-error">{erro}</div>}

      {loading ? (
        <p className="text-sm text-secondary">Carregando fotos...</p>
      ) : (
        <div className="produto-fotos-grid">
          {imagens.map((img, i) => (
            <div key={img.id} className="produto-fotos-item">
              <div className="produto-fotos-thumb">
                {img.url ? (
                  <img src={img.url} alt={`Foto ${i + 1}`} loading="lazy" />
                ) : (
                  <span className="produto-fotos-semurl">Sem link público</span>
                )}
                {img.principal && <span className="produto-fotos-principal">Principal</span>}
              </div>
              <div className="produto-fotos-acoes">
                <button type="button" className="produto-fotos-btn" disabled={ocupado || i === 0}
                  aria-label="Mover para a esquerda" title="Mover para a esquerda"
                  onClick={() => handleReordenar(moverFoto(ids, i, -1))}>
                  <ArrowLeft size={14} />
                </button>
                <button type="button" className="produto-fotos-btn" disabled={ocupado || i === imagens.length - 1}
                  aria-label="Mover para a direita" title="Mover para a direita"
                  onClick={() => handleReordenar(moverFoto(ids, i, 1))}>
                  <ArrowRight size={14} />
                </button>
                <button type="button" className="produto-fotos-btn" disabled={ocupado || img.principal}
                  aria-label="Definir como principal" title="Definir como principal"
                  onClick={() => handleReordenar(definirPrincipal(ids, img.id))}>
                  <Star size={14} />
                </button>
                <button type="button" className="produto-fotos-btn produto-fotos-btn--danger" disabled={ocupado}
                  aria-label="Apagar foto" title="Apagar foto"
                  onClick={() => handleRemover(img)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}

          {podeAdicionarFoto(imagens.length) && (
            <button type="button" className="produto-fotos-add" disabled={ocupado}
              onClick={() => inputRef.current?.click()}>
              <ImagePlus size={22} strokeWidth={1.75} />
              <span>{ocupado ? 'Enviando...' : 'Adicionar foto'}</span>
            </button>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={TIPOS_ACEITOS.join(',')}
        className="produto-fotos-input"
        onChange={handleEscolherArquivo}
      />
      <span className="modal-field-hint">
        As fotos são salvas na hora, sem precisar clicar em Salvar. A primeira é a que aparece nos cards.
      </span>
    </div>
  );
}
