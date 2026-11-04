# dnd-answers

Rehor's Restoration Console is a static cooperative workshop app for two squads.
ConsoleDot Experience restores Memory through Corrupted Core; ConsoleDot Framework
restores Judgment through Spectral Steeds.

**App:** [https://karelhala.github.io/dnd-answers/](https://karelhala.github.io/dnd-answers/)

## Current status

Batch 1 provides the application shell, squad selection, Practice/Official modes,
and presenter acknowledgment. Batch 2 adds pure puzzle engines and follow-up
grading, tested independently of the UI. Batch 3 adds four isolated sessions,
reducer transitions, saved drafts, and validated local persistence. Team and mode
controls now restore on refresh. Batch 4 wires the full coin trial, understanding
questions, attempt history, and Practice/Official result announcements. Batch 5
adds the steed UI, both Official core summaries, cooperative repair, and scoped
new-case/reset controls. The lore layer adds a mode-aware shard/Rehor overview,
restoration trail, authored dialogue, mission briefings, and short result scenes.
Batch 6 adds read-only CI, a Pages deployment workflow, and a persistent Chromium
critical-path suite against the production build. Pushes to `main` automatically
deploy after tests, typechecking, and the production build pass. Complete Pages
setup and the human presentation checks below before the first release.

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
npx playwright install chromium # One-time browser installation, after npm ci
npm run test:e2e    # Typecheck, build, then run Chromium against production output
```

Vite uses `/dnd-answers/` as its base path for the intended GitHub Pages project
site. The intended origin is `https://karelhala.github.io`; actual Pages settings
or a custom domain may differ. Preview is a local rehearsal, not publication.

## Automated verification

```sh
npm ci
npm test
npx playwright install chromium
npm run test:e2e
git diff --check
```

`npm test` runs domain, state, persistence, and component tests. `test:e2e` includes
strict typechecking of application and test code and builds once before starting
a separate Vite preview on `http://127.0.0.1:4176/dnd-answers/`. Keep port 4176 free;
the suite refuses to reuse an existing server or silently test a stale build.

`e2e/workshop.spec.ts` covers production asset paths and direct refresh, no failed
or third-party requests during the navigation/persistence flow, four isolated
sessions, wrong and unsupported answers, exact-set corrections, seven-race
Official completion, cooperative repair, readiness, terminal reload, all reset
scopes, keyboard navigation, native modal cancellation, corrupt records, and
storage denial. Deterministic cases enter through ordinary localStorage before
bootstrap; no test-only endpoint, solution button, or fixture ships in the app.

The browser scope is Chromium only. Reflow checks use 375px and 640px viewports
and CSS zoom at 200%; they do **not** replace native browser zoom or screen-reader
speech checks. Tests isolate browser contexts and use only synthetic workshop data.
On failure, local screenshots/traces appear under ignored `test-results/`.
Inspect a trace with `npx playwright show-trace test-results/PATH/trace.zip`.

`.github/workflows/ci.yml` runs on pull requests and pushes to the verified default
branch, `main`: lockfile install, unit/component tests, Chromium installation,
then `test:e2e`. `build` already includes typechecking, so CI does not duplicate it.
The runner uses `.nvmrc` and an npm download cache. Failed browser runs retain
HTML reports, screenshots, and traces for seven days. Actions use verified release
SHAs; update each SHA and version comment together when reviewing upgrades.

## GitHub Pages deployment

Deployment workflow: `.github/workflows/deploy-pages.yml`.

- Every push to `main` triggers deployment after the workflow's verification passes.
  `workflow_dispatch` remains available for manual reruns. Pull requests do not deploy.
- Runs selected from any ref other than `main` are skipped. There is no arbitrary
  source-ref input. If the default branch is renamed, update both workflows.
- The build job has source-read permission only, reruns all verification, and
  uploads only `dist/` with the official Pages artifact action.
- Only the deploy job receives `pages: write` and `id-token: write`. It uses the
  `github-pages` environment and deploys the verified artifact without checking
  out or running application code. Deployment concurrency is serialized.
- `configure-pages` has automatic enablement explicitly disabled. No API key,
  PAT, application secret, or environment file is required.

Read-only setup inspection returned HTTP 404 from the repository Pages API;
Actions-based Pages configuration could not be confirmed. No settings were changed.

One-time setup and release checks:

1. Have an authorized maintainer confirm **Settings → Pages → Build and deployment
   → Source: GitHub Actions**. Enabling/changing this is a separate approved
   repository-setting action. Check the `github-pages` environment's branch and
   reviewer protections; permit only the intended `main` release branch. Required
   environment reviewers will still need to approve each deployment; retain or
   adjust that protection deliberately to suit the desired automation.
2. Complete the human rehearsal below on the actual presenter device/browser.
3. Review and commit the intended app, lockfile, tests, and workflows; push or merge
   to `main` when ready to publish. That push automatically starts verification
   and deployment. Check **Actions → Deploy GitHub Pages** for the result.
4. To retry a release without another push, open **Actions → Deploy GitHub Pages
   → Run workflow** and select `main`.
5. Open the deployment job's actual environment URL; expected project URL is
   [https://karelhala.github.io/dnd-answers/](https://karelhala.github.io/dnd-answers/). Confirm JS/CSS load under
   `/dnd-answers/`, switch squads/modes, and directly refresh that URL. Check console
   and network for missing assets or unexpected external requests.
6. Confirm the deployed page starts normally, contains no test fixture or private
   workshop/personnel data, and keeps Practice/Official isolated. Local rehearsal
   storage does not transfer to the deployed origin. Remove rehearsal progress
   with a confirmed workshop reset before the real session.

### Human presentation rehearsal — still required before release

Automation verifies semantics and focus, not actual screen-reader speech or the
presenter's screen-sharing experience. Record device/browser and results when run:

- [ ] Set **native browser zoom to 200%** (not CSS zoom). Check both puzzles,
  follow-up table, overview, trail, and reset dialog: readable controls, visible
  focus, no page-wide horizontal scrolling. Reset zoom afterward.
- [ ] With VoiceOver/Safari or NVDA/Firefox/Chrome, navigate squads/modes, make an
  invalid and a valid observation, accept an answer, correct verification, and
  cancel a reset. Confirm control labels, concise result announcements, phase
  focus, and no repeated full-dashboard announcements. The readiness heading must
  remain discoverable; cooperative repair must say unfinished steps were bypassed.
- [ ] On the actual shared laptop display, run one solved and one repaired core,
  check both reward recipients, refresh, and confirm readiness means the battle
  still lies ahead. Use one presenter tab and track reward use outside the app.
- [ ] After publication, repeat the base-path/asset/refresh check at the
  actual Pages URL. A successful local preview is not proof of live deployment.

## Restoration overview

The diagram shows Fullsend's shard, Rehor, and both squads' cores. Its two core
states always come from the selected mode: **Official restoration status** uses
Official sessions; **Training projection** uses Practice sessions and retains a
compact Official status line. Squad switching changes emphasis, not progress.
Fullsend's signal remains unidentified; the app does not reveal the epilogue.

The restoration trail describes the current task, not an extra gate. Submit a
finding whenever ready after the first observation; spending every observation
is not required. Exhausting the instrument does not establish sufficient evidence.
Cooperative repair explicitly bypasses unfinished trial steps instead of claiming
that the puzzle or reasoning check was completed.

**Mission briefing** is optional story context, separate from the operational
rules. Rehor's short dialogue is authored, deterministic presentation using public
session facts, never hidden answers. No AI service, new network request, or dialogue
history is involved. Existing validation messages and rewards remain authoritative.

When both Official cores are solved or repaired, **Rehor operational** means ready
for the shared final battle, not victory or an additional reward. Resetting a core
removes readiness. Practice readiness is labeled **Training projection operational**
and never changes Official cores.

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

## Running the steed trial

1. Select ConsoleDot Framework and the intended mode. Select two to five steeds,
   then **Race selected steeds**. **Clear race selection** changes only the draft.
2. Race histories show finishing order, never times or hidden global ranks.
   Repeated valid races consume quota; invalid selections do not.
3. Choose first, second, and third place, then **Submit top three**. The observations
   must uniquely establish all three positions. Unsupported guesses receive the
   same evidence feedback whether or not they match hidden speeds.
4. The seventh race disables racing, not ranking submission. An accepted ranking
   freezes evidence and opens two understanding questions. The group table is
   explicitly hypothetical and does not assume the player's actual strategy.
5. Both questions must pass. Official success gives ConsoleDot Framework one
   Rehor intervention and ConsoleDot Experience Alliance Surge (two shared rerolls).
   Practice never delivers official effects.

## Presenter repair and resets

The **Official restoration status** overview shows both squads' Official outcomes.
In Practice, the compact **Official cores** summary retains those outcomes beside
the training projection, independent of the currently viewed squad.

In Official mode, **Resolve through cooperative repair** is available while
playing or completing understanding questions. The other squad leads the repair.
Ask the three displayed questions aloud, accept reasonable answers, and check all
three confirmations before **Confirm repair**. No free-text answers are collected.
Repair retains puzzle evidence and restores only the selected core, granting its
squad one Rehor intervention but no Alliance Surge. If both cores need repair,
confirm each separately. Solved and repaired cases cannot be repaired again.

Every start-over action requires a modal confirmation stating its scope:

- **Start new case:** active squad and active mode only.
- **Reset team:** both Practice and Official for the selected squad.
- **Reset workshop:** all four sessions and presenter acknowledgment; returns to
  ConsoleDot Experience in Practice. This can also explicitly replace a corrupt
  saved record after confirmation.

Cancel or Escape preserves progress and returns focus to the triggering control.
Resets affecting Official progress warn that replacing a local record is not an
additional reward grant in an ongoing battle. The presenter still tracks reward
usage outside this app.

### Facilitator/developer solution fixture — not player instructions

The canonical steed strategy uses five disjoint groups of five (five races),
then races their winners (sixth race). Rename groups by the winners' finish order
A through E, with members numbered by their group finish. A1 is fastest overall.
Race A2, A3, B1, B2, and C1 seventh; the first two finishers are overall second and
third. The validator also accepts other evidence-sufficient strategies.

This repository is public client-side material. Placing the solution here is a
documentation distinction, not a secrecy boundary.

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
Terminal outcomes are idempotent; no mutable reward counters exist. New-case,
team-reset, workshop-reset, and cooperative-repair controls use the existing
reducer transitions with explicit confirmation. Practice cannot be repaired.

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
