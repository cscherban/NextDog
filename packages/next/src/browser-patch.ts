// Generates a small inline script string for browser-side console capture.
// This runs in the browser, NOT in Node — kept as a string to be injected via <Script>.

export function getBrowserPatchScript(url: string, serviceName: string): string {
  return `(function() {
  if (window.__nextdog_patched) return;
  window.__nextdog_patched = true;

  var url = ${JSON.stringify(url)};
  var serviceName = ${JSON.stringify(serviceName)};
  var buffer = [];
  var LEVEL_MAP = { debug: 'debug', log: 'info', info: 'info', warn: 'warn', error: 'error' };
  var LEVELS = ['debug', 'log', 'info', 'warn', 'error'];

  // Read the server-injected trace context (if the server stamped it into the
  // document during this page's render). Absent on pages without an active
  // server trace — we degrade to logging with no traceId.
  function readMeta(name) {
    try {
      var el = document.querySelector('meta[name="' + name + '"]');
      return el ? (el.getAttribute('content') || '') : '';
    } catch (e) { return ''; }
  }
  var HEX32 = /^[0-9a-f]{32}$/i;
  var serverTraceId = readMeta('nextdog-trace-id');
  if (!HEX32.test(serverTraceId)) serverTraceId = '';
  var serverSpanId = readMeta('nextdog-span-id');

  // Synthetic client span id (16 hex chars) so client logs share the server
  // trace but are distinguishable from the server's root span. Generated once
  // per page load. Full client-side fetch spans are a later follow-up.
  function makeSpanId() {
    var s = '';
    for (var i = 0; i < 16; i++) s += Math.floor(Math.random() * 16).toString(16);
    return s;
  }
  var clientSpanId = serverTraceId ? makeSpanId() : '';

  // Stamp trace correlation onto a buffered log entry (in place) when available.
  function correlate(entry) {
    if (serverTraceId) {
      entry.traceId = serverTraceId;
      entry.spanId = clientSpanId;
      if (serverSpanId) entry.attributes['nextdog.server.spanId'] = serverSpanId;
    }
    return entry;
  }

  function formatArg(arg) {
    if (typeof arg === 'string') return arg;
    if (arg instanceof Error) return arg.message + '\\n' + (arg.stack || '');
    try { return JSON.stringify(arg); } catch(e) { return String(arg); }
  }

  function extractAttrs(args) {
    var attrs = {};
    for (var i = 0; i < args.length; i++) {
      var arg = args[i];
      if (arg && typeof arg === 'object' && !(arg instanceof Error) && !Array.isArray(arg)) {
        Object.keys(arg).forEach(function(k) { attrs[k] = arg[k]; });
      }
    }
    return attrs;
  }

  function flush() {
    if (buffer.length === 0) return;
    var logs = buffer.splice(0, buffer.length);
    var body = JSON.stringify({
      logs: logs.map(function(l) { return { type: 'log', timestamp: l.timestamp, data: l }; })
    });
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url + '/v1/logs', new Blob([body], { type: 'application/json' }));
      } else {
        fetch(url + '/v1/logs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, keepalive: true });
      }
    } catch(e) {}
  }

  setInterval(flush, 1000);
  window.addEventListener('beforeunload', flush);

  LEVELS.forEach(function(level) {
    var original = console[level].bind(console);
    console[level] = function() {
      original.apply(console, arguments);
      var args = Array.from(arguments);
      var firstArg = args[0];
      if (typeof firstArg === 'string' && firstArg.indexOf('[nextdog]') === 0) return;
      // Skip Next.js internal RSC/navigation noise
      if (typeof firstArg === 'string' && (
        firstArg.indexOf('Failed to fetch RSC payload') !== -1 ||
        firstArg.indexOf('Unexpected root span type') !== -1
      )) return;

      var message = args.map(formatArg).join(' ');
      var attrs = extractAttrs(args);
      attrs.runtime = 'browser';
      attrs['window.url'] = window.location.pathname;

      buffer.push(correlate({
        timestamp: Date.now(),
        level: LEVEL_MAP[level] || 'info',
        message: message,
        attributes: attrs,
        serviceName: serviceName
      }));
    };
  });

  window.addEventListener('error', function(e) {
    buffer.push(correlate({
      timestamp: Date.now(),
      level: 'error',
      message: e.message || 'Uncaught error',
      attributes: {
        runtime: 'browser',
        'window.url': window.location.pathname,
        'error.filename': e.filename,
        'error.lineno': e.lineno,
        'error.colno': e.colno
      },
      serviceName: serviceName
    }));
  });

  window.addEventListener('unhandledrejection', function(e) {
    buffer.push(correlate({
      timestamp: Date.now(),
      level: 'error',
      message: e.reason ? (e.reason.message || String(e.reason)) : 'Unhandled promise rejection',
      attributes: {
        runtime: 'browser',
        'window.url': window.location.pathname,
        'error.type': 'unhandledrejection'
      },
      serviceName: serviceName
    }));
  });
})();`;
}
