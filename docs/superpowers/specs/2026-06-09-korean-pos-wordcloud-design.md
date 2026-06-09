# Korean POS Wordcloud Classroom App Design

## Summary

Build a Vercel-hosted web app for a Korean grammar activity. Students enter class, student number, name, and prepared transcript text. The server verifies the student against a prepared roster, asks OpenAI to extract words suitable for learning the Korean nine parts of speech, lets the student choose a part of speech for each word, and generates a personal wordcloud.

Teachers sign in with a teacher password. The teacher dashboard shows live submission status, scores and incorrect answers, wordcloud previews, and an enlarged view for each student. Teachers can use AI-generated answer keys by default, edit answer keys when needed, and lock submissions student-by-student or for an entire class. Locked submissions cannot be edited by students.

Students do not need to see grading results in the web app. Scores and grading details are written to the configured storage backend for later teacher review. The first version should support Google Sheets as the simplest classroom storage option and Supabase as a more structured free-tier database option.

## Goals

- Let each student create a wordcloud from their own Korean transcript text.
- Use OpenAI to extract useful word candidates and identify the expected Korean nine-part-of-speech answer for each word.
- Let students classify each extracted word into one of the Korean nine parts of speech.
- Let the teacher choose between Google Sheets storage and Supabase storage.
- Give the teacher a password-protected dashboard with live visibility into class progress.
- Support student edits until the teacher locks either that student or the whole class.
- Keep OpenAI, Google, and Supabase credentials on the server only.

## Non-Goals

- Audio upload or speech-to-text transcription. Students prepare text before using the site.
- Student account creation.
- Immediate student-facing grading feedback.
- A full multi-tenant school platform with separate teacher accounts.
- Paid database infrastructure.

## Product Flows

### Student Flow

1. Student opens the site.
2. Student enters class, student number, name, and transcript text.
3. Server checks the configured roster backend for a matching class, student number, and name.
4. If the matching roster record is locked, the site blocks editing and shows that the submission has been finalized.
5. If editing is allowed, the server sends the text to OpenAI.
6. OpenAI returns word candidates, frequency counts, and the expected part of speech for each candidate.
7. Student sees the extracted words and selects one of the nine Korean parts of speech for each word.
8. Student submits choices.
9. Server stores transcript text, AI analysis, student choices, grading result, and generated wordcloud data in the configured storage backend.
10. Student sees their own wordcloud and submitted choices.

### Teacher Flow

1. Teacher opens `/teacher`.
2. Teacher enters the teacher password.
3. Dashboard loads roster records from the configured storage backend.
4. Dashboard shows each student's class, number, name, submission status, lock status, score, incorrect items, and wordcloud preview.
5. Teacher can filter by class and status.
6. Teacher clicks a student row/card to open an enlarged wordcloud and detailed analysis.
7. Teacher can edit AI answer keys for a student or selected word.
8. When an answer key changes, the server recalculates grading and updates the configured storage backend.
9. Teacher can lock one student or lock all students in a class.
10. Dashboard refreshes automatically so classroom progress is visible during the activity.

## Korean Parts Of Speech

The app uses the school grammar nine-part-of-speech categories:

- 명사
- 대명사
- 수사
- 동사
- 형용사
- 관형사
- 부사
- 조사
- 감탄사

OpenAI should return only candidates that are useful for this learning activity. It should avoid flooding students with low-value repeated particles or ambiguous fragments unless they are pedagogically useful for identifying a part of speech.

## Word Extraction And AI Analysis

The server calls OpenAI after a verified student submits transcript text. The model returns structured JSON, not prose.

Each extracted item contains:

- `surface`: displayed word or token
- `lemma`: base form when useful
- `pos`: expected Korean part of speech
- `frequency`: count in the submitted text
- `reason`: short Korean explanation for teacher review
- `confidence`: model confidence from 0 to 1

The prompt should tell the model:

- The activity is for Korean nine parts of speech.
- Prefer words that help students practice distinguishing parts of speech.
- Preserve Korean labels exactly as one of the nine allowed categories.
- Return valid JSON matching the schema.
- Keep the candidate list manageable for classroom use.

