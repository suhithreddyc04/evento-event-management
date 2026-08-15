# Evento — Event Planning & Booking Platform

Evento is a full-stack MERN app for browsing event packages (weddings, birthdays, corporate events, and more), booking them online, and managing the whole lifecycle — waitlists, payments, reviews, and admin analytics — from a single dashboard.

**Live app:** https://evento-event-management-chi.vercel.app
**Live API:** https://evento-backend-se2f.onrender.com

> The backend runs on Render's free tier and sleeps after ~15 minutes of inactivity — the first request after that can take 30-50 seconds to wake up. That's expected, not a bug.

## Features

See [FEATURES.md](FEATURES.md) for the full, running list. Highlights:

- Email/password auth + Google Sign-In, JWT sessions, profile with avatar upload
- Event browsing with pagination, search, filters, sorting, and an interactive map (Leaflet + OpenStreetMap, no API key needed)
- Booking flow with per-category custom fields, animated date/time pickers, and an automatic waitlist system
- Per-event pricing with Razorpay advance/final payment flow, signature-verified server-side and backed by a webhook
- Star ratings & reviews, gated behind event completion (and full payment, for priced events)
- Admin panel: manage events, manage bookings, and an analytics dashboard (booking trends, rating trends, review moderation, repeat customers)
- Scheduled background jobs for booking reminders and auto-completing past events
- Dark mode, toast notifications, and animated page transitions throughout

## Tech Stack

**Frontend:** React 18, Vite, React Router, Framer Motion, Bootstrap, Leaflet/React-Leaflet, Axios
**Backend:** Node.js, Express, Mongoose (MongoDB), JWT, bcrypt, Multer + Cloudinary, Nodemailer, Razorpay, Google Auth Library
**Infra:** MongoDB Atlas · Render (backend) · Vercel (frontend) · GitHub Actions (CI)

## Project Structure

```
EVENTO/
├── backend/   Express API, Mongoose models, scheduled jobs
└── frontend/  React + Vite app
```

## Requirements

- [Node.js](https://nodejs.org/en/download) 18+
- A MongoDB connection string (local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))

## Local Setup

### Backend

```bash
cd backend
npm install
cp .env.example .env   # then fill in your own values, see below
npm start
```

Runs on `http://localhost:3001`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:5173`.

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in your own values:

| Variable | Purpose |
|---|---|
| `PORT` | Backend port (defaults to `3001`) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign auth tokens |
| `CLIENT_URL` | Frontend origin(s) — comma-separated if you have more than one (e.g. prod + a Vercel preview). Enforced as the CORS allowlist and used for links in emails |
| `EMAIL_USER` / `EMAIL_PASS` | Gmail address + [app password](https://myaccount.google.com/apppasswords) used to send transactional emails |
| `ADMIN_EMAILS` | Comma-separated allowlist — accounts logging in with these emails become admins |
| `GOOGLE_CLIENT_ID` | OAuth client ID for Google Sign-In |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Image uploads (event images, avatars) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Payment processing (optional — payment routes return 503 if unset) |
| `RAZORPAY_WEBHOOK_SECRET` | Verifies incoming Razorpay webhook signatures |

The frontend reads two build-time variables (set as a local `.env` for `vite dev`, or as project env vars on your hosting provider):

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Base URL of the backend API (falls back to `http://localhost:3001`) |
| `VITE_GOOGLE_CLIENT_ID` | Same Google OAuth client ID as the backend |

## Deployment

