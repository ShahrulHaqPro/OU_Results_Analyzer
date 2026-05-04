export type AppPage = "home" | "results" | "help" | "about";

export type GradeScale = Record<string, number>;

export interface ParsedCourseCode {
  department: string;
  category: string;
  level: string;
  creditRate: number;
  serial: string;
}

export interface ValidationIssue {
  rowNumber: number;
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface RawCourseRow {
  rowNumber: number;
  courseCode: string;
  courseName: string;
  lastOfferedYear?: string;
  progressStatus?: string;
  grade?: string;
  attempts?: number;
  eligibilityCompletedYears?: string;
  eligibilityLeft?: string;
}

export interface AnalyzedCourse extends RawCourseRow {
  parsedCode: ParsedCourseCode | null;
  normalizedGrade: string | null;
  gradePoint: number | null;
  credits: number;
  isPassed: boolean;
  countsTowardCredits: boolean;
  countsTowardGpa: boolean;
  resultLabel: string;
  weightedPoints: number;
  issues: ValidationIssue[];
}

export interface AcademicSummary {
  totalAGPA: number;
  totalWeightedPoints: number;
  totalCreditsPassed: number;
  agpaByLevel: Record<string, number>;
  level2Agpa: number;
  level2Credits: number;
  creditsByLevel: Record<string, number>;
  creditsByCategory: Record<string, number>;
  validRows: number;
  invalidRows: number;
}

export interface AnalysisResult {
  analyzedCourses: AnalyzedCourse[];
  summary: AcademicSummary;
  issues: ValidationIssue[];
  headersFound: string[];
}

export interface CourseFilters {
  query: string;
  level: string;
  category: string;
  status: string;
  grade: string;
}
