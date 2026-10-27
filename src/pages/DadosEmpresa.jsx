import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CampoMascarado from '../components/CampoMascarado';
import { useToast } from '../context/ToastContext';
import { obterDadosEmpresa, atualizarDadosEmpresa } from '../services/empresa';
import { buscarCep } from '../services/cep';
import { aplicarMascaraCNPJ, aplicarMascaraTelefone, aplicarMascaraCEP, somenteDigitos } from '../utils/mascaras';
import { UFS } from '../utils/usuarios';
import { dadosParaFormulario, validarEmpresa, montarPayloadEmpresa, EMPRESA_VAZIA } from '../utils/empresa';
import '../components/ProductModal.css';
import '../components/usuarios/CamposFormulario.css';

export default function DadosEmpresa() {
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPRESA_VAZIA);
  const [inicial, setInicial] = useState(EMPRESA_VAZIA);
  const [erros, setErros] = useState({});
  const [apiError, setApiError] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [statusCep, setStatusCep] = useState('');
  const reqCep = useRef(0);

  useEffect(() => {
    let cancelado = false;
    obterDadosEmpresa()
      .then(d => {
        if (cancelado) return;
        const f = dadosParaFormulario(d);
        setForm(f);
        setInicial(f);
      })
      .catch(err => { if (!cancelado) setApiError(err.message); })
      .finally(() => { if (!cancelado) setCarregando(false); });
    return () => { cancelado = true; };
  }, []);

  function atualizar(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }));
    if (erros[campo]) setErros(prev => ({ ...prev, [campo]: undefined }));
    if (apiError) setApiError('');
  }

  // Só consulta o CEP quando a pessoa o completa (nunca ao carregar um endereço salvo).
  async function aoMudarCep(valor) {
    atualizar('cep', valor);
    const digitos = somenteDigitos(valor);
    const numero = ++reqCep.current;
    if (digitos.length !== 8) { setStatusCep(''); return; }
    setStatusCep('buscando');
    try {
      const e = await buscarCep(digitos);
      if (numero !== reqCep.current) return;
      if (!e) { setStatusCep('nao_encontrado'); return; }
      ['logradouro', 'bairro', 'cidade', 'uf'].forEach(c => { if (e[c]) atualizar(c, e[c]); });
      setStatusCep('ok');
    } catch {
      if (numero === reqCep.current) setStatusCep('indisponivel');
    }
  }

  async function salvar(e) {
    e.preventDefault();
    const encontrados = validarEmpresa(form);
    if (Object.keys(encontrados).length) { setErros(encontrados); return; }
    const payload = montarPayloadEmpresa(form, inicial);
    if (!Object.keys(payload).length) { toast.success('Nenhuma alteração nos dados.'); return; }
    setSalvando(true);
    setApiError('');
    try {
      const salvo = await atualizarDadosEmpresa(payload);
      const f = dadosParaFormulario(salvo);
      setForm(f);
      setInicial(f);
      toast.success('Dados da empresa atualizados.');
    } catch (err) {
      setApiError(err.message);
    } finally {
      setSalvando(false);
    }
  }

  const cls = campo => `input-field${erros[campo] ? ' input-field--erro' : ''}`;
  const erro = campo => erros[campo] && <span className="campo-erro">{erros[campo]}</span>;
  const texto = (campo, rotulo, props = {}) => (
    <div className="input-wrapper">
      <label className="input-label" htmlFor={`emp-${campo}`}>{rotulo}</label>
      <input id={`emp-${campo}`} type="text" className={cls(campo)} value={form[campo]} disabled={salvando}
        onChange={ev => atualizar(campo, ev.target.value)} {...props} />
      {erro(campo)}
    </div>
  );
  const mascarado = (campo, rotulo, mascara, props = {}, onChange = v => atualizar(campo, v)) => (
    <div className="input-wrapper">
      <label className="input-label" htmlFor={`emp-${campo}`}>{rotulo}</label>
      <CampoMascarado id={`emp-${campo}`} mascara={mascara} className={cls(campo)} value={form[campo]}
        onChange={onChange} disabled={salvando} {...props} />
      {erro(campo)}
    </div>
  );

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dados da empresa</h1>
          <p className="page-subtitle">CNPJ, endereço e contato usados nos documentos da empresa</p>
        </div>
      </div>

      {carregando ? <p>Carregando…</p> : (
        <form className="card card-padding" onSubmit={salvar} noValidate>
          {apiError && <div className="modal-error" role="alert">{apiError}</div>}

          <div className="modal-form-section">
            <h3 className="modal-form-section-title">Identificação</h3>
            <div className="modal-form-grid">
              {texto('nome', 'Nome fantasia *', { maxLength: 255 })}
              {texto('razao_social', 'Razão social', { maxLength: 255 })}
              {mascarado('cnpj', 'CNPJ', aplicarMascaraCNPJ, { inputMode: 'numeric', maxLength: 18, placeholder: '00.000.000/0000-00' })}
            </div>
          </div>

          <div className="modal-form-section">
            <h3 className="modal-form-section-title">Contato</h3>
            <div className="modal-form-grid">
              {mascarado('telefone', 'Telefone / WhatsApp', aplicarMascaraTelefone, { inputMode: 'tel', maxLength: 15, placeholder: '(00) 00000-0000' })}
              {texto('email_contato', 'E-mail de contato', { type: 'email', maxLength: 254 })}
            </div>
          </div>

          <div className="modal-form-section">
            <h3 className="modal-form-section-title">Endereço</h3>
            <div className="modal-form-grid">
              <div className="input-wrapper">
                <label className="input-label" htmlFor="emp-cep">CEP</label>
                <CampoMascarado id="emp-cep" mascara={aplicarMascaraCEP} className={cls('cep')} value={form.cep}
                  onChange={aoMudarCep} inputMode="numeric" maxLength={9} placeholder="00000-000" disabled={salvando} />
                {erro('cep')}
                {statusCep === 'buscando' && <span className="campo-dica">Buscando endereço...</span>}
                {statusCep === 'ok' && <span className="campo-dica">Endereço preenchido pelo CEP. Informe o número.</span>}
                {statusCep === 'nao_encontrado' && <span className="campo-dica">CEP não encontrado. Preencha manualmente.</span>}
                {statusCep === 'indisponivel' && <span className="campo-dica">Não foi possível consultar o CEP agora. Preencha manualmente.</span>}
              </div>
              {texto('logradouro', 'Logradouro', { maxLength: 255 })}
              {texto('numero', 'Número', { maxLength: 20 })}
              {texto('complemento', 'Complemento', { maxLength: 100 })}
              {texto('bairro', 'Bairro', { maxLength: 100 })}
              {texto('cidade', 'Cidade', { maxLength: 100 })}
              <div className="input-wrapper">
                <label className="input-label" htmlFor="emp-uf">UF</label>
                <select id="emp-uf" className={cls('uf')} value={form.uf} disabled={salvando} onChange={ev => atualizar('uf', ev.target.value)}>
                  <option value="">Selecione...</option>
                  {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
                {erro('uf')}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/configuracoes')} disabled={salvando}>Voltar</button>
            <button type="submit" className="btn btn-primary" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
          </div>
        </form>
      )}
    </div>
  );
}
