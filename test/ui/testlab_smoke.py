"""Playwright UI smoke test for the TestLab console fixture.

Opens the console the exporter writes today -- ``test/fixtures/testlab/domaiNN_console.html``,
the same committed artifact the ``console-fixture`` step of ``scripts/verify.js`` keeps
reproducible -- and asserts it renders the expected domain content with no JS page error
and no non-CDN failed request. Runs locally with:

  npm run test:ui

(or directly: python test/ui/testlab_smoke.py --lab-root test/fixtures/testlab
--out-dir temp/ui-smoke). Requires Python Playwright + Chromium:

  pip install playwright && playwright install chromium

It used to open the frozen
``artifacts/TestLab_coverage_TestLab_console/TestLab_coverage_TestLab_console_20261013T045336Z.html``
snapshot, so the smoke validated a month-old artifact and every shell change after it
went unexercised -- which is how a stylesheet the shell no longer loads survived for weeks
(#664, backlog console-ui-smoke-current-console). The frozen snapshot is no longer opened
by anything here; if the console file is missing, regenerate it first:

  node scripts/export-console.mjs test/fixtures/testlab --domain --no-open
"""
import argparse
import os
import sys

from playwright.sync_api import sync_playwright

# The domain content below contains arrows and dashes, and the script prints what it read, so a
# Windows console (cp1252) would crash on the first PASS line instead of reporting the verdict.
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

CONSOLE_FILE = 'domaiNN_console.html'
REGEN_COMMAND = 'node scripts/export-console.mjs test/fixtures/testlab --domain --no-open'

# The domain content the exported console must show. `Element 1A`-`2A` and the two probes
# live in the coverage model, which the whole-domain export renders first.
EXPECTED_TEXT = [
    'Element 1A',
    'Element 1B',
    'Element 1C',
    'Element 2A',
    'Image traceability probe',
    'Very long description probe',
]

# Hosts a console may reach: the shell's optional CDN assets. Everything else that fails
# is a broken local reference, which is exactly what this smoke is here to catch.
ALLOWED_HOSTS = ('cdn.tailwindcss.com', 'fonts.googleapis.com', 'cdn.jsdelivr.net', 'raw.githubusercontent.com')


def console_path(lab_root):
    path = os.path.abspath(os.path.join(lab_root, CONSOLE_FILE))
    if not os.path.isfile(path):
        raise SystemExit(f'no console at {path}; export it first:\n  {REGEN_COMMAND}')
    return path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--lab-root', required=True)
    ap.add_argument('--out-dir', required=True)
    args = ap.parse_args()

    console = console_path(args.lab_root)
    os.makedirs(args.out_dir, exist_ok=True)
    failures = []

    def check(name, cond, extra=''):
        print(('PASS' if cond else 'FAIL'), '-', name, extra)
        if not cond:
            failures.append(name)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--allow-file-access-from-files'])
        page = browser.new_page()
        page_errors = []
        bad_requests = []
        page.on('pageerror', lambda e: page_errors.append(str(e)))
        page.on('requestfailed', lambda r: bad_requests.append(f'{r.url} ({r.failure})'))

        # ---- Domain console ----
        page.goto(f'file://{console}')
        # The whole-domaiNN console lands on the Domain tab; Knowledge is one click away.
        page.wait_for_selector('#nn-tab-domain .nn-summary-model', timeout=15000)
        active_tab = page.get_attribute('#nn-view-tabs .nn-view-tab.active', 'data-tab')
        check('console lands on the Domain tab', active_tab == 'domain', repr(active_tab))
        page.click('#nn-view-tabs .nn-view-tab[data-tab="explorer"]')
        page.wait_for_selector('#nn-content', timeout=15000)
        page.wait_for_function(
            "document.querySelector('#nn-content').textContent.includes('Element 1A')",
            timeout=15000,
        )
        content = page.text_content('#nn-content') or ''
        for needle in EXPECTED_TEXT:
            check(f'console shows {needle!r}', needle in content)
        matrices = page.text_content('#nn-matrices') or ''
        check('console matrices show crossing', 'relevant' in matrices, repr(matrices[:160]))
        rail_items = page.locator('#nn-rail a, #nn-rail button, #nn-rail li').count()
        check('console rail has nav entries', rail_items > 0, f'({rail_items} found)')
        page.fill('#nn-search', '1B')
        page.wait_for_timeout(500)
        check('console search accepts input', page.input_value('#nn-search') == '1B')
        page.screenshot(path=os.path.join(args.out_dir, 'console.png'))
        check('console has no JS page errors', len(page_errors) == 0, repr(page_errors[:3]))
        env_only = [u for u in bad_requests if not any(h in u for h in ALLOWED_HOSTS)]
        check('console has no non-CDN failed requests', len(env_only) == 0, repr(env_only[:3]))

        browser.close()

    if failures:
        print(f'\n{len(failures)} FAILURE(S): {failures}')
        return 1
    print('\nALL UI CHECKS PASSED')
    return 0


if __name__ == '__main__':
    sys.exit(main())
