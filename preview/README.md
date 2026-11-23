# Preview harness

Screenshots of every Portal page, in light and dark, at desktop and phone
width, without anyone signing in and without touching production.

```bash
npm run dev                       # in one terminal
node preview/capture.mjs          # everything -> .impeccable/review/<family>/
node preview/capture.mjs --only artwork --themes light --viewports desktop
```

## How it works

- The dev server serves the real pages.
- Playwright sets `window.__PORTAL_PREVIEW_USER__` before the app loads. The
  seam that reads it is in `src/context/UserContext.tsx` and is guarded by
  `process.env.NODE_ENV === "development"`, which Next.js inlines at build
  time: a production bundle contains neither the check nor the branch. No
  credential is involved and nobody is signed in to Firebase.
- Every request to `api.artvista.app` is answered from `preview/fixtures/api`
  (one JSON file per method, path and query). Requests to Firebase and
  reCAPTCHA are dropped. A request with no fixture gets a 404 and is printed.
- Images in fixtures point at `preview/fixtures/images`, because the presigned
  links the API returns expire.

Scenarios (page, signed-in role, optional steps) are the `scenarios` list at
the top of `capture.mjs`.

## Recording fixtures

`--record` fills in missing fixtures by forwarding the request to a local copy
of the API (`--api`, default `http://127.0.0.1:3100`) running against a local
database with authentication stubbed. Only reads are forwarded; anything else
is answered with a 503. Recorded responses have e-mail addresses replaced and
storage links rewritten to local image copies. The fixtures in this folder
were recorded that way on 2026-11-17 from a local copy of the catalog: the
artworks, artists and museums are real public records, the people are not.

Never point `--api` at production.
