# Implementation plan — Rehor's Restoration Console

## 1. Purpose and implementation boundary

Build a small, static workshop application in this repository. Two squads solve fictional logic puzzles to restore their AI companion, Rehor. Participants may practice in their own browsers; the facilitator shares a screen and enters the squads' official actions and answers.

The application verifies puzzle outcomes, asks additional understanding questions, and displays narrative rewards. It does not detect AI authorship, run submitted code, synchronize browsers, or administer the wider battle.

**This document is an implementation specification, not an implemented application.** Creating it does not authorize publishing, pushing, changing GitHub settings, or modifying other workshop documents.

### Repository baseline observed when preparing this plan

- Directory: `/Users/khala/Documents/git/karelhala/dnd-answers`.
- Existing files: `README.md`, `LICENSE`, and `package.json`, plus `.git/`.
- `README.md` currently contains only the repository title.
- `package.json` declares `type: commonjs`, has no application dependencies, and has a placeholder failing test command.
- `package.json` was untracked at inspection time. Preserve its metadata and inspect its current state before changing it; do not replace it blindly with a scaffolding template.
- No application, lockfile, or existing tests were observed.
- No repository-specific `AGENTS.md` was found in the checked ancestor chain. Check again before implementation in case instructions have since changed.

### Primary users

1. **Facilitator:** Presents the official session, switches between teams, enters the actions the players dictate, confirms cooperative repairs, and announces results.
2. **Participants:** Read rules and experiment in independent browser sessions. They may use AI, code, search, or any other tools to solve the puzzles.

### Observable outcome

The facilitator can run both trials in one browser without losing or mixing progress. Participants can practice without affecting that browser. A trial is restored by a validated answer plus follow-up questions, or by a clearly recorded facilitator-led repair.

## 2. Workshop context and narrative

The squads carry a shard containing **Fullsend**, a new AI tooling option whose intentions are unknown in the story. The shard is needed to seal the Rift Between Realms. **Rehor is a separate, known AI companion**, disabled by damage to two cores.

| Team ID | Display name | Assigned trial | Core restored |
|---|---|---|---|
| `experience` | ConsoleDot Experience | Corrupted Core: twelve crystal fragments | Memory |
| `framework` | ConsoleDot Framework | Spectral Steeds: twenty-five steeds | Judgment |

The squad labels reflect the proposed workshop split, not an implementation of employee assignments or a completed ownership transfer.

### Timing outside the application

1. Five-minute shared opening.
2. Round 1, thirty minutes: Experience solves Corrupted Core; Framework fights component beasts.
3. Round 2, thirty minutes: Framework solves Spectral Steeds; Experience fights component beasts.
4. Ten-minute shared finale, including cooperative repair if needed.

The app supports this flow but **does not enforce a timer, run combat, or automatically switch teams**. The facilitator controls timing and transitions.

### Rewards

- A squad that solves its puzzle earns one **Rehor intervention** for an upcoming battle or the finale.
- The other squad earns **Alliance Surge: two shared rerolls**.
- A cooperative repair restores the affected core and grants its squad one Rehor intervention, but no Alliance Surge.
- A solved core cannot also be repaired for duplicate rewards.
- Rewards are narrative announcements, not permanent character modifiers.
- The app does not spend interventions or rerolls. The facilitator tracks their use in the battle.

### Existing story material

Local workshop source documents are in `/Users/khala/Documents/manager/people/dnd/`:

- `STORY.md`: Fullsend shard narrative, round flow, puzzle briefs, and repair scene.
- `BESTIARY.md`: Ten component-inspired enemies.
- `README.md`: Character checks and existing game rules.
- `ITEMS.md`: Item catalog.

Consult these while implementing, but do not modify them as part of this app. The deployed app must not rely on these absolute paths, import private character plans, or link to local files. Include only the short, necessary narrative content as app-owned text.

**Do not expose the ending in the player UI.** The shard cracks after the battle; Fullsend's friend-or-foe status remains unresolved. The app stops at core restoration and repair rather than replaying the final epilogue.

## 3. Scope

### Required for the first usable version

- React + TypeScript + Vite application.
- One page; no client-side router.
- Experience/Framework team switch.
- Clearly separate Practice and Official modes.
- Interactive simulator for each puzzle.
- Answer submission followed by two structured verification questions.
- Deterministic rule-based grading, without AI calls.
- Trial histories, attempt feedback, and persistent local state.
- Distinct puzzle-solved and repaired outcomes.
- Facilitator repair flow with the three agreed easy questions.
- Reward announcements that identify both the receiving squad and the effect.
- Reset controls with scoped confirmation.
- Automated puzzle, state, and UI tests.
- Static build and a GitHub Pages deployment workflow.
- README covering local setup, workshop operation, limitations, and deployment.

### Explicit non-goals

- GitHub App installation, permissions, webhooks, or OAuth.
- Backend, database, remote APIs, authentication, or authorization.
- Multiplayer sessions, shared rooms, real-time updates, or synchronized results.
- AI authorship detection or accusations of cheating.
- Executing participant JavaScript, Python, or other submitted code.
- JSON decision-tree editor or universal coin-strategy checker.
- Competition-grade secrecy, anti-tampering, or tamper-proof logs.
- Leaderboards, participant accounts, email collection, or employee information.
- Analytics, telemetry, third-party fonts, or third-party content requests.
- Combat simulation, character-sheet editing, item activation, or reward consumption.
- Countdown clocks, automatic round advancement, elaborate animation, sound, or a narrative CMS.
- Miro updates, Rehor bot integration, or Fullsend integration.
- PWA/service worker, installable app, or guaranteed offline loading.
- Export/import, downloadable reports, themes, or additional puzzles unless separately requested.

