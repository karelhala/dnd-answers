# Lore improvement — Rehor's restoration interface

## 1. Goal

Make the application explain **what the squads are doing, why their puzzles matter, and what happens next** through a small narrative dashboard and state-aware dialogue.

The application should feel like a restoration instrument within the workshop story, not merely a pair of puzzle forms. Keep the actual rules, controls, validation, and rewards clear and unchanged.

This document outlines future work. It does not implement the improvement or authorize publishing changes.

## 2. Current application and integration points

The current checkout contains both `CoinTrial` and `SteedTrial`, plus verification, outcome, official summary, repair, and reset components. The earlier placeholder for the steed interface has been replaced.

Relevant existing files:

| File | Current responsibility | Proposed improvement |
|---|---|---|
| `src/App.tsx` | Team/mode controls and active trial composition | Place mission context and restoration indicators around existing controls. |
| `src/components/OfficialSummary.tsx` | Both Official core statuses | Reuse its status presentation rather than adding a competing summary. |
| `src/components/CoinTrial.tsx` | Balance simulator and identification | Add Memory briefing and contextual restoration voice. |
| `src/components/SteedTrial.tsx` | Race simulator and ranking | Add Judgment briefing and contextual restoration voice. |
| `src/components/VerificationPanel.tsx` | Understanding questions | Frame verification as the final reconnection check. |
| `src/components/OutcomePanel.tsx` | Saved result and reward display | Add a short restoration transmission without duplicating rewards. |
| `src/components/RepairPanel.tsx` | Presenter-confirmed cooperative repair | Reinforce that the alliance restores what the trial left damaged. |
| `src/domain/outcomes.ts` | Existing outcome and reward rules | Preserve mechanics and use its results as the source of reward truth. |
| `src/styles.css` | App styling | Add a compact diagram, phase trail, and readable dialogue treatment. |

Several of these files currently contain uncommitted work. Re-read them and the working-tree status before implementation. Preserve existing edits; do not replace these components from an older snapshot.

## 3. Narrative boundaries

- **Rehor** is the squads' known AI companion. His Memory and Judgment cores need restoration.
- **Fullsend** is a separate intelligence contained within the shard carried to the Rift.
- The shard is necessary to seal the Rift, but Fullsend's intentions remain unknown.
- Experience restores Memory through the crystal-fragment trial.
- Framework restores Judgment through the spectral-steed trial.
- Solving a trial restores its core and sends support to the other squad.
- Cooperative repair is a legitimate alternate restoration route, not a lesser participant outcome.
- Completing both trials means Rehor is ready for the shared final battle. It does not mean the battle has already been won.

Do not show the cracked-shard ending or Fullsend's final message in the app. Do not declare Fullsend friendly, hostile, escaped, or defeated. The facilitator delivers the epilogue after the battle.

No real AI integration, hidden software activity, or security allegation is implied by this fiction.

## 4. Main addition: shard and Rehor overview

Add a compact, accessible diagram above the active trial:

```text
                    FULLSEND SHARD
                   Signal unidentified
                            |
                          REHOR
                    Restoration pending
                      /           \
                MEMORY CORE    JUDGMENT CORE
                Experience      Framework
                Gathering       Dormant
                evidence
```

### Behavior

- Show the shard, Rehor, and both cores as a single connected system.
- Highlight the active squad's core without hiding the other core's state.
- Show textual status labels, not color alone.
- Use HTML/CSS or a small inline SVG. No artwork service, canvas library, or external assets are necessary.
- The shard's label remains `Signal unidentified`; it does not become a progress meter or reveal a hidden alignment.
- Rehor's central status follows the two displayed core states: restoration pending, one core restored, or both cores operational.
- No damage percentage, confidence score, invented power level, or countdown.

### Relationship with the existing Official summary

Avoid two large panels that tell different versions of the same story. Evolve `OfficialSummary` into, or compose it with, the new overview.

Use one explicit mode policy:

