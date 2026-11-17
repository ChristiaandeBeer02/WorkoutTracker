# Workouts

A phone-first workout plan: legs, push, cardio + core, and pull. Each day shows the muscles it trains and the sets to do. Tap an exercise, including a fallback, for the muscles it works and a YouTube search for the movement.

Muscle figures use path data from [MuscleMap](https://github.com/Jsplice/MuscleMap) (MIT). The notice is in `src/anatomy.ts`.

The exercise catalogue is [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Unlicense), bundled for offline search. Photos load from that repository the first time they are opened.

There are no kilogram loads. The tables use rep ranges only. Day colours can be changed from the Colours panel and are saved in this browser.

Home, Tracker, and Exercise share a bottom menu. Tracker logs weight and reps for each day on its own. Manage days renames, recolours, reorders, and adds or removes days. Submit moves to the next day in that list. Only the last session for each day is kept on this phone.

Exercise searches the catalogue. Filter by muscle, equipment, or a day from the current split. A day filter lists what is on that day. Open an exercise for the write-up and photo. Add puts a card on a day’s Tracker list.

A thin rest bar stays at the top of the screen. Pick 30s, 60s, 90s, 2m, or 3m, then Start. The time left is the end time saved on this phone, so a refresh or a restart keeps it. When it ends, the installed app posts a notification. If notifications are blocked, the bar shows Done and plays a short beep.

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints. The app is built for GitHub Pages at `/WorkoutTracker/`, so local assets use that base path.

```bash
npm run build
npm run preview
```

## Publish on GitHub Pages

The workflow in `.github/workflows/pages.yml` builds the app and deploys it with the official GitHub Pages actions on every push to `main`.

One manual step: in the repo, open **Settings → Pages** and set **Source** to **GitHub Actions**.

After that deploy finishes, the app is at [https://christiaandebeer02.github.io/WorkoutTracker/](https://christiaandebeer02.github.io/WorkoutTracker/).

Add it to the home screen from the browser. A service worker caches the app so the plan still opens with no signal.
