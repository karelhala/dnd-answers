# dnd-answers

Rehor's Restoration Console is a static cooperative workshop app for two squads.
ConsoleDot Experience restores Memory through Corrupted Core; ConsoleDot Framework
restores Judgment through Spectral Steeds.

## Current status

Batch 1 provides the application shell, squad selection, Practice/Official modes,
and presenter acknowledgment. Puzzle simulators, grading, rewards, repairs, and
persistence are not implemented yet. Selections reset on refresh.

## Local development

Use Node.js 24 LTS (24.16.0 or newer within major 24) and npm. `.nvmrc` pins the
verified setup version.

```sh
nvm use
npm ci
npm run dev
```

Open the `/dnd-answers/` URL printed by Vite.

```sh
npm run typecheck   # Strict TypeScript checks
npm test           # Run tests once
npm run test:watch # Interactive test watcher
npm run build      # Typecheck and build into dist/
npm run preview    # Serve the production build locally
```

Vite uses `/dnd-answers/` as its base path for the intended GitHub Pages project
site. Deployment workflows and publication are outside this foundation batch.

## Workshop boundaries

- Practice grants no official rewards. Official is a presenter convention, not
  authentication or protected access.
- Each browser is independent; there is no cross-browser submission channel.
- No backend, AI calls, authorship detection, telemetry, or external fonts.
- Client-side code is inspectable; this is not a secure assessment platform.
- Combat and reward consumption remain outside the app.

See `IMPLEMENTATION_PLAN.md` for the full implementation scope and acceptance gates.
