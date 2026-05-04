import { getGradePoint, normalizeGrade } from "./gradeScale";
import { parseCourseCode } from "./courseCode";
import type {
  AcademicSummary,
  AnalysisResult,
  AnalyzedCourse,
  GradeScale,
  RawCourseRow,
  ValidationIssue,
} from "./types";

const PASSED_STATUS = [
  "ELIGIBLE",
  "PASSED",
  "COMPLETE",
  "COMPLETED",
  "SATISFIED",
];
const FAILED_STATUS = ["FAILED", "INCOMPLETE", "ABSENT", "PENDING", "REPEAT"];
const EXEMPTED_STATUS = ["EXEMPTED"];

const REPEAT_CODES = ["RX", "FA"];
const PASS_WITHOUT_CREDIT_CODES = ["P"];
const SPECIAL_GRADE_CODES = [...REPEAT_CODES, ...PASS_WITHOUT_CREDIT_CODES];

const isPassedCourse = (
  gradePoint: number | null,
  status?: string
): boolean => {
  const normalizedStatus = (status ?? "").trim().toUpperCase();

  if (FAILED_STATUS.includes(normalizedStatus)) {
    return false;
  }

  if (gradePoint !== null) {
    return gradePoint > 0;
  }

  return PASSED_STATUS.includes(normalizedStatus);
};

const getResultLabel = (
  grade: string | null,
  status?: string,
  gradePoint: number | null = null
): string => {
  const normalizedGrade = grade ?? "";
  const normalizedStatus = (status ?? "").trim().toUpperCase();
  const cPoint = 2.0;

  if (
    PASS_WITHOUT_CREDIT_CODES.includes(normalizedGrade) ||
    PASS_WITHOUT_CREDIT_CODES.includes(normalizedStatus)
  ) {
    return "Pass (no credit)";
  }

  if (
    REPEAT_CODES.includes(normalizedGrade) ||
    REPEAT_CODES.includes(normalizedStatus)
  ) {
    return "Repeat subject";
  }

  if (gradePoint !== null && gradePoint < cPoint) {
    return "Resit";
  }

  if (gradePoint !== null && gradePoint >= cPoint) {
    return "Counted";
  }

  // If no grade but status is ELIGIBLE, result hasn't come yet
  if (!normalizedGrade && PASSED_STATUS.includes(normalizedStatus)) {
    return "Pending result";
  }

  // If no grade and not ELIGIBLE, it's a repeat
  if (!normalizedGrade && !PASSED_STATUS.includes(normalizedStatus)) {
    return "Repeat subject";
  }

  return "Not counted";
};

const round = (value: number, digits = 2): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export const analyzeAcademicRows = (
  rows: RawCourseRow[],
  gradeScale: GradeScale
): AnalysisResult => {
  const issues: ValidationIssue[] = [];

  const analyzedCourses: AnalyzedCourse[] = rows.map((row) => {
    const rowIssues: ValidationIssue[] = [];
    const parsedCode = parseCourseCode(row.courseCode);

    if (!row.courseCode) {
      rowIssues.push({
        rowNumber: row.rowNumber,
        field: "Course Code",
        message: "Course code is missing.",
        severity: "error",
      });
    } else if (!parsedCode) {
      rowIssues.push({
        rowNumber: row.rowNumber,
        field: "Course Code",
        message:
          "Invalid course code format. Expected format similar to CVM5402.",
        severity: "error",
      });
    }

    const normalizedGrade = normalizeGrade(row.grade);
    const normalizedStatus = (row.progressStatus ?? "").trim().toUpperCase();

    // If status is EXEMPTED, treat as grade A
    let gradeForCalculation = normalizedGrade;
    if (EXEMPTED_STATUS.includes(normalizedStatus)) {
      gradeForCalculation = "A";
    }

    const gradePoint = getGradePoint(gradeForCalculation, gradeScale);
    const resultLabel = getResultLabel(
      gradeForCalculation,
      row.progressStatus,
      gradePoint
    );
    const countsTowardGpa = resultLabel === "Counted";
    const countsTowardCredits = countsTowardGpa;

    if (
      gradeForCalculation &&
      gradePoint === null &&
      !EXEMPTED_STATUS.includes(normalizedStatus)
    ) {
      const isSpecialCode = SPECIAL_GRADE_CODES.includes(gradeForCalculation);
      rowIssues.push({
        rowNumber: row.rowNumber,
        field: "Grade",
        message: isSpecialCode
          ? `Grade \"${gradeForCalculation}\" recognized as special code: P (Pass, no credit), RX/FA (Repeat), E (Fail).`
          : `Unsupported grade \"${gradeForCalculation}\". Update grade scale or fix input value.`,
        severity: isSpecialCode ? "warning" : "error",
      });
    }

    if (!row.progressStatus) {
      rowIssues.push({
        rowNumber: row.rowNumber,
        field: "Progress Status",
        message: "Progress status is empty.",
        severity: "warning",
      });
    }

    // If result label is "Pending result", add a warning
    if (resultLabel === "Pending result") {
      rowIssues.push({
        rowNumber: row.rowNumber,
        field: "Grade",
        message:
          "Result not yet released. Status is eligible but no grade received.",
        severity: "warning",
      });
    }

    const credits = parsedCode?.creditRate ?? 0;
    const passed = parsedCode
      ? isPassedCourse(gradePoint, row.progressStatus) ||
        resultLabel === "Pass (no credit)"
      : false;
    const weightedPoints =
      countsTowardGpa && gradePoint !== null ? credits * gradePoint : 0;

    issues.push(...rowIssues);

    return {
      ...row,
      parsedCode,
      normalizedGrade,
      gradePoint,
      credits,
      isPassed: passed,
      countsTowardCredits,
      countsTowardGpa,
      resultLabel,
      weightedPoints,
      issues: rowIssues,
    };
  });

  const validCourses = analyzedCourses.filter(
    (course) =>
      course.parsedCode && course.countsTowardGpa && course.gradePoint !== null
  );

  const totalCreditsPassed = validCourses.reduce(
    (sum, course) => sum + course.credits,
    0
  );
  const totalWeightedPoints = validCourses.reduce(
    (sum, course) => sum + course.weightedPoints,
    0
  );

  const creditsByLevel: Record<string, number> = {};
  const weightedByLevel: Record<string, number> = {};
  const creditsByCategory: Record<string, number> = {};

  validCourses.forEach((course) => {
    const level = course.parsedCode!.level;
    const category = course.parsedCode!.category;

    creditsByLevel[level] = (creditsByLevel[level] ?? 0) + course.credits;
    weightedByLevel[level] =
      (weightedByLevel[level] ?? 0) + course.weightedPoints;
    creditsByCategory[category] =
      (creditsByCategory[category] ?? 0) + course.credits;
  });

  const agpaByLevel = Object.keys(creditsByLevel).reduce<
    Record<string, number>
  >((acc, level) => {
    acc[level] = creditsByLevel[level]
      ? round(weightedByLevel[level] / creditsByLevel[level], 3)
      : 0;
    return acc;
  }, {});

  const summary: AcademicSummary = {
    totalAGPA: totalCreditsPassed
      ? round(totalWeightedPoints / totalCreditsPassed, 3)
      : 0,
    totalWeightedPoints: round(totalWeightedPoints, 3),
    totalCreditsPassed: round(totalCreditsPassed, 2),
    agpaByLevel,
    creditsByLevel,
    creditsByCategory,
    validRows: validCourses.length,
    invalidRows: analyzedCourses.length - validCourses.length,
  };

  return {
    analyzedCourses,
    summary,
    issues,
    headersFound: [],
  };
};
