/* ============================================================
   nav.js -- shared header behaviour (index / product / cart).

   Hooks (all defined in the shared <header> block):
     [data-header]  -- the <header> element  (sticky, z-header)
     [data-burger]  -- hamburger <button>     (aria-expanded, 3 spans)
     [data-drawer]  -- mobile nav drawer      (hidden attr)

   Features
   ---------
   Frosted-on-scroll
     Adds .is-scrolled to [data-header] once scrollY > 16 px.
     CSS drives the backdrop-filter transition (header.css).
     rAF-throttled: never queues more than one paint frame.
     prefers-reduced-motion: instant toggle, skips animation.

   Burger / drawer
     Toggle: sets aria-expanded + removes/adds hidden attribute.
     Focus management: focus moves to first focusable child on
       open; returns to burger on close (Escape / outside click).
     Focus trap: Tab / Shift+Tab cycle stays inside the drawer
       while it is open.
     Close triggers: Escape key, outside-click (capture phase),
       link click inside drawer, viewport widens past 860 px.
     aria-hidden mirrors the open state for screen readers.

   Catalog filters
     [data-filter] buttons (.catalog__filter) show/hide cards by
       [data-type]; the pressed button gets .is-active, cards that
       don't match get .card.is-hidden. "all" clears the filter.
     [data-filter] nav links (header + drawer) scroll to #catalog
       and apply the matching filter — but only on the catalog page.
       On other pages they fall through to normal navigation.

   Defensive: every section no-ops when its markup is absent.
   ============================================================ */

const SCROLL_THRESHOLD = 16; // px -- threshold before .is-scrolled
const DESKTOP_BP = 860;      // px -- mirrors @media (max-width:860px) in header.css

export function initNav() {
  const header = document.querySelector('[data-header]');
  if (!header) return;

  /* Catalog filters run independently of the drawer, so wire them first —
     the burger guard below returns early on pages without a drawer. */
  initCatalogFilters();

  /* ----------------------------------------------------------
     1. FROSTED SCROLL -- rAF-throttled, reduced-motion aware
     ---------------------------------------------------------- */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let scrollTicking = false;

  const applyScroll = () => {
    header.classList.toggle('is-scrolled', window.scrollY > SCROLL_THRESHOLD);
  };

  if (reduceMotion) {
    applyScroll();
    window.addEventListener('scroll', applyScroll, { passive: true });
  } else {
    const onScroll = () => {
      if (scrollTicking) return;
      scrollTicking = true;
      requestAnimationFrame(() => {
        scrollTicking = false;
        applyScroll();
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    applyScroll();
  }

  /* ----------------------------------------------------------
     2. BURGER / DRAWER
     ---------------------------------------------------------- */
  const burger = header.querySelector('[data-burger]');
  const drawer = header.querySelector('[data-drawer]');
  if (!burger || !drawer) return;

  // Correct initial aria state
  drawer.setAttribute('aria-hidden', 'true');

  const isOpen = () => burger.getAttribute('aria-expanded') === 'true';

  // All keyboard-focusable descendants of the drawer
  const focusable = () => [
    ...drawer.querySelectorAll(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ),
  ];

  const openDrawer = () => {
    burger.setAttribute('aria-expanded', 'true');
    drawer.removeAttribute('hidden');
    drawer.setAttribute('aria-hidden', 'false');
    // Defer so element is fully visible before focus lands
    const first = focusable()[0];
    if (first) requestAnimationFrame(() => first.focus());
  };

  const closeDrawer = (returnFocus = true) => {
    if (!isOpen()) return;
    burger.setAttribute('aria-expanded', 'false');
    drawer.hidden = true;
    drawer.setAttribute('aria-hidden', 'true');
    if (returnFocus) burger.focus();
  };

  // Toggle on burger click
  burger.addEventListener('click', () => {
    isOpen() ? closeDrawer() : openDrawer();
  });

  // Close when any drawer link is activated
  drawer.addEventListener('click', (e) => {
    if (e.target.closest('a')) closeDrawer(false);
  });

  // Focus trap -- keep Tab/Shift+Tab inside open drawer
  drawer.addEventListener('keydown', (e) => {
    if (!isOpen() || e.key !== 'Tab') return;
    const items = focusable();
    if (!items.length) return;
    const first = items[0];
    const last  = items[items.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // Escape closes from anywhere on page
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) closeDrawer();
  });

  // Outside click (capture phase catches it before bubbling)
  document.addEventListener('click', (e) => {
    if (isOpen() && !header.contains(e.target)) closeDrawer(false);
  }, { capture: true });

  // Viewport widens past mobile breakpoint
  const mq = window.matchMedia(`(min-width: ${DESKTOP_BP + 1}px)`);
  const onMqChange = (e) => { if (e.matches) closeDrawer(false); };
  if (typeof mq.addEventListener === 'function') {
    mq.addEventListener('change', onMqChange);
  } else {
    mq.addListener(onMqChange); // Safari <=13 fallback
  }
}

/* ----------------------------------------------------------
   CATALOG FILTERS
   Owns both the in-page filter buttons and the cross-page
   [data-filter] nav links. No-ops gracefully off the catalog
   page: nav links simply navigate, buttons aren't present.
   ---------------------------------------------------------- */
function initCatalogFilters() {
  const buttons = [...document.querySelectorAll('.catalog__filter[data-filter]')];
  const cards = [...document.querySelectorAll('.card[data-type]')];

  /* Apply a filter: 'all' clears it, otherwise hide non-matching cards. */
  const applyFilter = (value) => {
    for (const btn of buttons) {
      btn.classList.toggle('is-active', btn.dataset.filter === value);
    }
    for (const card of cards) {
      card.classList.toggle('is-hidden', value !== 'all' && card.dataset.type !== value);
    }
  };

  /* In-page filter buttons (only present on the catalog page). */
  for (const btn of buttons) {
    btn.addEventListener('click', () => applyFilter(btn.dataset.filter));
  }

  /* Cross-page [data-filter] nav links (header + drawer). On the catalog
     page we filter in place and let the #catalog hash scroll handle the
     rest; off it, navigation proceeds untouched so the link still works. */
  const onCatalogPage = buttons.length > 0;
  for (const link of document.querySelectorAll('a[data-filter]')) {
    link.addEventListener('click', () => {
      if (onCatalogPage) applyFilter(link.dataset.filter);
    });
  }
}
