import * as XLSX from "xlsx";
import type { RawCourseRow } from "./types";

const headerAliases: Record<string, string[]> = {
  courseCode: ["Course Code", "CourseCode", "Course_Code", "Code"],
  courseName: ["Course Name", "CourseName", "Course_Name", "Name"],
  lastOfferedYear: ["Last Offered Year", "LastOfferedYear", "Year"],
  progressStatus: ["Progress Status", "ProgressStatus", "Status"],
  grade: ["Grade", "Result Grade"],
  attempts: ["Attempts", "Attempt"],
  eligibilityCompletedYears: [
    "Eligibility Completed Years",
    "EligibilityCompletedYears",
  ],
  eligibilityLeft: ["Eligibility Left", "EligibilityLeft"],
};

const requiredFields: Array<keyof typeof headerAliases> = [
  "courseCode",
  "courseName",
  "progressStatus",
  "grade",
];

const getMatchedColumn = (
  headers: string[],
  aliases: string[]
): string | undefined => {
  const normalized = headers.map((h) => h.trim().toLowerCase());
  const idx = aliases
    .map((a) => a.trim().toLowerCase())
    .map((alias) => normalized.indexOf(alias))
    .find((index) => index >= 0);

  return idx !== undefined && idx >= 0 ? headers[idx] : undefined;
};

export const parseExcelFile = async (
  file: File
): Promise<{
  rows: RawCourseRow[];
  headers: string[];
  missingRequired: string[];
}> => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: "array" });

  const firstSheet = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheet];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: "",
  });
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

  const columnMapping = Object.entries(headerAliases).reduce<
    Record<string, string | undefined>
  >((acc, [key, aliases]) => {
    acc[key] = getMatchedColumn(headers, aliases);
    return acc;
  }, {});

  const missingRequired = requiredFields.filter(
    (field) => !columnMapping[field]
  );

  const parsedRows = rows.map((entry, index): RawCourseRow => {
    const attemptsRaw = columnMapping.attempts
      ? entry[columnMapping.attempts]
      : "";

    return {
      rowNumber: index + 2,
      courseCode: String(
        columnMapping.courseCode ? entry[columnMapping.courseCode] ?? "" : ""
      ).trim(),
      courseName: String(
        columnMapping.courseName ? entry[columnMapping.courseName] ?? "" : ""
      ).trim(),
      lastOfferedYear: String(
        columnMapping.lastOfferedYear
          ? entry[columnMapping.lastOfferedYear] ?? ""
          : ""
      ).trim(),
      progressStatus: String(
        columnMapping.progressStatus
          ? entry[columnMapping.progressStatus] ?? ""
          : ""
      ).trim(),
      grade: String(
        columnMapping.grade ? entry[columnMapping.grade] ?? "" : ""
      ).trim(),
      attempts: attemptsRaw === "" ? undefined : Number(attemptsRaw),
      eligibilityCompletedYears: String(
        columnMapping.eligibilityCompletedYears
          ? entry[columnMapping.eligibilityCompletedYears] ?? ""
          : ""
      ).trim(),
      eligibilityLeft: String(
        columnMapping.eligibilityLeft
          ? entry[columnMapping.eligibilityLeft] ?? ""
          : ""
      ).trim(),
    };
  });

  return {
    rows: parsedRows,
    headers,
    missingRequired,
  };
};

export const downloadSampleTemplate = (): void => {
  const sample = [
    {
      "Course Code": "CVM5402",
      "Course Name": "Accounting for Engineers",
      "Last Offered Year": "2024",
      "Progress Status": "Eligible",
      Grade: "A-",
      Attempts: 1,
      "Eligibility Completed Years": "1",
      "Eligibility Left": "-",
    },
  ];

  const sheet = XLSX.utils.json_to_sheet(sample);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Results");
  XLSX.writeFile(workbook, "academic-results-sample.xlsx");
};
