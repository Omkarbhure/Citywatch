# CityWatch — Frontend Design & UI/UX Documentation
**Application:** CityWatch (Real-Time Civic Incident Reporting & Authority Triage Platform)  
**Stack:** React 18, TypeScript, Vite, React Router v6, Axios, Socket.IO Client, Leaflet, Recharts, Web Push  

---

## 1. Design Overview & Philosophy

CityWatch is built with a **modern, high-contrast, civic-first design system** engineered for two distinct user personas:
1. **Citizens**: Streamlined, intuitive mobile-responsive workflows for instant incident reporting with GPS coordinate capture, live map browsing, and upvoting civic issues.
2. **Municipal Authorities**: High-density triage command centers featuring real-time incident queues, one-click claiming, inline status/priority updates, and aggregate SLA analytics charts.

```
                  ┌──────────────────────────────────────────────────────────┐
                  │                 CityWatch UI Architecture                │
                  └─────────────────────────────┬────────────────────────────┘
                                                │
                 ┌──────────────────────────────┴──────────────────────────────┐
                 ▼                                                             ▼
     ┌───────────────────────┐                                     ┌───────────────────────┐
     │   Citizen Workflows   │                                     │  Authority Workflows  │
     ├───────────────────────┤                                     ├───────────────────────┤
     │ • Incident Reporting  │                                     │ • Triage Queue Table  │
     │ • Live Feed & Upvotes │                                     │ • Claim & Assignment  │
     │ • Leaflet Map & Pins  │                                     │ • Inline Status/Pri   │
     │ • Web Push Sub Toggle │                                     │ • Recharts Analytics  │
     └───────────────────────┘                                     └───────────────────────┘
```

---

## 2. Design System Tokens & Color Palette

### 2.1 Core Neutral & Layout Colors
| Token Name | Hex Code | Usage |
|---|---|---|
| **Background Primary** | `#f8f9fa` / `#f3f4f6` | Application page background |
| **Surface / Card** | `#ffffff` | Elevated cards, tables, modal containers |
| **Surface Dark (Header)** | `#1f2937` / `#111827` | Navigation bar, dark authority header |
| **Border Subdued** | `#e5e7eb` / `#dee2e6` | Card borders, table dividers, input borders |
| **Text Primary** | `#111827` / `#212529` | Headings, high-emphasis body text |
| **Text Secondary** | `#4b5563` / `#6c757d` | Subtitles, timestamps, metadata labels |
| **Brand Accent** | `#2563eb` / `#0d6efd` | Primary CTA buttons, active tabs, map center |

---

### 2.2 Incident Priority Tokens (Authority View)
| Priority | Background | Text Color | Icon / Visual Indicator |
|---|---|---|---|
| **Critical** | `#dc3545` | `#ffffff` | 🔴 Critical badge — High-urgency alert (hazard/safety) |
| **High** | `#fd7e14` | `#ffffff` | 🟠 High badge — Immediate dispatch needed |
| **Medium** | `#ffc107` | `#212529` | 🟡 Medium badge — Standard maintenance queue |
| **Low** | `#28a745` | `#ffffff` | 🟢 Low badge — Scheduled or minor cosmetic issue |

---

### 2.3 Incident Status Tokens (Feed & Triage)
| Status | Badge Background | Badge Text | Meaning |
|---|---|---|---|
| **Pending** | `#6c757d` | `#ffffff` | Newly reported, awaiting municipal review |
| **Acknowledged** | `#17a2b8` | `#ffffff` | Reviewed and logged into department queue |
| **In Progress** | `#ffc107` | `#212529` | Maintenance / response team dispatched to location |
| **Resolved** | `#28a745` | `#ffffff` | Repair verified and closed |
| **Rejected** | `#dc3545` | `#ffffff` | Duplicate report, invalid jurisdiction, or spam |

---

### 2.4 Incident Category Tokens & Icons
| Category Key | Label | Icon | Typical Marker Color |
|---|---|---|---|
| `pothole` | Pothole / Road Damage | 🕳️ | `#d97706` (Amber) |
| `streetlight` | Streetlight Outage | 💡 | `#eab308` (Yellow) |
| `garbage` | Waste & Illegal Dumping | 🗑️ | `#16a34a` (Green) |
| `flooding` | Waterlogging / Drain Block | 🌊 | `#0284c7` (Sky Blue) |
| `safety` | Hazard & Public Safety | ⚠️ | `#dc2626` (Red) |
| `other` | General Civic Request | 📌 | `#6b7280` (Gray) |

