import { expect, test } from '@playwright/test'

test('home page renders and offers badge creation', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Shake Badge/)
  await expect(page.getByRole('button', { name: '建立我的名牌' })).toBeVisible()
})
