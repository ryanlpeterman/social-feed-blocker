# Social Feed Blocker (Fork of News Feed Eradicator)

It's a modern reskin of News Feed Eradicator (does a great job at preventing doom scrolling) with some changes I wanted personally. It blocks distracting social feeds (Facebook, Twitter/X, Reddit, YouTube, Instagram, LinkedIn, TikTok, Threads, Substack, HN) and shows a clean, minimal panel you can use to open settings or temporarily allow a feed.

## Main changes I made

1. Modernized and cleaned up the front end
2. Implemented all short form video blocking (IG/FB Reels, TikTok, YouTube Shorts)
3. Implemented new social media websites like Threads and Substack notes
4. Removed quotes and instead added a counter
5. Added a button to close the tab that takes you back to the previous tab you were on, ideally restoring focus

## Screenshots

These are representative screenshots of the product. See `assets/screenshots/` for full‑size images.

![Settings](assets/settings.png)

![Twitter Example](assets/twitter-example.png)

![TikTok Example](assets/tiktok-example.png)

## Install (development)

This project targets WebExtensions (Chrome Manifest V3, and MV2/MV3 compatible code where possible).

Prereqs:

- Node.js 18+ recommended
- npm installed

Setup and run in watch mode:

```
npm install
make dev
```

Load the unpacked extension from the `build/` directory:

- Chrome: open `chrome://extensions`, enable Developer Mode, “Load unpacked…”, select `build/`.
- Firefox: use “about:debugging → This Firefox → Load Temporary Add‑on…”, select any file in `build/`.

Build a distributable zip:

```
make build
```

The packaged zip will be in `dist/` (MV3 manifest included as `build/manifest.json`).

## Contributing

We welcome contributions! A few notes to get you productive quickly:

- Code layout:
  - Content entry: `src/intercept.ts`
  - Injected UI (snabbdom): `src/components/index.ts` and `src/lib/inject-ui.ts`
  - Site adapters (feed detection + CSS): `src/sites/*`
  - Options page (React + MUI): `src/options/options.tsx`
  - Background service worker (MV3): `src/background/service-worker.ts` and `src/background/store/*`
- Adding a new site:
  1. Create `src/sites/<site>.ts` with `checkSite()` and `eradicate(store)`.
  2. Add paths, `origins`, and optional `css` to `src/sites/index.ts`.
  3. If you need site‑specific CSS, add `*.str.css` and import it in `src/sites/index.ts`.
  4. Verify permissions: the site’s origins must be listed in `src/manifest-chrome.json` under `optional_host_permissions`.
- Build/watch:
  - `make dev` (watch) and `make build` (release zip)
  - Rollup bundles: `intercept.js`, `options.js`, `service-worker.js`
- Formatting: run `npm run check` for typechecks; prettier config is included.

## Permissions & Privacy

- Remote code: not used. All code is bundled; no eval or remote JS execution.
- Host permissions: requested only for the sites you enable in the options page.
- Scripting: used to programmatically (un)register our packaged content script and stylesheet for enabled sites.
- Storage: settings are stored in `chrome.storage.sync`.

## Troubleshooting

- “Duplicate script ID 'intercept'” in console: fixed here by debouncing registration and unregistering before register; if you still observe it on Canary, reloading the extension clears stale registrations.
- Options doesn’t list sites on first load: the options page now eagerly snapshots settings from storage and re‑renders; ensure background permissions are granted for the sites you expect to see enabled.

## License

MIT (see `LICENSE`).

## Credit

Credit to Jordan West who developed the original open source project that this reskin is based off of: https://github.com/jordwest/news-feed-eradicator
