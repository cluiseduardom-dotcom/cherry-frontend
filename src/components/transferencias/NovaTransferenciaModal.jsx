import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Plus, Trash2, Barcode } from 'lucide-react';
import { aceitarTransferencia, criarTransferencia } from '../../services/transferenciasEstoque';
import BarcodeScannerModal from '../compras/BarcodeScannerModal';
import { saldosDoLocal } from '../../services/locaisEstoque';
import { rotuloDoLocal } from '../../utils/locaisEstoque';
import {
  FORM_TRANSFERENCIA_VAZIO, rotasDisponiveis, validarNovaTransferencia,
  adicionarItem, removerItem, atualizarQuantidade, incluirItemLido, rotasDoAtalho, totalDeUnidades,
} from '../../utils/transferencias';
import { useConfirmarFechamentoModal } from '../../hooks/useConfirmarFechamentoModal';
import { formularioAlterado } from '../../utils/formularioAlterado';
import ConfirmarDescarteDialog from '../ConfirmarDescarteDialog';
import '../ProductModal.css';
import '../usuarios/CamposFormulario.css';
import SeletorProduto from '../SeletorProduto';
import './Transferencias.css';

// Equipe: qualquer rota entre locais. Vendedor: só devolver da própria maleta ao Central
// (origem e destino já vêm preenchidos). O backend valida tudo de novo.
// atalho (só equipe): 'montar' (Central → maleta) ou 'devolver' (maleta → Central). Itens podem ser bipados.
const TITULOS = { montar: 'Montar maleta', devolver: 'Receber devolução da maleta' };
const ehEquipe = user => user?.role === 'admin' || user?.role === 'estoquista';

export default function NovaTransferenciaModal({ open, locais, user, atalho = null, onClose, onSaved }) {
  const { origens, destinos } = useMemo(
    () => (atalho && ehEquipe(user) ? rotasDoAtalho(locais, atalho) : rotasDisponiveis(locais, user)),
    [locais, user, atalho],
  );
  const fixa = origens.length === 1 && destinos.length === 1;

  const inicial = useMemo(() => ({
    ...FORM_TRANSFERENCIA_VAZIO,
    origem: fixa ? String(origens[0].id) : '',
    destino: fixa ? String(destinos[0].id) : '',
  }), [fixa, origens, destinos]);

  const [form, setForm] = useState(inicial);
  const [scannerAberto, setScannerAberto] = useState(false);
  // Devolução recebida pela própria equipe: já conferiu ao bipar, então pode dar entrada na hora (o aceite é dela).
  const [aceitarNaHora, setAceitarNaHora] = useState(true);
  const formRef = useRef(form);
  formRef.current = form;
  const saldosRef = useRef([]);
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
    setScannerAberto(false);
    setAceitarNaHora(true);
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

  saldosRef.current = saldos;

  if (!open) return null;

  const podeAceitarNaHora = ehEquipe(user) && destinos.length > 0
    && destinos.find(l => String(l.id) === form.destino)?.tipo === 'central';
  const titulo = (atalho && TITULOS[atalho]) || (fixa ? 'Devolver ao Central' : 'Nova transferência');

  // Leitura pelo código: soma 1 por leitura, até o saldo da origem. A mensagem (ou o erro) aparece no leitor.
  function itemLido(produtoLido) {
    const r = incluirItemLido(formRef.current.itens, saldosRef.current, produtoLido);
    if (r.erro) throw new Error(r.erro);
    formRef.current = { ...formRef.current, itens: r.itens };
    setForm(prev => ({ ...prev, itens: r.itens }));
    setErro('');
    return r.mensagem;
  }

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
      if (podeAceitarNaHora && aceitarNaHora) {
        try {
          const aceita = await aceitarTransferencia(criada.id);
          onSaved(aceita ?? { ...criada, status: 'concluida' });
          return;
        } catch (err) {
          // Criada mas não aceita: segue pendente, e a equipe aceita depois na lista.
          onSaved({ ...criada, aviso: err?.message || 'Não foi possível dar entrada agora; aceite na lista.' });
          return;
        }
      }
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
          <h2 className="modal-title" id="nova-transf-titulo">{titulo}</h2>
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
                  <SeletorProduto
                    id="nt-produto"
                    produtos={disponiveis.map(s => ({ id: s.produto_id, nome: s.nome, sku: s.sku, estoque_atual: s.saldo }))}
                    value={String(produtoEscolhido ?? '')}
                    onChange={setProdutoEscolhido}
                    rotuloEstoque="Saldo"
                    disabled={saving || !form.origem || carregandoSaldos}
                    placeholder={!form.origem ? 'Escolha a origem primeiro' : carregandoSaldos ? 'Carregando...' : disponiveis.length ? 'Digite o nome ou o código do produto' : 'Sem produtos com saldo'}
                  />
                  <button type="button" className="btn btn-secondary" onClick={adicionar} disabled={saving || !produtoEscolhido}>
                    <Plus size={16} /> Adicionar
                  </button>
                </div>
                <button type="button" className="btn btn-primary transf-bipar" onClick={() => setScannerAberto(true)}
                  disabled={saving || !form.origem || carregandoSaldos}>
                  <Barcode size={18} /> Bipar itens
                </button>
              </div>

              {form.itens.length > 0 && (
                <div className="modal-form-span-2">
                  <p className="transf-total" aria-live="polite">
                    {form.itens.length} {form.itens.length === 1 ? 'produto' : 'produtos'} · {totalDeUnidades(form.itens)} {totalDeUnidades(form.itens) === 1 ? 'peça' : 'peças'}
                  </p>
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

            {podeAceitarNaHora && (
              <label className="transf-aceitar">
                <input type="checkbox" checked={aceitarNaHora} disabled={saving} onChange={e => setAceitarNaHora(e.target.checked)} />
                Conferi as peças: dar entrada no Central agora
              </label>
            )}

            <p className="modal-field-hint">
              {podeAceitarNaHora && aceitarNaHora
                ? 'As peças saem da maleta e entram no Central agora.'
                : atalho === 'montar'
                ? 'As peças saem do Central agora e entram na maleta quando o vendedor aceitar (ele confere o que recebeu).'
                : fixa
                ? 'A mercadoria sai da sua maleta agora e entra no Central quando a equipe aceitar.'
                : 'A mercadoria sai da origem agora e entra no destino quando for aceita.'}
            </p>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={tentarFechar} disabled={saving}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Enviando...' : atalho === 'montar' ? 'Enviar para a maleta' : podeAceitarNaHora && aceitarNaHora ? 'Registrar devolução' : 'Criar transferência'}
            </button>
          </div>
        </form>

        {scannerAberto && (
          <BarcodeScannerModal
            continuo
            lote
            titulo={titulo}
            onDetect={itemLido}
            onClose={() => setScannerAberto(false)}
          />
        )}

        {confirmando && <ConfirmarDescarteDialog onContinuar={continuarEditando} onDescartar={confirmarDescarte} />}
      </div>
    </div>
  );
}
