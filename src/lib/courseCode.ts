import type { ParsedCourseCode } from "./types";

// Format example: CVM5402 -> department(2 letters) + category(1 letter) + level(1 digit) + creditRate(1 digit) + serial(2 alnum)
const COURSE_CODE_PATTERN = /^[A-Za-z]{2}[A-Za-z][0-9][0-9][A-Za-z0-9]{2}$/;

export const parseCourseCode = (
  courseCode: string
): ParsedCourseCode | null => {
  const code = courseCode.trim().toUpperCase();
  if (!COURSE_CODE_PATTERN.test(code)) {
    return null;
  }

  return {
    department: code.slice(0, 2),
    category: code[2],
    level: code[3],
    creditRate: Number(code[4]),
    serial: code.slice(5),
  };
};
