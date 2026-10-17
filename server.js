import 'dotenv/config';
import express from 'express';
import { GoogleGenAI } from '@google/genai';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const root = path.dirname(fileURLToPath(import.meta.url));
const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const gemini = geminiKey ? new GoogleGenAI({ apiKey: geminiKey }) : null;
const routeApiKey = process.env.RAILRADAR_API_KEY || '';
const routeCache = new Map();
const ROUTE_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(root, 'public')));

function getRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.vbd)) return payload.vbd;
  if (payload && payload.data && Array.isArray(payload.data.vbd)) return payload.data.vbd;
  if (payload && Array.isArray(payload.data)) return payload.data;
  throw new Error('Expected an array or an object containing a vbd array.');
}
function code(value) {
  return String(value == null ? '' : value).trim().toUpperCase();
}
function normalizeRouteStops(payload) {
  const candidates = [
    payload && payload.data && payload.data.stops,
    payload && payload.stops,
    payload && payload.data && payload.data.route && payload.data.route.stops,
    payload && payload.route && payload.route.stops,
    payload && payload.data && payload.data.route,
    payload && payload.route,
    payload && payload.data && payload.data.Route,
    payload && payload.Route
  ];
  const raw = candidates.find(Array.isArray);
  if (!raw) return [];
  const stops = raw.map((item, index) => {
    const stationCode = code(item && (item.code || item.stationCode || item.station_code || item.StationCode || item.station));
    const name = String(item && (item.name || item.stationName || item.station_name || item.StationName) || stationCode).trim();
    const sequenceValue = Number(item && (item.sequence ?? item.seq ?? item.routeNo ?? item.serialNo ?? item.SerialNo));
    return { code: stationCode, name, sequence: Number.isFinite(sequenceValue) && sequenceValue > 0 ? sequenceValue : index + 1 };
  }).filter(stop => stop.code);
  stops.sort((a, b) => a.sequence - b.sequence);
  const ordered = [];
  for (const stop of stops) {
    if (ordered.length && ordered[ordered.length - 1].code === stop.code) continue;
    ordered.push(stop);
  }
  return ordered;
}