- **Official mode:** Diagram uses both Official sessions. Title: `Official restoration status`.
- **Practice mode:** Diagram uses both Practice sessions. Title: `Training projection`. Show `Practice simulation — Official cores unchanged.`
- In Practice, retain a compact, clearly labeled Official status line using the existing Official summary data. Do not mix an Official core and a Practice core within the same diagram.
- Never display the unqualified `Rehor operational` announcement based only on Practice success. Practice equivalents must say `Training projection operational`.

Switching modes changes the displayed projection, not stored progress. Switching teams changes emphasis, not which mode supplies the two core statuses.

## 5. Mission briefings

Add short, collapsible `Mission briefing` content. Keep it separate from operational rules so players can distinguish fictional motivation from actual constraints.

### Experience — Memory

> Rehor's memories have shattered into twelve crystal fragments. One carries a corruption that distorts its weight. The ancient balance can expose it—but its power permits only three readings.
>
> Identify the corrupted fragment so Rehor can distinguish memory from interference.

Follow with the existing balance rules. This text introduces no additional requirement to decode messages or reconstruct a universal strategy.

### Framework — Judgment

> Rehor must choose three spectral steeds to carry the Rift's stabilizing seals. Their true speeds are unknown, and the arena records order—not time.
>
> Establish the fastest three before the arena's seven remaining races are spent.

Follow with existing race rules. The narrative does not change speed consistency, race limits, evidence requirements, or follow-up questions.

### Shared mission line

Near the overview, use one short explanation:

> The shard can seal the Rift. Restore Rehor so both squads can carry it through the final battle together.

Do not add a mandatory opening modal, long cinematic sequence, or additional click before players can use the puzzle.

## 6. Restoration trail: show the current task

Add a four-step indicator above the active puzzle:

**Gather evidence → Submit finding → Verify reasoning → Restore core**

Use existing phase and observation data to derive the active step. Do not create new game phases.

| Existing session state | Current step | Suggested supporting text |
|---|---|---|
| Playing, no observations | Gather evidence | `Core dormant. Awaiting your first observation.` |
| Playing, observations below limit | Gather evidence | `Evidence recorded. Review what your observations establish.` |
| Playing, observation limit reached | Submit finding | `Instrument exhausted. Review your evidence and submit a finding.` |
| Verification | Verify reasoning | `Finding accepted. Complete the reasoning check before reconnection.` |
| Solved | Restore core — complete | `Core restored through the trial.` |
| Repaired | Restore core — complete | `Core restored through the alliance.` |

### Important interpretation

- While observations remain available, finding submission can still be available. The trail is guidance, not an additional gate or instruction to spend every attempt.
- Include a short cue once at least one observation exists: `You may submit a finding whenever ready; using every observation is not required.`
- Reaching the observation limit does not imply sufficient evidence. It means the instrument cannot produce another reading or race in this case.
- A correct primary answer moves to verification, not directly to restored.
- A repaired core bypasses unfinished trial steps. Display them as `Bypassed through cooperative repair`, not as falsely completed puzzle evidence or verification.
- Invalid input and wrong answers do not move the trail backward or reset it.

## 7. Rehor's contextual voice

Add one short dialogue block near the restoration trail. It should reflect meaningful state, not generate a new sentence on every click.

| Situation | Suggested line |
|---|---|
| No observations | `Help me separate what I know from what I merely suspect.` |
| Observation recorded | `Recorded. What does this rule out?` |
| Invalid selection | `The instrument cannot accept that arrangement. Check its constraints.` |
| Incorrect primary answer | `That finding does not match this case. Reconsider the evidence.` |
| Insufficient steed evidence | `A possibility is not yet a conclusion. Which alternatives have you ruled out?` |
| Observation quota reached | `No readings remain. Work with what we have observed.` |
| Verification | `The finding is accepted. Show me you understand the method.` |
| Verification incomplete | `The connection is not stable yet. Review the reasoning check.` |
| Official solved | `Core restored. I am with you.` |
| Official repaired | `You restored what I could not repair alone.` |
| Practice complete | `Training sequence complete. The Official restoration remains unchanged.` |

### Rules for choosing dialogue

