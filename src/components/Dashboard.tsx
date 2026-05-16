import { useMemo, useState } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  Title,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { Download, FileDown } from "lucide-react";
import { exportSummaryToExcel, exportSummaryToPdf } from "../lib/export";
import type {
  AnalysisResult,
  CourseFilters,
  AnalyzedCourse,
} from "../lib/types";

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  Title
);

interface DashboardProps {
  result: AnalysisResult;
}

const Dashboard = ({ result }: DashboardProps) => {
  const defaultFilters: CourseFilters = {
    query: "",
    level: "ALL",
    category: "ALL",
    status: "ALL",
    grade: "ALL",
  };
  const [filters, setFilters] = useState<CourseFilters>(defaultFilters);
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(new Set());
  const [customAgpa, setCustomAgpa] = useState<number | null>(null);

  const agpaByLevelEntries = Object.entries(result.summary.agpaByLevel).sort(
    ([a], [b]) => a.localeCompare(b)
  );
  const creditsByLevelEntries = Object.entries(
    result.summary.creditsByLevel
  ).sort(([a], [b]) => a.localeCompare(b));
  const creditsByCategoryEntries = Object.entries(
    result.summary.creditsByCategory
  ).sort(([a], [b]) => a.localeCompare(b));
  
  const combinedLevelKeys = Array.from(
    new Set([
      ...Object.keys(result.summary.creditsByLevel),
      ...Object.keys(result.summary.creditsTakenByLevel),
    ])
  ).sort();
  const combinedCategoryKeys = Array.from(
    new Set([
      ...Object.keys(result.summary.creditsByCategory),
      ...Object.keys(result.summary.creditsTakenByCategory),
    ])
  ).sort();

  const levels = useMemo(
    () =>
      Array.from(
        new Set(
          result.analyzedCourses
            .map((c) => c.parsedCode?.level)
            .filter(Boolean) as string[]
        )
      ).sort(),
    [result.analyzedCourses]
  );
  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          result.analyzedCourses
            .map((c) => c.parsedCode?.category)
            .filter(Boolean) as string[]
        )
      ).sort(),
    [result.analyzedCourses]
  );
  const statuses = useMemo(
    () =>
      Array.from(
        new Set(
          result.analyzedCourses
            .map((c) => (c.progressStatus ?? "").trim())
            .filter(Boolean)
        )
      ).sort(),
    [result.analyzedCourses]
  );
  const grades = useMemo(
    () =>
      Array.from(
        new Set(
          result.analyzedCourses
            .map((c) => c.normalizedGrade)
            .filter(Boolean) as string[]
        )
      ).sort(),
    [result.analyzedCourses]
  );

  const filteredCourses = useMemo(
    () =>
      result.analyzedCourses.filter((course) => {
        const query = filters.query.toLowerCase();
        const byQuery =
          !query ||
          course.courseCode.toLowerCase().includes(query) ||
          course.courseName.toLowerCase().includes(query);
        const byLevel =
          filters.level === "ALL" || course.parsedCode?.level === filters.level;
        const byCategory =
          filters.category === "ALL" ||
          course.parsedCode?.category === filters.category;
        const byStatus =
          filters.status === "ALL" ||
          (course.progressStatus ?? "") === filters.status;
        const byGrade =
          filters.grade === "ALL" || course.normalizedGrade === filters.grade;
        return byQuery && byLevel && byCategory && byStatus && byGrade;
      }),
    [result.analyzedCourses, filters]
  );

  const toggleCourseSelection = (courseId: string) => {
    const newSelected = new Set(selectedCourses);
    if (newSelected.has(courseId)) {
      newSelected.delete(courseId);
    } else {
      newSelected.add(courseId);
    }
    setSelectedCourses(newSelected);
  };

  const calculateCustomAgpa = () => {
    const selectedCoursesData = result.analyzedCourses.filter((course) => {
      const courseId = `${course.rowNumber}-${course.courseCode}`;
      return selectedCourses.has(courseId);
    });

    if (selectedCoursesData.length === 0) {
      setCustomAgpa(null);
      return;
    }

    // Filter for courses that count towards GPA
    const validCourses = selectedCoursesData.filter(
      (course) => course.countsTowardGpa && course.gradePoint !== null
    );

    if (validCourses.length === 0) {
      setCustomAgpa(null);
      return;
    }

    const totalCredits = validCourses.reduce(
      (sum, course) => sum + course.credits,
      0
    );
    const totalWeightedPoints = validCourses.reduce(
      (sum, course) => sum + course.weightedPoints,
      0
    );

    const agpa = totalCredits > 0 ? totalWeightedPoints / totalCredits : 0;
    setCustomAgpa(Math.round(agpa * 1000) / 1000);
  };

  const getStatusDisplay = (
    course: AnalyzedCourse
  ): { label: string; color: string } => {
    const normalizedStatus = (course.progressStatus ?? "").trim().toUpperCase();
    const gradePoint = course.gradePoint;

    // If Grade >= C (gradePoint >= 2.0) then "Counted"
    if (gradePoint !== null && gradePoint >= 2.0) {
      return { label: "Counted", color: "text-emerald-600" };
    }

    // If Progress Status is Exempted then "Counted"
    if (normalizedStatus === "EXEMPTED") {
      return { label: "Counted", color: "text-emerald-600" };
    }

    // If Progress Status is Resit then "Resit"
    if (normalizedStatus === "RESIT") {
      return { label: "Resit", color: "text-slate-600" };
    }

    // If Progress Status is Pending then "Result waiting"
    if (normalizedStatus === "PENDING") {
      return { label: "Get Eligible", color: "text-slate-600" };
    }

    // If Progress Status is Repeat then "Repeat"
    if (normalizedStatus === "REPEAT") {
      return { label: "Repeat", color: "text-slate-600" };
    }

    // Default to resultLabel with neutral color
    return { label: course.resultLabel, color: "text-slate-600" };
  };

  return (
    <section className="space-y-5 sm:space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
          <p className="text-sm text-slate-500">Total AGPA</p>
          <p className="mt-2 text-2xl font-bold text-brand-700 sm:text-3xl">
            {result.summary.totalAGPA.toFixed(3)}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
          <p className="text-sm text-slate-500">Credits Passed</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
            {result.summary.totalCreditsPassed}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
          <p className="text-sm text-slate-500">Total Credit Taken</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
            {Object.values(result.summary.creditsTakenByLevel).reduce((sum, val) => sum + val, 0).toFixed(2)}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
          <p className="text-sm text-slate-500">Valid Rows</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600 sm:text-3xl">
            {result.summary.validRows}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          onClick={() => exportSummaryToPdf(result)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <FileDown className="h-4 w-4" /> Export PDF
        </button>
        <button
          onClick={() => exportSummaryToExcel(result)}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Download className="h-4 w-4" /> Export Excel
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 sm:gap-6">
        <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
          <h3 className="text-base font-semibold text-slate-900">
            AGPA by Level
          </h3>
          <div className="mt-3 h-44 sm:h-52 lg:h-56">
            <Bar
              data={{
                labels: agpaByLevelEntries.map(([level]) => level),
                datasets: [
                  {
                    label: "AGPA",
                    data: agpaByLevelEntries.map(([, value]) => value),
                    backgroundColor: "#3b82f6",
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
              }}
            />
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Level</th>
                  <th className="px-3 py-2 font-medium">AGPA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {agpaByLevelEntries.map(([level, value]) => (
                  <tr key={level}>
                    <td className="px-3 py-2">Level {level}</td>
                    <td className="px-3 py-2 font-medium text-brand-700">
                      {value.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
          <h3 className="text-base font-semibold text-slate-900">
            Credits by Level
          </h3>
          <div className="mt-3 h-44 sm:h-52 lg:h-56">
            <Bar
              data={{
                labels: creditsByLevelEntries.map(([level]) => level),
                datasets: [
                  {
                    label: "Credits",
                    data: creditsByLevelEntries.map(([, value]) => value),
                    backgroundColor: "#10b981",
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
              }}
            />
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Level</th>
                  <th className="px-3 py-2 font-medium">Credits Passed</th>
                  <th className="px-3 py-2 font-medium">Credits Taken</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {combinedLevelKeys.map((level) => {
                  const passed = result.summary.creditsByLevel[level] ?? 0;
                  const taken = result.summary.creditsTakenByLevel[level] ?? 0;
                  return (
                    <tr key={level}>
                      <td className="px-3 py-2">Level {level}</td>
                      <td className="px-3 py-2 font-medium text-emerald-600">
                        {passed.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {taken.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5 lg:col-span-2">
          <h3 className="text-base font-semibold text-slate-900">
            Credits by Category
          </h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
            <div className="mx-auto mt-3 max-w-xs sm:max-w-sm lg:max-w-md">
              <Doughnut
                data={{
                  labels: creditsByCategoryEntries.map(
                    ([category]) => category
                  ),
                  datasets: [
                    {
                      label: "Credits",
                      data: creditsByCategoryEntries.map(([, value]) => value),
                      backgroundColor: [
                        "#2563eb",
                        "#0ea5e9",
                        "#10b981",
                        "#f59e0b",
                        "#ef4444",
                        "#8b5cf6",
                      ],
                    },
                  ],
                }}
              />
            </div>
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-3 py-2 font-medium">Category</th>
                    <th className="px-3 py-2 font-medium">Credits Passed</th>
                    <th className="px-3 py-2 font-medium">Credits Taken</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {combinedCategoryKeys.map((category) => {
                    const passed = result.summary.creditsByCategory[category] ?? 0;
                    const taken = result.summary.creditsTakenByCategory[category] ?? 0;
                    return (
                      <tr key={category}>
                        <td className="px-3 py-2">{category}</td>
                        <td className="px-3 py-2 font-medium text-slate-900">
                          {passed.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-900">
                          {taken.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
        <h3 className="text-base font-semibold text-slate-900">
          Course details
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input
            value={filters.query}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, query: e.target.value }))
            }
            placeholder="Search code or name"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={filters.level}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, level: e.target.value }))
            }
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="ALL">All Levels</option>
            {levels.map((value) => (
              <option key={value} value={value}>
                Level {value}
              </option>
            ))}
          </select>
          <select
            value={filters.category}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, category: e.target.value }))
            }
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="ALL">All Categories</option>
            {categories.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, status: e.target.value }))
            }
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="ALL">All Status</option>
            {statuses.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select
            value={filters.grade}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, grade: e.target.value }))
            }
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="ALL">All Grades</option>
            {grades.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <button
            type="button"
            onClick={() => setFilters(defaultFilters)}
            className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white sm:col-span-2 lg:col-span-1"
          >
            Reset filters
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-3 py-2 font-medium">
                  <input
                    type="checkbox"
                    aria-label="Select all courses"
                    className="rounded border-slate-300"
                  />
                </th>
                <th className="px-3 py-2 font-medium">Code</th>
                <th className="px-3 py-2 font-medium">Course</th>
                <th className="px-3 py-2 font-medium">Cat</th>
                <th className="px-3 py-2 font-medium">Lvl</th>
                <th className="px-3 py-2 font-medium">Grade</th>
                <th className="px-3 py-2 font-medium">Credits</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredCourses.map((course) => {
                const courseId = `${course.rowNumber}-${course.courseCode}`;
                const isSelected = selectedCourses.has(courseId);
                const statusDisplay = getStatusDisplay(course);
                return (
                  <tr key={courseId}>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleCourseSelection(courseId)}
                        className="rounded border-slate-300"
                      />
                    </td>
                    <td className="px-3 py-2">{course.courseCode}</td>
                    <td className="px-3 py-2">{course.courseName}</td>
                    <td className="px-3 py-2">
                      {course.parsedCode?.category ?? "-"}
                    </td>
                    <td className="px-3 py-2">
                      {course.parsedCode?.level ?? "-"}
                    </td>
                    <td className="px-3 py-2">{course.normalizedGrade ?? "-"}</td>
                    <td className="px-3 py-2">{course.credits}</td>
                    <td className={`px-3 py-2 font-medium ${statusDisplay.color}`}>
                      {statusDisplay.label}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={calculateCustomAgpa}
            className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Check Custom AGPA
          </button>
          {selectedCourses.size > 0 && (
            <button
              onClick={() => setSelectedCourses(new Set())}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Clear Selection
            </button>
          )}
        </div>

        {customAgpa !== null && (
          <div className="mt-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-5">
            <p className="text-sm font-medium text-slate-600">
              Custom AGPA ({selectedCourses.size} course{selectedCourses.size !== 1 ? "s" : ""} selected)
            </p>
            <p className="mt-2 text-3xl font-bold text-brand-700">
              {customAgpa.toFixed(3)}
            </p>
          </div>
        )}
      </div>

      {result.issues.length > 0 ? (
        <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
          <h3 className="text-base font-semibold text-slate-900">
            Validation notes
          </h3>
          <div className="mt-4 space-y-3">
            {result.issues.map((issue, index) => {
              const course = result.analyzedCourses.find(
                (c: AnalyzedCourse) => c.rowNumber === issue.rowNumber
              );
              return (
                <div
                  key={`${issue.rowNumber}-${issue.field}-${index}`}
                  className={`rounded-xl border p-4 ${
                    issue.severity === "error"
                      ? "border-red-200 bg-red-50"
                      : "border-amber-200 bg-amber-50"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 sm:items-center">
                    <div className="flex flex-wrap items-center gap-2">
                      {course && (
                        <>
                          <span className="rounded-md bg-white px-2 py-1 font-mono text-sm font-semibold text-slate-900">
                            {course.courseCode}
                          </span>
                          <span className="text-sm text-slate-600">
                            {course.courseName}
                          </span>
                        </>
                      )}
                      {!course && (
                        <span className="rounded-md bg-white px-2 py-1 text-sm font-medium text-slate-600">
                          Row {issue.rowNumber}
                        </span>
                      )}
                    </div>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs uppercase tracking-wide text-slate-600">
                      {issue.severity}
                    </span>
                  </div>
                  <div className="mt-2">
                    <p className="text-xs font-medium text-slate-500">
                      Field: {issue.field}
                    </p>
                    <p
                      className={`mt-1 text-sm ${
                        issue.severity === "error"
                          ? "text-red-800"
                          : "text-amber-900"
                      }`}
                    >
                      {issue.message}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default Dashboard;
