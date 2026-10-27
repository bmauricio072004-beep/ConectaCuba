# ConectaCuba

The informative website is at /. The installed app starts at /app/. Keep their entry pages and offline fallbacks separate. This is a buildless HTML/JavaScript app with Supabase; copy final source assets into dist/ for publication.

## Structure

- People: Empleos, Postulaciones, Cuenta. The CV is inside Cuenta.
- Saved jobs belong next to discovery, not in account settings. #guardadas works for guests and signed-in users; #cuenta/saved remains compatible. Bookmarks are device-local and separated by account. The list resolves public IDs beyond the most recent feed, handles unavailable offers and preserves its context when returning from an offer.
- Businesses: Vacantes, Mi negocio, Cuenta. Applicants remain inside their vacancy.
- auth.js owns sessions, routing, account/CV tools and integration callbacks.
- opportunities.js owns collapsed search, public offers, business profiles/reviews, personal application details and review moderation.
- hiring.js owns the employer vacancy → applicants → application flow.
- ios.css is the app theme; the informative website retains landing.css.
- The app uses a single sand/petroleum theme with reusable continuous lists, settings groups, detail pages and action bars. Mobile root views retain three bottom tabs; detail and editing views have a back action instead. The offer has a fixed mobile application action. Existing web/PWA identities stay unchanged. Future services, shops, maps and plans are not exposed.

Important routes:

| Route | Purpose |
| --- | --- |
| #empleos | Public feed |
| #guardadas | Device-local saved offers |
| #oferta/JOB_ID | Complete offer |
| #oferta/JOB_ID/company | Business profile |
| #oferta/JOB_ID/reviews | Approved reviews |
| #cuenta/applications | Personal applications |
| #cuenta/postulacion/APPLICATION_ID | Personal application details |
| #cuenta/menu | Account menu |
| #cuenta/resume | CV sections |
| #cuenta/resume/editar/SECTION | Edit one CV section |
| #cuenta/resume/vista | Browser PDF preview/printing |
| #cuenta/jobs | Employer vacancies |
| #cuenta/vacante/JOB_ID | Applicants for a vacancy |
| #cuenta/vacante/JOB_ID/postulante/APPLICATION_ID | Employer application detail |
| #cuenta/admin | Business approvals |
| #cuenta/review-admin | Review moderation |

Acceptance and rejection are manual employer actions, not automatic hiring decisions or employment contracts. Closing a vacancy does not silently reject applicants. New applications capture public offer details in job_snapshot and share an independent CV snapshot. CV section edits PATCH only the changed fields to preserve other sections and concurrent edits.

## Reviews and privacy

business_reviews is private to its author and administrators. Confirmed personal accounts can submit one review per business, with a limit of three new reviews a day. Authors declare their work relationship; the app does not label that relationship automatically verified.

Only administrators can publish opinions. The owner authorized a pilot exception allowing administrators to moderate their own reviews; the UI shows that exception. Approved, anonymous content is mirrored into business_review_public. Edits or withdrawal remove that publication. business_rating_stats uses security invoker and aggregates only visible publications. Employers cannot read private authorship or evidence or moderate their own business reviews.

Keep authorization in the database. Company profiles read the existing sanitized business_directory for an offer; there is no geographical directory, map or service marketplace UI.

## Checks and preview

Run the relevant checks:

    node scripts/verify-workspace.cjs
    node scripts/verify-hiring.cjs
    node scripts/verify-session-lifecycle.cjs
    node scripts/verify-opportunities.cjs

supabase/verify_core_workflows.sql tests RLS, approval, application outcomes, snapshots, moderation and withdrawal in a transaction ending in ROLLBACK. Its review self-moderation assertions predate the authorized pilot exception and need to be reconciled before rerunning it. It is not part of this frontend release's verification. Use fictitious fixtures; do not create real test accounts, change real applicant outcomes or publish sample reviews.

Copy current assets to dist/, then run node scripts/preview-hiring.cjs for UI QA. Its generated pages use an in-memory backend and replace only that frame's storage. /_qa_hiring_mobile.html checks 320/360/390/768 px and guest, long-content, empty and admin scenarios; /_qa_overview.html shows discovery, offer and account views. Local fixture query flags include role=person, accepted=1, reviews=1, pending=1, admin=1, catalog=1, guest=1, long=1 and empty=1.

Before release, remove every dist/**/_qa* file and copy all final assets to dist/. Run node scripts/verify-release.cjs to check source/build parity, fixture exclusion, dependency order and offline-cache revisions. Use the Sites publishing flow and preserve the current audience.

Real email delivery, confirmation and password recovery still need an end-to-end check with the configured mail service. Do not substitute mock results for that check.
