import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const game = require('./game-cart.js');
const root = new URL('..', import.meta.url);
const expected = {
  "index.html": {
    "storeId": "aussie-dash",
    "currency": null,
    "items": [
      {
        "id": "full",
        "name": "Coffeebreak Aussie Dash by Coffeebreak",
        "amount": null,
        "currency": null,
        "gap": "Price coming soon. No payment is requested."
      }
    ]
  }
};

function walk(dir, rel, out) {
  for (const name of readdirSync(dir)) {
    if (name === '.git' || name === 'payid-cart' || name === 'node_modules') continue;
    const abs = join(dir, name);
    const next = rel ? rel + '/' + name : name;
    if (statSync(abs).isDirectory()) walk(abs, next, out);
    else if (name.endsWith('.html')) out.push(next);
  }
}

function page(rel) {
  return readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
}

test('this standalone page mounts the shared PayID cart', () => {
  const pages = [];
  walk(root.pathname, '', pages);
  assert.deepEqual(pages.filter((rel) => rel !== 'controller.html').sort(), Object.keys(expected).sort());
  for (const rel of pages) {
    const html = page(rel);
    if (rel === 'controller.html') {
      assert.doesNotMatch(html, /cb-game-cart/);
      continue;
    }
    assert.match(html, /<!--cb-game-cart-start-->/, rel);
    const block = html.match(/<!--cb-game-cart-start-->([\s\S]*?)<!--cb-game-cart-end-->/)[1];
    assert.equal(block.includes('!'), false, rel);
    assert.doesNotMatch(block, /headspace|paypal|gumroad|payhip|ko-fi/i, rel);
    const data = JSON.parse(block.match(/<script type="application\/json" id="cb-game-cart-data">([\s\S]*?)<\/script>/)[1]);
    assert.deepEqual(data, expected[rel], rel);
    assert.match(html, /payid-cart\/cart\.js/, rel);
    assert.match(html, /payid-cart\/game-cart\.js/, rel);
    assert.match(html, /payid-cart\/game-mount\.js/, rel);
    assert.match(html, /https:\/\/www\.tesla\.com/, rel);
    assert.match(html, /https:\/\/www\.starlink\.com/, rel);
    assert.match(html, /third-party/i, rel);
    assert.match(html, /Report a problem|cbreport\.js/, rel);
    assert.match(html, /alt="Coffeebreak/, rel);
    assert.doesNotMatch(html, /gumroad\.com|payhip\.com|ko-fi\.com|href="#pending"|store pending/i, rel);
  }
});

test('catalogue add, quantity, remove, and total never mark a payment received', () => {
  for (const rel of Object.keys(expected)) {
    const data = expected[rel];
    const session = game.createSession({ storeId: data.storeId, currency: data.currency, items: data.items, rng: () => 0.25 });
    const sellable = data.items.filter((item) => item.amount != null && game.isSellableName(item.name));
    if (!sellable.length) {
      assert.equal(game.add(session, data.items[0].id).ok, false, rel);
      const view = game.view(session);
      assert.equal(view.requestsPayment, false, rel);
      assert.equal(view.paid, false, rel);
      assert.match(view.gap, /Price coming soon\. No payment is requested\./, rel);
      continue;
    }
    assert.equal(game.add(session, sellable[0].id).ok, true, rel);
    assert.equal(game.setQty(session, sellable[0].id, 2).ok, true, rel);
    const view = game.view(session);
    assert.equal(view.paid, false, rel);
    assert.equal(view.confirmed, false, rel);
    assert.equal(view.bankVerified, false, rel);
    assert.equal(view.currency, data.currency, rel);
    assert.equal(view.paymentLabel, 'Pay by PayID (Teachers Mutual Bank): darkokaz@gmx.com', rel);
    const unit = Number(sellable[0].amount);
    assert.equal(view.totalLabel, (unit * 2).toFixed(2), rel);
    if (data.currency === 'USD') {
      assert.equal(view.requestsPayment, false, rel);
      assert.equal(view.audAmountMinor, null, rel);
      assert.equal(view.mode, 'quote-before-transfer', rel);
    }
    if (data.currency === 'AUD') {
      assert.equal(view.requestsPayment, true, rel);
      assert.equal(view.showTransferInstructions, true, rel);
      assert.equal(view.mode, 'manual-aud', rel);
    }
    assert.equal(game.remove(session, sellable[0].id).length, 0, rel);
    assert.equal(game.view(session).requestsPayment, false, rel);
  }
});
