import { useMemo } from "react";
import type { GradeScale } from "../lib/types";

interface GradeScaleEditorProps {
  gradeScale: GradeScale;
  onGradeScaleChange: (next: GradeScale) => void;
}

const GradeScaleEditor = ({
  gradeScale,
  onGradeScaleChange,
}: GradeScaleEditorProps) => {
  const grades = useMemo(() => Object.keys(gradeScale).sort(), [gradeScale]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
        Grade scale (editable)
      </h3>
      <p className="mt-1 text-sm text-slate-600">
        Adjust if your university uses a different grading policy.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {grades.map((grade) => (
          <label key={grade} className="rounded-lg border border-slate-200 p-3">
            <span className="text-sm font-medium text-slate-700">{grade}</span>
            <input
              type="number"
              step="0.1"
              min={0}
              max={4}
              value={gradeScale[grade]}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (Number.isNaN(value)) return;
                onGradeScaleChange({ ...gradeScale, [grade]: value });
              }}
              className="mt-2 w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-brand-500 focus:outline-none"
            />
          </label>
        ))}
      </div>
    </section>
  );
};

export default GradeScaleEditor;
