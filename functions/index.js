const { onRequest, onSchedule } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

admin.initializeApp();
setGlobalOptions({ region: 'southamerica-east1', maxInstances: 5 });
const db = admin.firestore();
const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const BINANCE = 'https://api.binance.com/api/v3';

const POSITIVE = ['surge','rally','gain','gains','bullish','breakout','growth','adoption','approval','approved','inflow','record','high','rise','rises','positive','support','partnership','upgrade','increasing'];
const NEGATIVE = ['crash','fall','falls','drop','drops','bearish','hack','hacked','exploit','lawsuit','ban','banned','outflow','low','negative','liquidation','liquidations','risk','risks','fraud','scam','regulation','regulatory'];

function sentiment(text = '') {
  const words = text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/);
  let p = 0, n = 0;
  for (const w of words) { if (POSITIVE.includes(w)) p++; if (NEGATIVE.includes(w)) n++; }
  const raw = p - n;
  const score = Math.max(-100, Math.min(100, raw * 12));
  return { score, label: score > 15 ? 'bull' : score < -15 ? 'bear' : 'neutral' };
}

function assetName(symbol) { return symbol.replace('USDT', ''); }

async function getJson(url, options = {}) {
  const r = await fetch(url, options);
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  return r.json();
}

async function fetchNews(symbol) {
  const asset = assetName(symbol);
  const query = encodeURIComponent(`(${asset} OR cryptocurrency OR crypto) AND (market OR price OR regulation OR adoption)`);
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=artlist&maxrecords=30&format=json&sort=datedesc`;
  const data = await getJson(url);
  return (data.articles || []).slice(0, 20).map(a => ({
    title: a.title || 'Sem título',
    url: a.url,
    source: a.domain || a.sourcecountry || 'Fonte externa',
    publishedAt: a.seendate ? new Date(a.seendate).toISOString() : new Date().toISOString(),
    sentiment: sentiment(`${a.title || ''} ${a.snippet || ''}`)
  }));
}

async function generateAI(symbol, technical, news) {
  const key = GEMINI_API_KEY.value();
  if (!key) return { summary: 'IA não configurada. A pesquisa de notícias continua disponível.', risks: [], watch: [] };
  const compactNews = news.slice(0, 12).map(n => `${n.title} | ${n.source} | ${n.sentiment.label}`).join('\n');
  const prompt = `Você é um analista de pesquisa de mercado. Produza um relatório informativo, sem recomendar compra ou venda.\nAtivo: ${assetName(symbol)}\nDados técnicos: ${JSON.stringify(technical)}\nNotícias recentes:\n${compactNews}\nResponda SOMENTE JSON válido no formato {"summary":"...","risks":["..."],"watch":["..."]}. Diferencie fatos de incertezas e não invente dados.`;
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(key)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, responseMimeType: 'application/json' } })
  });
  if (!r.ok) throw new Error(`Gemini HTTP ${r.status}`);
  const data = await r.json();
  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '{}';
  try { return JSON.parse(text); } catch { return { summary: text, risks: [], watch: [] }; }
}

async function buildResearch(symbol) {
  const [ticker, klines, news] = await Promise.all([
    getJson(`${BINANCE}/ticker/24hr?symbol=${symbol}`),
    getJson(`${BINANCE}/klines?symbol=${symbol}&interval=1d&limit=60`),
    fetchNews(symbol)
  ]);
  const closes = klines.map(x => Number(x[4]));
  const sma20 = closes.slice(-20).reduce((a,b) => a+b, 0) / 20;
  const sma50 = closes.reduce((a,b) => a+b, 0) / closes.length;
  const technical = { price: Number(ticker.lastPrice), change24h: Number(ticker.priceChangePercent), volume24h: Number(ticker.volume), sma20, sma50, aboveSma20: Number(ticker.lastPrice) > sma20 };
  const aggregate = news.reduce((s, n) => s + n.sentiment.score, 0);
  const avg = news.length ? Math.round(aggregate / news.length) : 0;
  const overall = { score: avg, label: avg > 15 ? 'bull' : avg < -15 ? 'bear' : 'neutral' };
  const ai = await generateAI(symbol, technical, news);
  const result = { symbol, asset: assetName(symbol), updatedAt: new Date().toISOString(), technical, sentiment: overall, news, ai };
  await db.collection('research').doc(symbol).set(result, { merge: true });
  return result;
}

function cors(req, res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return true; }
  return false;
}

async function verifyUser(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) throw new Error('AUTH_REQUIRED');
  return admin.auth().verifyIdToken(header.slice(7));
}

exports.api = onRequest({ secrets: [GEMINI_API_KEY], timeoutSeconds: 60 }, async (req, res) => {
  if (cors(req, res)) return;
  try {
    if (req.path === '/research' && req.method === 'GET') {
      const symbol = String(req.query.symbol || 'BTCUSDT').toUpperCase();
      const cached = await db.collection('research').doc(symbol).get();
      if (cached.exists && Date.now() - new Date(cached.data().updatedAt).getTime() < 15 * 60 * 1000) return res.json(cached.data());
      return res.json(await buildResearch(symbol));
    }
    if (req.path === '/alerts' && req.method === 'GET') {
      const user = await verifyUser(req);
      const snap = await db.collection('alerts').where('uid', '==', user.uid).where('active', '==', true).limit(50).get();
      return res.json({ alerts: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
    }
    if (req.path === '/alerts' && req.method === 'POST') {
      const user = await verifyUser(req);
      const { symbol, price, direction } = req.body || {};
      if (!/^[A-Z0-9]{4,15}USDT$/.test(symbol) || !Number.isFinite(Number(price)) || !['above','below'].includes(direction)) return res.status(400).json({ error: 'invalid_alert' });
      const ref = await db.collection('alerts').add({ uid: user.uid, symbol, price: Number(price), direction, active: true, triggered: false, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      return res.status(201).json({ id: ref.id });
    }
    return res.status(404).json({ error: 'not_found' });
  } catch (e) {
    if (e.message === 'AUTH_REQUIRED') return res.status(401).json({ error: 'auth_required' });
    console.error(e); return res.status(500).json({ error: 'server_error', message: e.message });
  }
});

exports.researchScheduler = onSchedule({ schedule: 'every 15 minutes', timeZone: 'America/Sao_Paulo', secrets: [GEMINI_API_KEY], timeoutSeconds: 120 }, async () => {
  const symbols = ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','ADAUSDT','DOGEUSDT','AVAXUSDT','LINKUSDT','DOTUSDT'];
  for (const symbol of symbols) {
    try { await buildResearch(symbol); } catch (e) { console.error(`research ${symbol}`, e.message); }
  }
});

exports.alertScheduler = onSchedule({ schedule: 'every 5 minutes', timeZone: 'America/Sao_Paulo', timeoutSeconds: 60 }, async () => {
  const snap = await db.collection('alerts').where('active', '==', true).limit(500).get();
  for (const doc of snap.docs) {
    const a = doc.data();
    try {
      const ticker = await getJson(`${BINANCE}/ticker/price?symbol=${a.symbol}`);
      const current = Number(ticker.price);
      const hit = a.direction === 'above' ? current >= a.price : current <= a.price;
      if (hit) await doc.ref.update({ active: false, triggered: true, triggeredAt: admin.firestore.FieldValue.serverTimestamp(), triggeredPrice: current });
    } catch (e) { console.error(`alert ${doc.id}`, e.message); }
  }
});
