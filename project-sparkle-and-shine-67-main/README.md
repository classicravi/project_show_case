# ServePro — Service Provider Onboarding Portal

A full-stack onboarding and verification portal for a home-services marketplace
(Urban Company / ExtraHand style). Service providers register, complete a profile,
upload verification documents and track their application status. Admins search,
filter, review documents and approve or reject applications with remarks.

Built for the MERN Stack Intern assignment.

---

## Live links

| What | URL |
| --- | --- |
| Live frontend | _add your published URL here_ |
| Live backend (API) | Same origin — the REST/Data API is served by the managed backend (see "API" below) |
| GitHub repository | _add your repo URL here_ |
| Demo video (3–5 min) | _add your video URL here_ |

---

## Demo credentials

All demo accounts use the password: `ServePro#2026`

| Role | Email | Notes |
| --- | --- | --- |
| Admin | `admin@servepro.dev` | Full verification queue access |
| Provider (pending) | `ravi.plumber@servepro.dev` | Application awaiting review |
| Provider (approved) | `neha.electric@servepro.dev` | Verified provider |
| Provider (rejected) | `imran.clean@servepro.dev` | Rejected with reviewer remarks |

You can also register a brand-new provider from the **Register** tab — new sign-ups
are always created with the `provider` role (admin cannot be self-assigned).

---

## Features

### Service provider
- Registration and login (email + password, JWT sessions)
- Auto-created application record on sign-up
- Profile completion: name, phone, bio/about
- Service categories (multi-select), skills, years of experience
- Service area: address, city, state, pincode
- Document uploads: profile photo, government ID, optional certificate (private storage, 5MB cap)
- Save as draft, then submit for review
- Dashboard with status badge, profile-completeness meter, timeline and reviewer remarks
- Application becomes read-only while pending or approved
- Rejected applications can be edited and resubmitted

### Admin
- Separate admin login and role-gated routes
- Stats: total, pending, approved, rejected
- Search by name, email, city or skill
- Filter by status and service category
- Detail view with full profile and time-limited signed document links
- Approve / reject with mandatory remark on rejection

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TanStack Start (SSR + file-based routing), TanStack Query, Tailwind CSS v4, shadcn/ui |
| Backend | Managed Postgres backend (Supabase-compatible) with an auto-generated REST API |
| Auth | JWT-based email/password auth |
| Database | PostgreSQL with Row Level Security |
| Storage | Private object storage bucket (`provider-docs`) with signed URLs |
| Validation | Zod (client) + database constraints and RLS (server) |

> **Note on the stack.** The assignment specifies MERN. This implementation keeps the
> React frontend, JWT auth and REST API contract intact, but uses a managed
> PostgreSQL backend instead of Express + MongoDB so the whole solution is deployed
> and verifiable from a single link. The data model, role-based access rules and API
> surface map 1:1 to an Express/Mongoose implementation — see
> "Mapping to Express + MongoDB" below.

---

## Data model

### `profiles`
`id` (= auth user id), `full_name`, `email`, `phone`

### `user_roles`
`user_id`, `role` (`admin` | `provider`) — roles live in a **separate table**, never on
the profile, to prevent privilege-escalation.

### `providers` (the application)
`user_id`, `full_name`, `email`, `phone`, `bio`, `categories[]`, `skills[]`,
`experience_years`, `address`, `city`, `state`, `pincode`,
`photo_path`, `id_document_path`, `certificate_path`,
`status` (`draft` | `pending` | `approved` | `rejected`), `remarks`,
`submitted_at`, `reviewed_at`, `created_at`, `updated_at`

### Access rules (RLS)
- A provider can read and update **only their own** application row.
- Admins can read and update **every** application (checked via the
  `has_role(uid, 'admin')` security-definer function).
- Documents in `provider-docs` are readable only by their owner and by admins;
  admins open them through short-lived signed URLs.
- New sign-ups are forced to the `provider` role by a database trigger.

