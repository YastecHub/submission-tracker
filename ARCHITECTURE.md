# Frontend architecture

## Baseline and scope

React 18 SPA, React Router 6, Vite 6, TypeScript, Axios and Tailwind.
`main.tsx` composes routes/providers. `index.css` owns design tokens and shared
visual classes. `api/share.js` is a Vercel server function, never a browser import.
Keep the existing route URLs and deployment rewrites.

The first migration addresses authenticated submission lists, payment receipt
lists/legacy reconciliation and review/scanning, public submission/payment
forms, ledger loading and session restoration. Other pages are still legacy
composition; this is an incremental migration, not a claim that every frontend
workflow has been extracted.

## Confirmed problems addressed

- `pages/EventDetail.tsx`: mixed queries/polling/presentation; metadata reloaded
  on pagination and search; duplicated counters drifted after confirmations.
- `pages/PaymentEventDetail.tsx`: reconciliation rules embedded in rendering;
  unbounded parallel legacy fetches; filter/page changes reloaded all legacy data.
- Both list pages and `pages/DashboardLedger.tsx`: stale responses could replace
  a newer query. Requests now cancel on query change, refresh and unmount.
- `context/AuthContext.tsx`: initial public routes skipped session restoration;
  late bootstrap responses could overwrite login/logout. Session generations now
  guard those transitions. Public pages still render while restoration runs.

## Ownership

```
src/features/auth/api/            # Login and current-session requests
src/features/submissions/api/     # Submission detail request contracts
src/features/submissions/hooks/   # Search, pagination, server state
src/features/payments/api/        # Receipt queries and bounded legacy fetching
src/features/payments/hooks/      # Receipt request lifecycle
src/features/payments/model/      # Pure legacy reconciliation rules
src/features/payments/components/ # Payment-specific dialogs and scanner UI
src/features/bulletin/api/         # Student and staff Bulletin request contracts
src/features/bulletin/hooks/       # Cancellable Bulletin feed state
src/features/bulletin/model/       # Announcement wire types and presentation rules
src/features/bulletin/components/  # Student shell, article renderer and feed cards
src/features/ledger/hooks/        # Admin ledger loading
src/hooks/useRemoteData.ts        # Domain-neutral cancellable component state
src/pages/                       # Route composition and local interaction state
src/api/                         # Shared Axios transport and existing ledger API
src/context/                     # Existing auth and toast provider entry points
```

Pages compose features. Feature hooks call their API modules and shared hooks.
Shared hooks must not import features. AuthContext is an auth-owned compatibility
entry point, not a general shared domain abstraction. Existing `types/` remains
the shared wire contract during migration. Do not import another feature's private
hooks/models; use deliberate public APIs for cross-feature workflows.

## State and requests

- Form fields, modals and selected records stay local to their page/component.
- The list hook owns query state and the latest server response; counts come from
  that response, not optimistic arithmetic.
- `useRemoteData` uses component-local state, **not a global cache**. Memoize loaders
  with every query key. Abort obsolete reads and ignore their late results.
- Polling runs only while visible. Successful mutations explicitly refresh the
  owning list. Mutations are never automatically retried: a failed network response
  can have an uncertain server outcome.
- Backend authorization remains authoritative. UI visibility is not permission.
- Styling/markup remains page-owned until a genuinely reusable UI boundary exists.

## Representative journey

`/dashboard/events/:id` → ProtectedRoute → EventDetail → useSubmissionDetail →
submissions API → Axios. Search is debounced and resets the page. Metadata loads
independently. ConfirmButton/QRScanner perform the existing mutation and the page
refreshes authoritative list counts. Bulk confirmation also refreshes the list.
Export keeps the existing XLSX request/download contract. Failures have a retry UI.

Nexium Bulletin uses separate role shells: staff routes compose the management list
and structured composer, while `/student` owns the student shell, home, feed,
article and tickets routes. Bulletin route modules are lazy-loaded. Feed filters
live in URL query parameters, article content is rendered from validated structured
sections, and the server remains authoritative for publication and unread versions.

## Verification

Run `npm run typecheck`, `npm test`, and `npm run build`.
Node tests use the installed TypeScript compiler and React 18 test renderer;
they cover request races, empty/error/retry states, cancellation, auth races and
legacy merge behavior. They do not replace real browser camera, responsive or
production authorization testing. No lint configuration exists yet.

## Next slices

Dashboard creation forms, public success/closed pages and transparency view still
contain page-level workflow code. Extract these by behavior, not line count,
retaining their existing contracts. The dashboard's separate legacy Picnic-count
implementation should ultimately use a backend summary endpoint rather than
downloading receipts. Do not invent a new financial merge rule while moving the
existing reconciliation code.

For a new feature: define its browser API contract, add a focused hook for server
state only if needed, keep pure rules in `model/`, compose in a page, and add a
regression test for meaningful request/state transitions. No new global store or
DI container is needed.
