(() => {
  'use strict';
  const CHANNEL = 'VACANCY_SCOUT_PAGE_HOOK';
  let enabled = false;
  window.addEventListener('message', (event) => {
    if (event.source !== window || event.origin !== location.origin) return;
    const msg = event.data;
    if (!msg || msg.source !== 'VACANCY_SCOUT_CONTROL' || msg.type !== 'SET_CAPTURE') return;
    enabled = msg.enabled === true;
  });
  function isVacancyEndpoint(rawUrl) {
    try {
      const url = new URL(String(rawUrl || ''), location.href);
      return url.protocol === 'https:' &&
        (url.hostname === 'www.irctc.co.in' || url.hostname === 'irctc.co.in') &&
        /\/online-charts\/api\/vacantBerth\/?$/.test(url.pathname);
    } catch (_) { return false; }
  }
  function extractRows(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.vbd)) return data.vbd;
    if (data && data.data && Array.isArray(data.data.vbd)) return data.data.vbd;
    if (data && Array.isArray(data.data)) return data.data;
    return null;
  }
  function safeString(value, max = 24) {
    return String(value == null ? '' : value).trim().slice(0, max);
  }
  function normalize(data) {
    const rows = extractRows(data);
    if (!rows || rows.length === 0 || rows.length > 10000) return null;
    const vbd = [];
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue;
      const coachName = safeString(row.coachName ?? row.coach, 12);
      const berthText = safeString(row.berthNumber ?? row.berthNo ?? row.berth, 12);
      const from = safeString(row.from ?? row.fromStation, 12).toUpperCase();
      const to = safeString(row.to ?? row.toStation, 12).toUpperCase();
      if (!coachName || !berthText || !from || !to) continue;
      const record = { coachName, berthNumber: /^\d+$/.test(berthText) ? Number(berthText) : berthText, from, to };
      if (row.splitNo !== undefined && row.splitNo !== null) record.splitNo = row.splitNo;
      if (row.berthCode !== undefined && row.berthCode !== null) record.berthCode = safeString(row.berthCode, 8);
      vbd.push(record);
    }
    return vbd.length ? { vbd } : null;
  }
  function emit(rawUrl, data) {
    if (!enabled || !isVacancyEndpoint(rawUrl)) return;
    const payload = normalize(data);
    if (!payload) return;
    window.postMessage({
      source: CHANNEL,
      type: 'CHART_CAPTURED',
      capturedAt: new Date().toISOString(),
      sourceUrl: new URL(rawUrl, location.href).origin + '/online-charts/api/vacantBerth',
      payload
    }, location.origin);
  }
  const originalFetch = window.fetch;
  if (typeof originalFetch === 'function') {
    window.fetch = function(...args) {
      let rawUrl = '';
      try { rawUrl = args[0] instanceof Request ? args[0].url : String(args[0] || ''); } catch (_) {}
      const promise = originalFetch.apply(this, args);
      if (enabled && isVacancyEndpoint(rawUrl)) {
        promise.then((response) => {
          if (!response || !response.ok) return;
          response.clone().json().then((json) => emit(rawUrl, json)).catch(() => {});
        }).catch(() => {});
      }
      return promise;
    };
  }
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    try { this.__vacancyScoutUrl = String(url || ''); } catch (_) {}
    return originalOpen.call(this, method, url, ...rest);
  };
  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function(...args) {
    if (enabled && isVacancyEndpoint(this.__vacancyScoutUrl)) {
      this.addEventListener('load', function() {
        if (this.status < 200 || this.status >= 300) return;
        try {
          const body = this.responseType === 'json' ? this.response :
            (typeof this.responseText === 'string' ? JSON.parse(this.responseText) : this.response);
          emit(this.__vacancyScoutUrl, body);
        } catch (_) {}
      }, { once: true });
    }
    return originalSend.apply(this, args);
  };
})();