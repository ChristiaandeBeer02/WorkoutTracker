# AGENTS.md

Read this file before changing WorkoutTracker. If a change alters behaviour described here, update this file in the same pull request.

The live app is a phone-first PWA at <https://christiaandebeer02.github.io/WorkoutTracker/>. Many people use that one URL. There are no accounts. Each browser keeps its own data in `localStorage`.

## Standing rules

- Do not add logins, accounts, a backend, or any sync. All user data stays in `localStorage` on that phone.
- `src/data/exercises.json` is append-only. Share codes store a catalogue exercise as its array index (`src/exercises.ts`, `src/shareCodec.ts`). Do not reorder, insert, or delete entries. Appending does not change old indexes. If an existing index would change, or the share binary layout would change, bump `SHARE_VERSION`.
- Do not put kilogram loads in plan text, catalogue copy, or other in-app content. The tracker stores whatever weight string the person types. Plan tables use rep ranges only.
- Free weights first, machines as fallback. In `src/plan.ts` the first column is the default logged movement (`trackerSlots` uses `options[0]`). Put the free-weight movement there and the machine in the Fallback column.
- One fresh agent per feature or small batch. Read this file first. Open a pull request. Merge once CI on that PR is green (the owner has given standing permission to do that). After the merge, confirm the GitHub Pages deploy on `main` succeeded. For a UI change, include light and dark mobile screenshots (the app follows `prefers-color-scheme`; there is no in-app theme toggle).

## Stack

- Vite 7, React 19, TypeScript (`strict`, `noUnusedLocals`). Entry: `index.html` → `src/main.tsx` → `src/App.tsx`.
- `vite.config.ts` sets `base` to `/WorkoutTracker/`. Local and Pages builds both use that path.
- PWA: `vite-plugin-pwa` (Workbox) plus `workbox-window`. `injectRegister: false`; `src/components/UpdateBanner.tsx` registers the worker.
- Other runtime libraries: `minisearch` (name search), `qrcode-generator` (share QR codes).
- Exercise photos are not bundled. They load from `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/`.
- Muscle figure paths are inlined from MuscleMap (MIT). The notice is in `src/anatomy.ts`. The catalogue is free-exercise-db (Unlicense), noted in `src/exercises.ts`.
- There is no lint script and no ESLint config. `npm run build` typechecks with `tsc --noEmit` before `vite build`. Tests are not in the `tsconfig.json` `include`.

## Commands

```bash
npm install
npm run dev       # Vite dev server
npm test          # node:test. See test/ below.
npm run build     # tsc --noEmit && vite build
npm run preview   # vite preview on 127.0.0.1:4173
```

`npm test` runs `node --experimental-strip-types --import ./test/register.mjs --test test/trackerDrafts.test.ts test/exerciseSearch.test.ts test/customExercises.test.ts test/shareCodec.test.ts`. `test/register.mjs` maps extensionless relative imports onto `.ts` files so the tests can import app modules.

## CI and GitHub Pages

Workflow: `.github/workflows/pages.yml`.

- Runs on every push to `main`, on pull requests, and `workflow_dispatch`.
- Node 22, `npm ci`, `npm test`, `npm run build`. The `dist` directory is uploaded as a Pages artifact.
- The deploy job runs only when the event is a push to `main` (`actions/deploy-pages`). Pull requests build and test only.
- Concurrency group `pages-${{ github.workflow }}-${{ github.ref }}` cancels an in-progress run on the same ref.
- One-time repo setting (already done for this repo): Settings → Pages → Source = GitHub Actions.
- Pages responds with `Cache-Control: max-age=600` (about 10 minutes), including `sw.js`. A green deploy does not mean every open phone sees the new files immediately. The update checker below is what eventually notices.

`__APP_VERSION__` is the first 7 characters of `GITHUB_SHA`, or `git rev-parse --short=7 HEAD`, or `"dev"`. Home prints it as `v{version}`.

## Service worker and the update banner

`UpdateBanner` (`src/components/UpdateBanner.tsx`) is mounted for the whole session.

