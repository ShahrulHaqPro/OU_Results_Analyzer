import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { AnalysisResult } from "./types";

export const exportSummaryToPdf = (result: AnalysisResult): void => {
  const doc = new jsPDF();
  const { summary } = result;

  const takenCourses = result.analyzedCourses.filter((course) => {
    const normalizedStatus = (course.progressStatus ?? "").trim().toUpperCase();
    return course.parsedCode && normalizedStatus !== "REPEAT";
  });

  const passedCourses = result.analyzedCourses.filter(
    (course) => course.parsedCode && course.countsTowardGpa
  );

  const levelKeys = Array.from(
    new Set(
      result.analyzedCourses.map((course) => course.parsedCode?.level ?? "")
    )
  )
    .filter(Boolean)
    .sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));

  const categoryKeys = Array.from(
    new Set(
      result.analyzedCourses.map((course) => course.parsedCode?.category ?? "")
    )
  )
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  const formatMatrixValue = (value: number): string =>
    value > 0 ? value.toFixed(2) : "-";

  const getMatrixCredits = (
    courses: typeof takenCourses,
    level?: string,
    category?: string
  ): number =>
    courses.reduce((total, course) => {
      const matchesLevel = level ? course.parsedCode?.level === level : true;
      const matchesCategory = category
        ? course.parsedCode?.category === category
        : true;

      if (matchesLevel && matchesCategory) {
        return total + course.credits;
      }

      return total;
    }, 0);

  const getMatrixRowTotal = (courses: typeof takenCourses, level: string): number =>
    getMatrixCredits(courses, level);

  const getMatrixColumnTotal = (
    courses: typeof takenCourses,
    category: string
  ): number => getMatrixCredits(courses, undefined, category);

  const getMatrixRows = (courses: typeof takenCourses) => [
    ...levelKeys.map((level) => [
      `Level ${level}`,
      ...categoryKeys.map((category) =>
        formatMatrixValue(getMatrixCredits(courses, level, category))
      ),
      formatMatrixValue(getMatrixRowTotal(courses, level)),
    ]),
    [
      "Total credit",
      ...categoryKeys.map((category) =>
        formatMatrixValue(getMatrixColumnTotal(courses, category))
      ),
      formatMatrixValue(courses.reduce((total, course) => total + course.credits, 0)),
    ],
  ];

  doc.setFontSize(16);
  doc.text("Academic Performance Analyzer Summary - OU", 14, 16);

  doc.setFontSize(11);
  doc.text(`Total AGPA: ${summary.totalAGPA.toFixed(3)}`, 14, 26);
  doc.text(`Total Credits Passed: ${summary.totalCreditsPassed}`, 14, 33);
  doc.text(`Valid Courses Counted: ${summary.validRows}`, 14, 40);

  // doc.setFontSize(12);
  // doc.text("Taken Credit Matrix", 14, 48);

  autoTable(doc, {
    startY: 52,
    head: [["Taken Credit Matrix", ...categoryKeys.map((category) => `cat ${category}`), "Total credit"]],
    body: getMatrixRows(takenCourses),
    theme: "grid",
    styles: {
      lineWidth: 0.1,
      lineColor: 180,
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
    },
  });

  // doc.setFontSize(12);
  // doc.text("Passed Credit Matrix", 14, 68);

  autoTable(doc, {
    startY: (doc as jsPDF & { lastAutoTable?: { finalY?: number } })
      .lastAutoTable?.finalY
      ? ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable
          ?.finalY ?? 0) + 12
      : 110,
    head: [["Passed Credit Matrix", ...categoryKeys.map((category) => `cat ${category}`), "Total credit"]],
    body: getMatrixRows(passedCourses).map((row) => [
      row[0],
      ...(row.slice(1, -1) as string[]),
      row[row.length - 1],
    ]),
    theme: "grid",
    styles: {
      lineWidth: 0.1,
      lineColor: 180,
    },
    headStyles: {
      fillColor: [16, 185, 129],
      textColor: 255,
    },
  });

  autoTable(doc, {
    startY: (doc as jsPDF & { lastAutoTable?: { finalY?: number } })
      .lastAutoTable?.finalY
      ? ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable
          ?.finalY ?? 0) + 8
      : 90,
    head: [
      [
        "Course Code",
        "Name",
        "Level",
        "Category",
        "Grade",
        "Credits",
        "Passed",
      ],
    ],
    body: result.analyzedCourses.map((course) => [
      course.courseCode,
      course.courseName,
      course.parsedCode?.level ?? "-",
      course.parsedCode?.category ?? "-",
      course.normalizedGrade ?? "-",
      course.credits,
      course.isPassed ? "Yes" : "No",
    ]),
    theme: "grid",
    styles: {
      lineWidth: 0.1,
      lineColor: 180,
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: 255,
    },
  });

  doc.save("academic-performance-summary.pdf");
};

export const exportSummaryToExcel = (result: AnalysisResult): void => {
  const summarySheet = XLSX.utils.json_to_sheet([
    {
      "Total AGPA": result.summary.totalAGPA,
      "Total Credits Passed": result.summary.totalCreditsPassed,
      "Valid Rows": result.summary.validRows,
      "Invalid Rows": result.summary.invalidRows,
      "AGPA by Level": JSON.stringify(result.summary.agpaByLevel),
      "Credits by Level": JSON.stringify(result.summary.creditsByLevel),
      "Credits by Category": JSON.stringify(result.summary.creditsByCategory),
    },
  ]);

  const courseSheet = XLSX.utils.json_to_sheet(
    result.analyzedCourses.map((course) => ({
      "Course Code": course.courseCode,
      "Course Name": course.courseName,
      Category: course.parsedCode?.category ?? "",
      Level: course.parsedCode?.level ?? "",
      Credits: course.credits,
      Grade: course.normalizedGrade ?? "",
      "Grade Point": course.gradePoint ?? "",
      "Result Label": course.resultLabel,
      Passed: course.isPassed ? "Yes" : "No",
      "Weighted Points": course.weightedPoints,
      "Progress Status": course.progressStatus ?? "",
    }))
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
  XLSX.utils.book_append_sheet(workbook, courseSheet, "Course Details");
  XLSX.writeFile(workbook, "academic-performance-summary.xlsx");
};
