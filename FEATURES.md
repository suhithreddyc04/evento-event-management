# Evento — Feature Log

Running log of what the platform can do. Updated alongside every feature change.

## Auth & Accounts
- Register / login with email + password, JWT-based sessions
- Google Sign-In (OAuth)
- Forgot password / reset password via emailed link
- Change password (logged-in)
- Admin accounts via `ADMIN_EMAILS` allowlist in `.env`
- Profile page: edit name/email, upload avatar (Cloudinary), or remove it back to the placeholder icon
- Avatar shown in the header/title bar's profile menu on every page, updates immediately after a new upload

## Browsing Events
- Event listing with pagination
- Category browsing (`category.jsx`)
- Search, filters, and sort (`EventFilters.jsx`)
- Event detail page with map (Leaflet + OpenStreetMap, no API key) and location autocomplete
- Favorites — save/unsave events, dedicated Favorites page

## Booking
- Book an event with per-category custom fields (guest count, venue preference, etc.)
- Base booking form: name, **contact phone number**, venue address, event date **and time** (combined into a single datetime before saving), plus special requests
- Animated calendar date picker and time-slot picker (Framer Motion) replace the plain native date/time inputs — sliding month transitions, staggered day/slot fade-in, and a shared-layout "traveling highlight" on the selected day/time
- Birthday bookings now also collect expected guest count (previously the only category missing it)
- **Waitlist system**: once an event hits capacity, new bookings go to `waitlisted` status instead of being rejected; capacity checks only count `confirmed` bookings
- **Auto-promotion**: cancelling a confirmed booking automatically promotes the oldest waitlisted booking to confirmed and emails that user
- Thank-you/confirmation message shown immediately after booking, differentiated for confirmed vs. waitlisted
- My Bookings page — view booking history, cancel a booking (cancel hidden once the event is completed)
- **Booking reminder emails** — sent automatically ~1 day before a confirmed booking's date (hourly scheduled job, `reminderSent` flag prevents duplicates)
- Booking confirmation emails only sent for `confirmed` bookings (not for waitlisted, to avoid inbox clutter)

## Pricing & Payments (Razorpay)
- Admin sets a per-event `price` and optional `advanceAmount` (deposit) when creating/editing an event
- Events with an `advanceAmount` put new bookings into `pending_payment` status until the advance is paid via Razorpay Checkout; bookings confirm automatically on successful payment (signature-verified server-side)
- Once an event is marked "Completed", any confirmed booking that paid an advance is flagged for the remaining balance (`event.price - advanceAmount`) as `finalAmount`, payable through a second Razorpay Checkout flow
- Admin can manually override a booking's `finalAmount` (e.g. adjust for extra guests/services actually used)
- **Reviews gated behind final payment** on events with a price — can't leave a review until the balance is settled
- Razorpay **webhook** endpoint (`POST /webhooks/razorpay`) verifies `x-razorpay-signature` and confirms advance/final payments server-side as a fallback to the client-side confirm call (covers cases where the user closes the tab mid-payment)
- Payment routes degrade gracefully (503 "Payments are not configured") if Razorpay keys aren't set — the rest of the app still works for free events
- **Refunds on cancellation, gated behind admin approval**: cancelling a booking that already paid (advance and/or the final balance) never moves money on its own — it flags `refundStatus: 'requested'` with the amount owed. An admin/manager reviews it in the Bookings tab and either **Approves** (issues the actual Razorpay refund) or **Rejects** it; a failed Razorpay call can be retried from the same screen. Cancelling no longer deletes the booking — it's kept with `status: 'cancelled'` as an audit trail, and no longer blocks rebooking the same event (the uniqueness constraint is a partial index that excludes cancelled bookings)

## Reviews & Ratings
- Star ratings + comments on events
- **Reviews gated by event completion** — no review option until the admin marks the event "Completed"; enforced both frontend (hidden form) and backend (403)
- One review per user per event (resubmitting edits the existing review)
- Admin can **reply publicly** to a review (shown on the event page as "Response from Evento")
- Admin can **flag/unflag** a review for internal tracking (instead of only deleting)
- Admin can delete a review

