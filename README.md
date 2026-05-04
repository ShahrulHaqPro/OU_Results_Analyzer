# Academic Performance Analyzer

A clean, fast, browser-based student academic analysis tool.
Deticated for OU.

No login, no signup, no authentication.

## Features

- Upload `.xlsx` or `.xls` results file (click or drag/drop)
- Parse and validate required columns
- Course code parsing
- AGPA and credit calculations
- AGPA by level
- Credits by level
- Credits by category
- Detailed searchable/filterable course table
- Export summary to PDF and Excel
- Privacy-first: all processing is client-side in browser

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS
- SheetJS (`xlsx`)
- Chart.js + react-chartjs-2
- jsPDF + jspdf-autotable

## Expected Input Columns

Recommended headers:

- `Course Code`
- `Course Name`
- `Last Offered Year`
- `Progress Status`
- `Grade`
- `Attempts`
- `Eligibility Completed Years`
- `Eligibility Left`

Required columns:

- `Course Code`
- `Course Name`
- `Progress Status`
- `Grade`

## Course Code Rule

Example: `DDM5402`

- `DD` = Department (first 2 chars)
- `M` = Category (3rd char)
- `5` = Level (4th char)
- `4` = Credit rate (5th char)
- `02` = Serial number (last 2 chars)

## AGPA Logic

- Weighted points per course = `gradePoint × credits`
- `AGPA = total weighted points / total passed credits`
- Only valid, passed courses are included
- Invalid rows are ignored and shown in validation notes

## Grade Scale (default)

- A+ = 4.0
- A = 4.0
- A- = 3.7
- B+ = 3.3
- B = 3.0
- B- = 2.7
- C+ = 2.3
- C = 2.0
- C- = 1.7
- D = 1.0
- D+ = 1.3
- F = 0.0

You can edit this in the UI.

## Setup

1. Install dependencies:

   npm install

2. Start dev server:

   npm run dev

3. Build for production:

   npm run build

4. Preview production build:

   npm run preview

## Privacy

- No account system
- No authentication
- No server-side storage of academic files
- All processing runs in the browser

## Optional Enhancements (future)

- Dark mode
- PWA/offline support
- Multiple semester comparison
- University-specific / Program-specific grading profiles
