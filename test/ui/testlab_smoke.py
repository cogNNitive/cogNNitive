"""Playwright UI smoke test for the TestLab coverage domain.

Opens the latest generated model console and workspace hub via file:// and
asserts they render the expected content without JS errors. Runs locally with:

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
    hub = latest(os.path.join(args.lab_root, 'artifacts', 'workspace_hub_*.html'))
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

        # ---- Workspace hub ----
        page2 = browser.new_page()
        page2.on('pageerror', lambda e: page_errors.append('hub: ' + str(e)))
        page2.goto(f'file://{hub}')
        page2.wait_for_selector('#models-grid', timeout=15000)
        check('hub title', (page2.text_content('#workspace-title') or '').strip() == 'TestLab Coverage Workspace')
        check('hub active count is 1', (page2.text_content('#active-count') or '').strip() == '1')
        check('hub card present', page2.locator('#models-grid', has_text='TestLab Coverage Model').count() == 1)
        check('hub card console-ready', 'Console Ready' in (page2.text_content('#models-grid') or ''))
        page2.fill('#search-input', 'xyz-nomatch')
        page2.wait_for_timeout(300)
        check('hub search filters to empty', 'No models or consoles matching' in (page2.text_content('#models-grid') or ''))
        page2.fill('#search-input', '')
        page2.wait_for_timeout(300)
        page2.click('.launch-btn')
        page2.wait_for_selector('#preview-panel:not(.hidden)', timeout=10000)
        frame = page2.frame_locator('#preview-frame')
        frame.locator('body').wait_for(timeout=15000)
        frame_text = frame.locator('body').text_content() or ''
        check('hub preview iframe loads console', 'Element 1A' in frame_text)
        page2.screenshot(path=os.path.join(args.out_dir, 'hub.png'), full_page=True)
        check('hub has no JS page errors', not [e for e in page_errors if e.startswith('hub:')])

        browser.close()

    if failures:
        print(f'\n{len(failures)} FAILURE(S): {failures}')
        return 1
    print('\nALL UI CHECKS PASSED')
    return 0


if __name__ == '__main__':
    sys.exit(main())
