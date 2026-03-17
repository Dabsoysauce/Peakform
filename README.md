# PeakForm



PeakForm is a full-stack fitness tracking platform for gym athletes and personal trainers. Athletes log workouts, track PRs and goals, upload form videos, and communicate with their trainer groups. Trainers create team rooms, manage athletes, and send real-time messages.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React 18, Tailwind CSS, Recharts, Socket.IO client |
| Backend | Node.js, Express 4, PostgreSQL, JWT auth (7-day), bcryptjs, Socket.IO, multer, uuid, cors, dotenv, pg |

---

## Features

### Athletes
- Register / login with role-based routing
- Log workout sessions with exercises (sets, reps, weight, RPE)
- Track fitness goals (bench PR, squat, deadlift, bodyweight, etc.) with auto-achievement detection
- Upload form videos via URL (YouTube embeds supported automatically)
- Join trainer teams using an 8-character join code
- Real-time team chat with Socket.IO

### Trainers
- Create training teams with unique join codes
- Optional broadcast-only mode per team
- Real-time chat with team members
- View member list per team
- Browse athletes by name or gym
- Set specialty, certifications, and bio

---

## Setup Instructions

### 1. Clone and Install

```bash
cd /path/to/PeakForm
npm run install:all
```

### 2. Configure Environment

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:

```
DATABASE_URL=postgresql://localhost:5432/peakform
JWT_SECRET=change_this_to_a_random_secret
PORT=4000
```

### 3. Set Up Database

Create the database first:
```bash
createdb peakform
```

Then run the schema:
```bash
npm run db:setup
```

### 4. Start Development

```bash
npm run dev
```

This starts both:
- Backend API on `http://localhost:4000`
- Frontend on `http://localhost:3000`

---

## Project Structure

```
PeakForm/
├── client/              # Next.js 14 frontend
│   └── src/app/
│       ├── page.js              # Landing page
│       ├── login/               # Auth pages
│       ├── register/
│       ├── dashboard/           # Athlete dashboard
│       │   ├── workouts/
│       │   ├── goals/
│       │   ├── media/
│       │   ├── team/
│       │   └── profile/
│       └── trainer/             # Trainer dashboard
│           ├── teams/
│           ├── athletes/
│           └── profile/
└── server/              # Express API
    ├── routes/          # All API routes
    ├── middleware/      # JWT auth
    ├── socket/          # Socket.IO setup
    ├── config/          # DB pool
    └── schema.sql       # PostgreSQL schema
```

---

## API Routes

| Method | Path | Description |
|---|---|---|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |
| GET/PUT | /api/athlete-profile | Get/update athlete profile |
| GET/PUT | /api/trainer-profile | Get/update trainer profile |
| GET/POST | /api/workouts | List / create sessions |
| GET/DELETE | /api/workouts/:id | Get session with exercises / delete |
| POST | /api/workouts/:id/exercises | Add exercise |
| DELETE | /api/workouts/:sessionId/exercises/:exerciseId | Remove exercise |
| GET/POST | /api/goals | List / create goals |
| PUT/DELETE | /api/goals/:id | Update / delete goal |
| POST | /api/goals/check | Check goal completion |
| GET/POST | /api/media | List / add media |
| DELETE | /api/media/:id | Delete media |
| GET/POST | /api/teams | List teams / create team (trainer) |
| POST | /api/teams/join | Join team by key (athlete) |
| GET | /api/teams/:id/members | Get team members |
| DELETE | /api/teams/:id/leave | Leave team (athlete) |
| GET/POST | /api/messages/:teamId | Get / send messages |
| GET | /api/athletes | Search athletes |

---

## .env.example

```
DATABASE_URL=postgresql://localhost:5432/peakform
JWT_SECRET=your_jwt_secret_here
PORT=4000
```

---

## Color Scheme

- Primary: `#e85d26` (orange-red)
- Background: `#0f0f1a` (very dark navy)
- Card: `#1e1e30`
- Surface: `#16213e`
- Accent: `#1a1a2e`
- Green: `#4ade80`
