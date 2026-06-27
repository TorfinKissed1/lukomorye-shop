/* ============================================================
   cart.js — shared cart behaviour (index / product / cart).
   A single localStorage-backed cart, owned entirely by this module.

     · reads/writes the cart array in localStorage ('lukomorye:cart')
     · wires every [data-add-to-cart] button → adds the item, animates
       the SVG check on the button (CSS .is-added drives the
       .card__check-path stroke-dashoffset) and bumps every header badge
     · keeps every header .cart__count / [data-cart-count] in sync —
       on load, on add, and across tabs (storage event)
     · on cart.html: renders [data-cart-root] line items with qty ±
       and remove, recomputes the total, and shows an empty state

   Defensive: every step no-ops when its markup is absent, so the
   same bundle runs unchanged on index.html, product.html and cart.html.
   ============================================================ */

const STORAGE_KEY = 'lukomorye:cart';

/* ---- money: integer rubles → "1 490 ₽" (ru-RU grouping) ---- */
const fmtPrice = (n) => `${new Intl.NumberFormat('ru-RU').format(Math.round(n))} ₽`;

/* ---- minimal HTML-escape for values injected into innerHTML ---- */
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

/* ---- storage I/O — always returns a clean, well-formed array ---- */
function readCart() {
  let raw;
  try {
    raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    raw = [];
  }
  if (!Array.isArray(raw)) return [];

  return raw
    .map((it) => ({
      id: String(it && it.id != null ? it.id : ''),
      name: String(it && it.name != null ? it.name : ''),
      price: Number(it && it.price) || 0,
      img: String(it && it.img != null ? it.img : ''),
      qty: Math.max(1, Math.floor(Number(it && it.qty) || 1)),
    }))
    .filter((it) => it.id);
}

function writeCart(cart) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch {
    /* private mode / quota — keep the in-memory UI working anyway */
  }
}

/* ---- derived helpers ---- */
const totalQty = (cart) => cart.reduce((n, it) => n + it.qty, 0);
const totalSum = (cart) => cart.reduce((n, it) => n + it.price * it.qty, 0);

