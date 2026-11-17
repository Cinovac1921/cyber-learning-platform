# Cyber Learning Platform

A learning platform for cybersecurity: courses with lessons and quizzes, hands-on CTF challenges, and classrooms
where an instructor runs their own private material for their own students. Built as a full-stack capstone
project with a security-first design.

## What it does

**Students**
- Browse the **public library**, read lessons, mark them complete, and take quizzes (graded on the server).
- Join an instructor's **classroom** with a join code and see that classroom's private courses and quizzes.
- Solve **CTF challenges** (network analysis, forensics, web, reverse engineering, crypto) and climb the leaderboard.
- A dashboard with progress per course, a weekly streak, their classrooms and suggested public courses.
- Sign in, reset a forgotten password by email, and get signed out everywhere when the password changes.

**Instructors**
- Create **classrooms** with a random join code (copy, close, replace, remove students).
- Write courses, lessons and quizzes, in a classroom (private) or for the public library.
- Hide or show individual lessons, so material can be released gradually.
- Browse the **library** and copy a whole course, a lesson or a quiz into their own classroom. Copies arrive hidden
  or unpublished so they can be edited before students see anything.
- Submit public courses for **admin review** and see the reviewer's note if one is sent back.
- See every student's **progress** in a classroom: lessons done, quiz results, last active.
- Create CTF challenges with downloadable files; flags are stored only as hashes.

**Admins**
- Change anyone's role (student, instructor, admin).
- A **review queue** for public courses: read a course in full, then approve it, send it back with a reason, or
  take a live course offline.
- Prepare **templates** that instructors can copy from.
- A notification bell and emails keep admins and instructors informed about review decisions.

## Tech stack

| Part | What |
|---|---|
| Backend | NestJS 12, TypeScript, Prisma 7 with the MariaDB adapter |
| Database | MySQL or MariaDB (XAMPP works) |
| Auth | JWT, argon2 password hashing, rate limiting |
| Email | nodemailer (any SMTP service) |
| Frontend | React 19, Vite, React Router, plain CSS with a dark mode |
| Tests | Jest (backend), ESLint and oxlint |

## Requirements

