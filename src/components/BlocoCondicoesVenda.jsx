import { useEffect, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { buscarCondicoes, salvarCondicoes } from '../services/lojaCondicoes';
import { formDasCondicoes, LIMITES_CONDICOES, montarCorpoCondicoes, validarCondicoes } from '../utils/lojaCondicoes';

// Bloco da tela "Institucional da loja": frete grátis a partir de um valor, garantia e embalagem de presente. Carrega e salva
// por conta própria (rota /loja-condicoes), então um problema aqui não afeta o restante da tela. Só admin com `loja_online`.
// O frete grátis é decidido e gravado no pedido pelo servidor; aqui só se define o valor.
export default function BlocoCondicoesVenda() {
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let cancelado = false;

    buscarCondicoes()
      .then((dados) => { if (!cancelado) { setForm(formDasCondicoes(dados)); setErro(''); } })
      .catch((e) => { if (!cancelado) setErro(e.message || 'Não foi possível carregar as condições de venda.'); });

    return () => { cancelado = true; };
  }, []);

  const campo = (nome) => (e) => setForm((atual) => ({ ...atual, [nome]: e.target.value }));

  async function salvar(e) {
    e.preventDefault();
    const problema = validarCondicoes(form);

    if (problema) { toast?.error?.(problema); return; }

    setSalvando(true);

    try {
      const salvo = await salvarCondicoes(montarCorpoCondicoes(form));
      setForm(formDasCondicoes(salvo));
      toast?.success?.('Salvo. A loja já mostra o que está preenchido (em até 1 minuto).');
    } catch (err) {
      toast?.error?.(err.message || 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="card card-padding" aria-labelledby="titulo-condicoes-venda" style={{ marginBottom: 'var(--space-4)' }}>
      <h2 id="titulo-condicoes-venda" className="loja-produtos-nome">Condições de venda: frete grátis, garantia e embalagem</h2>
      <p className="text-sm text-secondary">
        O que a loja promete à cliente. Campo em branco não aparece no site. Escreva só o que a loja cumpre: o que está aqui vale como oferta ao consumidor.
      </p>

      {erro && <div className="loja-produtos-erro" role="alert">{erro}</div>}

      {form && (
        <form noValidate onSubmit={salvar}>
          <label className="loja-produtos-campo">
            <span>Frete grátis a partir de (R$) — em branco = não oferece</span>
            <input className="input" type="text" inputMode="decimal" value={form.frete_gratis_acima} onChange={campo('frete_gratis_acima')} placeholder="300" />
            <span className="text-sm text-secondary">
              Vale para o subtotal das peças, em todo o Brasil. O sistema grava &quot;frete grátis&quot; no pedido na hora da compra; pedidos já feitos não mudam se o valor mudar depois.
            </span>
          </label>
          <label className="loja-produtos-campo">
            <span>Garantia (aparece na página da peça)</span>
            <textarea className="input" rows={3} maxLength={LIMITES_CONDICOES.garantia_texto} value={form.garantia_texto} onChange={campo('garantia_texto')} placeholder="Ex.: Garantia de 1 ano contra defeito de fabricação. Não cobre mau uso." />
          </label>
          <label className="loja-produtos-campo">
            <span>Embalagem de presente (aparece na página da peça)</span>
            <input className="input" type="text" maxLength={LIMITES_CONDICOES.embalagem_presente_texto} value={form.embalagem_presente_texto} onChange={campo('embalagem_presente_texto')} placeholder="Ex.: Embalagem de presente grátis." />
          </label>
          <div className="loja-produtos-acoes">
            <button type="submit" className="btn btn-primary" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar condições'}</button>
          </div>
        </form>
      )}
    </section>
  );
}
