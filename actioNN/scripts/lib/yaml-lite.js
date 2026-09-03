/**
 * scripts/lib/yaml-lite.js
 *
 * Canonical forwarder to the YAML subset parser in skills/nn-preflight/scripts/lib/yaml-lite.js.
 * Eliminates duplicate parser implementations across the repository while preserving
 * the standalone autonomy of the distributed nn-preflight skill package.
 */

module.exports = require('../../skills/nn-preflight/scripts/lib/yaml-lite');

