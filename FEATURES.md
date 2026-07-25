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

## Reviews & Ratings
- Star ratings + comments on events
- **Reviews gated by event completion** — no review option until the admin marks the event "Completed"; enforced both frontend (hidden form) and backend (403)
- One review per user per event (resubmitting edits the existing review)
- Admin can **reply publicly** to a review (shown on the event page as "Response from Evento")
- Admin can **flag/unflag** a review for internal tracking (instead of only deleting)
- Admin can delete a review

## Admin Panel
- **Manage Events** tab: create/edit/delete events, upload images, set capacity
  - Status badge (Upcoming/Completed) + "Complete Event"/"Reopen" toggle — only shown for events that have bookings
  - Red `⚠ N` flaw indicator next to any event with 1–2★ reviews
  - **Auto-complete**: events automatically flip to "Completed" once every confirmed booking's date has passed (hourly scheduled job) — admin can still toggle manually
- **Bookings** tab: view all bookings across events, filter by event; bookings for completed events are hidden automatically (nothing left to manage)
- **Analytics** tab:
  - Totals: events, bookings, users, reviews
  - Bookings-per-day chart (last 14 days)
  - **Average rating trend chart** (cumulative platform rating over the last 14 days) — spot a quality drop at a glance
  - Top rated events
  - **Repeat customers** list (users with 2+ bookings)
  - Review moderation table: search by keyword, sort by rating (low↔high) or newest, **"Find the flaws" filter** (1–2★ only, highlighted rows), reply, flag, delete

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

---
*Not yet built: pricing/capacity-utilization analytics (deferred by request).*
