# ShowNext landing page

This Next.js landing page introduces ShowNext, an early Android concept that helps parents find the next step on their screen. The future Android project belongs in `shownext-app/`; this website stays at the repository root.

## Local development

```bash
npm install
npm run dev
```

The page renders without a database. Waitlist submissions need `DATABASE_URL`: copy `.env.example` to `.env.local`, provision Neon Postgres through Vercel Marketplace, and run `db/001_waitlist.sql` in the Neon SQL editor.

Run `npm run typecheck` and `npm run build` before deployment.

## Deployment

Import the repository into Vercel, add `DATABASE_URL` to Preview and Production, run the SQL migration once, and deploy to the generated `vercel.app` address. See `docs/DEPLOYMENT.md`.

## Content and legal notes

The product is described as an early build. The phone is an original illustrative mockup, not a claim that the Android app is available. See `LICENSE` for proprietary-use terms and `.codex/spec/SPEC.md` for the full page specification.
