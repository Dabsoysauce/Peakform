# Peakform — Project Overview

**Peakform** (also marketed as "Athlete Edge") is a full-stack basketball training platform for athletes and coaches.

## Tech Stack
- **Frontend**: Next.js 14, React 18, Tailwind CSS, Recharts, Socket.IO client
- **Backend**: Node.js, Express 4, PostgreSQL, Socket.IO, JWT auth (7-day expiration)
- **AI**: Anthropic Claude API (film analysis, play diagram analysis, player detection, chat assistant)
- **Storage**: Supabase (file uploads)
- **Auth**: Email/password + Google OAuth 2.0
- **Deployment**: Frontend on Vercel (`peakformnow.vercel.app`), Backend on port 4000

## User Roles
- **Athlete** — players who log training, join teams, upload film
- **Trainer** — coaches who create teams, manage athletes, assign workouts/goals, create plays

---

## Athlete Features

| Feature | Details |
|---|---|
| **Workout Tracking** | Log sessions with exercises, sets, reps, weight, RPE, and notes |
| **Goal Setting** | Create goals with custom metrics, targets, deadlines; auto-marked as achieved |
| **Film Room** | Upload video (MP4/MOV/etc.) or YouTube links for analysis |
| **AI Film Analysis** | Claude AI analyzes form, technique, strengths, and improvement areas from video frames |
| **Progress Photos** | Upload photos with weight/notes to track physique over time |
| **Team Joining** | Join coach teams via 8-character join codes |
| **Notifications** | Get notified of workout/goal assignments and messages |
| **Public Profile** | Shareable profile with stats, bio, film, and school info |

---

## Coach/Trainer Features

| Feature | Details |
|---|---|
| **Team Management** | Create teams, generate join codes, manage members |
| **Workout Assignment** | Assign structured workouts to individual players |
| **Goal Assignment** | Set performance goals for players |
| **Practice Planning** | Build time-blocked practice plans (e.g., 10min shooting, 15min defense) |
| **Playbook Editor** | Interactive basketball court diagram tool — place players, draw plays (cuts, passes, screens, etc.), animate execution, save as PNG |
| **AI Play Analysis** | Claude AI reviews play diagrams for strategic strengths, weaknesses, defensive counters |
| **Film Coaching** | View/analyze player-uploaded film with AI |
| **Depth Charts** | Assign players to PG/SG/SF/PF/C positions with ordering |
| **Schedule/Calendar** | Create game/practice events, share with team via auto-formatted DMs |
| **Player Search** | Browse/search all registered athletes by name, school, goal, email |

---

## Shared Features

| Feature | Details |
|---|---|
| **Real-Time Messaging** | Team chat + 1-on-1 DMs via Socket.IO, with emoji reactions |
| **AI Chat Assistant** | In-app Claude-powered helper for navigation and training advice |
| **Google OAuth** | Sign in with Google in addition to email/password |
| **Notifications** | Real-time delivery for messages, assignments, profile views |
| **Rate Limiting** | Auth (20/15min), AI (10/min), general API (100/min) |

---

## Database Entities
- `users`, `athlete_profiles`, `trainer_profiles`
- `workout_sessions`, `exercises`, `goals`
- `media`, `progress_photos`
- `teams`, `team_members`
- `messages`, `direct_messages`, `notifications`
- `profile_views`, `schools`, `events`
- `plays`, `practice_plans`, `checklists`, `depth_chart_entries`

## Color Scheme
- Primary: `#e85d26` (orange-red)
- Background: `#0f0f1a` (dark navy)
- Card: `#1e1e30`
- Surface: `#16213e`
- Success: `#4ade80`

## Contact
- ryan.dhalbisoi@gmail.com
- shrey2425@gmail.com
