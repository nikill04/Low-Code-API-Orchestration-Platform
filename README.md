# Flowbase — Low-Code API Orchestration Platform

A configuration-driven platform for exposing REST APIs that call, chain, and merge
other APIs — without writing integration code for every vendor. Define a workflow
as JSON (or build it visually), and the engine handles validation, downstream
calls, retries, branching, parallel execution, transformation, and the final
response shape.

This was built for the SDE-1 weekend assignment on API orchestration. I've tried
to keep the scope honest for a weekend project rather than pretending it's
production infrastructure — see [Design Decisions](#design-decisions--tradeoffs)
for what that means in practice.

---

## Table of contents

- [What it does](#what-it-does)
- [Architecture](#architecture)
- [Quick start](#quick-start)
- [Using the platform](#using-the-platform)
- [Workflow configuration reference](#workflow-configuration-reference)
- [Bonus features implemented](#bonus-features-implemented)
- [The AI Agent](#the-ai-agent)
- [API reference](#api-reference)
- [Testing](#testing)
- [Project structure](#project-structure)
- [Design decisions & tradeoffs](#design-decisions--tradeoffs)

---

## What it does

Say you want an endpoint that verifies a PAN card. Instead of writing a
controller, a service, and a client for Vendor A, you write this:

```json
{
  "slug": "verify-pan",
  "method": "POST",
  "inputSchema": { "body": { "pan": { "type": "string", "required": true, "pattern": "^[A-Z]{5}[0-9]{4}[A-Z]$" } } },
  "steps": [
    {
      "id": "verifyPan",
      "type": "http",
      "request": { "method": "POST", "url": "http://localhost:4000/mock/pan/verify", "body": { "pan_number": "{{input.body.pan}}" } },
      "retry": { "maxAttempts": 3, "backoffMs": 300 }
    }
  ],
  "response": { "valid": "{{steps.verifyPan.response.data.valid}}" }
}
```

...and `POST /api/v1/run/verify-pan` immediately exists — validating input,
calling the vendor, retrying on failure, and returning a clean response. No
route, no controller, no redeploy.

The three examples from the assignment brief are all included as working,
seeded endpoints:

| Example | Endpoint | Demonstrates |
|---|---|---|
| Verify PAN → Vendor A → transform → response | `verify-pan` | Single vendor call, transform step |
| Verify PAN → Vendor A → *if valid* → Vendor B → merge | `verify-pan-and-gst` | Conditional execution, caching, merge, webhook |
| Upload doc → OCR → Fraud + Face Match → aggregate | `verify-document` | Parallel execution, scoring, decisioning |

## Architecture

```
┌──────────────┐        ┌───────────────────────────────────────────┐
│   Frontend   │        │                  Backend                   │
│  (React SPA) │        │                                             │
│              │  HTTP  │  ┌────────────┐   ┌───────────────────┐    │
│  Visual      │───────▶│  │  Express   │──▶│  Dynamic Router     │   │
│  workflow    │        │  │  app.js    │   │  (looks up the      │   │
│  editor,     │        │  └────────────┘   │  active workflow    │   │
│  dashboard,  │        │                    │  config per request) │  │
│  logs, AI    │        │                    └─────────┬──────────┘  │
│  assistant   │        │                              │              │
└──────────────┘        │                              ▼              │
                         │                    ┌──────────────────┐   │
                         │                    │  Workflow Executor │   │
                         │                    │  (engine/executor) │   │
                         │                    └─────────┬──────────┘  │
                         │            ┌──────────────────┼─────────┐  │
                         │            ▼                  ▼         ▼  │
                         │      HTTP client       Transform    Condition│
                         │      + retry            plugins      evaluator│
                         │            │                                │
                         │            ▼                                │
                         │   ┌──────────────────┐                      │
                         │   │  Mock vendor APIs │  (PAN/Aadhaar/GST/   │
                         │   │  (stand in for    │   OCR/Fraud/FaceMatch)│
                         │   │  real 3rd parties)│                      │
                         │   └──────────────────┘                      │
                         │                                             │
                         │   lowdb (JSON file) ── workflows, versions, │
                         │   execution logs, API keys, schedules,      │
                         │   webhook subscriptions                     │
                         └───────────────────────────────────────────────┘
```

The core idea: **routes are data, not code.** `dynamicRouter.js` exposes a single
Express handler for `ALL /api/v1/run/:slug`. On every request it looks up the
active workflow definition for that slug + method from the DB and hands it to
the executor. Publishing a new API means writing a new row, not shipping a
deploy.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the request-execution sequence
diagram and a closer look at the step engine.

## Quick start

### Option 1 — Docker Compose (recommended, one command)

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend + Swagger docs: http://localhost:4000/api-docs
- Default login: `admin@orchestrator.dev` / `Admin@123`

The four sample workflows are **not** pre-seeded in the Docker image (a fresh
container should start from a clean slate) — run the seed script once against
the running container if you want them:

```bash
docker compose exec backend node src/db/seed.js
docker compose restart backend
```

### Option 2 — Run locally

```bash
# Backend
cd backend
cp .env.example .env
npm install
npm run seed     # loads the 4 sample workflows (optional but recommended)
npm run dev       # http://localhost:4000

# Frontend, in a second terminal
cd frontend
npm install
npm run dev       # http://localhost:5173
```

Open http://localhost:5173, log in with the default admin credentials above,
and you'll land on a dashboard with the four sample APIs already published.

## Using the platform

1. **Dashboard** — execution counts, success rate, latency, recent activity.
2. **Workflows** — list, create, edit, delete, publish. Click one to see its
   version history, scheduled runs, and webhook subscribers.
3. **Visual editor** — build a workflow as a node graph (drag in HTTP/Transform/
   Parallel steps, wire up conditions, edit request mappings in the inspector
   panel), or flip to raw JSON for anything the visual builder doesn't cover
   yet. Hit **Test** any time to run it against sample input and watch the
   step trace populate.
4. **Test Console** — call a *published* endpoint exactly the way an external
   client would, API key and all.
5. **Execution Logs** — every run, expandable into its full step trace.
6. **AI Assistant** — describe an integration in a sentence, get a draft
   workflow config back, review the lint results, save it.
7. **API Keys** — issue/revoke keys for endpoints configured with API-key auth.

## Workflow configuration reference

A workflow definition has this shape:

```jsonc
{
  "slug": "verify-pan",              // published at /api/v1/run/verify-pan
  "method": "POST",
  "description": "...",
  "auth": { "type": "none" | "apiKey" | "jwt" },
  "rateLimit": { "windowMs": 60000, "max": 30 },   // optional, per-workflow
  "debug": false,                     // include step trace in the response
  "webhook": { "onComplete": true },  // fire subscribed webhooks after every run
  "inputSchema": {
    "body": { "fieldName": { "type": "string", "required": true, "pattern": "..." } }
  },
  "steps": [ /* see step types below */ ],
  "response": { "field": "{{steps.someStep.response.data.field}}" }
}
```

**Field mapping / templating.** Anywhere in `request.body`, `request.headers`,
`request.params`, a transform's `input`, or `response`, you can reference
values from the request or from earlier steps using `{{path.to.value}}`. See
`backend/src/engine/mapper.js`.

**Step types:**

| Type | Purpose | Key fields |
|---|---|---|
| `http` | Call a downstream API | `request.{method,url,headers,body}`, `retry`, `timeoutMs`, `cache.ttlSeconds`, `condition`, `onError` |
| `transform` | Run a plugin function over mapped input | `plugin`, `fn`, `input`, `args` |
| `parallel` | Run nested steps concurrently | `steps: [...]` (same shapes as above) |

**Conditions** gate whether a step runs, evaluated against everything executed
so far:

```json
{ "path": "steps.verifyPan.response.data.valid", "operator": "isTrue" }
```

Supported operators: `equals`, `notEquals`, `gt`, `gte`, `lt`, `lte`,
`contains`, `isTrue`, `isFalse`, `exists`, `notExists`, plus `all`/`any`
combinators. There's no `eval()` anywhere in the condition engine on purpose —
workflow configs can be authored by users (or the AI agent), so arbitrary code
execution was never on the table.

Full annotated examples live in [`backend/sample-configs/`](./backend/sample-configs).

## Bonus features implemented

| Feature | Where |
|---|---|
| Visual workflow editor | `frontend/src/pages/WorkflowEditor.jsx` (React Flow canvas + inspector) |
| Auth: JWT + API Key | `backend/src/middleware/auth.js` — JWT protects the management API, API keys protect generated endpoints per-workflow |
| Rate limiting | `backend/src/middleware/rateLimiter.js` — global limiter + optional per-workflow limiter |
| Versioned APIs / workflow versioning | `backend/src/services/workflowService.js` — every save creates an immutable version; any version can be reactivated |
| Metrics endpoint | `GET /api/v1/metrics` (JSON) and `GET /api/v1/metrics/prometheus` |
| Docker support | `backend/Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml` |
| Swagger / OpenAPI | `backend/src/docs/openapi.yaml`, served at `/api-docs` |
| Parallel execution | `type: "parallel"` step, see `verify-document` sample config |
| Webhook support | `backend/src/services/webhookService.js`, subscribe via the Webhooks tab |
| Scheduled execution | `backend/src/services/schedulerService.js` (node-cron), Schedule tab |
| Caching | Per-step `cache.ttlSeconds`, in-memory (`backend/src/engine/cache.js`) |
| Plugin architecture | Drop a `.js` file in `backend/src/plugins/`, export named functions, use immediately from any `transform` step |
| CI/CD pipeline | `.github/workflows/ci.yml` — tests backend, builds frontend, builds both Docker images on every push |

**Bonus intentionally left out: Kubernetes deployment.** It's the one item on
the list that's a genuinely separate skill (cluster networking, manifests,
registries) rather than an extension of the orchestration engine itself, and
isn't proportionate for a weekend project. Everything else on the bonus list
is implemented.

## The AI Agent

`POST /api/v1/ai/generate` turns a plain-English description into a workflow
config. If `ANTHROPIC_API_KEY` is set in `backend/.env`, it calls the Claude
API with a system prompt describing the config schema and available mock
vendors/plugins. If no key is set, it falls back to a small rule-based matcher
so the feature still works out of the box for anyone reviewing this without
setting up credentials — it recognises PAN/Aadhaar/GST/document-verification
phrasing and returns the matching sample config.

Two more AI-flavoured endpoints round this out:

- `POST /api/v1/ai/lint` — static analysis over a definition: duplicate step
  ids, missing fields, steps referencing other steps that don't exist yet,
  unreachable configs. The same check runs automatically before any
  save/publish.
- `POST /api/v1/ai/test-cases` — generates a valid and an invalid request body
  straight from a workflow's `inputSchema`, so you can hit "Test" without
  hand-writing payloads.

## API reference

Full interactive docs at `/api-docs` once the backend is running. Summary:

```
POST   /api/v1/auth/login                          Get a JWT
GET    /api/v1/workflows                           List workflows        (JWT)
POST   /api/v1/workflows                            Create a workflow     (JWT)
GET    /api/v1/workflows/:id                        Get + version history (JWT)
POST   /api/v1/workflows/:id/versions               Add a new version     (JWT)
POST   /api/v1/workflows/:id/versions/:v/activate   Roll back/forward     (JWT)
POST   /api/v1/workflows/test-run                   Dry-run a draft       (JWT)
POST   /api/v1/workflows/:id/schedule               Schedule a cron run   (JWT)
POST   /api/v1/workflows/:id/webhooks               Subscribe a webhook   (JWT)
POST   /api/v1/ai/generate                          NL → workflow config  (JWT)
GET    /api/v1/metrics                              JSON stats
GET    /api/v1/metrics/prometheus                   Prometheus format

ANY    /api/v1/run/:slug                            Every generated API lives here
```

Sample curl requests:

```bash
# Get a token
TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@orchestrator.dev","password":"Admin@123"}' | jq -r .data.token)

# Call a published, public endpoint
curl -X POST http://localhost:4000/api/v1/run/verify-pan \
  -H "Content-Type: application/json" \
  -d '{"pan":"ABCDE1234F"}'

# Call one that requires an API key
curl -X POST http://localhost:4000/api/v1/run/verify-pan-and-gst \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <key from the API Keys page>" \
  -d '{"pan":"ABCDE1234F"}'
```

## Testing

```bash
cd backend
npm test
```

19 unit tests cover the parts most worth trusting: the field mapper, the
condition evaluator, and the executor's sequential/conditional/parallel
behaviour (with the HTTP layer mocked out).

## Project structure

```
backend/
  src/
    app.js, server.js        Express wiring + boot
    engine/                  mapper, condition evaluator, http client, executor, cache, plugin loader
    services/                workflow CRUD/versioning, dynamic router, scheduler, webhooks, auth, AI agent
    middleware/               auth, rate limiting, error handling
    routes/                   auth, workflows, ai, metrics, webhook demo receiver
    mockVendors/               stand-in PAN/Aadhaar/GST/OCR/fraud/face-match APIs
    plugins/                   transform functions (formatters, aggregators)
    docs/openapi.yaml
  sample-configs/              the three example workflows from the brief
  tests/
frontend/
  src/
    pages/                     Dashboard, WorkflowList/Detail/Editor, TestConsole, Logs, AIAssistant, ApiKeys
    components/                AppShell, StepInspector, SettingsPanel, TestRunModal, node components
    api/                       axios client + endpoint groupings
.github/workflows/ci.yml
docker-compose.yml
```

## Design decisions & tradeoffs

A few calls I made deliberately, and why:

- **lowdb (a JSON file) instead of Postgres/Mongo.** The assignment explicitly
  allows JSON/YAML/Database as the config source. A file store means the
  whole thing runs with `npm install && npm start` — no separate DB container,
  no migrations, no connection strings to get wrong during review. It's a
  real limitation for concurrent writers at scale — swapping `db/db.js` for a
  real Postgres/Mongo client later is a self-contained change that wouldn't
  touch the engine, routes, or frontend at all.
- **No `eval()`/`new Function()` anywhere.** The condition evaluator is a
  small, explicit operator table instead of a generic expression language.
  Slightly less flexible; a lot harder to turn into a code-execution bug when
  workflow configs might come from an AI agent or an end user.
- **Sequential-chain visual editor instead of a free-form graph.** A true
  node-graph editor (arbitrary branch/merge topology, drag-anywhere canvas)
  is a multi-week project on its own. What's here — a vertical step chain
  with parallel groups rendered as one wider node — covers everything the
  three brief examples need and is honest about not being a general-purpose
  DAG builder.
- **Rule-based AI fallback.** The AI Assistant works with zero configuration,
  which matters a lot for anyone reviewing this without wanting to hand out
  an API key. The "real" LLM path is there and used automatically once a key
  is set.
- **Skipped Kubernetes.** It's on the bonus list, but it's a deployment/ops
  skill that sits on top of the orchestration engine rather than inside it,
  and needs a cluster + registry to actually exercise — not proportionate for
  a weekend project. Docker + docker-compose already cover "runs the same way
  everywhere," which is the part of containerization that matters here.
