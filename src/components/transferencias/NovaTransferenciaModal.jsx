import { useEffect, useMemo, useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { criarTransferencia } from '../../services/transferenciasEstoque';
import { saldosDoLocal } from '../../services/locaisEstoque';
import { rotuloDoLocal } from '../../utils/locaisEstoque';
import {
  FORM_TRANSFERENCIA_VAZIO, rotasDisponiveis, validarNovaTransferencia,
  adicionarItem, removerItem, atualizarQuantidade,
} from '../../utils/transferencias';
import { useConfirmarFechamentoModal } from '../../hooks/useConfirmarFechamentoModal';
import { formularioAlterado } from '../../utils/formularioAlterado';
import ConfirmarDescarteDialog from '../ConfirmarDescarteDialog';
import '../ProductModal.css';
import '../usuarios/CamposFormulario.css';
import './Transferencias.css';

// Equipe: qualquer rota entre locais. Vendedor: só devolver da própria maleta ao Central
// (origem e destino já vêm preenchidos). O backend valida tudo de novo.
export default function NovaTransferenciaModal({ open, locais, user, onClose, onSaved }) {
  const { origens, destinos } = useMemo(() => rotasDisponiveis(locais, user), [locais, user]);
  const fixa = origens.length === 1 && destinos.length === 1;

  const inicial = useMemo(() => ({
    ...FORM_TRANSFERENCIA_VAZIO,
    origem: fixa ? String(origens[0].id) : '',
    destino: fixa ? String(destinos[0].id) : '',
  }), [fixa, origens, destinos]);

  const [form, setForm] = useState(inicial);
  const [saldos, setSaldos] = useState([]);
  const [carregandoSaldos, setCarregandoSaldos] = useState(false);
  const [produtoEscolhido, setProdutoEscolhido] = useState('');
  const [erro, setErro] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(inicial);
    setSaldos([]);
    setProdutoEscolhido('');
    setErro('');
    setSaving(false);
  }, [open, inicial]);

  // Produtos disponíveis = os que têm saldo na origem escolhida.
  useEffect(() => {
    if (!open || !form.origem) return undefined;

    let cancelado = false;
    setCarregandoSaldos(true);
    saldosDoLocal(form.origem)
      .then(dados => { if (!cancelado) setSaldos(dados.items); })
      .catch(err => { if (!cancelado) { setSaldos([]); setErro(err?.message || 'Não foi possível carregar os produtos da origem.'); } })
      .finally(() => { if (!cancelado) setCarregandoSaldos(false); });

    return () => { cancelado = true; };
  }, [open, form.origem]);

  const isDirty = formularioAlterado(form, inicial);
  const { confirmando, solicitarFechamento, confirmarDescarte, continuarEditando } =
    useConfirmarFechamentoModal({ open, isDirty, onClose });

  if (!open) return null;

  const saldoPorProduto = Object.fromEntries(saldos.map(s => [s.produto_id, s.saldo]));
  const disponiveis = saldos.filter(s => !form.itens.some(i => i.produto_id === s.produto_id));

  function tentarFechar() {
    if (saving) return;
    solicitarFechamento();
  }

  function trocarOrigem(valor) {
    // Itens dependem do saldo da origem: ao trocá-la, a lista recomeça.
    setForm(prev => ({ ...prev, origem: valor, itens: [] }));
    setErro('');
  }

  function adicionar() {
    const produto = saldos.find(s => String(s.produto_id) === produtoEscolhido);
    if (!produto) return;
    setForm(prev => ({ ...prev, itens: adicionarItem(prev.itens, produto) }));
    setProdutoEscolhido('');
    setErro('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;

    const validacao = validarNovaTransferencia(form, saldoPorProduto);
    if (!validacao.valido) {
      setErro(validacao.erro);
      return;
    }

    setSaving(true);
    setErro('');
    try {
      const criada = await criarTransferencia(validacao.dados);
      onSaved(criada);
    } catch (err) {
      setErro(err?.message || 'Falha ao criar a transferência.');
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && tentarFechar()}>
      <div className="modal-panel card transf-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="nova-transf-titulo">
        <div className="modal-header">
          <h2 className="modal-title" id="nova-transf-titulo">{fixa ? 'Devolver ao Central' : 'Nova transferência'}</h2>
          <button type="button" className="modal-close" onClick={tentarFechar} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {erro && <div className="modal-error" role="alert">{erro}</div>}

            <div className="modal-form-grid">
              <div className="input-wrapper">
                <label className="input-label" htmlFor="nt-origem">Origem *</label>
                <select id="nt-origem" className="input-field" value={form.origem} disabled={saving || fixa}
                  onChange={e => trocarOrigem(e.target.value)}>
                  <option value="">Selecione</option>
                  {origens.map(l => <option key={l.id} value={l.id}>{rotuloDoLocal(l)}</option>)}
                </select>
              </div>

              <div className="input-wrapper">
                <label className="input-label" htmlFor="nt-destino">Destino *</label>
                <select id="nt-destino" className="input-field" value={form.destino} disabled={saving || fixa}
                  onChange={e => setForm(prev => ({ ...prev, destino: e.target.value }))}>
                  <option value="">Selecione</option>
                  {destinos.filter(l => String(l.id) !== form.origem).map(l => <option key={l.id} value={l.id}>{rotuloDoLocal(l)}</option>)}
                </select>
              </div>

              <div className="input-wrapper modal-form-span-2">
                <label className="input-label" htmlFor="nt-produto">Produtos *</label>
                <div className="transf-add">
                  <select id="nt-produto" className="input-field" value={produtoEscolhido} disabled={saving || !form.origem || carregandoSaldos}
                    onChange={e => setProdutoEscolhido(e.target.value)}>
                    <option value="">
                      {!form.origem ? 'Escolha a origem primeiro' : carregandoSaldos ? 'Carregando...' : disponiveis.length ? 'Selecione um produto' : 'Sem produtos com saldo'}
                    </option>
                    {disponiveis.map(s => (
                      <option key={s.produto_id} value={s.produto_id}>
                        {s.nome}{s.sku ? ` (${s.sku})` : ''} — saldo: {s.saldo}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="btn btn-secondary" onClick={adicionar} disabled={saving || !produtoEscolhido}>
                    <Plus size={16} /> Adicionar
                  </button>
                </div>
              </div>

              {form.itens.length > 0 && (
                <div className="modal-form-span-2">
                  <ul className="transf-itens">
                    {form.itens.map(i => (
                      <li key={i.produto_id} className="transf-item">
                        <span className="transf-item-nome">{i.nome}</span>
                        <span className="transf-item-saldo">saldo: {saldoPorProduto[i.produto_id] ?? '—'}</span>
                        <input
                          type="number" min="1" step="1" className="input-field transf-item-qtd"
                          aria-label={`Quantidade de ${i.nome}`} value={i.quantidade} disabled={saving}
                          onChange={e => setForm(prev => ({ ...prev, itens: atualizarQuantidade(prev.itens, i.produto_id, e.target.value) }))}
                        />
                        <button type="button" className="btn btn-ghost" aria-label={`Remover ${i.nome}`} disabled={saving}
                          onClick={() => setForm(prev => ({ ...prev, itens: removerItem(prev.itens, i.produto_id) }))}>
                          <Trash2 size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="input-wrapper modal-form-span-2">
                <label className="input-label" htmlFor="nt-obs">Observação (opcional)</label>
                <input id="nt-obs" type="text" className="input-field" maxLength={500} value={form.observacao} disabled={saving}
                  onChange={e => setForm(prev => ({ ...prev, observacao: e.target.value }))} />
              </div>
            </div>

            <p className="modal-field-hint">
              {fixa
                ? 'A mercadoria sai da sua maleta agora e entra no Central quando a equipe aceitar.'
                : 'A mercadoria sai da origem agora e entra no destino quando for aceita.'}
            </p>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={tentarFechar} disabled={saving}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Enviando...' : 'Criar transferência'}
            </button>
          </div>
        </form>

        {confirmando && <ConfirmarDescarteDialog onContinuar={continuarEditando} onDescartar={confirmarDescarte} />}
      </div>
    </div>
  );
}
