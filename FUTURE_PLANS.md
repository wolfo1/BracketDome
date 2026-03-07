# BracketDome — Future Plans

## High Priority

### Cover Images (Supabase Storage)
Upload a cover image when creating or editing a tournament. Shown as a thumbnail on the home page cards and as a banner on the bracket/admin page header.
- Add `coverImageUrl String?` to Tournament schema
- Create `POST /api/tournament/[id]/cover` route that uploads to Supabase Storage bucket and saves the URL
- Show image in `TournamentCard` on home page and in bracket page header
- Add file input to create wizard (step 1) and edit panel in admin page

### Rate Limiting
Currently no rate limiting — the create tournament endpoint and register endpoint are the most dangerous (DB-heavy and CPU-heavy respectively).
- Recommended: Upstash Redis + `@upstash/ratelimit` (~20 lines in middleware)
- Free tier is plenty for this scale
- Most critical routes to protect: `POST /api/tournament`, `POST /api/register`, `POST /api/tournament/[id]/match/[matchId]`

---

## Medium Priority

### Remove Participant
Currently participants can be added mid-tournament but not removed. Removing a participant should also delete all their votes (cascade already set on schema).
- Add `DELETE /api/tournament/[id]/participant/[participantId]`
- Add remove button next to each participant in the admin panel

### Editable Bracket Results
Currently saving a match result is final — there's no way to correct a mistake. Add an "Edit" button on completed matches in the admin page that re-opens the vote form pre-filled with existing votes.

### Participant Vote History
On the stats page or bracket, show each participant's full voting history — which contestant they picked in each match, and whether they were with the majority.

### Home Page — Separate Sections
Split "All Tournaments" into tabs or sections: Active, Completed, Mine. Useful once there are many tournaments.

---

## Low Priority / Nice to Have

### Share Button
Copy the public bracket URL to clipboard. Already partially referenced in the original plan — the bracket URL is already shareable, just needs a visible "Copy link" button in the bracket header.

### Mobile Bracket View
The left-to-right bracket tree is hard to navigate on mobile. Options:
- Horizontal scroll with momentum
- Collapsible round-by-round view for mobile
- Show only the current active round on mobile

### Tournament Draft Mode (SETUP status)
Currently the `SETUP` status exists in the schema but is unused — tournaments go straight to `ACTIVE`. Could add a "Save as draft" option during creation where the bracket is built but not yet visible to viewers.

### Notifications / Real-time Updates
When a match result is entered, the bracket page updates on next refresh. Could add polling (`setInterval`) or WebSocket updates so the bracket auto-refreshes for viewers watching live.

### Per-Round Stats Breakdown
The round breakdown chart exists but could be expanded — show vote counts per match, reveal who voted for whom per round in a timeline view.

---

## Known Technical Debt

- **No rate limiting** on any API route (see above)
- **`NODE_TLS_REJECT_UNAUTHORIZED=0`** is set as a global env var to bypass Supabase SSL cert issues — not ideal for production. Proper fix is to add Supabase's CA cert to the pg pool config.
- **No pagination** on the home page tournament list or on the admin completed rounds list — will become slow with many tournaments
- **Stats page** does a full DB query including all votes on every page load — could be cached or computed incrementally
