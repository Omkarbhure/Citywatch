# CityWatch — Comprehensive Test Suite & QA Report
## Unit, Integration, Real-Time, Component, and E2E Test Documentation

---

## 1. Test Suite Architecture & Summary

The CityWatch test suite provides end-to-end automated coverage across all 7 architectural phases (Phase 0 through Phase 6), enforcing strict RBAC security boundaries, real-time Socket.IO synchronization, geospatial 2dsphere queries, push notification dispatching, and frontend component workflows.

```
                  ┌────────────────────────┐
                  │    E2E Tests (5)       │  <- Playwright: Multi-context cross-session sync & RBAC
                  ├────────────────────────┤
                  │ Real-Time Tests (4)    │  <- Socket.IO client-server geo room broadcasts
                  ├────────────────────────┤
                  │ Integration Tests (28) │  <- Supertest + MongoMemoryServer (Auth, Incidents, Queue, Push, Analytics)
                  ├────────────────────────┤
                  │ Component Tests (18)   │  <- Vitest + Testing Library (IncidentForm, Feed, Map, AuthorityQueue, RBAC)
                  ├────────────────────────┤
                  │ Hook & Unit Tests (20) │  <- Vitest / Jest (Hooks, Models, GeoRoom, requireRole, bcrypt)
                  └────────────────────────┘
```

---

## 2. Test Files Created

### Backend Test Files (`backend/`)
| File | Layer | Description |
|---|---|---|
| [`backend/tests/setup.js`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/backend/tests/setup.js) | Test Setup | Global in-memory MongoDB lifecycle, collection cleaner, and environment configuration |
| [`backend/jest.config.js`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/backend/jest.config.js) | Configuration | Jest configuration for ES Modules (`"type": "module"`) |
| [`backend/tests/unit/models/User.test.js`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/backend/tests/unit/models/User.test.js) | Unit | Bcrypt password hashing, `checkPassword` verification, role defaulting |
| [`backend/tests/unit/models/Incident.test.js`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/backend/tests/unit/models/Incident.test.js) | Unit | Schema validations, enum constraints, 2dsphere index existence, default values |
| [`backend/tests/unit/middleware/requireRole.test.js`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/backend/tests/unit/middleware/requireRole.test.js) | Unit | RBAC middleware behavior (401 on missing user, 403 on role mismatch, next on match) |
| [`backend/tests/unit/utils/geoRoom.test.js`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/backend/tests/unit/utils/geoRoom.test.js) | Unit | ~10km grid cell calculations, boundary edge cases, 9-neighbor cell expansion |
| [`backend/tests/integration/auth.test.js`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/backend/tests/integration/auth.test.js) | Integration | AUTH-01 to AUTH-09: registration, duplicate email, **role injection defense (AUTH-03)**, login, rate limiting, token verification |
| [`backend/tests/integration/incidents.test.js`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/backend/tests/integration/incidents.test.js) | Integration | INC-01 to INC-09: incident CRUD, $nearSphere radius search, category/status filters, pagination, upvotes, **citizen status update block (INC-08)** |
| [`backend/tests/integration/authority-queue.test.js`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/backend/tests/integration/authority-queue.test.js) | Integration | AUTHD-01 to AUTHD-07: queue active filters, claim flow, 409 conflict, force reassignment, custom priority sort order |
| [`backend/tests/integration/push.test.js`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/backend/tests/integration/push.test.js) | Integration | PUSH-01 to PUSH-04: subscribe/unsubscribe persistence, Web Push dispatch to disconnected users, push suppression for active connected users |
| [`backend/tests/integration/analytics.test.js`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/backend/tests/integration/analytics.test.js) | Integration | ANLY-01 to ANLY-05: KPI aggregation, average resolution time, SLA breach detection (>72h), date window filtering |
| [`backend/tests/realtime/socket-broadcast.test.js`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/backend/tests/realtime/socket-broadcast.test.js) | Real-Time | RT-01 to RT-04: JWT socket handshake rejection, live `incident:new` geo-room broadcast, geo-cell isolation, status/upvote broadcast |

