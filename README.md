# Framingham Risk Calculator

A full-stack, AI-enabled web app that estimates a patient's **10-year cardiovascular
disease risk** using the Framingham risk score. A typed C# domain service does the
medical scoring, an ASP.NET Core API exposes it, a React + TypeScript SPA drives it, and an
LLM turns the result into a plain-language explanation with lifestyle suggestions.

> Originally a legacy ASP.NET Web Forms page (now archived in [`legacy/`](legacy/)),
> rebuilt as a modern, tested, deployable application.

> ⚠️ **Educational use only.** This is not a medical device and is not a substitute for
> professional medical advice.

---

## Features

- **Accurate scoring** — the full Framingham point system (age, sex, blood pressure ±
  treatment, total cholesterol, HDL, smoking, diabetes) implemented as a pure, unit-tested
  C# domain library.
- **REST API** — ASP.NET Core minimal API with OpenAPI, input validation, and rate limiting.
- **Typed SPA** — React + TypeScript form and results, with a colour-coded
  Low / Moderate / High risk badge and "heart age".
- **Assessment history** — every calculation is persisted with **EF Core + SQLite** and
  shown back as a "recent assessments" list. History is **scoped to the visitor's browser**
  (a session token sent via header), so people only ever see their own results; no names are stored.
  Provider can be swapped to **Postgres** without touching the rest of the app.
- **AI explanation** — an "Explain my result" feature that grounds an LLM in the computed
  result to produce a layperson summary + suggestions. Provider-agnostic (OpenAI-compatible;
  defaults to **Groq**'s free tier) with a **local fallback** when no key is configured.
- **Resilient** — the calculator also works offline (in-browser fallback) if the API is down.
- **Deployable** — Dockerised API (runs on **Render**, Cloud Run, or any container host) +
  static SPA on **Firebase Hosting**.

---

## Architecture

```
┌────────────────────┐      HTTPS / JSON (/api)     ┌──────────────────────────┐
│  React + TS (Vite) │ ───────────────────────────▶ │  ASP.NET Core 10 Web API │
│  form · results    │ ◀─────────────────────────── │  validation · rate limit │
│  history · AI panel│                              └─────────────┬────────────┘
└────────────────────┘                                            │
                      ┌───────────────────┬────────────────────┬──┴────────────────┐
                      ▼                   ▼                    ▼                   ▼
            ┌──────────────────┐ ┌──────────────────┐ ┌────────────────┐ ┌──────────────────┐
            │ FraminghamRisk.  │ │ EF Core + SQLite │ │ LlmRiskExplainer│ │ FallbackExplainer│
            │ Domain (pure C#) │ │ session-scoped   │ │ (Groq / OpenAI- │ │ (local, no key)  │
            │ calculator+tests │ │ history          │ │  compatible)    │ │                  │
            └──────────────────┘ └──────────────────┘ └────────────────┘ └──────────────────┘
```

- **`FraminghamRisk.Domain`** — framework-free C#: models + `FraminghamCalculator`. Fully unit-testable.
- **`FraminghamRisk.Api`** — minimal API endpoints, validation, rate limiting, EF Core
  persistence, and AI orchestration.
- **`web/`** — React + TypeScript SPA (Vite). Calls the API same-origin via a dev proxy
  locally, and directly via `VITE_API_URL` (CORS-enabled) in production.

---

## Tech stack

| Area | Tech |
| --- | --- |
| Backend | C# / **.NET 10**, ASP.NET Core minimal API, OpenAPI |
| Frontend | **React 19**, **TypeScript**, Vite |
| Database | **EF Core** + **SQLite** (Postgres-ready), migrations |
| Testing & CI | xUnit, **GitHub Actions** |
| AI | OpenAI-compatible LLM (default **Groq**), server-side key, graceful fallback |
| Infra | **Docker**, **Render** (or Cloud Run), **Firebase Hosting** |

---

## Project structure

```
.
├── src/
│   ├── FraminghamRisk.Domain/   # pure C# scoring (models + calculator)
│   └── FraminghamRisk.Api/      # ASP.NET Core API: Ai/, Data/ (EF Core), Migrations/
├── tests/
│   └── FraminghamRisk.Domain.Tests/   # xUnit tests
├── web/                         # React + TypeScript SPA (Vite)
├── legacy/                      # archived original ASP.NET Web Forms app
├── .github/workflows/ci.yml     # CI: build + test (backend & frontend)
├── Dockerfile                   # API container (Render / Cloud Run)
├── render.yaml                  # Render Blueprint for the API
├── firebase.json                # Firebase Hosting config (static SPA)
├── DEPLOY.md                    # deployment guide
└── FraminghamRisk.slnx          # solution
```

---

## Run it locally

**Prerequisites:** [.NET 10 SDK](https://dotnet.microsoft.com/download) and Node.js 20+.

**1. API** (terminal 1):
```bash
dotnet run --project src/FraminghamRisk.Api --urls http://localhost:5095
```

**2. Web** (terminal 2):
```bash
cd web && npm install && npm run dev
```

Open the URL Vite prints (e.g. `http://localhost:5173`). The Vite dev server proxies `/api`
to the API on `:5095`, so no CORS setup is needed. The SQLite database (`framingham.db`) is
created automatically on first run via EF Core migrations — no manual setup required.

**Optional — enable real AI** (otherwise the local fallback is used): get a free key at
[console.groq.com](https://console.groq.com) and start the API with it set:
```bash
Llm__ApiKey=YOUR_GROQ_KEY dotnet run --project src/FraminghamRisk.Api --urls http://localhost:5095
```

---

## Test

```bash
dotnet test
```

The domain tests cover scoring brackets, male/female differences, table edge cases
(`<1`, `>30`, `<30`, `>80`), and validation failures.

---

## API

| Method | Route | Body | Returns |
| --- | --- | --- | --- |
| `POST` | `/api/assessments` | `PatientInput` | `RiskResult` (points, risk %, heart age, level); persists the assessment |
| `GET` | `/api/assessments` | – | the caller's own recent assessments (scoped by `X-Session-Id`) |
| `POST` | `/api/assessments/explain` | `PatientInput` | `{ summary, suggestions[], source }` (rate-limited) |

```bash
curl -s -X POST http://localhost:5095/api/assessments -H "Content-Type: application/json" -d '{"age":50,"sex":"male","bpTreated":false,"systolicBp":130,"totalCholesterol":6.0,"hdl":1.0,"smoker":false,"diabetic":false}'
# {"totalPoints":12,"riskPercent":"13.3","heartAge":"60","level":"Moderate"}
```

---

## Deploy

The C# API runs as a Docker container on **Render** (free tier; a `render.yaml` Blueprint is
included), and the static SPA is served by **Firebase Hosting**. The SPA reaches the API via
`VITE_API_URL`, and the API allows the Hosting origin through CORS. The AI key stays
server-side as an environment variable on the API host. See **[DEPLOY.md](DEPLOY.md)** for
step-by-step instructions.