---

## API

The backend exposes an auto-generated REST API over the tables above. Every request
carries the user's JWT and is filtered by the RLS policies described above.

```
GET    /rest/v1/providers?user_id=eq.<uid>        # my application
PATCH  /rest/v1/providers?id=eq.<id>              # save draft / submit / decide
GET    /rest/v1/providers?status=eq.pending       # admin queue
GET    /rest/v1/user_roles?user_id=eq.<uid>       # role lookup
POST   /auth/v1/signup                            # register
POST   /auth/v1/token?grant_type=password         # login
POST   /storage/v1/object/provider-docs/<path>    # document upload
POST   /storage/v1/object/sign/provider-docs/...  # signed document URL (admin)
```

Example — sign in:

```bash
curl -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $PUBLISHABLE_KEY" -H "Content-Type: application/json" \
  -d '{"email":"admin@servepro.dev","password":"ServePro#2026"}'
```

Example — admin fetches the pending queue:

```bash
curl "$SUPABASE_URL/rest/v1/providers?status=eq.pending&select=*" \
  -H "apikey: $PUBLISHABLE_KEY" -H "Authorization: Bearer $ACCESS_TOKEN"
```

---

## Project structure

```
src/
  routes/
    __root.tsx          # shell, header, footer, auth provider, toasts
    index.tsx           # public landing page
    auth.tsx            # register / sign in
    dashboard.tsx       # provider status dashboard
    application.tsx     # provider profile + document upload form
    admin.index.tsx     # admin verification queue (search, filters, stats)
    admin.$id.tsx       # admin review detail + approve / reject
  components/
    layout/AppHeader.tsx
    StatusBadge.tsx
    ui/                 # shadcn/ui primitives
  hooks/use-auth.tsx    # session + role context
  lib/constants.ts      # service categories, status labels
  styles.css            # design tokens (blue / slate professional theme)
supabase/migrations/    # schema, RLS policies, storage policies, triggers
```

---

## Running locally

```bash
bun install
bun run dev        # http://localhost:8080
```

Environment variables (`.env`, created automatically by the platform):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

Build: `bun run build`

---

## Security notes

- Roles are stored in a dedicated `user_roles` table and evaluated server-side by a
  `SECURITY DEFINER` function used inside RLS policies — the client can never grant
  itself admin.
- The sign-up trigger ignores any client-supplied role.
- All document storage is private; admins receive 5-minute signed URLs.
- All form input is validated with Zod (length, format, type) before it reaches the API,
  and again by database constraints and RLS.
- File uploads are capped at 5MB and restricted by MIME type.

---

## Mapping to Express + MongoDB

If this is ported to a literal MERN stack, the mapping is direct:

| Here | Express + MongoDB equivalent |
| --- | --- |
| `providers` table | `Provider` Mongoose model |
| `user_roles` table | `role` field on a separate `UserRole` collection |
| RLS policy "own row" | `req.user.id === provider.userId` middleware |
| RLS policy "admin" | `requireRole('admin')` middleware |
| Auto REST API | `routes/providers.js` with GET/POST/PATCH handlers |
| Storage + signed URL | `multer` upload + `GET /documents/:id` guarded by the same middleware |
| JWT session | `jsonwebtoken` sign/verify with an `Authorization: Bearer` header |

---

## Demo video outline (3–5 min)

1. **0:00** Landing page — the problem and the four onboarding steps.
2. **0:30** Register a new provider, land on the empty dashboard.
3. **1:00** Complete the application: categories, skills, experience, service area.
4. **2:00** Upload profile photo and ID, save draft, submit for review.
5. **2:30** Sign out, sign in as admin — stats, search, status and category filters.
6. **3:15** Open the application, view a document via signed URL, reject with remarks.
7. **3:45** Back as the provider — see rejection remarks, fix and resubmit; admin approves.
8. **4:30** Quick tour of the schema and RLS policies.