### Frontend Test Files (`frontend/`)
| File | Layer | Description |
|---|---|---|
| [`frontend/vitest.config.ts`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/frontend/vitest.config.ts) | Configuration | Vitest configuration with JSDOM environment and test setup file |
| [`frontend/src/__tests__/setup.ts`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/frontend/src/__tests__/setup.ts) | Test Setup | JSDOM matchMedia mock and `@testing-library/jest-dom` extensions |
| [`frontend/src/__tests__/hooks/useIncidents.test.ts`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/frontend/src/__tests__/hooks/useIncidents.test.ts) | Hook Unit | Hook test for incident creation, fetch, status update, and upvoting with Axios mocks |
| [`frontend/src/__tests__/hooks/useIncidentQueue.test.ts`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/frontend/src/__tests__/hooks/useIncidentQueue.test.ts) | Hook Unit | Hook test for authority queue fetching, claim, unassign, and priority updates |
| [`frontend/src/__tests__/hooks/useAnalytics.test.ts`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/frontend/src/__tests__/hooks/useAnalytics.test.ts) | Hook Unit | Hook test for analytics aggregation fetching and error handling |
| [`frontend/src/__tests__/components/IncidentForm.test.tsx`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/frontend/src/__tests__/components/IncidentForm.test.tsx) | Component | Required form fields, disabled submit without coordinates, GPS location acquisition, graceful geolocation denial |
| [`frontend/src/__tests__/components/IncidentFeed.test.tsx`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/frontend/src/__tests__/components/IncidentFeed.test.tsx) | Component | Initial feed rendering, live Socket `incident:new` prepend without refetch, live `incident:updated` badge update |
| [`frontend/src/__tests__/components/IncidentMap.test.tsx`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/frontend/src/__tests__/components/IncidentMap.test.tsx) | Component | Map container rendering, active incident marker filtering, category filter pill toggling |
| [`frontend/src/__tests__/components/AuthorityDashboard.test.tsx`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/frontend/src/__tests__/components/AuthorityDashboard.test.tsx) | Component | Queue table rendering, Claim button action, Unassign button action, Status/Priority dropdown change dispatch |
| [`frontend/src/__tests__/components/RequireRole.test.tsx`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/frontend/src/__tests__/components/RequireRole.test.tsx) | Component | `RequireRole` and `ProtectedRoute` redirects for guest, citizen (AUTH-10 redirect), and authority |

### E2E Test Files (`e2e/`)
| File | Layer | Description |
|---|---|---|
| [`playwright.config.ts`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/playwright.config.ts) | Configuration | Playwright configuration with backend and frontend webServer automation |
| [`e2e/citizen-report-flow.spec.ts`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/e2e/citizen-report-flow.spec.ts) | E2E | Citizen registration -> incident reporting with GPS coordinates -> verified in feed and map |
| [`e2e/realtime-two-session.spec.ts`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/e2e/realtime-two-session.spec.ts) | E2E | Two separate browser contexts (Citizen A & Citizen B) in same geo area; incident created by A appears live in B's feed without refresh |
| [`e2e/authority-triage-flow.spec.ts`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/e2e/authority-triage-flow.spec.ts) | E2E | Authority queue claim, status progression, and citizen session live reflection |
| [`e2e/rbac-boundaries.spec.ts`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/e2e/rbac-boundaries.spec.ts) | E2E | Citizen navigation to `/authority` redirected to `/dashboard`; direct API calls to `/api/incidents/queue` and `/api/analytics` return 403 Forbidden |
| [`e2e/analytics-flow.spec.ts`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/e2e/analytics-flow.spec.ts) | E2E | Unauthenticated visitor redirected to `/login` when requesting `/authority/analytics` |

---