## 4. Product behavior and trust model

### Practice versus Official

Both modes use the same puzzle rules and validators. They have independent sessions and different framing:

- **Practice:** Participants can start new cases freely. Success is labeled as practice only and never claims to grant official rewards.
- **Official:** The facilitator runs the squad's official trial on the shared screen. Success displays the appropriate reward announcement.

Default to **Practice** on first visit. Opening Official mode requires a short acknowledgment explaining that this is the presenter's local record, not a login or protected session. Do not ask for a password or imply access control exists.

Do not automatically copy a practice case, race history, answer, or success into Official mode. Official starts with a separate case, and switching away and back resumes that case.

### Local-only behavior

- Every browser has its own state.
- A participant's practice or official toggle cannot affect the presenter's browser.
- No participant-to-presenter submission channel exists in this version.
- Players verbally supply official actions and answers; the facilitator enters them.
- Device changes, another browser, private browsing, or cleared storage can lose access to previous local state.
- Attempt logs are convenience records, not audit evidence.

### AI and lucky guesses

The app must never label an answer as AI-generated. It cannot determine authorship or reliably infer guessing from a single answer.

Use accurate terms:

- `Invalid input` — the requested operation violates puzzle rules.
- `Incorrect answer` — a submitted answer is wrong for the current case.
- `Insufficient evidence` — race observations do not uniquely establish the claimed result.
- `Verification incomplete` — understanding questions are not yet answered correctly.
- `Core restored` — all required checks passed.

**Asymmetric verification is intentional:** The coin trial verifies one case and two understanding questions. The steed trial verifies a result supported by the observed races, plus two understanding questions. Neither result proves who produced the answer; the coin result does not prove a complete strategy across all 24 cases.

### Public client-side code

GitHub Pages serves all code to browsers. A sufficiently determined participant can inspect the source, local state, question keys, or hidden puzzle state. Obfuscation and disabled developer tools do not fix this.

Keep the warning in the README and a short limitations note, not as an alarming interruption. This is a cooperative workshop tool with facilitator oversight. If strong secrecy or authoritative cross-device validation becomes a requirement, stop and propose a separate backend design rather than pretending this version provides it.

## 5. Architecture and dependencies

### Stack

- React and React DOM for UI.
- TypeScript with strict checking for domain and UI code.
- Vite for development and static production build.
- Vitest for engine and state tests.
- React Testing Library and user-event for interactive component tests.
- jsdom for DOM-based unit tests.
- Plain CSS for the interface; no component library or CSS framework required.
- Playwright for a small critical-path browser suite if adding it remains practical for this repository. Engine tests and manual browser validation must not be deferred in its place.

Use npm and commit the resulting lockfile. Select mutually compatible current stable versions at implementation time and use the repository's supported Node LTS version. Record that Node version in project setup and CI. Do not install dependencies merely to write this plan.

### Dependency discipline

- No Redux, Zustand, routing library, graph library, form library, date library, or server framework is needed.
- Use React context plus a reducer for shared workshop state.
- Use native `crypto.getRandomValues` for shuffling and case selection through a small injectable random-source helper.
- Keep engine inputs deterministic after initial case creation. Tests pass explicit fixtures or deterministic random sources.
- Do not build a generic plugin framework for two fixed puzzles.

### Suggested file structure

```text
.github/workflows/
  ci.yml
  deploy-pages.yml
index.html
package.json
package-lock.json
tsconfig.json
vite.config.ts
src/
  main.tsx
  App.tsx
  styles.css
  content/
    teams.ts
    narrative.ts
    questions.ts
  domain/
    types.ts
    random.ts
    coins.ts
    steeds.ts
    verification.ts
    outcomes.ts
  state/
    reducer.ts
    persistence.ts
    WorkshopProvider.tsx
  components/
    TeamSwitcher.tsx
    ModeSwitcher.tsx
    TrialHeader.tsx
    CoinTrial.tsx
    SteedTrial.tsx
    VerificationPanel.tsx
    AttemptHistory.tsx
    OutcomePanel.tsx
    RepairPanel.tsx
    ConfirmDialog.tsx
  test/
    setup.ts
    fixtures.ts
tests/
  coins.test.ts
  steeds.test.ts
  verification.test.ts
  reducer.test.ts
  persistence.test.ts
  workshop.test.tsx
e2e/
  workshop.spec.ts
README.md
IMPLEMENTATION_PLAN.md
```

This is an ownership sketch, not a requirement to create every listed component immediately. Consolidate trivial presentational elements if splitting them adds no clarity. Keep puzzle rules, persistence, and React rendering genuinely separate.

### Package setup

