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

      var message = args.map(formatArg).join(' ');
      var attrs = extractAttrs(args);
      attrs.runtime = 'browser';
      attrs['window.url'] = window.location.pathname;

      buffer.push({
        timestamp: Date.now(),
        level: LEVEL_MAP[level] || 'info',
        message: message,
        attributes: attrs,
        serviceName: serviceName
      });
    };
  });

  window.addEventListener('error', function(e) {
    buffer.push({
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
    });
  });

  window.addEventListener('unhandledrejection', function(e) {
    buffer.push({
      timestamp: Date.now(),
      level: 'error',
      message: e.reason ? (e.reason.message || String(e.reason)) : 'Unhandled promise rejection',
      attributes: {
        runtime: 'browser',
        'window.url': window.location.pathname,
        'error.type': 'unhandledrejection'
      },
      serviceName: serviceName
    });
  });
})();`;
}
