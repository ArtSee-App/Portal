// Preview harness: screenshots of every Portal page without anyone signing in.
//
//   node preview/capture.mjs                 replay fixtures, capture everything
//   node preview/capture.mjs --only artwork  only scenarios whose name contains "artwork"
//   node preview/capture.mjs --record        proxy API calls to a local stub API and save them as fixtures
//
// How it works: the dev server (npm run dev) serves the real pages. Playwright injects a
// signed-in user through the development-only seam in src/context/UserContext.tsx and answers
// every request to the API from preview/fixtures. Nothing reaches production and nothing is
// written anywhere but .impeccable/review. See preview/README.md.
import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);

const RECORD = flag("--record");
const ONLY = option("--only", "");
const BASE = option("--base", "http://localhost:3000");
const LOCAL_API = option("--api", "http://127.0.0.1:3100");
const THEMES = option("--themes", "light,dark").split(",");
const SIZES = { desktop: { width: 1440, height: 900 }, short: { width: 1366, height: 640 }, mobile: { width: 390, height: 844 } };
const VIEWPORTS = option("--viewports", "desktop,mobile").split(",");
const OUT = join(root, ".impeccable", "review");
const API_HOSTS = ["api.artvista.app"];
const TOKEN_PARAMS = ["admin_portal_token", "artist_portal_token", "token"];

const admin = { type: "admin", email: "admin@artvista.example", uid: "preview-admin", artistId: null };
const artist = { type: "artist", email: "artist@artvista.example", uid: "preview-artist", artistId: 1314 };
const museum = { type: "museum", email: "museum@artvista.example", uid: "preview-museum", artistId: null };

// name, page family (output folder), path, signed-in user, optional steps before the screenshot.
const scenarios = [
  { name: "artwork-admin-review", family: "artwork", user: admin, path: "/artwork?edit=true&artworkId=418297&artistId=null&pendingId=1052&pending=true" },
  { name: "artwork-artist-new", family: "artwork", user: artist, path: "/artwork" },
  { name: "artwork-artist-new-errors", family: "artwork", user: artist, path: "/artwork",
    steps: async (page) => {
      await page.locator('input[type="text"]').first().fill("Composition with a very long working title that an artist typed without thinking about the limit of the field");
      await page.locator('input[type="text"]').nth(1).fill("oil on canvas, mounted on a wooden panel with gold leaf").catch(() => {});
    } },
  { name: "artwork-artist-edit", family: "artwork", user: artist, path: "/artwork?edit=true&artworkId=227112&artistId=1314&pendingId=null&pending=false" },
  { name: "home-admin", family: "home", user: admin, path: "/home" },
  { name: "home-admin-hover", family: "home", user: admin, path: "/home",
    steps: async (page) => { await page.locator("img[class*=artworkImage]").nth(2).hover(); await page.waitForTimeout(400); } },
  { name: "home-artist", family: "home", user: artist, path: "/home" },
  { name: "home-artist-empty", family: "home", user: { ...artist, artistId: 999999 }, path: "/home", empty: true },
  { name: "artist-admin-review", family: "artist", user: admin, path: "/artist?edit=true&artistId=3740&pending=true" },
  { name: "artist-own-profile", family: "artist", user: artist, path: "/artist?edit=true" },
  { name: "login-sign-in", family: "login", user: null, path: "/login" },
  { name: "login-hover", family: "login", user: null, path: "/login",
    steps: async (page) => { await page.getByRole("button", { name: /log in/i }).first().hover(); await page.waitForTimeout(400); } },
  { name: "login-register", family: "login", user: null, path: "/login",
    steps: async (page) => { await page.getByText(/sign up|register|create/i).first().click().catch(() => {}); } },
  { name: "museum-list", family: "museum", user: admin, path: "/museum" },
  { name: "museum-detail", family: "museum", user: admin, path: "/museum?id=416" },
  { name: "guide", family: "guide", user: artist, path: "/guide" },
  { name: "admin-bots", family: "admin", user: admin, path: "/admin/bots" },
  { name: "admin-bots-source", family: "admin", user: admin, path: "/admin/bots/source?key=wikidata_museums" },
  { name: "admin-indexing", family: "admin", user: admin, path: "/admin/indexing" },
  { name: "admin-museums", family: "admin", user: admin, path: "/admin/museums" },
  { name: "admin-museums-country", family: "admin", user: admin, path: "/admin/museums/country?iso=NL" },
  { name: "admin-rights", family: "admin", user: admin, path: "/admin/rights" },
  { name: "admin-app-version", family: "admin", user: admin, path: "/admin/app-version" },
  { name: "admin-news", family: "admin", user: admin, path: "/admin/news" },
  { name: "admin-no-backend", family: "admin", user: admin, path: "/admin/indexing", offline: true },
];

const sha = (text) => createHash("sha1").update(text).digest("hex").slice(0, 16);

function fixtureKey(request) {
  const url = new URL(request.url());
  const params = [...url.searchParams.entries()].filter(([k]) => !TOKEN_PARAMS.includes(k)).sort();
  const body = request.method() === "GET" ? "" : sha(request.postData() || "");
  const query = params.map(([k, v]) => `${k}=${v}`).join("&");
  const slug = url.pathname.replace(/^\/|\/$/g, "").replace(/[^a-z0-9]+/gi, "-") || "root";
  return `${request.method().toLowerCase()}-${slug}-${sha(query + body)}`;
}

