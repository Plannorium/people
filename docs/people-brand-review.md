# Plannorium People brand and admin access review

## Result

Dark-only People visual system across sign-in, seven onboarding routes, profile, directory, record, emergency lookup, audit, reminders, settings and privacy. Shared Keystone wordmark, generated icons, 1200 × 630 share image, Sora/Inter/Plex Arabic, emerald controls and a short hover edge on section cards. English and Arabic layouts mirror; emails, phone numbers, document numbers, dates and time zones retain left-to-right reading where styled.

The owner's follow-up explicitly expanded the original visual-only scope to admin access security. Security changes are isolated in their own commit. No staff profile validation, document encryption or storage algorithms were changed. No actual environment file, recipient list or secret was edited, and no real verification email was sent during development.

## Admin access

- `OWNER_EMAIL`: exact owner account; `ADMIN_EMAILS`: exact additional admin accounts. Empty configuration grants nobody admin access. No wildcard/domain-based elevation, and database roles cannot bypass the list. Authorized personal addresses may use an external email domain.
- Existing provider email-verification checks remain. After primary sign-in, admins need a fresh six-digit email code for that sign-in. Until then they have employee access only; server callbacks and admin page guards enforce this, including stale elevated cookies.
- Ten-minute maximum challenge lifetime; five attempts; one-minute per-account resend cooldown; keyed digests; session binding; atomic consumption; MongoDB TTL cleanup; origin-checked send endpoint. No code logging or development pretend-delivery.
- Elevation expires after eight hours and resets on every primary sign-in. Removing an address from configuration removes privileges on the next authorization check. Offboarded/missing accounts and database refresh failures fail closed.
- Placeholder setup: `.env.example`. Configure mail sender and provider credentials before testing delivery. Settings remain owner-only; the directory role field is read-only because configuration governs admin access.
- The optional passwordless local test provider now requires an explicit opt-in, never runs in production/Vercel, and cannot choose an admin role or skip the email gate.

## Design judgement calls

- Kept seven real routes, rather than pretending the reference's combined employment/review is one step.
- Kept the existing limit of three emergency contacts. No reorder behavior was invented; the existing remove action remains.
- Kept actual document removal instead of presenting it as Replace. Existing stored records do not provide original filename/size, so no fake filename or size is shown.
- Did not invent autosave timestamps or a Health skip action. Save/continue and Save/finish-later behavior remains.
- Admin, employment, review, profile, privacy and sign-in use shared primitives where no reference image exists. Sign-in has a short bar entrance animation, disabled with reduced motion.
- Existing English-only profile/admin copy remains English; RTL layout is checked but this does not claim a new full Arabic translation of every legacy label.
- The green identity button uses a dark monochrome mark for legibility. Header/standalone marks and generated assets retain the fixed emerald keystone.

## Private metadata

People has no indexable public marketing pages. Privacy remains protected. Global noindex/nofollow and crawler exclusion remain, with an intentionally empty public sitemap. Structured data identifies the private WebSite without offers or ratings. Public favicon-prefixed images use the existing static asset convention; obsolete logo allowances were removed from the proxy.

| Route | Title | Canonical | Access/indexing |
| --- | --- | --- | --- |
| /sign-in | Sign in · Plannorium People | https://people.plannorium.com/sign-in | Public auth flow, noindex |
| /privacy | Privacy notice · Plannorium People | https://people.plannorium.com/privacy | Protected, noindex |
| /me | My details · Plannorium People | https://people.plannorium.com/me | Protected, noindex |
| /onboarding/* | Your details · Plannorium People | Parent /onboarding metadata | Protected, noindex |
| /verify-admin | Verify admin access · Plannorium People | https://people.plannorium.com/verify-admin | Protected, noindex |

There is no public ranking/canonical coverage claim for staff routes. The sitemap contains no auth, staff or admin URL and no fabricated dates.

## Verification

- `npm test`: 56 tests pass, exit 0; includes actual JWT callback/proxy security tests, code policy/storage boundary tests, metadata tests and all existing 33 tests.
- `npx tsc --noEmit`: exit 0.
- `npm run build`: exit 0.
- Lint baseline: 13 errors and 4 warnings. No new errors/warnings; existing explicit-any and React Hook Form compiler warnings are outside this task.
- All seven onboarding screens tested for document overflow at 360, 390, 768, 1024 and 1440 in both languages; no horizontal document scroll. Profile, directory, record, emergency, audit, reminders, settings, privacy and sign-in also checked at these widths. A directory screen-reader label overflow and the mobile footer were fixed.
- Browser review uses an isolated synthetic-data harness, without production APIs, database access, authentication handlers or real records. It is labeled as a sample preview. This is visual verification, not a live identity-provider or MongoDB/Resend integration test.
- Real delivery, real database concurrency/TTL behavior and authenticated production workflows require configured infrastructure and remain deployment verification items. Tests exercise the query boundaries and atomic-consumption outcomes using mocks; they do not claim a real MongoDB integration run.
- Generated icons have opaque backgrounds, correct Keystone geometry and safe margins. Old public logo PNGs were deleted.

## Screenshots and receipts

Screens containing staff information use synthetic records only.

- [Personal](screens/personal-desktop.png), [contacts](screens/contacts-desktop.png), [identification](screens/identification-desktop.png), [health](screens/health-desktop.png).
- [Arabic mobile](screens/health-arabic-mobile.png).
- [Admin verification](screens/admin-verification-desktop.png), [Arabic verification](screens/admin-verification-arabic-mobile.png).
- [Actual local production sign-in](screens/sign-in-production.png).
- [170 final responsive measurements](responsive-checks.json): 17 screens × 5 widths × 2 languages, zero document overflow.
- [Local production HTTP/metadata checks](production-metadata-checks.json): public sign-in uses its own canonical and the new 1200 × 630 image; private/admin routes redirect (307); unauthenticated verification API returns 401; robots, empty sitemap and icon assets return 200.
