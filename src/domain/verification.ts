import { coinQuestions, steedQuestions } from '../content/questions';
import type { VerificationQuestion } from '../content/questions';

export type VerificationAnswers = Readonly<Record<string, readonly string[] | undefined>>;

export function gradeQuestion(question: VerificationQuestion, answer: readonly string[] | undefined): boolean {
  if (!answer || new Set(answer).size !== answer.length) return false;
  return answer.length === question.correctIds.length &&
    question.correctIds.every((id) => answer.includes(id));
}

export function gradeVerification(puzzle: 'coins' | 'steeds', answers: VerificationAnswers) {
  const questions = puzzle === 'coins' ? coinQuestions : steedQuestions;
  const results = questions.map((question) => ({
    questionId: question.id,
    correct: gradeQuestion(question, answers[question.id]),
    explanation: question.explanation,
  }));
  return { passed: results.every((result) => result.correct), results };
}
