import type { GradeScale } from "./types";

export const defaultGradeScale: GradeScale = {
  "A+": 4.0,
  A: 4.0,
  "A-": 3.7,
  "B+": 3.3,
  B: 3.0,
  "B-": 2.7,
  "C+": 2.3,
  C: 2.0,
  "C-": 1.7,
  D: 1.0,
  "D+": 1.3,
  E: 0.0,
  F: 0.0,
};

export const normalizeGrade = (input?: string): string | null => {
  if (!input) return null;
  const grade = input.toString().trim().toUpperCase();
  if (!grade || grade === "-") return null;
  return grade;
};

export const getGradePoint = (
  grade: string | null,
  scale: GradeScale
): number | null => {
  if (!grade) return null;
  return Object.prototype.hasOwnProperty.call(scale, grade)
    ? scale[grade]
    : null;
};
