import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { STEED_IDS } from '../src/domain/steeds';
import type { CoinId } from '../src/domain/coins';
import type { SteedId } from '../src/domain/steeds';
import { createWorkshop } from '../src/state/createWorkshop';
import type { WorkshopState } from '../src/state/types';

const storageKey = 'dnd-answers.workshop';

function fixtureWorkshop(): WorkshopState {
  let id = 0;
  return createWorkshop({
    random: () => 0,
    id: () => `browser-case-${++id}`,
    now: () => new Date(Date.now() - 60_000).toISOString(),
  });
}

async function openWorkshop(page: Page, state = fixtureWorkshop()) {
  // Seed normal storage before bootstrap, never a shipped answer-reveal/test API.
  // The guard preserves subsequent refreshes and app-created replacement cases.
  await page.addInitScript(({ storageKey, state }) => {
    if (localStorage.getItem(storageKey) === null) localStorage.setItem(storageKey, JSON.stringify(state));
  }, { storageKey, state });
  await page.goto('./');
  await expect(page.getByRole('heading', { name: "Rehor's Restoration Console" })).toBeVisible();
  return state;
}

async function savedState(page: Page): Promise<WorkshopState> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), storageKey);
}

async function enterOfficial(page: Page) {
  // Clicking requests acknowledgment; .check() incorrectly expects immediate selection.
  await page.getByRole('radio', { name: 'Official', exact: true }).click();
  await page.getByRole('button', { name: 'Acknowledge and enter Official' }).click();
}

async function weigh(page: Page) {
  await page.getByRole('group', { name: /^Left pan/ }).getByRole('checkbox', { name: 'A', exact: true }).check();
  await page.getByRole('group', { name: /^Right pan/ }).getByRole('checkbox', { name: 'B', exact: true }).check();
  await page.getByRole('button', { name: 'Weigh fragments' }).click();
}

async function identify(page: Page, coin: CoinId, difference: 'heavier' | 'lighter') {
  await page.getByRole('combobox', { name: 'Corrupted fragment' }).selectOption(coin);
  await page.getByRole('combobox', { name: 'Weight direction' }).selectOption(difference);
  await page.getByRole('button', { name: 'Submit identification' }).click();
}

async function answerCoinQuestions(page: Page) {
  await page.getByRole('radio', { name: '24', exact: true }).check();
  const candidates = page.getByRole('group', { name: 'Possible corrupted fragments — select every candidate' });
  for (const id of ['I', 'J', 'K', 'L']) await candidates.getByRole('checkbox', { name: id, exact: true }).check();
  await page.getByRole('radio', { name: 'Either direction', exact: true }).check();
}

async function race(page: Page, ids: readonly SteedId[]) {
  const clear = page.getByRole('button', { name: 'Clear race selection' });
  if (await clear.isEnabled()) await clear.click();
  const participants = page.getByRole('group', { name: /^Race participants/ });
  for (const id of ids) await participants.getByRole('checkbox', { name: id, exact: true }).check();
  await page.getByRole('button', { name: 'Race selected steeds' }).click();
}

async function submitRanking(page: Page, ids: readonly SteedId[]) {
  for (const label of ['First', 'Second', 'Third']) await page.getByRole('combobox', { name: `${label} place` }).selectOption('');
  for (const [index, label] of ['First', 'Second', 'Third'].entries()) {
    await page.getByRole('combobox', { name: `${label} place` }).selectOption(ids[index]);
  }
  await page.getByRole('button', { name: 'Submit top three' }).click();
}

