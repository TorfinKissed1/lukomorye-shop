/* ============================================================
   form.js -- newsletter + checkout form validation and success states.

   Two independent forms, both optional (no-op if absent):

   1. NEWSLETTER FORM  [data-newsletter]  (index.html)
      Fields:
        #nl-email  [data-field="email"]
      Errors:
        [data-error-for="email"]  -- shown/hidden via hidden attr
      Success:
        [data-newsletter-success]  -- shown after submit
      Behaviour:
        Validate email on submit; show inline error or success.
        On success: hide form row, show success message, set focus
          to success element for SR announcement.

   2. CHECKOUT FORM  [data-checkout]  (cart.html)
      Fields (all [data-field="<name>"]):
        name, email, phone, address
        [data-field="agree"] -- required checkbox
      Errors:
        [data-error-for="<name>"]  -- shown/hidden via hidden attr
      Success:
        [data-checkout-success]  -- shown after submit
      Behaviour:
        Validate all required fields on submit, mark first error
          field with aria-invalid="true" and move focus to it.
        On success: hide form, show confirmation, announce to SR.

   General rules
   -------------
   - novalidate on <form> (already set in HTML) -- we own all UX.
   - aria-invalid is set/cleared on each field individually.
   - Errors use aria-live via a [data-error-for] element
     (hidden attr toggles visibility, element stays in DOM).
   - Re-validates on blur/input after first failed submit (eager).
   - Defensive: each section no-ops when its markup is absent.
   ============================================================ */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[\d\s\-+().]{7,}$/;

const isEmpty = (v) => !v.trim();
const isEmail = (v) => EMAIL_RE.test(v.trim());
const isPhone = (v) => PHONE_RE.test(v.trim());

function setFieldState(field, errorEl, valid, msg) {
  if (valid) {
    field.removeAttribute("aria-invalid");
    field.removeAttribute("aria-describedby");
    if (errorEl) errorEl.hidden = true;
  } else {
    field.setAttribute("aria-invalid", "true");
    if (errorEl) {
      if (msg) errorEl.textContent = msg;
      errorEl.hidden = false;
      if (!field.getAttribute("aria-describedby")) {
        const id = errorEl.id || (errorEl.id = "err-" + Math.random().toString(36).slice(2, 7));
        field.setAttribute("aria-describedby", id);
      }
    }
  }
  return valid;
}

function fieldMap(form) {
  const map = {};
  form.querySelectorAll("[data-field]").forEach((el) => {
    const key = el.dataset.field;
    map[key] = map[key] || {};
    map[key].field = el;
  });
  form.querySelectorAll("[data-error-for]").forEach((el) => {
    const key = el.dataset.errorFor;
    map[key] = map[key] || {};
    map[key].error = el;
  });
  return map;
}

export function initForm() {
  initNewsletter();
  initCheckout();
}

function initNewsletter() {
  const form = document.querySelector("[data-newsletter]");
  if (!form) return;

  const fields = fieldMap(form);
  const successEl = form.querySelector("[data-newsletter-success]");
  const rowEl = form.querySelector(".newsletter__row");
  let dirty = false;

  const validateEmail = () => {
    const { field, error } = fields.email || {};
    if (!field) return true;
    const val = field.value;
    if (isEmpty(val)) return setFieldState(field, error, false, "Укажите адрес почты");
    if (!isEmail(val)) return setFieldState(field, error, false, "Проверьте адрес почты");
    return setFieldState(field, error, true);
  };

  const { field: emailField } = fields.email || {};
  if (emailField) {
    emailField.addEventListener("blur", () => { if (dirty) validateEmail(); });
    emailField.addEventListener("input", () => { if (dirty) validateEmail(); });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    dirty = true;
    const ok = validateEmail();
    if (!ok) {
      const { field } = fields.email || {};
      if (field) field.focus();
      return;
    }
    if (rowEl) rowEl.hidden = true;
    const errEl = form.querySelector("[data-error-for=\"email\"]");
    if (errEl) errEl.hidden = true;
    if (successEl) {
      successEl.removeAttribute("hidden");
      successEl.setAttribute("tabindex", "-1");
      requestAnimationFrame(() => successEl.focus());
    }
  });
}

function initCheckout() {
  const form = document.querySelector("[data-checkout]");
  if (!form) return;

  const fields = fieldMap(form);
  const successEl = document.querySelector("[data-checkout-success]");
  let dirty = false;

  const validateOne = (key) => {
    const { field, error } = fields[key] || {};
    if (!field) return true;

    if (field.type === "checkbox") {
      const valid = field.checked;
      setFieldState(field, error, valid, "Необходимо согласие");
      return valid;
    }

    const val = field.value;

    if (key === "email") {
      if (isEmpty(val)) return setFieldState(field, error, false, "Укажите email");
      if (!isEmail(val)) return setFieldState(field, error, false, "Проверьте email");
      return setFieldState(field, error, true);
    }

    if (key === "phone") {
      if (!isEmpty(val) && !isPhone(val)) {
        return setFieldState(field, error, false, "Проверьте номер телефона");
      }
      return setFieldState(field, error, true);
    }

    const required = field.required || field.dataset.required === "true";
    if (required && isEmpty(val)) {
      const label = form.querySelector("label[for=\"" + field.id + "\"]");
      const name  = label ? label.textContent.trim().replace("*", "").trim() : "Поле";
      return setFieldState(field, error, false, name + ": обязательное поле");
    }
    return setFieldState(field, error, true);
  };

  Object.keys(fields).forEach((key) => {
    const { field } = fields[key] || {};
    if (!field) return;
    const evts = field.type === "checkbox" ? ["change"] : ["blur", "input"];
    evts.forEach((evt) => {
      field.addEventListener(evt, () => { if (dirty) validateOne(key); });
    });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    dirty = true;

    let firstInvalid = null;
    const results = Object.keys(fields).map((key) => {
      const ok = validateOne(key);
      if (!ok && !firstInvalid) firstInvalid = (fields[key] || {}).field;
      return ok;
    });

    if (results.some((r) => !r)) {
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    /* hide the form, reveal the success block via cart.css's .is-visible */
    form.hidden = true;
    if (successEl) {
      successEl.classList.add("is-visible");
      successEl.setAttribute("tabindex", "-1");
      requestAnimationFrame(() => successEl.focus());
    }

    /* order placed → empty the cart; cart.js clears storage + re-renders */
    document.dispatchEvent(new CustomEvent("cart:clear"));
  });
}
