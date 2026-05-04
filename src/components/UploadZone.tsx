import {
  UploadCloud,
  FileSpreadsheet,
  AlertCircle,
  Download,
} from "lucide-react";
import { downloadSampleTemplate } from "../lib/parser";

interface UploadZoneProps {
  isLoading: boolean;
  error: string | null;
  onFileSelect: (file: File) => void;
}

const UploadZone = ({ isLoading, error, onFileSelect }: UploadZoneProps) => {
  const onInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    event.currentTarget.value = "";
  };

  const onDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const acceptedTypes = ".xlsx,.xls";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">
        Upload your academic results file
      </h2>
      <p className="mt-2 text-sm text-slate-600 sm:text-base">
        Select or drag and drop a .xlsx or .xls file. Your file is processed
        only in your browser.
      </p>

      <label
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-brand-500 bg-brand-50 p-6 text-center transition hover:bg-brand-100 sm:mt-6 sm:p-10"
      >
        <input
          type="file"
          accept={acceptedTypes}
          onChange={onInputChange}
          className="hidden"
        />
        <UploadCloud className="h-10 w-10 text-brand-600 sm:h-12 sm:w-12" />
        <p className="mt-4 text-sm font-medium text-slate-900 sm:text-base">
          Drop your .xlsx or .xls file here, or click to browse
        </p>
        <p className="mt-1 text-xs text-slate-600 sm:text-sm">
          Required columns: Course Code, Course Name, Progress Status, Grade
        </p>
      </label>

      <div className="mt-4 flex flex-col gap-3 text-sm sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={downloadSampleTemplate}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-slate-700 hover:bg-slate-50"
        >
          <Download className="h-4 w-4" /> Download sample .xlsx
        </button>
        <span className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-slate-700">
          <FileSpreadsheet className="h-4 w-4" /> Excel format only
        </span>
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm text-brand-700">Analyzing file…</p>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
          <p className="inline-flex items-center gap-2 font-medium">
            <AlertCircle className="h-4 w-4" /> {error}
          </p>
        </div>
      ) : null}
    </section>
  );
};

export default UploadZone;
