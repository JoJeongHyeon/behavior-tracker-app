# 행동 트래커

하루 단위 행동을 기록하고 다시 보는 개인용 웹앱입니다. 몸무게, 식단, 운동, 공부, 시쓰기, 책읽기를 먼저 `예/아니오`로 고른 뒤 필요한 항목만 입력합니다.

## 기술 스택

- Next.js + React + TypeScript
- Tailwind CSS
- Supabase Auth + Database
- Motion for React
- Vercel 배포
- Pretendard 폰트

## 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

## Supabase 연결

1. Supabase 프로젝트를 새로 만듭니다.
2. `supabase/schema.sql` 내용을 Supabase SQL Editor에서 실행합니다.
3. `.env.example`을 참고해서 `.env.local`을 만듭니다.
4. 아래 값을 채웁니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

환경변수가 없으면 앱은 브라우저 임시 저장 모드로 열립니다. 이 모드는 테스트용이며 모바일과 PC 동기화는 되지 않습니다.

## 배포

Vercel에서 이 저장소를 연결하고 Supabase 환경변수를 등록합니다. 도메인을 구매하지 않으면 Vercel 기본 주소로 사용할 수 있습니다.
