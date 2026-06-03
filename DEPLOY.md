# Deployment

Target architecture for going live:

```
Browser ──▶ Firebase Hosting (static React build, web/dist)
                 │  rewrite /api/**
                 ▼
            Cloud Run (Docker container running the .NET API)
                 │  server-side LLM key
                 ▼
            Groq (OpenAI-compatible) — with local fallback
```

Why this shape: **GreenGeeks shared hosting cannot run .NET**, so the C# API runs as a
container on **Cloud Run** (free tier, scales to zero). Firebase Hosting serves the static
SPA and **rewrites `/api/**` to Cloud Run**, so the browser only ever talks to one origin —
no CORS, and the AI key stays server-side.

> Alternative: you can host the static `web/dist` on **GreenGeeks** instead of Firebase
> Hosting. Then the SPA calls the Cloud Run URL directly, which is cross-origin — so you must
> add your GreenGeeks domain to the CORS policy in `Program.cs` and set
> `VITE_API_URL=https://<cloud-run-url>` in `web/.env.production`. The Firebase-only path
> above is simpler; prefer it unless you specifically need the site on GreenGeeks.

---

## Prerequisites (one time)

```bash
npm install -g firebase-tools
firebase login
gcloud auth login           # Google Cloud SDK
gcloud config set project <YOUR_GCP_PROJECT_ID>
```

Your Firebase project and the GCP project are the same project.

---

## 1. Deploy the API to Cloud Run

From the repo root (the Dockerfile is here):

```bash
gcloud run deploy framingham-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars "Llm__ApiKey=<YOUR_GROQ_KEY>,Llm__BaseUrl=https://api.groq.com/openai/v1,Llm__Model=llama-3.3-70b-versatile"
```

- Get a free Groq key at https://console.groq.com (no credit card).
- Leave `Llm__ApiKey` unset to run on the local fallback explainer (still works, no AI cost).
- The service name `framingham-api` and region `us-central1` must match `firebase.json`.

> Prefer not to put the key in the command? Use a secret:
> ```bash
> echo -n "<YOUR_GROQ_KEY>" | gcloud secrets create groq-key --data-file=-
> gcloud run deploy framingham-api --source . --region us-central1 \
>   --allow-unauthenticated --update-secrets "Llm__ApiKey=groq-key:latest"
> ```

---

## 2. Build & deploy the frontend to Firebase Hosting

```bash
cd web && npm ci && npm run build && cd ..
firebase deploy --only hosting
```

`npm run build` uses `web/.env.production` (empty `VITE_API_URL`), so the app calls
`/api/**` on its own origin, which Firebase rewrites to Cloud Run.

If this is the first deploy, run `firebase init hosting` once (choose `web/dist` as the
public dir, configure as a SPA = yes) or ensure `.firebaserc` points at your project:

```json
{ "projects": { "default": "<YOUR_FIREBASE_PROJECT_ID>" } }
```

---

## 3. Verify

Open your Firebase Hosting URL, fill the form, Calculate, then "Explain my result with AI".
- With a Groq key set → the panel shows an AI-generated explanation ("AI-generated").
- Without a key → it shows the local fallback ("Auto-generated").

---

## Cost & safety notes

- **Cloud Run** scales to zero and has a generous free tier — idle cost is ~$0.
- **Groq** free tier has no card requirement; the API also rate-limits the explain endpoint
  to 10 requests/min per IP to protect the shared key.
- The fallback explainer guarantees the feature never hard-fails for a visitor.
