# BracketDome

Tournament bracket website built for WhatsApp groups. The admin runs polls manually (e.g. in WhatsApp) and enters results on the site. The site shows a live bracket, per-match vote breakdowns, and fun named statistics about participants' voting patterns.

Live: **https://bracket-dome.vercel.app**
Repo: **https://github.com/wolfo1/BracketDome**

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 App Router + TypeScript | |
| Styling | Tailwind CSS v4 + shadcn/ui | Dark theme (`bg-gray-950`) throughout |
| Database | PostgreSQL via Prisma v7 | Hosted on Supabase |
| Auth | NextAuth v5 | Credentials provider (email + bcrypt), JWT sessions |
| Charts | Recharts | Bar charts, correlation heatmap |
| Animations | Framer Motion + react-confetti | Bracket reveals, award cards, champion confetti |
| Excel import | SheetJS (xlsx) | Import contestant lists from spreadsheet |
| Deployment | Vercel | Auto-deploys from `main` branch |

---

## Local Development

```bash
npm install
npm run dev        # starts on localhost:3000
```

Environment variables go in `.env.local`:
```
DATABASE_URL="postgresql://..."   # Supabase transaction pooler (port 6543)
NODE_TLS_REJECT_UNAUTHORIZED=0    # required for Supabase SSL in dev
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
```

For Prisma CLI (migrations/db push), `.env` uses the **session pooler** (port 5432):
```
DATABASE_URL="postgresql://...supabase.com:5432/postgres"
```

Schema changes:
```bash
npx prisma db push        # apply schema to DB (dev)
npx prisma generate       # regenerate client after schema change
```

---

## Data Model

```
User             id, email, name, passwordHash
Tournament       id, title, description, status, isPrivate, startDate, maxParticipants, createdBy
TournamentAdmin  tournamentId, userId          — extra admins beyond creator
TournamentViewer tournamentId, email           — email allowlist for private tournaments
Contestant       id, name, seed, tournamentId
Participant      id, name, tournamentId        — voters (not user accounts)
Round            id, number, name, tournamentId
Match            id, roundId, contestant1Id, contestant2Id, winnerId, position, resolvedAt
Vote             id, matchId, participantId, votedForId
```

Cascade deletes are set on all child relations so deleting a tournament cleans everything up.

---

## Key Design Decisions

### Bracket generation
- Single elimination, bracket size = next power of 2
- Standard seeding: seed 1 vs highest, seed 2 vs second highest, etc.
- BYE matches (unfilled seeds) are auto-resolved at creation time — winner pre-filled
- BYE match pairs are sorted to the **bottom** of the bracket visually
- BYE winners pre-fill their round 2 slots at creation, so round 2 shows real contestants immediately

### Authentication & access control
- Only registered users can create tournaments
- Admin access = tournament creator OR anyone the creator adds by email
- Only the creator can delete a tournament or manage admins
- Admins can manage viewers and add participants
- Private tournaments: hidden from home page and bracket/stats pages unless user is admin or viewer

### Stats
- **Individual score**: % of matches where a participant voted with the majority
- **Pairwise correlation**: % of matches where two participants voted the same way
- Named awards: Crowd Champion, Contrarian, Dynamic Duo, Mismatch, Solid Alliance, Unlikely Allies, How Bro?

### Participants vs Users
- **Users** = registered accounts (admins, creators)
- **Participants** = voters in a tournament (just names, not accounts). Can be added mid-tournament.

### Node / npm quirks
- Node v25 breaks `.bin/next` symlinks — all npm scripts use `node node_modules/next/dist/bin/next` directly
- Vercel build command runs `prisma generate` before Next.js build (see `vercel.json`)

---

## Pages

| Route | Access | Description |
|---|---|---|
| `/` | Public (private tournaments filtered) | Home — tournament list |
| `/login` | Public | Sign in / register |
| `/tournament/create` | Auth required | 3-step wizard: details → contestants → preview |
| `/tournament/[id]` | Public or private | Live bracket view |
| `/tournament/[id]/stats` | Public or private | Stats, awards, charts |
| `/tournament/[id]/admin` | Admin only | Enter results, manage participants/admins/viewers |

---

## API Routes

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/tournament` | — | List all tournaments |
| POST | `/api/tournament` | Auth | Create tournament |
| GET | `/api/tournament/[id]` | — / private check | Full tournament data |
| PATCH | `/api/tournament/[id]` | Admin | Edit title/description/startDate/isPrivate |
| DELETE | `/api/tournament/[id]` | Creator only | Delete tournament |
| POST | `/api/tournament/[id]/match/[matchId]` | Admin | Submit votes + advance winner |
| POST | `/api/tournament/[id]/admins` | Creator | Add admin by email |
| DELETE | `/api/tournament/[id]/admins` | Creator | Remove admin |
| POST | `/api/tournament/[id]/viewers` | Admin | Add viewer email |
| DELETE | `/api/tournament/[id]/viewers` | Admin | Remove viewer |
| POST | `/api/tournament/[id]/participant` | Admin | Add participant mid-tournament |
| POST | `/api/register` | — | Register new user |
| POST | `/api/upload` | Auth | Parse Excel/CSV for contestants |
