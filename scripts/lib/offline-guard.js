/**
 * scripts/lib/offline-guard.js
 *
 * Fail-CLOSED offline enforcement, loaded with `node --require` (verify.js puts
 * it in NODE_OPTIONS for every child process; quality-gates spec, "Offline mode
 * MUST be enforced, not merely asserted").
 *
 * When `NN_OFFLINE=1`, every non-loopback outbound connection is refused with an
 * `ENN_OFFLINE` error BEFORE any socket I/O: `net.Socket#connect` (which also
 * covers http, https, undici/fetch), `tls.connect`, the `dns` lookup/resolve
 * families, and `globalThis.fetch`. Loopback (localhost, 127.0.0.0/8, ::1) and
 * IPC paths stay allowed so suites that run a local server keep working.
 * Because the guard sits at the socket layer, a test that stubs or misses a
 * transport cannot reach the network: a missed stub fails, it does not pass.
 *
 * With `NN_OFFLINE` unset the module installs nothing.
 */

// The guard monkey-patches platform modules, so these are deliberately untyped.
const net = /** @type {any} */ (require('node:net'));
const tls = /** @type {any} */ (require('node:tls'));
const dns = /** @type {any} */ (require('node:dns'));
const state = /** @type {any} */ (process);
const globals = /** @type {any} */ (globalThis);
const { isLoopbackHost } = require('./loopback.js');

function offlineError(what, host) {
  return Object.assign(new Error(`Network access is disabled (NN_OFFLINE=1): refusing ${what} to ${host}`), {
    code: 'ENN_OFFLINE',
  });
}

function assertLoopback(what, host) {
  if (!isLoopbackHost(host)) throw offlineError(what, host);
}

/** Host of a `net.Socket#connect` call, or undefined for IPC / handle connects. */
function connectHost(args) {
  let first = args[0];
  // net.connect() hands over the normalized `[options, cb]` array.
  if (Array.isArray(first)) return connectHost(first);
  if (first !== null && typeof first === 'object') {
    if (first.path && !first.port) return undefined;
    return first.host;
  }
  if (typeof first === 'string' && !/^\d+$/.test(first)) return undefined; // IPC path
  return typeof args[1] === 'string' ? args[1] : undefined;
}

function install() {
  if (state.__nnOfflineGuardInstalled) return;
  state.__nnOfflineGuardInstalled = true;

  const origConnect = net.Socket.prototype.connect;
  net.Socket.prototype.connect = function guardedConnect(...args) {
    assertLoopback('connect', connectHost(args));
    return origConnect.apply(this, args);
  };
  net.Socket.prototype.connect.__nnOfflineGuard = true;

  const origTlsConnect = tls.connect;
  tls.connect = function guardedTlsConnect(...args) {
    const first = args[0];
    const host = first !== null && typeof first === 'object' ? first.host || first.servername : args[1];
    assertLoopback('tls.connect', typeof host === 'string' ? host : undefined);
    return origTlsConnect.apply(this, args);
  };

  const hostFns = ['lookup', 'resolve', 'resolve4', 'resolve6', 'resolveAny', 'resolveCname', 'resolveMx', 'resolveNs', 'resolveSrv', 'resolveTxt', 'reverse'];
  for (const fn of hostFns) {
    const orig = dns[fn];
    if (typeof orig === 'function') {
      dns[fn] = function guardedDns(host, ...rest) {
        if (fn !== 'reverse') assertLoopback(`dns.${fn}`, host);
        return orig.call(this, host, ...rest);
      };
    }
    const origP = dns.promises[fn];
    if (typeof origP === 'function') {
      dns.promises[fn] = async function guardedDnsPromise(host, ...rest) {
        if (fn !== 'reverse') assertLoopback(`dns.promises.${fn}`, host);
        return origP.call(this, host, ...rest);
      };
    }
  }

  if (typeof globals.fetch === 'function') {
    const origFetch = globals.fetch;
    globals.fetch = async function guardedFetch(input, init) {
      const raw = typeof input === 'string' || input instanceof URL ? String(input) : input && input.url;
      let host;
      try {
        host = new URL(raw).hostname;
      } catch (_) {
        host = String(raw);
      }
      assertLoopback('fetch', host);
      return origFetch.call(this, input, init);
    };
  }
}

if (process.env.NN_OFFLINE === '1') install();

module.exports = { install };
