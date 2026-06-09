# 한국어 품사 활동 웹앱

중학교 1학년 한국어 품사 수업을 위한 Next.js 웹앱입니다. 학생이 2분 정도의 말하기 내용을 글로 옮겨 입력하면 AI가 중1 수준에서 명확하게 구분할 수 있는 품사 문제를 만들고, 학생은 품사를 고른 뒤 오답 피드백과 이미지 생성 프롬프트를 받습니다.

## 주요 기능

- 학번 4자리와 이름만으로 학생 참여
- 학번 앞 두 자리 기준 반 자동 배정
  - `11xx` → `1반`
  - `12xx` → `2반`
  - `13xx` → `3반`
  - `14xx` → `4반`
  - `15xx` → `5반`
- Google Sheets 반별 탭 자동 저장
- 시트에 없는 학생은 입력 시 자동 등록
- 중학교 1학년 수준의 쉬운 품사 문제 생성
- 입력이 길어도 빈도수가 높은 단어 20개까지만 출제
- 문장 종결 표현, 서술격조사, 용언의 활용형, 보조사, 접속부사 등 미학습 요소 제외
- 제출 후 오답 피드백 제공
- 학생별 이미지 생성 프롬프트 생성
- 새로고침 후 진행 상태 복원
- 시트에서 학생 행을 삭제하면 새로고침 시 처음부터 다시 시작
- 교사용 대시보드, 학생별 확정, 반 전체 확정, 출력 기능

## 기술 구성

- Next.js App Router
- OpenAI API
- Google Sheets API
- Google service account 인증
- Vitest 테스트

## Google Sheet 준비

반별 탭을 사용합니다. 탭 이름은 한글로 만듭니다.

```text
1반
2반
3반
4반
5반
6반
```

각 탭의 헤더는 `code.js`의 Apps Script 메뉴로 만들 수 있습니다.

1. Google Sheets에서 `확장 프로그램 > Apps Script`를 엽니다.
2. 이 저장소의 `code.js` 내용을 붙여넣습니다.
3. 저장 후 시트를 새로고침합니다.
4. 상단 메뉴 `품사 활동 > 반별 탭 준비`를 실행합니다.

현재 헤더는 다음 순서입니다.

```text
학번
이름
잠금
제출 일시
수정 일시
입력 문장
AI 분석 JSON
학생 선택 JSON
정답 JSON
채점 JSON
점수
오답 요약
워드클라우드 JSON
이미지 생성 프롬프트
```

`잠금`이 `FALSE`이면 학생이 다시 제출할 수 있고, `TRUE`이면 교사가 확정한 상태라 학생 수정이 막힙니다.

## Google Cloud 설정

1. Google Cloud 프로젝트를 준비합니다.
2. Google Sheets API를 사용 설정합니다.
3. 서비스 계정을 만들고 JSON 키를 발급합니다.
4. 서비스 계정 이메일을 Google Sheet에 편집자로 공유합니다.

## 환경변수

`.env.local` 또는 배포 환경변수에 설정합니다.

```bash
OPENAI_API_KEY=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_SHEET_ID=
TEACHER_PASSWORD=
TEACHER_SESSION_SECRET=
STORAGE_BACKEND=google_sheets
```

`GOOGLE_PRIVATE_KEY`는 줄바꿈이 `\n`으로 들어가도 앱에서 실제 줄바꿈으로 변환합니다.

## 로컬 실행

```bash
npm install
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

## 배포

1. GitHub 저장소를 Vercel에 연결합니다.
2. Vercel 프로젝트 환경변수에 위 값을 추가합니다.
3. 배포 후 학생에게 루트 URL을 공유합니다.
4. 교사는 `/teacher`로 접속합니다.

## 수업 운영 메모

- 학생은 학번과 이름을 입력하고, 말하기 내용을 글로 옮겨 붙입니다.
- AI는 중1 수준에서 명확한 후보만 남기고, 최종 문제는 빈도수가 높은 단어 20개까지로 제한합니다.
- 학생은 제출 후 하단에서 틀린 문제를 확인합니다.
- 교사는 대시보드에서 결과를 확인하고 확정할 수 있습니다.
- 교사용 출력 버튼은 현재 선택한 반 또는 전체 반의 결과를 인쇄/PDF로 출력합니다.