- Inspect and preserve current package metadata and license.
- Deliberately migrate `type: commonjs` to the ESM setup expected by the selected Vite configuration, or use compatible explicit config extensions. Prefer the conventional Vite ESM arrangement; do not leave ambiguous mixed-module configuration.
- Replace the placeholder failing test command only when real tests exist.
- Remove or update obsolete `main: index.js` metadata as appropriate for a private static app; do not imply this is a published npm library.
- Consider `private: true` to prevent accidental npm publication.
- Scripts should include `dev`, `build`, `preview`, `test`, `test:watch`, and `typecheck`; add `test:e2e` if browser tests are implemented.
- `build` must typecheck as well as bundle. `test` must run once and terminate for CI.
- Add `.gitignore` for `node_modules/`, `dist/`, browser test artifacts, and local editor/generated files. Do not ignore source tests or the lockfile.

## 6. State model and invariants

### Types

Use discriminated unions so invalid cross-puzzle combinations are hard to represent. The following is illustrative; adjust exact names while keeping the invariants.

```ts
type TeamId = "experience" | "framework";
type Mode = "practice" | "official";
type PuzzleId = "coins" | "steeds";
type Phase = "playing" | "verification" | "solved" | "repaired";
type Resolution = "puzzle" | "repair";

interface WorkshopState {
  schemaVersion: 1;
  activeTeam: TeamId;
  activeMode: Mode;
  officialAcknowledged: boolean;
  sessions: Record<TeamId, Record<Mode, TrialSession>>;
}

interface SessionBase {
  caseId: string;
  teamId: TeamId;
  mode: Mode;
  phase: Phase;
  createdAt: string;
  history: AttemptEvent[];
  acceptedAnswerAt?: string;
  verification: VerificationState;
  resolvedAt?: string;
}

type TrialSession = CoinSession | SteedSession;
```

Include the hidden case and observation history in the correct session variant. Persistence validation must ensure Experience has only coin sessions and Framework only steed sessions.

### Invariants

1. State is isolated by both team and mode: four independent slots.
2. Each active case has one fixed hidden state. Rendering never regenerates it.
3. Switching team or mode never creates a new case or clears a session.
4. Invalid input does not consume a weighing or race.
5. Limits are enforced in domain/state logic, not only by disabled buttons.
6. Only a valid accepted puzzle answer opens follow-up verification.
7. Official puzzle success requires both follow-up questions to pass.
8. Repeated submission, refresh, and rerender cannot create duplicate rewards.
9. Solved and repaired are distinct terminal outcomes for a case.
10. Once an answer is accepted, freeze its puzzle history while verification proceeds.
11. Practice cannot resolve an official session or announce official reward delivery.
12. New-case and reset actions clear all state appropriate to their scope, including stale follow-ups and terminal results.

### State transitions

```text
playing
  ├─ invalid operation → playing, show error, no quota consumed
  ├─ valid weighing/race → playing, record observation
  ├─ wrong/unproven answer → playing, record attempt
  ├─ valid supported answer → verification
  └─ facilitator confirms repair [Official only] → repaired

verification
  ├─ incomplete/incorrect questions → verification, allow correction
  ├─ both questions correct → solved
  └─ facilitator confirms repair [Official only] → repaired

solved/repaired
  └─ confirmed new case or reset → playing with a new case
```

Used quotas do not themselves end the case. After the final allowed observation, users can still submit or revise their answer based on the existing evidence. A wrong answer does not grant an additional observation. Starting a new case requires an explicit action and clears evidence.

### Reducer actions

Use explicit actions such as:

- `SELECT_TEAM`, `SELECT_MODE`, `ACKNOWLEDGE_OFFICIAL`.
- `WEIGH_COINS`, `RACE_STEEDS`.
- `SUBMIT_COIN_ANSWER`, `SUBMIT_STEED_ANSWER`.
- `SUBMIT_VERIFICATION`.
- `CONFIRM_REPAIR`.
- `START_NEW_CASE`, `RESET_TEAM`, `RESET_WORKSHOP`.

Generate randomness, IDs, and timestamps outside the reducer and pass them in the action payload. Keep reducers replayable and pure. Do not trigger reward mutations from React effects observing a solved flag.

### Attempt records

Record useful local events: observations, answer attempts and their validation category, verification results, and terminal resolution. Include ISO timestamps and case IDs.

Do not collect names, emails, prompts, AI usage, clipboard contents, browser fingerprints, or unrelated activity. Bound ordinary submission/error events to a documented limit, for example 100 per case. Preserve the complete observation history because grading relies on all three weighings or seven races. There is no need to log invalid click activity indefinitely.

## 7. Coin trial — domain specification

### Player-facing rules

> Twelve crystal fragments, A through L, look identical. Eleven have exactly the same weight. One is either heavier or lighter. An ancient balance reports left heavier, right heavier, or balanced. Identify the odd fragment and its direction of difference using at most three weighings.

This version accepts one observed-case solution and understanding checks. Display this scope honestly; do not say it verifies a universal decision tree.

### Case model

```ts
type CoinId = "A" | "B" | "C" | "D" | "E" | "F"
  | "G" | "H" | "I" | "J" | "K" | "L";
type WeightDifference = "heavier" | "lighter";
type BalanceOutcome = "left-heavy" | "balanced" | "right-heavy";

interface CoinCase {
  oddCoin: CoinId;
  difference: WeightDifference;
}
```

Randomly choose a fragment and direction once per new case. Tests can construct any of the 24 cases directly.

### Weighing validation