// Presigned storage links expire, so recorded responses point at local copies instead.
async function localiseImages(value) {
  if (typeof value === "string" && /^https:\/\/[^"\s]*digitaloceanspaces\.com\//.test(value)) {
    const name = sha(value.split("?")[0]) + ".jpg";
    const file = join(here, "fixtures", "images", name);
    if (!existsSync(file)) {
      const res = await fetch(value).catch(() => null);
      if (!res || !res.ok) return null;
      writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    }
    return `https://api.artvista.app/__fixture_image/${name}`;
  }
  if (Array.isArray(value)) return Promise.all(value.map(localiseImages));
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = await localiseImages(v);
    return out;
  }
  return value;
}

const scrub = (json) => JSON.parse(JSON.stringify(json).replace(/[A-Za-z0-9._%+-]+@(?!artvista\.example)[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "person@artvista.example"));

async function answer(route, scenario) {
  const request = route.request();
  const url = new URL(request.url());
  if (url.pathname.startsWith("/__fixture_image/")) {
    const file = join(here, "fixtures", "images", url.pathname.split("/").pop());
    return existsSync(file) ? route.fulfill({ body: readFileSync(file), contentType: "image/jpeg" }) : route.abort();
  }
  if (scenario.offline) return route.fulfill({ status: 404, contentType: "application/json", body: '{"detail":"Not Found"}' });
  const file = join(here, "fixtures", "api", fixtureKey(request) + ".json");
  if (RECORD && !existsSync(file)) {
    const safe = request.method() === "GET" || /search|get_/.test(url.pathname);
    if (!safe) return route.fulfill({ status: 503, contentType: "application/json", body: '{"detail":"writes are disabled in preview"}' });
    const res = await fetch(LOCAL_API + url.pathname + url.search, {
      method: request.method(), body: request.postDataBuffer() ?? undefined,
      headers: { ...Object.fromEntries(Object.entries(request.headers()).filter(([k]) => /^(content-type|authorization)$/.test(k))) },
    }).catch((e) => ({ ok: false, status: 599, text: async () => JSON.stringify({ detail: String(e) }) }));
    const text = await res.text();
    let body; try { body = JSON.parse(text); } catch { body = { detail: text.slice(0, 200) }; }
    body = scrub(await localiseImages(body));
    writeFileSync(file, JSON.stringify({ path: url.pathname, query: url.search.replace(/(token)=[^&]+/g, "$1=…"), status: res.status, body }, null, 1));
  }
  if (!existsSync(file)) {
    console.warn(`   no fixture for ${request.method()} ${url.pathname}${url.search.slice(0, 80)}`);
    return route.fulfill({ status: 404, contentType: "application/json", body: '{"detail":"Not Found"}' });
  }
  const saved = JSON.parse(readFileSync(file, "utf8"));
  return route.fulfill({ status: saved.status, contentType: "application/json", body: JSON.stringify(saved.body),
                         headers: { "access-control-allow-origin": "*" } });
}

const browser = await chromium.launch();
let failures = 0;
for (const scenario of scenarios.filter((s) => !ONLY || s.name.includes(ONLY) || s.family === ONLY)) {
  for (const theme of THEMES) {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({ viewport: SIZES[viewport], deviceScaleFactor: viewport === "mobile" ? 2 : 1,
                                                colorScheme: theme, reducedMotion: "reduce" });
      await context.addInitScript(([user, theme]) => {
        if (user) window.__PORTAL_PREVIEW_USER__ = user;
        try { localStorage.setItem("artvista-theme", theme); if (user) localStorage.setItem("user", JSON.stringify(user)); } catch {}
      }, [scenario.user, theme]);
      await context.route((url) => API_HOSTS.includes(url.hostname), (route) => answer(route, scenario));
      await context.route(/googleapis\.com|google\.com\/recaptcha|gstatic\.com\/recaptcha|firebaseio\.com/, (route) => route.abort());
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      try {
        await page.goto(BASE + scenario.path, { waitUntil: "networkidle", timeout: 60000 });
        if (scenario.steps) await scenario.steps(page);
        await page.waitForTimeout(700);
        const dir = join(OUT, scenario.family);
        mkdirSync(dir, { recursive: true });
        if (flag("--overflow")) {
          const wide = await page.evaluate(() => {
            const vw = document.documentElement.clientWidth;
            return [...document.querySelectorAll("body *")]
              .filter((e) => e.getBoundingClientRect().right > vw + 1 && !e.closest("[class*=tableWrap]"))
              .slice(0, 8)
              .map((e) => `${e.tagName.toLowerCase()}.${String(e.className).slice(0, 60)} right=${Math.round(e.getBoundingClientRect().right)} w=${Math.round(e.getBoundingClientRect().width)}`);
          });
          for (const line of wide) console.log("  wider than the screen: " + line);
        }
        await page.screenshot({ path: join(dir, `${scenario.name}-${theme}-${viewport}.png`), fullPage: true });
        console.log(`ok  ${scenario.name} ${theme} ${viewport}${errors.length ? "  page errors: " + errors.join(" | ").slice(0, 200) : ""}`);
      } catch (e) {
        failures += 1;
        console.log(`ERR ${scenario.name} ${theme} ${viewport}: ${String(e).slice(0, 200)}`);
      }
      await context.close();
    }
  }
}
await browser.close();
process.exit(failures ? 1 : 0);
