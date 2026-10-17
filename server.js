import 'dotenv/config';
import express from 'express';
import OpenAI from 'openai';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const root = path.dirname(fileURLToPath(import.meta.url));
const ai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(root, 'public')));

function getRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload && payload.vbd)) return payload.vbd;
  if (Array.isArray(payload && payload.data && payload.data.vbd)) return payload.data.vbd;
  if (Array.isArray(payload && payload.data)) return payload.data;
  throw new Error('Expected an array or an object containing a vbd array.');
}
function code(v) { return String(v == null ? '' : v).trim().toUpperCase(); }
function analyze(payload, from, to, route) {
  const rows = getRows(payload);
  from = code(from || 'PNBE'); to = code(to || 'BOE');
  route = (route || []).map(code).filter(Boolean);
  const ix = new Map();
  route.forEach((s, i) => { if (!ix.has(s)) ix.set(s, i); });
  if (!ix.has(from) || !ix.has(to) || ix.get(from) >= ix.get(to)) {
    throw new Error('Route order must include the boarding station before the destination.');
  }
  const skipped = { malformed: 0, unknownStation: 0, invalidInterval: 0 };
  const segments = [];
  rows.forEach((r, i) => {
    const coach = code(r && (r.coachName || r.coach));
    const berth = String(r && (r.berthNumber == null ? (r.berthNo == null ? r.berth : r.berthNo) : r.berthNumber) || '').trim();
    const a = code(r && (r.from || r.fromStation));
    const b = code(r && (r.to || r.toStation));
    if (!coach || !berth || !a || !b) { skipped.malformed++; return; }
    if (!ix.has(a) || !ix.has(b)) { skipped.unknownStation++; return; }
    if (ix.get(a) >= ix.get(b)) { skipped.invalidInterval++; return; }
    segments.push({ id: i, coach: coach, berth: berth, from: a, to: b, a: ix.get(a), b: ix.get(b), splitNo: r.splitNo == null ? null : r.splitNo, berthCode: code(r.berthCode) });
  });
  const start = ix.get(from), end = ix.get(to);
  const direct = segments.filter(s => s.a <= start && s.b >= end).map(s => [s]);
  const outgoing = new Map();
  segments.forEach(s => { if (!outgoing.has(s.a)) outgoing.set(s.a, []); outgoing.get(s.a).push(s); });
  outgoing.forEach(v => v.sort((a, b) => b.b - a.b));
  const transfers = [];
  function walk(last, legs) {
    if (legs.length >= 4 || transfers.length >= 20000) return;
    (outgoing.get(last.b) || []).forEach(next => {
      if (next.b <= last.b || legs.some(l => l.id === next.id)) return;
      const path = legs.concat([next]);
      if (next.b >= end) transfers.push(path);
      else walk(next, path);
    });
  }
  segments.forEach(first => {
    if (first.a <= start && first.b > start && first.b < end) walk(first, [first]);
  });
  const all = direct.concat(transfers);
  const seen = new Set();
  const unique = all.filter(path => {
    const key = path.map(s => s.coach + '/' + s.berth + ':' + s.from + '-' + s.to + ':' + s.splitNo).join('|');
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
  unique.sort((x, y) => {
    if (x.length !== y.length) return x.length - y.length;
    const xFirst = x[0].b - Math.max(x[0].a, start);
    const yFirst = y[0].b - Math.max(y[0].a, start);
    if (xFirst !== yFirst) return yFirst - xFirst;
    return y[y.length - 1].b - x[x.length - 1].b;
  });
  const candidates = unique.slice(0, 50).map((path, n) => ({
    rank: n + 1,
    direct: path.length === 1,
    kind: path.length === 1 ? 'Single berth' : path.length + ' segments / ' + (path.length - 1) + ' transfer(s)',
    legs: path.map((s, i) => ({ leg: i + 1, coach: s.coach, berth: s.berth, from: s.from, to: s.to, splitNo: s.splitNo, berthCode: s.berthCode || null }))
  }));
  const unlisted = Array.from(new Set(rows.flatMap(r => [code(r && r.from), code(r && r.to)]).filter(s => s && !ix.has(s)))).sort();
  return {
    summary: { recordsReceived: rows.length, validSegments: segments.length, candidatesFound: unique.length, returned: candidates.length, directCandidates: direct.length, skipped: skipped, unlistedStationCodes: unlisted, fromStation: from, toStation: to },
    candidates: candidates,
    note: 'This is a static chart snapshot, not live availability or a confirmed TTE allotment. Transfer paths need railway staff confirmation.'
  };
}
app.get('/api/health', (req, res) => res.json({ ok: true, aiConfigured: Boolean(ai), model: process.env.OPENAI_MODEL || 'gpt-5.5' }));
app.post('/api/analyze', (req, res) => {
  try {
    const b = req.body || {};
    if (!b.payload) return res.status(400).json({ error: 'Upload or paste chart JSON first.' });
    if (!Array.isArray(b.routeStations)) return res.status(400).json({ error: 'Supply the ordered route station codes.' });
    res.json(analyze(b.payload, b.fromStation, b.toStation, b.routeStations));
  } catch (e) { res.status(400).json({ error: e.message || 'Analysis failed.' }); }
});
app.post('/api/ai-explain', async (req, res) => {
  if (!ai) return res.status(503).json({ error: 'AI is not configured. Add OPENAI_API_KEY to .env.' });
  try {
    const a = req.body && req.body.analysis;
    if (!a || !Array.isArray(a.candidates)) return res.status(400).json({ error: 'Analyze the chart first.' });
    const out = await ai.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-5.5',
      instructions: 'Explain the supplied train vacancy analysis in plain English. Treat it as a static snapshot. Do not invent timings, live availability, probability or TTE decisions. Do not change ranks. Clearly distinguish single-berth candidates from transfer paths.',
      input: 'Explain these candidate paths for ' + a.summary.fromStation + ' to ' + a.summary.toStation + '. Keep it short and actionable. Data: ' + JSON.stringify({ summary: a.summary, candidates: a.candidates.slice(0, 10), note: a.note })
    });
    res.json({ explanation: out.output_text || 'The AI returned no text.' });
  } catch (e) {
    console.error('AI explanation failed:', e.message || e);
    res.status(502).json({ error: 'AI request failed. Check API key, model name and server logs.' });
  }
});
app.get('*', (req, res) => res.sendFile(path.join(root, 'public', 'index.html')));
const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log('Vacancy Scout running at http://localhost:' + port));