/* ============================================================ */
export function initCart() {
  /* ---------- header badges: keep every count in sync ---------- */
  const badges = [...document.querySelectorAll('.cart__count, [data-cart-count]')];

  const syncBadges = (cart, { bump = false } = {}) => {
    const count = totalQty(cart);
    for (const badge of badges) {
      badge.textContent = String(count);
      badge.dataset.empty = String(count === 0);
      if (bump && count > 0) {
        badge.classList.remove('is-bumped');
        void badge.offsetWidth; // reflow so rapid repeat adds re-trigger
        badge.classList.add('is-bumped');
        clearTimeout(badge._bumpTimer);
        badge._bumpTimer = setTimeout(() => badge.classList.remove('is-bumped'), 320);
      }
    }
  };

  /* ---------- mutations (each returns the fresh cart) ---------- */
  const addItem = ({ id, name, price, img }) => {
    const cart = readCart();
    const found = cart.find((it) => it.id === id);
    if (found) found.qty += 1;
    else cart.push({ id, name, price, img, qty: 1 });
    writeCart(cart);
    return cart;
  };

  const setQty = (id, qty) => {
    let cart = readCart();
    if (qty <= 0) {
      cart = cart.filter((it) => it.id !== id);
    } else {
      const found = cart.find((it) => it.id === id);
      if (found) found.qty = qty;
    }
    writeCart(cart);
    return cart;
  };

  const removeItem = (id) => {
    const cart = readCart().filter((it) => it.id !== id);
    writeCart(cart);
    return cart;
  };

  /* ---------- add-to-cart buttons ([data-add-to-cart]) ---------- */
  for (const btn of document.querySelectorAll('[data-add-to-cart]')) {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      if (!id) return;

      const cart = addItem({
        id,
        name: btn.dataset.name || '',
        price: Number(btn.dataset.price) || 0,
        img: btn.dataset.img || '',
      });

      syncBadges(cart, { bump: true });
      renderCart(cart); // live-refresh if we're on cart.html

      /* CSS drives the check: .is-added → .card__check-path stroke-dashoffset:0 */
      btn.classList.add('is-added');
      const label = btn.querySelector('.card__add-label, [data-add-label]');
      if (label && label.dataset.idle === undefined) {
        label.dataset.idle = label.textContent;
        label.textContent = 'Добавлено';
      }
      clearTimeout(btn._addedTimer);
      btn._addedTimer = setTimeout(() => {
        btn.classList.remove('is-added');
        if (label && label.dataset.idle !== undefined) {
          label.textContent = label.dataset.idle;
          delete label.dataset.idle;
        }
      }, 1500);
    });
  }

  /* ---------- cart.html render targets ---------- */
  const root = document.querySelector('.cart__items, [data-cart-root]');
  const emptyEl = document.querySelector('.cart__empty');
  const summaryEl = document.querySelector('.cart__summary');
  const totalEls = [...document.querySelectorAll('[data-cart-total]')];

  /* One cart row — matches the structure styled in css/blocks/cart.css.
     Thumbnail is .u-img u-img--square so its <img> is absolute-cover
     (enforced by base .u-img > img — never static). */
  function itemRow(it) {
    const name = esc(it.name || it.id);
    const media = it.img
      ? `<img src="${esc(it.img)}" width="160" height="160" loading="lazy" alt="${name}" />`
      : '';
    return `
      <div class="cart__item" data-line="${esc(it.id)}">
        <span class="cart__thumb u-img u-img--square">${media}</span>
        <div class="cart__meta">
          <span class="cart__item-type u-label">В корзине</span>
          <span class="cart__item-name">${name}</span>
          <span class="cart__item-note">${fmtPrice(it.price)} за штуку</span>
        </div>
        <div class="cart__controls">
          <span class="cart__price-row">${fmtPrice(it.price * it.qty)}</span>
          <div class="cart__qty" role="group" aria-label="Количество — ${name}">
            <button class="cart__qty-btn" type="button" data-dec="${esc(it.id)}" aria-label="Убрать одну">−</button>
            <span class="cart__qty-val" aria-live="polite">${it.qty}</span>
            <button class="cart__qty-btn" type="button" data-inc="${esc(it.id)}" aria-label="Добавить одну">+</button>
          </div>
          <button class="cart__remove" type="button" data-remove="${esc(it.id)}" aria-label="Удалить «${name}» из корзины">
            <svg class="icon" width="16" height="16" viewBox="0 0 24 24" stroke-width="1.6" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18"/>
            </svg>
            Удалить
          </button>
        </div>
      </div>`;
  }

  function renderCart(cart = readCart()) {
    if (!root) return;

    if (!cart.length) {
      /* empty: clear the rows and zero the totals */
      root.innerHTML = '';
      root.hidden = true;
      for (const el of totalEls) el.textContent = fmtPrice(0);

      /* If checkout just succeeded, the success block is showing inside the
         summary — keep the summary visible and skip the empty pitch so the
         confirmation stays on screen. Otherwise show the empty state. */
      const successShown = !!(summaryEl && summaryEl.querySelector('.cart__success.is-visible'));
      if (emptyEl) emptyEl.classList.toggle('is-visible', !successShown);
      if (summaryEl) summaryEl.hidden = successShown ? false : true;
      return;
    }

    /* has items: hide the empty block, render rows, show summary + total */
    if (emptyEl) emptyEl.classList.remove('is-visible');
    if (summaryEl) summaryEl.hidden = false;
    root.hidden = false;
    root.innerHTML = cart.map(itemRow).join('');

    const sum = fmtPrice(totalSum(cart));
    for (const el of totalEls) el.textContent = sum;
  }

  /* Delegated controls — survive every re-render. */
  if (root) {
    root.addEventListener('click', (e) => {
      const inc = e.target.closest('[data-inc]');
      const dec = e.target.closest('[data-dec]');
      const rm = e.target.closest('[data-remove]');
      if (!inc && !dec && !rm) return;

      let cart;
      if (inc) {
        const id = inc.dataset.inc;
        const cur = readCart().find((it) => it.id === id);
        cart = setQty(id, (cur ? cur.qty : 0) + 1);
      } else if (dec) {
        const id = dec.dataset.dec;
        const cur = readCart().find((it) => it.id === id);
        cart = setQty(id, (cur ? cur.qty : 1) - 1);
      } else {
        cart = removeItem(rm.dataset.remove);
      }

      syncBadges(cart);
      renderCart(cart);
    });

    renderCart(); // first paint
  }

  /* ---------- checkout placed → empty the cart (fired by form.js) ---------- */
  document.addEventListener('cart:clear', () => {
    writeCart([]);
    const cart = readCart();
    syncBadges(cart);
    renderCart(cart);
  });

  /* ---------- cross-tab live sync ---------- */
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY) return;
    const cart = readCart();
    syncBadges(cart);
    renderCart(cart);
  });

  /* ---------- initial badge paint (every page) ---------- */
  syncBadges(readCart());
}
