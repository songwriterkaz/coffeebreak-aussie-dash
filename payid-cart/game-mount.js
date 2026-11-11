/* In-page game cart. Uses CoffeebreakGameCart and CoffeebreakCart. It does not mark a payment received. */
(function () {
  var G = window.CoffeebreakGameCart;
  var C = window.CoffeebreakCart;
  if (!G || !C) return;

  function boot() {
    var section = document.getElementById('cb-game-cart');
    var dataEl = document.getElementById('cb-game-cart-data');
    if (!section || !dataEl || section.dataset.ready === '1') return;
    section.dataset.ready = '1';
    var data = {};
    try { data = JSON.parse(dataEl.textContent || '{}'); } catch (err) { data = {}; }
    var session = G.createSession({
      storeId: section.getAttribute('data-store') || data.storeId || 'game',
      currency: data.currency || null,
      items: data.items || []
    });
    var storage = null;
    try { storage = window.localStorage; } catch (err) { storage = null; }
    var key = 'cb-payid-game-' + String(session.storeId).replace(/\W/g, '');
    if (storage && session.currency) {
      var restored = C.restore(storage, key);
      if (restored && restored.lines) {
        session.lines = restored.lines.filter(function (line) {
          return session.items.some(function (item) { return item.id === line.id && item.amount != null && G.isSellableName(item.name); });
        });
        session.previous = restored;
        session.customerClaimsPaid = restored.customerClaimsPaid === true;
      }
    }

    var style = document.createElement('style');
    style.textContent = '#cb-game-cart-toggle,#cb-game-cart-panel button,#cb-game-cart-panel a{min-height:44px;min-width:44px}#cb-game-cart-toggle{position:fixed;right:12px;bottom:76px;z-index:2147483002;background:#e8559a;color:#fff;border:0;border-radius:999px;padding:10px 16px;font:700 16px/1.2 system-ui,sans-serif;cursor:pointer}#cb-game-cart-panel{position:fixed;right:12px;bottom:128px;z-index:2147483002;width:min(420px,calc(100% - 24px));max-height:70vh;overflow:auto;background:#fff;color:#3a1f2c;border:2px solid #e8559a;border-radius:16px;padding:12px;font:15px/1.4 system-ui,sans-serif}#cb-game-cart-panel h2{margin:0 0 8px;font-size:1.1rem}#cb-game-cart-panel button{background:#e8559a;color:#fff;border:0;border-radius:10px;padding:8px 12px;font:inherit;font-weight:700;cursor:pointer}#cb-game-cart-panel button.quiet{background:#fff;color:#b8336f;border:1px solid #e8559a}#cb-game-cart-panel a{color:#b8336f;font-weight:700}#cb-game-cart-panel .row{display:flex;justify-content:space-between;gap:8px;align-items:center;margin:8px 0}';
    document.head.appendChild(style);

    var toggle = document.createElement('button');
    toggle.id = 'cb-game-cart-toggle';
    toggle.type = 'button';
    toggle.textContent = 'Cart';
    var panel = document.createElement('div');
    panel.id = 'cb-game-cart-panel';
    panel.hidden = true;
    toggle.addEventListener('click', function () {
      panel.hidden = !panel.hidden;
      toggle.textContent = panel.hidden ? 'Cart' : 'Close cart';
      toggle.setAttribute('aria-expanded', panel.hidden ? 'false' : 'true');
    });

    function persist() {
      if (!storage || !session.currency) return;
      var state = C.buildState({
        storeId: session.storeId,
        currency: session.currency,
        lines: session.lines,
        previous: session.previous,
        customerClaimsPaid: false
      });
      if (state.ok) {
        session.previous = state;
        C.persist(storage, key, state);
      }
    }

    function lineButton(label, className, onClick) {
      var button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      if (className) button.className = className;
      button.addEventListener('click', onClick);
      return button;
    }

    function paint() {
      var current = G.view(session);
      panel.replaceChildren();
      var heading = document.createElement('h2');
      heading.textContent = 'Coffeebreak cart';
      panel.appendChild(heading);

      session.items.forEach(function (item) {
        var row = document.createElement('div');
        row.className = 'row';
        var info = document.createElement('div');
        var name = document.createElement('strong');
        name.textContent = item.name;
        var price = document.createElement('div');
        price.textContent = G.priceLabel(item);
        info.append(name, price);
        row.appendChild(info);
        if (item.amount != null && G.isSellableName(item.name)) {
          row.appendChild(lineButton('Add to cart', '', function () {
            G.add(session, item.id);
            persist();
            paint();
          }));
        }
        panel.appendChild(row);
      });

      var lines = document.createElement('div');
      if (!session.lines.length) {
        var empty = document.createElement('p');
        empty.textContent = 'Your cart is empty.';
        lines.appendChild(empty);
      } else {
        session.lines.forEach(function (line) {
          var row = document.createElement('div');
          row.className = 'row';
          var info = document.createElement('div');
          var name = document.createElement('strong');
          name.textContent = line.name;
          var meta = document.createElement('div');
          meta.textContent = line.qty + ' x ' + C.formatMinor(line.unitMinor) + ' ' + (session.currency || '');
          info.append(name, meta);
          var qty = document.createElement('div');
          qty.append(
            lineButton('Reduce quantity', 'quiet', function () {
              if (line.qty <= 1) G.remove(session, line.id);
              else G.setQty(session, line.id, line.qty - 1);
              persist();
              paint();
            }),
            lineButton('Increase quantity', 'quiet', function () {
              G.setQty(session, line.id, line.qty + 1);
              persist();
              paint();
            }),
            lineButton('Remove', 'quiet', function () {
              G.remove(session, line.id);
              persist();
              paint();
            })
          );
          row.append(info, qty);
          lines.appendChild(row);
        });
      }
      panel.appendChild(lines);

      var payable = session.lines.length && (current.showTransferInstructions || current.mode === 'quote-before-transfer');
      if (current.mode === 'gap' || !session.currency) {
        var gap = document.createElement('p');
        gap.textContent = current.gap || G.GAP;
        panel.appendChild(gap);
      } else if (payable) {
        var total = document.createElement('p');
        total.textContent = 'Total: ' + current.totalLabel + ' ' + current.currency;
        var label = document.createElement('p');
        label.textContent = 'Pay by PayID (Teachers Mutual Bank): darkokaz@gmx.com';
        var ref = document.createElement('p');
        ref.textContent = current.reference ? 'Reference: ' + current.reference : 'Add a priced item to mint a reference.';
        panel.append(total, label, ref);
        (current.notices || []).forEach(function (text) {
          var note = document.createElement('p');
          note.textContent = text;
          panel.appendChild(note);
        });
        if (current.mode === 'quote-before-transfer') {
          var hint = document.createElement('p');
          hint.textContent = G.PAY_HINT;
          panel.appendChild(hint);
        }
        var copies = C.copyFields(current);
        panel.append(
          copyButton('Copy amount', copies.amount),
          copyButton('Copy PayID', copies.payId),
          copyButton('Copy reference', copies.reference)
        );
        if (current.reference) {
          var draft = C.draftMailto(current);
          var mailNote = document.createElement('p');
          mailNote.textContent = draft.notice;
          var link = document.createElement('a');
          link.href = draft.href;
          link.textContent = 'Open email draft';
          panel.append(mailNote, link);
        }
      }
      var report = document.createElement('p');
      var reportLink = document.createElement('a');
      reportLink.href = 'mailto:coffeebreakhq@mail.grokbot.com?subject=Coffeebreak%20game%20report';
      reportLink.textContent = 'Report a problem';
      report.appendChild(reportLink);
      panel.appendChild(report);
    }

    function copyButton(text, value) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'quiet';
      button.textContent = text;
      button.disabled = !value;
      button.addEventListener('click', function () {
        if (!value || !navigator.clipboard || !navigator.clipboard.writeText) return;
        navigator.clipboard.writeText(value).catch(function () {});
      });
      return button;
    }

    paint();
    document.body.appendChild(toggle);
    document.body.appendChild(panel);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
