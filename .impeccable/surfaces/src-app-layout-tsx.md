---
version: 1
slug: "src-app-layout-tsx"
primary_target: "src/app/layout.tsx"
related_targets: ["src/app/globals.css","src/app/artwork/page.tsx","src/app/home/page.tsx","src/app/artist/page.tsx","src/app/login/page.tsx","src/app/museum/page.tsx","src/app/admin/admin.module.css"]
---

# Portal system and page families

Scope: every route of the Portal (`/login`, `/home`, `/artwork`, `/artist`, `/museum`, `/guide`, `admin/*`) and the shared shell. Mode: Operate throughout.

Audience and job: artists and museums submitting a profile and artworks (occasional, non-technical, at a desk with their image files); admins working review queues and back-office tables daily. Both weighted equally. Constraint: fields, steps, routes and API payloads are unchanged; only presentation, wording of unclear labels and visible state defects change.

## Direction contract

THESIS: The Portal is the app's desk-side sibling: the same flat tinted fills, pills and Inter, with the artwork image as the one thing on a page that is not chrome. It refuses the admin-template arrangement it had: white bordered cards on grey, Arial, and rows of equal-weight primary-coloured buttons.

OWN-WORLD: Grounds are the app's `screen` lilac-grey (light) and near-black violet (dark); panels are a lighter fill with 20px corners, no border and no shadow; controls are filled wells with 12px corners and a 2px purple focus ring; every button is a pill, ink-filled for the one primary action, `category`-filled for secondary, text-only red for destructive. The rail is the app's deep-navy `container` in both themes. Purple marks focus, links and selection. Status is a tinted pill: amber pending, green approved, red rejected. Inter only, 13 / 14 / 16 / 20 / 28.

STORY: An artist sees their artwork large, knows which fields are required and what state the submission is in. An admin sees the image, the facts, and exactly one obvious next action, with rejecting kept apart from approving.

FIRST VIEWPORT (`/artwork`, admin review): navy rail on the left with the mark and nav; a page header with the title, a status pill and the actions (Reject as quiet red text, Save changes as a secondary pill, Approve as the ink pill, right-most); below, two columns: left the artwork image in a tall well framed by the app's purple scan-frame corner brackets with the extra-image tiles under it, right the form in labelled groups.

FORM: direction pinned by the user: ArtvistaRemake identity (no roll). Signature move: the scan frame, the four purple corner brackets the app draws around an artwork it recognises, frames the artwork image wherever one is being judged or uploaded. Default theme: follow the system; light when unknown, because the work is forms and colour judgement at a desk in daylight.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Unresolved
- Muted text uses a darker grey than the app's `muted` (#808080) so body copy passes AA on the light ground.
- Finish review and DESIGN.md are run by the main thread after this build.
