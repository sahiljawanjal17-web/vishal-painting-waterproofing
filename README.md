# Vishal Painting & Waterproofing — Marketing Website

> विशाल पेंटिंग व वॉटरप्रूफिंग — Flawless Walls. Leak-Proof Homes.

A mobile-first, bilingual (English ⇄ Hindi, with Marathi support) marketing website built for **Vishal Painting & Waterproofing Services**, a painting, putty, and waterproofing contractor based in Shegaon, Buldhana, Maharashtra. This project was developed as a client commission to give the business a modern, conversion-focused web presence.

The site is designed to turn visitors into direct WhatsApp enquiries through a guided booking flow, an instant cost estimator, and a fully localized, faceless-imagery brand experience.

## Highlights

- **7-step WhatsApp booking wizard** — collects project details and hands off a pre-filled, ready-to-send WhatsApp message.
- **Instant cost estimator** — rate-card driven estimate based on service type and area.
- **Before/after slider** — visual proof of work quality.
- **Specialist showcase** — profiles for the lead artisan and partner craftsmen, each with their own expertise areas.
- **Verified reviews** section.
- **Full i18n** — English, Hindi, and Marathi content managed through structured JSON data files (`src/data/`, `src/i18n/`).
- **Static, dependency-light architecture** — vanilla HTML/CSS/JS, so it runs from any static host with no build step required.

## Tech Stack

- HTML5, modern CSS, vanilla JavaScript (ES modules)
- JSON-driven content layer (`src/data/*.json`) for services, pricing, partners, reviews, offers, and FAQs
- Node's built-in test runner (`node --test`) for unit tests, plus a Playwright-style e2e spec for the booking flow
- Deployable as a static site (Netlify / Vercel / GitHub Pages compatible)

## Project Structure

```
├── index.html            # Main landing page
├── team.html             # Specialist / partner profiles page
├── 404.html              # Custom not-found page
├── assets/               # Images, icons, fonts, video
├── public/                # Favicons, manifest, robots.txt, sitemap
├── src/
│   ├── css/               # Stylesheets
│   ├── js/                 # Application logic (components, core, services, utils)
│   ├── data/               # Structured content (services, pricing, partners, reviews, offers, FAQ)
│   └── i18n/               # Localization strings
├── scripts/               # Maintenance scripts (i18n check, image optimization, data validation)
└── tests/
    ├── unit/               # Unit tests (booking, pricing, validators, WhatsApp link builder, labels)
    └── e2e/                # End-to-end booking flow test
```

## Getting Started

This is a static site with no build pipeline — serve the folder with any static file server:

```bash
npx serve .
# or
python -m http.server 8080
```

Then open the served URL in your browser.

## Running Tests

```bash
npm test
```

Runs the unit test suite via Node's built-in test runner (`tests/unit/*.test.js`).

## Configuration

All runtime configuration is public-safe by design — see `src/js/config.js`. There are no API keys or secrets required to run or build this site. Copy `.env.example` to `.env` only if you plan to wire up optional build-time integrations.

## Content Notes

Business contact details, service area, and rate cards are managed by the client and live in `src/data/site.json` and `src/data/pricing.json`. Partner photos are intentionally faceless per the brand's visual guidelines.

## License

This project was built for and is owned by Vishal Painting & Waterproofing Services. All rights reserved by the client.