- **Frontend** is deployed on [Vercel](https://vercel.com), root directory `frontend`, auto-deploys on every push to `master`.
- **Backend** is deployed on [Render](https://render.com), auto-deploys on every push to `master`.
- **Database** is a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster.

## CI

GitHub Actions ([.github/workflows/ci-cd.yml](.github/workflows/ci-cd.yml)) lints and builds the frontend and installs/tests the backend on every push and pull request to `master`. Actual deployment is handled separately by Render's and Vercel's own GitHub integrations.

## API Overview

All routes are relative to the backend base URL. Routes marked 🔒 require a JWT (`Authorization: Bearer <token>`); 🔒👑 require an admin account.

<details>
<summary>Auth & Profile</summary>

| Method | Route | Description |
|---|---|---|
| POST | `/register` | Create an account |
| POST | `/login` | Email/password login |
| POST | `/auth/google` | Google Sign-In |
| POST | `/forgot-password` | Email a password reset link |
| POST | `/reset-password/:token` | Complete a password reset |
| PUT | `/change-password` 🔒 | Change password while logged in |
| GET | `/profile` 🔒 | Get current user's profile |
| PUT | `/profile` 🔒 | Update name/email |
| POST | `/profile/avatar` 🔒 | Upload profile avatar |
| DELETE | `/profile/avatar` 🔒 | Remove profile avatar |

</details>

<details>
<summary>Events & Favorites</summary>

| Method | Route | Description |
|---|---|---|
| GET | `/events` | List events — pagination, search, rating filter, sort |
| GET | `/events/:id` | Event details |
| GET | `/events/:id/reviews` | List an event's reviews |
| POST | `/events/:id/reviews` 🔒 | Leave/update a review (must have booked, and paid in full if priced) |
| DELETE | `/reviews/:id` 🔒 | Delete own review (or any, if admin) |
| POST | `/favorites/:eventId` 🔒 | Add to favorites |
| DELETE | `/favorites/:eventId` 🔒 | Remove from favorites |
| GET | `/favorites/mine` 🔒 | List current user's favorites |

</details>

<details>
<summary>Bookings & Payments</summary>

| Method | Route | Description |
|---|---|---|
| POST | `/bookings` 🔒 | Book an event (confirmed / waitlisted / pending_payment) |
| GET | `/bookings/mine` 🔒 | Current user's booking history |
| DELETE | `/bookings/:id` 🔒 | Cancel a booking (promotes next waitlisted booking) |
| POST | `/payments/create-order` 🔒 | Create a Razorpay order for a booking's advance |
| POST | `/payments/verify` 🔒 | Verify advance payment signature, confirm booking |
| POST | `/payments/final/create-order` 🔒 | Create a Razorpay order for the remaining balance |
| POST | `/payments/final/verify` 🔒 | Verify final payment signature |
| POST | `/webhooks/razorpay` | Razorpay webhook — signature-verified fallback confirmation |

</details>

<details>
<summary>Admin</summary>

| Method | Route | Description |
|---|---|---|
| POST | `/admin/upload` 🔒👑 | Upload an image (Cloudinary) |
| POST | `/admin/events` 🔒👑 | Create an event |
| PUT | `/admin/events/:id` 🔒👑 | Update an event |
| DELETE | `/admin/events/:id` 🔒👑 | Delete an event |
| PUT | `/admin/events/:id/complete` 🔒👑 | Toggle an event's Completed status |
| GET | `/admin/bookings` 🔒👑 | All bookings, filterable by event |
| PUT | `/admin/bookings/:id/final-amount` 🔒👑 | Override a booking's final balance owed |
| GET | `/admin/analytics` 🔒👑 | Totals, booking trend, rating trend, top-rated events |
| GET | `/admin/reviews` 🔒👑 | All reviews, for moderation |
| PATCH | `/admin/reviews/:id/flag` 🔒👑 | Flag/unflag a review |
| POST | `/admin/reviews/:id/reply` 🔒👑 | Post a public admin reply to a review |
| GET | `/admin/customers` 🔒👑 | Repeat customers (2+ bookings) |

</details>

## Database Schema

MongoDB, 4 collections linked by ObjectId references (no embedding except `favorites`).

```
User.favorites  ──[array of IDs]──>  Event
Booking.user    ────────────────>  User
Booking.event   ────────────────>  Event
Review.user     ────────────────>  User
Review.event    ────────────────>  Event
Event.manager   ────────────────>  User
```

<details>
<summary>User — collection <code>log_reg_form</code> (model: <code>FormData.js</code>)</summary>

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Primary key |
| `name` | String | Display name |
| `email` | String | Login identity |
| `password` | String | Hashed password (unused for Google sign-in) |
| `googleId` | String | Set if the account signed up via Google OAuth |
| `avatarUrl` | String | Profile picture URL |
| `isAdmin` | Boolean | Platform-wide admin flag, synced from `ADMIN_EMAILS` on every login |
| `role` | enum: `client`, `manager` | Event-scoped manager role (no platform-wide access; `isAdmin` always outranks) |
| `favorites` | [ObjectId → Event] | Favorited event IDs |
| `resetPasswordToken` | String | Password-reset flow |
| `resetPasswordExpires` | Date | Password-reset token expiry |

</details>

<details>
<summary>Event</summary>

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Primary key |
| `name` | String (required) | Event title |
| `description` | String (required) | Full description |
| `imageUrl` | String (required) | Cover image |
| `category` | String (required, indexed) | Used for filtering |
| `location` | String | Venue/location |
| `details` / `activities` / `decorations` / `games` | String | Category-specific copy |
| `capacity` | Number \| null | Max bookings; `null` = unlimited |
| `price` | Number \| null | Total price; `null` = "contact for pricing" |
| `advanceAmount` | Number \| null | Deposit required to book; `null` = no advance needed |
| `completed` | Boolean | Marks event as over — gates reviews, triggers final payments |
| `manager` | ObjectId → User \| null | Manager assigned to run this event |
| `avgRating` | Number \| null | Cached average review rating |
| `reviewCount` | Number | Cached review count |
| `bookedCount` | Number | Cached confirmed-booking count |

Cached aggregates (`avgRating`, `reviewCount`, `bookedCount`) are kept in sync by `services/eventStats.js` whenever a Review or Booking changes, so the events **list** endpoint can read them directly instead of aggregating per event on every request. The single-event endpoint still recomputes fresh since it's only ever one document.

</details>

<details>
<summary>Booking</summary>

**Who booked what**

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Primary key |
| `event` | ObjectId → Event | Which event |
| `user` | ObjectId → User | Who booked |
| `name`, `email`, `phone`, `address` | String | Contact info snapshot at booking time |
| `date` | Date | Requested event date |
| `details` | Mixed | Category-specific answers (e.g. guest count, venue preference) |
| `specialRequests` | String | Free-text notes |
| `createdAt` | Date | Booking timestamp — also drives waitlist FIFO order |

**Status**

| Field | Type | Description |
|---|---|---|
| `status` | enum: `confirmed`, `pending_payment`, `waitlisted`, `cancelled` | Drives the whole booking lifecycle |

**Advance payment** (paid at booking time)

| Field | Type | Description |
|---|---|---|
| `advanceAmount` | Number \| null | Deposit owed, snapshotted from the event at booking time |
| `razorpayOrderId` | String | Razorpay order created for the advance |
| `razorpayPaymentId` | String | Razorpay payment ID once paid |

**Final payment** (owed once the event completes)

| Field | Type | Description |
|---|---|---|
| `finalAmount` | Number \| null | Remaining balance = event price − advance |
| `finalPaymentStatus` | enum: `not_required`, `pending`, `paid` | Whether the balance is due yet |
| `finalRazorpayOrderId` | String | Razorpay order for the final balance |
| `finalRazorpayPaymentId` | String | Razorpay payment ID once paid |

**Cancellation & refund**

| Field | Type | Description |
|---|---|---|
| `cancelledAt` | Date \| null | When it was cancelled |
| `refundStatus` | enum: `not_applicable`, `requested`, `partial`, `refunded`, `rejected`, `failed` | Refund state |
| `refundRequestedAmount` | Number \| null | Amount owed, computed at cancel time |
| `refundedAmount` | Number \| null | Actual total refunded so far |
| `refundId` | String | Razorpay refund ID(s), comma-joined if both portions were refunded |
| `refundedAt` | Date \| null | Timestamp of the last refund action |
| `advanceRefunded` | Boolean | Has the advance portion specifically been refunded? |
| `finalRefunded` | Boolean | Has the final portion specifically been refunded? |

**Misc**

| Field | Type | Description |
|---|---|---|
| `reminderSent` | Boolean | Stops the reminder-email job from sending duplicates |

</details>

<details>
<summary>Review</summary>

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Primary key |
| `event` | ObjectId → Event | Which event |
| `user` | ObjectId → User | Who wrote it |
| `name` | String (required) | Reviewer's display name |
| `rating` | Number, 1–5 (required) | Star rating |
| `comment` | String | Review text |
| `createdAt` | Date | Timestamp |
| `flagged` | Boolean | Admin moderation flag |
| `adminReply.text` | String | Admin's reply text |
| `adminReply.repliedAt` | Date \| null | When admin replied |

</details>

**Indexes worth knowing (constraints, not just lookup speed):**

| Collection | Index | Type | Purpose |
|---|---|---|---|
| `Event` | `category` | Regular | Every events-list request filters by category |
| `Booking` | `event + user` | Unique, partial (excludes `cancelled`) | One active booking per user per event; re-booking after cancel is allowed |
| `Review` | `event + user` | Unique | One review per user per event — resubmitting edits instead of duplicating |

## License

MIT — see [LICENSE](LICENSE).