## Admin Panel
Each section is its own route now (`/admin/events`, `/admin/events/new`, `/admin/bookings`, `/admin/analytics`, `/admin/reviews`, `/admin/customers`) instead of client-side tabs on one page — direct links, browser back/forward, and page refresh all work per-section. A shared `AdminNav` renders the same nav row on every page; visibility of admin-only links (Add Event, Analytics, Customers) still follows the same permission split as before.

- **Manage Events** (`/admin/events`): create/edit/delete events, upload images, set capacity
  - Status badge (Upcoming/Completed) + "Complete Event"/"Reopen" toggle — only shown for events that have bookings
  - Red `⚠ N` flaw indicator next to any event with 1–2★ reviews
  - **Auto-complete**: events automatically flip to "Completed" once every confirmed booking's date has passed (hourly scheduled job) — admin can still toggle manually
  - Add/Edit now live on their own pages (`/admin/events/new`, `/admin/events/:id/edit`)
- **Bookings** (`/admin/bookings`): view bookings, filter by event
  - **Active / Cancelled toggle**: cancelled bookings are their own explicit view (`?status=cancelled`) rather than mixed into or hidden from the regular list — the default Active view still surface a cancelled booking whose refund is still `requested` or `failed`, since that needs action, but the Cancelled tab shows the full cancellation history regardless of resolution
  - **Refund column**: Approve/Reject a requested refund, or Retry one that failed — see Payments below
- **Reviews** (`/admin/reviews`): review moderation — search by keyword, sort by rating (low↔high) or newest, **"Find the flaws" filter** (1–2★ only, highlighted rows), reply, flag, delete. Managers see this scoped to their own events (matches the existing backend scoping — previously the UI only exposed this to admins even though managers already had API access to it)
- **Analytics** (`/admin/analytics`, admin only):
  - Totals: events, bookings, users, reviews
  - Bookings-per-day chart (last 14 days)
  - **Average rating trend chart** (cumulative platform rating over the last 14 days) — spot a quality drop at a glance
  - Top rated events
- **Customers** (`/admin/customers`, admin only): **Repeat customers** list (users with 2+ bookings)

## Emails (via Nodemailer/Gmail)
- Password reset
- Booking confirmation (confirmed bookings only)
- Waitlist-promoted notification
- Booking reminder (~1 day before)

## Background Jobs
- Hourly scheduler (`runScheduledJobs` in `backend/index.js`) handles auto-complete + reminder emails; runs once on server startup and every hour after

## UI/UX
- Framer Motion page transitions, scroll-reveal animations, count-up stats
- Skeleton loading states
- Toast notifications
- Header logo links back to the homepage from anywhere; a back button (browser history, falls back to homepage) appears on every page except the homepage itself
- **Dark mode** — toggle in the header, defaults to OS preference, persisted across sessions (`ThemeContext.jsx`)
- India-restricted location autocomplete (Nominatim results biased/filtered to India)
- Clickable event/category cards (whole card navigates, not just a "View" link/button)
- Scroll-in `Reveal`/`StaggerGroup` entrance animations applied across About, event details, Footer, auth pages, and empty states
- Expanded multi-column Footer (brand blurb, quick links, contact, social icons) shown site-wide
- Friendlier empty states (icon + copy + CTA) on Profile, Favorites, and My Bookings when there's nothing to show yet

## Deployment
- **Frontend**: Vercel — `https://evento-event-management-chi.vercel.app` (root directory `frontend`, Vite preset, auto-redeploys on push to `master`)
- **Backend**: Render (free tier) — `https://evento-backend-se2f.onrender.com` (auto-redeploys on push to `master`; free tier sleeps after ~15 min idle, first request after that takes ~30-50s to wake up)
- **Database**: MongoDB Atlas, network access open to `0.0.0.0/0` (required since Render/Vercel free tiers have no static IP)
- Frontend build-time env vars (`VITE_API_URL`, `VITE_GOOGLE_CLIENT_ID`) set in Vercel project settings; backend secrets set directly in Render's Environment tab — nothing sensitive is committed to git
- Backend's `CLIENT_URL` env var and the Google OAuth Client's "Authorized JavaScript origins" both point at the live Vercel URL (required for CORS and Google Sign-In to work in production)

---
*Not yet built: pricing/capacity-utilization analytics (deferred by request); Razorpay webhook secret not yet registered in the Razorpay dashboard (optional hardening, deferred).*
