(() => {
  'use strict';
  let lastAppliedAt = null;
  function applyCapture(capture) {
    if (!capture || !capture.payload || !Array.isArray(capture.payload.vbd) || !capture.payload.vbd.length) return;
    if (capture.capturedAt && capture.capturedAt === lastAppliedAt) return;
    const textarea = document.getElementById('json');
    if (!textarea) return;
    textarea.value = JSON.stringify(capture.payload, null, 2);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    lastAppliedAt = capture.capturedAt || new Date().toISOString();
    const status = document.getElementById('status');
    if (status) status.textContent = 'Automatically received ' + capture.recordCount +
      ' berth records from your IRCTC chart at ' + new Date(capture.capturedAt || Date.now()).toLocaleString() +
      '. Click “Analyze chart” to rank the results.';
  }
  chrome.runtime.onMessage.addListener((message) => {
    if (message && message.type === 'CHART_CAPTURED') applyCapture(message.capture);
  });
  chrome.runtime.sendMessage({ type: 'GET_LAST_CAPTURE' }, (response) => {
    if (chrome.runtime.lastError || !response || !response.ok) return;
    applyCapture(response.capture);
  });
})();