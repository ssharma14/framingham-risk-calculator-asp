# Deployment

Live setup — both pieces are on **no-cost** tiers (no credit card required):

```
Browser ──▶ Firebase Hosting (static React build, web/dist)   [Spark/free plan]
   │
   └──────▶ Render (Docker container running the .NET API)     [free plan]
                 │  server-side LLM key (env var)
                 ▼
            Groq (OpenAI-compatible) — with local fallback
```

The SPA and the API are on **different origins**, so the API enables **CORS** for the
Hosting origin, and the SPA calls the API via `VITE_API_URL`. Assessment history is scoped
per browser using a token in `localStorage` sent as the `X-Session-Id` header (no cookies,
so it works cross-origin without third-party-cookie issues).

> Why Render and not Cloud Run? Cloud Run requires the Firebase **Blaze** (billing) plan.
> Render's free tier needs no card, so the whole demo stays $0. The `Dockerfile` is
> host-agnostic (it honors the `PORT` env var), so Cloud Run / Koyeb / Fly also work.

---

## 1. Deploy the API to Render

1. Push the repo to GitHub (already done).
2. In the [Render dashboard](https://dashboard.render.com): **New → Blueprint**, connect this
   repo. Render reads [`render.yaml`](render.yaml), builds the `Dockerfile`, and creates a
   free web service named `framingham-api`.
3. (Optional AI) In the service's **Environment**, add `Llm__ApiKey` = your free
   [Groq](https://console.groq.com) key. Without it, the local fallback explainer is used.
4. Copy the service URL, e.g. `https://framingham-api.onrender.com`.

> Free instances sleep after ~15 min idle; the first request then cold-starts (~30–50s).
> SQLite lives on the container's ephemeral disk, so history resets when the instance
> recycles — fine for a demo. For durable history, point the connection string at a managed
> **Postgres** (e.g. Neon/Supabase free tier) — the code is already provider-agnostic.

---

## 2. Point the SPA at the API

Set the API URL in `web/.env.production`:

```
VITE_API_URL=https://framingham-api.onrender.com
```

If your Hosting URL differs from `framingham-risk-calculator.web.app`, also add it to
`prodOrigins` in `src/FraminghamRisk.Api/Program.cs` (the CORS allow-list) and redeploy the API.

---

## 3. Deploy the SPA to Firebase Hosting

```bash
cd web && npm ci && npm run build && cd ..
firebase deploy --only hosting
```

`.firebaserc` already targets the `framingham-risk-calculator` project. Your live URL is
`https://framingham-risk-calculator.web.app`.

---

## 4. Verify

Open the Hosting URL, fill the form, **Calculate**, then **Explain my result with AI**.
- With a Groq key set → AI-generated explanation ("AI-generated").
- Without a key → local fallback ("Auto-generated").
- Calculate a few times → they appear under **Your recent assessments** (this browser only).

---

## Cost & safety notes

- **Firebase Hosting** (Spark) and **Render** (free) are both $0, no card.
- **Groq** free tier needs no card; the explain endpoint is rate-limited to 10 req/min per IP.
- The fallback explainer guarantees the AI feature never hard-fails for a visitor.