The first version should cap the student classification list to a reasonable number, such as 20 to 40 useful candidates, while preserving frequency counts for the wordcloud. The exact cap can be an environment variable or server constant.

## Wordcloud Behavior

The student and teacher wordclouds use the same data:

- Word size reflects frequency.
- The displayed word text is black.
- Part-of-speech identity appears through a colored visual marker, such as a tag, badge, underline, outline, or small dot.
- Hover or click shows word, part of speech, frequency, student choice, AI answer, and correctness where relevant.

Part-of-speech colors must be consistent across the app and visible to colorblind users when paired with text labels in details.

## Storage Options

The app should support two storage backends so the teacher can choose the setup that fits the class:

1. Google Sheets: simplest to inspect manually, easy for teachers who already use spreadsheets.
2. Supabase: more database-like, better for structured records, filtering, locking, and future growth while staying on a free tier for small classroom use.

Use a storage adapter boundary so the app logic does not depend directly on either backend. Student and teacher API routes call a shared storage interface, and the selected backend is controlled by an environment variable.

Recommended environment variable:

- `STORAGE_BACKEND`: `google_sheets` or `supabase`

The implementation should begin with both adapters in mind. If schedule forces a staged build, Google Sheets can be implemented first because it matches the teacher workflow, but Supabase must be represented in the schema and storage interface from the start.

## Google Sheets Backend

The Google Sheet is prepared before class with roster rows. The minimum columns are:

- `class`
- `student_number`
- `student_name`
- `locked`
- `submitted_at`
- `updated_at`
- `transcript_text`
- `ai_analysis_json`
- `student_choices_json`
- `answer_key_json`
- `grading_json`
- `score`
- `incorrect_summary`
- `wordcloud_json`

Roster matching uses exact `class`, `student_number`, and `student_name`. A student can only submit when a matching row exists and `locked` is not true.

For a resubmission before locking, the app overwrites the same roster row with the latest transcript, analysis, student choices, grading, and wordcloud data. Previous versions are not required for the first version.

## Supabase Backend

Supabase is an optional free-tier backend for teachers who prefer a real database. The app should use Supabase from server API routes only, with service credentials kept in Vercel environment variables.

Minimum tables:

### `students`

- `id`
- `class`
- `student_number`
- `student_name`
- `locked`
- `created_at`
- `updated_at`

Unique constraint:

- `class`, `student_number`, `student_name`

### `submissions`

- `id`
- `student_id`
- `submitted_at`
- `updated_at`
- `transcript_text`
- `ai_analysis_json`
- `student_choices_json`
- `answer_key_json`
- `grading_json`
- `score`
- `incorrect_summary`
- `wordcloud_json`

The first version can keep one current submission per student. Resubmission before lock updates the current submission instead of creating a full history.

### `classes`

- `id`
- `class`
- `locked`
- `created_at`
- `updated_at`

This table supports class-level locking. If a class is locked, all students in that class are treated as locked even if their individual `locked` value is false.

Supabase row-level security is not required for student browser access because browser clients do not call Supabase directly. The server API owns all reads and writes. If direct Supabase client access is added later, row-level security must be designed before enabling it.

## Server Architecture

Use Next.js on Vercel.

Client routes:

- `/`: student input, classification, and personal wordcloud.
- `/teacher`: password-protected teacher dashboard.

Server API routes:

- `POST /api/student/analyze`: verify roster row, check lock, call OpenAI, return extracted candidates.
- `POST /api/student/submit`: verify roster record, check lock, grade choices, store results in the configured storage backend.
- `POST /api/teacher/login`: validate teacher password and issue a short-lived session token or secure cookie.
- `GET /api/teacher/roster`: return dashboard data from the configured storage backend.
- `GET /api/teacher/student`: return one student's detailed result.
- `POST /api/teacher/answer-key`: update answer key and recalculate grading.
- `POST /api/teacher/lock-student`: lock one student's row.
- `POST /api/teacher/lock-class`: lock every row for a class.

Shared modules:

