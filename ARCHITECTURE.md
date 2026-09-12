# System Architecture & Technical Design — CityWatch

This document describes the high-level system architecture, layer decomposition, data flows, API specifications, and component hierarchy of the **CityWatch** platform.

---

## 1. System Topology Overview

CityWatch is structured as a decoupled **Single Page Application (SPA) + RESTful Micro-Backend** built on the MERN stack.

```
+-------------------------------------------------------------------------+
|                              CLIENT TIER                                |
|  React 18 + TypeScript + Vite (Port 3000)                               |
|                                                                         |
|  +-------------------+  +--------------------+  +--------------------+  |
|  |   <Login />       |  |   <Signup />       |  |   <Dashboard />    |  |
|  +-------------------+  +--------------------+  +--------------------+  |
|            \                      |                     /               |
|             \                     |                    /                |
|              +--------------------+-------------------+                 |
|              |         AuthContext & Provider         |                 |
|              | (user, token, login, register, logout) |                 |
|              +--------------------+-------------------+                 |
+-----------------------------------|-------------------------------------+
                                    | (Vite Proxy / HTTP JSON)
                                    v
+-------------------------------------------------------------------------+
|                              SERVER TIER                                |
|  Node.js + Express (ES Modules, Port 5000)                              |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  | Middleware: cors, express.json, auth.protect                      |  |
|  +-------------------------------------------------------------------+  |
|  | Controllers: authController.js (register, login, getProfile)      |  |
|  +-------------------------------------------------------------------+  |
|  | ODM Model: Mongoose User Schema (Pre-save bcrypt, checkPassword)  |  |
+-----------------------------------|-------------------------------------+
                                    | (Mongoose Connection Pool)
                                    v
+-------------------------------------------------------------------------+
|                                DATA TIER                                |
|  MongoDB Database (Atlas / Local / In-Memory Server)                    |
|  Collection: users                                                      |
+-------------------------------------------------------------------------+
```

---

## 2. Component & Module Decomposition

### 2.1 Frontend Architecture (`/frontend`)
- **Technology Stack**: React 18, TypeScript, Vite, React Router v6, Axios.
- **Entry Points**:
  - [`index.html`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/frontend/index.html): SPA HTML container.
  - [`main.tsx`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/frontend/src/main.tsx): Mounts `BrowserRouter` and renders root `<App />`.
- **State & Context Layer**:
  - [`AuthContext.tsx`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/frontend/src/context/AuthContext.tsx): Manages authentication lifecycle, token synchronization with `localStorage`, and injects `Authorization` bearer token into HTTP headers.
- **Routing & Route Protection**:
  - [`App.tsx`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/frontend/src/App.tsx): Declares declarative routes (`/`, `/login`, `/signup`, `/dashboard`).
  - [`ProtectedRoute.tsx`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/frontend/src/components/ProtectedRoute.tsx): Route wrapper checking `user` authentication state; redirects unauthenticated visitors to `/login`.
- **UI Components**:
  - [`Login.tsx`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/frontend/src/components/Login.tsx): User credential form with redirection on active session.
  - [`Signup.tsx`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/frontend/src/components/Signup.tsx): Account creation form with role selector (`citizen` / `authority`).
  - [`Dashboard.tsx`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/frontend/src/components/Dashboard.tsx): Authenticated home screen displaying user information and logout trigger.

### 2.2 Backend Architecture (`/backend`)
- **Technology Stack**: Node.js (ES Modules), Express 4, Mongoose 8, JWT, bcryptjs.
- **Entry Point**:
  - [`server.js`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/backend/server.js): Express application initialization, CORS, JSON body parser, route mounting, and listener on port 5000.
- **Configuration**:
  - [`config/db.js`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/backend/config/db.js): Asynchronous MongoDB connection establishing connection pooling.
- **Routing & Controllers**:
  - [`routes/auth.js`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/backend/routes/auth.js): Auth routing table mapping `/register`, `/login`, `/me`.
  - [`controllers/authController.js`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/backend/controllers/authController.js): Controller handlers executing business logic and JWT generation.
- **Middleware**:
  - [`middleware/auth.js`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/backend/middleware/auth.js): Bearer token validation and user identity attachment to `req.user`.
- **Data Models**:
  - [`models/User.js`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/backend/models/User.js): User Mongoose schema with pre-save password hashing and `checkPassword` instance method.

---