- All IDs must be known.
- Each pan must contain at least one fragment.
- Pans must contain the same number of fragments.
- No duplicates within a pan or overlap between pans.
- At most six fragments per side; twelve total physical fragments exist.
- No operation after three completed weighings or after puzzle acceptance/resolution.

Requiring equal counts is a deliberate UI rule. It avoids making assumptions about the numerical size of an unknown weight difference. Explain it in the rules and error messages.

### Outcome computation

For an equal-count weighing, normal fragments cancel. Compute a signed contribution:

- Heavier odd fragment on the left: left heavier.
- Lighter odd fragment on the left: right heavier.
- Heavier odd fragment on the right: right heavier.
- Lighter odd fragment on the right: left heavier.
- Odd fragment on neither pan: balanced.

No arbitrary numeric mass needs to be exposed or stored. Return a typed outcome and append a numbered observation containing both pans.

### Submission and verification gate

Answer form requires one fragment and either heavier or lighter. Reject missing or unknown values without treating them as meaningful attempts.

- Require at least one actual weighing before answer submission.
- Check answer against the hidden case and the three-weighing quota.
- Correct result opens the follow-up questions.
- Incorrect result gives feedback such as “That identification does not match this case. Review the observations or start a new case.” Do not reveal the true fragment or direction.
- The minimum-observation rule is not an anti-guessing guarantee; describe it only as requiring interaction with the trial.

Do not silently add exhaustive coin-strategy validation or require the answer to be uniquely deducible from every observed coin case. That is outside the agreed first-version scope. If stronger coin proof is wanted, propose it explicitly before expanding the UI.

### Required follow-up questions

Use two fixed conceptual questions with stable option IDs and multi-select support. Their illustrative scenario must be labeled as a hypothetical, not necessarily the player's first weighing.

1. **“Before any weighing, how many possible corruption cases are there?”**
   - Options: 12, 18, 24, 36.
   - Correct: 24, because each of twelve fragments can be heavier or lighter.
2. **“Suppose A–D balances against E–H. Which fragments could still be corrupted?”**
   - Present A–L as selectable labels, plus a separate choice for “heavier only,” “lighter only,” or “either direction.”
   - Correct set: I, J, K, L; direction: either.

Require exact set equality; supersets and partial selections do not pass. Do not grade free-text explanations automatically. The facilitator may still ask the team to explain its reasoning aloud.

### Coin UI

- Two labeled pan-selection groups with disabled overlap choices.
- Text status as well as visual outcome; avoid color-only balance indicators.
- `Weigh fragments` action with `Weighings used: N / 3`.
- Chronological observation list, including fragment sets and result.
- Answer selects for fragment and weight direction.
- `Submit identification` action.
- Validation feedback adjacent to the relevant control and announced accessibly.
- On reaching three weighings, disable further observation but leave answer entry available.

## 8. Steed trial — domain specification

### Player-facing rules

> Twenty-five spectral steeds have fixed, distinct speeds. Up to five may race at once. A race reveals finishing order but no times. There are no ties, fatigue, or changes of speed. Find the fastest three in order using at most seven races, and show that the observed results establish your answer.

### Case model

- Stable steed IDs A through Y, twenty-five total.
- A hidden permutation ordered fastest to slowest.
- Generate with a Fisher–Yates shuffle; do not use `array.sort(() => Math.random() - 0.5)`.
- Store the generated order once per case.
- A rank lookup may be derived for sorting requested participants.
- Never display speed values, global rank, or inter-race time comparisons.

### Race validation

- Require two to five distinct, known steeds. A one-steed race provides no comparisons and is intentionally not supported; explain that operational rule in the UI.
- No duplicates.
- No eighth race.
- No races once the case is accepted or resolved.
- Repeated valid races are allowed and consume quota. They are inefficient, not illegal.
- Input selection order does not alter the outcome.

Sort selected participants by the hidden rank and record the complete finishing order. Do not consume quota for invalid selection.

### Proof graph

Build a directed acyclic graph from observed results:

- An edge `A → B` means A is proven faster than B.
- For each race, adjacent edges suffice: first → second → third, and so on. Transitivity supplies the remaining relations.
- Deduplicate repeated edges.
- Include all twenty-five steeds, even those never raced.
- The graph comes only from recorded race results, never directly from hidden global rankings.

### Determining whether the top three are proven

Use a partial topological-order check, without enumerating all `25!` possible rankings:

1. Build indegrees for all nodes in the evidence graph.
2. Find nodes with indegree zero among the remaining nodes.
3. There must be **exactly one** available node for the first position. It is the only steed that can be fastest in every ranking consistent with the evidence.
4. Remove that node and its outgoing edges.
5. Repeat the uniqueness requirement for second and third positions.
6. Compare the unique proven prefix with the submitted ordered top three.

If any of those three steps has multiple available nodes, the evidence does not establish a unique top three. If none are available while nodes remain, treat it as corrupted/inconsistent state, not a normal player failure.

This method accepts any strategy that proves the result within seven races. Do not force the canonical five-groups strategy or require particular race groupings in the validator.

As a defensive internal check, a proven prefix must match the hidden order's first three. A mismatch indicates an implementation or state-integrity error; do not expose a misleading player error in that case.

### Submission feedback

