# Feature ideas — the field journal, not "Instagram for cats"

A running brainstorm for where Cat Diary goes next. The organizing question for
every idea below is a single editorial test:

> **Does this make Cat Diary a better _naturalist's field journal_, or does it
> nudge it toward becoming a photo-sharing popularity contest?**

Cat Diary's identity is a *naturalist's notebook* — you document cats you meet,
where and when, and build a personal collection over time. The value is in
**observation, record-keeping, identification, and quiet collection**, not in
chasing reach. Features that reward documentation and curiosity are on-brand.
Features that reward virality, vanity metrics, and performance are the trap we
keep calling "Instagram for cats." This doc keeps that line bright.

---

## The north star (so we can say no to good-looking bad ideas)

What a field journal optimizes for, and what it deliberately doesn't:

| We lean into | We stay away from |
|---|---|
| Documenting a sighting well (who, where, when, condition) | Maximizing how many people see a post |
| Building *your* collection / life list | Public follower-count leaderboards |
| Re-identifying the *same cat* across sightings | Algorithmic "for you" virality feed |
| Place, season, and time as first-class data | Beauty/cuteness ranking of cats |
| Slow, satisfying review of your own history | Streaks/pressure that punish not posting |
| Citizen-science value (welfare, colonies, TNR) | Influencer economy, sponsored cat posts |

Whenever an idea below could be built two ways, we pick the journal way.

---

## Reactions to the input ideas

### ✅ Custom frames (beyond polaroid) — **SHIPPED**
The polaroid is a *journal artifact*, not a filter. More artifacts deepen the
notebook feel without becoming "filters for clout". Shipped as a `frameStyle`
enum on `CatEntry` with five styles, rendered by `components/EntryFrame.tsx`
(shared across feed/detail) and chosen via `FramePicker` in capture + edit:
- ✅ **Polaroid** — the default taped-in print.
- ✅ **Pressed-specimen card** — cat mounted on aged card stock with photo
  corners and an italic species/breed label.
- ✅ **Index card / library catalog card** — monospace, with a 636.8 Dewey
  "call number" derived from the entry id.
- ✅ **Postcard** — "Greetings from \<place name\>" banner, reusing
  `locationName`, with a postage stamp + postmark.
- ✅ **Ticket stub** — "Admit one" header, perforated tear line, date + place.
- Frame choice is a *per-entry* presentation stored on the entry; no frame is
  "premium-only" in a way that gates documenting (defaults to Polaroid). (See
  monetization for the honest way to charge — e.g. premium frames later.)
- Still open: **instant-film variants** (square SX-70, wide, faded vintage) and
  **luggage tag** could join as further styles; the render layer is now in
  place, so each is just another `case` in `EntryFrame` + an enum value.

### ✅ Short videos on entries — **yes, but framed as "field footage," capped**
A 3–10s clip of a cat doing a cat thing is exactly what a field observer would
capture. Keep it a *documentation* tool, not a Reels surface:
- Hard cap (e.g. ≤ 10s, muted-by-default, no audio-driven discovery).
- No standalone video feed, no "video" tab — clips live *inside* an entry next
  to the photos.
- Reuse the existing `CatEntryPhoto` ordering idea → a `CatEntryMedia` model, or
  add `mediaType` so the polaroid stack can hold a clip.
- Storage/processing cost is real: transcode + poster frame via the existing
  sharp/upload path; gate behind feature flag until infra is ready.

### ✅ Photo calendar — **SHIPPED (in-app review); export still open**
A journal *wants* to be looked back on. The "Year in Cats" calendar review has
landed:
- ✅ "Year in Cats" — twelve month grids built from a diary's entries at
  `/profile/[userId]/year`, day cells showing the cover thumbnail and opening a
  sheet of that day's sightings, with headline figures (cats logged, distinct
  named cats / breeds / places, busiest month) and a year switcher.
  `lib/yearInCats.ts` + `components/YearCalendar.tsx` + `GET /api/cat-entries/year`;
  reuses the UTC date-bucketing convention from `listOnThisDayEntries`. Works for
  any diary the viewer can already see (visibility-checked).
- Still open: **export as PDF/image** in-app (no third-party dependency for v1)
  and a later "send to a print service" handoff — the natural paid feature and a
  lovely share/invite artifact, now that the on-screen review exists to render.

### ✅ Different reactions — **SHIPPED** (observational stamps, not a like-race)
More paw-print variants are fine; the risk is turning reactions into a score.
Shipped as a `ReactionKind` enum on the `Like` row (`lib/reactions.ts` catalog,
`components/ReactionStamp.tsx` icons), one reaction per (user, entry), picked
from a small popover on the entry footer:
- ✅ Themed stamps instead of generic emoji: 🐾 PAW (default), "spotted!"
  (SPOTTED), "handsome devil" (HANDSOME), "same cat?" (SAME_CAT), "be safe"
  (SAFE). Double-tap on the photo still leaves the plain paw.
