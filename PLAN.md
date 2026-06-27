# Лукоморье — build plan

Бутик натуральной косметики и керамики ручной работы. Multipage, European-premium,
gallery-clean, warm hand-made. Content + commerce on one surface.

## Pages
- `index.html` — home + catalog **(DONE — lead architect)**
- `product.html` — single product, sticky-split «паспорт изделия» + scrolling gallery **(TODO — builder)**
- `cart.html` — cart line items + stepped checkout, reads localStorage **(TODO — builder)**

Header and footer markup are **identical** on every page — copy them verbatim from `index.html`
(the `<header class="header" data-header>…</header>` block and the `<footer class="footer">…</footer>`
block, plus the `.grain` svg and the `<script type="module" src="js/main.js">`). Keep the cart icon
with `.cart__count[data-cart-count]` so the live counter works everywhere.

## Design system
- Tokens: `css/settings.css` — container 1280px, pad-x clamp(1.25rem,5vw,4rem),
  palette alabaster/alabaster-2/clay/sage/gold/ink/line, fonts Lora/Mulish/Montserrat,
  radius 4px, --section-gap clamp(4rem,8vw,6.5rem), --ease, reveal vars, --header-h.
- Base: `css/base.css` — reset; `html{overflow-x:clip}`+`body{overflow-x:hidden}`;
  base type; `.container`/`.u-grid`/`.u-wrap`/`.u-bleed`; **`.u-img` cover-clamp helper**
  (box position:relative+overflow:clip+aspect-ratio; img position:absolute inset:0 object-fit:cover) —
  EVERY product/photo uses it; surfaces `.s-alabaster`/`.s-tint`; `.btn*`; grain; skip-link;
  focus-visible; **reveal contract declared ONCE here**; reduced-motion.
- NO gradients, NO heavy shadows, NO 01/02/03 numbering, NO emoji.

## CSS blocks (`css/blocks/<name>.css`) — manifest
Linked in index.html in this order. Builders add `product.css`, `cart.css`.
| file | used by | purpose |
|---|---|---|
| `header.css`     | all       | sticky frosted header, brand wordmark, nav, cart badge, burger + mobile drawer |
| `hero.css`       | index     | asymmetric hero: copy left, tall craft photo right, trust list |
| `catalog.css`    | index     | fine-art card grid, varied tiles, hover angle-swap, gold price, add-to-cart + SVG check, filters |
| `story.css`      | index     | full-bleed workshop bg + FLAT warm overlay (solid rgba) + light text |
| `journal.css`    | index     | 3 editorial post cards |
| `newsletter.css` | index     | inline email form + SVG-check success |
| `contacts.css`   | index     | delivery info + map iframe frame |
| `footer.css`     | all       | 4-column footer + baseline row |
| `product.css`    | product   | **TODO** sticky-split паспорт (left, pinned) + gallery (right, scrolls); mobile: паспорт collapses ABOVE gallery; cross-sell strip reuses `.card`; reviews |
| `cart.css`       | cart      | **TODO** line items (photo/name/price/qty±/remove), summary+total, stepped checkout, empty/loading/success |

## JS modules (`js/modules/`) — exact filenames
ES modules wired by `js/main.js` (shared on every page; each init no-ops if markup absent).
| file | status | responsibility |
|---|---|---|
| `reveal.js`  | DONE (verbatim copy from advokat-praktika) | IO threshold 0 + rAF sweep; toggles `.is-revealed`; reduced-motion shows all |
| `nav.js`     | **TODO** | burger toggle + `aria-expanded`, mobile drawer open/close, frosted `.is-scrolled` on header, catalog filter clicks |
| `cart.js`    | **TODO** | localStorage add/remove/qty; header `.cart__count`; `[data-add-to-cart]` → SVG stroke-dashoffset check + bump counter; renders cart.html line items + total |
| `gallery.js` | **TODO** | product.html angle hover/swap; sticky-split helpers; mobile паспорт collapse toggle |
| `form.js`    | **TODO** | checkout validation (inline, minimal fields) + empty/loading/success; newsletter `[data-newsletter]` → SVG-check success |

### Contracts the builders must honour
- **add-to-cart button** (`.card__add[data-add-to-cart]`) carries `data-id`, `data-name`,
  `data-price` (digits only, e.g. `1490`), `data-img`. The product page add-to-cart must use the
  same attribute set. The SVG check path is `.card__check-path` inside `.card__check`.
- **header counter**: `[data-cart-count]` text = total qty; cart.js sets it on every page load
  and on every add. Hide/0-state styling is up to header.css.
- **localStorage key**: use `lukomorye:cart` — array of `{id,name,price,img,qty}`. cart.js owns it.
- **newsletter** success element `[data-newsletter-success]`, check path `.nl-check-path`.
- **filters**: `.catalog__filter[data-filter]` (`all`/`Косметика`/`Керамика`/`Наборы`);
  cards carry `data-type`. Header nav links also carry `data-filter` — nav.js may scroll+filter.

## Product data (verbatim from brief)
6 products. ids used in links: `kedrovaya-smola`, `belaya-noch`, `moroshka`,
`rechnaya-glina`, `tuman`, `lesnoy-polden`. Each has: name, type, price, note, img,
master, volume, batch, composition. Builder of product.html should embed this as a small
JS data object (or inline per-id markup) for the паспорт изделия.

## Images (in `img/`, verified present)
hero.jpg, workshop.jpg, prod-1..6.jpg, prod-1b.jpg, prod-2b.jpg, journal-1.jpg, journal-2.jpg, gift.jpg.
**NOTE:** `journal-3.jpg` from the copy JSON was NOT downloaded — index.html uses `gift.jpg`
for the third journal card instead. Builders must NOT reference a non-existent image; reuse the
verified list above (the hover-swap "back" images on cards already reuse existing files).

## Hard-won rules (obey)
- Cover images ONLY via `.u-img` (absolute inset cover) — never position:static.
- `reveal.js` copied verbatim; reveal contract lives once in base.css; blocks only toggle `.is-revealed`.
- No 390px horizontal overflow (`html{overflow-x:clip}`+`body{overflow-x:hidden}`).
- Mobile grid overrides reuse the SAME `nth-child` selectors as desktop.
- No decorative numbering. Numbers only as real data (price, volume, batch).
