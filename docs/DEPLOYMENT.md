# ShowNext landing page deployment

1. Create a Neon Postgres integration from the Vercel project’s Marketplace or Storage area.
2. Add the injected `DATABASE_URL` to Vercel Preview and Production environments.
3. Run `db/001_waitlist.sql` once in the Neon SQL editor.
4. Run `npm run typecheck` and `npm run build` locally.
5. Import this repository into Vercel and deploy to its generated `vercel.app` URL.
6. Submit a test email and confirm one row appears in `waitlist_entries`.

Never commit `.env.local`, database credentials, or exported waitlist data.
