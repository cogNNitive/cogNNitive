"""Playwright UI smoke test for the TestLab coverage domain.

Opens the latest generated model console via file:// and
asserts it renders the expected content without JS errors. Runs locally with:

  npm run test:ui

(or directly: python test/ui/testlab_smoke.py --lab-root test/fixtures/testlab
--out-dir temp/ui-smoke). Requires Python Playwright + Chromium:

  pip install playwright && playwright install chromium
"""
import argparse
import glob
import os
import sys

from playwright.sync_api import sync_playwright


def latest(pattern):
    files = sorted(glob.glob(pattern))
    if not files:
        raise SystemExit(f'no files match {pattern}')
    return os.path.abspath(files[-1])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--lab-root', required=True)
    ap.add_argument('--out-dir', required=True)
    args = ap.parse_args()

    console = latest(os.path.join(args.lab_root, 'artifacts', 'TestLab_coverage_TestLab_console', 'TestLab_coverage_TestLab_console_*.html'))
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

        # ---- Model console ----
        page.goto(f'file://{console}')
        page.wait_for_selector('#innfo-content', timeout=15000)
        page.wait_for_function(
            "document.querySelector('#innfo-content').textContent.includes('Element 1A')",
            timeout=15000,
        )
        content = page.text_content('#innfo-content') or ''
        for needle in ['Element 1A', 'Element 1B', 'Element 1C', 'Element 2A', 'Image traceability probe', 'Very long description probe']:
            check(f'console shows {needle!r}', needle in content)
        matrices = page.text_content('#innfo-matrices') or ''
        check('console matrices show crossing', 'relevant' in matrices, repr(matrices[:160]))
        rail_items = page.locator('#innfo-rail a, #innfo-rail button, #innfo-rail li').count()
        check('console rail has nav entries', rail_items > 0, f'({rail_items} found)')
        page.fill('#innfo-search', '1B')
        page.wait_for_timeout(500)
        check('console search accepts input', page.input_value('#innfo-search') == '1B')
        page.screenshot(path=os.path.join(args.out_dir, 'console.png'))
        check('console has no JS page errors', len(page_errors) == 0, repr(page_errors[:3]))
        allowed_hosts = ('cdn.tailwindcss.com', 'fonts.googleapis.com', 'cdn.jsdelivr.net', 'raw.githubusercontent.com')
        env_only = [u for u in bad_requests if not any(h in u for h in allowed_hosts)]
        check('console has no non-CDN failed requests', len(env_only) == 0, repr(env_only[:3]))

        browser.close()

    if failures:
        print(f'\n{len(failures)} FAILURE(S): {failures}')
        return 1
    print('\nALL UI CHECKS PASSED')
    return 0


if __name__ == '__main__':
    sys.exit(main())
