# How to Run Taskora on Any New Computer (Quick Start Guide)

Follow these steps whenever you sit at a new PC (or after a reboot on a computer shop PC).

---

## Prerequisites (What the new PC needs):
1. **Git:** [git-scm.com/downloads](https://git-scm.com/downloads)
2. **Laragon (Portable or Full):** [laragon.org/download](https://laragon.org/download) *(provides PHP 8.3+, Composer, and MySQL in 1 click)*
3. **Node.js (LTS):** [nodejs.org](https://nodejs.org)

---

## Setup Steps (Takes ~3 minutes):

### 1. Open Terminal and Clone Your Repository
Navigate to where you want the project (e.g. `C:\laragon\www` if using Laragon):
```cmd
cd C:\laragon\www
git clone https://github.com/Freakshowzzz/taskora.git
cd taskora
```

### 2. Install PHP & Node Dependencies
In Laragon Terminal (or CMD with PHP and Composer in PATH):
```cmd
composer install
npm install --legacy-peer-deps
```

### 3. Create Environment File & Generate App Key
```cmd
copy .env.example .env
php artisan key:generate
```

### 4. Create MySQL Database & Run Migrations
1. Open Laragon, make sure MySQL is started (green icon).
2. Create an empty database named `taskora` (Laragon does this automatically, or in HeidiSQL/terminal: `mysql -u root -e "CREATE DATABASE IF NOT EXISTS taskora;"`).
3. Make sure `.env` has:
   ```env
   APP_TIMEZONE=Asia/Manila
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=taskora
   DB_USERNAME=root
   DB_PASSWORD=
   ```
4. Run migrations:
   ```cmd
   php artisan migrate
   ```

### 5. Launch the Application!
Open two terminal tabs:

* **Tab 1 (Backend):**
  ```cmd
  php artisan serve
  ```
* **Tab 2 (Frontend):**
  ```cmd
  npm run dev
  ```

Open your browser at: **`http://localhost:8000/login`**

---

## How to Resume with Antigravity on the New PC:

1. Install and open **Antigravity**.
2. Sign in with your new account.
3. Open the `taskora` folder (`File -> Open Folder -> C:\laragon\www\taskora`).
4. Paste this prompt to the AI:

```text
I am continuing development on Taskora (Laravel 12 + Inertia.js + React + Tailwind).
Please inspect TASKORA_STATUS_AND_ROADMAP.md in the project root.
We have finished Phases 1, 2, and 3. Let's proceed with Step 1: creating the tasks database migration and model.
```
