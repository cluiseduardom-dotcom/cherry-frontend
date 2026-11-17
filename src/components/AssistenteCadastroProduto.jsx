import { useState } from 'react';
import { X, Check, ChevronDown, ChevronRight } from 'lucide-react';
import ProdutoFotos from './ProdutoFotos';
import PrecosPorCanal from './PrecosPorCanal';
import CategorizarProdutoModal from './CategorizarProdutoModal';
import MovimentacaoEstoqueModal from './MovimentacaoEstoqueModal';
import { ACTIONS, podeExecutarAcao } from '../config/access';
import { useToast } from '../context/ToastContext';
import {
  PASSOS_ASSISTENTE,
  passosDoAssistente,
  podeLancarEstoqueInicial,
  proximoPasso,
  temPrecoDefinido,
} from '../utils/assistenteCadastro';
import './ProductModal.css';
import './AssistenteCadastroProduto.css';

/**
 * Abre logo depois de criar um produto e leva pelos passos que faltam (fotos, categoria/SKU, preço e estoque
 * inicial) sem sair da tela. Reaproveita as telas existentes; cada passo salva na hora e pode ser pulado.
 * `onProdutoAtualizado(produto)` e `onFotosAlteradas(id, imagens)` mantêm a lista de Produtos em dia.
 */
export default function AssistenteCadastroProduto({ produto, user, onClose, onProdutoAtualizado, onFotosAlteradas }) {
  const toast = useToast();
  const role = user?.role;
  const passos = passosDoAssistente({
    podeFotos: podeExecutarAcao(role, ACTIONS.GERENCIAR_ESTOQUE),
    podeCategorizar: podeExecutarAcao(role, ACTIONS.CATEGORIZAR_PRODUTO),
    podePreco: podeExecutarAcao(role, ACTIONS.GERENCIAR_PRECOS),
    podeEstoqueInicial: podeLancarEstoqueInicial(user),
  });

  const [atual, setAtual] = useState(produto);
  const [concluidos, setConcluidos] = useState({});
  const [aberto, setAberto] = useState(passos[0] ?? null);
  const [categorizando, setCategorizando] = useState(false);
  const [lancandoEstoque, setLancandoEstoque] = useState(false);

  function concluir(id, feito = true) {
    setConcluidos(prev => (prev[id] === feito ? prev : { ...prev, [id]: feito }));
  }

  function avancarDepoisDe(id) {
    const proximo = proximoPasso(passos, { ...concluidos, [id]: true });
    setAberto(proximo);
  }

  function aoFotosAlteradas(imagens) {
    concluir('fotos', imagens.length > 0);
    onFotosAlteradas?.(atual.id, imagens);
  }

  function aoCategorizado(salvo) {
    setAtual(prev => ({ ...prev, ...salvo }));
    onProdutoAtualizado?.(salvo);
    concluir('categoria');
    setCategorizando(false);
    toast.success('Categorias atualizadas com sucesso.');
    avancarDepoisDe('categoria');
  }

  function aoPrecoAlterado(canais) {
    concluir('preco', temPrecoDefinido(canais));
  }

  function aoLancarEstoque() {
    concluir('estoque');
    setLancandoEstoque(false);
    toast.success('Estoque inicial lançado.');
    avancarDepoisDe('estoque');
  }

  function alternar(id) {
    if (id === 'categoria') { setCategorizando(true); return; }
    if (id === 'estoque') { setLancandoEstoque(true); return; }
    setAberto(prev => (prev === id ? null : id));
  }

  const pendentes = passos.filter(id => !concluidos[id]).length;

  return (
    <>
      <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
        <div className="modal-panel card assistente-panel" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div>
              <h2 className="modal-title">Produto criado: {atual.nome}</h2>
              <p className="assistente-subtitulo">
                {atual.sku ? `SKU ${atual.sku} · ` : ''}
                {pendentes > 0
                  ? `Faltam ${pendentes} ${pendentes === 1 ? 'passo' : 'passos'}. Pode pular o que não precisar agora.`
                  : 'Tudo pronto.'}
              </p>
            </div>
            <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
              <X size={18} />
            </button>
          </div>

          <div className="modal-body assistente-corpo">
            {passos.length === 0 && (
              <p className="text-sm text-secondary">Seu cargo não tem mais etapas para este produto.</p>
            )}

            <ol className="assistente-passos">
              {passos.map((id, i) => {
                const feito = Boolean(concluidos[id]);
                const expandido = aberto === id;
                const info = PASSOS_ASSISTENTE[id];
                const abreModal = id === 'categoria' || id === 'estoque';
                return (
                  <li key={id} className={`assistente-passo ${feito ? 'assistente-passo--feito' : ''}`}>
                    <button
                      type="button"
                      className="assistente-passo-cabecalho"
                      onClick={() => alternar(id)}
                      disabled={id === 'estoque' && feito}
                      aria-expanded={abreModal ? undefined : expandido}
                    >
                      <span className="assistente-passo-marca" aria-hidden="true">
                        {feito ? <Check size={14} /> : i + 1}
                      </span>
                      <span className="assistente-passo-texto">
                        <span className="assistente-passo-titulo">{info.titulo}</span>
                        <span className="assistente-passo-ajuda">{feito ? 'Feito' : info.ajuda}</span>
                      </span>
                      {abreModal
                        ? <span className="assistente-passo-acao">{id === 'estoque' ? (feito ? '' : 'Abrir') : (feito ? 'Refazer' : 'Abrir')}</span>
                        : (expandido ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
                    </button>

                    {expandido && id === 'fotos' && (
                      <div className="assistente-passo-conteudo">
                        <ProdutoFotos produtoId={atual.id} onChange={aoFotosAlteradas} />
                      </div>
                    )}
                    {expandido && id === 'preco' && (
                      <div className="assistente-passo-conteudo">
                        <PrecosPorCanal produtoId={atual.id} onChange={aoPrecoAlterado} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-primary" onClick={onClose}>
              {pendentes > 0 ? 'Fechar e continuar depois' : 'Concluir'}
            </button>
          </div>
        </div>
      </div>

      <CategorizarProdutoModal
        open={categorizando}
        produto={atual}
        onClose={() => setCategorizando(false)}
        onSaved={aoCategorizado}
      />

      <MovimentacaoEstoqueModal
        open={lancandoEstoque}
        produtos={[atual]}
        user={user}
        produtoInicial={atual.id}
        tipoInicial="entrada"
        motivoInicial="estoque_inicial"
        oferecerEtiquetas={false}
        onClose={() => setLancandoEstoque(false)}
        onSaved={aoLancarEstoque}
      />
    </>
  );
}