- Registers `${BASE_URL}sw.js` with scope `BASE_URL` and `updateViaCache: "none"`.
- A waiting worker, while another worker already controls the page, sets the banner: **New version ready**, **Update**, and a dismiss control.
- **Update** calls `flushDraftsNow()` (so typed tracker numbers are saved) then `messageSkipWaiting()`. When the new worker takes control after an update, the page reloads.
- Dismiss hides the banner until the next full load. It does not skip the update.
- `registration.update()` runs when the document becomes visible, and every 2 minutes (`CHECK_EVERY_MS`). That is what looks for a new `sw.js` while Pages may still be serving the previous one for about 10 minutes.
- Workbox (`vite.config.ts`) precaches built assets (`maximumFileSizeToCacheInBytes` is 3 MB, because the catalogue JSON is large), uses `index.html` as the navigation fallback, and `importScripts` `public/rest-sw.js`.
- Exercise photos use a separate CacheFirst cache `exercise-images` (60 entries, 30 days). A failed photo on the detail screen says **Photo unavailable offline.**

`public/rest-sw.js` is the rest-timer half of the worker. The page posts `{ type: "rest-timer", action: "start" | "cancel", endAt }`. The worker waits until `endAt` and shows **Rest finished** / **Time for the next set.** A notification click focuses a window in scope, or opens the scope.

## App shell

Three views, bottom nav (`src/components/BottomNav.tsx`): Home, Tracker, Exercise. The last view is saved under `workout-tracker-view`.

`RestBar` stays at the top on every view. `UpdateBanner` sits with it. A `#import=` hash opens the import dialog on top of whichever view is showing (`src/App.tsx`).

## Home

`Page` in `src/App.tsx`.

- One card per day from `loadDays()`, in day-list order. The card is the last submitted session for that day (`loadDayLog`). Only the latest session is kept.
- Session lines are exercises in that log that have at least one set with a weight or reps. Order follows the current tracker cards (`cardsForDay`); names that are not on the list sort after those that are. A set is shown as `{weight}×{reps}`. Empty weight and reps are omitted. The date is `loggedAt` (`day short month year`). No filled sets shows **No exercise recorded**.
- Each card has a small figure (`paintDays` of that day only), the day's primary muscle names, and **Heart & lungs** when `dayHasCardio`.
- The page figure is every day painted together (`src/muscles.ts` `paintDays`). Days earlier in the list win a shared muscle (the loop walks the list in reverse and overwrites). **Muscles covered** / **Muscles missing** use the same ownership. Missing none shows **None - full coverage**.
- Names on a day that are neither catalogue nor saved custom exercises are unmapped (`unmappedOnDay`). The muscles section lists those days; each card also shows `linkWarning` (“N exercise(s) in {day} have no muscles linked…”). Either control opens `MapDialog` (`src/components/MuscleEditor.tsx`) so those names can be linked.
- **Colours** opens `SettingsPanel` for the four plan-day colours.

Figure regions: `DB_MUSCLE_REGIONS` in `src/muscles.ts`. Abdominals also paint obliques. Shoulders paint front, side, and rear. Heart & lungs is not a painted region.

## Tracker

`src/components/Tracker.tsx`, persistence in `src/trackerStore.ts` and `src/trackerDrafts.ts`.

- Day `<select>` plus **Manage days**. The selected day id is `workout-tracker-v2-day`.
- Cards come from the saved list for that day, or `trackerSlots` for a built-in plan day that has never been saved, or one blank card for any other unsaved day.
- Each card: name field, suggestion list, **View details** (only when the name is non-empty), **+ set** / **- set**, up and down arrows (`moveCard` swaps card order and saves the list), **Remove** then **Remove?** to confirm.
- The sets table is Set, Weight (`inputMode="decimal"`), Reps (`inputMode="numeric"`), then the previous submitted weight and reps (`-` when empty). Previous values are looked up by the trimmed card name, not by a normalised key.
- Unsubmitted weight, reps, and set count live in the draft book, keyed by day id and card id. They survive reload, tab change, and a resumed PWA. Edits write through after 250 ms (`DRAFT_SAVE_MS`), and also on `pagehide`, when the tab becomes hidden, and when Tracker unmounts. The update banner flushes them before reload.
- Adding a character to a reps field calls `startRestIfIdle()` (`src/restBridge.ts`).
- **Submit** runs `applySession`: a fully blank exercise is left as it was, including its set count; a blank set row keeps that set's previous numbers; any other row is stored trimmed. If at least one exercise was saved, `loggedAt` becomes now. Drafts for that day are cleared, the list (including the chosen set counts) is saved, and the picker moves to the next day, wrapping to the first.
- **View details** pushes a history entry (`trackerDetail`) and renders `ExerciseDetail`. **Add** appends that exercise to the selected day.
- Name suggestions (`suggestionsFor`): `searchByName` over the catalogue, saved custom names, that card's plan options, and names already in this day's log. The exact typed string (case-insensitive) is removed. Cap is 20.

