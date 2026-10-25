import { test, expect, type Page } from '@playwright/test'

const PHOTO_COUNT = 24 // 4 galleries × 6 photos

// Keep analytics out of test runs (and out of your real visitor count),
// and give the counter a known value so we can assert on it.
test.beforeEach(async ({ page }) => {
  await page.route('**/gc.zgo.at/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }),
  )
  await page.route('**/goatcounter.com/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({ count: '1,234' }),
    }),
  )
})

async function scrollThroughPage(page: Page) {
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.8)
    const end = document.documentElement.scrollHeight
    for (let y = 0; y <= end + step; y += step) {
      window.scrollTo(0, y)
      await new Promise((resolve) => setTimeout(resolve, 150))
    }
  })
  await page.waitForTimeout(1000) // let smooth-scroll + lazy images settle
}

test('loads without runtime errors and the loading screen goes away', async ({ page }) => {
  const problems: string[] = []
  page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`))
  page.on('console', (msg) => {
    // Network noise (fonts/analytics offline in CI) is not a site bug.
    if (msg.type() === 'error' && !/Failed to load resource/i.test(msg.text())) {
      problems.push(`console.error: ${msg.text()}`)
    }
  })

  await page.goto('/')
  await expect(page).toHaveTitle(/Sachin/)
  await expect(page.locator('.scene-bg canvas')).toBeVisible()
  await expect(page.locator('.loading-screen')).toHaveCount(0, { timeout: 60_000 })
  await expect(page.locator('h1.about-title')).toHaveText('About Sachin')

  expect(problems, problems.join('\n')).toEqual([])
})

test('page is marked English and allows pinch-zoom', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('.about')).toHaveAttribute('lang', 'en')

  const viewport = await page.locator('meta[name="viewport"]').getAttribute('content')
  expect(viewport).not.toMatch(/maximum-scale|user-scalable\s*=\s*(no|0)/i)
})

test('has a description and link-preview tags', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.{40,}/)
  await expect(page.locator('meta[property="og:title"]')).toHaveCount(1)
})

test('visitor counter shows the fetched value', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#visitor-count')).toHaveText('1,234')
})

test('every gallery photo loads and the closing quote appears', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.loading-screen')).toHaveCount(0, { timeout: 60_000 })

  await scrollThroughPage(page)

  const photos = page.locator('.wk-photo img')
  await expect(photos).toHaveCount(PHOTO_COUNT)
  await expect
    .poll(() =>
      photos.evaluateAll(
        (els) => els.filter((el) => !(el as HTMLImageElement).naturalWidth).length,
      ),
    )
    .toBe(0)

  await expect(page.locator('.closing-quote')).toHaveCSS('opacity', '1', { timeout: 15_000 })
})
