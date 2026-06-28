# 행동 트래커

하루 단위 행동을 기록하고 다시 보는 개인용 웹앱입니다. 몸무게, 식단, 운동, 공부, 시쓰기, 책읽기를 먼저 `예/아니오`로 고른 뒤 필요한 항목만 입력합니다.

## 바로 열기

- 배포 주소: https://behavior-tracker-app-khaki.vercel.app
- 로컬 주소: http://localhost:3000
- GitHub: https://github.com/JoJeongHyeon/behavior-tracker-app
- Supabase: https://supabase.com/dashboard/project/otlptxdkaoasfjgfxoys

## 지금 사용자가 할 일

1. 배포 주소에서 회원가입 또는 로그인한다.
2. 이메일 인증 메일이 오면 인증 링크를 누른다.
3. 오늘 기록을 하나 저장한다.
4. 기록 목록과 월간 요약에 반영되는지 확인한다.
5. 휴대폰에서도 배포 주소를 열어 입력이 편한지 확인한다.
6. `.env.local` 내용은 캡처하거나 공개 저장소에 올리지 않는다.

가입과 로그인 계획은 [docs/AUTH.md](docs/AUTH.md)에 따로 정리했습니다. 현재는 이메일/비밀번호 방식이고, 다음 업데이트 후보로 구글 로그인, 카카오 로그인, 네이버 로그인을 둡니다.

## 기술 스택

- Next.js + React + TypeScript
- Tailwind CSS
- Supabase Auth + Database
- Motion for React
- Vercel
- Pretendard

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

## Supabase 연결 상태

Supabase 프로젝트와 Vercel 환경변수는 이미 연결되어 있습니다.

- `daily_records` 테이블 생성 완료
- `books` 테이블 생성 완료
- 사용자별 기록 분리를 위한 RLS 정책 적용 완료
- Vercel production/preview/development 환경변수 설정 완료
- 로컬 `.env.local` 설정 완료

## VSCode에서 보는 방법

1. 프로젝트 열기:

```powershell
code C:\dev\behavior-tracker-app
```

2. VSCode 터미널에서 실행:

```bash
npm run dev
```

3. 터미널에 뜨는 `http://localhost:3000`을 `Ctrl + 클릭`한다.

또는 VSCode 명령 팔레트에서 `Simple Browser: Show`를 실행하고 `http://localhost:3000`을 입력한다.

## 다음 업데이트 후보

- 로그인/회원가입 안내 문구 다듬기
- 구글 로그인 추가
- 카카오 로그인 추가
- 네이버 로그인 추가
- 기록 삭제 기능
- 월간 요약 그래프
- 모바일 입력 흐름 개선
- 책 상세 화면
- 식단 통계 화면
- 디자인과 애니메이션 polish
- 옵시디언 Markdown 내보내기