async function repair(page: Page) {
  await page.getByRole('button', { name: 'Resolve through cooperative repair' }).click();
  const confirmations = page.getByRole('group', { name: 'Confirm all three spoken answers' }).getByRole('checkbox');
  await expect(page.getByRole('button', { name: 'Confirm repair', exact: true })).toBeDisabled();
  for (let index = 0; index < 3; index++) await confirmations.nth(index).check();
  await page.getByRole('button', { name: 'Confirm repair', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Core restored', exact: true })).toBeFocused();
}

test('production assets, keyboard navigation, and four-session persistence', async ({ page, baseURL }) => {
  const errors: string[] = [];
  const requests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('requestfailed', (request) => errors.push(`Failed request: ${request.url()}`));
  page.on('response', (response) => { if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${response.url()}`); });
  page.on('request', (request) => requests.push(request.url()));
  const initial = await openWorkshop(page);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('radio', { name: 'ConsoleDot Experience' })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'ConsoleDot Framework' })).toBeChecked();
  await page.keyboard.press('ArrowLeft');
  await page.getByText('Mission briefing', { exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText(/Rehor's memories have shattered/)).toBeVisible();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Weigh fragments' }).click();
  await expect(page.getByRole('form', { name: 'Balance weighing' })).toContainText('Invalid input:');
  await expect(page.getByText('Weighings used: 0 / 3')).toBeVisible();
  await weigh(page);
  await expect(page.getByRole('button', { name: 'Weigh fragments' })).toBeFocused();
  await page.getByRole('combobox', { name: 'Corrupted fragment' }).selectOption('L');
  await page.getByRole('radio', { name: 'ConsoleDot Framework' }).check();
  await race(page, ['A', 'B', 'C']);
  await enterOfficial(page);
  await expect(page.getByText('Races used: 0 / 7')).toBeVisible();
  await race(page, ['D', 'E']);
  await page.getByRole('radio', { name: 'ConsoleDot Experience' }).check();
  await expect(page.getByText('Weighings used: 0 / 3')).toBeVisible();
  await weigh(page);
  const before = await savedState(page);
  await page.reload();
  await expect(page.getByText('Weighings used: 1 / 3')).toBeVisible();
  expect(await savedState(page)).toEqual(before);
  await page.getByRole('radio', { name: 'Practice', exact: true }).check();
  await expect(page.getByRole('combobox', { name: 'Corrupted fragment' })).toHaveValue('L');
  expect((await savedState(page)).sessions.experience.practice.caseId).toBe(initial.sessions.experience.practice.caseId);
  expect(requests.every((url) => url.startsWith(baseURL!))).toBe(true);
  expect(requests.some((url) => url.includes('/dnd-answers/assets/'))).toBe(true);
  expect(errors).toEqual([]);
});

test('coin corrections, Practice-only outcome, and terminal reload', async ({ page }) => {
  const initial = await openWorkshop(page);
  const hidden = initial.sessions.experience.practice.trial.case;
  await weigh(page);
  await identify(page, hidden.oddCoin === 'L' ? 'K' : 'L', hidden.difference);
  await expect(page.getByRole('form', { name: 'Fragment identification' })).toContainText('Incorrect answer:');
  await identify(page, hidden.oddCoin, hidden.difference);
  await expect(page.getByRole('heading', { name: 'Verify your understanding' })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Weigh fragments' })).toBeDisabled();
  await answerCoinQuestions(page);
  const extra = page.getByRole('group', { name: 'Possible corrupted fragments — select every candidate' }).getByRole('checkbox', { name: 'A', exact: true });
  await extra.check();
  await page.getByRole('button', { name: 'Check understanding' }).click();
  await expect(page.getByText('Verification incomplete. Review the feedback and try again.')).toBeVisible();
  const verifying = await savedState(page);
  await page.reload();
  await expect(extra).toBeChecked();
  expect(await savedState(page)).toEqual(verifying);
  await extra.uncheck();
  await page.getByRole('button', { name: 'Check understanding' }).click();
  await expect(page.getByRole('heading', { name: 'Practice complete', exact: true })).toBeFocused();
  await expect(page.getByText(/Alliance Surge: 2/)).toHaveCount(0);
  const solved = await savedState(page);
  expect(solved.sessions.experience.official).toEqual(initial.sessions.experience.official);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Practice complete', exact: true })).toBeVisible();
  expect(await savedState(page)).toEqual(solved);
  expect(solved.sessions.experience.practice.history.filter((event) => event.kind === 'resolution')).toHaveLength(1);
});

test('seven-race Official proof, corrections, cooperative repair, and readiness', async ({ page }) => {
  await openWorkshop(page);
  await enterOfficial(page);
  await page.getByRole('radio', { name: 'ConsoleDot Framework' }).check();
  const hidden = (await savedState(page)).sessions.framework.official.trial.case;
  // Derive canonical inputs from observed UI race finishes, not the hidden ranking.
  const groups: SteedId[][] = [];
  for (let start = 0; start < STEED_IDS.length; start += 5) {
    await race(page, STEED_IDS.slice(start, start + 5));
    groups.push(await page.getByRole('list', { name: `Race ${groups.length + 1} finishing order`, exact: true }).getByRole('listitem').allTextContents() as SteedId[]);
    if (start === 0) {
      await submitRanking(page, hidden.ranking.slice(0, 3));
      await expect(page.getByRole('form', { name: 'Top three ranking' })).toContainText('Your observations do not yet establish a unique top three.');
    }
  }
  await race(page, groups.map((group) => group[0]));
  const winners = await page.getByRole('list', { name: 'Race 6 finishing order', exact: true }).getByRole('listitem').allTextContents();
  const ordered = winners.map((winner) => groups.find((group) => group[0] === winner)!);
  await race(page, [ordered[0][1], ordered[0][2], ordered[1][0], ordered[1][1], ordered[2][0]]);
  const finalists = await page.getByRole('list', { name: 'Race 7 finishing order', exact: true }).getByRole('listitem').allTextContents() as SteedId[];
  const answer = [ordered[0][0], finalists[0], finalists[1]];
  await expect(page.getByRole('button', { name: 'Race selected steeds' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Submit top three' })).toBeEnabled();
  await submitRanking(page, [answer[0], answer[2], answer[1]]);
  await expect(page.getByRole('form', { name: 'Top three ranking' })).toContainText('That ranking is not the order established');
  await submitRanking(page, answer);
  await expect(page.getByRole('heading', { name: 'Verify your understanding' })).toBeFocused();
  await expect(page.getByRole('table', { name: 'Hypothetical group finishes — fastest first' })).toBeVisible();
  // Both narrow and 200%-equivalent reflow, plus CSS zoom, without claiming native browser zoom.
  for (const width of [375, 640]) {
    await page.setViewportSize({ width, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => { document.documentElement.style.zoom = ''; });
  await page.getByRole('radio', { name: 'No', exact: true }).check();
  const candidates = page.getByRole('group', { name: 'Remaining second/third candidates — select every candidate' });
  for (const id of ['A2', 'A3', 'B1', 'B2', 'C1', 'D1']) await candidates.getByRole('checkbox', { name: id, exact: true }).check();
  await page.getByRole('button', { name: 'Check understanding' }).click();
  await expect(page.getByText('Verification incomplete. Review the feedback and try again.')).toBeVisible();
  await candidates.getByRole('checkbox', { name: 'D1', exact: true }).uncheck();
  await page.getByRole('button', { name: 'Check understanding' }).click();
  await expect(page.getByRole('heading', { name: 'Core restored', exact: true })).toBeFocused();
  await expect(page.getByText('ConsoleDot Experience → Alliance Surge: 2 shared rerolls.')).toBeVisible();
  await page.getByRole('radio', { name: 'ConsoleDot Experience' }).check();
  await weigh(page);
  const coin = (await savedState(page)).sessions.experience.official.trial.case;
  await identify(page, coin.oddCoin, coin.difference);
  await repair(page);
  await expect(page.getByText('Bypassed through cooperative repair', { exact: true })).toHaveCount(3);
  await expect(page.getByRole('heading', { name: 'Rehor operational', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Core restored', exact: true })).toContainText('no additional buff from this repair');
  const ready = await savedState(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Rehor operational', exact: true })).toBeVisible();
  expect(await savedState(page)).toEqual(ready);
  for (const slots of Object.values(ready.sessions)) expect(slots.official.history.filter((event) => event.kind === 'resolution')).toHaveLength(1);
  await expect(page.getByRole('region', { name: 'Official restoration status' }).locator('[aria-live], [role="status"]')).toHaveCount(0);
});

test('native dialog cancellation, repair from playing, and all reset scopes', async ({ page }) => {
  await openWorkshop(page);
  await enterOfficial(page);
  await repair(page);
  await page.getByRole('radio', { name: 'ConsoleDot Framework' }).check();
  await repair(page);
  const ready = await savedState(page);
  const trigger = page.getByRole('button', { name: 'Reset workshop', exact: true });
  await trigger.click();
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  // Chromium may visit browser chrome between tab-cycle endpoints. Background
  // document controls must remain inert; returning to the page reaches the modal.
  if (!await page.evaluate(() => document.hasFocus())) await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Confirm workshop reset' })).toBeFocused();
  await page.keyboard.press('Tab');
  if (!await page.evaluate(() => document.hasFocus())) await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  expect(await savedState(page)).toEqual(ready);
  await page.getByRole('button', { name: 'Start new case' }).click();
  await page.getByRole('button', { name: 'Confirm new case' }).click();
  await expect(page.getByRole('heading', { name: 'Rehor operational', exact: true })).toHaveCount(0);
  const newCase = await savedState(page);
  expect(newCase.sessions.framework.official.caseId).not.toBe(ready.sessions.framework.official.caseId);
  expect(newCase.sessions.framework.practice).toEqual(ready.sessions.framework.practice);
  expect(newCase.sessions.experience).toEqual(ready.sessions.experience);
  await page.getByRole('button', { name: 'Reset team', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm team reset' }).click();
  const resetTeam = await savedState(page);
  expect(resetTeam.sessions.experience).toEqual(ready.sessions.experience);
  for (const mode of ['practice', 'official'] as const) {
    expect(resetTeam.sessions.framework[mode].caseId).not.toBe(newCase.sessions.framework[mode].caseId);
  }
  await trigger.click();
  await page.getByRole('button', { name: 'Confirm workshop reset' }).click();
  const reset = await savedState(page);
  expect(reset.activeTeam).toBe('experience');
  expect(reset.activeMode).toBe('practice');
  expect(reset.officialAcknowledged).toBe(false);
  for (const team of ['experience', 'framework'] as const) for (const mode of ['practice', 'official'] as const) {
    expect(reset.sessions[team][mode].caseId).not.toBe(resetTeam.sessions[team][mode].caseId);
    expect(reset.sessions[team][mode].trial.phase).toBe('playing');
  }
});

test('corrupt storage survives cancel and team reset until explicit workshop recovery', async ({ page }) => {
  await page.addInitScript((key) => { if (!localStorage.getItem(key)) localStorage.setItem(key, '{broken'); }, storageKey);
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Saved progress needs recovery' })).toBeVisible();
  await page.getByRole('button', { name: 'Reset saved progress', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel reset', exact: true }).click();
  await page.getByRole('button', { name: 'Reset team', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm team reset' }).click();
  expect(await page.evaluate((key) => localStorage.getItem(key), storageKey)).toBe('{broken');
  await page.getByRole('button', { name: 'Reset saved progress', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm reset of all progress' }).click();
  await expect(page.getByRole('heading', { name: 'Saved progress needs recovery' })).toHaveCount(0);
  expect((await savedState(page)).schemaVersion).toBe(1);
});

test('denied storage leaves keyboard-operable in-memory play', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } });
  });
  await page.goto('./');
  await expect(page.getByRole('alert')).toHaveText('Progress cannot be saved in this browser. Keep this tab open.');
  await weigh(page);
  await expect(page.getByText('Weighings used: 1 / 3')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Weigh fragments' })).toBeFocused();
});
