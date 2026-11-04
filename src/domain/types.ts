export type Phase = 'playing' | 'verification' | 'solved' | 'repaired';

export type FailureCategory =
  | 'invalid-input'
  | 'incorrect-answer'
  | 'insufficient-evidence'
  | 'state-error';

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; category: FailureCategory; message: string };

export function success<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function failure(category: FailureCategory, message: string): Result<never> {
  return { ok: false, category, message };
}
