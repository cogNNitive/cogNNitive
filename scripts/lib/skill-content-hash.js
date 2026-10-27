/**
 * scripts/lib/skill-content-hash.js
 *
 * Canonical forwarder to the per-file skill content-hash helper in
 * skills/nn-preflight/scripts/lib/skill-content-hash.js. Keeps a single
 * implementation shared by the skills manager and preflight while preserving
 * the standalone autonomy of the distributed nn-preflight skill package
 * (same pattern as scripts/lib/yaml-lite.js).
 */

module.exports = require('../../skills/nn-preflight/scripts/lib/skill-content-hash');
