import { describe, expect, it } from 'vitest';
import { coinQuestions, steedQuestions } from '../src/content/questions';
import { gradeQuestion, gradeVerification } from '../src/domain/verification';

describe('follow-up verification', () => {
  it.each([...coinQuestions, ...steedQuestions])('grades $id using exact stable ID sets', (question) => {
    expect(gradeQuestion(question, question.correctIds)).toBe(true);
    expect(gradeQuestion(question, [...question.correctIds].reverse())).toBe(true);
    expect(gradeQuestion(question, undefined)).toBe(false);
    expect(gradeQuestion(question, [])).toBe(false);
    expect(gradeQuestion(question, question.correctIds.slice(1))).toBe(false);
    expect(gradeQuestion(question, [...question.correctIds, 'unknown'])).toBe(false);
    expect(gradeQuestion(question, [...question.correctIds, question.correctIds[0]])).toBe(false);
    expect(gradeQuestion(question, question.correctIds.map((id) => `${id}-unknown`))).toBe(false);
  });

  it.each(['coins', 'steeds'] as const)('requires both %s answers in one submission and allows correction', (puzzle) => {
    const questions = puzzle === 'coins' ? coinQuestions : steedQuestions;
    expect(gradeVerification(puzzle, {}).passed).toBe(false);
    const partial = { [questions[0].id]: questions[0].correctIds };
    expect(gradeVerification(puzzle, partial).passed).toBe(false);
    const complete = { ...partial, [questions[1].id]: [...questions[1].correctIds].reverse() };
    expect(gradeVerification(puzzle, complete).passed).toBe(true);
    expect(partial).toEqual({ [questions[0].id]: questions[0].correctIds });
  });

  it('rejects wrong fragment directions, partial sets, and extra canonical candidates', () => {
    expect(gradeQuestion(coinQuestions[0], ['24'])).toBe(false);
    expect(gradeQuestion(coinQuestions[1], ['I', 'J', 'K', 'L', 'heavier-only'])).toBe(false);
    expect(gradeQuestion(coinQuestions[1], ['I', 'J', 'K', 'either-direction'])).toBe(false);
    expect(gradeQuestion(steedQuestions[1], ['A2', 'A3', 'B1', 'B2', 'C1', 'C2'])).toBe(false);
  });

  it('keeps stable keys valid and labels canonical questions as independent hypotheticals', () => {
    for (const question of [...coinQuestions, ...steedQuestions]) {
      const ids = question.options.map((option) => option.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(question.correctIds.every((id) => ids.includes(id))).toBe(true);
    }
    expect(coinQuestions[1].scenario).toMatch(/Hypothetical/);
    expect(steedQuestions[1].scenario).toMatch(/Hypothetical/);
    expect(steedQuestions[1].groups).toHaveLength(5);
    expect(steedQuestions[1].groups?.[0].order).toEqual(['A1', 'A2', 'A3', 'A4', 'A5']);
  });
});