## 3. Data Flow & Request Lifecycles

### 3.1 User Registration Flow
```
User (Signup Form) ──> register(name, email, password, role)
   ──> POST /api/auth/register (via Vite Proxy)
      ──> authController.register()
         ──> Validate inputs
         ──> User.findOne({ email }) [Check existing]
         ──> User.create() ──> Pre-Save Hook (bcrypt.hash, salt=12)
         ──> Generate JWT (expiresIn: 30d)
   <── 201 JSON Response {_id, name, email, role, token}
AuthContext ──> Sets token in localStorage & state ──> Navigates to /dashboard
```

### 3.2 User Login Flow
```
User (Login Form) ──> login(email, password)
   ──> POST /api/auth/login
      ──> authController.login()
         ──> User.findOne({ email })
         ──> user.checkPassword(password) [bcrypt.compare]
         ──> Generate JWT
   <── 200 JSON Response {_id, name, email, role, token}
AuthContext ──> Sets token in localStorage & state ──> Navigates to /dashboard
```

### 3.3 Session Verification Flow (`checkAuth`)
```
Page Refresh / App Mount ──> Token retrieved from localStorage
   ──> GET /api/auth/me [Headers: Authorization: Bearer <token>]
      ──> authMiddleware.protect()
         ──> jwt.verify(token, JWT_SECRET)
         ──> User.findById(decoded.id).select('-password')
         ──> Attach user to req.user
      ──> authController.getProfile()
   <── 200 JSON Response { _id, name, email, role }
AuthContext ──> setUser(data), setLoading(false)
```

---

## 4. API Specification & Interface Contracts

| Method | Endpoint | Protection | Request Payload | Success Status | Response Body |
| :--- | :--- | :---: | :--- | :---: | :--- |
| `POST` | `/api/auth/register` | Public | `{ name, email, password, role? }` | `201 Created` | `{ _id, name, email, role, token }` |
| `POST` | `/api/auth/login` | Public | `{ email, password }` | `200 OK` | `{ _id, name, email, role, token }` |
| `GET` | `/api/auth/me` | Protected (Bearer) | None | `200 OK` | `{ _id, name, email, role, createdAt, updatedAt }` |
| `GET` | `/` | Public | None | `200 OK` | `{ message: "Auth API is running!" }` |

---

## 5. Database Schema & Data Models

### User Collection (`User.js`)
```typescript
interface IUser {
  _id: ObjectId;
  name: string;          // required, trimmed
  email: string;         // required, unique, lowercase, trimmed
  password: string;      // required, minlength: 6, hashed with bcrypt (salt 12)
  role: 'citizen' | 'authority'; // enum, default: 'citizen'
  createdAt: Date;       // auto timestamps
  updatedAt: Date;       // auto timestamps
}
```

---

## 6. Directory Structure

```
Citywatch/
├── backend/
│   ├── config/
│   │   └── db.js                 # Database connection logic
│   ├── controllers/
│   │   └── authController.js     # Auth request handlers
│   ├── middleware/
│   │   └── auth.js               # JWT verification middleware
│   ├── models/
│   │   └── User.js               # Mongoose User model & hooks
│   ├── routes/
│   │   └── auth.js               # Express route definitions
│   ├── package.json              # Backend dependencies & scripts
│   └── server.js                 # Server entry point
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.tsx     # Authenticated dashboard
│   │   │   ├── Login.tsx         # Login view
│   │   │   ├── ProtectedRoute.tsx# Route guard component
│   │   │   └── Signup.tsx        # Registration view
│   │   ├── context/
│   │   │   └── AuthContext.tsx   # React Auth state provider
│   │   ├── App.tsx               # App routing configuration
│   │   ├── index.css             # Base reset stylesheet
│   │   └── main.tsx              # React DOM render root
│   ├── index.html                # Vite template HTML
│   ├── package.json              # Frontend dependencies & scripts
│   ├── tsconfig.json             # TypeScript compiler config
│   └── vite.config.ts            # Vite bundler & reverse proxy config
├── package.json                  # Root runner script package
├── .gitignore                    # Version control ignore lists
├── .gitattributes                # Git line ending configurations
├── ARCHITECTURE.md               # Architecture documentation
├── MEMORY.md                     # Memory & state management analysis
├── SECURITY.md                   # Security & vulnerability analysis
└── STATUS.md                     # Current status & technical debt report
```