- Require three distinct known IDs.
- Require at least one completed race.
- If the prefix is not proven, respond with “Your observations do not yet establish a unique top three.” Optionally name two evidence-based candidates that remain interchangeable, without disclosing their true global order.
- If the prefix is proven but the submission differs, respond with “That ranking is not the order established by your race results.”
- Do not say a guessed answer matches hidden speeds before sufficient evidence exists; that would become an answer oracle.
- Once the supported answer is accepted, freeze race history and open the two follow-up questions.

### Required follow-up questions

Questions must not reject a valid alternative race strategy. Use one general rule and one **explicitly hypothetical** canonical-strategy scenario rather than assuming the player's history had five disjoint groups.

1. **“Three distinct steeds are already proven faster than steed X. Can X still be in the overall top three?”**
   - Correct: No.
   - Explain on passing: at least three places must be ahead of X.
2. Present this hypothetical:
   - Five groups each raced internally; members are labeled by finish as A1–A5 through E1–E5.
   - Group winners raced and finished A1, B1, C1, D1, E1.
   - A1 is already established as fastest overall.
   - **“Select every remaining candidate for second or third overall.”**
   - Correct exact set: A2, A3, B1, B2, C1.

Use visible group/order notation and a small table so the question does not depend on unexplained names. Make clear that these aliases are not necessarily the current case's A–Y IDs.

### Steed UI

- Checkbox grid for A–Y with selection count.
- `Race selected steeds` action and `Races used: N / 7`.
- Ordered result list for each race, preserving all previous races.
- Three distinct selects for first, second, and third.
- `Submit top three` action.
- Proof-related feedback without revealing unobserved speeds.
- At seven races, disable racing but leave answer submission available.

### Known winning strategy for test fixtures and facilitator documentation

Keep this out of the normal player view:

1. Race five disjoint groups of five: five races.
2. Race their winners: sixth race.
3. Rename groups by the winners' finish order, A through E.
4. A1 is fastest overall.
5. Race A2, A3, B1, B2, and C1: seventh race.
6. The first two in that final race are second and third overall.

Test this strategy across many generated permutations. The graph checker must certify it, not merely compare its answer to the hidden order.

## 9. Follow-up verification behavior

- Two questions per puzzle, shown only after accepting the primary answer.
- Grade stable answer IDs and exact selected sets, not display text or array order.
- Do not accept missing answers.
- Keep entered answers visible when a question is incorrect.
- Allow unlimited corrections within the same verification phase.
- Provide a short useful hint or explanation without accusing the team of guessing.
- Do not add a timer, score penalty, permanent lockout, or negative reward.
- Mark solved only when both are correct in a validated submission.
- Persist verification progress so refresh does not reset an accepted answer or completed question.
- Do not award official effects in Practice mode, even after verification succeeds.

Static questions will be inspectable and may become familiar. Their purpose is lightweight understanding, not assessment security. Random question banks, AI grading, and dynamically generated riddles are not required.

## 10. Cooperative repair flow

Only show the repair action in Official mode, clearly labeled **Presenter action**. This is a social convention, not authenticated access control.

### Entry

`Resolve through cooperative repair` opens a panel explaining:

- Use this when time ends or a trial remains incomplete.
- The other squad leads the repair; the affected squad may help.
- Repair grants Rehor intervention but not the puzzle's cross-team buff.
- Existing case progress will be retained for the local history but the case will resolve as repaired.

### Three questions

1. “Name one component the other squad protects.”
2. “Name one dependency or handoff between your squads.”
3. “If that handoff breaks, what should your squads do first?”

The facilitator accepts reasonable spoken answers. No free-text collection, automated grading, or specialist knowledge test is needed. Provide three confirmation checkboxes and a final `Confirm repair` button.

### Resolution

- Resolve only the selected team's Official core.
- If both cores need repair, squads can answer together; facilitator confirms each core separately. The interface must make clear which core is being restored and prevent duplicate rewards.
- Solved or repaired cores cannot be repaired again.
- Allow repair from either playing or incomplete verification, but require explicit confirmation.
- Show `Restored through cooperation` distinctly from `Puzzle verified`.
- No automatic timer or background transition.

### Reward derivation

Compute outcome text from terminal state and team identity:

```text
Official + solved:
  selected team → 1 Rehor intervention
  other team → Alliance Surge, 2 shared rerolls

Official + repaired:
  selected team → 1 Rehor intervention
  other team → no additional buff

Practice + solved:
  practice success only
```

Do not maintain separate mutable reward counters. Refreshing, revisiting the result, or resubmitting must not stack rewards. Resetting an official result starts a new local record, not a command to grant another reward in an ongoing battle; warn the presenter accordingly.

## 11. UX, accessibility, and presentation

### Visual direction

- Dark fantasy-console styling with readable panels and restrained accent colors.
- Clear identity for Memory and Judgment without relying on color alone.
- Large enough labels and result text for screen sharing.
- System fonts; no font downloads or image assets are necessary.
- Use short narrative blocks above controls, with expandable full rules if needed.
- Avoid dense lore, cinematic delays, modal success animations, and flashing effects.

### Header and navigation

- Page title: `Rehor's Restoration Console`.
- Two obvious team buttons or accessible radio controls.
- Practice/Official switch with persistent visible mode label.
- Active squad, puzzle title, core, and status near the top.
- Small status summary for the other squad's Official core so the presenter can see both outcomes without leaving the active trial.
- Switching teams must not scroll unpredictably or lose input state.

