import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);

function api() {
  return require('./game-cart.js');
}

function seqRng(start = 2) {
  let n = start;
  return () => {
    n += 1;
    return ((n * 173) % 997) / 997;
  };
}

test('AUD game cart adds, changes quantity, removes, totals, and shows PayID instructions', () => {
  const game = api();
  const session = game.createSession({
    storeId: 'canva-games',
    currency: 'AUD',
    items: [{ id: 'arcade', name: 'Coffeebreak Arcade', amount: '5.00' }],
    rng: seqRng()
  });
  assert.equal(game.add(session, 'arcade').ok, true);
  assert.equal(session.lines[0].qty, 1);
  assert.equal(game.setQty(session, 'arcade', 3).ok, true);
  const view = game.view(session);
  assert.equal(view.ok, true);
  assert.equal(view.currency, 'AUD');
  assert.equal(view.totalLabel, '15.00');
  assert.equal(view.mode, 'manual-aud');
  assert.equal(view.requestsPayment, true);
  assert.equal(view.showTransferInstructions, true);
  assert.equal(view.paymentLabel, 'Pay by PayID (Teachers Mutual Bank): darkokaz@gmx.com');
  assert.equal(view.paid, false);
  assert.equal(view.confirmed, false);
  assert.equal(view.bankVerified, false);
  assert.match(view.reference, /^CB[A-Z2-9]{14}$/);
  assert.equal(game.remove(session, 'arcade').length, 0);
  const empty = game.view(session);
  assert.equal(empty.requestsPayment, false);
  assert.equal(empty.totalLabel, '0.00');
  assert.equal(empty.reference, null);
});

test('USD game prices stay in USD and are not relabelled as an Australian amount', () => {
  const game = api();
  const session = game.createSession({
    storeId: 'apps/rooftop-kick-goals-buy',
    currency: 'USD',
    items: [{ id: 'full', name: 'Rooftop Kick Goals', amount: '10.00' }],
    rng: seqRng(4)
  });
  game.add(session, 'full');
  game.setQty(session, 'full', 2);
  const view = game.view(session);
  assert.equal(view.currency, 'USD');
  assert.equal(view.totalLabel, '20.00');
  assert.equal(view.audAmountMinor, null);
  assert.equal(view.requestsPayment, false);
  assert.equal(view.mode, 'quote-before-transfer');
  assert.equal(view.paymentLabel, 'Pay by PayID (Teachers Mutual Bank): darkokaz@gmx.com');
  assert.equal(view.paid, false);
  assert.equal(Object.hasOwn(view, 'exchangeRate'), false);
});

test('a missing price stays a labelled gap and cannot be checked out', () => {
  const game = api();
  const session = game.createSession({
    storeId: 'pin-the-condom-on-the-banana',
    currency: null,
    items: [{ id: 'full', name: 'Pin the Condom on the Banana', amount: null }],
    rng: seqRng(1)
  });
  assert.equal(game.priceLabel(session.items[0]), 'Price coming soon');
  assert.equal(game.add(session, 'full').ok, false);
  const view = game.view(session);
  assert.equal(view.lines.length, 0);
  assert.equal(view.requestsPayment, false);
  assert.equal(view.paid, false);
  assert.match(view.gap, /Price coming soon/);
  assert.match(view.gap, /No payment is requested/);
});

test('quantity bounds and a customer claim never mark the game paid', () => {
  const game = api();
  const session = game.createSession({
    storeId: 'mens-games/drag-race',
    currency: 'USD',
    items: [{ id: 'full', name: 'CB Muscle Drag full game', amount: '10.00' }],
    rng: seqRng(6)
  });
  game.add(session, 'full');
  const over = game.setQty(session, 'full', 21);
  assert.equal(over.ok, false);
  assert.equal(session.lines[0].qty, 1);
  session.customerClaimsPaid = true;
  const view = game.view(session);
  assert.equal(view.paid, false);
  assert.equal(view.confirmed, false);
  assert.equal(view.customerClaimsPaid, true);
  assert.notEqual(view.status, 'paid');
});

test('loot and paid-chance packs are not sold in the game cart', () => {
  const game = api();
  assert.equal(game.isSellableName('Mystery loot box'), false);
  assert.equal(game.isSellableName('Season pass'), true);
  const session = game.createSession({
    storeId: 'apps/street-brawl',
    currency: 'USD',
    items: [
      { id: 'skins', name: 'Premium skins', amount: '2.00' },
      { id: 'loot', name: 'Mystery loot box', amount: '5.00' }
    ],
    rng: seqRng(3)
  });
  assert.equal(game.add(session, 'loot').ok, false);
  assert.equal(game.add(session, 'skins').ok, true);
  assert.equal(session.lines.length, 1);
  assert.equal(session.lines[0].id, 'skins');
});