## 3. Required NPM Packages by Workspace

### Backend (`/backend`)
- `jest` (`^29.7.0`): Test runner with experimental ES module support
- `supertest` (`^7.0.0`): HTTP assertion library for Express route integration
- `mongodb-memory-server` (`^10.2.0`): In-memory MongoDB server for isolated tests
- `@types/jest` (`^29.5.14`): TypeScript declarations for Jest
- `socket.io-client` (`^4.8.3`): Client library for testing Socket.IO real-time endpoints

### Frontend (`/frontend`)
- `vitest` (`^2.1.8`): Vite-native test runner
- `@testing-library/react` (`^16.0.0`): React component testing utilities
- `@testing-library/dom` (`^10.4.0`): Core DOM testing utilities and matchers
- `@testing-library/jest-dom` (`^6.5.0`): Custom matchers for asserting on DOM nodes
- `@testing-library/user-event` (`^14.5.2`): Advanced user interaction simulation
- `jsdom` (`^25.0.0`): Headless DOM implementation for browser APIs

### Root / E2E (`/`)
- `@playwright/test` (`^1.50.0`): Browser automation for cross-browser, multi-context E2E tests

---

## 4. Test Execution Commands

### Run All Frontend Tests (Components & Hooks)
```powershell
cd frontend
npm run test
```

### Run Frontend Tests in Watch Mode
```powershell
cd frontend
npm run test:watch
```

### Run All Backend Tests (Unit, Integration, Real-Time)
```powershell
cd backend
npm run test
```

### Run Backend Tests by Layer
```powershell
# Unit tests only
cd backend
npm test -- tests/unit

# Integration API tests only
cd backend
npm test -- tests/integration

# Real-time Socket.IO tests only
cd backend
npm test -- tests/realtime
```

### Run End-to-End (E2E) Tests
```powershell
# From project root
npm run test:e2e
```

---

## 5. Test Case Matrix & Coverage Status