### Form behavior

- Use semantic labels, fieldsets, legends, buttons, and ordered lists.
- All controls operable by keyboard.
- Errors explain how to fix input and do not discard selections unnecessarily.
- Announce weighing results, race results, and submission status with an appropriate live region.
- Keep focus stable after ordinary actions; move it to the verification heading or result heading on a major phase transition.
- When an action is unavailable, explain why next to the disabled control.
- Reset confirmation must have a clear cancel path and return focus to the triggering control.
- Avoid drag-and-drop as the only way to choose fragments or order steeds.
- Respect reduced-motion preferences if any transitions are added.

### Responsive behavior

- Primary target: laptop browser during screen sharing.
- Also usable on participant phones and smaller windows.
- Pan controls stack vertically on narrow screens.
- Steed checkbox grid wraps without horizontal page scrolling.
- Race history uses wrapping lists or responsive rows instead of a wide fixed table.
- Test at browser zoom of 200% and a narrow viewport.

## 12. Persistence and recovery

### Storage

- Use one namespaced localStorage key, for example `dnd-answers.workshop`.
- Include a schema version inside stored data.
- Persist domain state and necessary current selections/answers; avoid persisting transient alerts or open confirmation dialogs.
- Storage remains local to the origin. GitHub project sites can share an origin, so namespace the key rather than using generic names such as `state`.
- Development and deployed origins have separate storage; do not imply local rehearsal progress will appear on Pages.

### Validation on load

Treat localStorage data as untrusted and potentially malformed:

- Catch JSON parsing errors.
- Validate schema version, team/mode values, puzzle discriminants, IDs, quotas, hidden cases, history consistency, and phase-dependent data.
- Verify a steed hidden ranking is a complete unique permutation of A–Y.
- Verify coin cases use a known fragment and a valid direction.
- Recompute or validate recorded observations against their case rather than blindly trusting impossible histories.
- Do not restore a solved outcome from an obviously invalid session.
- Keep validation as a focused typed parser; a schema-library dependency is optional only if it materially reduces complexity.

For an unknown schema or malformed record, show a recoverable notice and offer to reset saved progress. Do not silently show success or overwrite the stored record before the user chooses how to recover.

### Storage failures

- Catch unavailable storage and quota errors.
- Continue working in memory.
- Display a nonblocking warning: “Progress cannot be saved in this browser. Keep this tab open.”
- Never crash the puzzle because persistence failed.

### Resets

- **New case:** Active team and active mode only; changes hidden case and clears that case's observations, answers, verification, and outcome.
- **Reset team:** Both modes for the selected team; clearly state that Official progress will be lost.
- **Reset workshop:** Both teams, both modes, and the local workshop record; confirmation must list scope.
- Cancel leaves all state untouched.

Multiple tabs are not supported as a synchronized session. Document that one presenter tab should be used; do not add cross-tab synchronization for the first release.

## 13. Testing plan

### Coin engine tests

- Enumerate all 24 hidden cases.
- For every case, verify left/right/not-present results in equal-count placements.
- Balanced outcomes when the odd fragment is not weighed.
- Direction reversal when the odd fragment changes pan or is lighter instead of heavier.
- Unknown IDs, duplicates, overlapping pans, unequal counts, empty pans, and too many fragments are rejected.
- Invalid operations do not consume quota or change evidence.
- Third weighing allowed; fourth rejected.
- Correct and incorrect identification for every hidden case.
- No weighings after answer acceptance or terminal outcome.
- No numeric-mass assumptions or random generation during outcome computation.

### Steed engine tests

- Generated rankings contain each of the 25 IDs exactly once.
- Results match hidden relative order for selected participants.
- Input order does not influence race results.
- Invalid IDs, duplicates, one participant, and more than five participants are rejected without consuming quota.
- Repeated valid races consume quota and do not duplicate graph edges.
- Seventh race allowed; eighth rejected.
- Graph contains all steeds, including unraced ones.
- Transitive comparisons contribute to proof.
- Empty/incomplete evidence cannot prove top three.
- Correct hidden answer without sufficient evidence is rejected.
- Proven fastest but ambiguous second or third remains unverified.
- A proven prefix with multiple unrelated lower-ranked nodes can still pass: the entire ranking does not need to be known.
- Wrong order of three correctly identified steeds is rejected.
- Cyclic/corrupted graph handled as a state error.
- Canonical seven-race strategy passes across a substantial deterministic set of permutations, such as 100 or more fixed seeds/fixtures.
- Independent small-graph oracle test: for a reduced number of nodes, enumerate compatible permutations and compare the proof function's unique-prefix result. This checks the graph algorithm separately from the canonical puzzle strategy.
- Do not claim to exhaustively test all `25!` rankings.

### Verification tests

- Correct stable IDs pass; missing/incorrect IDs fail.
- Multi-select answers require exact sets, regardless of selection order.
- Partial correct answers and supersets fail.
- Two correct answers required; one is insufficient.
- Incorrect verification can be revised without losing accepted puzzle state.
- Hypothetical steed scenario is independent of the user's chosen race strategy.
- No grading path depends on AI calls or free-text matching.

### State and persistence tests