---

## 3. Screen-by-Screen Component Specifications

### 3.1 Authentication Views (`/login` & `/signup`)
- **Layout**: Centered card (`max-w-md`) with soft shadow, brand logo header, and dual-mode switch links.
- **Form Controls**:
  - Email & Password with live focus rings (`focus:ring-2 focus:ring-blue-500`).
  - Name input (on Signup).
  - Validation error feedback box (`bg-red-50 text-red-700 border-red-200`).
- **Security Guarding**:
  - Automatically redirects authenticated users to `/dashboard`.
  - Public registration defaults role strictly to `citizen`.

---

### 3.2 Citizen Dashboard (`/dashboard`)
- **Navigation Header**: User profile greeting, role badge (`Citizen`), Web Push status pill, and Logout CTA.
- **Notification Banner Card**:
  - Displays push subscription state with single-click Subscribe / Unsubscribe toggle.
  - Browser support detection with permission prompt trigger.
- **Quick Action Grid**:
  - 📝 **Report Incident Card**: Navigates to `/report`.
  - 🗺️ **Live Map Explorer Card**: Navigates to `/map`.
  - 📋 **Browse All Incidents Card**: Navigates to `/incidents`.

---

### 3.3 Incident Reporting Form (`/report` — [`IncidentForm.tsx`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/frontend/src/components/IncidentForm.tsx))
- **Form Fields**:
  - `Title`: Short descriptive headline (max 120 chars).
  - `Category`: Dropdown with 6 civic categories.
  - `Description`: Multi-line textarea for situational context.
  - `Location Acquisition`:
    - **"📍 Use Current Location" Button**: Triggers browser `navigator.geolocation.getCurrentPosition`.
    - **Coordinate Display**: Read-only display of captured Latitude and Longitude with precision formatting.
    - **Address Field**: Optional reverse-geocoded or manually typed street address.
- **Submission Guard**:
  - Submit button disabled until valid GPS coordinates are captured.
  - Submitting dispatches `POST /api/incidents` and redirects to `/dashboard` upon confirmation.

---

### 3.4 Live Incident Feed (`/incidents` — [`IncidentFeed.tsx`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/frontend/src/components/IncidentFeed.tsx))
- **Real-Time Reactive Updates**:
  - Subscribes to Socket.IO geo-room based on user coordinates (`subscribe:area`).
  - `incident:new`: Automatically prepends new incidents to the top of the feed with a smooth entry animation.
  - `incident:updated`: Live-updates the status badge of the matching incident card without requiring a page reload.
  - `incident:upvoted`: Live-increments the upvote counter badge.
- **Card Elements**:
  - Header: Category icon, Title, Status Badge.
  - Body: Description text, Address / Coordinate pill.
  - Footer: Reporter name, relative timestamp (`"2 hours ago"`), and interactive **Upvote Button** (`👍 Upvote (count)`).

---

### 3.5 Interactive Map Explorer (`/map` — [`IncidentMap.tsx`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/frontend/src/components/IncidentMap.tsx))
- **Map Engine**: Leaflet with OpenStreetMap tile layers.
- **Features**:
  - **Marker Clustering**: Groups close incidents into numeric clusters with category badges.
  - **Custom Pins**: Dynamic SVG marker icons colored by incident category.
  - **Interactive Popups**:
    - Clicking a pin opens a popup showing Title, Status, Upvotes, and a direct "Upvote" button.
  - **Filter Bar ([`IncidentMapFilters.tsx`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/frontend/src/components/IncidentMapFilters.tsx))**:
    - Filter pills for toggling categories (`Pothole`, `Streetlight`, `Flooding`, etc.).
    - Status toggle (`Active only` vs `All`).
    - Radius slider / dropdown (`1km`, `2km`, `5km`, `10km`).

---

