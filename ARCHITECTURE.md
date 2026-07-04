# Architecture

## Component diagram

```mermaid
flowchart TB
    subgraph Client
        UI[React SPA]
        EXT[External API consumer]
    end

    subgraph Backend["Node.js / Express backend"]
        APP[app.js]
        DR[Dynamic Router<br/>ALL /api/v1/run/:slug]
        MGMT[Management API<br/>auth · workflows · ai · metrics]
        EXE[Workflow Executor]
        MAP[Field Mapper]
        COND[Condition Evaluator]
        HTTP[HTTP Client + Retry]
        PLUG[Plugin Loader]
        CACHE[In-memory Cache]
        AI[AI Agent Service]
        DB[(lowdb - db.json)]
        VEND[Mock Vendor APIs]
    end

    UI -->|JWT| MGMT
    EXT -->|API Key / public| DR
    UI -->|Test Run| MGMT

    DR --> EXE
    MGMT --> EXE
    EXE --> MAP
    EXE --> COND
    EXE --> HTTP
    EXE --> PLUG
    HTTP --> CACHE
    HTTP --> VEND

    MGMT --> DB
    DR --> DB

    MGMT --> AI
    AI --> DB
```

## Request lifecycle: `POST /api/v1/run/verify-pan-and-gst`

```mermaid
sequenceDiagram
    participant C as Client
    participant R as Dynamic Router
    participant WS as Workflow Service
    participant V as Validator
    participant E as Executor
    participant Vendor as Mock Vendor APIs
    participant Log as Execution Log

    C->>R: POST /run/verify-pan-and-gst {pan}
    R->>WS: getWorkflowBySlugAndMethod()
    WS-->>R: workflow + activeVersion
    R->>R: dynamicAuth() - checks X-API-Key
    R->>R: perWorkflowLimiter() - rate check
    R->>V: validateAgainstSchema(inputSchema, body)
    V-->>R: ok
    R->>E: executeWorkflow(definition, input)
    E->>Vendor: POST /mock/pan/verify
    Vendor-->>E: { valid: true, ... }
    E->>E: evaluate condition on fetchGst step
    E->>Vendor: GET /mock/gst/lookup (only because condition passed)
    Vendor-->>E: { gstin, business_name, ... }
    E->>E: transform step - mergeObjects()
    E-->>R: { success, response, trace }
    R->>Log: recordExecution()
    R-->>C: 200 { success: true, data: {...} }
```

## Why a single dynamic route instead of registering one Express route per workflow

Two options were on the table:

1. Register a real Express route (`app.post('/run/verify-pan', handler)`) every
   time a workflow is created or published.
2. Register **one** route for the whole pattern (`app.all('/run/:slug', handler)`)
   that looks up the matching workflow from the database at request time.

Option 1 needs some way to add/remove routes from a running Express app
without restarting the process, which Express doesn't support cleanly (you'd
be maintaining a shadow router and re-mounting it, or restarting workers).
Option 2 is what's implemented — `backend/src/services/dynamicRouter.js` — and
it has a nice side effect: publishing, unpublishing, or rolling back to a
previous version is *purely a database write*. Zero code changes, zero
restarts, exactly what "configuration-driven" is supposed to mean.

The cost is one extra DB lookup per request, which for a file-backed lowdb
store is effectively free, and would be a non-issue with a real database and
an index on `(slug, method)`.

## The executor's context object

Every workflow run builds up a single `context` object:

```js
{
  input: { body, query, params, headers },   // the incoming request
  steps: {
    verifyPan: { request, response, status },
    fetchGst:  { status: 'skipped' },         // condition was false
    merged:    { output, status },
  }
}
```

Every later step, condition, and the final `response` mapping all read from
this same object via `{{steps.stepId.path.to.value}}`. Nested steps inside a
`parallel` block write into the *same* top-level `steps` map (not a nested
one) — a `verify-document` request can freely reference
`steps.fraudCheck.response.data.flagged` even though `fraudCheck` lives inside
a `parallelChecks` group, which is why the sample config reads naturally
without needing to know about the grouping.

## Plugin architecture

`backend/src/engine/pluginLoader.js` reads every `.js` file in
`backend/src/plugins/` at boot and registers whatever functions it exports.
A `transform` step just references `{ plugin: "formatters", fn: "maskPan" }`.
Adding a new transformation is: write a function, export it, done — nothing
else in the engine, routes, or database schema needs to know it exists.
