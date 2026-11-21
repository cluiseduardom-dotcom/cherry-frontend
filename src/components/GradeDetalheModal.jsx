import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { acrescentarVariacoes } from '../services/grades';
import { combinacoesNovas, lerValores, resumoDeEstoque } from '../utils/grades';
import './ProductModal.css';
import '../pages/Contas.css';
import '../pages/Grades.css';
import './NovaGradeModal.css';

const moeda = valor => (valor === null || valor === undefined ? '—' : Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));

// Detalhe da grade: cada variação com SKU, estoque e preço, e acréscimo de novas combinações.
export default function GradeDetalheModal({ dados, onClose, onChanged }) {
  const [adicionando, setAdicionando] = useState(false);
  const [textos, setTextos] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!dados) return null;

  const { grade, variacoes } = dados;
  const comCusto = variacoes.some(v => Object.prototype.hasOwnProperty.call(v, 'custo'));
  const resumo = resumoDeEstoque(variacoes);
  const valoresPorEixo = grade.eixos.map(eixo => lerValores(textos[eixo]));
  const novas = valoresPorEixo.every(v => v.length) ? combinacoesNovas(grade.eixos, valoresPorEixo, variacoes) : [];

  async function salvar(evento) {
    evento.preventDefault();
    if (!novas.length) { setError('Informe valores novos para todos os eixos (as combinações que já existem são ignoradas).'); return; }
    if (novas.length > 100) { setError('No máximo 100 variações por vez.'); return; }
    setError('');
    setSaving(true);
    try {
      await acrescentarVariacoes(grade.id, novas.map(valores => ({ valores })));
      setAdicionando(false);
      setTextos({});
      onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && !saving && onClose()}>
      <div className="modal-panel card nova-grade-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{grade.nome}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar" disabled={saving}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {error && <div className="modal-error">{error}</div>}
          {grade.descricao && <p className="text-sm">{grade.descricao}</p>}
          <p className="text-sm text-secondary">
            Eixos: {grade.eixos.join(' · ')} · {variacoes.length} variações · estoque total {resumo.total}{resumo.semEstoque ? ` · ${resumo.semEstoque} sem estoque` : ''}
          </p>

          <div className="table-scroll">
            <table className="contas-table">
              <thead>
                <tr><th>Variação</th><th>SKU</th><th>Estoque</th><th>Preço</th>{comCusto && <th>Custo</th>}</tr>
              </thead>
              <tbody>
                {variacoes.map(v => (
                  <tr key={v.id}>
                    <td>{v.nome}</td>
                    <td>{v.sku ?? <span className="badge badge-warning">Sem SKU</span>}</td>
                    <td>{v.estoque_atual}</td>
                    <td>{v.preco_venda === null ? <span className="text-secondary">defina por canal</span> : moeda(v.preco_venda)}</td>
                    {comCusto && <td>{moeda(v.custo)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-secondary">Cada variação é um produto normal: dê a entrada de estoque em Compras ou Estoque, e ajuste o preço em Produtos.</p>

          {adicionando ? (
            <form onSubmit={salvar} noValidate className="grade-form-inline">
              {grade.eixos.map(eixo => (
                <div key={eixo} className="input-wrapper">
                  <label className="input-label" htmlFor={`gd-${eixo}`}>{eixo}: valores (separados por vírgula)</label>
                  <input id={`gd-${eixo}`} type="text" className="input-field" value={textos[eixo] ?? ''} onChange={e => setTextos(t => ({ ...t, [eixo]: e.target.value }))} />
                </div>
              ))}
              <p className="text-sm text-secondary">{novas.length} {novas.length === 1 ? 'variação nova será criada' : 'variações novas serão criadas'} (as que já existem são ignoradas).</p>
              <div className="grade-form-botoes">
                <button type="button" className="btn btn-secondary" onClick={() => setAdicionando(false)} disabled={saving}>Voltar</button>
                <button type="submit" className="btn btn-primary" disabled={saving || !novas.length}>{saving ? 'Criando…' : 'Criar variações'}</button>
              </div>
            </form>
          ) : (
            <button type="button" className="btn btn-secondary" onClick={() => setAdicionando(true)}><Plus size={14} /> Adicionar variações</button>
          )}
        </div>
      </div>
    </div>
  );
}