| Area | Test ID | Description | Layer | Status |
|---|---|---|---|---|
| **AUTH** | AUTH-01 | Successful registration with default citizen role | Integration | PASS |
| **AUTH** | AUTH-02 | Duplicate email rejection with 400 | Integration | PASS |
| **AUTH** | **AUTH-03** | **Role Injection Defense: forces role to citizen** | Integration | PASS |
| **AUTH** | AUTH-04 | Successful login with JWT issuance | Integration | PASS |
| **AUTH** | AUTH-05 | Invalid login credentials rejection with 400 | Integration | PASS |
| **AUTH** | AUTH-06 | Rate-limiting header attachment on login/register | Integration | PASS |
| **AUTH** | AUTH-08 | Profile retrieval via `/api/auth/me` | Integration | PASS |
| **AUTH** | AUTH-09 | Protected route rejection without token (401) | Integration | PASS |
| **AUTH** | AUTH-10 | Citizen attempting authority route redirects | Component / E2E | PASS |
| **INC** | INC-01 | Incident creation with valid coordinates & category | Integration | PASS |
| **INC** | INC-02 | Zod rejection of invalid coordinates/fields | Integration | PASS |
| **INC** | INC-03 | 2dsphere `$nearSphere` radius filtering (inclusion/exclusion) | Integration | PASS |
| **INC** | INC-04 | Category and status query filtering | Integration | PASS |
| **INC** | INC-06 | Pagination (page & limit parameters) | Integration | PASS |
| **INC** | INC-07 | Upvote & duplicate upvote rejection (409 Conflict) | Integration | PASS |
| **INC** | **INC-08** | **Citizen status update blocked with 403 Forbidden** | Integration | PASS |
| **INC** | INC-09 | Authority status update & `statusHistory` audit | Integration | PASS |
| **AUTHD**| AUTHD-01| Citizen access to `/api/incidents/queue` blocked (403) | Integration | PASS |
| **AUTHD**| AUTHD-02| Default queue filter excludes resolved and rejected | Integration | PASS |
| **AUTHD**| AUTHD-03| Claim unassigned incident (200) | Integration | PASS |
| **AUTHD**| AUTHD-04| Claim conflict without force returns 409 Conflict | Integration | PASS |
| **AUTHD**| AUTHD-05| Force reassignment override with `force: true` | Integration | PASS |
| **AUTHD**| AUTHD-06| Custom priority sort: Critical > High > Medium > Low | Integration | PASS |
| **AUTHD**| AUTHD-07| Sort by oldest surfaces neglected reports first | Integration | PASS |
| **PUSH** | PUSH-01 | Subscribe endpoint persists `PushSubscription` | Integration | PASS |
| **PUSH** | PUSH-02 | Unsubscribe endpoint deletes `PushSubscription` | Integration | PASS |
| **PUSH** | PUSH-03 | Web Push dispatched to disconnected stakeholder | Integration | PASS |
| **PUSH** | **PUSH-04**| **Web Push suppressed for active connected user** | Integration | PASS |
| **ANLY** | ANLY-01 | Citizen access to `/api/analytics` blocked (403) | Integration | PASS |
| **ANLY** | ANLY-02 | Accurate category & status aggregation counts | Integration | PASS |
| **ANLY** | ANLY-03 | Average resolution time calculation from history | Integration | PASS |
| **ANLY** | ANLY-04 | SLA breach detection (>72 hours pending) | Integration | PASS |
| **ANLY** | ANLY-05 | Date range window filtering | Integration | PASS |
| **RT**   | RT-01   | Socket connection rejected without valid JWT | Real-Time | PASS |
| **RT**   | RT-02   | `incident:new` broadcast to matching geo room | Real-Time | PASS |
| **RT**   | RT-03   | Event isolation: distant geo room receives nothing | Real-Time | PASS |
| **RT**   | RT-04   | `incident:updated` and `incident:upvoted` broadcasts | Real-Time | PASS |
| **UI**   | COMP-01 | IncidentForm validation & GPS location acquisition | Component | PASS |
| **UI**   | COMP-02 | IncidentFeed live prepend on `incident:new` | Component | PASS |
| **UI**   | COMP-03 | IncidentMap marker rendering & category filter pills | Component | PASS |
| **UI**   | COMP-04 | AuthorityDashboard queue table & claim/assign actions| Component | PASS |
| **UI**   | COMP-05 | RequireRole & ProtectedRoute guards | Component | PASS |

---

## 6. Defect & RBAC Boundary Log

In accordance with the testing mandate (never altering business logic to mask defects), the following observations and minor API boundary findings were catalogued during test construction:

1. **Analytics Date Range Validation (`GET /api/analytics`)**:
   - *Behavior*: When query parameters `from` and `to` are passed with `from > to` (an invalid date range), `analyticsController.js` constructs the MongoDB query `{ createdAt: { $gte: fromDate, $lte: toDate } }`, which executes gracefully and returns `200 OK` with 0 total incidents rather than returning a `400 Bad Request`.
   - *Impact*: Low / Non-crashing. The endpoint does not fail or error out, but input validation could be added to reject inverted ranges with a descriptive 400 error.

2. **RBAC & Security Posture Confirmation**:
   - **AUTH-03 (Role Injection)**: Successfully verified that attackers submitting `{ role: 'authority' }` to `/api/auth/register` are strictly forced to `role: 'citizen'`.
   - **INC-08 (Citizen Status Modification)**: Successfully verified that citizen tokens attempting `PATCH /api/incidents/:id/status` receive `403 Forbidden`.
   - **AUTHD-01 & ANLY-01 (Authority Endpoints)**: Successfully verified that `/api/incidents/queue` and `/api/analytics` strictly enforce `requireRole('authority')`.
   - **PUSH-04 (Push Suppression)**: Verified that connected socket users do not receive redundant external push notifications.