- Terminal result takes precedence over older failures.
- Verification-phase dialogue takes precedence over earlier observations; verification feedback can use its own incomplete line.
- During playing, the latest relevant result can supply feedback, with the quota message as the normal fallback once the instrument is exhausted.
- Editing form selections must not generate dialogue, rewrite history, or imply a new observation happened.
- Dialogue must use only public session facts: phase, observed count, mode, and typed event categories.
- Never select lines using the hidden corrupted fragment, hidden steed ranking, proximity to the correct answer, or whether selected candidates happen to be correct.
- Do not reproduce an old failure as a fresh event after refresh. Render the current status rather than appending another event.
- Keep exact existing validation messages next to controls. Narrative supplements factual feedback; it never replaces it.

No AI service, typing animation, fake processing delay, audio, or claim of live intelligence is needed. These are authored lines selected deterministically.

## 8. Restoration and repair scenes

### Official trial success

Add a short transmission above the existing result and reward list. Example for Memory:

> **MEMORY CORE ONLINE**
>
> Rehor's outline steadies. A thread of light leaves the shard and crosses toward the other gate.
>
> “Tell the defenders: they are not holding alone.”

Judgment equivalent:

> **JUDGMENT CORE ONLINE**
>
> Rehor raises his head. The paths before him resolve into a clear direction.
>
> “I can see the way forward. We take it together.”

Render the existing `getOutcome` reward list unchanged. Narrative text must not grant additional rerolls, interventions, authority, or permanent modifiers.

### Official cooperative repair

> The two squads reconnect the broken pathways. Rehor's outline holds.
>
> “Not every answer comes from a trial. Some come from knowing whom to call.”

Keep `Restored through cooperation` visible. Show the existing repair outcome: the selected squad receives one Rehor intervention; the other receives no original puzzle buff.

### Practice success

> The training projection steadies. The restoration sequence is understood.
>
> “Rehearsal complete. The mission awaits.”

Continue to display `Practice only. No official rewards are granted.` Do not use the Official transmission or an unqualified core-unlock announcement.

### Both Official cores restored

When both Official sessions are solved or repaired:

> **REHOR OPERATIONAL**
>
> “Both cores responding. Bring the shard to the Rift. We finish this together.”

- Accept any combination of solved and repaired cores.
- This is a persistent readiness banner, not a one-time modal or additional reward event.
- Show only in Official mode. Practice can show a clearly labeled projection equivalent.
- Do not announce mission completion, seal the Rift, crack the shard, or play the epilogue.
- Resetting a relevant Official core removes the readiness banner naturally through derived state.

## 9. Technical implementation outline

### Content

Create `src/content/narrative.ts` for shared mission text, per-team briefings, contextual lines, and transmission copy. Use stable keys rather than branching on rendered text.

Keep `src/content/teams.ts` as the source of team names, trials, and core identities. Do not duplicate those mappings inconsistently in the narrative layer.

### View-model derivation

Add a small pure helper, for example `src/domain/restoration.ts`, to derive:

- Displayed mode and whether it is a simulation.
- Each core's presentation status.
- Active trail step and any bypassed steps.
- Rehor's dialogue key.
- Whether both displayed cores are restored.
- Whether an Official readiness announcement is appropriate.

Use discriminated session types and existing quota constants; do not hardcode three and seven in multiple components. Keep derivation read-only and independent of hidden case contents.

### Components

- `RestorationOverview`: shard/Rehor/core diagram and mode-aware status. Reuse or adapt `OfficialSummary` instead of retaining duplicate full-size summaries.
- `RestorationTrail`: accessible step list and current-task explanation.
- A small `RehorTransmission` component only if shared rendering warrants it; otherwise render the dialogue within the trail and existing outcome panel.

Keep mission briefings as simple `details` sections or compact content blocks. Avoid building a generic dialogue engine, quest system, CMS, or new state machine.

### State and persistence

