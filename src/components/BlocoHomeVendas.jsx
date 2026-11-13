import { useEffect, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { buscarHomeVendas, salvarHomeVendas } from '../services/lojaHomeVendas';
import { formDoHomeVendas, LIMITES_HOME, montarCorpoHomeVendas, PADROES_HOME, validarHomeVendas } from '../utils/lojaHomeVendas';

// Bloco da tela "Institucional da loja": liga a seção comercial da página inicial e edita os textos dela. Carrega e salva
// por conta própria (rota /loja-home-vendas), então um problema aqui não afeta o restante da tela. Só admin com `loja_online`.
const PARTES = [
  { chave: 'presentes', rotulo: 'Presentes por faixa de preço', explicacao: 'As faixas ("até R$ 30", "até R$ 50"...) são calculadas sozinhas a partir dos preços das peças à venda.' },
  { chave: 'ultimas', rotulo: 'Últimas unidades', explicacao: 'Mostra até 4 peças com 1 ou 2 unidades no estoque e foto. Só aparece com 2 ou mais peças.' },
  { chave: 'ajuda', rotulo: 'Ajuda para escolher', explicacao: 'Botão de WhatsApp. Só aparece se o WhatsApp da loja estiver preenchido em "Atendimento".' },
];

export default function BlocoHomeVendas() {
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let cancelado = false;

    buscarHomeVendas()
      .then((dados) => { if (!cancelado) { setForm(formDoHomeVendas(dados)); setErro(''); } })
      .catch((e) => { if (!cancelado) setErro(e.message || 'Não foi possível carregar esta seção.'); });

    return () => { cancelado = true; };
  }, []);

  const campo = (nome) => (e) => setForm((atual) => ({ ...atual, [nome]: e.target.value }));

  async function salvar(e) {
    e.preventDefault();
    const problema = validarHomeVendas(form);

    if (problema) { toast?.error?.(problema); return; }

    setSalvando(true);

    try {
      const salvo = await salvarHomeVendas(montarCorpoHomeVendas(form));
      setForm(formDoHomeVendas(salvo));
      toast?.success?.(salvo.home_vendas_ativo ? 'Salvo. A página inicial já mostra a seção (em até 1 minuto).' : 'Salvo. A seção está desligada: a página inicial segue como antes.');
    } catch (err) {
      toast?.error?.(err.message || 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="card card-padding" aria-labelledby="titulo-home-vendas" style={{ marginBottom: 'var(--space-4)' }}>
      <h2 id="titulo-home-vendas" className="loja-produtos-nome">Página inicial: presentes e últimas unidades</h2>
      <p className="text-sm text-secondary">
        Uma seção da página inicial com três partes, todas feitas com dados reais da loja. Desligada, a página inicial fica exatamente como está.
        Cada parte só aparece quando há o que mostrar.
      </p>

      {erro && <div className="loja-produtos-erro" role="alert">{erro}</div>}

      {form && (
        <form noValidate onSubmit={salvar}>
          <label style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', margin: 'var(--space-3) 0' }}>
            <input type="checkbox" checked={form.home_vendas_ativo} onChange={(e) => setForm((atual) => ({ ...atual, home_vendas_ativo: e.target.checked }))} />
            <strong>Mostrar esta seção na página inicial</strong>
          </label>

          {PARTES.map(({ chave, rotulo, explicacao }) => (
            <fieldset key={chave} style={{ border: 0, padding: 0, margin: 'var(--space-3) 0' }}>
              <legend><strong>{rotulo}</strong></legend>
              <p className="text-sm text-secondary">{explicacao}</p>
              <label className="loja-produtos-campo">
                <span>Título (em branco usa o texto padrão)</span>
                <input className="input" type="text" maxLength={LIMITES_HOME[`home_${chave}_titulo`]} value={form[`home_${chave}_titulo`]} onChange={campo(`home_${chave}_titulo`)} placeholder={PADROES_HOME[`home_${chave}_titulo`]} />
              </label>
              <label className="loja-produtos-campo">
                <span>Texto (em branco usa o texto padrão)</span>
                <input className="input" type="text" maxLength={LIMITES_HOME[`home_${chave}_texto`]} value={form[`home_${chave}_texto`]} onChange={campo(`home_${chave}_texto`)} placeholder={PADROES_HOME[`home_${chave}_texto`]} />
              </label>
            </fieldset>
          ))}

          <p className="text-sm text-secondary">Escreva só o que é verdade e que a loja cumpre (prazo, frete, garantia e promoção entram só se existirem de fato).</p>
          <div className="loja-produtos-acoes">
            <button type="submit" className="btn btn-primary" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar esta seção'}</button>
          </div>
        </form>
      )}
    </section>
  );
}
