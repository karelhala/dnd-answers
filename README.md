# dnd-answers

Rehor's Restoration Console is a static cooperative workshop app for two squads.
ConsoleDot Experience restores Memory through Corrupted Core; ConsoleDot Framework
restores Judgment through Spectral Steeds.

## Current status

Batch 1 provides the application shell, squad selection, Practice/Official modes,
and presenter acknowledgment. Batch 2 adds pure puzzle engines and follow-up
grading, tested independently of the UI. Batch 3 adds four isolated sessions,
reducer transitions, saved drafts, and validated local persistence. Team and mode
controls now restore on refresh. Batch 4 wires the full coin trial, understanding
questions, attempt history, and Practice/Official result announcements. The steed
UI and presenter repair/new-case/reset controls remain for batch 5.

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

## Running the coin trial

1. Select ConsoleDot Experience. Practice is the default on first visit; Official
   requires a local presenter acknowledgment and never copies Practice progress.
2. Choose fragments on the two labeled pans. Each pan must hold an equal count
   of one to six fragments; a fragment cannot appear on both pans.
3. Choose **Weigh fragments** to record a text outcome. Invalid selections do not
   consume quota. After three weighings, identification remains available.
4. After at least one weighing, select the corrupted fragment and its weight
   direction, then **Submit identification**. Wrong answers remain correctable;
   correct answers freeze the puzzle and open two understanding questions.
5. Answer both questions, selecting the exact candidate set and a separate weight
   direction for the hypothetical balance. **Check understanding** allows unlimited
   corrections. This checks one case plus understanding, not a universal strategy.
6. Practice shows practice-only success. Official announces one Rehor intervention
   for ConsoleDot Experience and Alliance Surge (two shared rerolls) for ConsoleDot
   Framework. Revisiting or refreshing the result does not grant rewards again.

Pan selections, answer drafts, weighing history, and understanding progress survive
team/mode changes and refreshes when storage is available. Attempt history is
expandable. All controls work without drag-and-drop; results and errors use text
and live announcements. Major phase transitions focus the next heading, while
switching back to a saved trial does not move focus unexpectedly.

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

## Local state and recovery

`src/state/` owns the workshop reducer, session creation, typed storage parser,
and React provider. Cases, IDs, and timestamps are generated outside the reducer.
Each squad has separate Practice and Official cases. Draft selections, primary
answers, follow-up drafts, evidence, and terminal outcomes belong to that slot.
Actions carry case IDs so stale submissions cannot change a replacement case.

Progress uses the namespaced localStorage key `dnd-answers.workshop` with schema
version 1. Loading replays weighings/races against the hidden case and revalidates
accepted answers and solved verification. Unknown or malformed records are never
silently overwritten: use the recovery notice to confirm resetting both squads
and both modes, or continue in memory without saving. Storage denial or quota
failure shows a warning and leaves the app usable in memory.

The most recent 100 attempt events are retained per case. Complete observation
history is stored separately and never trimmed, because grading needs it.
Terminal outcomes are idempotent; no mutable reward counters exist. Reducer-level
new-case, team-reset, workshop-reset, and cooperative-repair transitions are
implemented for later UI wiring. These require explicit confirmation; Practice
cannot be repaired.

Use one presenter tab. Cross-tab synchronization is not supported. Different
browsers, private sessions, development origins, and deployed origins do not
share progress. Clearing site storage loses the local record. Saved state and
hidden cases remain inspectable; validation is recovery protection, not anti-tampering.

## Workshop boundaries

- Practice grants no official rewards. Official is a presenter convention, not
  authentication or protected access.
- Each browser is independent; there is no cross-browser submission channel.
- No backend, AI calls, authorship detection, telemetry, or external fonts.
- Client-side code is inspectable; this is not a secure assessment platform.
- Combat and reward consumption remain outside the app.

See `IMPLEMENTATION_PLAN.md` for the full implementation scope and acceptance gates.
