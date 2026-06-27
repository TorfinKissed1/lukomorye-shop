/* ============================================================
   main.js — shared entry on EVERY page.
   Wires the shared modules. Each init is defensive: it no-ops
   when its target markup is absent, so the same bundle runs on
   index.html, product.html and cart.html.
   ============================================================ */
import { initReveal } from './modules/reveal.js';
import { initNav } from './modules/nav.js';
import { initCart } from './modules/cart.js';
import { initGallery } from './modules/gallery.js';
import { initForm } from './modules/form.js';

const boot = () => {
  initNav();
  initCart();     // localStorage cart + header counter + add-to-cart SVG check + cart.html render
  initGallery();  // product angle hover / swap (product.html)
  initForm();     // checkout validation + success (cart.html) and newsletter (index.html)
  initReveal();   // scroll reveals — last, so layout is settled
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
