import { useMemo, useState } from "react";
import { BarChart3, CircleHelp, Home, Info } from "lucide-react";
import UploadZone from "./components/UploadZone";
import Dashboard from "./components/Dashboard";
import GradeScaleEditor from "./components/GradeScaleEditor";
import { analyzeAcademicRows } from "./lib/academic";
import { defaultGradeScale } from "./lib/gradeScale";
import { parseExcelFile } from "./lib/parser";
import type { AnalysisResult, AppPage, GradeScale } from "./lib/types";

const App = () => {
  const [activePage, setActivePage] = useState<AppPage>("home");
  const [gradeScale, setGradeScale] = useState<GradeScale>(defaultGradeScale);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
      setUploadError("Invalid file type. Please upload an .xlsx or .xls file.");
      return;
    }

    setLoading(true);
    setUploadError(null);

    try {
      const { rows, headers, missingRequired } = await parseExcelFile(file);

      if (rows.length === 0) {
        setUploadError("No data rows were found in the first sheet.");
        setLoading(false);
        return;
      }

      if (missingRequired.length > 0) {
        setUploadError(
          `Missing required columns: ${missingRequired.join(", ")}.`
        );
        setLoading(false);
        return;
      }

      const result = analyzeAcademicRows(rows, gradeScale);
      result.headersFound = headers;
      setAnalysis(result);
      setActivePage("results");
    } catch {
      setUploadError(
        "Could not read this file. Please check that it is a valid Excel .xlsx file."
      );
    } finally {
      setLoading(false);
    }
  };

  const recomputedAnalysis = useMemo(() => {
    if (!analysis) return null;
    const rows = analysis.analyzedCourses.map((course) => ({
      rowNumber: course.rowNumber,
      courseCode: course.courseCode,
      courseName: course.courseName,
      lastOfferedYear: course.lastOfferedYear,
      progressStatus: course.progressStatus,
      grade: course.grade,
      attempts: course.attempts,
      eligibilityCompletedYears: course.eligibilityCompletedYears,
      eligibilityLeft: course.eligibilityLeft,
    }));

    const result = analyzeAcademicRows(rows, gradeScale);
    result.headersFound = analysis.headersFound;
    return result;
  }, [analysis, gradeScale]);

  const navItems: Array<{
    key: AppPage;
    label: string;
    icon: React.ReactNode;
  }> = [
    { key: "home", label: "Home", icon: <Home className="h-4 w-4" /> },
    {
      key: "results",
      label: "Results",
      icon: <BarChart3 className="h-4 w-4" />,
    },
    { key: "help", label: "Help", icon: <CircleHelp className="h-4 w-4" /> },
    { key: "about", label: "About", icon: <Info className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header Banner */}
      <div className="w-full bg-gradient-to-r from-brand-700 to-brand-600">
        <img
          src="/src/assets/images/HeaderBanner.png"
          alt="Academic Performance Analyzer Banner"
          className="w-full object-cover"
          style={{ maxHeight: "200px" }}
        />
      </div>

      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="space-y-1">
            <h1 className="text-lg font-bold text-slate-900 sm:text-xl">
              Academic Performance Analyzer
            </h1>
            <p className="text-sm text-slate-600">
              Open website → Upload file → View AGPA and credit summaries
            </p>
          </div>
          <nav className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1 sm:flex sm:flex-wrap sm:items-center">
            {navItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setActivePage(item.key)}
                className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm transition ${
                  activePage === item.key
                    ? "bg-white font-medium text-brand-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        {activePage === "home" ? (
          <>
            <UploadZone
              isLoading={loading}
              error={uploadError}
              onFileSelect={handleFileSelect}
            />
            <GradeScaleEditor
              gradeScale={gradeScale}
              onGradeScaleChange={setGradeScale}
            />
          </>
        ) : null}

        {activePage === "results" ? (
          recomputedAnalysis ? (
            <Dashboard result={recomputedAnalysis} />
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <p className="text-lg font-medium text-slate-900">
                No results to display yet.
              </p>
              <p className="mt-2 text-slate-600">
                Upload an Excel file from the Home page to start analyzing.
              </p>
              <button
                className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                onClick={() => setActivePage("home")}
              >
                Go to Home
              </button>
            </div>
          )
        ) : null}

        {activePage === "help" ? (
          <section className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                How it works
              </h2>
              <ol className="mt-4 list-decimal space-y-3 pl-6 text-slate-700">
                <li className="text-sm sm:text-base">
                  <strong>Prepare your file:</strong> Create or export an Excel
                  file (.xlsx or .xls) with your academic results. Required
                  columns are Course Code, Course Name, Progress Status, and
                  Grade.
                </li>
                <li className="text-sm sm:text-base">
                  <strong>Upload:</strong> Go to the Home page and drag/drop
                  your file into the upload area, or click to browse and select
                  it.
                </li>
                <li className="text-sm sm:text-base">
                  <strong>Review results:</strong> The app instantly analyzes
                  your data and shows AGPA, credits, detailed breakdowns by
                  level and category, and a full course table.
                </li>
                <li className="text-sm sm:text-base">
                  <strong>Export:</strong> Download your summary as PDF or Excel
                  for records or sharing.
                </li>
              </ol>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h3 className="text-lg font-semibold text-slate-900 sm:text-xl">
                Course code format
              </h3>
              <p className="mt-3 text-sm text-slate-600">
                Your course codes must follow a standard format (e.g.,{" "}
                <code className="rounded bg-slate-100 px-2 py-1 font-mono text-slate-700">
                  CVM5402
                </code>
                ):
              </p>
              <ul className="mt-3 space-y-2 pl-5 text-sm text-slate-700">
                <li>
                  <strong>CV</strong> = Department (first 2 letters)
                </li>
                <li>
                  <strong>M</strong> = Category (3rd letter)
                </li>
                <li>
                  <strong>5</strong> = Level (4th digit)
                </li>
                <li>
                  <strong>4</strong> = Credit rate (5th digit)
                </li>
                <li>
                  <strong>02</strong> = Serial number (last 2 digits)
                </li>
              </ul>
            </div>

            {/* <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h3 className="text-lg font-semibold text-slate-900 sm:text-xl">
                Result classifications
              </h3>
              <p className="mt-3 text-sm text-slate-600">
                The app classifies each course result as:
              </p>
              <ul className="mt-3 space-y-2 pl-5 text-sm text-slate-700">
                <li>
                  <strong>Counted:</strong> Grade C or above, counts toward AGPA
                  and credits.
                </li>
                <li>
                  <strong>Resit:</strong> Grade below C. Must be repeated to
                  earn credits.
                </li>
                <li>
                  <strong>Pass (no credit):</strong> Result marked as P. Course
                  passed but credits not counted.
                </li>
                <li>
                  <strong>Repeat subject:</strong> Result marked as RX or FA.
                  Course must be repeated.
                </li>
              </ul>
            </div> */}

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h3 className="text-lg font-semibold text-slate-900 sm:text-xl">
                Grade scale
              </h3>
              <p className="mt-3 text-sm text-slate-600">
                The default grade scale is configurable on the Home page. Adjust
                it if your institution uses different grading policies.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-slate-700 sm:grid-cols-3 sm:gap-3">
                <div>A+ = 4.0</div>
                <div>A = 4.0</div>
                <div>A- = 3.7</div>
                <div>B+ = 3.3</div>
                <div>B = 3.0</div>
                <div>B- = 2.7</div>
                <div>C+ = 2.3</div>
                <div>C = 2.0</div>
                <div>C- = 1.7</div>
                <div>D+ = 1.3</div>
                <div>D = 1.0</div>
                <div>F = 0.0</div>
              </div>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm sm:p-8">
              <h3 className="text-lg font-semibold text-blue-900 sm:text-xl">
                AGPA calculation
              </h3>
              <p className="mt-3 text-sm text-blue-800">
                AGPA (Overall GPA) is calculated as:
              </p>
              <p className="mt-2 font-mono text-sm text-blue-900">
                AGPA = Total Weighted Points / Total Credits Passed
              </p>
              <p className="mt-3 text-sm text-blue-800">
                where Weighted Points = Grade Point × Credit Rate per course
              </p>
              <p className="mt-3 text-sm text-blue-800">
                Only courses marked as "Counted" are included in the
                calculation.
              </p>
            </div>
          </section>
        ) : null}

        {activePage === "about" ? (
          <section className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                About Academic Performance Analyzer
              </h2>
              <p className="mt-4 text-sm text-slate-700 sm:text-base">
                Academic Performance Analyzer is a free, open-access tool
                designed to help students instantly analyze their academic
                performance. Simply upload your results file and get
                comprehensive summaries including AGPA, course breakdowns, and
                detailed insights.
              </p>
              <p className="mt-3 text-sm text-slate-700 sm:text-base">
                <strong>No login required.</strong> No accounts. No sign-ups. No
                fees. Just upload and analyze.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h3 className="text-lg font-semibold text-slate-900 sm:text-xl">
                Key features
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-700 sm:text-base">
                <li className="flex gap-3">
                  <span className="text-brand-600">✓</span>
                  <span>
                    <strong>Fast file upload:</strong> Drag/drop or click to
                    upload .xlsx or .xls files
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-brand-600">✓</span>
                  <span>
                    <strong>Instant analysis:</strong> Results calculated
                    immediately in your browser
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-brand-600">✓</span>
                  <span>
                    <strong>Comprehensive summaries:</strong> AGPA, credits by
                    level/category, detailed tables
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-brand-600">✓</span>
                  <span>
                    <strong>Export options:</strong> Download results as PDF or
                    Excel
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-brand-600">✓</span>
                  <span>
                    <strong>Customizable grade scale:</strong> Adjust grading
                    policy to match your institution
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-brand-600">✓</span>
                  <span>
                    <strong>Mobile-friendly:</strong> Works on desktop, tablet,
                    and mobile devices
                  </span>
                </li>
              </ul>
            </div>

            {/* <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h3 className="text-lg font-semibold text-slate-900 sm:text-xl">
                Technology
              </h3>
              <p className="mt-3 text-sm text-slate-700 sm:text-base">
                Built with modern, open-source technologies for speed and
                reliability:
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-700 sm:text-base">
                <li>
                  <strong>Frontend:</strong> React + TypeScript for interactive
                  UI
                </li>
                <li>
                  <strong>Styling:</strong> Tailwind CSS for responsive design
                </li>
                <li>
                  <strong>File parsing:</strong> SheetJS for Excel processing
                </li>
                <li>
                  <strong>Visualization:</strong> Chart.js for analytics charts
                </li>
                <li>
                  <strong>Export:</strong> jsPDF and SheetJS for PDF/Excel
                  generation
                </li>
              </ul>
            </div> */}

            <div className="rounded-2xl border border-green-200 bg-green-50 p-6 shadow-sm sm:p-8">
              <h3 className="text-lg font-semibold text-green-900 sm:text-xl">
                Privacy policy
              </h3>
              <div className="mt-3 space-y-3 text-sm text-green-900">
                <p>
                  <strong>Your data is yours.</strong> We do not store, collect,
                  or transmit your academic files to any server.
                </p>
                <p>
                  <strong>Browser-only processing:</strong> All analysis happens
                  locally in your web browser. Files are never uploaded to
                  external servers.
                </p>
                <p>
                  <strong>No cookies or tracking:</strong> We do not use
                  cookies, analytics, or any tracking technologies. Your privacy
                  is completely protected.
                </p>
                <p>
                  <strong>No personal data collection:</strong> We do not ask
                  for your name, email, student ID, or any personally
                  identifiable information.
                </p>
                <p>
                  <strong>Cache only:</strong> Your browser may cache the
                  application for offline use, but no data is saved or
                  transmitted.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm sm:p-8">
              <h3 className="text-lg font-semibold text-amber-900 sm:text-xl">
                Terms & Conditions
              </h3>
              <div className="mt-3 space-y-3 text-sm text-amber-900">
                <div>
                  <p className="font-semibold">1. Use of service</p>
                  <p className="mt-1">
                    This tool is provided "as-is" for educational purposes. By
                    using this tool, you agree to use it in compliance with all
                    applicable laws and your institution's policies.
                  </p>
                </div>
                <div>
                  <p className="font-semibold">2. Accuracy disclaimer</p>
                  <p className="mt-1">
                    While we strive for accuracy, Academic Performance Analyzer
                    is provided without warranty. Users are responsible for
                    verifying results with their institution's official records.
                    Always confirm your AGPA and credits with your registrar.
                  </p>
                </div>
                <div>
                  <p className="font-semibold">3. File format requirements</p>
                  <p className="mt-1">
                    The tool accepts .xlsx and .xls files. Ensure your file
                    includes required columns: Course Code, Course Name,
                    Progress Status, and Grade. The tool will validate and
                    report any issues.
                  </p>
                </div>
                <div>
                  <p className="font-semibold">4. No liability</p>
                  <p className="mt-1">
                    We are not responsible for errors in data entry, calculation
                    mistakes due to incorrect data, or any consequences of using
                    this tool. Use this tool at your own discretion.
                  </p>
                </div>
                <div>
                  <p className="font-semibold">5. Free service</p>
                  <p className="mt-1">
                    This tool is provided free of charge. There are no hidden
                    fees or premium features. All functionality is available to
                    all users at no cost.
                  </p>
                </div>
                <div>
                  <p className="font-semibold">6. No registration required</p>
                  <p className="mt-1">
                    You do not need to create an account, provide personal
                    information, or register to use this tool. It is completely
                    anonymous and free.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h3 className="text-lg font-semibold text-slate-900 sm:text-xl">
                Support & feedback
              </h3>
              <p className="mt-3 text-sm text-slate-700 sm:text-base">
                Have questions or found an issue? This tool is maintained to
                serve students. Report bugs or suggest features by contacting
                the development team.
              </p>
              <p className="mt-3 text-sm text-slate-600 sm:text-base">
                This tool is open-source and community-driven. Contributions and
                feedback are always welcome.
              </p>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
};

export default App;
