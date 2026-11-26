# Taskora — 100% Free Production Deployment Guide ($0.00)

> **Purpose:** Step-by-step instructions for deploying Taskora to the web for free without a credit card or subscription fees.  
> **Target Stack:** Laravel 12 + Inertia.js + React 18 (TypeScript) + MySQL 8.4 + Gemini 3.5 Flash Lite  
> **Repository:** [`https://github.com/Freakshowzzz/taskora.git`](https://github.com/Freakshowzzz/taskora.git)

---

## 🚀 Strategy 1: Permanent Cloud Deployment ($0 Forever)

This setup pairs two free cloud providers:
- **[Render.com](https://render.com):** Hosts the Laravel + React web application for $0.
- **[Aiven.io](https://aiven.io)** or **[TiDB Cloud](https://tidbcloud.com):** Hosts the managed MySQL database for $0 with zero credit card required.

---

### Step 1: Create Free MySQL Database (Aiven.io or TiDB Cloud)
1. Register for a free account at [aiven.io](https://aiven.io) (or [tidbcloud.com](https://tidbcloud.com)).
2. Create a new service $\rightarrow$ Select **MySQL** $\rightarrow$ Choose the **Free Plan**.
3. Once provisioned, note down your credentials:
   - **Host:** `mysql-xxxx.aivencloud.com`
   - **Port:** `12345` (varies by provider)
   - **User:** `avnadmin` (or root user)
   - **Password:** `your_secure_password`
   - **Database Name:** `defaultdb` (or create `taskora`)

---

### Step 2: Prepare Local Production Assets
Before deploying, ensure production JavaScript and CSS assets are compiled and pushed to GitHub:

```bash
# In your local project directory:
npm run build
git add -A
git commit -m "build: compile production assets"
git push origin main
```

---

### Step 3: Deploy Web Service on Render.com
1. Go to [render.com](https://render.com) and sign in with GitHub.
2. Click **New +** $\rightarrow$ **Web Service**.
3. Connect your GitHub repository: **`Freakshowzzz/taskora`**.
4. Configure service parameters:
   - **Name:** `taskora`
   - **Region:** Singapore or Oregon (closest to your audience)
   - **Branch:** `main`
   - **Runtime:** `PHP`
   - **Build Command:**
     ```bash
     composer install --no-dev --optimize-autoloader && php artisan storage:link && php artisan migrate --force --seed
     ```
   - **Publish Directory:** `public`
   - **Instance Type:** `Free`

5. In the **Environment Variables** tab, add:

| Key | Value | Description |
|---|---|---|
| `APP_NAME` | `Taskora` | Application Name |
| `APP_ENV` | `production` | Production environment |
| `APP_DEBUG` | `false` | **Critical:** Disable debug stack traces |
| `APP_KEY` | `base64:...` | Copied from your local `.env` |
| `APP_URL` | `https://taskora.onrender.com` | Your Render app URL |
| `DB_CONNECTION` | `mysql` | MySQL database driver |
| `DB_HOST` | `mysql-xxxx.aivencloud.com` | From Aiven / TiDB |
| `DB_PORT` | `12345` | Port from Aiven / TiDB |
| `DB_DATABASE` | `defaultdb` | Database name |
| `DB_USERNAME` | `avnadmin` | Database username |
| `DB_PASSWORD` | `your_password` | Database password |
| `GEMINI_API_KEY` | `YOUR_API_KEY_HERE` | Google Gemini key |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` | Gemini AI model |
| `SESSION_DRIVER` | `database` | Stores sessions in MySQL |
| `QUEUE_CONNECTION` | `database` | Background queue driver |

6. Click **Create Web Service**. Render will clone, build, run migrations, and provide a live HTTPS URL with a free SSL certificate.

---

## ⚡ Strategy 2: 60-Second Demo / Presentation Link ($0, No Hosting Setup)

If you need a public URL for a class presentation, demo, or professor review right from your running Laragon machine:

### Using Cloudflare Tunnel (`cloudflared`):
1. Keep `php artisan serve` running locally on port 8000.
2. Download the lightweight standalone executable from [Cloudflare Tunnel Releases](https://github.com/cloudflare/cloudflared/releases) (`cloudflared-windows-amd64.exe`).
3. Open a terminal and run:
   ```cmd
   cloudflared tunnel --url http://localhost:8000
   ```
4. Cloudflare will output an instant, temporary public HTTPS domain (e.g., `https://example-random-words.trycloudflare.com`).
5. Anyone (including your professor on their smartphone or laptop) can access your live Taskora instance, complete tasks, hear the chime, and chat with Kora in real time.

---

## 🛡️ IAS Security Checklist for Production

Under Information Assurance & Security (IAS) guidelines:
- [x] `APP_DEBUG=false` — Prevents stack traces from exposing system paths, PHP versions, and database queries.
- [x] Document Root is strictly `/public` — Web visitors can never traverse to `.env` or application source code.
- [x] Strict HTTPS / SSL — All passwords, session cookies, and API payloads are encrypted in transit.
- [x] Passwords hashed with Bcrypt (12 computational rounds).
- [x] AI assistant confidentiality guardrails remain fully active in production.