### 3.6 Authority Triage Dashboard (`/authority` — [`AuthorityDashboard.tsx`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/frontend/src/components/AuthorityDashboard.tsx))
- **Access Control**: RBAC-gated (`RequireRole role="authority"`). Citizen visitors are automatically redirected.
- **Live Alert Banner**: Top banner flashes `"🚨 New incoming incident: [Title]"` on `incident:new` broadcast.
- **Filter Controls**:
  - Status Filter (`Active`, `Pending`, `Acknowledged`, `In Progress`, `Resolved`, `Rejected`).
  - Priority Filter (`All`, `Critical`, `High`, `Medium`, `Low`).
  - Assignment Filter (`All`, `Unassigned`, `Claimed by Me`).
  - Sort Selector (`Priority (Critical First)`, `Oldest First`, `Most Upvoted`, `Newest First`).
- **High-Density Queue Table**:
  - Columns: `Priority`, `Category`, `Title & Location`, `Reporter`, `Reported Time`, `Status`, `Assigned Officer`, `Actions`.
  - **Claim Action**: Single-click `"Claim"` button assigns incident to logged-in officer (`PATCH /:id/assign`).
  - **Unassign Action**: Releases claimed ticket back to open queue.
  - **Inline Dropdowns**:
    - Status dropdown for immediate progression (`Pending` -> `Acknowledged` -> `In Progress` -> `Resolved`).
    - Priority dropdown for escalation (`Medium` -> `High` -> `Critical`).

---

### 3.7 Analytics & SLA Metrics Dashboard (`/authority/analytics` — [`AnalyticsDashboard.tsx`](file:///c:/Users/ASUS/OneDrive/Desktop/Citywatch/frontend/src/components/AnalyticsDashboard.tsx))
- **Date Range Selector**: Predefined date presets (`Last 7 Days`, `Last 30 Days`, `Custom Range`) with validated date pickers.
- **KPI Summary Cards**:
  - 📊 **Total Reported Incidents**: Range aggregate count.
  - ⏱️ **Average Resolution Time**: Computed in hours from creation to resolution history timestamp.
  - 🚨 **SLA Breaches (>72h Unresolved)**: High-visibility warning card with count of overdue tickets.
  - ✅ **Resolution Rate**: Percentage of resolved vs total incidents.
- **Recharts Data Visualizations**:
  - **Category Breakdown**: Bar chart illustrating report volume across civic categories.
  - **Status Distribution**: Donut / Pie chart showing queue progression proportions.
  - **Resolution Timeline**: Line chart tracking resolution performance over time.

---

## 4. UI Routing & Navigation Architecture

```mermaid
graph TD
    A["Public Visitor"] -->|/login| B["Login Page"]
    A -->|/signup| C["Signup Page"]
    
    B -->|JWT Issued (role: citizen)| D["ProtectedRoute"]
    C -->|Auto-login (role: citizen)| D
    
    subgraph "Citizen Protected Area"
        D -->|/dashboard| E["Citizen Dashboard"]
        D -->|/report| F["Incident Report Form (GPS)"]
        D -->|/incidents| G["Live Incident Feed"]
        D -->|/map| H["Leaflet Map Explorer"]
    end
    
    subgraph "Authority RBAC Gated Area (RequireRole 'authority')"
        D -->|/authority| I["Authority Triage Queue"]
        D -->|/authority/analytics| J["Analytics & SLA Metrics"]
    end
    
    D -.->|Citizen attempts /authority| E
```

---

## 5. Real-Time UI Event Map (Socket.IO)

| Socket Event | Trigger Source | UI Component Reaction |
|---|---|---|
| `incident:new` | Citizen submits report | • Feed prepends new card at top<br>• Map adds marker to cluster<br>• Authority dashboard shows top alert banner |
| `incident:updated` | Authority modifies status | • Feed card badge updates color & label<br>• Map popup status updates<br>• Queue row status dropdown updates |
| `incident:upvoted` | Citizen clicks upvote | • Upvote counter increments live across all subscribed viewers |

---

## 6. Responsive Breakpoints & Accessibility (a11y)

- **Mobile (< 640px)**:
  - Single-column card stacked layouts.
  - Sticky bottom action buttons on `IncidentForm`.
  - Full-screen map with collapsible floating filter sheet.
- **Tablet (640px – 1024px)**:
  - 2-column dashboard quick action grid.
  - Split view for map and list feed.
- **Desktop (> 1024px)**:
  - Full-width dense data tables for Authority Queue.
  - 4-card metric KPI grids on Analytics Dashboard.
- **Accessibility Standards**:
  - High-contrast color ratios (minimum 4.5:1 for all text badges).
  - Explicit HTML `label` associations for form fields.
  - ARIA attributes on interactive dropdowns and map controls.
