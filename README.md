# 한국어 품사 워드클라우드

수업 시간에 학생이 준비한 한국어 텍스트를 입력하면 OpenAI가 9품사 학습용 단어를 추출하고, 학생이 품사를 선택한 뒤 개인 워드클라우드를 확인하는 웹앱입니다. 교사는 비밀번호로 대시보드에 들어가 제출 현황, 점수, 오답, 워드클라우드를 확인하고 학생별 또는 반별로 제출을 확정할 수 있습니다.

## 기술 구성

- Next.js App Router
- Vercel 배포
- OpenAI API
- Google Sheets 저장소
- Google service account 인증

## Google Sheet 준비

스프레드시트 첫 행에 아래 컬럼을 정확히 준비합니다.

```text
class
student_number
student_name
locked
submitted_at
updated_at
transcript_text
ai_analysis_json
student_choices_json
answer_key_json
grading_json
score
incorrect_summary
wordcloud_json
```

수업 전에 `class`, `student_number`, `student_name`을 채워둡니다. `locked`는 비워두거나 `FALSE`로 둡니다.

Google Cloud에서 service account를 만들고, service account 이메일을 해당 스프레드시트에 편집자로 공유합니다.

## 환경변수

`.env.local` 또는 Vercel 환경변수에 설정합니다.

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

`GOOGLE_PRIVATE_KEY`는 줄바꿈이 `\n`으로 들어가도 앱에서 실제 줄바꿈으로 변환합니다.

## 로컬 실행

```bash
npm install --cache .npm-cache
npm run dev
```

학생 화면:

```text
http://localhost:3000
```

교사용 화면:

```text
http://localhost:3000/teacher
```

## 검증

```bash
npm test
npm run build
```

## Vercel 배포

1. GitHub 저장소를 Vercel에 연결합니다.
2. Vercel 프로젝트 환경변수에 위 값을 추가합니다.
3. 배포 후 학생에게 루트 URL을 공유합니다.
4. 교사는 `/teacher`로 접속합니다.

## 현재 범위

- 학생 명단 검증은 `반 + 학번 + 이름` 완전 일치입니다.
- 학생은 교사가 확정하기 전까지 다시 제출할 수 있습니다.
- 채점 결과는 학생 화면에 즉시 공개하지 않고 저장소에 기록합니다.
- Supabase는 설계에 반영되어 있지만, 현재 구현은 Google Sheets 저장소만 활성화되어 있습니다.
