# Plannorium People Portal

Internal, sign-in-only employee directory, safety, and compliance portal for **Plannorium Ltd** (`people.plannorium.com`).

---

## 1. Product Overview

The Plannorium People Portal allows every Plannorium employee to manage their personal details, emergency contacts, identification, and right-to-work documents in one place, enabling HR and emergency responders to reach crucial details instantly under stress.

- **Sign-in Only:** Zero public or marketing pages. Accessible exclusively via verified `@plannorium.com` accounts.
- **Strict Data Minimization:** **Date of birth is never collected anywhere** in the UI, API, database, or exports.
- **Field-Level Encryption:** Sensitive document numbers and optional health records are encrypted at rest using AES-256-GCM with unique initialization vectors.
- **Private Document Vault:** ID files are stored in Cloudinary as `authenticated` assets (no public URL), under random UUID keys, and opened only through signed download links that expire after 5 minutes.
- **Immutable Audit Logging:** Every read of another person's record, reveal of an ID number, document download, export, and edit is recorded in an append-only audit trail.
- **Bilingual, Apple-style interface:** English and Arabic with RTL support, the system font, light and dark appearance that follows the device, and respect for reduced motion, reduced transparency and increased contrast settings.

---

## 2. Tech Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS v4 (`@theme` tokens in `globals.css`), Lucide icons, Framer Motion
- **Auth:** NextAuth v4 with **Plannorium ID** OIDC provider (`id.plannorium.com`) and Google fallback restricted to `@plannorium.com`
- **Database:** MongoDB Atlas + Mongoose
- **File Storage:** Cloudinary (signed direct uploads, authenticated delivery)
- **Email:** Resend HTTP API for reminders (optional, `RESEND_API_KEY`)
- **Validation:** Zod schemas shared across client and server
- **Forms:** React Hook Form + `@hookform/resolvers/zod`
- **Phone Numbers:** `libphonenumber-js` (stored in E.164)
- **Countries:** `i18n-iso-countries` (EN and AR)
- **Testing:** Vitest

---

## 3. Environment Variables

Create `.env.local` based on `.env.example`:

```bash
NEXTAUTH_URL=https://people.plannorium.com
NEXTAUTH_SECRET= # generate locally: openssl rand -base64 32
PLANNORIUM_ID_ISSUER=https://id.plannorium.com
PLANNORIUM_ID_CLIENT_ID=
PLANNORIUM_ID_CLIENT_SECRET=
ALLOWED_EMAIL_DOMAIN=plannorium.com
OWNER_EMAIL=
ADMIN_EMAILS=
PEOPLE_ENABLE_DEV_AUTH=false
MONGODB_URI=mongodb+srv://...
FIELD_ENCRYPTION_KEY= # 32-byte base64 encoded string: openssl rand -base64 32
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
EMAIL_FROM=team@plannorium.com
RESEND_API_KEY=
CRON_SECRET=
```

---

## 4. Setup & Running Locally

```bash
# Install dependencies
npm install

# Run automated test suite (crypto, validation, access control)
npm test

# Start local Next.js development server
npm run dev
```

**Admin access:** set `OWNER_EMAIL` to your exact primary account, and optionally list your other authorized admin addresses in `ADMIN_EMAILS` (comma-separated). These values are empty in `.env.example`; no address or domain is implicitly an admin. Database role edits cannot grant access to an unlisted email. Settings remain owner-only.

Admins first sign in through a verified Plannorium ID or Google identity, then request a six-digit email code at `/verify-admin`. Codes expire within ten minutes, permit five attempts per active challenge window, and work only with the sign-in that requested them. Resends share a one-minute account cooldown across server instances. Codes are stored as keyed digests, consumed atomically, and never logged. Admin verification lasts at most eight hours and resets on every new primary sign-in. Existing sessions must sign in again after this change.

**Required delivery configuration:** fill `RESEND_API_KEY`, `EMAIL_FROM` (a sender verified with Resend), a strong `NEXTAUTH_SECRET` (at least 32 characters), `NEXTAUTH_URL`, and the existing identity/database settings. Missing email configuration or failed delivery never grants admin access. No live delivery is claimed until those values and the sender domain are configured. Keep all actual secrets out of Git.

**Local test login:** passwordless development login is disabled by default and has no role picker. It requires the explicit server-side `PEOPLE_ENABLE_DEV_AUTH=true`, and is still unavailable in production builds and on Vercel. Do not enable it on a shared server. It cannot bypass admin email verification. The regular sign-in screen uses identity providers only.

**Scheduled job:** `vercel.json` runs `/api/cron/review-and-retention` daily at 03:00 UTC. It refuses to
run unless `CRON_SECRET` is set (Vercel sends it automatically as a Bearer token).

---

## 5. Security & Legal Notice

- **Data Controller:** Plannorium Ltd, 71-75 Shelton Street, London, Greater London, WC2H 9JQ, United Kingdom.
- **Contact:** `privacy@plannorium.com`
- **Robots:** `robots.txt` disallows all crawlers, and `noindex, nofollow` meta headers are enforced on all routes.
