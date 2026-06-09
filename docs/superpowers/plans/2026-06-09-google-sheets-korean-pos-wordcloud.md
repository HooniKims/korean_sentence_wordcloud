# Google Sheets Korean POS Wordcloud Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working Vercel-ready MVP of the Korean nine-parts-of-speech wordcloud classroom app using Google Sheets as the storage backend.

**Architecture:** Use a Next.js app with server API routes for OpenAI, Google Sheets, grading, and teacher auth. Keep all secrets on the server and expose only student and teacher workflows through React pages. Isolate storage behind a small interface so Supabase can be added later without rewriting app logic.

**Tech Stack:** Next.js App Router, TypeScript, React, Tailwind CSS, Vitest, React Testing Library, `openai`, `googleapis`, `zod`, `jose`, `d3-cloud`.

---

## File Structure

- Create `package.json`, `tsconfig.json`, `next.config.mjs`, `postcss.config.mjs`, `tailwind.config.ts`, `.eslintrc.json`, `.gitignore`, `.env.example`.
- Create `src/app/page.tsx` for the student workflow.
- Create `src/app/teacher/page.tsx` for the teacher workflow.
- Create `src/app/api/student/analyze/route.ts` and `src/app/api/student/submit/route.ts`.
- Create `src/app/api/teacher/login/route.ts`, `src/app/api/teacher/roster/route.ts`, `src/app/api/teacher/student/route.ts`, `src/app/api/teacher/answer-key/route.ts`, `src/app/api/teacher/lock-student/route.ts`, `src/app/api/teacher/lock-class/route.ts`.
- Create `src/components/WordCloud.tsx`, `src/components/PosPicker.tsx`, `src/components/TeacherDashboard.tsx`.
- Create `src/lib/pos.ts`, `src/lib/schemas.ts`, `src/lib/grading.ts`, `src/lib/wordcloud.ts`, `src/lib/openaiAnalyzer.ts`, `src/lib/storage/types.ts`, `src/lib/storage/googleSheetsStorage.ts`, `src/lib/storage/index.ts`, `src/lib/auth.ts`, `src/lib/env.ts`.
- Create tests under `src/lib/*.test.ts` and `src/lib/storage/*.test.ts`.

## Task 1: Scaffold Next.js Project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.mjs`
- Create: `postcss.config.mjs`
- Create: `tailwind.config.ts`
- Create: `.eslintrc.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`

- [ ] **Step 1: Add project metadata and scripts**

Create `package.json`:

```json
{
  "name": "korean-pos-wordcloud",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@types/d3-cloud": "^1.2.9",
    "d3-cloud": "^1.2.7",
    "googleapis": "^144.0.0",
    "jose": "^5.9.6",
    "next": "^15.0.0",
    "openai": "^4.73.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@types/node": "^22.10.1",
    "@types/react": "^19.0.1",
    "@types/react-dom": "^19.0.2",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.16.0",
    "eslint-config-next": "^15.0.0",
    "jsdom": "^25.0.1",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.16",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Add TypeScript and Next config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Create `next.config.mjs`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
```

- [ ] **Step 3: Add styling config**

Create `tailwind.config.ts`:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        paper: "#f8fafc"
      }
    }
  },
  plugins: []
};

export default config;
```

Create `postcss.config.mjs`:

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};
```

- [ ] **Step 4: Add app shell and environment example**

Create `.env.example`:

```bash
OPENAI_API_KEY=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_SHEET_ID=
GOOGLE_SHEET_TAB=Roster
TEACHER_PASSWORD=
TEACHER_SESSION_SECRET=
STORAGE_BACKEND=google_sheets
```

Create `src/app/layout.tsx`:

```tsx
import "./globals.css";

export const metadata = {
  title: "한국어 품사 워드클라우드",
  description: "수업용 한국어 9품사 워드클라우드 활동"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
```

Create `src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  background: #f8fafc;
  color: #111827;
}
```

- [ ] **Step 5: Install dependencies**

Run: `npm install`

Expected: dependencies install and `package-lock.json` is created.

- [ ] **Step 6: Commit scaffold**

Run:

```bash
git add .
git commit -m "chore: scaffold Next.js classroom app"
```

## Task 2: Core Domain Types And Validation

**Files:**
- Create: `src/lib/pos.ts`
- Create: `src/lib/schemas.ts`
- Create: `src/lib/env.ts`
- Test: `src/lib/schemas.test.ts`

- [ ] **Step 1: Define Korean POS constants**

Create `src/lib/pos.ts`:

