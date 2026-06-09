# MyBlueprintPortfolio Client

React + Vite frontend for the premium portfolio, Study Hub, student app, admin panel, PDF reader, and public resource pages.

## Local Setup

```bash
npm install
cp .env.example .env.development
npm run build
npm run preview
```

Use `VITE_API_BASE_URL` for deployed API calls. In local Vite dev, `/api` can also proxy through `VITE_API_PROXY_TARGET`.

## Production Checks

- `npm run build` must pass before deploy.
- `npm run lint` and `npx tsc --noEmit` should pass before release.
- Verify `/`, `/app`, `/app/catalog`, `/app/portfolio`, `/admin/login`, and a PDF/resource route after deploy.
- Keep `public/manifest.json`, `robots.txt`, `sitemap.xml`, `offline.html`, and `sw.js` aligned with the deployed domain.

## Study Hub Content QA

After server content scripts run, open the student app and check:

- CBSE class folders show ordered shelves like Syllabus, NCERT Books, Sample Papers, Answer Keys, and Practice Questions.
- UPSC CSE shows Prelims, Mains, syllabus, PYQ, and official material without empty wrapper cards.
- Admin Study Drive can navigate with mouse and keyboard without losing selection state.
