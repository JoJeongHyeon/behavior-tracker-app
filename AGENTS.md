<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project Working Rules

- For trusted user flows such as auth, saving, and deployment, always show loading, success, failure, and the next action in the UI.
- For email auth, OAuth, and deployment URLs, check local vs production redirects and environment variables before shipping.
- Use polite, concise Korean service copy. Avoid casual speech, excessive praise, and long AI-like explanations.
- Never commit real secret files such as `.env.local`; keep `.env.example` tracked and current.
- When changing behavior, update the relevant docs: `README.md`, `docs/STATUS.md`, `docs/HOW_TO_CHECK.md`, and `docs/AUTH.md` when auth is affected.
- Before finishing implementation work, run `npm run lint` and `npm run build`; after deployment, verify the production URL responds.
