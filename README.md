# RevAlpha: Free Revenue Plan landing page

Single-page ad landing page (Google / Meta / Instagram). No frameworks or build step; upload the folder to any static host (Netlify, Vercel, Cloudflare Pages, S3, cPanel).

| File | What it holds |
|---|---|
| `index.html` | Markup, SEO/OG tags, JSON-LD (ProfessionalService + FAQPage), **critical CSS inlined** in `<head>` |
| `styles.css` | Everything below the fold (loaded without blocking render) |
| `script.js` | CONFIG, analytics loader + events, forms, tabs, accordion, motion |
| `assets/` | `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`, `og-image.jpg` (1200×630) |

Search the code for `REPLACE` to find every placeholder.

## Before going live

1. **WhatsApp number**: `CONFIG.whatsappNumber`. It is set to `919653128482`, the number revalpha.co uses. The brief only lists +91 8655556688 (calls); switch to `918655556688` if that line has WhatsApp. All WhatsApp links, the floating button and form enquiries use this number.
2. **Form enquiries go to WhatsApp** (`CONFIG.whatsappForm: true`). On submit, WhatsApp opens with every answer filled in (`*Label:* value` per line) and the visitor taps send. The thank-you screen has a "Send on WhatsApp" button in case WhatsApp didn't open. Optional: set `CONFIG.formEndpoint` (Formspree, Zapier, CRM webhook…) to also keep a copy of every enquiry, including from visitors who never press send. Also update the `action="…"` no-JS fallback on both `<form>` tags.
3. **Analytics IDs**: `gtmId`, `ga4Id`, `metaPixelId`, `googleAds.id` + conversion labels. Placeholders are ignored, so nothing loads until real IDs are set. Use GA4 *either* through GTM *or* via `ga4Id`, not both. Also uncomment the `<noscript>` GTM/Pixel tags at the top of `<body>`.
4. **URLs**: canonical, `og:url`, `og:image`, `twitter:image` in `<head>` (currently `https://revalpha.co/free-revenue-plan/`).
5. **Legal links**: footer links point to `/privacy-policy/` and `/terms/`.
6. **Images** (recommended): photos currently load from revalpha.co. Copy them into `assets/img/`, export 640/1280/1920px AVIF + WebP, and add `srcset`. Self-hosting the two Google Fonts (woff2 + `<link rel="preload">`) is also worth doing.

## Tracking events (dataLayer)

`cta_click`, `whatsapp_click`, `call_click`, `email_click`, `form_start`, `form_error`, `generate_lead` (with `method: whatsapp`), `whatsapp_resend_click`, `form_submit_failed`, `faq_open`, `property_type_view`. The floating buttons report `link_location: floating`.

On a successful submit: GA4 `generate_lead`, Meta `Lead` (with `eventID` = lead id for CAPI de-duplication), Google Ads conversion (`transaction_id` = lead id). WhatsApp and call clicks fire Meta `Contact` and the Ads "contact" conversion. No name, phone or email is sent to analytics. Add `?debug=1` to the URL to log events in the console.

Each lead payload also carries `utm_*`, `gclid`, `gbraid`, `wbraid`, `fbclid` (kept for the session), `page_url`, `referrer`, `form_location`, `lead_id`.

## Spam protection

Honeypot field plus a minimum time-on-page check. Bots get a fake success screen and nothing is sent. If spam gets through, add Cloudflare Turnstile or reCAPTCHA and verify it on the server or webhook side.

## Copy notes

- All headlines, service/problem/property-type text, stats and CTAs are taken from the brief as written.
- The brief gave FAQ **questions** only, so the answers were written to match it (plan names, OTA list and address come from revalpha.co). Please review them; the JSON-LD copy in `<head>` has to stay identical to the visible answers.
- The hero form field is labelled "Monthly Rooms" exactly as briefed; the main form uses "Number of Rooms".
- Removed on request: the testimonial cards and the "Your rooms are fixed. Your revenue shouldn’t be." statement section (the line still appears as a small kicker above the final CTA).
- Headings (hero, section titles, final CTA) are 35px on desktop and scale down to about 28px on phones.

## Local preview

```bash
python -m http.server 5173
```

Then open http://localhost:5173.
