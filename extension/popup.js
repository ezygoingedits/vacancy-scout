const statusEl = document.getElementById('status');
const toggleBtn = document.getElementById('toggle');
function render(state) {
  if (!state || !state.ok) { statusEl.textContent = 'Could not read extension state.'; return; }
  const c = state.lastCapture;
  statusEl.textContent = 'Capture: ' + (state.captureEnabled ? 'ON' : 'OFF') +
    (c ? '\\nAccumulated: ' + c.recordCount + ' unique segments\\nChart responses: ' + (c.responseCount || 1) +
      '\\nLast response: ' + (c.batchRecordCount || c.recordCount) + ' rows\\nUpdated: ' + new Date(c.capturedAt).toLocaleString()
      : '\\nNo chart captured yet.');
  toggleBtn.textContent = state.captureEnabled ? 'Turn capture OFF' : 'Enable capture';
  toggleBtn.style.background = state.captureEnabled ? '#8de0c0' : '#d8e4ff';
}
function refresh() { chrome.runtime.sendMessage({ type: 'GET_STATUS' }, render); }
toggleBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (state) => {
    const enabled = !(state && state.captureEnabled);
    chrome.runtime.sendMessage({ type: 'SET_CAPTURE', enabled }, (result) => {
      if (!result || !result.ok) statusEl.textContent = 'Could not change capture state.';
      refresh();
    });
  });
});
document.getElementById('clear').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'CLEAR_CAPTURE' }, refresh);
});
refresh();