### Rest timer

`src/components/RestBar.tsx`, `src/restTimer.ts`, `src/restAlert.ts`.

- Presets are 30 s, 60 s, 90 s, 2 min, 3 min. Default is 90 s. The control shows `m:ss`. The choice and the running end time are `workout-tracker-rest`.
- **Start** is ignored if a countdown is already running. It asks for notification permission, arms the beep (so a later sound is allowed), stores `endAt = now + duration`, and posts that timestamp to the worker.
- While running, the picker is replaced by the countdown. **Reset** cancels the worker alert and returns to idle. The duration cannot be changed while running.
- On reaching zero the bar returns to the picker (it does not stay on a “Done” label). If the page is open, `finishRestAlert` shows the notification when permission is granted, otherwise it vibrates and plays a short 880 Hz beep. The worker notification can also fire from `rest-sw.js`.
- A reload mid-countdown restores `endAt` and reschedules the worker. An end time already in the past is reconciled to idle with no notification.

## Exercise

`src/components/ExercisePage.tsx`.

- Search box plus filters: List (All / Custom), Main muscle, Equipment, Secondary muscle. All default to All. The filters and the search query combine with AND.
- **All** lists custom exercises, then the catalogue. **Custom** lists saved custom exercises only.
- **Main muscle** matches only `exercise.primaryMuscles` on catalogue rows, or a custom exercise's main list (`muscles`). **Secondary muscle** matches `exercise.secondaryMuscles` on catalogue rows, or a custom exercise's `secondary` list. A custom row is hidden whenever Equipment is not All. Catalogue rows match `exercise.equipment` (empty string when the catalogue value is null).
- With a query, rows are limited to `searchByName` hits in that source and then sorted by that ranking. With an empty query, source order is kept.
- Opening a row pushes `exerciseDetail` on history and shows the write-up. Catalogue rows show level, equipment, category, primary and secondary muscles, figure, photo, and instructions. Custom rows show **Primary** and **Secondary** lines, the figure (main at primary opacity, secondary at the lighter opacity), and the muscle editor. **Add to** defaults to the current tracker day and calls `appendExerciseToDay`.
- Catalogue detail shows **Heart & lungs** when `nameTrainsCardio`. Custom detail shows it when `cardio` is set. **Delete** then **Delete?** removes a stored custom exercise.

## Name search

`src/exerciseSearch.ts`. One MiniSearch index for the catalogue (built once) and one for custom names (rebuilt only when that list changes). Matching is name-only. Main muscle, secondary muscle, and equipment filters stay outside the index.

Normalisation (`tokenize`, `processTerm`, `termsOf`):

- Tokens are Unicode letters and numbers. Case is folded, diacritics are stripped (NFD, then remove marks).
- Hyphens, apostrophes, slashes, brackets, and other separators are not part of the token. `Pull-Up` → `pull` `up`. `3/4 Sit-Up` → `3` `4` `sit` `up`. `Élévation` → `elevation`.
- A squashed form (those words joined with the separators removed) is indexed beside the words, including consecutive joins. `dumb bell` matches `Dumbbell`, and `pull up` matches `Pull-Up` / `Pullups`.
- Words may arrive in any order (`combineWith: "AND"`). `row dumbbell` matches `Dumbbell Bent-Over Row`.
- Prefixes match while typing. A one-letter query still prefixes (`d` → dumbbell…). Inside a longer query, a one-letter token must be the whole word (`t bar` does not match an unrelated word that merely contains `t`).
- Typos: edit distance is off for 1–3 character terms, 1 for 4–5 characters, 2 from 6 characters up. A fuzzy term must share the first character and a two-character prefix. `dumbel` can match dumbbell; `leg` does not match `log`.
- Shorthand is not a synonym. `db bench` does not match dumbbell bench. `ohp` does not match overhead press.

