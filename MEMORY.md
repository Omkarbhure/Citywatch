# Memory Management & Lifecycle Analysis — CityWatch

This document outlines the memory architecture, state persistence, caching strategies, resource allocations, and potential memory leak vectors across the frontend and backend of the **CityWatch** application.

---

## 1. Executive Summary

CityWatch is a MERN (MongoDB, Express, React, Node.js) application designed with TypeScript on the frontend and ES Modules on the backend. Memory management is split across two execution environments:
- **Client-Side (Browser V8 Engine)**: React context state, browser DOM node lifecycle, HTTP client configurations, and browser storage (`localStorage`).
- **Server-Side (Node.js V8 Runtime)**: Express request/response lifecycles, MongoDB/Mongoose connection pooling, in-memory object references, and testing memory runners (`mongodb-memory-server`).

---

## 2. Frontend Memory Architecture

### 2.1 React Context & Component State
- **State Store**: Managed centrally via [`AuthContext.tsx`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/frontend/src/context/AuthContext.tsx).
- **In-Memory State Variables**:
  - `user`: Holds the authenticated user profile object (`_id`, `name`, `email`, `role`).
  - `token`: String representing the JWT or `null`.
  - `loading`: Boolean flag managing asynchronous resolution state.
- **State Propagation**: `AuthProvider` wraps the entire root application in [`App.tsx`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/frontend/src/App.tsx). State updates trigger re-renders only on subscribed consumers (`Login`, `Signup`, `Dashboard`, `ProtectedRoute`).

### 2.2 Global Axios Instance & Header Mutation
In [`AuthContext.tsx`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/frontend/src/context/AuthContext.tsx#L27-L33):
```typescript
useEffect(() => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
}, [token]);
```
- **Memory Impact**: Modifying `axios.defaults` operates on a singleton instance in module memory. While lightweight, global configuration mutations can lead to race conditions if multiple concurrent requests execute during token transitions or multi-tenant instances.
- **Optimization Recommendation**: Prefer creating dedicated Axios instances (`axios.create()`) with request interceptors rather than modifying global module defaults.

### 2.3 Storage & Serialization Lifecycle
- **Browser Persistence**: Tokens are mirrored between React state (`token`) and browser `localStorage`.
- **Heap vs Storage Overhead**:
  - `localStorage.setItem('token', newToken)` serializes string payloads to disk/browser storage.
  - Heap retains lightweight JSON user payloads (< 1 KB per session).
- **Cleanup**: On `logout()` or 401 unauthenticated responses during `checkAuth()`, `localStorage.removeItem('token')` and `setUser(null)` release heap references, allowing browser garbage collection (GC) to reclaim memory.

---

## 3. Backend Memory Architecture

### 3.1 Node.js Process & Event Loop
- **Runtime Model**: Single-threaded event loop backed by libuv thread pool (used for cryptographic operations like `bcrypt` and DNS lookups).
- **Stateless Design**: The backend maintains no persistent in-memory session store (such as Express sessions or Redis). Authentication is fully stateless using JWTs.
- **Request Allocations**:
  - Each incoming HTTP request instantiates `req` and `res` objects, parsed JSON body objects (`express.json()`), and route handlers.
  - Lifespan is short-lived (< 50ms average), collected in Minor GC (Scavenge) cycles.

### 3.2 Database Connection Pooling (Mongoose)
In [`db.js`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/backend/config/db.js):
```javascript
await mongoose.connect(mongoURI);
```
- **Connection Pool**: Default Mongoose/MongoDB driver pool allocates up to 100 concurrent socket connections.
- **Memory Footprint**: Each socket connection retains internal buffer queues for query serialization.
- **Lifecycle**: Connection is opened once on server bootstrap (`server.js`) and persists for the lifecycle of the Node process.

### 3.3 Test Database In-Memory Footprint
- **Artifact**: `mongodb-memory-server` is configured in root `package.json` devDependencies.
- **Behavior**: Spins up a transient standalone MongoDB binary in system RAM.
- **Memory Footprint**: Consumes between 150MB to 400MB of RAM during unit/integration testing suites. Requires explicit teardown (`mongoServer.stop()`) in test suites to prevent orphan processes and memory exhaustion.

---

## 4. Memory Leak Risk Matrix & Hotspots

| Risk Area | Location | Severity | Description | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **Global Axios Header Mutation** | `frontend/src/context/AuthContext.tsx` | Low | Mutating `axios.defaults.headers.common` can leak headers across unexpected external calls. | Instantiate a scoped `apiClient = axios.create()` with request/response interceptors. |
| **Uncancelled Async State Updates** | `frontend/src/context/AuthContext.tsx` (`checkAuth`) | Low | If component unmounts before `/api/auth/me` resolves, `setUser()` / `setLoading()` updates unmounted state. | Implement `AbortController` in `useEffect` cleanup hook. |
| **Unhandled Promise Rejections** | `backend/controllers/authController.js` | Medium | Uncaught errors or database hanging connections without timeouts can tie up event loop sockets. | Implement socket connect timeouts (`serverSelectionTimeoutMS`) and centralized Express error middleware. |
| **Bcrypt CPU/Memory Pressure** | `backend/models/User.js` (`genSalt(12)`) | Low / Controlled | Salt rounds of 12 consume ~250ms CPU time and allocated buffer memory per registration/login request. | Rate-limit authentication routes to prevent denial-of-service memory/CPU exhaustion. |

---

## 5. Performance & Caching Recommendations

1. **Client-Side Query Caching**: Introduce **TanStack Query (React Query)** or **SWR** for caching profile and dynamic domain data to avoid redundant network calls and optimize in-memory caching.
2. **Database Query Projections**: In [`authController.js`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/backend/controllers/authController.js), queries use `.select('-password')` which correctly prevents password hashes from residing in application memory. Use `.lean()` for read-only queries to bypass heavy Mongoose document hydration.
3. **Stream Handling**: When future features include media/file uploads (e.g., citizen incident reports), stream directly to cloud storage (S3/Cloudinary) rather than buffering large payloads in server RAM.
