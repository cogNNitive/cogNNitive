#!/bin/sh
set -e

CACHE_DIR="${HOME}/.cache/innfo-mcp"
VERSION_FILE="${CACHE_DIR}/current-version.txt"
BUNDLE_FILE="${CACHE_DIR}/innfo-mcp.bundle.js"
MANIFEST_URL="https://innfo.cognnitive.com/cdn/manifest.json"

mkdir -p "${CACHE_DIR}"

LATEST=""
if command -v curl >/dev/null 2>&1; then
    LATEST=$(curl -sL --connect-timeout 3 "${MANIFEST_URL}" 2>/dev/null | sed 's/.*"latest"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' 2>/dev/null || echo "")
elif command -v wget >/dev/null 2>&1; then
    LATEST=$(wget -q -O - --timeout=3 "${MANIFEST_URL}" 2>/dev/null | sed 's/.*"latest"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' 2>/dev/null || echo "")
fi

if [ -n "${LATEST}" ]; then
    CACHED=""
    if [ -f "${VERSION_FILE}" ]; then
        CACHED=$(cat "${VERSION_FILE}")
    fi
    if [ "${LATEST}" != "${CACHED}" ]; then
        echo "Downloading innfo-mcp ${LATEST}..."
        BUNDLE_URL="https://innfo.cognnitive.com/cdn/innfo-mcp-${LATEST}.bundle.js"
        if command -v curl >/dev/null 2>&1; then
            curl -sL "${BUNDLE_URL}" -o "${BUNDLE_FILE}"
        elif command -v wget >/dev/null 2>&1; then
            wget -q "${BUNDLE_URL}" -O "${BUNDLE_FILE}"
        fi
        echo "${LATEST}" > "${VERSION_FILE}"
        echo "Done."
    fi
elif [ ! -f "${BUNDLE_FILE}" ]; then
    echo "ERROR: No internet and no cached bundle. Run with internet first."
    exit 1
fi

exec node "${BUNDLE_FILE}" "$@"
