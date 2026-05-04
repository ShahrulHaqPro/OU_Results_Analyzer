import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { AnalysisResult } from "./types";

export const exportSummaryToPdf = (result: AnalysisResult): void => {
  const doc = new jsPDF();
  const { summary } = result;

  doc.setFontSize(16);
  doc.text("Academic Performance Analyzer - Summary", 14, 16);

  doc.setFontSize(11);
  doc.text(`Total AGPA: ${summary.totalAGPA.toFixed(3)}`, 14, 26);
  doc.text(`Total Credits Passed: ${summary.totalCreditsPassed}`, 14, 33);
  doc.text(`Valid Courses Counted: ${summary.validRows}`, 14, 40);

  autoTable(doc, {
    startY: 48,
    head: [["Metric", "Details"]],
    body: [
      ["AGPA by Level", JSON.stringify(summary.agpaByLevel)],
      ["Credits by Level", JSON.stringify(summary.creditsByLevel)],
      ["Credits by Category", JSON.stringify(summary.creditsByCategory)],
    ],
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
