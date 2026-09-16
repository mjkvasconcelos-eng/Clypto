/* Clypto 2.1 Analytics — score histórico, sentimento e comparação */
(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const symbols = ['BTCUSDT','ETHUSDT','SOLUSDT'];
  const names = {BTCUSDT:'BTC',ETHUSDT:'ETH',SOLUSDT:'SOL'};
  const charts = {};

  function ensurePanel(){
    if ($('analyticsPanel')) return;
    const panel = document.createElement('section');
    panel.id='analyticsPanel';
    panel.className='panel analytics-panel';
    panel.innerHTML=`<div class="panel-title">📈 Evolução e comparação</div>
      <div class="analytics-toolbar"><label>Período<select id="analyticsLimit"><option value="12">12 pesquisas</option><option value="24" selected>24 pesquisas</option><option value="48">48 pesquisas</option></select></label><button id="analyticsRefresh">↻ Atualizar gráficos</button></div>
      <div id="analyticsState" class="analytics-state loading-state">Carregando histórico...</div>
      <div class="analytics-grid">
        <article class="analytics-card"><h3>⭐ Histórico do Score</h3><div class="analytics-chart"><canvas id="scoreHistoryChart"></canvas></div></article>
        <article class="analytics-card"><h3>🧠 Evolução do sentimento</h3><div class="analytics-chart"><canvas id="sentimentHistoryChart"></canvas></div></article>
      </div>
      <article class="analytics-card comparison-card"><h3>⚖️ BTC × ETH × SOL</h3><p class="analytics-help">Comparação do Score e sentimento das pesquisas disponíveis no mesmo período.</p><div class="analytics-chart comparison-chart"><canvas id="assetComparisonChart"></canvas></div></article>`;
    const disclaimer=document.querySelector('.disclaimer');
    disclaimer?.before(panel);
  }

  function destroy(name){ if(charts[name]){charts[name].destroy();delete charts[name];} }
  function state(type,text){ const el=$('analyticsState'); if(!el)return; el.className='analytics-state '+type; el.innerHTML=type==='loading'?`<span class="spinner"></span>${esc(text)}`:type==='error'?`⚠️ ${esc(text)} <button id="analyticsRetry">Tentar novamente</button>`:`${esc(text)}`; if(type==='error')$('analyticsRetry')?.addEventListener('click',loadAll); }
  async function history(symbol,limit){
    const r=await fetch(`/api/research/history?symbol=${symbol}&limit=${limit}`);
    if(!r.ok) throw new Error('HTTP '+r.status);
    const d=await r.json();
    return (d.history||[]).slice().reverse();
  }
  function labels(items){return items.map(x=>new Date(x.snapshotAt||x.updatedAt).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}));}
  function commonOptions(){return {responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:true,position:'bottom'}},scales:{x:{ticks:{maxTicksLimit:8}},y:{beginAtZero:false}}};}
  function renderScore(items){destroy('score');if(!items.length)return;charts.score=new Chart($('scoreHistoryChart'),{type:'line',data:{labels:labels(items),datasets:[{label:'Score Clypto',data:items.map(x=>x.score?.score??null),tension:.25,pointRadius:3,borderWidth:2}]},options:{...commonOptions(),scales:{...commonOptions().scales,y:{min:0,max:100,title:{display:true,text:'Score'}}}}});}
  function renderSentiment(items){destroy('sentiment');if(!items.length)return;charts.sentiment=new Chart($('sentimentHistoryChart'),{type:'line',data:{labels:labels(items),datasets:[{label:'Sentimento',data:items.map(x=>x.sentiment?.score??null),tension:.25,pointRadius:3,borderWidth:2}]},options:{...commonOptions(),scales:{...commonOptions().scales,y:{min:-100,max:100,title:{display:true,text:'Sentimento'}}}}});}
  function renderComparison(all){destroy('comparison');const datasets=symbols.map(symbol=>({label:names[symbol],data:all[symbol].map(x=>({x:new Date(x.snapshotAt||x.updatedAt).getTime(),y:x.score?.score??null})),parsing:{xAxisKey:'x',yAxisKey:'y'},tension:.25,pointRadius:3,borderWidth:2}));charts.comparison=new Chart($('assetComparisonChart'),{type:'line',data:{datasets},options:{...commonOptions(),parsing:{xAxisKey:'x',yAxisKey:'y'},scales:{x:{type:'linear',ticks:{callback:v=>new Date(v).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}},y:{min:0,max:100,title:{display:true,text:'Score'}}}}});}
  async function loadAll(){ensurePanel();state('loading','Carregando histórico do Score e sentimento...');destroy('score');destroy('sentiment');destroy('comparison');try{const limit=Number($('analyticsLimit')?.value||24);const selected=$('symbol')?.value||'BTCUSDT';const [btc,eth,sol]=await Promise.all(symbols.map(s=>history(s,limit)));const selectedItems=selected==='ETHUSDT'?eth:selected==='SOLUSDT'?sol:btc;if(!btc.length&&!eth.length&&!sol.length){state('empty','Ainda não há pesquisas históricas suficientes para montar os gráficos.');return;}renderScore(selectedItems);renderSentiment(selectedItems);renderComparison({BTCUSDT:btc,ETHUSDT:eth,SOLUSDT:sol});state('success',`Histórico atualizado · ${selected==='ETHUSDT'?'ETH':selected==='SOLUSDT'?'SOL':'BTC'} em destaque`);}catch(e){console.error(e);state('error','Não foi possível carregar o histórico.');}}
  function bind(){ensurePanel();$('analyticsLimit')?.addEventListener('change',loadAll);$('analyticsRefresh')?.addEventListener('click',loadAll);document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.view==='historyView')setTimeout(loadAll,100);else setTimeout(loadAll,300);}));$('symbol')?.addEventListener('change',()=>setTimeout(loadAll,100));}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();
