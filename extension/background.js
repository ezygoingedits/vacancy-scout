'use strict';

const APP_URL_PATTERNS = ['http://localhost:3000/*', 'http://127.0.0.1:3000/*'];
const IRCTC_URL_PATTERNS = ['https://www.irctc.co.in/online-charts/*'];

async function sendCaptureStateToIRCTCTabs(enabled) {
  const tabs = await chrome.tabs.query({ url: IRCTC_URL_PATTERNS });
  await Promise.all(tabs.filter((tab) => tab.id !== undefined).map(async (tab) => {
    try { await chrome.tabs.sendMessage(tab.id, { type: 'SET_CAPTURE', enabled }); } catch (_) {}
  }));
}
async function passCaptureToAppTabs(capture) {
  const tabs = await chrome.tabs.query({ url: APP_URL_PATTERNS });
  await Promise.all(tabs.filter((tab) => tab.id !== undefined).map(async (tab) => {
    try { await chrome.tabs.sendMessage(tab.id, { type: 'CHART_CAPTURED', capture }); } catch (_) {}
  }));
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message.type !== 'string') return false;

  if (message.type === 'SET_CAPTURE') {
    const enabled = message.enabled === true;
    chrome.storage.local.set({ captureEnabled: enabled })
      .then(() => sendCaptureStateToIRCTCTabs(enabled))
      .then(() => sendResponse({ ok: true, captureEnabled: enabled }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === 'GET_STATUS') {
    chrome.storage.local.get({ captureEnabled: false, lastCapture: null }, (state) => {
      const c = state.lastCapture;
      sendResponse({ ok: true, captureEnabled: state.captureEnabled,
        lastCapture: c ? { capturedAt: c.capturedAt, recordCount: c.recordCount, sourceUrl: c.sourceUrl } : null });
    });
    return true;
  }

  if (message.type === 'GET_LAST_CAPTURE') {
    chrome.storage.local.get({ lastCapture: null }, (state) => sendResponse({ ok: true, capture: state.lastCapture }));
    return true;
  }

  if (message.type === 'CLEAR_CAPTURE') {
    chrome.storage.local.remove('lastCapture')
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === 'CHART_CAPTURED') {
    const senderUrl = String(sender.url || '');
    if (!senderUrl.startsWith('https://www.irctc.co.in/online-charts/')) {
      sendResponse({ ok: false, error: 'Capture was not received from an IRCTC chart page.' });
      return false;
    }
    const rows = message.payload && message.payload.vbd;
    if (!Array.isArray(rows) || rows.length === 0 || rows.length > 10000) {
      sendResponse({ ok: false, error: 'Invalid vacancy-chart response.' });
      return false;
    }
    const safeRows = rows.filter((row) => row && typeof row.coachName === 'string' &&
      (typeof row.berthNumber === 'number' || typeof row.berthNumber === 'string') &&
      typeof row.from === 'string' && typeof row.to === 'string')
      .map((row) => ({
        coachName: row.coachName.slice(0, 12),
        berthNumber: row.berthNumber,
        from: row.from.slice(0, 12),
        to: row.to.slice(0, 12),
        ...(row.splitNo == null ? {} : { splitNo: row.splitNo }),
        ...(row.berthCode == null ? {} : { berthCode: String(row.berthCode).slice(0, 8) })
      }));
    if (!safeRows.length) {
      sendResponse({ ok: false, error: 'No valid berth records were found.' });
      return false;
    }
    chrome.storage.local.get({ captureEnabled: false }, (state) => {
      if (!state.captureEnabled) {
        sendResponse({ ok: false, error: 'Capture is switched off.' });
        return;
      }
      const capture = {
        payload: { vbd: safeRows },
        sourceUrl: 'https://www.irctc.co.in/online-charts/api/vacantBerth',
        capturedAt: String(message.pageCapturedAt || new Date().toISOString()),
        recordCount: safeRows.length
      };
      chrome.storage.local.set({ lastCapture: capture })
        .then(() => passCaptureToAppTabs(capture))
        .then(() => sendResponse({ ok: true, recordCount: safeRows.length }))
        .catch((error) => sendResponse({ ok: false, error: error.message }));
    });
    return true;
  }
  return false;
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get({ captureEnabled: false }, (state) => sendCaptureStateToIRCTCTabs(state.captureEnabled));
});