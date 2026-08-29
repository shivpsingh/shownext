# ShowNext Landing Page Specification

## Goal

Collect early-access interest from adult children who help their parents with phones and everyday technology. The page should make the product understandable in one calm, memorable visit.

## Audience and message

- Primary audience: adult children and caregivers.
- Product stage: concept and early build; never imply the Android app is publicly available.
- Hero headline: “Help, right when they need it.”
- Primary CTA: “Join the ShowNext waitlist.”
- Product promise: ShowNext aims to help a parent find the next on-screen step when their child cannot be there.

## Visual direction

- Calm blue-grey base, dark ink text, bright blue actions, and coral guidance accents.
- Friendly display type with highly readable body text.
- Desktop split hero: product copy and waitlist left; original Android phone mockup right.
- Responsive mobile layout stacks copy before the phone.
- Signature device: a coral guidance path from the ShowNext bubble to the Store tile.
- Original generic Store, Messages, and Photos tiles only; no copied third-party logos.
- Support keyboard focus, reduced motion, scalable text, and generous controls.

## Waitlist contract

- `POST /api/waitlist` accepts `{ email: string, website?: string }`.
- Normalize by trimming and lowercasing.
- Reject malformed email or values over 254 characters with HTTP 400.
- Treat a filled honeypot as a successful no-op.
- Insert into `waitlist_entries`; duplicate emails are successful no-ops.
- Return HTTP 503 when `DATABASE_URL` is absent and HTTP 500 for unexpected database failures.
- Store only email and creation timestamp; never store IP addresses.

## Legal content

The root `LICENSE` names Shiv Pratap Singh and `shiv.safari@gmail.com`. It allows public viewing but no copying, use, modification, publication, distribution, sublicensing, or sale without written permission.

Footer disclosure: “This website and product concept were created with assistance from AI tools. Product visuals are illustrative. ShowNext is an independent project and is not affiliated with or endorsed by any third-party app, platform, or company mentioned or depicted.”

## Acceptance checks

- `npm run typecheck` and `npm run build` pass.
- Layout works at 360px, 768px, and 1440px without horizontal overflow.
- Keyboard users can reach navigation, form, and CTA links with visible focus.
- Reduced-motion users see a static highlighted phone state.
- Valid, invalid, duplicate, honeypot, missing-database, and database-error states are represented in the form UI.
- Production Vercel submission creates one Neon row for a new email and does not expose credentials.
