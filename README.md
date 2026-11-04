# dnd-answers

Rehor's Restoration Console is a static cooperative workshop app for two squads.
ConsoleDot Experience restores Memory through Corrupted Core; ConsoleDot Framework
restores Judgment through Spectral Steeds.

## Current status

Batch 1 provides the application shell, squad selection, Practice/Official modes,
and presenter acknowledgment. Batch 2 adds pure puzzle engines and follow-up
grading, tested independently of the UI. Interactive simulators, rewards,
repairs, and persistence are not wired up yet. Selections reset on refresh.

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

## Puzzle engines

- `src/domain/coins.ts`: twelve-fragment cases, equal-pan validation, three-weighing
  limit, and one-case identification. A correct answer after at least one weighing
  opens verification; this does not prove a universal strategy or exclude guesses.
- `src/domain/steeds.ts`: fixed speed permutations, two-to-five-steed races,
  seven-race limit, and evidence-only unique-top-three proof. A correct hidden
  ranking without enough observed evidence does not pass.
- `src/domain/random.ts`: native crypto case generation with injectable uint32
  sources, unbiased index selection, and Fisher–Yates shuffling.
- `src/content/questions.ts` and `src/domain/verification.ts`: two fixed conceptual
  questions per puzzle, graded by exact stable answer-ID sets. Both must pass.

Domain operations return immutable next-state values or categorized failures.
Invalid operations consume no quota. Accepted answers freeze observations while
verification remains pending. No randomness is used after initial case creation.

Engine tests cover all 24 coin cases, 150 deterministic steed permutations with
the seven-race strategy, a noncanonical strategy, and an independent proof oracle
enumerating compatible orders for all 1,024 forward-edge graphs on five nodes.
These checks do not enumerate all 25! steed rankings. Deterministic strategy
fixtures live in `src/test/fixtures.ts`, outside the application entry graph.

## Workshop boundaries

- Practice grants no official rewards. Official is a presenter convention, not
  authentication or protected access.
- Each browser is independent; there is no cross-browser submission channel.
- No backend, AI calls, authorship detection, telemetry, or external fonts.
- Client-side code is inspectable; this is not a secure assessment platform.
- Combat and reward consumption remain outside the app.

See `IMPLEMENTATION_PLAN.md` for the full implementation scope and acceptance gates.
