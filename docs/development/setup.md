# Local Development Setup Guide

## Prerequisites
- **Node.js**: v20+ (v24 LTS recommended)
- **PostgreSQL**: 16+ (local or Docker container)
- **Git**
- **npm** or **pnpm**

---

## 1. Clone & Install Dependencies
```bash
git clone https://github.com/Mayyank04/lostlink.git
cd lostlink
npm install
```

---

## 2. Environment Configuration
Copy the template environment file:
```bash
cp .env.example .env
```
Ensure your `DATABASE_URL` points to a reachable PostgreSQL instance:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lostlink_dev?schema=public"
SESSION_SECRET="dev-super-secret-session-key-min-32-chars-long"
```

---

## 3. Database Initialization
Run Prisma migrations and seed the database with colleges, campuses, demo items, and admin accounts:
```bash
npx prisma migrate dev
npm run db:seed
```

---

## 4. Launch Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

Default Seed Accounts:
- **Platform Admin:** `admin@lostlink.org` (Password: `SuperAdmin123!`)
- **College Admin (Galgotias):** `admin@galgotias.edu` (Password: `CollegeAdmin123!`)
- **Student (Maya Patel):** `student@apex.edu` (Password: `Student123!`)
