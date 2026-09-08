import { test, expect } from '@playwright/test'

/**
 * Knowledge-unit deep links (`?ku=`). The pill→preview flow itself is covered
 * at component level (FileRefPill / FilePreviewModal suites); full pill→preview
 * e2e is not feasible here because workspace loading requires the File System
 * Access directory picker, which Playwright cannot grant. These specs pin the
 * URL plumbing instead: the workspace guard preserves deep-link params.
 */
test.describe('knowledge-unit deep links', () => {
  test('workspace guard preserves ?ku= (and hash) redirecting to home', async ({ page }) => {
    await page.goto('/workspace?ku=models%2FG.md%40%23%23nn-test#Alpha')

    // Guard redirects to home (no workspace loaded) keeping query + hash.
    await expect(page).toHaveURL(/ku=models/)
    await expect(page).toHaveURL(/#Alpha$/)
  })
})