- `storage`: shared interface for roster lookup, submission update, grading update, dashboard reads, and lock operations.
- `googleSheetsStorage`: implements the storage interface with Google Sheets.
- `supabaseStorage`: implements the storage interface with Supabase.
- `openaiAnalyzer`: sends transcript text to OpenAI and validates structured output.
- `grading`: compares student choices against current answer keys.
- `wordcloudData`: prepares display data from frequency and part-of-speech records.
- `auth`: teacher password validation and session handling.

## Data Flow

Student analysis:

1. Browser sends class, student number, name, and transcript text.
2. Server finds roster record in the configured storage backend.
3. Server rejects if no match or row is locked.
4. Server calls OpenAI.
5. Server validates and normalizes AI JSON.
6. Browser renders word cards with nine part-of-speech choices.

Student submit:

1. Browser sends identity fields, transcript text, AI candidate IDs, and student choices.
2. Server finds roster record and checks lock again.
3. Server grades choices against the AI answer key.
4. Server builds wordcloud data.
5. Server overwrites the matching storage record.
6. Browser renders the student's wordcloud.

Teacher dashboard:

1. Browser authenticates with teacher password.
2. Browser polls or refreshes dashboard data periodically.
3. Server reads the configured storage backend and returns compact dashboard records.
4. Teacher actions update rows and trigger grading recalculation where needed.

## Security And Configuration

Environment variables:

- `OPENAI_API_KEY`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_SHEET_ID`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TEACHER_PASSWORD`
- `TEACHER_SESSION_SECRET`
- `STORAGE_BACKEND`

Security rules:

- Never expose OpenAI, Google, or Supabase credentials to the browser.
- Student APIs must verify roster identity on every request.
- Teacher APIs must require a valid teacher session.
- Lock checks happen on the server during both analysis and submit.
- Store only classroom activity data needed for this app.

## Live Updates

The first version can use simple polling for reliability on Vercel:

- Teacher dashboard refreshes every few seconds.
- Student page does not need live updates after submission except normal response handling.

Server-sent events or WebSockets are not required for the first version because polling is simpler to operate on Vercel and works with both storage backends.

## Error Handling

Student-facing errors should be clear and short:

- Roster mismatch: class, student number, or name does not match the prepared roster.
- Locked submission: the teacher has finalized this submission.
- AI analysis failure: try again or ask the teacher.
- Empty or too-short text: enter enough transcript text for analysis.

Teacher-facing errors should include enough detail to act:

- Google Sheets connection failure.
- Supabase connection failure.
- Missing required columns.
- OpenAI response validation failure.
- Attempt to update a locked row when not allowed.

The server should validate OpenAI output before using it. If the JSON is invalid or includes unsupported part-of-speech labels, the request fails cleanly instead of storing malformed data.

## Testing Strategy

Unit tests:

- Roster matching.
- Lock checks.
- Grading comparison.
- OpenAI output validation.
- Wordcloud data generation.

Integration tests:

- Student analyze flow with mocked OpenAI and mocked storage.
- Student submit flow with overwrite behavior.
- Teacher answer-key edit and regrading.
- Student and class lock behavior.

Manual checks:

- Vercel environment variables are set for the selected storage backend.
- Google service account has access to the target Sheet.
- Supabase project URL and service role key work when `STORAGE_BACKEND=supabase`.
- Teacher password protects `/teacher`.
- A student cannot edit after teacher lock.
- Teacher dashboard updates after student submission.

## Open Questions For Implementation Planning

- Exact Google Sheet tab name.
- Whether the first classroom deployment should use Google Sheets or Supabase.
- Exact visual style and part-of-speech color palette.
- Whether the classification list cap should be 20, 30, or configurable.
- Whether teacher sessions should use a secure cookie or signed token stored in memory.
- Whether the teacher can unlock a finalized row in the first version.

## Recommended First Version

Build the first version as a single Next.js app deployed on Vercel. Use a storage adapter that can target either Google Sheets or Supabase, OpenAI for Korean part-of-speech candidate extraction and answer-key generation, server-side grading, student-side wordcloud display, and a password-protected teacher dashboard with polling-based live updates. Default to Google Sheets for teacher-friendly manual inspection, but keep Supabase available for a more structured free-tier database setup.
