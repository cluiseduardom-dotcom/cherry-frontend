import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import BlocoHomeVendas from '../components/BlocoHomeVendas';
import { buscarInstitucional, salvarInstitucional } from '../services/lojaInstitucional';
import { formatarCnpj, formDoInstitucional, LIMITES_INST, montarCorpoInstitucional, validarInstitucional } from '../utils/lojaInstitucional';
import './LojaProdutos.css';

// Dados institucionais da loja online: a história da marca e da fundadora, os serviços, o atendimento, as redes sociais e os
// dados da empresa do rodapé. Só admin, só com a funcionalidade `loja_online`; o backend decide de novo.
// A loja só mostra o que estiver preenchido: nada aqui é preenchido pelo sistema.
export default function LojaInstitucional() {
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let cancelado = false;

    buscarInstitucional()
      .then((dados) => { if (!cancelado) { setForm({ ...formDoInstitucional(dados), cnpj: formatarCnpj(dados.cnpj) }); setErro(''); } })
      .catch((e) => { if (!cancelado) setErro(e.message || 'Não foi possível carregar os dados.'); })
      .finally(() => { if (!cancelado) setCarregando(false); });

    return () => { cancelado = true; };
  }, [recarga]);

  const campo = (nome) => (e) => setForm((atual) => ({ ...atual, [nome]: e.target.value }));

  async function salvar(e) {
    e.preventDefault();
    const problema = validarInstitucional(form);

    if (problema) { toast?.error?.(problema); return; }

    setSalvando(true);

    try {
      const salvo = await salvarInstitucional(montarCorpoInstitucional(form));
      setForm({ ...formDoInstitucional(salvo), cnpj: formatarCnpj(salvo.cnpj) });
      toast?.success?.('Dados salvos. A loja já mostra o que está preenchido.');
    } catch (err) {
      toast?.error?.(err.message || 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  }

  const texto = (nome, rotulo, extra = {}) => (
    <label className="loja-produtos-campo">
      <span>{rotulo}</span>
      <input className="input" type="text" maxLength={LIMITES_INST[nome]} value={form[nome]} onChange={campo(nome)} {...extra} />
    </label>
  );

  const area = (nome, rotulo, linhas) => (
    <label className="loja-produtos-campo">
      <span>{rotulo}</span>
      <textarea className="input" rows={linhas} maxLength={LIMITES_INST[nome]} value={form[nome]} onChange={campo(nome)} />
    </label>
  );

  return (
    <div className="page-content loja-produtos-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Institucional da loja</h1>
          <p className="page-subtitle">A história, os serviços, o atendimento, as redes sociais e os dados da empresa que aparecem no site.</p>
        </div>
        <div className="loja-produtos-cabecalho-acoes">
          <button type="button" className="btn btn-ghost" onClick={() => { setCarregando(true); setRecarga((n) => n + 1); }} disabled={carregando || salvando}>
            <RefreshCw size={16} /> Atualizar
          </button>
        </div>
      </div>

      <p className="loja-produtos-aviso">
        <strong>O site só mostra o que estiver preenchido.</strong> Campo em branco some do site (a página &quot;Quem somos&quot;, os ícones das redes e o botão de WhatsApp só aparecem quando há conteúdo).
        Escreva só o que é verdade e que a empresa pode afirmar.
      </p>

      <BlocoHomeVendas />

      {erro && <div className="loja-produtos-erro" role="alert">{erro}</div>}
      {carregando && <div className="card card-padding" role="status"><span className="spinner" /> Carregando...</div>}

      {!carregando && form && (
        <form noValidate onSubmit={salvar}>
          <section className="card card-padding">
            <h2 className="loja-produtos-nome">Nossa história (página &quot;Quem somos&quot;)</h2>
            {texto('fundadora_nome', 'Nome da fundadora (aparece junto da história)')}
            {area('historia', 'História da marca e da fundadora (separe os parágrafos com uma linha em branco)', 10)}
            {area('servicos', 'Serviços que a loja oferece (um por linha)', 4)}
          </section>

          <section className="card card-padding" style={{ marginTop: 'var(--space-4)' }}>
            <h2 className="loja-produtos-nome">Faixa de avisos (sob o banner da página inicial)</h2>
            <p className="text-sm text-secondary">Frete, parcelamento, promoções... o que a loja decidir. Um aviso por linha, até 5, curtos (até 100 caracteres). Sem aviso, a faixa não aparece.</p>
            {area('avisos', 'Avisos (um por linha)', 5)}
          </section>

          <section className="card card-padding" style={{ marginTop: 'var(--space-4)' }}>
            <h2 className="loja-produtos-nome">Atendimento</h2>
            {texto('whatsapp', 'WhatsApp (com DDD; aparece na aba Ajuda e no rodapé)', { placeholder: '11 99999-9999', inputMode: 'tel' })}
            {texto('email_contato', 'E-mail de atendimento', { inputMode: 'email' })}
            {texto('horario_atendimento', 'Horário de atendimento (ex.: seg a sex, 9h às 18h)')}
            {area('atendimento', 'Texto de atendimento (como falar com a loja, prazos de resposta que a loja cumpre)', 3)}
          </section>

          <section className="card card-padding" style={{ marginTop: 'var(--space-4)' }}>
            <h2 className="loja-produtos-nome">Redes sociais</h2>
            <p className="text-sm text-secondary">Cole o endereço completo do perfil, começando com https://. Só aparece o ícone da rede que tiver link.</p>
            {texto('instagram_url', 'Instagram', { placeholder: 'https://www.instagram.com/seu_perfil', inputMode: 'url' })}
            {texto('facebook_url', 'Facebook', { placeholder: 'https://www.facebook.com/sua_pagina', inputMode: 'url' })}
            {texto('tiktok_url', 'TikTok', { placeholder: 'https://www.tiktok.com/@seu_perfil', inputMode: 'url' })}
          </section>

          <section className="card card-padding" style={{ marginTop: 'var(--space-4)' }}>
            <h2 className="loja-produtos-nome">Dados da empresa (rodapé)</h2>
            {texto('razao_social', 'Razão social')}
            {texto('cnpj', 'CNPJ', { placeholder: '00.000.000/0000-00', inputMode: 'numeric' })}
            {texto('endereco', 'Endereço')}
          </section>

          <div className="loja-produtos-acoes" style={{ marginBottom: 'var(--space-6)' }}>
            <button type="submit" className="btn btn-primary" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      )}
    </div>
  );
}
