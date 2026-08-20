(function () {
  var script = document.currentScript;
  var siteId = script.getAttribute('data-site-id');
  var scriptOrigin = new URL(script.src).origin;
  var endpoint = script.getAttribute('data-endpoint') || (scriptOrigin + '/api/collect');
  if (!siteId) { console.warn('[analytics] missing data-site-id'); return; }

  function getVisitorId() {
    var key = '_analytics_vid';
    var id = localStorage.getItem(key);
    if (!id) {
      id = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(key, id);
    }
    return id;
  }

  function send(payload) {
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(function () {});
  }

  function collectPerf() {
    if (!window.performance || !performance.timing) return null;
    var t = performance.timing;
    var loadTime = t.loadEventEnd - t.navigationStart;
    var domContentLoaded = t.domContentLoadedEventEnd - t.navigationStart;
    var firstPaint = null;
    var paintEntries = performance.getEntriesByType ? performance.getEntriesByType('paint') : [];
    for (var i = 0; i < paintEntries.length; i++) {
      if (paintEntries[i].name === 'first-paint') firstPaint = Math.round(paintEntries[i].startTime);
    }
    if (loadTime <= 0) return null;
    return { loadTime: loadTime, domContentLoaded: domContentLoaded, firstPaint: firstPaint };
  }

  function track() {
    var payload = {
      siteId: siteId,
      type: 'pageview',
      path: window.location.pathname,
      referrer: document.referrer,
      visitorId: getVisitorId(),
      perf: collectPerf()
    };
    send(payload);
  }

  if (document.readyState === 'complete') {
    track();
  } else {
    window.addEventListener('load', function () {
      setTimeout(track, 0); // let performance.timing finalize
    });
  }
})();
