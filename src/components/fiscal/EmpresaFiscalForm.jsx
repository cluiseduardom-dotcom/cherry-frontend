import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { obterEmpresaFiscal, salvarEmpresaFiscal } from '../../services/fiscal';
import { AMBIENTES, REGIMES, mudancasDaEmpresa, validarEmpresa } from '../../utils/fiscal';
import { useToast } from '../../context/ToastContext';

const CAMPOS = ['regime_tributario', 'inscricao_estadual', 'inscricao_municipal', 'cnae_principal', 'codigo_municipio_ibge', 'ambiente'];
const paraForm = fiscal => Object.fromEntries(CAMPOS.map(c => [c, fiscal[c] ?? '']));

// Dados fiscais da empresa (o CNPJ, a razão social e o endereço ficam em Dados da empresa).
export default function EmpresaFiscalForm({ onSalvo }) {
  const toast = useToast();
  const [dados, setDados] = useState(null);
  const [form, setForm] = useState(null);
  const [erroCarga, setErroCarga] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelado = false;
    obterEmpresaFiscal()
      .then(resposta => { if (!cancelado) { setDados(resposta); setForm(paraForm(resposta.fiscal)); } })
      .catch(err => { if (!cancelado) setErroCarga(err.message); });
    return () => { cancelado = true; };
  }, []);

  if (erroCarga) return <div className="empty-state"><div className="empty-state-title">Não foi possível carregar os dados</div><p className="text-sm text-secondary">{erroCarga}</p></div>;
  if (!form) return <div className="empty-state"><p className="text-sm text-secondary">Carregando...</p></div>;

  const { empresa } = dados;
  const muda = (campo, valor) => setForm(f => ({ ...f, [campo]: valor }));

  async function salvar(evento) {
    evento.preventDefault();
    const erro = validarEmpresa(form);
    if (erro) { setError(erro); return; }
    const corpo = mudancasDaEmpresa(dados.fiscal, form);
    if (!Object.keys(corpo).length) { setError('Nada mudou.'); return; }
    setError('');
    setSaving(true);
    try {
      const resposta = await salvarEmpresaFiscal(corpo);
      setDados(resposta);
      setForm(paraForm(resposta.fiscal));
      toast.success('Dados fiscais salvos.');
      onSalvo?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={salvar} noValidate className="card card-padding fiscal-form">
      <h3 className="section-title">Dados fiscais</h3>
      {error && <div className="modal-error">{error}</div>}

      <div className="input-wrapper">
        <label className="input-label" htmlFor="fe-regime">Regime tributário</label>
        <select id="fe-regime" className="input-field" value={form.regime_tributario} onChange={e => muda('regime_tributario', e.target.value)}>
          <option value="">— não definido —</option>
          {REGIMES.map(r => <option key={r.valor} value={r.valor}>{r.rotulo}</option>)}
        </select>
        <span className="modal-field-hint">Na dúvida, pergunte ao seu contador.</span>
      </div>

      <div className="fiscal-form-linha">
        <div className="input-wrapper">
          <label className="input-label" htmlFor="fe-ie">Inscrição estadual</label>
          <input id="fe-ie" type="text" className="input-field" value={form.inscricao_estadual} onChange={e => muda('inscricao_estadual', e.target.value)} placeholder="Só números, ou ISENTO" />
        </div>
        <div className="input-wrapper">
          <label className="input-label" htmlFor="fe-im">Inscrição municipal</label>
          <input id="fe-im" type="text" maxLength={20} className="input-field" value={form.inscricao_municipal} onChange={e => muda('inscricao_municipal', e.target.value)} />
        </div>
      </div>

      <div className="fiscal-form-linha">
        <div className="input-wrapper">
          <label className="input-label" htmlFor="fe-cnae">CNAE principal</label>
          <input id="fe-cnae" type="text" className="input-field" value={form.cnae_principal} onChange={e => muda('cnae_principal', e.target.value)} placeholder="7 dígitos (ex.: 4781-4/00)" />
        </div>
        <div className="input-wrapper">
          <label className="input-label" htmlFor="fe-ibge">Código IBGE do município{empresa.uf ? ` (${empresa.uf})` : ''}</label>
          <input id="fe-ibge" type="text" className="input-field" value={form.codigo_municipio_ibge} onChange={e => muda('codigo_municipio_ibge', e.target.value)} placeholder="7 dígitos" />
        </div>
      </div>

      <div className="input-wrapper">
        <label className="input-label" htmlFor="fe-ambiente">Ambiente</label>
        <select id="fe-ambiente" className="input-field" value={form.ambiente} onChange={e => muda('ambiente', e.target.value)}>
          {AMBIENTES.map(a => <option key={a.valor} value={a.valor}>{a.rotulo}</option>)}
        </select>
      </div>

      <div className="fiscal-form-botoes">
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando…' : 'Salvar dados fiscais'}</button>
      </div>

      <h3 className="section-title">No cadastro da empresa</h3>
      <dl className="fiscal-dl">
        <div><dt>Razão social</dt><dd>{empresa.razao_social ?? '—'}</dd></div>
        <div><dt>CNPJ</dt><dd>{empresa.cnpj ?? '—'}</dd></div>
        <div><dt>Endereço</dt><dd>{[empresa.logradouro, empresa.numero, empresa.bairro, empresa.cidade, empresa.uf, empresa.cep].filter(Boolean).join(', ') || '—'}</dd></div>
      </dl>
      <Link to="/configuracoes/empresa" className="btn btn-secondary btn-sm">Editar dados da empresa</Link>
    </form>
  );
}