- ✅ **Never a public reaction *count leaderboard*.** A public entry shows one
  total count only; the per-stamp breakdown (`listReactionBreakdown`,
  `<ReactionSummary>`) is the entry owner's alone, and nothing ranks users or
  cats by reactions.
- ✅ A "**same cat?**" reaction is special — recorded as a re-identification
  *data signal*, not applause (a hook for the re-identification idea below).

### ⚠️ Share within the app — **yes, but as "passing a note," not a repost engine**
In-app sharing is useful, but "reshare to my followers" is the single biggest
Instagram-ification lever. Do the journal version:
- **Send an entry to a specific person** (a DM-of-one, "look at this cat") rather
  than a broadcast reshare button.
- No "reposted by" attribution chains, no quote-repost, no amplification of
  someone else's sighting into your own diary as if you saw it.
- Optionally: "**add to a shared diary**" (see Co-authored diaries below) — that's
  collaboration, not amplification.

### ⚠️ Suggest users to follow — **only place-based / overlap-based, never "popular"**
Follow suggestions are fine *if* the basis is shared territory, not popularity:
- "**People who document cats near you**" (we already have Haversine nearby
  queries) — neighbours, not influencers.
- "**You've both met this cat**" — overlap on the *same* cat is a genuinely
  delightful, on-brand reason to connect.
- **Never** "suggested because they're popular / have many followers." No
  follower-count-driven ranking anywhere.

### ⚠️ Monetization — **yes, but only models that don't sell reach or attention**
Acceptable because they charge for *journal craft and storage*, not for
visibility:
- **Cat Diary Plus** subscription: unlimited photo/video storage, full-res
  originals, premium frames, the printable calendar/photo-book export, longer
  clips, data export.
- **Print-on-demand**: calendars, a bound "year in cats" photo book, sticker
  packs of *your own* cats. Tasteful, opt-in, you're buying *your* memories.
- **Welfare angle**: optional "round up to support local TNR/shelter" — fits the
  caretaker ethos.
- ❌ Off the table: promoted posts, "boost your cat," paid follower growth,
  sponsored-content tooling, selling user data, ad feed. These all monetize
  *attention*, which is the thing we're protecting.

### ✅ "Own" cats (cats you actually own) — **SHIPPED (MVP); introduces the Cat as an entity**
The most structurally significant idea here, and the backbone the rest of this
section builds on. The lean MVP has landed:
- ✅ New **`Cat`** entity (`lib/cats.ts`): a named cat with its own page at
  `/cats/[id]`, owned/claimed by its creator, that **multiple sightings point
  at** via `CatEntry.catId` ("Mochi, over time").
- ✅ The cat's page is a timeline of *its* sightings — a real diary *of a cat*.
  Visibility reuses `canViewCatEntry` (a cat is visible exactly when its owner's
  diary is); the cat's photo is the cover of its most recent sighting (no
  separate avatar upload).
- ✅ **A cat is an ownerless cluster of sightings** (remodelled after the first
  cut): `Cat.ownerId` is nullable and *linking never makes you an owner*.
  Ownership is a separate act — you **claim** a cat as your pet (`claimCat`,
  `isOwned`), optionally **merging** it into a profile you already keep
  (`mergeCats`). A cat has no canonical name; its names are the aliases people
  gave its sightings. An ownerless cluster is visible to anyone who can see one
  of its sightings.
- ✅ Filed under your own cat *or any ownerless cluster* from the entry edit
  screen / capture picker; a `<CatShelf>` shows a diary's claimed cats plus the
  clusters its sightings belong to.
- Still open (the part that *did* need a design doc): structured **care
  metadata**, and welfare **status flags** below — both hang off this `Cat`
  entity now that it exists (per-cat re-ID has shipped).

### ✅ Metadata (chipped, vaccinated, …) — **yes, scoped to owned cats; it's a record book**
A field journal *is* a record book. For owned cats, structured care metadata is
squarely on-brand and genuinely useful:
- On the `Cat` entity (not on every sighting): microchip ID, neutered/spayed,
  vaccination dates, birthday, weight log, vet notes, allergies.
- Quietly powerful: vaccination/vet **reminders** (re-uses the existing
  notification + web-push plumbing).
- Privacy: care data is private by default; owner chooses what (if anything) is
  visible.

### ⚠️ For adoption / for sitting — **yes, but as a *status flag*, hard-walled against becoming a marketplace**
The user's own guardrail is correct and load-bearing: **this must not become a
place to sell cats.** Safe, welfare-positive version:
- A **status flag** on an owned `Cat`: `Looking for a sitter`, `Available for
  adoption (via shelter)`, `Lost`, `Found`. It's a state, not a listing.
- **No prices, no payments, no "buy/sell," no transactions in-app, ever.** Adoption
  routes to a shelter/rescue or is explicitly "not for profit."