```ts
export const KOREAN_POS = [
  "명사",
  "대명사",
  "수사",
  "동사",
  "형용사",
  "관형사",
  "부사",
  "조사",
  "감탄사"
] as const;

export type KoreanPos = (typeof KOREAN_POS)[number];

export const POS_COLORS: Record<KoreanPos, string> = {
  명사: "#2563eb",
  대명사: "#7c3aed",
  수사: "#0891b2",
  동사: "#dc2626",
  형용사: "#ea580c",
  관형사: "#16a34a",
  부사: "#9333ea",
  조사: "#64748b",
  감탄사: "#db2777"
};

export function isKoreanPos(value: string): value is KoreanPos {
  return (KOREAN_POS as readonly string[]).includes(value);
}
```

- [ ] **Step 2: Define shared schemas**

Create `src/lib/schemas.ts` with zod schemas for identity, analysis items, student choices, grading records, and dashboard rows. Use `z.enum(KOREAN_POS)` for part-of-speech values.

- [ ] **Step 3: Add schema tests**

Create `src/lib/schemas.test.ts` to assert valid POS values pass, unsupported labels fail, and a student identity requires class, student number, and name.

- [ ] **Step 4: Run tests**

Run: `npm test -- src/lib/schemas.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit domain schemas**

Run:

```bash
git add src/lib/pos.ts src/lib/schemas.ts src/lib/schemas.test.ts
git commit -m "feat: define Korean POS domain schemas"
```

## Task 3: Grading And Wordcloud Data

**Files:**
- Create: `src/lib/grading.ts`
- Create: `src/lib/grading.test.ts`
- Create: `src/lib/wordcloud.ts`
- Create: `src/lib/wordcloud.test.ts`

- [ ] **Step 1: Add grading tests**

Test that exact POS matches are correct, wrong choices are listed with expected and actual labels, and score is calculated as a percentage.

- [ ] **Step 2: Implement grading**

Create `gradeChoices(items, choices, answerKey)` returning `correctCount`, `totalCount`, `score`, and `incorrectItems`.

- [ ] **Step 3: Add wordcloud tests**

Test that generated wordcloud data preserves black word text, uses POS marker colors, and sizes words by frequency.

- [ ] **Step 4: Implement wordcloud data helper**

Create `buildWordcloudEntries(items, choices, answerKey, grading)` returning entries for UI rendering.

- [ ] **Step 5: Run tests and commit**

Run:

```bash
npm test -- src/lib/grading.test.ts src/lib/wordcloud.test.ts
git add src/lib/grading.ts src/lib/grading.test.ts src/lib/wordcloud.ts src/lib/wordcloud.test.ts
git commit -m "feat: add grading and wordcloud domain logic"
```

## Task 4: Google Sheets Storage Adapter

**Files:**
- Create: `src/lib/storage/types.ts`
- Create: `src/lib/storage/googleSheetsStorage.ts`
- Create: `src/lib/storage/index.ts`
- Test: `src/lib/storage/googleSheetsStorage.test.ts`

- [ ] **Step 1: Define storage interface**

Create methods for `findStudent`, `saveSubmission`, `getDashboardRows`, `getStudentDetail`, `updateAnswerKey`, `lockStudent`, and `lockClass`.

- [ ] **Step 2: Implement Google Sheets row mapping**

Map these columns exactly: `class`, `student_number`, `student_name`, `locked`, `submitted_at`, `updated_at`, `transcript_text`, `ai_analysis_json`, `student_choices_json`, `answer_key_json`, `grading_json`, `score`, `incorrect_summary`, `wordcloud_json`.

- [ ] **Step 3: Implement Google auth**

Use `google.auth.JWT` with `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY`. Normalize escaped private keys with `.replace(/\\n/g, "\n")`.

- [ ] **Step 4: Add row mapping tests**

Mock raw sheet rows and verify exact class-number-name matching, JSON parsing, lock handling, and update payload shape.

- [ ] **Step 5: Run tests and commit**

Run:

```bash
npm test -- src/lib/storage/googleSheetsStorage.test.ts
git add src/lib/storage
git commit -m "feat: add Google Sheets storage adapter"
```

## Task 5: OpenAI Analyzer

**Files:**
- Create: `src/lib/openaiAnalyzer.ts`
- Create: `src/lib/openaiAnalyzer.test.ts`

- [ ] **Step 1: Add OpenAI analyzer tests**

Mock the OpenAI client and verify the analyzer rejects unsupported POS labels, accepts valid JSON, and caps candidate count.

- [ ] **Step 2: Implement analyzer**

Use structured JSON prompting. The prompt must mention Korean nine parts of speech, classroom suitability, frequency, and valid labels only.

- [ ] **Step 3: Run tests and commit**

Run:

```bash
npm test -- src/lib/openaiAnalyzer.test.ts
git add src/lib/openaiAnalyzer.ts src/lib/openaiAnalyzer.test.ts
git commit -m "feat: add OpenAI Korean POS analyzer"
```

## Task 6: Student API Routes

**Files:**
- Create: `src/app/api/student/analyze/route.ts`
- Create: `src/app/api/student/submit/route.ts`

- [ ] **Step 1: Implement analyze route**

Validate request identity and transcript, verify roster, reject locked rows, call analyzer, return analysis items.

- [ ] **Step 2: Implement submit route**

Validate choices, recheck roster lock, grade against answer key, build wordcloud data, save submission, and return wordcloud entries.

- [ ] **Step 3: Run build and commit**

Run:

```bash
npm run build
git add src/app/api/student src/lib
git commit -m "feat: add student analysis and submission APIs"
```

## Task 7: Student UI

**Files:**
- Create: `src/components/PosPicker.tsx`
- Create: `src/components/WordCloud.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Build POS picker**

