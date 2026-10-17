(() => {
  'use strict';
  function isCaptureMessage(data) {
    return data && data.source === 'VACANCY_SCOUT_PAGE_HOOK' &&
      data.type === 'CHART_CAPTURED' && data.payload &&
      Array.isArray(data.payload.vbd) && data.payload.vbd.length > 0 &&
      data.payload.vbd.every((row) => row && row.coachName &&
        row.berthNumber !== undefined && row.from && row.to);
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window || event.origin !== location.origin || !isCaptureMessage(event.data)) return;
    chrome.runtime.sendMessage({
      type: 'CHART_CAPTURED',
      payload: event.data.payload,
      pageCapturedAt: event.data.capturedAt || new Date().toISOString(),
      recordCount: event.data.payload.vbd.length
    }, () => { void chrome.runtime.lastError; });
  });

  function setCapture(enabled) {
    window.postMessage({ source: 'VACANCY_SCOUT_CONTROL', type: 'SET_CAPTURE', enabled: enabled === true }, location.origin);
  }
  chrome.runtime.onMessage.addListener((message) => {
    if (message && message.type === 'SET_CAPTURE') setCapture(message.enabled);
  });
  chrome.storage.local.get({ captureEnabled: false }, (state) => setCapture(state.captureEnabled));
})();