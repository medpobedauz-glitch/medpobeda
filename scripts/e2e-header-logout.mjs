// E2E: signed-in students get Log out buttons in the header (desktop + mobile
// drawer). Registers a student through the app's own API, verifies the
// buttons appear, then logs out via the header button.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

  const uniq = String(Date.now()).slice(-7);
  const contact = 'logout.test.' + uniq + '@example.com';

  // Register through the app's own API so the session cookie lands in the browser.
  await page.goto(BASE + '/en/login');
  const reg = await page.evaluate(async (payload) => {
    const curricula = await (await fetch('/api/public/learn')).json();
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Logout Test',
        contact: payload.contact,
        password: 'studentPass1',
        curriculum_id: curricula.curricula?.[0]?.id ?? 1,
        preferred_lang: 'en',
      }),
    });
    return res.status;
  }, { contact });
  assert.ok([200, 201].includes(reg), 'register status ' + reg);

  // Signed in: desktop header shows My account + Log out.
  await page.goto(BASE + '/en/anatomy');
  await page.waitForSelector('.header__logout', { timeout: 20000 });
  assert.equal(await page.locator('#header-auth .header__account').isVisible(), true);
  assert.equal(await page.locator('#header-auth .header__logout').isVisible(), true);
  assert.match(await page.locator('#header-auth .header__logout').innerText(), /Log out/);
  // Guests controls hidden.
  assert.equal(await page.locator('.header__login').evaluate((el) => el.style.display === 'none' || el.hidden), true);

  // Mobile drawer: burger → My account + Log out visible.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.header__burger').click();
  assert.equal(await page.locator('.header__mobile-logout').isVisible(), true);
  assert.match(await page.locator('.header__mobile-logout').innerText(), /Log out/);

  // Log out from the drawer.
  await page.locator('.header__mobile-logout').click();
  await page.waitForURL((u) => !u.pathname.includes('/anatomy'), { timeout: 20000 });
  await page.waitForSelector('.header__login', { timeout: 20000 });
  assert.equal(await page.locator('#header-auth .header__logout').count(), 0, 'logout button gone after sign-out');
  const me = await page.evaluate(async () => (await fetch('/api/auth/me', { credentials: 'same-origin' })).status);
  assert.equal(me, 401, 'session destroyed server-side');
  console.log('mobile drawer logout OK — session destroyed, guest header restored');

  // Sign back in through the API, then log out from the DESKTOP button.
  await page.evaluate(async (payload) => {
    await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact: payload.contact, password: 'studentPass1' }),
    });
  }, { contact });
  await page.goto(BASE + '/en/anatomy');
  await page.waitForSelector('.header__logout', { timeout: 20000 });
  await page.locator('#header-auth .header__logout').click();
  await page.waitForSelector('.header__login', { timeout: 20000 });
  const me2 = await page.evaluate(async () => (await fetch('/api/auth/me', { credentials: 'same-origin' })).status);
  assert.equal(me2, 401, 'desktop logout destroys session');
  console.log('desktop logout OK');

  assert.deepEqual(errors, []);
  console.log('header logout e2e PASS — desktop + mobile, session destroyed, guest state restored');
} finally {
  await browser.close();
}
