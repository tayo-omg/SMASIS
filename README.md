# SmaWaSIS — Smart Waste & Sanitation Reporting Information System

> Complete design & implementation specification plus working MVP application.

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Architecture Summary](#2-architecture-summary)
3. [Quick Start (Local Development)](#3-quick-start)
4. [Backend Setup](#4-backend-setup)
5. [Frontend Setup](#5-frontend-setup)
6. [Demo Credentials](#6-demo-credentials)
7. [API Reference](#7-api-reference)
8. [Running Tests](#8-running-tests)
9. [Project Structure](#9-project-structure)
10. [Team Contributions](#10-team-contributions)

---

## 1. Project Overview

SmaWaSIS enables citizens to report waste incidents (uncollected refuse, illegal dumping, blocked drains) to local authorities. The system auto-assigns tickets to ward sanitation teams, allows contractors to update progress, and gives administrators a live dashboard with analytics and CSV export.

**Tech Stack:** React 18 · Node.js/Express · PostgreSQL 15 · JWT Auth · Tailwind CSS

---

## 2. Architecture Summary

```
┌─────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER                                       │
│  CitizenApp (React)  ContractorApp (React)  AdminApp     │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS / REST / JSON
┌──────────────────────▼──────────────────────────────────┐
│  BUSINESS LOGIC LAYER (Express.js API)                   │
│  AuthService · TicketService · AssignmentEngine          │
│  SLACalculator · ReportService                           │
└──────────────────────┬──────────────────────────────────┘
                       │ pg (parameterised queries)
┌──────────────────────▼──────────────────────────────────┐
│  PERSISTENCE LAYER                                        │
│  PostgreSQL 15 — users, tickets, locations, categories   │
│  teams, ward_zones, comments, photos, status_log         │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Quick Start

### Prerequisites
- Node.js 20 LTS
- PostgreSQL 15
- npm / yarn

### One-command setup (after PostgreSQL is running):
```bash
# 1. Clone / unzip the project
cd smawasis/app

# 2. Backend
cd backend
cp .env.example .env          # Edit DB credentials
npm install
psql -U postgres -c "CREATE DATABASE smawasis;"
psql -U postgres -d smawasis -f db/schema.sql
npm start

# 3. Frontend (new terminal)
cd ../frontend
npm install
npm start
```

Open http://localhost:3000 in your browser.

---

## 4. Backend Setup

### Environment Variables (`.env`)
```
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=smawasis
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=change_this_to_something_long_and_random
CLIENT_ORIGIN=http://localhost:3000
```

### Database Initialisation
```bash
# Create database
psql -U postgres -c "CREATE DATABASE smawasis;"

# Run schema (creates all tables + seed data)
psql -U postgres -d smawasis -f db/schema.sql

# Verify tables created
psql -U postgres -d smawasis -c "\dt"
```

### Creating Demo Users
After running the schema, register demo users via the API or UI:
```bash
# Citizen
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo Citizen","email":"citizen@demo.com","password":"demo123","role":"citizen"}'

# Contractor (Ward 2 team)
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo Contractor","email":"contractor@demo.com","password":"demo123","role":"contractor","team_id":2}'

# Admin
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo Admin","email":"admin@demo.com","password":"demo123","role":"admin"}'
```

---

## 5. Frontend Setup

```bash
cd app/frontend
npm install
npm start   # Starts on http://localhost:3000
```

The frontend proxies API requests to `http://localhost:5000` via the `proxy` field in `package.json`.

### Production Build
```bash
npm run build
# Serve with: npx serve -s build -l 3000
```

---

## 6. Demo Credentials

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| Citizen | citizen@demo.com | demo123 | Can submit reports, view own tickets |
| Contractor | contractor@demo.com | demo123 | Assigned to Ward 2 team |
| Admin | admin@demo.com | demo123 | Full system access |

---

## 7. API Reference

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | None | Register new user |
| POST | /api/auth/login | None | Login, receive JWT |
| GET | /api/auth/me | JWT | Get current user profile |

### Tickets
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | /api/tickets | Citizen | Create incident report |
| GET | /api/tickets | Admin | List all tickets (paginated, filterable) |
| GET | /api/tickets/mine | Citizen | List own tickets |
| GET | /api/tickets/assigned | Contractor | List assigned team's tickets |
| GET | /api/tickets/:id | All | Ticket detail + comments + history |
| PATCH | /api/tickets/:id/assign | Admin | Assign ticket to team |
| PATCH | /api/tickets/:id/status | Contractor | Update status with optional comment |

### Reports
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /api/reports/summary | Admin | Dashboard metrics (counts, SLA, wards) |
| GET | /api/reports/export | Admin | Download CSV of tickets |

### Utility
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/categories | None | List incident categories |
| GET | /api/categories/teams | Admin | List teams with ward info |
| GET | /api/health | None | Service health check |

### Status Machine
```
open → assigned → received → in_progress → cleared
                ↑                         (terminal)
         (auto or manual)
```

### Example: Create Ticket
```bash
curl -X POST http://localhost:5000/api/tickets \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "category_id": 3,
    "latitude": 6.5244,
    "longitude": 3.3792,
    "address_text": "14 Bode Thomas St",
    "description": "Blocked drain causing flooding"
  }'
```

Response:
```json
{
  "id": 1,
  "ticket_ref": "SWS-20260221-0001",
  "status": "assigned",
  "assigned_team": "Central Sanitation Unit",
  "category_id": 3,
  "created_at": "2026-02-21T10:00:00Z"
}
```

---

## 8. Running Tests

```bash
cd app/backend
npm test
```

Test cases cover: TC-01 (register), TC-02 (bad login), TC-03 (submit report), TC-09 (invalid transition), TC-10 (cross-role access), plus validation and health checks.

---

## 9. Project Structure

```
smawasis/
├── app/
│   ├── backend/
│   │   ├── db/
│   │   │   ├── index.js          ← PostgreSQL connection pool
│   │   │   └── schema.sql        ← Full DB schema + seed data
│   │   ├── middleware/
│   │   │   └── auth.js           ← JWT verify + requireRole
│   │   ├── routes/
│   │   │   ├── auth.js           ← Register/login/me
│   │   │   ├── tickets.js        ← Full ticket CRUD
│   │   │   └── reports.js        ← Analytics + CSV export
│   │   ├── controllers/
│   │   │   └── assignmentEngine.js ← Ward zone lookup
│   │   ├── tests/
│   │   │   └── api.test.js       ← Jest integration tests
│   │   ├── server.js             ← Express app entry point
│   │   ├── .env.example
│   │   └── package.json
│   └── frontend/
│       ├── public/
│       │   └── index.html
│       ├── src/
│       │   ├── App.js            ← Complete React application
│       │   └── index.js          ← React root
│       └── package.json
├── SmaWaSIS_Specification.docx   ← Full design document (10 roles)
├── SmaWaSIS_PM_Tracker.xlsx      ← PM tracker (timeline, tasks, etc.)
└── README.md                     ← This file
```

---

## 10. Team Contributions

| Role | Member | Contribution % | Key Deliverables |
|------|--------|---------------|------------------|
| Project Manager | PM | 10% | Timeline, tracker, meeting notes, integration plan, packaging |
| Problem Definition | Analyst | 5% | Problem statement, objectives, scope, constraints |
| Requirements Engineer | Analyst | 10% | Actor list, use case specs, UC diagram |
| NFR Lead | Analyst | 8% | NFR catalogue, quality attribute risk register |
| System Modelling | Architect | 7% | Context diagram, domain class diagram |
| Software Architect | Architect | 10% | Layered architecture, component diagram, tech stack |
| Database Designer | Backend Dev | 10% | ERD, schema.sql, indexes, normalisation, analytics queries |
| Backend Developer | Backend Dev | 20% | REST API, auth, ticket service, assignment engine, reports |
| Frontend Developer | Frontend Dev | 15% | React app (citizen/contractor/admin portals), responsive UI |
| QA / Documentation | QA | 5% | Test plan, test cases, bug template, demo script, README |
| **Total** | | **100%** | |

---

*SmaWaSIS v1.0 — Academic Submission, February 2026*
