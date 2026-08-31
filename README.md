# ShowNext landing page

This Next.js landing page introduces ShowNext, an early Android concept that helps parents find the next step on their screen. The future Android project belongs in `shownext-app/`; this website stays at the repository root.

## Local development

```bash
npm install
npm run dev
```

The page renders without a database. Waitlist submissions need `DATABASE_URL`: copy `.env.example` to `.env.local`, provision Neon Postgres through Vercel Marketplace, and run `db/001_waitlist.sql` in the Neon SQL editor.

### Web try (camera + screen analysis)

Web try uses Convex for file upload and an OpenAI vision action.

1. Run `npx convex dev` in one terminal (creates `convex/` deployment + `.env.local` entry).
2. In the Convex dashboard for your deployment, set `OPENAI_API_KEY`.
3. Ensure `.env.local` contains `NEXT_PUBLIC_CONVEX_URL` from Convex.
4. Run `npm run dev` in another terminal.

During development, keep `npx convex dev` running so backend functions stay synced.

Run `npm run typecheck` and `npm run build` before deployment.

## Deployment

Import the repository into Vercel, add `DATABASE_URL` to Preview and Production, run the SQL migration once, and deploy to the generated `vercel.app` address. See `docs/DEPLOYMENT.md`.

## Content and legal notes

The product is described as an early build. The phone is an original illustrative mockup, not a claim that the Android app is available. See `LICENSE` for proprietary-use terms and `.codex/spec/SPEC.md` for the full page specification.

### Phone demo icon attribution

Phone mockup icons in `public/phone-icons/` are from Flaticon (free license — attribution required):

| Icon | Source |
| --- | --- |
| Downloads | [Flaticon #9502265](https://www.flaticon.com/free-icon/download_9502265) |
| Play Store | [Flaticon #300218](https://www.flaticon.com/free-icon/playstore_300218) |
| Files | [Flaticon #281760](https://www.flaticon.com/free-icon/docs_281760) |
| Settings | [Flaticon #3953226](https://www.flaticon.com/free-icon/cogwheel_3953226) |
| Contact | [Flaticon #16076069](https://www.flaticon.com/free-icon/mobile_16076069) |
| Messages | [Flaticon #720257](https://www.flaticon.com/free-icon/android-messages_720257) |
| Photos | [Flaticon #2991131](https://www.flaticon.com/free-icon/google-photos_2991131) |
| Camera | [Flaticon #8375468](https://www.flaticon.com/free-icon/photo-camera_8375468) |

Flaticon free icons require attribution. If you publish this site publicly, add: “Icons from Flaticon.com” with links to the authors’ pages.