- No new reducer actions or puzzle phases.
- No persistence migration or schema-version bump.
- No stored percentage, dialogue history, cutscene acknowledgment, or mutable reward counters.
- No automatic dispatch when both cores are restored.
- Existing phase-transition focus behavior remains intact.
- Existing saved sessions, reset behavior, and quota handling remain compatible.

### Styling and accessibility

- Keep the overview compact enough that the puzzle controls remain easy to reach on a shared laptop screen.
- Use an ordered list for the trail; mark the current step with `aria-current="step"` where appropriate.
- Ensure the diagram has equivalent text. Decorative connectors can be hidden from assistive technology.
- Preserve keyboard navigation and visible focus.
- Avoid color-only distinctions for active, damaged, restored, and repaired states.
- Do not announce the entire dashboard repeatedly through a large live region. Prefer one concise status announcement and preserve existing result announcements.
- Do not steal focus on every observation or team switch.
- Stack cores and trail steps on narrow screens.
- No motion is required. If subtle effects are added, respect `prefers-reduced-motion` and avoid continuous pulsing.

## 10. Test plan

### Pure presentation derivation

- Both teams: no observations, some observations, quota reached, verification, solved, and repaired.
- Correct and incorrect latest-event categories without altering actual puzzle state.
- Hidden case changes with identical public evidence do not change narrative output.
- A solved or repaired core is not presented as damaged because an old error remains in history.
- A repaired core does not claim puzzle steps were completed.
- Both-core readiness accepts solved/solved, solved/repaired, and repaired/repaired.
- One unresolved Official core prevents the Official readiness banner.

### UI integration

- Switching teams changes emphasis and trial briefing without resetting evidence.
- Switching modes shows the correct pair of core states and a visible Practice/Official distinction.
- Two Practice successes do not restore Official cores or show the Official readiness line.
- Practice outcome text never announces actual battle rewards.
- Both Official cores restored shows readiness, not mission completion.
- Reset/new-case actions remove stale narrative success naturally.
- Existing validation messages, counters, accepted-answer behavior, and reward lists remain correct.
- Reloaded saved state displays the correct narrative immediately without generating new history events.
- Repair confirmations and existing focus transitions continue to work.

### Presentation checks

- Keyboard-only operation remains usable.
- At 200% zoom and narrow viewport, no diagram or trail forces page-wide horizontal scrolling.
- Screen reader receives understandable status without duplicate announcements.
- No new network calls, private data, solution hints, or epilogue text are introduced.

Run existing domain, persistence, presenter, and trial tests in addition to the new presentation tests. This is a presentation improvement; it should not weaken puzzle validation to make the story easier to display.

## 11. Delivery sequence

1. Re-read the latest source and preserve current user changes.
2. Add authored narrative content and the pure presentation helper with tests.
3. Evolve the summary into the shard/Rehor overview with explicit mode behavior.
4. Add the restoration trail and one contextual dialogue block.
5. Add mission briefings and short outcome/repair transmissions.
6. Verify both-team, both-mode, solved, repaired, reset, and refresh flows.
7. Run focused tests, existing tests, typechecking, and production build.
8. Report the improvement and any limitations. Do not push or deploy without approval.

## 12. Acceptance criteria and stop condition

- [ ] Players can identify the shard, Rehor, the two cores, and their own contribution.
- [ ] The active task and next step are understandable without a facilitator explanation.
- [ ] Lore follows actual session state and never reads hidden answers to generate hints.
- [ ] Practice is always framed as a projection and cannot appear to restore Official cores.
- [ ] Solved and repaired outcomes remain mechanically and narratively distinct.
- [ ] Both Official cores restored means ready for the final battle, not mission complete.
- [ ] Existing puzzle controls, validation, rewards, storage, and repair behavior remain unchanged.
- [ ] No new persistence schema, backend, AI call, telemetry, or external assets are needed.
- [ ] The Fullsend ending and allegiance remain unrevealed.
- [ ] Existing and new tests pass, and the production build succeeds.

Stop when the overview, trail, contextual voice, briefings, and short result scenes satisfy these checks. Additional quests, animations, timers, interactive combat, bot integration, and a full story player are outside this improvement.
