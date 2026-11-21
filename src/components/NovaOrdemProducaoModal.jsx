import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { listarTodosProdutos } from '../services/produtos';
import { criarOrdem, obterNecessidade } from '../services/producao';
import { produtosProduziveis, resumirNecessidade, validarNovaOrdem } from '../utils/producao';
import { formatarQuantidade } from '../utils/unidades';
import './ProductModal.css';

const FORM_VAZIO = { produto_id: '', quantidade_planejada: '1', prazo: '', observacao: '' };

// Nova ordem: escolhe o produto e a quantidade e vê, antes de criar, o que a produção consumiria.
// Faltar insumo no sistema só AVISA: dá para produzir mesmo assim (a baixa fica pendente).
export default function NovaOrdemProducaoModal({ open, onClose, onCreated, onAbrirFicha }) {
  const [produtos, setProdutos] = useState([]);
  const [form, setForm] = useState(FORM_VAZIO);
  const [previa, setPrevia] = useState({ chave: '', dados: null, erro: '', semFicha: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    let cancelado = false;
    listarTodosProdutos()
      .then(({ items }) => { if (!cancelado) setProdutos(produtosProduziveis(items)); })
      .catch(err => { if (!cancelado) setError(err.message); });
    return () => { cancelado = true; };
  }, [open]);

  const quantidade = Number(form.quantidade_planejada);
  const chavePrevia = form.produto_id && Number.isInteger(quantidade) && quantidade >= 1 ? `${form.produto_id}|${quantidade}` : '';

  // Previa do consumo (somente leitura). A resposta só vale se a chave ainda for a atual.
  useEffect(() => {
    if (!open || !chavePrevia) return undefined;
    let cancelado = false;
    const [produtoId, qtd] = chavePrevia.split('|');
    obterNecessidade({ produto_id: produtoId, quantidade: qtd })
      .then(dados => { if (!cancelado) setPrevia({ chave: chavePrevia, dados, erro: '', semFicha: false }); })
      .catch(err => {
        if (!cancelado) setPrevia({ chave: chavePrevia, dados: null, erro: err.message, semFicha: /ficha t[eé]cnica/i.test(err.message) });
      });
    return () => { cancelado = true; };
  }, [open, chavePrevia]);

  const previaAtual = previa.chave === chavePrevia && chavePrevia ? previa : null;
  const resumo = useMemo(() => resumirNecessidade(previaAtual?.dados), [previaAtual]);
  const produto = produtos.find(p => String(p.id) === String(form.produto_id));

  if (!open) return null;

  function mudar(campo, valor) {
    setForm(anterior => ({ ...anterior, [campo]: valor }));
  }

  function fechar() {
    if (saving) return;
    setForm(FORM_VAZIO);
    setError('');
    onClose();
  }

  async function salvar(evento) {
    evento.preventDefault();
    const erro = validarNovaOrdem(form);
    if (erro) { setError(erro); return; }
    setError('');
    setSaving(true);
    try {
      const ordem = await criarOrdem({
        produto_id: Number(form.produto_id),
        quantidade_planejada: Number(form.quantidade_planejada),
        prazo: form.prazo,
        observacao: form.observacao.trim(),
      });
      setForm(FORM_VAZIO);
      onCreated?.(ordem);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && fechar()}>
      <div className="modal-panel card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Nova ordem de produção</h2>
          <button type="button" className="modal-close" onClick={fechar} aria-label="Fechar" disabled={saving}><X size={18} /></button>
        </div>
        <form onSubmit={salvar} noValidate>
          <div className="modal-body">
            {error && <div className="modal-error">{error}</div>}

            <div className="input-wrapper">
              <label className="input-label" htmlFor="op-produto">Produto *</label>
              <select id="op-produto" className="input-field" value={form.produto_id} onChange={e => mudar('produto_id', e.target.value)}>
                <option value="">Escolha o produto</option>
                {produtos.map(p => <option key={p.id} value={p.id}>{p.sku ? `${p.sku} — ` : ''}{p.nome}</option>)}
              </select>
            </div>

            <div className="input-wrapper">
              <label className="input-label" htmlFor="op-qtd">Quantidade a produzir *</label>
              <input id="op-qtd" type="number" min="1" step="1" className="input-field" value={form.quantidade_planejada} onChange={e => mudar('quantidade_planejada', e.target.value)} />
            </div>

            <div className="input-wrapper">
              <label className="input-label" htmlFor="op-prazo">Prazo (opcional)</label>
              <input id="op-prazo" type="date" className="input-field" value={form.prazo} onChange={e => mudar('prazo', e.target.value)} />
            </div>

            <div className="input-wrapper">
              <label className="input-label" htmlFor="op-obs">Observação (opcional)</label>
              <input id="op-obs" type="text" maxLength={500} className="input-field" value={form.observacao} onChange={e => mudar('observacao', e.target.value)} placeholder="Ex.: encomenda de Natal" />
            </div>

            {previaAtual?.semFicha && produto && (
              <div className="producao-aviso producao-aviso--aviso">
                <AlertTriangle size={16} aria-hidden="true" />
                <div>
                  <strong>Este produto ainda não tem ficha técnica.</strong>
                  <p className="text-sm">A ficha diz quanto de cada insumo uma unidade consome.</p>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => onAbrirFicha?.(produto)}>Cadastrar ficha técnica</button>
                </div>
              </div>
            )}

            {previaAtual?.erro && !previaAtual.semFicha && <div className="modal-error">{previaAtual.erro}</div>}

            {previaAtual?.dados && (
              <div className={`producao-aviso producao-aviso--${resumo.tom}`}>
                {resumo.tom === 'ok' ? <CheckCircle2 size={16} aria-hidden="true" /> : <AlertTriangle size={16} aria-hidden="true" />}
                <div>
                  <strong>{resumo.titulo}</strong>
                  {resumo.detalhe && <p className="text-sm">{resumo.detalhe}</p>}
                  <ul className="producao-insumos">
                    {previaAtual.dados.insumos.map(i => (
                      <li key={i.insumo_produto_id} className={i.suficiente ? '' : 'producao-insumos--falta'}>
                        {i.nome}: precisa de {formatarQuantidade(i.necessario, i.unidade)}, há {formatarQuantidade(i.disponivel, i.unidade)}{i.faltante > 0 ? ` (faltam ${formatarQuantidade(i.faltante, i.unidade)})` : ''}
                      </li>
                    ))}
                  </ul>
                  {previaAtual.dados.custo_estimado && (
                    <p className="text-sm">
                      Custo estimado dos insumos: <strong>{Number(previaAtual.dados.custo_estimado.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={fechar} disabled={saving}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Criando…' : 'Criar ordem'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
