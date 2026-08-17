# Harvest Panel Systems — Marketing Site

Marketing website for Harvest Panel Systems, a distributor of Insulated Metal
Panels and Doors for Industrial, Commercial, and Residential projects.

## Stack

- React 19 + Vite 8 (Rolldown), single-page app
- Plain CSS (`src/styles/App.css`), no CSS framework
- Deployed on Vercel

## Project structure

- `src/components/` — page sections (Nav, Hero, Gallery, Contact, etc.)
- `src/hooks/` — scroll/reveal/parallax/lightbox/toast logic
- `src/data/` — site content (panels, FAQs, contact info)
- `src/utils/` — form validation, scroll helpers
- `src/assets/` — bundled images/video (imported in JS)
- `public/` — files served as-is (favicon, `_headers`, social share image)

## Scripts

```bash
npm run dev       # start local dev server
npm run build     # production build to dist/
npm run preview   # preview the production build locally
npm run lint      # run ESLint
```