Render each AI-extracted word with nine POS buttons and require one choice per word before submission.

- [ ] **Step 2: Build wordcloud component**

Render black words with POS-colored markers. Use deterministic layout inputs so the first version is stable enough for classroom use.

- [ ] **Step 3: Build student page**

Implement three states: identity/text input, POS classification, submitted wordcloud.

- [ ] **Step 4: Run build and commit**

Run:

```bash
npm run build
git add src/app/page.tsx src/components/PosPicker.tsx src/components/WordCloud.tsx
git commit -m "feat: add student workflow UI"
```

## Task 8: Teacher Auth And Dashboard APIs

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/teacher/login/route.ts`
- Create: `src/app/api/teacher/roster/route.ts`
- Create: `src/app/api/teacher/student/route.ts`
- Create: `src/app/api/teacher/answer-key/route.ts`
- Create: `src/app/api/teacher/lock-student/route.ts`
- Create: `src/app/api/teacher/lock-class/route.ts`

- [ ] **Step 1: Implement teacher session cookie**

Validate password against `TEACHER_PASSWORD`, sign short-lived session with `TEACHER_SESSION_SECRET`, and require it on teacher routes.

- [ ] **Step 2: Implement dashboard and detail APIs**

Return compact roster records for the dashboard and full detail for one student.

- [ ] **Step 3: Implement answer-key and lock APIs**

Support answer-key edits with regrading, student lock, and class lock.

- [ ] **Step 4: Run build and commit**

Run:

```bash
npm run build
git add src/lib/auth.ts src/app/api/teacher
git commit -m "feat: add teacher dashboard APIs"
```

## Task 9: Teacher UI

**Files:**
- Create: `src/components/TeacherDashboard.tsx`
- Modify: `src/app/teacher/page.tsx`

- [ ] **Step 1: Build teacher login screen**

Show password input and call `/api/teacher/login`.

- [ ] **Step 2: Build dashboard table**

Show class, number, name, submitted state, locked state, score, incorrect summary, and wordcloud preview.

- [ ] **Step 3: Build student detail panel**

Click a student to show enlarged wordcloud, extracted words, student choices, answer key, correctness, and answer-key edit controls.

- [ ] **Step 4: Add polling**

Refresh dashboard data every few seconds while the teacher page is open.

- [ ] **Step 5: Run build and commit**

Run:

```bash
npm run build
git add src/app/teacher/page.tsx src/components/TeacherDashboard.tsx
git commit -m "feat: add teacher dashboard UI"
```

## Task 10: Final Verification And Docs

**Files:**
- Create: `README.md`
- Modify: `.env.example`

- [ ] **Step 1: Document setup**

Add README sections for Google Sheet columns, Vercel environment variables, OpenAI key, Google service account sharing, local development, and deployment.

- [ ] **Step 2: Run full verification**

Run:

```bash
npm test
npm run build
git status --short
```

Expected: tests pass, build succeeds, and only intended files are modified.

- [ ] **Step 3: Commit docs**

Run:

```bash
git add README.md .env.example
git commit -m "docs: add classroom app setup guide"
```

## Self-Review

- Spec coverage: Student input, OpenAI analysis, POS selection, Google Sheets storage, teacher password, dashboard, live polling, answer-key correction, grading, and locking are covered.
- Supabase: Included in the design spec but intentionally outside this first implementation plan because the user asked to start development with spreadsheets.
- Placeholder scan: No `TBD` or `TODO` items remain. Implementation details are assigned to exact files.
- Scope check: This is a single MVP plan. Audio upload, student accounts, and immediate student grading feedback remain out of scope.
