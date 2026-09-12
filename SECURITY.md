# Security Architecture & Vulnerability Assessment — CityWatch

This document provides a comprehensive security review of the **CityWatch** authentication system, highlighting current defenses, identified vulnerabilities, risk severity ratings, and actionable remediation steps.

---

## 1. Security Overview & Threat Model

CityWatch utilizes a token-based authentication mechanism with JSON Web Tokens (JWT) and hashed credentials via `bcryptjs`. 

### Key Security Assets
- User credentials (passwords, email addresses).
- JSON Web Tokens granting authorized session access.
- Role-based privileges (`citizen` vs `authority`).
- Backend database records and connection strings.

---

## 2. Identified Vulnerabilities & Risk Analysis

### 🚨 Critical Severity: Unrestricted Role Assignment (Privilege Escalation)
- **Location**: [`backend/controllers/authController.js`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/backend/controllers/authController.js#L12-L32) and [`frontend/src/components/Signup.tsx`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/frontend/src/components/Signup.tsx#L79-L87)
- **Vulnerability**: The public registration endpoint directly accepts the `role` parameter from the HTTP request body (`role: role || 'citizen'`).
- **Impact**: Any malicious user can send `{ "role": "authority" }` to `/api/auth/register` to gain full administrative authority privileges without verification or admin approval.
- **Remediation**:
  - Default all self-service public registrations strictly to `'citizen'`.
  - Require a separate administrative invitation or multi-factor approval flow for `'authority'` accounts.

---

### ⚠️ High Severity: Insecure Token Storage (XSS Vulnerability)
- **Location**: [`frontend/src/context/AuthContext.tsx`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/frontend/src/context/AuthContext.tsx#L62)
- **Vulnerability**: JWT tokens are stored in browser `localStorage`.
- **Impact**: Any Cross-Site Scripting (XSS) vulnerability in the frontend application or third-party dependency can read `localStorage.getItem('token')` and exfiltrate user session tokens.
- **Remediation**:
  - Transition from `localStorage` to **`HttpOnly`**, **`Secure`**, **`SameSite=Strict`** cookies.
  - Set up a short-lived access token (15 mins) and a long-lived refresh token stored in an HttpOnly cookie with rotation.

---

### ⚠️ High Severity: Long-Lived JWT Tokens Without Revocation
- **Location**: [`backend/controllers/authController.js`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/backend/controllers/authController.js#L4-L8)
- **Vulnerability**: JWTs are issued with a fixed **30-day lifetime** (`expiresIn: '30d'`) without blacklisting or token versioning.
- **Impact**: If a token is compromised, an attacker retains full access for 30 days even if the user changes their password or requests account termination.
- **Remediation**:
  - Reduce access token expiration to 15–60 minutes.
  - Implement a token revocation list (via Redis) or add a `tokenVersion` / `passwordChangedAt` timestamp check in [`backend/middleware/auth.js`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/backend/middleware/auth.js).

---

### ⚠️ Medium Severity: Permissive CORS Configuration
- **Location**: [`backend/server.js`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/backend/server.js#L13)
- **Vulnerability**: `app.use(cors())` enables unrestricted Cross-Origin Resource Sharing (`Access-Control-Allow-Origin: *`).
- **Impact**: Any external domain can make cross-origin AJAX requests against the API.
- **Remediation**:
  - Restrict CORS origins to explicitly allowed frontend domains:
    ```javascript
    app.use(cors({
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true
    }));
    ```

---

### ⚠️ Medium Severity: Absence of Rate Limiting & Brute-Force Protection
- **Location**: [`backend/routes/auth.js`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/backend/routes/auth.js)
- **Vulnerability**: No rate-limiting middleware is attached to `/login` or `/register`.
- **Impact**: Attackers can execute automated credential stuffing, brute-force password guessing, or trigger Denial of Service (DoS) by overloading `bcrypt.compare` (salt factor 12).
- **Remediation**:
  - Apply `express-rate-limit` on authentication endpoints (e.g., max 5–10 attempts per IP per 15-minute window).

---

### ⚠️ Low / Medium Severity: Missing Security Headers & Input Sanitization
- **Location**: [`backend/server.js`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/backend/server.js)
- **Vulnerability**: Missing `helmet` middleware for standard HTTP security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options) and missing NoSQL injection protection (`express-mongo-sanitize`).
- **Impact**: Increased susceptibility to clickjacking, MIME-type sniffing, and NoSQL query injection payloads (`{"$gt": ""}`).
- **Remediation**:
  - Install and configure `helmet` and `express-mongo-sanitize`.
  - Add request payload schema validation using `zod` or `joi`.

---

## 3. Current Positive Security Practices

- ✅ **Password Hashing**: Utilizes `bcryptjs` with a robust work factor (`saltRounds = 12`) in [`User.js`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/backend/models/User.js#L35).
- ✅ **Mongoose Password Exclusion**: Queries like `User.findById().select('-password')` prevent password hashes from leaking in API responses.
- ✅ **Environment Isolation**: Sensitive configuration files (`.env`, `backend/.env`) are properly excluded in [`.gitignore`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/.gitignore).
- ✅ **Route Guards**: Frontend uses a dedicated [`ProtectedRoute.tsx`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/frontend/src/components/ProtectedRoute.tsx) to prevent unauthenticated navigation.

---

## 4. Hardening & Compliance Checklist

| Item | Control | Status | Priority |
| :--- | :--- | :---: | :--- |
| 1 | Restrict citizen/authority role escalation on public signup | ❌ Open | P0 (Critical) |
| 2 | Migrate tokens from localStorage to HttpOnly/SameSite cookies | ❌ Open | P1 (High) |
| 3 | Reduce token expiration + implement Refresh Token flow | ❌ Open | P1 (High) |
| 4 | Add `express-rate-limit` to `/api/auth/login` and `/register` | ❌ Open | P1 (High) |
| 5 | Restrict CORS whitelist to designated frontend domains | ❌ Open | P2 (Medium) |
| 6 | Integrate `helmet` for HTTP response security headers | ❌ Open | P2 (Medium) |
| 7 | Add Schema Validation (`zod`/`joi`) & `express-mongo-sanitize` | ❌ Open | P2 (Medium) |
| 8 | Validate strong password policies (min length, symbols, digits) | ⚠️ Partial (min 6) | P3 (Low) |
