/* Clypto 2.1 Analytics — histórico, comparação e ranking */
(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const symbols = ['BTCUSDT','ETHUSDT','SOLUSDT'];
  const names = {BTCUSDT:'BTC',ETHUSDT:'ETH',SOLUSDT:'SOL'};
  const charts = {};
  let refreshTimer = null;

  function ensurePanel(){
    if ($('analyticsPanel')) return;
    const panel = document.createElement('section');
    panel.id='analyticsPanel';
    panel.className='panel analytics-panel';
    panel.innerHTML=`<div class="panel-title">📈 Evolução, comparação e ranking</div>
      <div class="analytics-toolbar"><label>Período<select id="analyticsLimit"><option value="12">12 pesquisas</option><option value="24" selected>24 pesquisas</option><option value="48">48 pesquisas</option></select></label><button id="analyticsRefresh">↻ Atualizar gráficos</button></div>
      <div id="analyticsState" class="analytics-state loading-state">Carregando histórico...</div>
      <div class="analytics-grid">
        <article class="analytics-card"><h3>⭐ Histórico do Score</h3><div class="analytics-chart"><canvas id="scoreHistoryChart"></canvas></div></article>
        <article class="analytics-card"><h3>🧠 Evolução do sentimento</h3><div class="analytics-chart"><canvas id="sentimentHistoryChart"></canvas></div></article>
      </div>
      <article class="analytics-card comparison-card"><h3>⚖️ BTC × ETH × SOL</h3><p class="analytics-help">Comparação do Score das pesquisas disponíveis no mesmo período.</p><div class="analytics-chart comparison-chart"><canvas id="assetComparisonChart"></canvas></div></article>
      <article class="analytics-card ranking-card"><div class="ranking-header"><div><h3>🏆 Ranking Clypto</h3><p class="analytics-help">BTC, ETH e SOL ordenados por Score, sentimento, momentum e volume.</p></div><span id="rankingUpdated" class="ranking-updated"></span></div><div id="rankingState" class="analytics-state loading-state">Carregando ranking...</div><div id="assetRanking" class="asset-ranking"></div></article>`;
    const disclaimer=document.querySelector('.disclaimer');
    disclaimer?.before(panel);
  }

  function destroy(name){ if(charts[name]){charts[name].destroy();delete charts[name];} }
  function state(type,text){ const el=$('analyticsState'); if(!el)return; el.className='analytics-state '+type; el.innerHTML=type==='loading'?`<span class="spinner"></span>${esc(text)}`:type==='error'?`⚠️ ${esc(text)} <button id="analyticsRetry">Tentar novamente</button>`:`${esc(text)}`; if(type==='error')$('analyticsRetry')?.addEventListener('click',loadAll); }
  function rankingState(type,text){ const el=$('rankingState'); if(!el)return; el.className='analytics-state '+type; el.innerHTML=type==='loading'?`<span class="spinner"></span>${esc(text)}`:type==='error'?`⚠️ ${esc(text)} <button id="rankingRetry">Tentar novamente</button>`:`${esc(text)}`; if(type==='error')$('rankingRetry')?.addEventListener('click',loadAll); }
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

  function latest(items){return items.length ? items[items.length-1] : null;}
  function metric(item,path, fallback=null){let v=item;for(const key of path){v=v?.[key];if(v==null)break;}return Number.isFinite(Number(v))?Number(v):fallback;}
  function momentum(item){
    const direct=metric(item,['momentum','score']);
    if(direct!=null)return Math.max(-100,Math.min(100,direct));
    const macd=metric(item,['indicators','macd']);
    if(macd!=null)return Math.max(-100,Math.min(100,macd));
    const change=metric(item,['market','change24h']);
    return change!=null?Math.max(-100,Math.min(100,change*10)):null;
  }
  function volume(item){
    const direct=metric(item,['volume','score']);
    if(direct!=null)return Math.max(0,Math.min(100,direct));
    const v=metric(item,['technical','volumeScore']);
    if(v!=null)return Math.max(0,Math.min(100,v));
    const raw=metric(item,['volume','value']) ?? metric(item,['volume24h']);
    return raw!=null?raw:null;
  }
  function normalizeVolume(values){
    const valid=values.filter(Number.isFinite);
    if(!valid.length)return values;
    const min=Math.min(...valid),max=Math.max(...valid);
    return values.map(v=>Number.isFinite(v)?(max===min?50:((v-min)/(max-min))*100):null);
  }
  function renderRanking(all){
    const rows=symbols.map(symbol=>({symbol,item:latest(all[symbol])}));
    const vols=normalizeVolume(rows.map(r=>volume(r.item)));
    const data=rows.map((r,i)=>({symbol:r.symbol,score:metric(r.item,['score','score']),sentiment:metric(r.item,['sentiment','score']),momentum:momentum(r.item),volume:vols[i]}));
    const ranking=document.createElement('div');
    ranking.className='ranking-grid';
    const metrics=[['score','Score','⭐',v=>v],['sentiment','Sentimento','🧠',v=>v],['momentum','Momentum','🚀',v=>v],['volume','Volume','📊',v=>v]];
    for(const [key,title,icon] of metrics){
      const sorted=data.filter(x=>x[key]!=null).sort((a,b)=>b[key]-a[key]);
      const col=document.createElement('div'); col.className='ranking-column';
      col.innerHTML=`<h4>${icon} ${title}</h4>`;
      if(!sorted.length){col.innerHTML+=`<div class="ranking-empty">Sem dados</div>`;ranking.appendChild(col);continue;}
      sorted.forEach((x,i)=>{
        const value=x[key];
        const display=key==='sentiment'||key==='momentum' ? `${value>0?'+':''}${value.toFixed(1)}` : value.toFixed(1);
        const pct=key==='sentiment'||key==='momentum' ? Math.max(0,Math.min(100,(value+100)/2)) : Math.max(0,Math.min(100,value));
        col.innerHTML+=`<div class="ranking-row"><span class="ranking-pos">${i+1}º</span><strong>${names[x.symbol]}</strong><div class="ranking-bar"><span style="width:${pct}%"></span></div><b>${esc(display)}</b></div>`;
      });
      ranking.appendChild(col);
    }
    const target=$('assetRanking'); if(target){target.innerHTML='';target.appendChild(ranking);}
    const newest=data.map(x=>latest(all[x.symbol])).filter(Boolean).map(x=>new Date(x.snapshotAt||x.updatedAt)).sort((a,b)=>b-a)[0];
    if($('rankingUpdated'))$('rankingUpdated').textContent=newest?`Atualizado ${newest.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`:'';
  }

  async function loadAll(){ensurePanel();state('loading','Carregando histórico do Score e sentimento...');rankingState('loading','Atualizando ranking...');destroy('score');destroy('sentiment');destroy('comparison');try{const limit=Number($('analyticsLimit')?.value||24);const selected=$('symbol')?.value||'BTCUSDT';const [btc,eth,sol]=await Promise.all(symbols.map(s=>history(s,limit)));const selectedItems=selected==='ETHUSDT'?eth:selected==='SOLUSDT'?sol:btc;if(!btc.length&&!eth.length&&!sol.length){state('empty','Ainda não há pesquisas históricas suficientes para montar os gráficos.');rankingState('empty','Ainda não há dados suficientes para montar o ranking.');return;}renderScore(selectedItems);renderSentiment(selectedItems);renderComparison({BTCUSDT:btc,ETHUSDT:eth,SOLUSDT:sol});renderRanking({BTCUSDT:btc,ETHUSDT:eth,SOLUSDT:sol});state('success',`Histórico atualizado · ${selected==='ETHUSDT'?'ETH':selected==='SOLUSDT'?'SOL':'BTC'} em destaque`);rankingState('success','Ranking atualizado automaticamente com a pesquisa mais recente disponível.');}catch(e){console.error(e);state('error','Não foi possível carregar o histórico.');rankingState('error','Não foi possível carregar o ranking.');}}
  function bind(){ensurePanel();$('analyticsLimit')?.addEventListener('change',loadAll);$('analyticsRefresh')?.addEventListener('click',loadAll);document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>setTimeout(loadAll,200)));$('symbol')?.addEventListener('change',()=>setTimeout(loadAll,100));if(refreshTimer)clearInterval(refreshTimer);refreshTimer=setInterval(loadAll,5*60*1000);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();
