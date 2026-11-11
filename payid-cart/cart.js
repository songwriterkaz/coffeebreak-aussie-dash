/* Coffeebreak PayID cart core. Browser global and CommonJS. No network calls. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.CoffeebreakCart = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var PAYMENT_LABEL = 'Pay by PayID (Teachers Mutual Bank): darkokaz@gmx.com';
  var PAYID = 'darkokaz@gmx.com';
  var ORDERS_EMAIL = 'darkokaz@gmx.com';
  var MAX_QTY = 20;
  var ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function dollarsToMinor(value) {
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) throw new TypeError('invalid amount');
      if (value < 0) throw new RangeError('negative amount');
      var scaled = value * 100;
      var nearest = Math.round(scaled);
      if (Math.abs(scaled - nearest) < 1e-6) return dollarsToMinor(formatMinor(nearest));
      var fixed = value.toFixed(10).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
      return dollarsToMinor(fixed);
    }
    var text = String(value).trim();
    if (text.charAt(0) === '-') throw new RangeError('negative amount');
    if (!/^\d+(\.\d+)?$/.test(text)) throw new TypeError('invalid amount');
    var parts = text.split('.');
    var whole = parts[0];
    var frac = parts[1] || '';
    if (whole.length > 14) throw new RangeError('amount too large');
    var cents = BigInt(whole) * 100n + BigInt((frac + '00').slice(0, 2));
    if (frac.length > 2 && frac.charAt(2) >= '5') cents += 1n;
    if (cents > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('amount too large');
    return Number(cents);
  }

  function assertMinor(value, label) {
    if (!Number.isSafeInteger(value)) throw new TypeError((label || 'minor unit') + ' must be an integer');
  }

  function lineMinor(unitMinor, qty) {
    assertMinor(unitMinor, 'unit minor');
    assertMinor(qty, 'quantity');
    var total = BigInt(unitMinor) * BigInt(qty);
    if (total > BigInt(Number.MAX_SAFE_INTEGER) || total < 0n) throw new RangeError('line total too large');
    return Number(total);
  }

  function sumMinor(values) {
    var total = 0n;
    for (var i = 0; i < values.length; i++) {
      assertMinor(values[i], 'minor unit');
      total += BigInt(values[i]);
    }
    if (total > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('total too large');
    return Number(total);
  }

  function formatMinor(minor) {
    assertMinor(minor, 'minor unit');
    if (minor < 0) throw new RangeError('negative amount');
    var whole = Math.floor(minor / 100);
    var frac = String(minor % 100).padStart(2, '0');
    return whole + '.' + frac;
  }

  function normalizeLines(lines, maxQty) {
    if (!Array.isArray(lines)) return { ok: false, error: 'lines must be a list' };
    var out = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (!line || typeof line.id !== 'string' || !line.id) return { ok: false, error: 'line id is required' };
      if (typeof line.name !== 'string') return { ok: false, error: 'line name is required' };
      if (!Number.isSafeInteger(line.unitMinor) || line.unitMinor < 0) return { ok: false, error: 'unit minor must be an integer' };
      if (!Number.isInteger(line.qty)) return { ok: false, error: 'quantity must be an integer' };
      if (line.qty < 1 || line.qty > maxQty) return { ok: false, error: 'quantity out of range' };
      var same = null;
      for (var j = 0; j < out.length; j++) {
        if (out[j].id === line.id && out[j].unitMinor === line.unitMinor) same = out[j];
      }
      if (same) {
        if (same.qty + line.qty > maxQty) return { ok: false, error: 'quantity out of range' };
        same.qty += line.qty;
      } else {
        out.push({ id: line.id, name: line.name, unitMinor: line.unitMinor, qty: line.qty });
      }
    }
    return { ok: true, lines: out };
  }

  function snapshotKey(storeId, currency, lines) {
    var sorted = lines.map(function (line) {
      return { id: line.id, unitMinor: line.unitMinor, qty: line.qty };
    }).sort(function (a, b) {
      if (a.id < b.id) return -1;
      if (a.id > b.id) return 1;
      return a.unitMinor - b.unitMinor;
    });
    return JSON.stringify({ storeId: storeId, currency: String(currency || '').toUpperCase(), lines: sorted });
  }

  function mintReference(rng) {
    var random = typeof rng === 'function' ? rng : function () {
      var cryptoObj = globalThis.crypto;
      if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
        var buf = new Uint32Array(1);
        cryptoObj.getRandomValues(buf);
        return buf[0] / 4294967296;
      }
      return Math.random();
    };
    var out = 'CB';
    for (var i = 0; i < 14; i++) {
      var roll = Number(random());
      if (!Number.isFinite(roll) || roll < 0) roll = 0;
      var index = Math.floor(roll * ALPHABET.length);
      if (index >= ALPHABET.length) index = ALPHABET.length - 1;
      out += ALPHABET.charAt(index);
    }
    return out;
  }

  function buildState(input) {
    input = input || {};
    var maxQty = Number.isInteger(input.maxQty) ? input.maxQty : MAX_QTY;
    if (typeof input.storeId !== 'string' || !input.storeId) return { ok: false, error: 'store id is required' };
    var normalized = normalizeLines(input.lines || [], maxQty);
    if (!normalized.ok) return normalized;
    var currency = String(input.currency || '');
    var key = normalized.lines.length ? snapshotKey(input.storeId, currency, normalized.lines) : '';
    var previous = input.previous;
    var reference = null;
    if (key) {
      if (previous && previous.snapshotKey === key && typeof previous.reference === 'string' && previous.reference) {
        reference = previous.reference;
      } else {
        reference = mintReference(input.rng);
      }
    }
    var claim = input.customerClaimsPaid === true && normalized.lines.length > 0;
    return {
      ok: true,
      storeId: input.storeId,
      currency: currency,
      lines: normalized.lines,
      note: typeof input.note === 'string' ? input.note.slice(0, 500) : '',
      snapshotKey: key,
      reference: reference,
      customerClaimsPaid: claim,
      paid: false,
      confirmed: false,
      status: claim ? 'customer_reported_unverified' : 'draft'
    };
  }

  function changeQty(lines, id, qty, maxQty) {
    var limit = Number.isInteger(maxQty) ? maxQty : MAX_QTY;
    var current = (lines || []).map(function (line) {
      return { id: line.id, name: line.name, unitMinor: line.unitMinor, qty: line.qty };
    });
    if (!Number.isInteger(qty) || qty < 1 || qty > limit) {
      return { ok: false, error: 'quantity out of range', lines: current };
    }
    var found = false;
    for (var i = 0; i < current.length; i++) {
      if (current[i].id === id) {
        current[i].qty = qty;
        found = true;
      }
    }
    if (!found) return { ok: false, error: 'missing line', lines: current };
    return { ok: true, lines: current };
  }

  function removeLine(lines, id) {
    return (lines || []).filter(function (line) { return line.id !== id; }).map(function (line) {
      return { id: line.id, name: line.name, unitMinor: line.unitMinor, qty: line.qty };
    });
  }

  function normalizeCurrency(value) {
    if (typeof value !== 'string') return null;
    var code = value.trim().toUpperCase();
    return /^[A-Z]{3}$/.test(code) ? code : null;
  }

  function decideMode(config, currency) {
    if (config.mode === 'demo' || config.demo === true) return 'demo';
    if (config.mode === 'gated' || config.physicalOrders === 'closed') return 'gated';
    if (config.mode === 'enquiry-only') return 'enquiry-only';
    if (config.fulfilmentVerified !== true) return 'enquiry-only';
    if (currency !== 'AUD') return 'quote-before-transfer';
    if (config.mode === 'quote-before-transfer') return 'quote-before-transfer';
    return 'manual-aud';
  }

  function noticesFor(mode) {
    var common = [
      'This page does not move money.',
      'A saved browser cart is not delivered to the merchant.'
    ];
    if (mode === 'manual-aud') {
      return common.concat([
        'Copy the amount, PayID, and reference into the visitor\'s own banking app.',
        'The merchant checks the bank receipt before treating a transfer as received.'
      ]);
    }
    if (mode === 'quote-before-transfer') {
      return common.concat([
        'Prices stay in their original currency. This page does not calculate an Australian dollar amount.'
      ]);
    }
    if (mode === 'gated') {
      return common.concat(['Physical orders are closed. Payment is not requested.']);
    }
    if (mode === 'demo') {
      return common.concat(['Demo items are not for sale. Do not send a payment.']);
    }
    return common.concat(['Payment is not requested for this cart.']);
  }

  function checkout(state, config) {
    config = config || {};
    state = state || { lines: [] };
    var currency = normalizeCurrency(config.currency);
    if (!currency) {
      return {
        ok: false,
        error: 'unsupported-currency',
        requestsPayment: false,
        showTransferInstructions: false,
        paid: false,
        confirmed: false,
        bankVerified: false
      };
    }
    var lines = Array.isArray(state.lines) ? state.lines : [];
    var mode = decideMode(config, currency);
    var totalMinor = lines.length ? sumMinor(lines.map(function (line) { return lineMinor(line.unitMinor, line.qty); })) : 0;
    var claim = state.customerClaimsPaid === true && lines.length > 0;
    var asks = mode === 'manual-aud' && lines.length > 0;
    return {
      ok: true,
      mode: mode,
      currency: currency,
      lines: lines,
      totalMinor: totalMinor,
      totalLabel: formatMinor(totalMinor),
      audAmountMinor: asks ? totalMinor : null,
      requestsPayment: asks,
      showTransferInstructions: asks,
      reference: lines.length ? (state.reference || null) : null,
      paymentLabel: PAYMENT_LABEL,
      payId: PAYID,
      ordersEmail: ORDERS_EMAIL,
      customerClaimsPaid: claim,
      paid: false,
      confirmed: false,
      bankVerified: false,
      status: claim ? 'customer_reported_unverified' : 'draft',
      notices: noticesFor(mode)
    };
  }

  function externalPaymentFlags() {
    return {
      paid: false,
      confirmed: false,
      ignored: true,
      reason: 'A link, saved flag, or return from a bank app cannot mark this cart paid.'
    };
  }

  function safeRecord(state) {
    var claim = state && state.customerClaimsPaid === true && state.paid !== true && state.status !== 'paid' && state.status !== 'confirmed';
    return {
      storeId: state.storeId,
      currency: state.currency,
      lines: state.lines || [],
      note: state.note || '',
      snapshotKey: state.snapshotKey || '',
      reference: state.reference || null,
      customerClaimsPaid: claim,
      paid: false,
      confirmed: false,
      status: claim ? 'customer_reported_unverified' : 'draft'
    };
  }

  function persist(storage, key, state) {
    var safe = safeRecord(state || {});
    storage.setItem(key, JSON.stringify(safe));
    return safe;
  }

  function restore(storage, key) {
    var text;
    try {
      text = storage.getItem(key);
      if (!text) return null;
      var raw = JSON.parse(text);
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
      var built = buildState({
        storeId: typeof raw.storeId === 'string' ? raw.storeId : '',
        currency: typeof raw.currency === 'string' ? raw.currency : 'AUD',
        lines: Array.isArray(raw.lines) ? raw.lines : [],
        previous: raw.snapshotKey && raw.reference ? { snapshotKey: raw.snapshotKey, reference: raw.reference } : null,
        customerClaimsPaid: raw.customerClaimsPaid === true && raw.paid !== true && raw.confirmed !== true && raw.status !== 'paid' && raw.status !== 'confirmed',
        rng: Math.random
      });
      if (!built.ok) return null;
      built.paid = false;
      built.confirmed = false;
      if (raw.paid === true || raw.confirmed === true || raw.status === 'paid' || raw.status === 'confirmed') {
        built.customerClaimsPaid = false;
        built.status = 'draft';
      }
      return built;
    } catch (err) {
      return null;
    }
  }

  function renderLineHtml(line) {
    return '<li>' + escapeHtml(line.name) + ' × ' + line.qty + ' · ' + formatMinor(lineMinor(line.unitMinor, line.qty)) + '</li>';
  }

  function summaryText(view) {
    var rows = (view.lines || []).map(function (line) {
      return line.qty + ' x ' + line.name + ' @ ' + formatMinor(line.unitMinor) + ' ' + (view.currency || '');
    });
    return [
      'Coffeebreak cart summary',
      'This note is not proof of payment.',
      'Currency: ' + (view.currency || ''),
      'Total: ' + (view.totalLabel || '0.00'),
      'Reference: ' + (view.reference || '(none)'),
      PAYMENT_LABEL,
      'Orders contact: ' + ORDERS_EMAIL,
      rows.join('\n'),
      'A saved cart and this file are not delivered to the merchant.',
      'The merchant checks the bank receipt before treating a transfer as received.'
    ].filter(Boolean).join('\n');
  }

  function receiptDraft(view) {
    return {
      filename: 'coffeebreak-cart-summary.txt',
      type: 'text/plain',
      body: summaryText(view || {}),
      merchantDelivered: false
    };
  }

  function draftMailto(view, options) {
    var to = options && options.to ? options.to : ORDERS_EMAIL;
    if (to !== ORDERS_EMAIL) throw new Error('orders contact must be the published address');
    var file = receiptDraft(view || {});
    var subject = 'Coffeebreak cart ' + ((view && view.reference) || 'draft');
    return {
      href: 'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(file.body),
      sent: false,
      delivered: false,
      notice: 'Opening this draft does not send email. The message stays on this page until you send it from your own mail app.'
    };
  }

  function payidMountUrl(scriptSrc) {
    var next = String(scriptSrc || '').replace(/\/(?:apps\/[^/]+\/(?:shop\/|assets\/)?|[^/]+\/)cb-pay\.js(?:[?#].*)?$/, '/payid-cart/mount.js');
    return next && next !== String(scriptSrc || '') ? next : '';
  }

  function catalogueCheckout(items, options) {
    options = options || {};
    var currency = normalizeCurrency(options.currency || '');
    if (!currency) {
      return {
        ok: false,
        error: 'unsupported-currency',
        requestsPayment: false,
        showTransferInstructions: false,
        paid: false,
        confirmed: false,
        bankVerified: false
      };
    }
    var lines = [];
    var list = Array.isArray(items) ? items : [];
    for (var i = 0; i < list.length; i++) {
      var item = list[i] || {};
      if (item.amount == null || item.amount === '') continue;
      var unit;
      try { unit = dollarsToMinor(item.amount); }
      catch (err) {
        return {
          ok: false,
          error: 'invalid-amount',
          requestsPayment: false,
          showTransferInstructions: false,
          paid: false,
          confirmed: false,
          bankVerified: false
        };
      }
      lines.push({
        id: String(item.id || item.name || ('line-' + i)),
        name: String(item.name || 'Item'),
        unitMinor: unit,
        qty: item.qty == null ? 1 : item.qty
      });
    }
    var state = buildState({
      storeId: options.storeId || 'store',
      currency: currency,
      lines: lines,
      previous: options.previous,
      rng: options.rng,
      customerClaimsPaid: false
    });
    if (!state.ok) {
      state.requestsPayment = false;
      state.paid = false;
      state.confirmed = false;
      return state;
    }
    var view = checkout(state, {
      currency: currency,
      fulfilmentVerified: options.fulfilmentVerified === true,
      mode: options.mode,
      demo: options.demo === true
    });
    view.snapshotKey = state.snapshotKey;
    return view;
  }

  function copyFields(view) {
    view = view || {};
    return {
      amount: view.totalLabel || null,
      payId: view.payId || PAYID,
      reference: view.reference || null
    };
  }

  return {
    PAYMENT_LABEL: PAYMENT_LABEL,
    PAYID: PAYID,
    ORDERS_EMAIL: ORDERS_EMAIL,
    MAX_QTY: MAX_QTY,
    dollarsToMinor: dollarsToMinor,
    lineMinor: lineMinor,
    sumMinor: sumMinor,
    formatMinor: formatMinor,
    escapeHtml: escapeHtml,
    buildState: buildState,
    changeQty: changeQty,
    removeLine: removeLine,
    checkout: checkout,
    externalPaymentFlags: externalPaymentFlags,
    persist: persist,
    restore: restore,
    renderLineHtml: renderLineHtml,
    summaryText: summaryText,
    receiptDraft: receiptDraft,
    draftMailto: draftMailto,
    copyFields: copyFields,
    payidMountUrl: payidMountUrl,
    catalogueCheckout: catalogueCheckout
  };
});