- Team switching preserves each active case and selections.
- Practice/Official switching preserves four independent sessions.
- Practice success cannot mutate Official status.
- Case generation occurs only on initialization or explicit reset/new-case actions.
- Accepted answer freezes evidence while follow-up questions remain editable.
- Solved/repaired transitions are terminal and idempotent.
- Repair grants no cross-team buff and cannot duplicate puzzle rewards.
- New case, team reset, and workshop reset clear only their declared scope.
- Cancelled confirmation does nothing.
- Refresh restores valid playing, verification, solved, and repaired sessions.
- Corrupt JSON, unknown schema, invalid hidden cases, impossible histories, and denied storage fail gracefully.
- History limits do not remove evidence needed to grade a case.

### UI tests

- Keyboard-accessible team/mode controls and form labels.
- Clear active team and mode in every phase.
- Invalid actions show actionable feedback and retain quota.
- Correct primary answer opens verification.
- Follow-up failure stays correctable.
- Correct verification shows team-specific result and reward recipients.
- Practice result does not claim official effects.
- Repair panel requires all confirmations and shows the selected team.
- Quota exhaustion disables only new observations, not answer entry.
- Reset dialog states scope and restores focus after cancel.
- Storage warning does not prevent solving.

### End-to-end/manual rehearsal

1. Open Practice, complete one trial, and confirm Official is untouched.
2. Open Official and acknowledge its local-presenter behavior.
3. Make several observations in one trial, switch teams, make observations there, then return.
4. Refresh and verify exact histories and remaining quotas.
5. Complete an official steed case with the canonical strategy; verify proof and questions.
6. For coins, use a deterministic test fixture or test-only seeded entry point in automation, not a shipped solution-reveal button.
7. Test wrong answers, unsupported answers, follow-up corrections, and a repaired core.
8. Confirm success panels survive refresh without claiming another reward.
9. Test resets and cancellation.
10. Test narrow viewport, keyboard navigation, 200% zoom, readable screen sharing, and no unexpected horizontal scroll.
11. Inspect network requests: no telemetry, AI endpoints, third-party fonts, or participant-data uploads.
12. Serve the production build under `/dnd-answers/` and directly refresh that URL to verify asset paths.

## 14. GitHub Pages and CI

### Build configuration

- Expected default deployment URL: `https://karelhala.github.io/dnd-answers/`, unless repository Pages settings or a custom domain differ.
- Set Vite base to `/dnd-answers/` for that project-site path. Do not assume root-relative `/assets/...` URLs will work.
- No router means no SPA deep-link fallback is necessary.
- Use imported assets or Vite-aware base paths, not local filesystem paths.
- Production output is `dist/`.
- No environment secrets or API keys are required.

### CI workflow

For pull requests and the repository's actual default branch:

1. Checkout.
2. Set up the documented Node LTS version with npm cache.
3. `npm ci`.
4. Typecheck.
5. Run non-watch tests.
6. Build production files.
7. Run the narrow browser suite if implemented, installing only the required browser.

Verify the actual branch name rather than assuming `main`. Avoid duplicating expensive test runs unnecessarily if `build` already includes typechecking.

### Pages deployment workflow

- Use the current supported official GitHub Pages artifact/deployment actions, with versions checked at implementation time.
- Upload the built `dist/` artifact.
- Deploy through the `github-pages` environment.
- Use minimal permissions: source read plus the Pages and OIDC permissions required by the deployment job.
- Configure deployment concurrency so simultaneous runs do not race.
- Never deploy from a pull request or expose elevated tokens to participant-controlled code.
- Start with a **manual `workflow_dispatch` deployment trigger**. Automatic deployment on default-branch pushes can be enabled later with explicit user agreement.

Creating a workflow is not approval to push or enable Pages. Ask before state-changing GitHub operations, and verify whether Actions-based Pages is already configured before changing repository settings.

### Release check

After an approved deployment:

- Open the actual Pages URL.
- Verify assets load under the repository prefix.
- Exercise team and mode switches and refresh persistence.
- Confirm no secrets or private workshop/personnel material were bundled.
- Verify no build error screen, missing CSS, or unintended default solution state.

## 15. Documentation to deliver

Expand `README.md` during implementation with:

- What the app does and its two modes.
- Node/npm requirements and local commands.
- Puzzle rules and exact scope of verification.
- Facilitator workflow: practice versus official, entering actions, follow-ups, rewards, repair, and resets.
- Local-only persistence and lack of cross-device synchronization.
- Public client-side limitations and explicit absence of AI detection.
- GitHub Pages build/base-path setup and manual deployment steps.
- Test commands and where puzzle algorithms live.
- Reminder that reward usage and combat stay outside the app.

Keep the steed solution and any coin solution examples in a clearly labeled facilitator/developer section, not next to player instructions. The repository is still inspectable; documentation placement is not a security boundary.

No need to duplicate the full workshop narrative or employee character plans in this repository.

## 16. Implementation sequence and gates

### Phase 0 — Recheck the starting point

- Read current repository instructions and status.
- Preserve user changes and inspect current `package.json` before scaffolding.
- Confirm default branch and Pages setup only through read-only inspection.
- Keep implementation confined to this repository.

**Exit:** Existing files understood; no user work overwritten.

### Phase 1 — Runnable skeleton

- Configure React, TypeScript, Vite, npm scripts, lockfile, and ignore rules.
- Render the page shell with team and mode selection.
- Establish test setup and a passing smoke test.

