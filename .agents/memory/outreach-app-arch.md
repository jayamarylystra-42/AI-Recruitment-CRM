---
name: Outreach App Architecture
description: AI Outreach SaaS key decisions, gotchas, and patterns across the full stack
---

## Stack
- Frontend: React + Vite (`artifacts/outreach-app`, preview at `/`)
- Backend: Express (`artifacts/api-server`, port 8080, path `/api`)
- Auth: Replit-managed Clerk (`@clerk/express`, `@clerk/react`) — `publishableKeyFromHost` pattern
- AI: `@google/genai` SDK with `GEMINI_API_KEY`, model `gemini-2.5-flash`
- DB: PostgreSQL via Drizzle ORM (`lib/db`); codegen via Orval → `lib/api-client-react` + `lib/api-zod`
- Email: Real Gmail API per-user OAuth 2.0 via `googleapis` package

## DB Tables
- `companies` — AI score columns; indexes on priority, sector, hiringNow, aiLeadScore
- `campaigns` — status, email stats, rates
- `emails` — companyId/campaignId as plain integers (no FK to avoid circular Drizzle imports)
- `activities` — activity log
- `gmail_connections` — per-user OAuth tokens (encrypted at rest), email, tokenExpiry
- `gmail_oauth_states` — DB-backed CSRF state (10-min TTL, one-time consumed on callback)

## Gmail Integration
- Scopes: openid, email, profile, gmail.send, gmail.compose, gmail.modify
- OAuth params: access_type=offline, prompt=consent, include_granted_scopes=true
- Token security: AES-256-GCM via `artifacts/api-server/src/lib/crypto.ts`, key = PBKDF2(SESSION_SECRET, "outreach-gmail-token-v1", 100k, sha256)
- OAuth state: DB table `gmail_oauth_states`, one-time consumed, 10-min TTL
- Token refresh: googleapis `'tokens'` event re-encrypts and persists
- Send: Gmail API first → DB status "sent" only on success; draft: Gmail drafts.create

## Route Structure
- `/api/gmail/callback` — PUBLIC (mounted before requireAuth); Google redirects here
- `/api/oauth-test` — PUBLIC diagnostics endpoint; shows config, masked client ID, redirect URI, action items
- `/api/gmail/status|auth|disconnect` — protected by requireAuth
- Frontend `/oauth-test` — public page (no Clerk required); calls /api/oauth-test
- Frontend `/settings` — detects ?gmail=connected or ?gmail=error query params on load

## Common 403 Fix (Google OAuth Testing Mode)
- Google OAuth consent screen in "Testing" mode requires adding the user's email as a Test User
- At: console.cloud.google.com → APIs & Services → OAuth consent screen → Test users
- Redirect URI registered: `https://${REPLIT_DEV_DOMAIN}/api/gmail/callback`
- For production: add the production domain's callback URL to Google Cloud Console OAuth credentials

## Logging (server-side)
All OAuth events logged with `[GMAIL OAUTH]` prefix:
- Auth URL generation: logs client ID, redirect URI, scopes, state (truncated), full URL
- Callback: logs all query params, redirect URI, Google errors with error_description, token response (present/absent, not values), userinfo result

## Key Frontend Patterns
- CSS: Google Fonts `@import url(...)` must be line 1 of `index.css`
- `useListEmails` returns `Email[]` directly
- Gmail custom hooks in `artifacts/outreach-app/src/lib/gmail-api.ts` (not codegen)
