/* ==========================================================================
   RevAlpha | Free Revenue Plan landing page
   script.js: vanilla JS, no dependencies, loaded with `defer`.

   Modules:
     1. CONFIG (replace phone/WhatsApp, form endpoint, analytics IDs)
     2. Analytics loader + track() helper (GTM, GA4, Meta Pixel, Google Ads)
     3. Ad attribution (UTM / gclid / fbclid capture)
     4. Click tracking (WhatsApp, call, email, CTAs) + CTA behaviour
     5. Header state + sticky mobile CTA
     6. Scroll reveals, counters, parallax
     7. Property-type tabs
     8. FAQ accordion
     9. Pointer micro-interactions (spotlight, magnetic buttons)
    10. Lead forms (validation, spam protection, WhatsApp enquiry, states)
   ========================================================================== */
(() => {
  'use strict';

  /* ========================================================================
     1. CONFIG: REPLACE THESE VALUES BEFORE GOING LIVE
     ======================================================================== */
  const CONFIG = {
    // REPLACE: WhatsApp number, international format, digits only.
    // Currently the WhatsApp number used on revalpha.co. If WhatsApp runs on
    // +91 8655556688 instead, change this to '918655556688'.
    whatsappNumber: '919653128482',
    whatsappMessage: "Hi RevAlpha, I'd like to know more about hotel revenue management.",

    // FORM ENQUIRIES BY WHATSAPP: on submit, WhatsApp opens with every form
    // answer typed into a message to `whatsappNumber`; the visitor taps send.
    whatsappForm: true,
    whatsappFormIntro: "Hi RevAlpha, I'd like a Free Revenue Plan for my property.",

    // OPTIONAL: also POST each enquiry (JSON) to your CRM / sheet / inbox, so you
    // keep a copy even if the visitor never presses send in WhatsApp.
    // Works with Formspree (https://formspree.io/f/xxxx), Getform, Basin,
    // Zapier / Make / Pabbly webhooks, or your CRM's webhook URL.
    // Google Apps Script: set formContentType to 'text/plain' (avoids CORS preflight).
    // Leave '' to rely on WhatsApp only.
    formEndpoint: '',
    formContentType: 'application/json',
    formExtraFields: {},           // e.g. { access_key: 'xxxx' } for Web3Forms

    // REPLACE: analytics IDs. Leave a placeholder (X's / zeros) to disable that tag.
    gtmId: 'GTM-XXXXXXX',          // Google Tag Manager container
    ga4Id: 'G-XXXXXXXXXX',         // GA4. Only if GA4 is NOT already configured inside GTM
    metaPixelId: '000000000000000',// Meta (Facebook / Instagram) Pixel
    googleAds: {
      id: 'AW-XXXXXXXXXX',                 // Google Ads conversion ID
      leadLabel: 'XXXXXXXXXXXXXXXXXXXX',   // conversion label: lead form submitted
      contactLabel: 'XXXXXXXXXXXXXXXXXXXX' // conversion label: WhatsApp / call click
    },

    // Load tags after the first interaction (or after the timeout) to keep
    // PageSpeed high. Set to false to load them immediately on page load.
    deferAnalytics: true,
    deferTimeoutMs: 3500
  };

  /* ------------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------------ */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const mq = (q) => window.matchMedia(q);
  const reducedMotion = mq('(prefers-reduced-motion: reduce)').matches;
  const finePointer = mq('(hover: hover) and (pointer: fine)').matches;
  const isDesktop = () => mq('(min-width: 1024px)').matches;
  const isSet = (id) => typeof id === 'string' && id.length > 3 && !/X{4,}|^0+$/.test(id);
  const DEBUG = /[?&]debug=1/.test(location.search);
  const PAGE_LOADED_AT = Date.now();
  const safe = (name, fn) => { try { fn(); } catch (err) { console.error('[RevAlpha] ' + name + ' failed', err); } };

  /* ========================================================================
     2. ANALYTICS
     Events pushed to dataLayer (use these as GTM triggers):
       cta_click, whatsapp_click, call_click, email_click, form_start,
       form_error, generate_lead, form_submit_failed, faq_open, property_type_view
     No personal data (name, phone, email) is ever sent to analytics.
     ======================================================================== */
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
  const gtagNeeded = isSet(CONFIG.ga4Id) || isSet(CONFIG.googleAds.id);

  function initAnalyticsQueues() {
    if (gtagNeeded) {
      window.gtag('js', new Date());
      if (isSet(CONFIG.ga4Id)) window.gtag('config', CONFIG.ga4Id);
      if (isSet(CONFIG.googleAds.id)) window.gtag('config', CONFIG.googleAds.id);
    }
    if (isSet(CONFIG.gtmId)) {
      window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    }
    if (isSet(CONFIG.metaPixelId) && !window.fbq) {
      // Standard Meta Pixel stub: queues calls until fbevents.js loads.
      const n = window.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!window._fbq) window._fbq = n;
      n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
      window.fbq('init', CONFIG.metaPixelId);
      window.fbq('track', 'PageView');
    }
  }

  let tagsLoaded = false;
  function loadTags() {
    if (tagsLoaded) return;
    tagsLoaded = true;
    const add = (src) => { const s = document.createElement('script'); s.src = src; s.async = true; document.head.appendChild(s); };
    if (isSet(CONFIG.gtmId)) add('https://www.googletagmanager.com/gtm.js?id=' + CONFIG.gtmId);
    if (gtagNeeded) add('https://www.googletagmanager.com/gtag/js?id=' + (isSet(CONFIG.ga4Id) ? CONFIG.ga4Id : CONFIG.googleAds.id));
    if (isSet(CONFIG.metaPixelId)) add('https://connect.facebook.net/en_US/fbevents.js');
  }

  function scheduleTags() {
    initAnalyticsQueues();
    if (!isSet(CONFIG.gtmId) && !gtagNeeded && !isSet(CONFIG.metaPixelId)) {
      if (DEBUG) console.info('[RevAlpha] Analytics IDs not set: tags not loaded (events still go to dataLayer).');
      return;
    }
    if (!CONFIG.deferAnalytics) { loadTags(); return; }
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
    const go = () => { events.forEach((e) => window.removeEventListener(e, go)); loadTags(); };
    events.forEach((e) => window.addEventListener(e, go, { once: true, passive: true }));
    const timer = () => setTimeout(go, CONFIG.deferTimeoutMs);
    if (document.readyState === 'complete') timer(); else window.addEventListener('load', timer, { once: true });
  }

  function track(name, params = {}) {
    window.dataLayer.push(Object.assign({ event: name }, params));
    if (isSet(CONFIG.ga4Id)) window.gtag('event', name, params);
    if (DEBUG) console.info('[track]', name, params);
  }

  function adsConversion(label, extra = {}) {
    if (!isSet(CONFIG.googleAds.id) || !isSet(label)) return;
    window.gtag('event', 'conversion', Object.assign({ send_to: CONFIG.googleAds.id + '/' + label }, extra));
  }

  function metaEvent(name, params = {}, options) {
    if (typeof window.fbq === 'function') window.fbq('track', name, params, options);
  }

  /* ========================================================================
     3. AD ATTRIBUTION: captured on landing, kept for the session, sent with leads
     ======================================================================== */
  const ATTR_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'gbraid', 'wbraid', 'fbclid'];
  function getAttribution() {
    let stored = {};
    try { stored = JSON.parse(sessionStorage.getItem('ra_attr') || '{}'); } catch (e) { stored = {}; }
    const qs = new URLSearchParams(location.search);
    const fresh = {};
    ATTR_KEYS.forEach((k) => { const v = qs.get(k); if (v) fresh[k] = v.slice(0, 200); });
    const attr = Object.keys(fresh).length ? fresh : stored;
    try { sessionStorage.setItem('ra_attr', JSON.stringify(attr)); } catch (e) { /* storage blocked */ }
    return attr;
  }

  /* ========================================================================
     4. LINKS: WhatsApp URLs, click tracking, CTA behaviour
     ======================================================================== */
  const waLink = () => 'https://wa.me/' + CONFIG.whatsappNumber + '?text=' + encodeURIComponent(CONFIG.whatsappMessage);

  function initLinks() {
    $$('[data-wa]').forEach((a) => { a.href = waLink(); });

    document.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a) return;
      const location_ = a.dataset.location || a.dataset.cta || 'page';

      if (a.hasAttribute('data-wa')) {
        track('whatsapp_click', { link_location: location_ });
        metaEvent('Contact', { content_name: 'WhatsApp' });
        adsConversion(CONFIG.googleAds.contactLabel);
      } else if (a.dataset.track === 'call') {
        track('call_click', { link_location: location_ });
        metaEvent('Contact', { content_name: 'Phone call' });
        adsConversion(CONFIG.googleAds.contactLabel);
      } else if (a.dataset.track === 'email') {
        track('email_click', { link_location: location_ });
      } else if (a.hasAttribute('data-success-wa')) {
        track('whatsapp_resend_click', { link_location: 'form_success' });
      }

      if (a.dataset.prefillType) prefillPropertyType(a.dataset.prefillType);

      if (a.dataset.cta) {
        track('cta_click', { cta_location: a.dataset.cta });
        // On desktop, hero/header CTAs focus the above-the-fold form if it is on screen.
        if ((a.dataset.cta === 'hero' || a.dataset.cta === 'header') && heroFormOnScreen()) {
          e.preventDefault();
          focusForm($('.hero-panel [data-lead-form]'));
        } else if (a.getAttribute('href') === '#get-plan' && isDesktop()) {
          // Let the smooth scroll run, then put the cursor in the first field.
          setTimeout(() => {
            const first = $('#get-plan [data-lead-form] input');
            if (first) first.focus({ preventScroll: true });
          }, reducedMotion ? 0 : 900);
        }
      }
    });
  }

  function heroFormOnScreen() {
    const panel = $('.hero-panel');
    if (!panel || !panel.querySelector('[data-lead-form]') || getComputedStyle(panel).display === 'none') return false;
    const r = panel.getBoundingClientRect();
    return r.top < window.innerHeight * 0.6 && r.bottom > 120;
  }

  function focusForm(form) {
    if (!form) return;
    const card = form.closest('.form-card');
    const first = $$('input:not([type=hidden]):not([tabindex="-1"]), select', form).find((f) => !f.value);
    (first || form.querySelector('input')).focus({ preventScroll: false });
    if (card && !reducedMotion) {
      card.classList.remove('is-highlight'); void card.offsetWidth; card.classList.add('is-highlight');
    }
  }

  function prefillPropertyType(value) {
    $$('select[name="property_type"]').forEach((sel) => {
      if (sel.value) return; // never overwrite the visitor's own choice
      const opt = Array.from(sel.options).find((o) => o.value === value || o.text === value);
      if (opt) { sel.value = opt.value; sel.dispatchEvent(new Event('change', { bubbles: true })); }
    });
  }

  /* ========================================================================
     5. HEADER STATE + STICKY MOBILE CTA
     ======================================================================== */
  function initHeaderAndStickyCta() {
    const header = $('[data-header]');
    const bar = $('[data-mobile-cta]');
    const lead = $('[data-lead-section]');
    let leadInView = false;
    let ticking = false;

    const update = () => {
      ticking = false;
      const y = window.scrollY;
      if (header) header.classList.toggle('is-scrolled', y > 24);
      if (bar) {
        const show = y > 180 && !leadInView;
        bar.classList.toggle('is-visible', show);
        bar.toggleAttribute('inert', !show);
      }
    };

    if (lead && 'IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        leadInView = entries[0].isIntersecting;
        update();
      }, { rootMargin: '0px 0px -25% 0px' }).observe(lead);
    }

    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ========================================================================
     6. SCROLL MOTION: reveals, counters, parallax
     ======================================================================== */
  function initReveals() {
    const targets = $$('[data-reveal], [data-steps]');
    if (!('IntersectionObserver' in window) || reducedMotion) {
      targets.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
    targets.forEach((el) => io.observe(el));
  }

  function initCounters() {
    const counters = $$('[data-count]');
    counters.forEach((el) => {
      // Screen readers get the final value; the animated digits are hidden from them.
      const sr = document.createElement('span');
      sr.className = 'sr-only';
      sr.textContent = el.textContent;
      el.after(sr);
      el.setAttribute('aria-hidden', 'true');
    });
    if (reducedMotion || !('IntersectionObserver' in window)) return;

    const run = (el) => {
      const target = parseFloat(el.dataset.count);
      const pre = el.dataset.prefix || '';
      const suf = el.dataset.suffix || '';
      const dur = 1900;
      const t0 = performance.now();
      const step = (now) => {
        const t = clamp((now - t0) / dur, 0, 1);
        const eased = 1 - Math.pow(1 - t, 4);
        el.textContent = pre + Math.round(target * eased) + suf;
        if (t < 1) requestAnimationFrame(step);
      };
      el.textContent = pre + '0' + suf;
      requestAnimationFrame(step);
    };

    // Same trigger as the card reveal: the card is still near-transparent when the
    // count resets to 0, and the real figure stays in the HTML until then (SEO, no-JS).
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        run(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
    counters.forEach((el) => io.observe(el));
  }

  function initScrollScenes() {
    if (reducedMotion) return;
    const parallax = $$('[data-parallax]').map((el) => ({
      el,
      box: el.closest('.hero-media, .why-media, .final-media') || el.parentElement,
      speed: parseFloat(el.dataset.parallax) || 0.1,
      visible: false
    }));

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const item = parallax.find((p) => p.box === entry.target);
          if (item) item.visible = entry.isIntersecting;
        });
        requestTick();
      }, { rootMargin: '15% 0px 15% 0px' });
      parallax.forEach((p) => io.observe(p.box));
    }

    let ticking = false;
    const frame = () => {
      ticking = false;
      const vh = window.innerHeight;
      parallax.forEach((p) => {
        if (!p.visible) return;
        const box = p.box.getBoundingClientRect();
        // Images are oversized by a "bleed" in CSS; never move further than that,
        // so no edge ever shows. progress: -1 (below viewport) .. 1 (above).
        const bleed = Math.max(0, (p.el.offsetHeight - box.height) / 2);
        const progress = clamp((box.top + box.height / 2 - vh / 2) / (vh / 2 + box.height / 2), -1, 1);
        const offset = -progress * bleed * Math.min(1, p.speed / 0.15);
        // `translate` (not transform) so it stacks with CSS Ken Burns animations.
        p.el.style.translate = '0 ' + offset.toFixed(1) + 'px';
      });
    };
    const requestTick = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
    window.addEventListener('scroll', requestTick, { passive: true });
    window.addEventListener('resize', requestTick, { passive: true });
    requestTick();
  }

  /* ========================================================================
     7. PROPERTY-TYPE TABS (WAI-ARIA tabs pattern, automatic activation)
     ======================================================================== */
  function initTabs() {
    $$('[data-tabs]').forEach((root) => {
      const list = $('[role=tablist]', root);
      const tabs = $$('[role=tab]', root);
      const panelOf = (tab) => document.getElementById(tab.getAttribute('aria-controls'));

      const setOrientation = () => list.setAttribute('aria-orientation', isDesktop() ? 'vertical' : 'horizontal');
      setOrientation();
      mq('(min-width: 1024px)').addEventListener('change', setOrientation);

      const preload = (tab) => {
        const img = panelOf(tab).querySelector('img');
        if (img && !img.dataset.preloaded) { img.dataset.preloaded = '1'; const i = new Image(); i.src = img.currentSrc || img.src; }
      };

      const select = (tab, { focus = false, user = false } = {}) => {
        if (tab.getAttribute('aria-selected') === 'true') { if (focus) tab.focus(); return; }
        tabs.forEach((t) => {
          const on = t === tab;
          const panel = panelOf(t);
          t.setAttribute('aria-selected', String(on));
          t.tabIndex = on ? 0 : -1;
          if (on) {
            panel.hidden = false;
            panel.classList.remove('is-entering');
            void panel.offsetWidth; // restart the entrance animation
            panel.classList.add('is-active', 'is-entering');
          } else {
            panel.hidden = true;
            panel.classList.remove('is-active', 'is-entering');
          }
        });
        if (focus) tab.focus({ preventScroll: true });
        // Keep the active chip centred in the horizontal (mobile) tab strip.
        if (list.scrollWidth > list.clientWidth + 2) {
          const lr = list.getBoundingClientRect();
          const tr = tab.getBoundingClientRect();
          list.scrollTo({ left: list.scrollLeft + (tr.left - lr.left) - (lr.width - tr.width) / 2, behavior: reducedMotion ? 'auto' : 'smooth' });
        }
        if (user) track('property_type_view', { property_type: tab.textContent.trim() });
      };

      tabs.forEach((tab, i) => {
        tab.addEventListener('click', () => select(tab, { user: true }));
        tab.addEventListener('pointerenter', () => preload(tab), { passive: true });
        tab.addEventListener('focus', () => preload(tab));
        tab.addEventListener('keydown', (e) => {
          let next = null;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % tabs.length;
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + tabs.length) % tabs.length;
          else if (e.key === 'Home') next = 0;
          else if (e.key === 'End') next = tabs.length - 1;
          if (next === null) return;
          e.preventDefault();
          preload(tabs[next]);
          select(tabs[next], { focus: true, user: true });
        });
      });

      // Warm the next image once the section is near, so the first switch is instant.
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
          if (!entries[0].isIntersecting) return;
          io.disconnect();
          setTimeout(() => preload(tabs[1]), 1200);
        }, { rootMargin: '200px 0px' });
        io.observe(root);
      }
    });
  }

  /* ========================================================================
     8. FAQ ACCORDION (button + region, animated with grid-template-rows)
     ======================================================================== */
  function initAccordion() {
    $$('[data-accordion] .acc-trigger').forEach((btn) => {
      const panel = document.getElementById(btn.getAttribute('aria-controls'));
      if (!panel) return;
      btn.addEventListener('click', () => {
        const open = btn.getAttribute('aria-expanded') !== 'true';
        btn.setAttribute('aria-expanded', String(open));
        if (open) {
          panel.hidden = false;
          void panel.offsetHeight; // commit the closed (0fr) state so the open state animates
          panel.classList.add('is-open');
          track('faq_open', { question: btn.textContent.trim().slice(0, 100) });
        } else {
          panel.classList.remove('is-open');
          setTimeout(() => { if (btn.getAttribute('aria-expanded') === 'false') panel.hidden = true; }, reducedMotion ? 0 : 620);
        }
      });
    });
  }

  /* ========================================================================
     9. POINTER MICRO-INTERACTIONS (desktop, fine pointer only)
     ======================================================================== */
  function initPointerFx() {
    if (!finePointer) return;
    $$('[data-spotlight]').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      }, { passive: true });
    });
    if (reducedMotion) return;
    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.16;
        const y = (e.clientY - r.top - r.height / 2) * 0.28;
        el.style.translate = x.toFixed(1) + 'px ' + y.toFixed(1) + 'px';
      }, { passive: true });
      el.addEventListener('pointerleave', () => { el.style.translate = ''; });
    });
  }

  /* ========================================================================
     10. LEAD FORMS
     - Inline validation with accessible error messages (aria-invalid + describedby)
     - Spam protection: honeypot field + minimum time-on-page check
       (add Cloudflare Turnstile / reCAPTCHA server-side if spam persists)
     - Loading, success and error states; conversion events on success
     ======================================================================== */
  const PHONE_IN = /^(?:\+?91|0)?[6-9]\d{9}$/;   // Indian mobile, optional +91 / 0
  const PHONE_INTL = /^\+(?!91)\d{8,15}$/;       // other countries, with + prefix
  const normalisePhone = (v) => String(v || '').replace(/[\s\-().]/g, '');

  const MESSAGES = {
    full_name: 'Please enter your name.',
    property_name: 'Please enter your hotel or property name.',
    city: 'Please enter your city.',
    property_type: 'Please select your property type.',
    rooms: 'Please enter the number of rooms.',
    rooms_invalid: 'Please enter a whole number of rooms.',
    whatsapp: 'Please enter a valid 10-digit mobile number.',
    challenge: 'Please select your main challenge.',
    consent: 'Please tick the box so our team can contact you.',
    required: 'This field is required.'
  };

  function errorElFor(field) {
    const ids = (field.getAttribute('aria-describedby') || '').split(/\s+/);
    return ids.map((id) => document.getElementById(id)).find((el) => el && el.classList.contains('field-error'));
  }

  function setFieldError(field, msg) {
    const err = errorElFor(field);
    if (msg) field.setAttribute('aria-invalid', 'true'); else field.removeAttribute('aria-invalid');
    if (err) err.textContent = msg || '';
  }

  function validateField(field) {
    const name = field.name;
    let msg = '';
    if (field.type === 'checkbox') {
      if (field.required && !field.checked) msg = MESSAGES[name] || MESSAGES.required;
    } else {
      const v = field.value.trim();
      if (field.required && !v) msg = MESSAGES[name] || MESSAGES.required;
      else if (v && name === 'whatsapp') {
        const p = normalisePhone(v);
        if (!PHONE_IN.test(p) && !PHONE_INTL.test(p)) msg = MESSAGES.whatsapp;
      } else if (v && name === 'rooms') {
        const n = Number(v);
        if (!Number.isInteger(n) || n < 1 || n > 100000) msg = MESSAGES.rooms_invalid;
      } else if (v && field.minLength > 0 && v.length < field.minLength) {
        msg = MESSAGES[name] || MESSAGES.required;
      }
    }
    setFieldError(field, msg);
    return !msg;
  }

  function initForms() {
    const forms = $$('[data-lead-form]');
    const tpl = $('#tpl-success');

    forms.forEach((form) => {
      const loc = form.dataset.location || 'form';
      const summary = $('[data-summary]', form);
      const fields = $$('input, select, textarea', form).filter((f) => f.name && f.name !== 'website');
      const live = document.createElement('p');
      live.className = 'sr-only';
      live.setAttribute('aria-live', 'polite');
      form.appendChild(live);
      let started = false;
      let attempted = false;
      let sending = false;

      form.addEventListener('focusin', () => {
        if (started) return;
        started = true;
        track('form_start', { form_location: loc });
      });

      fields.forEach((f) => {
        const evt = f.tagName === 'SELECT' || f.type === 'checkbox' ? 'change' : 'input';
        f.addEventListener(evt, () => { if (attempted || f.getAttribute('aria-invalid') === 'true') validateField(f); });
        f.addEventListener('blur', () => { if (attempted || (f.value && f.type !== 'checkbox')) validateField(f); });
      });

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (sending) return;
        attempted = true;

        const invalid = fields.filter((f) => !validateField(f));
        if (invalid.length) {
          summary.hidden = false;
          summary.textContent = invalid.length === 1
            ? 'Please check the highlighted field.'
            : 'Please check the ' + invalid.length + ' highlighted fields.';
          invalid[0].focus();
          track('form_error', { form_location: loc, error_fields: invalid.map((f) => f.name).join(',') });
          return;
        }
        summary.hidden = true;

        // Spam protection: bots fill the hidden field or submit instantly. Show a
        // normal-looking success so they learn nothing, but send nothing.
        const honeypot = form.querySelector('[name="website"]');
        if ((honeypot && honeypot.value) || Date.now() - PAGE_LOADED_AT < 3000) {
          showSuccess(form, tpl, '');
          return;
        }

        // WhatsApp enquiry. window.open must run right here, synchronously inside
        // the submit (a user gesture), or browsers treat it as a blocked pop-up.
        const waUrl = CONFIG.whatsappForm ? buildWhatsAppEnquiry(form) : '';
        let waOpened = false;
        if (waUrl) {
          const win = window.open(waUrl, '_blank');
          if (win) { try { win.opener = null; } catch (err) { /* cross-origin */ } waOpened = true; }
        }

        const data = Object.fromEntries(new FormData(form).entries());
        delete data.website;
        const leadId = 'ra_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
        Object.assign(data, CONFIG.formExtraFields, getAttribution(), {
          whatsapp_normalised: normalisePhone(data.whatsapp),
          form_location: loc,
          lead_id: leadId,
          page_url: location.href.split('#')[0],
          referrer: document.referrer || '',
          submitted_at: new Date().toISOString()
        });

        sending = true;
        form.setAttribute('aria-busy', 'true');
        live.textContent = 'Sending your details…';

        // Conversion events (no personal data).
        const conv = { form_location: loc, property_type: data.property_type || '', rooms: Number(data.rooms) || 0, challenge: data.challenge || '', lead_id: leadId, method: waUrl ? 'whatsapp' : 'form' };
        const convert = () => {
          track('generate_lead', conv);
          metaEvent('Lead', { content_name: 'Free Revenue Plan', content_category: conv.property_type }, { eventID: leadId });
          adsConversion(CONFIG.googleAds.leadLabel, { transaction_id: leadId });
        };

        try {
          if (CONFIG.formEndpoint) {
            const ctrl = 'AbortController' in window ? new AbortController() : null;
            const timeout = setTimeout(() => ctrl && ctrl.abort(), 15000);
            const res = await fetch(CONFIG.formEndpoint, {
              method: 'POST',
              headers: { 'Content-Type': CONFIG.formContentType, Accept: 'application/json' },
              body: JSON.stringify(data),
              signal: ctrl ? ctrl.signal : undefined
            });
            clearTimeout(timeout);
            if (!res.ok) throw new Error('HTTP ' + res.status);
          } else {
            if (!waUrl) console.warn('[RevAlpha] No form endpoint and WhatsApp form is off: this lead was NOT sent anywhere.', data);
            await wait(600);
          }
          convert();
          showSuccess(form, tpl, waUrl);
        } catch (err) {
          track('form_submit_failed', { form_location: loc, reason: String(err && err.message || err).slice(0, 80) });
          if (waUrl) {
            // The copy to the endpoint failed, but WhatsApp carries the enquiry.
            convert();
            showSuccess(form, tpl, waUrl);
            return;
          }
          sending = false;
          form.removeAttribute('aria-busy');
          live.textContent = '';
          summary.hidden = false;
          summary.innerHTML = 'Sorry, we couldn’t send your details. Please try again, or <a href="' + waLink() + '" target="_blank" rel="noopener" data-wa data-location="form_error">WhatsApp Us Now</a>.';
        }
        if (DEBUG) console.info('[RevAlpha] WhatsApp opened automatically:', waOpened);
      });
    });
  }

  // Turns the form answers into a WhatsApp message, one "*Label:* value" line
  // per filled field, using the field labels exactly as shown on the page.
  function buildWhatsAppEnquiry(form) {
    const lines = [CONFIG.whatsappFormIntro, ''];
    $$('input, select, textarea', form).forEach((f) => {
      if (!f.name || f.name === 'website' || f.type === 'checkbox' || f.type === 'hidden') return;
      const value = f.value.trim();
      if (!value) return;
      const label = f.id ? form.querySelector('label[for="' + f.id + '"]') : null;
      const name = label ? label.firstChild.textContent.trim() : f.name;
      lines.push('*' + name + ':* ' + value);
    });
    return 'https://wa.me/' + CONFIG.whatsappNumber + '?text=' + encodeURIComponent(lines.join('\n'));
  }

  function showSuccess(form, tpl, waUrl) {
    const wrap = form.closest('[data-form-wrap]') || form.parentElement;
    const node = tpl ? tpl.content.firstElementChild.cloneNode(true) : document.createElement('div');
    if (!tpl) node.textContent = 'Thank you. Our revenue team will contact you within 1 business day.';
    const resend = node.querySelector('[data-success-wa]');
    if (resend && waUrl) {
      resend.href = waUrl;
    } else if (resend) {
      resend.remove();
      const note = node.querySelector('.success-note');
      if (note) note.remove();
    }
    wrap.style.minHeight = wrap.offsetHeight + 'px'; // no layout jump
    wrap.replaceChildren(node);
    node.focus({ preventScroll: true });
  }

  /* Phones: hide the floating buttons while the keyboard is up in a form. */
  function initTypingState() {
    const fields = 'input:not([type=checkbox]):not([type=hidden]), select, textarea';
    document.addEventListener('focusin', (e) => {
      if (e.target.matches && e.target.matches(fields)) document.body.classList.add('is-typing');
    });
    document.addEventListener('focusout', (e) => {
      if (e.target.matches && e.target.matches(fields)) document.body.classList.remove('is-typing');
    });
  }

  /* ========================================================================
     INIT
     ======================================================================== */
  safe('analytics', scheduleTags);
  safe('attribution', getAttribution);
  safe('links', initLinks);
  safe('header', initHeaderAndStickyCta);
  safe('reveals', initReveals);
  safe('counters', initCounters);
  safe('scroll scenes', initScrollScenes);
  safe('tabs', initTabs);
  safe('accordion', initAccordion);
  safe('pointer fx', initPointerFx);
  safe('forms', initForms);
  safe('typing state', initTypingState);
  safe('year', () => { const y = $('[data-year]'); if (y) y.textContent = String(new Date().getFullYear()); });
})();
