import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Plus, Trash2, X } from 'lucide-react';
import { listarCategorias } from '../services/categorias';
import { listarNiveisCategoria } from '../services/niveisCategoria';
import { criarGrade } from '../services/grades';
import {
  MAX_EIXOS, MAX_VARIACOES, categoriasDaVariacao, chaveDaCombinacao, combinar, lerValores, montarCorpoGrade, nomeDaVariacao, validarNovaGrade,
} from '../utils/grades';
import './ProductModal.css';
import '../pages/Grades.css';
import './NovaGradeModal.css';

const FORM_VAZIO = {
  nome: '', descricao: '', custo: '', preco_venda: '',
  eixos: [{ nome: 'Tamanho', valoresTexto: '' }, { nome: 'Cor', valoresTexto: '' }],
};

// Nova grade: define os eixos (Tamanho, Cor...) e os valores de cada um; as combinações viram produtos.
// Cada variação nasce com estoque 0. Eixo com o nome de um nível de categoria (ex.: Tamanho) usa a categoria
// do mesmo nome no SKU.
export default function NovaGradeModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(FORM_VAZIO);
  const [niveis, setNiveis] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaComum, setCategoriaComum] = useState({}); // nivel -> id da categoria
  const [excluidas, setExcluidas] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    let cancelado = false;
    Promise.all([listarNiveisCategoria({ escopo: 'produto' }), listarCategorias({ page: 1, pageSize: 100, escopo: 'produto' })])
      .then(([n, c]) => {
        if (cancelado) return;
        setNiveis(Array.isArray(n) ? n : []);
        setCategorias(Array.isArray(c?.items) ? c.items : []);
      })
      .catch(() => { /* sem categorias a grade ainda cria; as variações ficam sem SKU até categorizar */ });
    return () => { cancelado = true; };
  }, [open]);

  const eixosComValores = useMemo(
    () => form.eixos.map(e => ({ nome: e.nome.trim(), valores: lerValores(e.valoresTexto) })),
    [form.eixos]
  );
  const nomesEixos = eixosComValores.map(e => e.nome);
  const combinacoes = useMemo(
    () => (eixosComValores.length && eixosComValores.every(e => e.nome && e.valores.length) ? combinar(eixosComValores) : []),
    [eixosComValores]
  );
  const selecionadas = combinacoes.filter(c => !excluidas.has(chaveDaCombinacao(nomesEixos, c)));
  // Eixo que bate com um nível de categoria, mas com valor que não existe como categoria: o SKU não usará aquele valor.
  const semCategoria = [...selecionadas.reduce((vistos, c) => {
    for (const f of categoriasDaVariacao(c, niveis, categorias).semCategoria) vistos.set(`${f.eixo}:${f.valor}`, f);
    return vistos;
  }, new Map()).values()];

  if (!open) return null;

  function mudarEixo(indice, campo, valor) {
    setForm(f => ({ ...f, eixos: f.eixos.map((e, i) => (i === indice ? { ...e, [campo]: valor } : e)) }));
  }

  function fechar() {
    if (saving) return;
    setForm(FORM_VAZIO);
    setExcluidas(new Set());
    setCategoriaComum({});
    setError('');
    onClose();
  }

  function alternar(c) {
    const chave = chaveDaCombinacao(nomesEixos, c);
    setExcluidas(anterior => {
      const novo = new Set(anterior);
      if (novo.has(chave)) novo.delete(chave); else novo.add(chave);
      return novo;
    });
  }

  async function salvar(evento) {
    evento.preventDefault();
    const erro = validarNovaGrade({ ...form, eixos: form.eixos }, selecionadas.length);
    if (erro) { setError(erro); return; }
    setError('');
    setSaving(true);
    try {
      const comuns = Object.values(categoriaComum).filter(Boolean).map(Number);
      const corpo = montarCorpoGrade({ ...form, eixos: eixosComValores, categoriaComumIds: comuns }, selecionadas, niveis, categorias);
      const resultado = await criarGrade(corpo);
      setForm(FORM_VAZIO);
      setExcluidas(new Set());
      setCategoriaComum({});
      onCreated?.(resultado);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && fechar()}>
      <div className="modal-panel card nova-grade-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Nova grade de produtos</h2>
          <button type="button" className="modal-close" onClick={fechar} aria-label="Fechar" disabled={saving}><X size={18} /></button>
        </div>
        <form onSubmit={salvar} noValidate>
          <div className="modal-body">
            {error && <div className="modal-error">{error}</div>}
            <p className="text-sm text-secondary">
              Uma grade é um produto que existe em vários tamanhos, cores etc. Cada combinação vira um produto com SKU, estoque e preço próprios, com estoque 0.
            </p>

            <div className="input-wrapper">
              <label className="input-label" htmlFor="ng-nome">Nome *</label>
              <input id="ng-nome" type="text" className="input-field" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex.: Camiseta básica" />
            </div>
            <div className="input-wrapper">
              <label className="input-label" htmlFor="ng-desc">Descrição</label>
              <input id="ng-desc" type="text" className="input-field" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
            </div>
            <div className="nova-grade-linha">
              <div className="input-wrapper">
                <label className="input-label" htmlFor="ng-custo">Custo *</label>
                <input id="ng-custo" type="number" min="0" step="any" className="input-field" value={form.custo} onChange={e => setForm(f => ({ ...f, custo: e.target.value }))} />
              </div>
              <div className="input-wrapper">
                <label className="input-label" htmlFor="ng-preco">Preço de venda</label>
                <input id="ng-preco" type="number" min="0" step="0.01" className="input-field" value={form.preco_venda} onChange={e => setForm(f => ({ ...f, preco_venda: e.target.value }))} />
              </div>
            </div>

            <h3 className="section-title">Eixos e valores</h3>
            {form.eixos.map((eixo, indice) => (
              <div key={indice} className="nova-grade-eixo">
                <input
                  type="text" className="input-field" aria-label={`Nome do eixo ${indice + 1}`} placeholder="Eixo (ex.: Tamanho)"
                  value={eixo.nome} onChange={e => mudarEixo(indice, 'nome', e.target.value)}
                />
                <input
                  type="text" className="input-field" aria-label={`Valores do eixo ${indice + 1}`} placeholder="Valores, separados por vírgula (ex.: P, M, G)"
                  value={eixo.valoresTexto} onChange={e => mudarEixo(indice, 'valoresTexto', e.target.value)}
                />
                <button type="button" className="produto-action-btn produto-action-btn--danger" aria-label="Remover eixo" title="Remover eixo" onClick={() => setForm(f => ({ ...f, eixos: f.eixos.filter((_, i) => i !== indice) }))}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {form.eixos.length < MAX_EIXOS && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setForm(f => ({ ...f, eixos: [...f.eixos, { nome: '', valoresTexto: '' }] }))}>
                <Plus size={14} /> Adicionar eixo
              </button>
            )}

            {niveis.length > 0 && categorias.length > 0 && (
              <>
                <h3 className="section-title">Categorias comuns a todas as variações (para o SKU)</h3>
                <div className="nova-grade-linha">
                  {niveis.filter(n => !nomesEixos.some(e => e.toLowerCase() === n.nome.toLowerCase())).map(n => (
                    <div key={n.nivel} className="input-wrapper">
                      <label className="input-label" htmlFor={`ng-cat-${n.nivel}`}>{n.nome}</label>
                      <select id={`ng-cat-${n.nivel}`} className="input-field" value={categoriaComum[n.nivel] ?? ''} onChange={e => setCategoriaComum(c => ({ ...c, [n.nivel]: e.target.value }))}>
                        <option value="">— nenhuma —</option>
                        {categorias.filter(c => c.nivel === n.nivel).map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.nome}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </>
            )}

            {semCategoria.length > 0 && (
              <div className="grade-aviso grade-aviso--aviso nova-grade-aviso">
                <AlertTriangle size={16} aria-hidden="true" />
                <div className="text-sm">
                  Sem categoria de mesmo nome para: {semCategoria.map(f => `${f.eixo} ${f.valor}`).join(', ')}. Essas variações ainda recebem SKU, mas sem esse valor.
                </div>
              </div>
            )}

            {combinacoes.length > 0 && (
              <>
                <h3 className="section-title">Variações que serão criadas ({selecionadas.length})</h3>
                {combinacoes.length > MAX_VARIACOES && <p className="text-sm text-secondary">São mais de {MAX_VARIACOES} combinações: desmarque algumas ou crie em duas vezes.</p>}
                <ul className="nova-grade-lista">
                  {combinacoes.map(c => {
                    const chave = chaveDaCombinacao(nomesEixos, c);
                    return (
                      <li key={chave}>
                        <label>
                          <input type="checkbox" checked={!excluidas.has(chave)} onChange={() => alternar(c)} />
                          {nomeDaVariacao(form.nome || 'Produto', nomesEixos, c)}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={fechar} disabled={saving}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Criando…' : `Criar ${selecionadas.length || ''} variações`.trim()}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