- **Node.js 24.9 or newer** (the backend's packages are ESM-only and need it)
- **MySQL or MariaDB** running locally (XAMPP is fine)
- npm

## First-time setup

### 1. Get the code
```bash
git clone https://github.com/Cinovac1921/cyber-learning-platform.git
cd cyber-learning-platform
```

### 2. Start the database and create an empty one
Start MySQL (XAMPP control panel, or on Linux `sudo /opt/lampp/lampp startmysql`), then create the database:
```sql
CREATE DATABASE cyber_learning CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
You can run that in phpMyAdmin, or with `mysql -u root -e "..."`.

### 3. Configure the backend
```bash
cd backend
cp .env.example .env
```
Open `.env` and set at least:
- `DATABASE_URL`, like `mysql://USER:PASSWORD@localhost:3306/cyber_learning`. If your `root` account has no
  password (the XAMPP default), leave it empty: `mysql://root:@localhost:3306/cyber_learning`.
- `JWT_SECRET`, a long random value: `openssl rand -hex 32`.

`.env` is ignored by git. Never commit it. Every setting is explained in [Configuration](#configuration).

### 4. Install, create the tables, generate the database client
```bash
npm install
npx prisma migrate deploy
npx prisma generate
```
`migrate deploy` applies every migration in `backend/prisma/migrations`. `prisma generate` builds the typed
database client into `backend/src/generated`, which is not stored in git, so you need it after every fresh
clone and after every new migration.

### 5. Install the frontend
```bash
cd ../frontend
npm install
```
No configuration is needed: in development the frontend sends `/api/...` requests to the backend on port 3000.

### 6. Run both
In two terminals:
```bash
cd backend  && npm run start:dev     # http://localhost:3000
cd frontend && npm run dev           # http://localhost:5173
```
Open http://localhost:5173. The footer of the sign-in page shows "Server connected" when the two are talking.

### 7. Make yourself an admin and add sample content
1. Register an account in the app.
2. Promote it (this is the only way to make the first admin, on purpose):
   ```bash
   cd backend
   npm run role:set -- your@email.com ADMIN
   ```
3. Refresh the browser. An **Admin** tab appears.
4. Optional sample data (three courses with quizzes, one starter template, five CTF challenges):
   ```bash
   npx tsx prisma/seed.ts
   ```
   The seed needs at least one instructor or admin account, because that account becomes the author. It only adds what is
   missing, so running it again is safe.

## Roles

| | Student | Instructor | Admin |
|---|---|---|---|
| Public library, quizzes, challenges, classrooms they joined | yes | yes | yes |
| Create classrooms, courses, lessons, quizzes, challenges | | yes | yes |
| Submit a public course for review | | yes (an admin's goes live at once) | yes |
| Copy from the library | | yes | yes |
| Change roles, review courses, prepare templates | | | yes |

New accounts are always students. Admins and instructors are made from the Admin page, or with `npm run role:set`.
Roles are checked in the database on every request, so a demoted account loses access immediately.

## Everyday commands

| Where | Command | What it does |
|---|---|---|
| `backend` | `npm run start:dev` | Run the API and restart on changes |
| `backend` | `npm test` | Run the tests (no database needed) |
| `backend` | `npm run lint` | Lint the code |
| `backend` | `npm run build` | Compile, which also type-checks |
| `backend` | `npm run role:set -- <email> <STUDENT\|INSTRUCTOR\|ADMIN>` | Change an account's role |
| `backend` | `npx tsx prisma/seed.ts` | Add the sample data |
| `backend` | `npx prisma migrate dev` | Create and apply a migration while developing |
| `backend` | `npx prisma migrate deploy` | Apply the existing migrations |
| `frontend` | `npm run dev` | Run the website with hot reload |
| `frontend` | `npm run build` | Type-check and build for production |
| `frontend` | `npm run lint` | Lint the code |

## Configuration

All backend settings live in `backend/.env` (see `backend/.env.example`).

| Setting | Needed | What it is |
|---|---|---|
| `DATABASE_URL` | yes | `mysql://USER:PASSWORD@HOST:PORT/DATABASE` |
| `JWT_SECRET` | yes | Secret that signs login tokens. Keep it private. |
| `FRONTEND_ORIGIN` | no | Where the frontend runs, allowed by CORS (default `http://localhost:5173`) |
| `PORT` | no | Backend port (default `3000`) |
| `UPLOAD_DIR` | no | Where challenge files are stored (default `backend/uploads`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | for real emails | Any SMTP service |
| `APP_URL` | no | Public address of the frontend, used in email links (default `FRONTEND_ORIGIN`) |

Frontend (optional, in `frontend/.env`): `VITE_API_URL` (where the API is, default `/api`) and
`VITE_PROXY_TARGET` (where the dev proxy forwards, default `http://localhost:3000`).

### Email
Emails are sent for password resets and for review decisions (approved, sent back, taken down). While `SMTP_HOST` is
empty, nothing is sent: **the email is printed in the backend terminal instead**, link included, which is handy
while developing. For real emails set the `SMTP_*` settings. With `NODE_ENV=production` and no `SMTP_HOST`,
the backend logs an error and never prints message bodies.

## How it is built

The parts worth knowing about if you are reviewing the security or the design:

- **One visibility rule.** What a student may open is decided in one place (`backend/src/courses/visibility.ts`):
  public courses that are published *and* approved, plus the published courses of classrooms they belong to.
  Everything else, including other classrooms' courses, looks exactly like a course that does not exist.
- **Review cannot be skipped or swapped.** A public course that is pending review or live is locked on the server.
  To change it, the instructor withdraws it and submits it again. Decisions are single conditional database steps, so
  a withdrawal and an approval at the same moment cannot both win.
- **Quizzes are server-graded**, and the correct answers are never sent to students before they answer. A classroom
  quiz can only be written from scratch or copied from a template, never from a public quiz whose answers students
  can already see.
- **Passwords** are hashed with argon2. **Reset links** are random, stored only as a hash, work once for 30 minutes,
  and the form never reveals whether an email has an account.
- **Sessions.** Login tokens carry a version number; resetting a password raises it, which signs the account out
  everywhere. Every request checks the token against the database.
- **CTF flags** are stored only as salted hashes and compared in constant time. Uploaded files get random names and
  sanitised download names.
- **Join codes** are random, from an alphabet without look-alike characters, and joining is rate limited.
- **Rate limits:** sign-in and register 5 a minute, forgot-password 3, joining a classroom 5, flag submission 10.
- **Notifications** are saved in the same database transaction as the decision they report, and each person can
  only ever read their own.
- **Every input is validated** and unknown fields are rejected, on every endpoint.

## Project layout

```
backend/
  prisma/            schema, migrations, seed script, role script
  src/
    admin/           roles and the course review queue
    assessments/     quizzes for students and server-side grading
    auth/            register, sign-in, password reset, token guard
    challenges/      CTF challenges, flags, files, leaderboard
    classrooms/      classrooms, join codes, student progress
    courses/         courses and lessons for students, the visibility rule
    dashboard/       progress, streak, suggestions
    instructor/      course, lesson and quiz editing, library and copying
    mail/            sending email
    notifications/   the bell
frontend/
  src/
    api/             calls to the backend
    app/             layout, routes, top bar, notification bell
    features/        one folder per area (admin, auth, classrooms, courses, instructor, ...)
    styles/          the CSS
```

## Testing

```bash
cd backend && npm test && npm run lint && npm run build
cd ../frontend && npm run lint && npm run build
```
The backend tests do not need a database: they check the rules (who can see what, who can change what, what is
copied where) against mocked data, and one test builds the whole application module to prove every part can be wired up.

## Troubleshooting

| You see | What it means and what to do |
|---|---|
| `Column count of mysql.proc is wrong` from Prisma | XAMPP's system tables are out of date. Run `mysql_upgrade` (for XAMPP on Linux: `sudo /opt/lampp/bin/mysql_upgrade -u root`), restart MySQL, and try again. |
| `EADDRINUSE ... :3000` | Something is already using port 3000, usually an earlier backend still running. Find it with `ss -ltnp \| grep :3000` and stop it, or set a different `PORT`. |
| `Cannot find module ... generated/prisma` or type errors about Prisma | The database client has not been generated. Run `npx prisma generate` in `backend`. |
| `No instructor or admin found` from the seed | Register an account and run `npm run role:set -- you@example.com ADMIN` first. |
| The page says "Can't reach the server" | The backend is not running, or `FRONTEND_ORIGIN` does not match where the frontend runs. |
| A reset link prints in the terminal but no email arrives | That is the development behaviour while `SMTP_HOST` is empty. Set the `SMTP_*` settings for real emails. |
| `npm test` fails with an ESM or `require` error | Your Node.js is older than 24.9. Update it. |

## Going live

- Use a strong random `JWT_SECRET`, set `NODE_ENV=production`, and fill in the `SMTP_*` settings.
- Serve the site over HTTPS, and set `FRONTEND_ORIGIN` and `APP_URL` to the real address.
- Build the backend (`npm run build`) and run it with `npm run start:prod`. Build the frontend (`npm run build`) and
  serve `frontend/dist`. Either route `/api` to the backend, or build with `VITE_API_URL` pointing at it.
- Use `npx prisma migrate deploy` (not `migrate dev`) for the database.
- Keep `UPLOAD_DIR` on storage that survives restarts, and back up the database.

## Known limits

- Notifications refresh once a minute; there is no live push.
- Old notifications are never deleted.
- Signing out only clears the token in that browser. A password reset signs the account out everywhere, but there is
  no "sign out everywhere" button yet.
- A public course under review or live is locked, so even a typo fix means withdrawing it first.
- Planned: classroom-only challenges and leaderboards, and AI-assisted quiz drafting for instructors to review.
