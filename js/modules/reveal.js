/* ============================================================
   reveal.js — scroll-reveal, bulletproof.
     [data-reveal-head] → clip-path wipe left→right (headlines)
     [data-reveal]      → opacity + translateY rise (blocks)
   Both get the SAME token .is-revealed; base.css decides the motion.

   Two mechanisms so nothing can ever stay hidden:
     1) IntersectionObserver (threshold 0) — fires the moment any pixel
        crosses into the viewport (minus an 8% bottom margin).
     2) A rAF-throttled scroll/resize "sweep" fallback that reveals any
        element whose top is within 92% of the viewport height. This
        catches IO edge cases (clipped headlines, tall bands, smooth
        scroll) and self-detaches once everything is revealed.

   Respects prefers-reduced-motion: everything shown immediately.
   ============================================================ */

export function initReveal() {
  const items = [...document.querySelectorAll('[data-reveal], [data-reveal-head]')];
  if (!items.length) return;

  const reveal = (el) => el.classList.add('is-revealed');

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    items.forEach(reveal);
    return;
  }

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { reveal(e.target); obs.unobserve(e.target); }
      });
    }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });
    items.forEach((el) => io.observe(el));
  }

  /* Safety sweep — reveals anything near the viewport, self-detaches when done. */
  const vh = () => window.innerHeight || document.documentElement.clientHeight;
  const sweep = () => {
    let remaining = false;
    for (const el of items) {
      if (el.classList.contains('is-revealed')) continue;
      const r = el.getBoundingClientRect();
      if (r.top < vh() * 0.92 && r.bottom > 0) reveal(el);
      else remaining = true;
    }
    if (!remaining) {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    }
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; sweep(); });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  sweep();
  window.addEventListener('load', sweep, { once: true });
}
