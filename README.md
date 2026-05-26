# AetherVisuals

Secure branding asset delivery portal. Admins upload logo packages and brand kits, clients access them via one-time magic links — no login required on the client side.

## Stack

- **Backend** — Node.js, Express.js
- **Database** — Supabase (PostgreSQL + RLS)
- **Storage** — Supabase Storage (private bucket)
- **Auth** — Supabase Auth (admin only)
- **Frontend** — Vanilla HTML, CSS, JavaScript

## Setup

### 1. Clone

```bash
git clone https://github.com/your-username/aethervisuals.git
cd aethervisuals
```

### 2. Install

```bash
cd backend
npm install
```

### 3. Environment

```bash
cp .env.example .env
# Fill in your Supabase keys and BASE_URL
```

### 4. Supabase

- Create tables by running the SQL in `supabase/schema.sql`
- Create a private storage bucket named `aethervisuals-assets`
- Run storage policies from `supabase/storage-policies.sql`
- Add `thumb_path TEXT` column: `ALTER TABLE assets ADD COLUMN IF NOT EXISTS thumb_path TEXT;`
- Create admin user in Supabase Dashboard → Authentication → Users

### 5. Run

```bash
npm run dev       # development
npm start         # production
```

## URLs

| Page | URL |
|---|---|
| Admin | `http://localhost:3000/admin` |
| Client view | `http://localhost:3000/view?token=TOKEN` |

## Deployment

Set these environment variables on your hosting platform:

```
NODE_ENV=production
BASE_URL=https://yourdomain.com
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SIGNED_URL_EXPIRY=1800
WATERMARK_TEXT=AetherVisuals Preview
```

---

*Built for AetherStack — aetherstack.in*
