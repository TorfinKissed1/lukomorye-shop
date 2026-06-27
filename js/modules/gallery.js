/* ============================================================
   gallery.js -- product image gallery + catalog card hover swap.

   Handles two separate (both optional) patterns:

   A. CATALOG CARD HOVER SWAP (index.html)
      Each .card__media contains:
        .card__img--front  (default visible image)
        .card__img--back   (alt-angle, shown on hover)
      CSS uses opacity/transform; JS only needs to be aware so
      it can respect prefers-reduced-motion by disabling the
      --back visibility altogether (removes the class that would
      make the swap visible).  No JS event listeners required
      when motion is fully in CSS -- but we need to unhook the
      transition when reduced-motion is requested.

   B. PRODUCT PAGE GALLERY (product.html)
      Markup expected:
        [data-gallery-stage]   -- wrapper of the large <img>
        [data-thumb]           -- thumbnail buttons/links
          data-full="..."      -- URL of the full-size image
          data-alt="..."       -- alt text for the stage image
        [data-passport-toggle] -- mobile spec-panel toggle button
        [data-passport-panel]  -- spec panel (hidden attr)

      Behaviour:
        Clicking a thumb cross-fades the stage image.
        Active thumb gets .is-active + aria-current="true".
        prefers-reduced-motion: instant swap, no cross-fade.
        Keyboard: thumbs are natively focusable (links/buttons);
          Enter/Space trigger the existing click handler.

   Defensive: every sub-feature no-ops when its markup is absent.
   ============================================================ */

const reduceMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initGallery() {
  initCardHover();
  initProductStage();
  initPassport();
}

/* ------------------------------------------------------------------
   A. CATALOG CARD HOVER SWAP
   When reduced-motion is preferred we suppress the back-image
   entirely so the CSS hover swap never triggers. We mark each
   .card__media with [data-no-swap] and leave it to the CSS
   (via [data-no-swap] .card__img--back { display:none }) OR we
   force opacity:0 inline so the CSS animation is never visible.
   ------------------------------------------------------------------ */
function initCardHover() {
  if (!reduceMotion()) return; // motion is fine -- pure CSS handles the rest

  // Hide back images so reduced-motion users never see a flash
  document.querySelectorAll('.card__img--back').forEach((img) => {
    img.setAttribute('aria-hidden', 'true');
    img.style.setProperty('opacity', '0', 'important');
    img.style.setProperty('transition', 'none', 'important');
  });
}

/* ------------------------------------------------------------------
   B. PRODUCT PAGE GALLERY -- stage + thumbnail strip
   ------------------------------------------------------------------ */
function initProductStage() {
  const stage = document.querySelector('[data-gallery-stage]');
  const thumbs = [...document.querySelectorAll('[data-thumb]')];
  if (!stage || !thumbs.length) return;

  const stageImg = stage.querySelector('img');
  if (!stageImg) return;

  const rm = reduceMotion();

  // Cross-fade swap -- uses opacity transition unless reduced-motion
  const swapStage = (src, alt) => {
    if (!src) return;
    if (rm) {
      stageImg.src = src;
      stageImg.alt = alt;
      return;
    }
    // Fade out -> swap src -> fade in
    stageImg.style.transition = 'opacity 200ms ease';
    stageImg.style.opacity = '0';
    const onFaded = () => {
      stageImg.removeEventListener('transitionend', onFaded);
      stageImg.src = src;
      stageImg.alt = alt;
      // Force reflow so the browser registers the new src before fade-in
      void stageImg.offsetWidth;
      stageImg.style.opacity = '1';
    };
    stageImg.addEventListener('transitionend', onFaded, { once: true });
    // Safety timeout -- if transitionend doesn't fire within 300 ms, swap anyway
    setTimeout(() => {
      if (stageImg.style.opacity === '0') {
        stageImg.src = src;
        stageImg.alt = alt;
        stageImg.style.opacity = '1';
      }
    }, 300);
  };

  const activate = (target) => {
    thumbs.forEach((t) => {
      const active = t === target;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-current', active ? 'true' : 'false');
    });
  };

  thumbs.forEach((thumb, i) => {
    // Ensure keyboard accessibility -- thumbs may be <a> or <button>
    if (!thumb.hasAttribute('tabindex') &&
        thumb.tagName !== 'A' &&
        thumb.tagName !== 'BUTTON') {
      thumb.setAttribute('tabindex', '0');
      thumb.setAttribute('role', 'button');
    }

    // Sync initial active state if none is marked
    if (i === 0 && !thumbs.some((t) => t.classList.contains('is-active'))) {
      thumb.classList.add('is-active');
      thumb.setAttribute('aria-current', 'true');
    }

    const handleActivate = () => {
      const src = thumb.dataset.full || thumb.querySelector('img')?.src || '';
      const alt = thumb.dataset.alt || thumb.querySelector('img')?.alt || '';
      swapStage(src, alt);
      activate(thumb);
    };

    thumb.addEventListener('click', handleActivate);

    // Support Space/Enter for non-native-interactive elements
    thumb.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleActivate();
      }
    });
  });
}

/* ------------------------------------------------------------------
   Mobile passport (product.html spec panel collapse)
   ------------------------------------------------------------------ */
function initPassport() {
  const toggle = document.querySelector('[data-passport-toggle]');
  const panel  = document.querySelector('[data-passport-panel]');
  if (!toggle || !panel) return;

  // Set initial aria state based on hidden attribute
  const initialOpen = !panel.hidden;
  toggle.setAttribute('aria-expanded', String(initialOpen));

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    panel.hidden = open;
  });
}
