# Taskora — Modern Fullstack To-Do & Task Management

<p align="center">
  <strong>A high-productivity task management platform built with Laravel 13, Inertia.js, React 18 (TypeScript), Tailwind CSS, and MySQL 8.4.</strong>
</p>

---

## 📚 Essential Documentation
- **[Status & Roadmap](TASKORA_STATUS_AND_ROADMAP.md):** Detailed blueprint, completed phases, and future roadmap (Phases 5–7).
- **[100% Free Deployment Guide](FREE_DEPLOYMENT_GUIDE.md):** Complete guide to deploying Taskora to the web for $0 (Render + Aiven MySQL or Cloudflare Tunnel).
- **[How to Run on Another PC](HOW_TO_RUN_ON_ANOTHER_PC.md):** 3-minute setup guide for running on any computer.
- **[Warnings & Best Practices](WARNINGS_AND_BEST_PRACTICES.md):** Diskless PC survival tips, Git workflows, and security practices.

---

## ✨ Features Implemented & Working

- **Authentication & Security:** Modern split-screen Login, dynamic 4-tier password strength gauge Register, Forgot Password & Password Reset (`/forgot-password`, `/reset-password`), and Email Verification screens (`/verify-email`).
- **Authenticated App Shell:** Collapsible sidebar, quick global `+ Add Task` modal, top search, and 2026 footer.
- **Real-Time Dashboard:**
  - 3 metric cards (Total, Completed, Pending) with dynamic SVG circular progress gauge.
  - Today's pending task agenda.
  - **Dynamic Weekly Focus Sprint Tracker:** Authentic Mon–Fri bar chart reflecting actual database completions per user, zero-progress state, and today's day highlighted.
- **Fullstack Task Management (CRUD):**
  - **Title & Main Content:** Distinct task headline and multi-line notes/description with native `Shift + Enter` line breaks.
  - **Separate Date & Time Pickers:** Native `<input type="date">` and `<input type="time">` pickers combined automatically into MySQL timestamps.
  - **Confirmation Dialog:** Checkbox toggle confirmation modal preventing accidental completion or reopening.
  - **Categorization & Priority:** Category badges with label icons, priority tags (Low, Medium, High).
  - **Filtering & Multi-Column Sorting:** Filter by status (All, Pending, Completed) and sort by Due Date, Priority, or Title.
- **User Settings & Profile:** Account editing, password update, session revocation, and task defaults.
- **Timezone Synchronization:** Configured for `Asia/Manila` (UTC+8) so day-rollovers occur accurately at 12:00 AM local time.
- **100% Automated Test Coverage:** 27 unit and feature tests passing with 91 assertions.

---

## ⚡ Quick Start

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Freakshowzzz/taskora.git
cd taskora

composer install
npm install --legacy-peer-deps
```

### 2. Configure Environment
```bash
copy .env.example .env
php artisan key:generate
```

Make sure your MySQL database `taskora` exists, then run:
```bash
php artisan migrate
```

### 3. Start Development Servers
Open two terminals:

```bash
# Terminal 1: Backend
php artisan serve

# Terminal 2: Frontend Vite
npm run dev
```

Visit: `http://localhost:8000/login`

---

## 🛡️ Security & Design Standards
- **Strict CIA Triad Compliance:** Every Eloquent query is scoped to `auth()->user()->tasks()` with `TaskPolicy` ownership checks.
- **Design Tokens:** Deep Indigo (`#3525cd`), Container (`#4f46e5`), Slate Canvas (`#F8FAFC`), Inter typography, and Material Symbols Outlined.
- **Copyright:** `© 2026 Taskora Inc. All rights reserved.`
