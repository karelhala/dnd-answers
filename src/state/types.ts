import type { TeamId } from '../content/teams';
import type { CoinId, CoinTrial, WeightDifference } from '../domain/coins';
import type { SteedId, SteedTrial } from '../domain/steeds';
import type { FailureCategory } from '../domain/types';

export type Mode = 'practice' | 'official';
export const HISTORY_LIMIT = 100;

export interface CoinDraft {
  readonly left: readonly CoinId[];
  readonly right: readonly CoinId[];
  readonly coin: CoinId | '';
  readonly difference: WeightDifference | '';
}

export interface SteedDraft {
  readonly participants: readonly SteedId[];
  readonly answer: readonly [SteedId | '', SteedId | '', SteedId | ''];
}

export type QuestionDrafts = Readonly<Record<string, readonly string[]>>;
export type EventCategory = FailureCategory | 'observed' | 'accepted' | 'verification-incomplete' | 'solved' | 'repaired';

export interface AttemptEvent {
  readonly caseId: string;
  readonly at: string;
  readonly kind: 'observation' | 'answer' | 'verification' | 'resolution' | 'error';
  readonly category: EventCategory;
  readonly message: string;
}

interface SessionBase {
  readonly caseId: string;
  readonly mode: Mode;
  readonly createdAt: string;
  readonly acceptedAnswerAt?: string;
  readonly resolvedAt?: string;
  readonly history: readonly AttemptEvent[];
  readonly verification: QuestionDrafts;
  readonly verificationSubmitted: boolean;
}

export interface CoinSession extends SessionBase {
  readonly teamId: 'experience';
  readonly trial: CoinTrial;
  readonly draft: CoinDraft;
}

export interface SteedSession extends SessionBase {
  readonly teamId: 'framework';
  readonly trial: SteedTrial;
  readonly draft: SteedDraft;
}

export type TrialSession = CoinSession | SteedSession;
export interface WorkshopState {
  readonly schemaVersion: 1;
  readonly activeTeam: TeamId;
  readonly activeMode: Mode;
  readonly officialAcknowledged: boolean;
  readonly sessions: {
    readonly experience: Readonly<Record<Mode, CoinSession>>;
    readonly framework: Readonly<Record<Mode, SteedSession>>;
  };
}

export interface SessionTarget {
  readonly teamId: TeamId;
  readonly mode: Mode;
  readonly caseId: string;
}

export type WorkshopAction =
  | { type: 'SELECT_TEAM'; teamId: TeamId }
  | { type: 'SELECT_MODE'; mode: Mode }
  | { type: 'ACKNOWLEDGE_OFFICIAL' }
  | { type: 'EDIT_COIN_DRAFT'; target: SessionTarget; draft: CoinDraft }
  | { type: 'EDIT_STEED_DRAFT'; target: SessionTarget; draft: SteedDraft }
  | { type: 'EDIT_VERIFICATION'; target: SessionTarget; answers: QuestionDrafts }
  | { type: 'WEIGH_COINS' | 'RACE_STEEDS' | 'SUBMIT_COIN_ANSWER' | 'SUBMIT_STEED_ANSWER' | 'SUBMIT_VERIFICATION'; target: SessionTarget; at: string }
  | { type: 'CONFIRM_REPAIR'; target: SessionTarget; at: string; confirmations: readonly boolean[] }
  | { type: 'START_NEW_CASE'; target: SessionTarget; replacement: TrialSession; confirmed: boolean }
  | { type: 'RESET_TEAM'; teamId: TeamId; replacements: readonly [TrialSession, TrialSession]; confirmed: boolean }
  | { type: 'RESET_WORKSHOP'; replacement: WorkshopState; confirmed: boolean };