test('published game copy keeps its price and currency', () => {
  const game = api();
  assert.deepEqual(game.readOffer('<title>Coffeebreak Arcade</title><div class="price">Full version $5 AUD</div>', 'canva-games/index.html').items, [
    { id: 'full', name: 'Coffeebreak Arcade', amount: '5.00', currency: 'AUD' }
  ]);
  const mens = game.readOffer('<title>CB Muscle Drag</title><a>Buy full game $10</a>', 'mens-games/drag-race/index.html');
  assert.equal(mens.currency, 'USD');
  assert.equal(mens.items[0].amount, '10.00');
  assert.equal(mens.items[0].currency, 'USD');
  const buy = game.readOffer('<title>Buy Rooftop Kick Goals</title><p class="price">$10 USD</p>', 'apps/rooftop-kick-goals-buy/index.html');
  assert.equal(buy.currency, 'USD');
  assert.equal(buy.items[0].amount, '10.00');
  const bare = game.readOffer('<title>Coffeebreak Karaoke</title><p>Buy for $5 on this page.</p>', 'apps/karaoke/index.html');
  assert.equal(bare.currency, null);
  assert.equal(bare.items[0].amount, null);
  assert.match(bare.items[0].gap, /Price coming soon/);
  const packs = game.readOffer(
    '<title>Coffeebreak Street Brawl</title><h3>Premium skins</h3><p><b>$2 USD</b></p><h3>Iron chin pack</h3><p><b>$3 USD</b></p>',
    'apps/street-brawl/index.html'
  );
  assert.equal(packs.currency, 'USD');
  assert.deepEqual(packs.items.map((item) => item.amount), ['2.00', '3.00']);
  const rebate = game.readOffer('<title>Coffee Card</title><p>pay $10 then claim $2 back</p>', 'coffee-card-game/index.html');
  assert.equal(rebate.items[0].amount, null);
});

test('added cart text has no exclamation mark, Headspace, PayPal, or Gumroad', () => {
  const game = api();
  const mount = readFileSync(new URL('./game-mount.js', import.meta.url), 'utf8');
  const src = readFileSync(new URL('./game-cart.js', import.meta.url), 'utf8');
  for (const text of game.UI_STRINGS) {
    assert.equal(text.includes('!'), false, text);
    assert.doesNotMatch(text, /headspace|paypal|gumroad|payhip|ko-fi/i);
  }
  assert.match(mount, /Pay by PayID \(Teachers Mutual Bank\): darkokaz@gmx.com/);
  assert.match(mount, /CoffeebreakGameCart/);
  assert.match(mount, /Add to cart/);
  assert.match(mount, /Reduce quantity/);
  assert.match(mount, /Increase quantity/);
  assert.match(mount, /Remove/);
  assert.doesNotMatch(mount, /I have paid|payment confirmed|order sent|headspace|paypal|gumroad/i);
  assert.doesNotMatch(src, /headspace|paypal|gumroad/i);
  assert.match(src, /fulfilmentVerified:\s*true/);
  assert.doesNotMatch(src, /fulfilmentVerified:\s*false/);
});

test('known game pages are in scope and stores, mail, and music tools are not', () => {
  const game = api();
  assert.equal(game.isGamePage('mens-games/drag-race/index.html', '<title>CB Muscle Drag</title>'), true);
  assert.equal(game.isGamePage('mens-games/buy.html', '<title>Buy full game</title>'), true);
  assert.equal(game.isGamePage('canva-games/index.html', '<title>Coffeebreak Arcade</title>'), true);
  assert.equal(game.isGamePage('coffee-card-game/index.html', '<title>COFFEE: The Coffeebreak Card Game</title>'), true);
  assert.equal(game.isGamePage('condom-challenge/index.html', '<title>Coffeebreak Condom Challenge</title>'), true);
  assert.equal(game.isGamePage('pin-the-condom-on-the-banana/index.html', '<title>Pin the Condom on the Banana</title>'), true);
  assert.equal(game.isGamePage('apps/karaoke/index.html', '<title>Coffeebreak Karaoke</title>'), true);
  assert.equal(game.isGamePage('apps/street-brawl/index.html', '<title>Coffeebreak Street Brawl</title>'), true);
  assert.equal(game.isGamePage('apps/money-atm/index.html', '<title>Coffeebreak Manifest Money ATM</title>'), true);
  assert.equal(game.isGamePage('apps/sensory-room/index.html', '<title>Coffeebreak Sensory Room</title>'), true);
  assert.equal(game.isGamePage('target-range/index.html', '<title>Coffeebreak Target Range</title>'), true);
  assert.equal(game.isGamePage('shoes/index.html', '<title>Coffeebreak Shoes</title>'), false);
  assert.equal(game.isGamePage('apps/flowers/index.html', '<title>Flowers</title>'), false);
  assert.equal(game.isGamePage('mail-demo/index.html', '<title>Coffeebreak Mail</title>'), false);
  assert.equal(game.isGamePage('apps/song-studio/index.html', '<title>Coffeebreak Song Studio</title>'), false);
  assert.equal(game.isGamePage('yellow-pages/index.html', '<title>Yellow Pages</title>'), false);
  assert.equal(game.isGamePage('war-antiques-and-militaria/index.html', '<title>War Antiques</title>'), false);
  assert.equal(game.isGamePage('apps/sensory-room/shop/index.html', '<title>Sensory Shop</title>'), false);
});