function analyze(payload, from, to, route) {
  const rows = getRows(payload);
  from = code(from || 'PNBE');
  to = code(to || 'BOE');
  route = (route || []).map(code).filter(Boolean);
  const indexByStation = new Map();
  route.forEach((station, index) => { if (!indexByStation.has(station)) indexByStation.set(station, index); });
  if (!indexByStation.has(from) || !indexByStation.has(to) || indexByStation.get(from) >= indexByStation.get(to)) {
    throw new Error('The route must include both selected stations, with boarding before destination. Fetch the train route or check the station codes.');
  }

  const skipped = { malformed: 0, unknownStation: 0, invalidInterval: 0 };
  const segments = [];
  rows.forEach((row, index) => {
    if (!row || typeof row !== 'object') { skipped.malformed++; return; }
    const coach = code(row.coachName || row.coach);
    const berth = String(row.berthNumber ?? row.berthNo ?? row.berth ?? '').trim();
    const fromCode = code(row.from || row.fromStation);
    const toCode = code(row.to || row.toStation);
    if (!coach || !berth || !fromCode || !toCode) { skipped.malformed++; return; }
    if (!indexByStation.has(fromCode) || !indexByStation.has(toCode)) { skipped.unknownStation++; return; }
    const fromIndex = indexByStation.get(fromCode);
    const toIndex = indexByStation.get(toCode);
    if (fromIndex >= toIndex) { skipped.invalidInterval++; return; }
    segments.push({ id: index, coach, berth, from: fromCode, to: toCode, fromIndex, toIndex, splitNo: row.splitNo ?? null, berthCode: code(row.berthCode) });
  });

  const startIndex = indexByStation.get(from);
  const endIndex = indexByStation.get(to);
  const direct = segments.filter(segment => segment.fromIndex <= startIndex && segment.toIndex >= endIndex).map(segment => [segment]);
  const outgoing = new Map();
  segments.forEach(segment => {
    if (!outgoing.has(segment.fromIndex)) outgoing.set(segment.fromIndex, []);
    outgoing.get(segment.fromIndex).push(segment);
  });
  outgoing.forEach(list => list.sort((a, b) => b.toIndex - a.toIndex));

  const transfers = [];
  function walk(last, legs) {
    if (legs.length >= 4 || transfers.length >= 20000) return;
    (outgoing.get(last.toIndex) || []).forEach(next => {
      if (next.toIndex <= last.toIndex || legs.some(leg => leg.id === next.id)) return;
      const nextPath = legs.concat([next]);
      if (next.toIndex >= endIndex) transfers.push(nextPath);
      else walk(next, nextPath);
    });
  }
  segments.forEach(first => {
    if (first.fromIndex <= startIndex && first.toIndex > startIndex && first.toIndex < endIndex) walk(first, [first]);
  });

  const seen = new Set();
  const uniquePaths = direct.concat(transfers).filter(path => {
    const key = path.map(segment => segment.coach + '/' + segment.berth + ':' + segment.from + '-' + segment.to + ':' + segment.splitNo).join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  uniquePaths.sort((a, b) => {
    if (a.length !== b.length) return a.length - b.length;
    const firstA = a[0].toIndex - Math.max(a[0].fromIndex, startIndex);
    const firstB = b[0].toIndex - Math.max(b[0].fromIndex, startIndex);
    if (firstA !== firstB) return firstB - firstA;
    return b[b.length - 1].toIndex - a[a.length - 1].toIndex;
  });

  const candidates = uniquePaths.slice(0, 50).map((journey, index) => ({
    rank: index + 1,
    direct: journey.length === 1,
    kind: journey.length === 1 ? 'Single berth' : journey.length + ' segments / ' + (journey.length - 1) + ' transfer(s)',
    legs: journey.map((segment, legIndex) => ({
      leg: legIndex + 1, coach: segment.coach, berth: segment.berth, from: segment.from,
      to: segment.to, splitNo: segment.splitNo, berthCode: segment.berthCode || null
    }))
  }));
  const unlisted = Array.from(new Set(rows.flatMap(row => [code(row && row.from), code(row && row.to)]).filter(station => station && !indexByStation.has(station)))).sort();
  return {
    summary: {
      recordsReceived: rows.length, validSegments: segments.length,
      candidatesFound: uniquePaths.length, returned: candidates.length,
      directCandidates: direct.length, skipped,
      unlistedStationCodes: unlisted, fromStation: from, toStation: to
    },
    candidates,
    note: 'This is a static chart snapshot, not live availability or a confirmed TTE allotment. Transfer paths need railway staff confirmation.'
  };
}

app.get('/api/health', (req, res) => res.json({
  ok: true,
  aiConfigured: Boolean(gemini),
  aiProvider: 'Gemini',
  model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  routeLookupConfigured: Boolean(routeApiKey)
}));

app.get('/api/train-route/:number', async (req, res) => {
  const trainNumber = String(req.params.number || '').trim();
  if (!/^[0-9]{4,6}$/.test(trainNumber)) {
    return res.status(400).json({ error: 'Enter a valid train number using 4 to 6 digits.' });
  }
  const cached = routeCache.get(trainNumber);
  if (cached && Date.now() - cached.cachedAt < ROUTE_CACHE_TTL_MS) {
    return res.json({ ...cached.result, cached: true });
  }
  if (!routeApiKey) {
    return res.status(503).json({ error: 'Automatic route lookup is not configured on this server. Add RAILRADAR_API_KEY to the server environment, then restart or redeploy.' });
  }
  try {
    const url = 'https://api.railradar.in/v1/trains/' + encodeURIComponent(trainNumber) + '/route?format=geojson&stops=true';
    const upstream = await fetch(url, {
      method: 'GET',
      headers: { Authorization: 'Bearer ' + routeApiKey, Accept: 'application/json' },
      signal: AbortSignal.timeout(15000)
    });
    let body = null;
    try { body = await upstream.json(); } catch (_) {}
    if (!upstream.ok) {
      if (upstream.status === 401 || upstream.status === 403) return res.status(502).json({ error: 'The train-route provider rejected its API key. Check RAILRADAR_API_KEY in server settings.' });
      if (upstream.status === 429) return res.status(429).json({ error: 'The train-route provider quota or rate limit has been reached. Try again later.' });
      if (upstream.status === 404) return res.status(404).json({ error: 'No route was found for that train number.' });
      return res.status(502).json({ error: 'The train-route provider is temporarily unavailable.' });
    }
    if (body && body.success === false) return res.status(404).json({ error: body.error && body.error.message ? body.error.message : 'No route was found for that train number.' });
    const stops = normalizeRouteStops(body);
    if (stops.length < 2) return res.status(502).json({ error: 'The provider response did not contain an ordered station list.' });
    const result = {
      trainNumber,
      routeStations: stops.map(stop => stop.code),
      stops,
      stopCount: stops.length,
      source: 'RailRadar train route API',
      fetchedAt: new Date().toISOString(),
      cached: false
    };
    routeCache.set(trainNumber, { cachedAt: Date.now(), result });
    return res.json(result);
  } catch (error) {
    const timedOut = error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    return res.status(502).json({ error: timedOut ? 'Train-route lookup timed out. Try again.' : 'Could not reach the train-route provider. Try again shortly.' });
  }
});

app.post('/api/analyze', (req, res) => {
  try {
    const body = req.body || {};
    if (!body.payload) return res.status(400).json({ error: 'Upload or capture chart JSON first.' });
    if (!Array.isArray(body.routeStations)) return res.status(400).json({ error: 'Fetch the selected train route first.' });
    return res.json(analyze(body.payload, body.fromStation, body.toStation, body.routeStations));
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Analysis failed.' });
  }
});

app.post('/api/ai-explain', async (req, res) => {
  if (!gemini) return res.status(503).json({ error: 'Gemini is not configured. Add GEMINI_API_KEY to the server environment.' });
  try {
    const analysis = req.body && req.body.analysis;
    if (!analysis || !Array.isArray(analysis.candidates)) return res.status(400).json({ error: 'Analyze the chart first.' });
    const prompt = [
      'Explain the supplied train vacancy analysis in plain English.',
      'Treat it as a static snapshot. Do not invent timings, live availability, probabilities or TTE decisions.',
      'Do not change ranks. Clearly distinguish single-berth candidates from transfer paths.',
      'Keep the explanation short and actionable.',
      'Analysis JSON:',
      JSON.stringify({
        summary: analysis.summary,
        candidates: analysis.candidates.slice(0, 10),
        note: analysis.note
      })
    ].join('\n\n');
    const model = (process.env.GEMINI_MODEL || 'gemini-3.8-flash').trim();
    const apiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: {
        'x-goog-api-key': geminiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model, input: prompt, store: false })
    });
    const responseText = await apiResponse.text();
    let payload = {};
    try { payload = responseText ? JSON.parse(responseText) : {}; } catch (_) {}
    if (!apiResponse.ok) {
      const apiError = payload && payload.error ? payload.error : {};
      const detail = typeof apiError === 'string'
        ? apiError
        : (apiError.message || payload.message || responseText || 'Google returned HTTP ' + apiResponse.status);
      const error = new Error(String(detail).slice(0, 1800));
      error.status = apiResponse.status;
      error.code = String(apiError.status || apiError.code || payload.code || 'GeminiRESTError');
      throw error;
    }
    const textFromSteps = Array.isArray(payload.steps)
      ? payload.steps.flatMap(step => Array.isArray(step.content) ? step.content : [])
          .filter(item => item && item.type === 'text' && typeof item.text === 'string')
          .map(item => item.text).join('\n')
      : '';
    return res.json({ explanation: payload.output_text || textFromSteps || 'Gemini returned no text.' });
  } catch (error) {
    const status = Number(error && (error.status || error.statusCode || error.httpStatus)) || 0;
    const code = String(error && (error.code || error.name) || 'GeminiError');
    const message = String(error && error.message || error || 'Unknown Gemini error');
    console.error('Gemini explanation failed:', { status, code, message });
    let hint = 'Gemini could not complete the request. Check the diagnostic details.';
    if (status === 400 || status === 404) hint = 'Google rejected the request. Details: ' + message;
    else if (status === 401 || status === 403) hint = 'Google rejected the API key or its permissions. Details: ' + message;
    else if (status === 429) hint = 'Gemini quota or rate limit reached. Details: ' + message;
    return res.status(502).json({ error: hint, diagnosticStatus: status || null, diagnosticCode: code });
  }
});

app.get('*', (req, res) => res.sendFile(path.join(root, 'public', 'index.html')));
const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log('Vacancy Scout running at http://localhost:' + port));
