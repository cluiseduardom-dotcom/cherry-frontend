import { useEffect, useMemo, useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { listarInsumos } from '../services/consumos';
import { obterFichaTecnica, salvarFichaTecnica } from '../services/producao';
import { atualizarProduto } from '../services/produtos';
import { useAuth } from '../context/AuthContext';
import { ACTIONS, podeExecutarAcao } from '../config/access';
import { montarItensDaFicha, opcoesDeEntrada, paraCampoDeEntrada, validarRendimento } from '../utils/unidades';
import { calcularReceita, resumoMassa } from '../utils/receita';
import './ProductModal.css';

const moeda = (n, casas = 2) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: casas });

// Ficha técnica (receita): o que UMA receita consome de insumo e quantas unidades ela rende.
// O custo vem do cadastro dos insumos (custo por grama/ml/unidade); o custo do produto nasce daqui.
// Salvar cria uma nova versão; ordens já criadas continuam presas à versão que usaram.
export default function FichaTecnicaModal({ open, produto, onClose, onSaved }) {
  const { user } = useAuth();
  const podeAtualizarCusto = podeExecutarAcao(user?.role, ACTIONS.GERENCIAR_PRECOS);
  const [atualizarCusto, setAtualizarCusto] = useState(true);
  const [insumos, setInsumos] = useState([]);
  const [itens, setItens] = useState([]);
  const [rendimento, setRendimento] = useState('1');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !produto) return undefined;
    let cancelado = false;

    async function carregar() {
      setLoading(true);
      setError('');
      try {
        const lista = await listarInsumos();
        // 404 = produto ainda sem ficha: começa em branco (não é erro).
        const ficha = await obterFichaTecnica(produto.id).catch(err => {
          if (err?.status === 404) return null;
          throw err;
        });
        if (cancelado) return;
        setInsumos(Array.isArray(lista) ? lista : []);
        const porId = new Map((Array.isArray(lista) ? lista : []).map(i => [String(i.id), i]));
        setRendimento(String(ficha?.rendimento ?? 1));
        setItens((ficha?.itens ?? []).map(i => {
          const campo = paraCampoDeEntrada(i.quantidade_necessaria, porId.get(String(i.insumo_produto_id))?.unidade);
          return { insumo_produto_id: String(i.insumo_produto_id), quantidade: campo.texto, escolha: campo.escolha };
        }));
      } catch (err) {
        if (!cancelado) setError(err.message);
      } finally {
        if (!cancelado) setLoading(false);
      }
    }

    carregar();
    return () => { cancelado = true; };
  }, [open, produto]);

  const receita = useMemo(() => calcularReceita(itens, insumos, rendimento), [itens, insumos, rendimento]);
  const massa = resumoMassa(receita);

  if (!open || !produto) return null;

  function atualizar(indice, campo, valor) {
    setItens(anterior => anterior.map((item, i) => (i === indice ? { ...item, [campo]: valor } : item)));
  }

  async function salvar(evento) {
    evento.preventDefault();
    const erroRendimento = validarRendimento(rendimento);
    if (erroRendimento) { setError(erroRendimento); return; }
    const { itens: itensContrato, erro } = montarItensDaFicha(itens, insumos);
    if (erro) { setError(erro); return; }
    setError('');
    setSaving(true);
    try {
      await salvarFichaTecnica(produto.id, itensContrato, Number(rendimento));
      // O custo do produto passa a ser o que a receita custa por unidade (insumos × rendimento).
      const custo = Math.round(receita.custoPorUnidade * 1e4) / 1e4;
      if (podeAtualizarCusto && atualizarCusto && receita.completa && custo > 0) {
        await atualizarProduto(produto.id, { custo });
      }
      onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && !saving && onClose()}>
      <div className="modal-panel ficha-modal card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Ficha técnica: {produto.nome}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar" disabled={saving}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={salvar} noValidate>
          <div className="modal-body">
            {error && <div className="modal-error">{error}</div>}
            <p className="text-sm text-secondary">
              Monte a receita com o que <strong>uma receita inteira</strong> leva de cada insumo. O custo de cada insumo vem do cadastro dele,
              e a soma forma o custo do produto. Ao salvar, cria-se uma nova versão; ordens de produção já criadas não mudam.
            </p>
            <div className="input-wrapper">
              <label className="input-label" htmlFor="ft-rendimento">Esta receita rende quantas unidades (fatias, porções, doces)? *</label>
              <input id="ft-rendimento" type="number" min="1" step="1" className="input-field ficha-qtd" value={rendimento} onChange={e => setRendimento(e.target.value)} />
              <span className="modal-field-hint">Ex.: um bolo que rende 8 fatias: 8. Uma receita de brigadeiro que rende 40 doces: 40. Se a receita é de uma unidade só, deixe 1.</span>
            </div>
            {loading ? <p>Carregando…</p> : (
              <>
                {itens.length === 0 && <p className="text-sm">Nenhum insumo na ficha.</p>}
                {itens.map((item, indice) => {
                  const insumo = insumos.find(i => String(i.id) === String(item.insumo_produto_id));
                  const opcoes = opcoesDeEntrada(insumo?.unidade);
                  return (
                    <div key={indice} className="ficha-linha">
                      <select
                        className="input-field"
                        aria-label={`Insumo ${indice + 1}`}
                        value={item.insumo_produto_id}
                        onChange={e => atualizar(indice, 'insumo_produto_id', e.target.value)}
                      >
                        <option value="">Escolha o insumo</option>
                        {insumos.map(i => (
                          <option key={i.id} value={i.id}>{i.sku ? `${i.sku} — ` : ''}{i.nome}</option>
                        ))}
                      </select>
                      <input
                        type="text" inputMode="decimal" className="input-field ficha-qtd"
                        aria-label={`Quantidade ${indice + 1}`}
                        value={item.quantidade}
                        onChange={e => atualizar(indice, 'quantidade', e.target.value)}
                      />
                      {opcoes ? (
                        <select className="input-field ficha-unidade" aria-label={`Unidade ${indice + 1}`} value={item.escolha ?? 'base'} onChange={e => atualizar(indice, 'escolha', e.target.value)}>
                          {opcoes.map(o => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
                        </select>
                      ) : <span className="ficha-unidade text-sm text-secondary">{insumo?.unidade && insumo.unidade !== 'UN' ? insumo.unidade : 'un'}</span>}
                      <span className="ficha-custo text-sm" title="Quantidade × custo do insumo no cadastro">
                        {Number.isFinite(receita.detalhes[indice]?.subtotal) ? moeda(receita.detalhes[indice].subtotal) : '—'}
                      </span>
                      <button
                        type="button" className="produto-action-btn produto-action-btn--danger"
                        aria-label="Remover insumo" title="Remover insumo"
                        onClick={() => setItens(anterior => anterior.filter((_, i) => i !== indice))}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
                <button
                  type="button" className="btn btn-secondary"
                  onClick={() => setItens(anterior => [...anterior, { insumo_produto_id: '', quantidade: '1', escolha: 'base' }])}
                >
                  <Plus size={14} /> Adicionar insumo
                </button>
                {itens.length > 0 && (
                  <div className="ficha-resumo">
                    <p className="text-sm">
                      Custo da receita: <strong>{receita.completa || receita.custoReceita > 0 ? moeda(receita.custoReceita) : '—'}</strong>
                      {Number.isFinite(receita.custoPorUnidade) && receita.custoReceita > 0 && (
                        <> · Custo por unidade: <strong>{moeda(receita.custoPorUnidade, 4)}</strong></>
                      )}
                    </p>
                    {massa.total && (
                      <p className="text-sm">
                        Peso da receita: <strong>{massa.total}</strong>
                        {massa.porUnidade && <> · cerca de <strong>{massa.porUnidade}</strong> por unidade</>}
                        <span className="text-secondary"> (soma dos insumos em g/kg; ovo conta 60 g cada)</span>
                      </p>
                    )}
                    {!receita.completa && receita.detalhes.some(d => !Number.isFinite(d.custoUnitario)) && (
                      <p className="text-sm text-secondary">Algum insumo está sem custo no cadastro: a soma fica incompleta até cadastrar o custo dele.</p>
                    )}
                    {podeAtualizarCusto && receita.completa && receita.custoPorUnidade > 0 && (
                      <label className="ficha-usar-custo text-sm">
                        <input type="checkbox" checked={atualizarCusto} onChange={e => setAtualizarCusto(e.target.checked)} />
                        {' '}Ao salvar, usar {moeda(receita.custoPorUnidade, 4)} como custo do produto
                      </label>
                    )}
                  </div>
                )}
                {insumos.length === 0 && (
                  <p className="text-sm text-secondary">Ainda não há insumos cadastrados. Cadastre-os em Estoque &gt; Insumos.</p>
                )}
              </>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving || loading}>
              {saving ? 'Salvando…' : 'Salvar ficha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