Ranking buckets, then shorter name, then `localeCompare`:

0. Exact phrase, or exact squash (`barbell curl` = `Barbell Curl`).
1. Name or squash starts with the query.
2. Every query word is a prefix of some name word, or the squash is a prefix of consecutive name tokens.
3. The same, allowing a fuzzy near-miss.

`searchByName` options: `universe` (only these names, and names outside the standing indexes are searched too), `extraNames` (merged in; ignored when `universe` is set), `customNames` (omit to read this browser's custom exercises), `limit`.

Call sites: Exercise list (`universe` = the rows already chosen by List), tracker suggestions (`extraNames` = plan options and logged names, then cap 20), **Same muscles as** (`customNames: []`, `limit: 6`, catalogue only).

## Custom exercises

`src/customExercises.ts`. Storage key `workout-tracker-custom-exercises`.

- Map keyed by `normaliseExerciseName`: trim, collapse whitespace, lower case. The stored `name` keeps the typed display spelling.
- Shape: `{ name, muscles: string[], secondary: string[], cardio: boolean }`.
- Catalogue names are never stored. `saveCustomExercise` returns false for an empty name or a catalogue name.
- `muscles` are the main muscles and `secondary` are the lighter ones. Both are unique. A muscle is never in both lists; a name that is in both stays main. Catalogue names stay in `CATALOGUE_MUSCLE_NAMES` order. Other stored strings are kept after those names, so nothing already saved is dropped. A stored entry with no `secondary` loads as main only. **Heart & lungs** is the `cardio` flag, not a muscle chip.
- Each muscle chip, and each tappable diagram region (`Figure` `onPick`), cycles off → main → secondary → off. Main uses the pressed chip style and primary opacity. Secondary uses a softer accent chip and the lighter secondary opacity. A legend reads **Tap to cycle: main, secondary, off**.
- **Same muscles as** copies that catalogue exercise's primary muscles into main and its secondary muscles into secondary. They are not merged into one list. Cardio is set when the catalogue category is `cardio`.
- Home shading, the covered-muscle list, and the custom figure use both lists the same way catalogue primary and secondary do.
- Saves dispatch `workout-custom-changed`. Home and Exercise listen and repaint.
- Unmapped means: non-empty, not in the catalogue, and not in this map.

`exerciseIsCardio` is true for the catalogue category `cardio`, and also for the plan names `easy steady state` and `intervals`.

## Manage days

`src/components/ManageDays.tsx`, day list in `src/days.ts`.

- Opens as a dialog from Tracker. Backdrop or **Save** closes it, unless a name is empty or duplicated (case-insensitive).
- Each row: drag handle (pointer reorder), name, colour, **Share**, select checkbox.
- Rename and colour save immediately. Recolouring a built-in id (`legs`, `push`, `pull`, `cardio`) also updates the Colours panel key (`cardio` → `cardioCore`).
- **+** appends a day (`day-{time}-{rand}`), name `New day` or `New day 2`…, colour from the default palette, and one blank card.
- **Delete** needs a selection, then a second press (**Delete?**). At least one day must remain. `purgeDayData` drops that day's log, list, and drafts.
- **Reset** then **Reset?** restores Legs, Push, Cardio + Abs, Pull with default colours, clears saved lists and drafts, and drops logs for ids that are no longer in the list. Built-in ids keep their logs.
- **Import**, **Export** (selected), **Export all days**, and the row **Share** button open the share dialogs.

Default colours (`src/colors.ts`), same in light and dark: Push `#1084FE`, Pull `#E6B325`, Legs `#00AFC4`, Cardio + Abs `#E5484D`.

Built-in plan days and their tracker slots: `src/plan.ts` (`LEGS_TABLE`, `PUSH_TABLE`, `CARDIO_TABLE` + `CORE_TABLE`, `PULL_TABLE`). Cardio + Abs is one day id, `cardio`.

## Day share and import

`src/shareCodec.ts`, `src/dayShare.ts`, `src/components/ExportDays.tsx`, `src/components/ImportDays.tsx`.

The code shares names, colours, exercises, and set counts. It does not share logged weights or reps.

Format:

- Prefix is `{SHARE_VERSION}.` — currently `2.`. Codes prefixed `1.` still import.
- The rest is the binary payload, compressed with `deflate-raw`, then URL-safe base64 ( `+` → `-`, `/` → `_`, padding stripped).
- Payload, little-endian: version byte, day count, then each day: name, three RGB bytes, exercise count, then each exercise.
- Name strings are a length byte plus UTF-8 (max 180 bytes). Sets are clamped to 1–99.
- Catalogue exercise: sets in the low 7 bits, then a `u16` catalogue index. The stored name is the catalogue name at that index.
- Custom exercise: high bit set on the sets byte, then the name, then a `u24` main-muscle mask. Mask bit order is `SHARE_MUSCLE_BITS` (abdominals through triceps). The next bit is Heart & lungs. Version 2 writes a second `u24` for secondary muscles, same bit order, with no Heart & lungs bit. Version 1 has only the first mask: every muscle is main and secondary is empty. A muscle set in both masks is kept as main. Do not reorder those bits without a version bump.
- Limits: 40 days, 80 exercises per day. Over those, or a name that is too long, throws `ShareError`.
- A higher version is refused (`NEWER_VERSION_MESSAGE`). Version 1 and version 2 both import. An index past the catalogue this build knows is treated as a newer version. Unknown bytes at the end are rejected.
- Appending to the catalogue does not need a version bump. Reordering, inserting, or changing this layout does.

Link: `https://christiaandebeer02.github.io/WorkoutTracker/#import={code}`. `extractShareCode` also accepts a pasted code or an `?import=` / `#import=` URL.

QR: `qrcode-generator` (type 0, error correction M) of the full link. If that link is longer than `QR_LINK_LIMIT` (1000 characters) the QR is skipped and the dialog says to use the link or the code. **Share link** uses `navigator.share` when that exists. Cancelling the sheet does nothing; any other failure, or a missing share API, copies the link. **Copy** copies the raw code.

Import:

- App startup and `hashchange`: a `#import=` hash is decoded, the hash is removed with `replaceState`, and `ImportDays` opens with the code.
- Preview lists `{name}, {n} exercises` and a custom count when any exercise is not a catalogue index.
- A day name that is not already used is mode `new` (appended, no choice). A name that is already used must be **Replace** or **Add** before **Import** enables.
- **Replace** keeps that day id and its logged history, updates the colour, and replaces the exercise list (names and set counts).
- **Add**, or a new name, appends a new id. A clash forces a `Name (2)` style suffix.
- Custom exercises in the code are saved locally when that normalised name is not already custom, including secondary muscles. Catalogue exercises are not written into the custom map.
- Applying the import dispatches `workout-days-changed` and, for a replaced built-in day, updates the matching Colours-panel key.

## Back button

`src/closeOnBack.tsx`.

- `useDismissOnBack(active, onDismiss)` pushes a history entry while `active` is true. Browser or phone Back runs `onDismiss` instead of leaving the page. Nested pop-ups close one at a time. Unmounting (the in-app close button) drops that entry so they do not pile up.
- `CloseOnBack` is `useDismissOnBack(true, onClose)`. It is mounted in Manage days, Import, Export, and the link-muscles dialog.
- Confirm steps use `useDismissOnBack` on the confirm flag, so the first Back clears the confirm. On Manage days the next Back closes the dialog (`CloseOnBack` is underneath). On Tracker, **Remove?** is only a confirm, so the next Back is ordinary history. On a custom-exercise detail, the next Back leaves the detail.
- Exercise detail and tracker detail use their own history flags (`exerciseDetail`, `trackerDetail`), not `CloseOnBack`. `retreat` closes the detail and any pop-ups stacked on it in one step. The in-app **‹ Back** control uses that path too.

## Theme

`src/theme.tsx`, palettes in `src/colors.ts`, CSS variables consumed by `src/index.css`.

- Light or dark follows `prefers-color-scheme` only. `color-scheme` and `<meta name="theme-color">` are updated to that palette's background.
- Day colours are independent of the scheme. They are stored in `workout-tracker-day-colors` and mirrored onto `--push`, `--pull`, `--legs`, `--cardio`. Changing a plan-day colour from the Colours panel also rewrites that id inside a saved day list (`syncDayFromPanel`). **Reset to defaults** clears the colour key and repaints built-in days from the defaults.
- Chrome tokens (`--bg`, `--text`, `--accent`, …) come from `chromeVars`. Do not add a second theme mechanism.

## localStorage

Every key is per browser. Reads tolerate missing or broken JSON. Legacy keys `workout-tracker-stats`, `workout-tracker-day`, and `workout-tracker-day-lists` are deleted on load; do not write them.

| Key | Shape |
| --- | --- |
| `workout-tracker-view` | `"home"` \| `"tracker"` \| `"exercise"` |
| `workout-tracker-days` | `TrackerDay[]`: `{ id, name, color }` with `color` `#RRGGBB`. Missing key → the four default days. |
| `workout-tracker-day-colors` | `{ push, pull, legs, cardioCore }` hex strings. Invalid entries fall back to defaults. |
| `workout-tracker-v2-day` | Selected tracker day id. |
| `workout-tracker-v2-lists` | `{ [dayId]: WorkoutCard[] }`. Card: `{ id, name, options: string[], sets }` with `sets >= 1`. `options` are plan alternatives; added cards use `[]`. |
| `workout-tracker-v2-stats` | `{ version: 2, days: { [dayId]: { loggedAt: string \| null, book } } }`. `book` is `{ [trimmedName]: { sets: { weight, reps }[] } }`. Names are the submitted spelling, not normalised keys. |
| `workout-tracker-v2-drafts` | `{ sets: { [dayId]: { [cardId]: { weight, reps }[] } }, counts: { [dayId]: { [cardId]: number } } }`. Counts are integers 1–99. The key is removed when both maps are empty. |
| `workout-tracker-custom-exercises` | `{ [normalisedName]: { name, muscles: string[], secondary: string[], cardio: boolean } }` |
| `workout-tracker-rest` | `{ durationMs, endAt: number \| null, status: "idle" \| "running", notified }`. `durationMs` must be a preset or it resets to 90 s. |

In-app events (not storage): `workout-custom-changed`, `workout-days-changed`.

## Where to edit

| Area | Files |
| --- | --- |
| Views and home | `src/App.tsx`, `src/components/BottomNav.tsx` |
| Tracker, logs, drafts | `src/components/Tracker.tsx`, `src/trackerStore.ts`, `src/trackerDrafts.ts` |
| Rest | `src/components/RestBar.tsx`, `src/restTimer.ts`, `src/restAlert.ts`, `src/restBridge.ts`, `public/rest-sw.js` |
| Catalogue and plan | `src/data/exercises.json`, `src/exercises.ts`, `src/plan.ts` |
| Search | `src/exerciseSearch.ts`, `test/exerciseSearch.test.ts` |
| Custom muscles | `src/customExercises.ts`, `src/components/MuscleEditor.tsx`, `src/muscles.ts`, `src/components/Figure.tsx` |
| Days | `src/days.ts`, `src/colors.ts`, `src/theme.tsx`, `src/components/ManageDays.tsx`, `src/components/SettingsPanel.tsx` |
| Share | `src/shareCodec.ts`, `src/dayShare.ts`, `src/components/ExportDays.tsx`, `src/components/ImportDays.tsx` |
| Back button | `src/closeOnBack.tsx` |
| Exercise browser | `src/components/ExercisePage.tsx` |
| Update banner and PWA | `src/components/UpdateBanner.tsx`, `vite.config.ts` |
| Deploy | `.github/workflows/pages.yml` |