**Exit:** Local dev server, typecheck, one-shot tests, and production build all work.

### Phase 2 — Pure puzzle engines

- Implement typed cases, randomization helper, operation validation, and outcomes.
- Implement steed proof graph and unique-prefix grading.
- Implement fixed follow-up content and exact-set grading.
- Add exhaustive coin-case tests and steed strategy/oracle tests.

**Exit:** Rule correctness proven independently of the UI.

### Phase 3 — One complete vertical slice

- Build Experience's interactive balance, history, answer submission, questions, and outcome.
- Add scoped reducer state and persistence for the full session model.
- Validate Practice versus Official separation and reload behavior.

**Exit:** One puzzle can be completed end to end without a backend.

### Phase 4 — Second trial and presenter workflow

- Build steed selection, races, proof-based answer feedback, and follow-ups.
- Wire four independent sessions and team switching.
- Add official acknowledgment, result summaries, and reward text.
- Add repair and reset confirmations.

**Exit:** Both squads' official and practice flows work without mixed state or duplicate rewards.

### Phase 5 — Resilience and usability

- Handle malformed storage, storage denial, quota exhaustion, and unexpected state.
- Polish accessibility, focus behavior, readable layout, and responsive controls.
- Run UI and browser tests; rehearse one solved and one repaired core.

**Exit:** Presenter can run the intended workshop flow confidently.

### Phase 6 — Delivery readiness

- Add CI and manual Pages workflow.
- Complete README.
- Verify base-path production serving.
- Report exact test/build commands and results.
- Ask for approval before push, publication, or repository-setting changes.

**Exit:** App is ready for approved publication; no unrelated features added.

## 17. Acceptance checklist

### Experience

- [ ] Twelve fragments and three-weighing rules are visible and accurate.
- [ ] All 24 cases simulate correctly.
- [ ] Invalid placements do not consume a weighing.
- [ ] Correct identification opens two follow-up questions.
- [ ] Both questions must pass before puzzle restoration.
- [ ] UI does not claim universal strategy proof or AI detection.

### Framework

- [ ] Twenty-five distinct steeds, fixed speeds, and seven-race rules are accurate.
- [ ] Valid races contain two to five steeds and reveal order only.
- [ ] Correct-but-unproven rankings do not pass.
- [ ] Any evidence-sufficient strategy is accepted, not only the canonical one.
- [ ] Follow-ups do not assume the player's actual strategy used canonical groups.
- [ ] Known seven-race strategy passes engine and browser tests.

### Workshop operation

- [ ] Team switch preserves separate progress.
- [ ] Practice and Official are isolated for each team.
- [ ] Participants' browsers cannot modify the presenter's local record through the app.
- [ ] Official result identifies both reward recipients correctly.
- [ ] Repair is available without redoing the original riddle.
- [ ] Repair grants no original puzzle buff.
- [ ] Terminal outcomes do not stack rewards on refresh or repeat clicks.
- [ ] New-case and reset controls explain their scope and require confirmation where destructive.
- [ ] Story keeps Rehor and Fullsend distinct and does not reveal the epilogue.

### Delivery

- [ ] No backend, credentials, remote grading, telemetry, or arbitrary-code execution.
- [ ] Valid saved state restores; bad/unavailable storage fails gracefully.
- [ ] Typechecking, unit tests, UI tests, and production build pass.
- [ ] Critical browser flows have been exercised.
- [ ] App works under the GitHub project-site base path.
- [ ] README accurately explains limitations and operation.
- [ ] No private personnel material or local absolute source links ship to the browser.
- [ ] No push, publication, or settings changes without approval.

## 18. Risks and deliberate compromises

| Risk | Mitigation / accepted boundary |
|---|---|
| AI supplies classic puzzle strategies quickly | AI is allowed; verify outcomes and understanding, grant early success without inventing extra work. |
| Coin answer is a lucky hit | Check one case plus conceptual questions; explicitly do not claim exhaustive strategy proof. Stronger verification is follow-up scope. |
| Correct steed ranking is guessed | Require unique top-three proof from observed races before acceptance. |
| Browser source exposes hidden state and answer keys | State public-client limitation; facilitator supervises official session. No false anti-cheat claims. |
| Race follow-up assumes one specific strategy | Use a clearly hypothetical canonical scenario, separate from current race history. |
| Wrong feedback leaks hidden answers | Show only evidence-based ambiguity or generic mismatch, never unobserved rankings or the true coin. |
| Presenter switches team/mode accidentally | Persistent labels, independent sessions, and clear confirmations. |
| Refresh loses workshop progress | Validated local persistence; warning and in-memory fallback if storage is unavailable. |
| Reset is mistaken for another reward | Explain it replaces the local record, not an additional grant; rewards are derived, not incremented. |
| Both puzzles remain unsolved | Facilitator-led cooperative repair restores both cores without penalties or exclusion. |
| Fullsend narrative sounds like a real security allegation | Keep it explicitly fictional and omit the ending from player UI. |
| Deployment assets break on Pages | Configure and test `/dnd-answers/` base path before publication. |

## 19. Stop condition

Stop implementation once the acceptance checklist is satisfied and focused verification passes. Deliver the working local app, tests, deployment files, and documentation. Do not expand into accounts, synchronized sessions, a competition platform, submitted-code execution, additional puzzles, or AI detection without a new request.
