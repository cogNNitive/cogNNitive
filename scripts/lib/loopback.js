/**
 * scripts/lib/loopback.js
 *
 * Single definition of "loopback host", shared by the offline guard preload and
 * the GitHub client's offline check.
 */

/**
 * @param {string|undefined|null} host - a hostname or IP literal, optionally bracketed
 * @returns {boolean} true for localhost, 127.0.0.0/8, ::1, the wildcard bind addresses
 *   (`::`, `0.0.0.0`, which local servers such as the render bundler listen on) and
 *   the empty host (which Node resolves to localhost).
 */
function isLoopbackHost(host) {
  if (host === undefined || host === null || host === '') return true;
  const h = String(host).toLowerCase().replace(/^\[|\]$/g, '');
  return h === 'localhost' || h === '::1' || h === '0:0:0:0:0:0:0:1' || h === '::' || h === '0.0.0.0' || /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h);
}

module.exports = { isLoopbackHost };