- **Lost & Found** is the strongest welfare feature in this whole doc: a lost-cat
  flag + the existing nearby/map queries = "help find this cat near you." This is
  the kind of thing that makes the app *matter*.
- Heavy moderation/reporting needed before shipping any of this publicly.

---

## New ideas in the same spirit (not in the input list)

These all push *toward* the field-journal identity:

### Identity & collection
1. ✅ **Re-identification — "Might this be cat X?"** — **MVP SHIPPED.** The killer
   naturalist feature. Built on the CLIP embeddings + pgvector behind "cats that
   look alike" and on the `Cat` entity: on your own sighting we surface the
   nearest *already-profiled* cats — yours **and** other people's visible cats —
   and offer to file it. Filing under your own cat is instant; claiming someone
   else's cat is a `CatLink` request the cat's owner approves, after which the
   sighting joins that cat's timeline. So a single cat's story now spans people
   and time — *iNaturalist for cats*. Suggestions now also include **bare
   sightings nobody has profiled yet** (linking one starts a shared profile from
   your sighting; the other person approves on *their* sighting's page), and each
   suggestion shows a **match confidence**. Still open: "someone *nearby* logged
   this" (place-scoped suggestions) and tuning the distance→confidence curve as
   real data accrues.
2. **Life list / "cats I've met" collection** — a birdwatcher's life list, but
   cats. Count of distinct cats, breeds spotted, neighbourhoods covered. Progress
   against *your own* curiosity, never ranked against others.
3. **Collections / "cabinets"** — let users group entries into personal
   collections ("The bodega cats of my block," "Tortoiseshells," "Cats of
   Lisbon 2026"). Curation is the journal-native verb.

### Place, time & season (lean into data we already have)
4. **Territory map heatmap** — where *you* tend to find cats; seasons and times of
   day. Your personal patch.
5. **Field notes weather/season stamp** — auto-tag an entry with season / weather
   at capture (a journal records conditions). Cheap, atmospheric, useful for the
   nature framing.
6. **"On this day" already exists — extend to "this cat, a year ago"** once the
   `Cat` entity lands.

### Craft of the entry
7. **Handwriting / annotation layer** — sketch or scribble arrows and notes *on*
   the photo, like a real field sketch. Doubles down on "notebook, not feed."
8. **Audio field note** — a short spoken note attached to an entry (the "purr
   recording" everyone secretly wants). On-brand as *documentation*.
9. **Sketch mode** — generate a pencil/ink-sketch rendering of the cat photo as an
   alternate "specimen drawing" frame.

### Quiet community (without the popularity machine)
10. **Co-authored / shared diaries** — a household or a friend group keeps one
    shared diary (the neighbourhood's cats, a campus's cats). Collaboration, not
    broadcast. Pairs with the "send an entry to someone" idea.
11. **Colony / community-cat tracking** — for TNR volunteers and feeders: track a
    known colony, who's been fed, who's been fixed (ear-tip flag). Serious welfare
    utility, and a wholly different audience from "cute pics."
12. **Local "cat of the week" by neighbourhood, not global** — *if* we ever do
    highlighting, keep it hyper-local and rotating so it can't become a
    follower-count flywheel.

---

## Anti-features — things to deliberately *not* build

Naming these protects the identity better than any feature list:
- ❌ A global algorithmic "explore/for-you" virality feed.
- ❌ Public follower-count leaderboards or "top users/cats."
- ❌ Cuteness/beauty ranking or contests with winners.
- ❌ Reshare/repost amplification chains.
- ❌ Streaks that punish you for not posting (pressure ≠ journaling).
- ❌ Promoted posts / sponsored cats / influencer monetization.
- ❌ Any buying/selling of cats.

---

## Suggested sequencing

1. ~~**Custom frames**~~ (✅ shipped) + ~~**different reactions**~~ (✅ shipped) —
   pure render-layer, on-brand, cheap, immediately deepen the journal feel.
2. ~~**Photo calendar / "year in cats"**~~ (✅ in-app review shipped; PDF/image
   export still open) — high delight, reuses existing date logic, opens the
   honest monetization door.
3. ~~**The `Cat` entity** ("own" cats)~~ (✅ MVP shipped) — the structural unlock
   for metadata, health reminders, status flags, and per-cat timelines. The
   persistent cat profile + per-cat timeline now exist; metadata/flags build on
   it next.
4. ~~**Re-identification ("same cat?")**~~ (✅ MVP shipped) — the long-term
   defensible identity; "might this be cat X?" suggestions + cross-person link
   approval now ship on top of the embeddings and the `Cat` entity.
5. **Lost & Found / welfare flags** — high-impact, but only after moderation and
   the `Cat` entity are in place (the latter now exists).

---

*This is a living document — append, argue with, and prune it as the app
evolves. The test at the top is the only thing that's load-bearing.*
