# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two groups, weighted equally (confirmed 2026-11-17):

- **Artists and museums.** People outside the company who create an account,
  fill in a profile and submit artworks so that visitors can scan them with the
  ArtVista app. They come occasionally, are not technical, and are entrusting
  the company with their work and its images.
- **ArtVista admins.** The founder and team. They review every submitted
  artist and artwork (edit, approve, reject with a reason) and run the
  back-office: museum import review, data-connector bots, scan-index health,
  copyright status, app version and news. They use it daily and in volume.

## Product Purpose

The Portal is how artworks and their makers enter the ArtVista catalog and how
the team keeps that catalog correct. An artist's submission becomes a pending
record, an admin decides on it, and an approved artwork becomes scannable in
the app. Success for an artist is a submission that goes through the first
time and a clear answer on its status; for an admin it is a queue that can be
worked through quickly without mistakes.

## Positioning

It is the working side of the same product as the mobile app: what is approved
here is what a museum visitor's phone recognises.

## Operating Context

- Next.js app (App Router, React 19), deployed on Netlify. Signs in with the
  Portal's Firebase project; a Firestore `users` record gives the role
  (`artist`, `museum`, `admin`).
- Talks to the main API (`api.artvista.app`); the Portal has no data of its
  own.
- Pages: `login`, `home` (the user's artworks, or the review queues for an
  admin), `artwork` (create / edit / review one artwork), `artist` (profile),
  `museum`, `guide`, and `admin/*` (bots, indexing, museums, rights,
  app-version, news).
- The newest work is on `feat/admin-bots`; this redesign branches from it.

## Capabilities and Constraints

- Scope of the redesign (confirmed 2026-11-17): every page moves to the new
  look; fields, steps and API calls stay as they are. Unclear labels and
  visible defects (for example a counter reading "41 / 25 characters" with no
  error state) are corrected.
- Not in scope: new features, changed flows, changes to the API.
- Images matter: an artwork's image is both what the admin judges and what the
  scan will be matched against.
- Interface language: English (as today).

## Brand Commitments

- Name: ArtVista Portal.
- The visual identity of the new mobile app (`ArtvistaRemake`) is binding for
  the Portal (confirmed 2026-11-17): the colour tokens in
  `ArtvistaRemake/src/shared/theme/theme.ts`, light and dark, and Inter. The
  current Portal look (light grey ground, Arial, blue / green / red buttons)
  is being replaced, not polished.

## Evidence on Hand

- The existing pages and their copy are the content source.
- Brand assets: `ArtvistaRemake/assets/images` (app mark, empty-state
  illustrations), `Portal/public`.
- No testimonials, statistics or claims exist for the Portal; none may be
  invented.

## Product Principles

1. The artwork is the subject. Its image leads every screen it appears on.
2. An artist should never wonder what happens next: status, requirements and
   errors are stated where they apply.
3. An admin decision is deliberate: approve and reject are distinct, and a
   destructive choice is never one misclick away from a safe one.
4. Same product, same face: the Portal reads as ArtVista to someone who knows
   the app.
5. Change the presentation, keep the behaviour: nothing an existing user
   relies on moves without a reason.
