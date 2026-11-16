import { useEffect, useMemo, useState } from 'react';
import { obterResultadoPeriodo } from '../services/vendas';
import { formatarMoeda, formatarPct, periodosPredefinidos, rotuloMes } from '../utils/resultadoVendas';
import './ResultadoVenda.css';

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function Card({ label, valor, pct, destaque, negativo }) {
  return (
    <div className={`resultado-card ${destaque ? 'resultado-card--destaque' : ''}`}>
      <span className="resultado-card-label">{label}</span>
      <span className={`resultado-card-valor ${negativo ? 'resultado-negativo' : ''}`}>{formatarMoeda(valor)}</span>
      {pct !== undefined && <span className="resultado-card-pct">{formatarPct(pct)} da receita</span>}
    </div>
  );
}

// Quanto rendeu um período (e, passando de um mês, mês a mês). Os números vêm do backend (GET /vendas/resultado).
export default function ResultadoPeriodo() {
  const predefinidos = useMemo(() => periodosPredefinidos(hojeISO()), []);
  const [chave, setChave] = useState('mes_atual');
  const [custom, setCustom] = useState({ data_de: predefinidos[0].data_de, data_ate: predefinidos[0].data_ate });
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  const periodo = chave === 'custom'
    ? { ...custom, agrupar: undefined }
    : predefinidos.find(p => p.key === chave);

  const { data_de: dataDe, data_ate: dataAte, agrupar } = periodo;
  const periodoValido = Boolean(dataDe && dataAte && dataDe <= dataAte);

  useEffect(() => {
    if (!periodoValido) return undefined;

    let cancelado = false;

    obterResultadoPeriodo({ data_de: dataDe, data_ate: dataAte, agrupar })
      .then(res => { if (!cancelado) { setDados(res); setErro(''); } })
      .catch(err => { if (!cancelado) { setDados(null); setErro(err.message); } })
      .finally(() => { if (!cancelado) setCarregando(false); });

    return () => { cancelado = true; };
  }, [dataDe, dataAte, agrupar, periodoValido]);

  function escolher(nova) {
    setCarregando(true);
    setErro('');
    setChave(nova);
  }

  function alterarCustom(campo, valor) {
    setCarregando(true);
    setErro('');
    setCustom(prev => ({ ...prev, [campo]: valor }));
  }

  const t = dados?.totais;
  const temFixas = t && t.despesas_fixas !== null && t.despesas_fixas !== undefined;

  return (
    <section className="card card-padding resultado-periodo" aria-label="Resultado do período">
      <div className="resultado-periodo-head">
        <h2 className="resultado-periodo-titulo">Resultado do período</h2>
        <div className="resultado-periodo-opcoes">
          {predefinidos.map(p => (
            <button key={p.key} type="button" className={`btn btn-sm ${chave === p.key ? 'btn-primary' : 'btn-ghost'}`} onClick={() => escolher(p.key)}>
              {p.rotulo}
            </button>
          ))}
          <button type="button" className={`btn btn-sm ${chave === 'custom' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => escolher('custom')}>
            Personalizado
          </button>
        </div>
      </div>

      {chave === 'custom' && (
        <div className="resultado-periodo-datas">
          <label>De <input type="date" className="input-field" value={custom.data_de} onChange={e => alterarCustom('data_de', e.target.value)} /></label>
          <label>até <input type="date" className="input-field" value={custom.data_ate} onChange={e => alterarCustom('data_ate', e.target.value)} /></label>
        </div>
      )}

      {!periodoValido && <p className="resultado-erro">Informe um período válido (data inicial não pode ser depois da final).</p>}
      {periodoValido && carregando && <p className="text-sm text-secondary">Calculando...</p>}
      {periodoValido && !carregando && erro && <p className="resultado-erro" role="alert">{erro}</p>}

      {periodoValido && !carregando && !erro && t && (
        <>
          <div className="resultado-cards">
            <Card label="Receita" valor={t.receita} />
            <Card label="Custo dos produtos" valor={t.custo} />
            <Card label="Lucro bruto" valor={t.lucro_bruto} pct={t.margem_bruta_pct} destaque negativo={t.lucro_bruto < 0} />
            <Card label="Lucro líquido" valor={t.lucro_liquido} pct={t.margem_liquida_pct} destaque negativo={t.lucro_liquido < 0} />
            {temFixas && <Card label="Despesas fixas" valor={t.despesas_fixas} />}
            {temFixas && <Card label="Resultado após despesas fixas" valor={t.lucro_apos_despesas_fixas} pct={t.margem_apos_despesas_fixas_pct} destaque negativo={t.lucro_apos_despesas_fixas < 0} />}
          </div>
          <p className="resultado-aviso">
            {t.vendas} {t.vendas === 1 ? 'venda concluída' : 'vendas concluídas'}. Lucro líquido = lucro bruto − comissão ({formatarMoeda(t.comissao)}) − impostos ({formatarMoeda(t.impostos)}).
            {temFixas && dados.sem_despesas_fixas && ' Nenhuma despesa fixa cadastrada: o resultado final fica igual ao lucro líquido.'}
            {!temFixas && ' Despesas fixas não estão incluídas.'}
          </p>

          {dados.serie && dados.serie.length > 1 && (
            <div className="resultado-serie-wrap">
              <table className="resultado-serie">
                <thead>
                  <tr>
                    <th>Mês</th><th>Receita</th><th>Lucro bruto</th><th>% bruto</th><th>Lucro líquido</th><th>% líquido</th>
                    {temFixas && <th>Após desp. fixas</th>}
                  </tr>
                </thead>
                <tbody>
                  {dados.serie.map(s => (
                    <tr key={s.mes}>
                      <td>{rotuloMes(s.mes)}</td>
                      <td>{formatarMoeda(s.receita)}</td>
                      <td>{formatarMoeda(s.lucro_bruto)}</td>
                      <td>{formatarPct(s.margem_bruta_pct)}</td>
                      <td>{formatarMoeda(s.lucro_liquido)}</td>
                      <td>{formatarPct(s.margem_liquida_pct)}</td>
                      {temFixas && <td>{formatarMoeda(s.lucro_apos_despesas_fixas)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
