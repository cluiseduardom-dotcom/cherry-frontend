import CampoMascarado from '../CampoMascarado';
import { aplicarMascaraCPF, aplicarMascaraTelefone, aplicarMascaraCEP } from '../../utils/mascaras';
import { UFS } from '../../utils/usuarios';
import '../ProductModal.css';
import './CamposFormulario.css';

// Seções de dados cadastrais compartilhadas entre "Novo usuário" e "Editar dados".
// `prefixo` evita ids duplicados; `form`/`erros` seguem as chaves de CAMPOS_DADOS.
export default function DadosCadastraisCampos({ prefixo, form, erros, onChange, disabled }) {
  const cls = campo => `input-field${erros[campo] ? ' input-field--erro' : ''}`;
  const erro = campo => erros[campo] && <span className="campo-erro">{erros[campo]}</span>;
  const texto = (campo, rotulo, props = {}) => (
    <div className="input-wrapper">
      <label className="input-label" htmlFor={`${prefixo}-${campo}`}>{rotulo}</label>
      <input
        id={`${prefixo}-${campo}`}
        type="text"
        className={cls(campo)}
        value={form[campo]}
        onChange={e => onChange(campo, e.target.value)}
        disabled={disabled}
        {...props}
      />
      {erro(campo)}
    </div>
  );

  return (
    <>
      <div className="modal-form-section">
        <h3 className="modal-form-section-title">Dados pessoais</h3>
        <div className="modal-form-grid">
          <div className="input-wrapper">
            <label className="input-label" htmlFor={`${prefixo}-telefone`}>Telefone / WhatsApp *</label>
            <CampoMascarado
              id={`${prefixo}-telefone`}
              mascara={aplicarMascaraTelefone}
              className={cls('telefone')}
              value={form.telefone}
              onChange={valor => onChange('telefone', valor)}
              inputMode="tel"
              maxLength={15}
              placeholder="(00) 00000-0000"
              disabled={disabled}
            />
            {erro('telefone')}
          </div>

          <div className="input-wrapper">
            <label className="input-label" htmlFor={`${prefixo}-cpf`}>CPF</label>
            <CampoMascarado
              id={`${prefixo}-cpf`}
              mascara={aplicarMascaraCPF}
              className={cls('cpf')}
              value={form.cpf}
              onChange={valor => onChange('cpf', valor)}
              inputMode="numeric"
              maxLength={14}
              placeholder="000.000.000-00"
              autoComplete="off"
              disabled={disabled}
            />
            {erro('cpf')}
          </div>

          <div className="input-wrapper">
            <label className="input-label" htmlFor={`${prefixo}-data_nascimento`}>Data de nascimento</label>
            <input
              id={`${prefixo}-data_nascimento`}
              type="date"
              className={cls('data_nascimento')}
              value={form.data_nascimento}
              onChange={e => onChange('data_nascimento', e.target.value)}
              disabled={disabled}
            />
            {erro('data_nascimento')}
          </div>

          <div className="input-wrapper">
            <label className="input-label" htmlFor={`${prefixo}-data_admissao`}>Data de admissão</label>
            <input
              id={`${prefixo}-data_admissao`}
              type="date"
              className={cls('data_admissao')}
              value={form.data_admissao}
              onChange={e => onChange('data_admissao', e.target.value)}
              disabled={disabled}
            />
            {erro('data_admissao')}
          </div>
        </div>
      </div>

      <div className="modal-form-section">
        <h3 className="modal-form-section-title">Endereço <span className="modal-field-hint">(opcional)</span></h3>
        <div className="modal-form-grid">
          <div className="input-wrapper">
            <label className="input-label" htmlFor={`${prefixo}-cep`}>CEP</label>
            <CampoMascarado
              id={`${prefixo}-cep`}
              mascara={aplicarMascaraCEP}
              className={cls('cep')}
              value={form.cep}
              onChange={valor => onChange('cep', valor)}
              inputMode="numeric"
              maxLength={9}
              placeholder="00000-000"
              disabled={disabled}
            />
            {erro('cep')}
          </div>
          {texto('logradouro', 'Logradouro', { maxLength: 255 })}
          {texto('numero', 'Número', { maxLength: 20 })}
          {texto('complemento', 'Complemento', { maxLength: 100 })}
          {texto('bairro', 'Bairro', { maxLength: 100 })}
          {texto('cidade', 'Cidade', { maxLength: 100 })}
          <div className="input-wrapper">
            <label className="input-label" htmlFor={`${prefixo}-uf`}>UF</label>
            <select
              id={`${prefixo}-uf`}
              className={cls('uf')}
              value={form.uf}
              onChange={e => onChange('uf', e.target.value)}
              disabled={disabled}
            >
              <option value="">Selecione...</option>
              {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
            </select>
            {erro('uf')}
          </div>
        </div>
      </div>

      <div className="modal-form-section">
        <h3 className="modal-form-section-title">Observações <span className="modal-field-hint">(opcional)</span></h3>
        <div className="input-wrapper">
          <textarea
            id={`${prefixo}-observacoes`}
            className={cls('observacoes')}
            rows={3}
            maxLength={1000}
            placeholder="Ex.: turno da tarde, disponível aos sábados."
            value={form.observacoes}
            onChange={e => onChange('observacoes', e.target.value)}
            disabled={disabled}
          />
          {erro('observacoes')}
          <span className="campo-dica">{form.observacoes.length}/1000</span>
        </div>
      </div>
    </>
  );
}
