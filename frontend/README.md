# CivicEvents — Frontend

An accessible, responsive portal for city events, audio announcements, captioned promo videos and in-app notifications. Built with **HTML, Tailwind CSS and jQuery only** — no build step.

## Contents

- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Connecting to the backend](#connecting-to-the-backend)
- [Creating an admin account](#creating-an-admin-account)
- [Features](#features)
- [Project structure](#project-structure)
- [Role-based access guards](#role-based-access-guards)
- [Auth & token storage](#auth--token-storage)
- [Backend constraints and how the UI handles them](#backend-constraints-and-how-the-ui-handles-them)

## Quick start

**Requirements:** the backend API running (see [`../backend/README.md`](../backend/README.md)), a modern browser, and any static file server. Python 3 and Node.js both work.

```bash
# 1. Start the backend (in another terminal)
cd backend
npm install
npm run dev                     # → http://localhost:4000

# 2. Serve the frontend
cd frontend
python3 -m http.server 5500     # or: npx serve -l 5500
```

Then open **http://localhost:5500**. You'll be sent to the login page. Create an account there, or sign in as an admin (see below).

> Serve the files over HTTP. Opening them with `file://` is not supported because browsers restrict storage and media for file URLs.

## Configuration

All runtime settings are in [`assets/js/config.js`](assets/js/config.js):

| Key | Default | Purpose |
|---|---|---|
| `apiBaseUrl` | `http://localhost:4000` | Backend origin, **without** `/api` and without a trailing slash |
| `appName` | `CivicEvents` | Name shown in the header, footer and titles |
| `supportEmail` | `support@civicevents.local` | Used for "Contact support / Contact admin" links |
| `pageSize` | `9` | Items per page on the card grids |

The frontend has no `.env` file because it is plain static files. To point it at another backend, change `apiBaseUrl`.

## Connecting to the backend

1. **Database.** Create a PostgreSQL database named `civic-events-db` and run the migration:
   ```bash
   psql -U <db-user> -h localhost -d civic-events-db -f backend/migrations/001_create_tables.sql
   ```
2. **Backend environment.** Edit `backend/.env`:
   ```env
   DB_USER=postgres
   DB_PASS=<your-password>      # note: the code reads DB_PASS, not DB_PASSWORD
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=civic-events-db
   JWT_SECRET=<any-long-random-string>
   ```
3. **Start the API** with `npm run dev` inside `backend/`. Check it at `http://localhost:4000/health`, which should return `{"ok":true}`.
4. **Frontend → API.** Every request goes to `${apiBaseUrl}/api/...` with an `Authorization: Bearer <token>` header (see `request()` in [`assets/js/core.js`](assets/js/core.js)). The backend enables CORS for all origins, so the two servers can run on different ports.
5. **Uploaded media.** Uploaded images, audio and video are served by the backend from `/uploads/...`. The API returns their full URLs (for example `metadata.image_url`, `audio_url` and `video_url`), and the frontend uses those URLs directly.

## Creating an admin account

The UI never lets anyone pick their own role. Create your first admin in one of these ways.

**Option A: promote an existing account (recommended)**
```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```
**Option B: create one through the API** (the signup endpoint accepts `role`):
```bash
curl -X POST http://localhost:4000/api/auth/signup -H "Content-Type: application/json" \
  -d '{"full_name":"Site Admin","email":"admin@example.com","password":"Admin#2026","role":"admin"}'
```
Sign out and back in after promoting an account, because the role is read at login.

## Features

| Area | What's included |
|---|---|
| **Auth** | Sign up with a live password-strength meter and checklist (8+ characters, upper and lower case, number, special character), password confirmation, show/hide password. Login with "Keep me signed in". `?next=` returns you to the page you were on. Automatic sign-out when the token expires. |
| **Layout** | Sticky header with logo, global search, nav, notification bell with unread badge, and profile dropdown. Mobile menu. Admin sidebar on admin pages. Footer with help and contact links. Skip link. |
| **Events** | Card grid with search, location and date-range filters, upcoming/past/all toggle, pagination and shareable filter URLs. Detail page with image, date range, Google Maps link, register and cancel, and feedback (one review per event, editable). Admins also see registrants, average rating and rating distribution, and get edit and delete controls. |
| **Event editor** (admin) | Multipart upload (`image` field) with drag-and-drop, preview, type and size checks (JPG/PNG/GIF ≤ 2 MB), progress bar, and end-after-start validation. |
| **Announcements** | List with inline play/pause preview and real durations (read from the audio file's metadata as cards scroll into view). Detail page with a custom accessible audio player: play/pause, seek, ±10 s, volume, mute, speed, current time and duration, keyboard shortcuts, and a fallback download link. Transcript section. |
| **Promos** | Thumbnails loaded from the first video frame as cards scroll into view, and a CC badge. Detail page with an HTML5 video and an English captions `<track>`, **on by default**, plus a captions toggle and a full transcript. |
| **Notifications** | Bell badge, slide-over drawer, inbox page with all/unread and type filters, detail dialog linking to the related event, announcement or promo, and "mark all read". Polls every 60 s. Admins can delete notifications, one at a time or in bulk. |
| **Admin dashboard** | 8 KPI tiles and 4 charts built from HTML and CSS (platform activity, new users per month, events by status, account status). Each chart has a screen-reader table. Refreshes every 60 s or on demand, with animated transitions. Also shows recent activity and quick actions. |
| **User management** (admin) | Search and filter users, view a profile dialog, and enable or disable accounts with an optimistic toggle that rolls back if the request fails. Admins cannot disable their own account. There is deliberately no role editor. |
| **Profile** | Edit name and email (role and status are read-only and never sent). A 409 email conflict opens a dialog and marks the email field. The header updates immediately. Shows the user's reviews. |
| **My registrations** | Upcoming / Past / Cancelled tabs (WAI-ARIA tabs with arrow keys), each with a count, and cancel with confirmation. |
| **Search** | Searches events, announcements and promos together, with highlighted matches. |
| **UX polish** | Skeleton loaders, toasts (announced through an `aria-live` region), confirmation dialogs, empty states, error states with Retry, a Retry action on network errors, and a "Contact admin" action on 403. Lists are cached for 5 minutes and the cache is cleared after any create, update or delete. |
| **Accessibility** | Semantic landmarks, one `h1` per page, labels and `aria-describedby` on every field, `aria-invalid` with focus moved to the first error, native `<dialog>` (focus trap and Esc to close), visible focus rings, `prefers-reduced-motion` support, alt text, and WCAG AA colour contrast. |

## Project structure

```
frontend/
├── index.html                    Entry point: redirects to home or login
├── login.html, signup.html       Guest-only pages
├── dashboard.html                Resident home
├── events.html, event.html       Events list and detail
├── announcements.html, announcement.html
├── promos.html, promo.html
├── notifications.html            Notification inbox
├── my-registrations.html, profile.html, search.html
├── admin-*.html                  Admin pages (dashboard, users, notifications, editors)
└── assets/
    ├── css/app.css               Component styles (buttons, inputs, cards, badges, switch, dialogs)
    ├── img/favicon.svg
    └── js/
        ├── config.js             Runtime configuration (API base URL)
        ├── tailwind.config.js    Shared Tailwind theme
        ├── core.js               CE.utils, CE.flash, CE.auth (auth context + guards), CE.api (HTTP client)
        ├── ui.js                 CE.ui: toasts, dialogs, skeletons, pagination, forms, cards, admin actions
        ├── layout.js             CE.page() boot + header/footer/sidebar, CE.notifications
        └── pages/*.js            One small script per page
```

Every page uses the same pattern. The HTML contains only that page's `<main>`, and the page script calls:

```js
CE.page({ access: 'user' | 'admin' | 'guest', active: 'events', admin: true }, (user) => { /* page logic */ });
```

`CE.page` runs the role guard, renders the shared layout around `<main>`, shows any pending flash message, and only then runs the page logic.

## Role-based access guards

The frontend guards exist for UX only. **The backend is the security boundary**: its `authenticate` and `authorize(['admin'])` middleware rejects unauthorised requests whatever the UI does. Every guard is marked in the code with a `ROLE GUARD` comment:

| Where | What it does |
|---|---|
| `CE.auth.guard()` in [`core.js`](assets/js/core.js) | Page-level guard. `guest` pages send signed-in users home. `user` pages send visitors to login, or show an "expired" message if a stored token has timed out. `admin` pages show a 403 "Administrators only" view with a Contact admin link to normal users. |
| `CE.page()` in [`layout.js`](assets/js/layout.js) | Calls the guard before any page code runs, and only renders the admin sidebar for admins. |
| `MAIN_NAV` in [`layout.js`](assets/js/layout.js) | Nav entries flagged `admin` (Dashboard, Admin) are never rendered for normal users. |
| `[data-admin-only]` in [`layout.js`](assets/js/layout.js) | Static admin buttons in the HTML (e.g. "+ New event") are removed from the page for normal users. |
| `adminControls()` in [`ui.js`](assets/js/ui.js) | Edit, delete and publish buttons on cards and detail pages are only rendered for admins. |
| `api.visible()` / `api.list()` in [`core.js`](assets/js/core.js) | The API returns drafts to everyone, so unpublished items are filtered out for normal users, and a draft's detail URL shows "not found". |
| `cards.event()` in [`ui.js`](assets/js/ui.js) and `event.js` | Only normal users see Register/Cancel. Only admins load registrants and the full feedback list (that endpoint is admin-only). |
| `notifications.remove()` in [`layout.js`](assets/js/layout.js) | Delete controls for notifications are only rendered for admins. |
| `admin-*.js` | Each admin page boots with `access: 'admin'`. |

## Auth & token storage

- On login the token and `{ id, full_name, email, role }` are stored as the global auth context (`CE.auth`).
- **"Keep me signed in" unchecked → `sessionStorage`**: cleared when the browser session ends. This is the safer default, especially on shared devices.
- **Checked → `localStorage`**: survives restarts. The trade-off is that any script running on this origin (for example through an XSS bug) can read it. To mitigate this, all API content is HTML-escaped before rendering, and the token is short-lived (1 h).
- The JWT's `exp` claim is decoded client-side. Expired sessions are signed out on page load *and* at the exact moment of expiry while a page is open. Any `401` from the server also signs the user out and shows "Your session has expired".
- `?next=` redirects are restricted to local `*.html` pages to prevent open redirects.

## Backend constraints and how the UI handles them

The task is frontend-only, so the provided API was not changed. These are its behaviours and how the UI handles each one:

| API behaviour | UI handling |
|---|---|
| `GET /events` returns all events, with no filtering or pagination | Filtering, sorting and pagination happen in the browser. Drafts are hidden from normal users. |
| Event create and update ignore `published` | The published switch is still sent, but event visibility can't actually change until the backend stores the field. |
| Promo create always publishes | If "Published" is off, the UI creates the promo and then calls `PATCH /promos/:id/unpublish`. |
| Announcement update doesn't replace the audio | The edit form changes title and published only, and explains how to replace a recording. |
| No "mark notification read" endpoint | Read state is stored per user in `localStorage`. Opening a notification marks it read straight away and reverts if `GET /notifications/:id` fails. |
| No endpoint to create a broadcast notification | Broadcasts are created automatically when an admin creates an event, announcement or promo (or publishes a draft), and the admin notifications page says so. |
| `GET /event-feedback/event/:id` is admin-only | Admins see the average and every review. Residents see and edit their own review, using `/my-feedback`. |
| Re-registering after cancelling returns `409` | The event page explains that online re-registration isn't available after cancelling, so users don't hit an error. |
| No duration or transcript fields on announcements | The duration is read from the audio file's metadata. A transcript is shown if a `transcript` field is ever returned. |
| Captions are stored as plain `caption_text` | A WebVTT file is built in the browser (or the text is used as-is if it already starts with `WEBVTT`) and attached as the `<track>`. |
