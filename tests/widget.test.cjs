const { chromium } = require('playwright');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Set by tests/run.mjs
const BASE = process.env.WAW_BASE;
const MAIL = process.env.WAW_MAIL;
const SHOTS = process.env.WAW_SHOTS;
const shot = (name) => path.join(SHOTS, name);
const EXAMPLES = `${BASE}/examples/`;
const results = [];
const ok = (name) => { results.push(`PASS ${name}`); };

(async () => {
  const browser = await chromium.launch();

  async function newPage(opts = {}) {
    const context = await browser.newContext(opts);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
    return { page, errors, context };
  }

  // --- Example 1: minimal, launcher -------------------------------------------------
  {
    const { page, errors } = await newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(EXAMPLES + '01-minimal.html');
    const launcher = page.locator('whatsapp-widget .waw-launcher');
    await assert.ok(await launcher.isVisible(), 'launcher visible');
    assert.strictEqual(await page.locator('whatsapp-widget .waw-badge').innerText().then(t => t.split('\n')[0]), '1');
    assert.ok(!(await page.locator('whatsapp-widget .waw-window').isVisible()), 'window hidden initially');
    ok('ex1 launcher + badge, window hidden');

    await launcher.click();
    await page.waitForSelector('whatsapp-widget .waw-bubble.in >> text=How can we help', { timeout: 5000 });
    assert.strictEqual(await launcher.getAttribute('aria-expanded'), 'true');
    assert.strictEqual(await page.locator('whatsapp-widget .waw-badge').count(), 0);
    const focused = await page.evaluate(() => document.querySelector('whatsapp-widget').shadowRoot.activeElement?.className);
    assert.strictEqual(focused, 'waw-input');
    assert.strictEqual(await page.locator('whatsapp-widget .waw-status').innerText(), 'Usually replies within an hour');
    ok('ex1 open: welcome typed, focus in input, status restored');

    const send = page.locator('whatsapp-widget .waw-send');
    assert.ok(await send.isDisabled(), 'send disabled when empty');
    await page.locator('whatsapp-widget .waw-input').fill('Do you have gluten-free bread & rolls?');
    assert.ok(!(await send.isDisabled()), 'send enabled');
    await page.screenshot({ path: shot('ex1-typing.png') });

    const openCalls = [];
    await page.exposeFunction('__recordOpen', (u) => openCalls.push(u));
    await page.evaluate(() => { const o = window.open; window.open = (u, ...a) => { window.__recordOpen(u); return o(u, ...a); }; });
    await page.keyboard.press('Enter');
    await page.waitForSelector('whatsapp-widget .waw-bubble.out');
    await page.waitForTimeout(100);
    assert.strictEqual(openCalls[0], 'https://wa.me/490000000000?text=Do%20you%20have%20gluten-free%20bread%20%26%20rolls%3F');
    assert.strictEqual(await page.locator('whatsapp-widget .waw-input').inputValue(), '');
    assert.ok(await page.locator('whatsapp-widget .waw-bubble.info a').getAttribute('href').then(h => h.startsWith('https://wa.me/490000000000')));
    ok('ex1 send via Enter: correct wa.me URL, input cleared, fallback link');
    await page.mouse.move(10, 400);
    await page.locator('whatsapp-widget .waw-input').blur();
    await page.waitForTimeout(300);
    await page.screenshot({ path: shot('ex1-sent.png') });
    const b = await page.locator('whatsapp-widget .waw').boundingBox();
    await page.screenshot({ path: shot('preview.png'), clip: { x: b.x - 30, y: b.y - 30, width: b.width + 50, height: b.height + 50 } });

    await page.locator('whatsapp-widget .waw-input').focus();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    assert.ok(!(await page.locator('whatsapp-widget .waw-window').isVisible()), 'closed via Escape');
    const focusBack = await page.evaluate(() => document.querySelector('whatsapp-widget').shadowRoot.activeElement?.className);
    assert.strictEqual(focusBack, 'waw-launcher');
    ok('ex1 Escape closes, focus back to launcher');
    await page.screenshot({ path: shot('ex1-closed.png') });
    assert.deepStrictEqual(errors, []);
    ok('ex1 no console errors');
  }

  // --- Example 2: external buttons, no launcher ---------------------------------------
  {
    const { page, errors } = await newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(EXAMPLES + '02-external-button.html');
    assert.strictEqual(await page.locator('whatsapp-widget .waw-launcher').count(), 0);
    ok('ex2 no launcher');
    await page.locator('button[data-wa-open*="lavender"]').click();
    await page.waitForSelector('whatsapp-widget .waw-bubble.in', { timeout: 5000 });
    assert.strictEqual(await page.locator('whatsapp-widget .waw-input').inputValue(), 'Hi, do you ship the organic lavender set?');
    const box = await page.locator('whatsapp-widget .waw-window').boundingBox();
    assert.ok(box.x < 100, 'window on the left');
    const inputHeight = await page.locator('whatsapp-widget .waw-input').evaluate((n) => n.clientHeight);
    assert.ok(inputHeight > 50, `prefilled textarea grows: ${inputHeight}`);
    ok('ex2 data-wa-open prefills message, textarea grows, window on the left');
    await page.waitForTimeout(400);
    await page.screenshot({ path: shot('ex2-prefilled.png') });

    await page.locator('whatsapp-widget .waw-close').click();
    await page.waitForTimeout(300);
    await page.locator('a.button[data-wa-open]').click();
    await page.waitForTimeout(300);
    assert.ok(page.url().endsWith('02-external-button.html'), 'link default prevented');
    assert.ok(await page.locator('whatsapp-widget .waw-window').isVisible());
    ok('ex2 <a href=wa.me data-wa-open> opens widget instead of navigating');

    await page.evaluate(() => WhatsAppWidget.close());
    await page.waitForTimeout(300);
    assert.ok(!(await page.locator('whatsapp-widget .waw-window').isVisible()));
    await page.evaluate(() => WhatsAppWidget.open({ message: 'API' }));
    assert.strictEqual(await page.locator('whatsapp-widget .waw-input').inputValue(), 'API');
    ok('ex2 JS API open/close');
    assert.deepStrictEqual(errors, []);
    ok('ex2 no console errors');
  }

  // --- Example 3: JS init, German, auto-open, 3 messages ------------------------------
  {
    const { page, errors } = await newPage({ viewport: { width: 1280, height: 800 }, locale: 'en-US' });
    await page.goto(EXAMPLES + '03-javascript-api.html');
    await page.waitForSelector('whatsapp-widget .waw-window.is-open', { timeout: 6000 });
    const focused = await page.evaluate(() => document.querySelector('whatsapp-widget').shadowRoot.activeElement);
    assert.strictEqual(focused, null, 'auto-open must not steal focus');
    ok('ex3 auto-open after delay without stealing focus');
    await page.waitForFunction(() => document.querySelector('whatsapp-widget').shadowRoot.querySelectorAll('.waw-bubble.in:not([aria-hidden])').length === 3, null, { timeout: 10000 });
    await page.waitForTimeout(300);
    assert.strictEqual(await page.locator('whatsapp-widget .waw-launcher').getAttribute('aria-label'), 'WhatsApp-Chat öffnen');
    assert.ok((await page.locator('whatsapp-widget .waw-notice').innerText()).includes('Datenschutzerklärung'));
    ok('ex3 three welcome messages, German texts');
    await page.screenshot({ path: shot('ex3-de.png') });
    assert.deepStrictEqual(errors, []);
    ok('ex3 no console errors');
  }

  // --- Example 3 in dark mode ---------------------------------------------------------
  {
    const { page } = await newPage({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' });
    await page.goto(EXAMPLES + '03-javascript-api.html');
    await page.waitForFunction(() => document.querySelector('whatsapp-widget')?.shadowRoot.querySelectorAll('.waw-bubble.in:not([aria-hidden])').length === 3, null, { timeout: 12000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: shot('ex3-dark.png') });
    ok('ex3 dark theme (auto)');
  }

  // --- Mobile ---------------------------------------------------------------------
  {
    const { page, errors } = await newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await page.goto(EXAMPLES + '03-javascript-api.html');
    await page.waitForTimeout(3800);
    assert.ok(!(await page.locator('whatsapp-widget .waw-window').isVisible()), 'no auto-open on mobile');
    ok('mobile: no auto-open on small screens');
    await page.locator('whatsapp-widget .waw-launcher').tap();
    await page.waitForFunction(() => document.querySelector('whatsapp-widget').shadowRoot.querySelectorAll('.waw-bubble.in:not([aria-hidden])').length === 3, null, { timeout: 10000 });
    const box = await page.locator('whatsapp-widget .waw-window').boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= 390, `fits viewport: ${JSON.stringify(box)}`);
    ok('mobile: window fits viewport');
    await page.screenshot({ path: shot('mobile-de.png') });
    assert.deepStrictEqual(errors, []);
  }

  // --- Config edge cases ------------------------------------------------------------
  {
    const { page, errors } = await newPage();
    await page.route(`${BASE}/blank`, (r) => r.fulfill({ contentType: 'text/html', body: '<html lang="en"><body></body></html>' }));
    await page.goto(`${BASE}/blank`);
    await page.addScriptTag({ url: `${BASE}/whatsapp-widget.js` });
    const r = await page.evaluate(() => ({
      national: WhatsAppWidget.buildUrl('0911 123456', 'x'),
      brackets: WhatsAppWidget.buildUrl('+49 (0) 911 12 34-56', 'Hallo Welt'),
      zeros: WhatsAppWidget.buildUrl('0049 911 123456', ''),
      web: WhatsAppWidget.buildUrl('+49 911 123456', 'a b', 'web'),
      app: WhatsAppWidget.buildUrl('+49 911 123456', 'a', 'app'),
      initNoPhone: WhatsAppWidget.init({ name: 'x' }),
    }));
    assert.strictEqual(r.national, '');
    assert.strictEqual(r.brackets, 'https://wa.me/49911123456?text=Hallo%20Welt');
    assert.strictEqual(r.zeros, 'https://wa.me/49911123456');
    assert.strictEqual(r.web, 'https://web.whatsapp.com/send?phone=49911123456&text=a%20b');
    assert.strictEqual(r.app, 'whatsapp://send?phone=49911123456&text=a');
    assert.strictEqual(r.initNoPhone, null);
    assert.ok(errors.some((e) => e.includes('international format')), 'warns about national format');
    ok('phone normalisation + URL builder + errors for invalid config');
    console.log('   (expected) console output:', errors);

    // XSS: welcome text must not be interpreted as HTML
    await page.evaluate(() => WhatsAppWidget.init({ phone: '+49 911 123456', welcome: ['<img src=x onerror=window.__xss=1>'], typing: false }));
    await page.waitForTimeout(50);
    await page.evaluate(() => WhatsAppWidget.open());
    await page.waitForTimeout(100);
    assert.strictEqual(await page.evaluate(() => window.__xss), undefined);
    ok('welcome text is escaped (no HTML injection)');
    await page.evaluate(() => WhatsAppWidget.destroy());
    assert.strictEqual(await page.locator('whatsapp-widget').count(), 0);
    ok('destroy removes the widget');
  }

  await browser.close();
  console.log(results.join('\n'));
})().catch((e) => { console.error(results.join('\n')); console.error('FAIL', e); process.exit(1); });
