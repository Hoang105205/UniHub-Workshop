# UniHub - Workshop

UniHub is a comprehensive university workshop management system designed to handle high concurrency, prevent ticket overselling, and ensure data integrity.

## 🛠 Tech Stack

- **Backend:** NestJS, PostgreSQL (Supabase), Redis (Upstash), BullMQ.
- **Web Frontend:** Next.js.
- **Mobile Client:** React Native (Expo), SQLite.
- **Infrastructure:** Docker Compose, Nginx.

## ⚙️ Prerequisites

Before running the project, make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Android Studio / Emulator](https://developer.android.com/studio) (for Mobile App)

## 📝 Environment Variables Setup

Create `.env` files in each respective folder (`server`, `web-client`, `mobile-client`).

_(Note: Replace `<Your_Value>` with actual credentials)_

**1. Server (`server/.env` or `.env.production`)**

```env
# ==========================================
# 1. DATABASE CONNECTIONS (Dành cho TypeORM)
# ==========================================
# Dùng để chạy App (Port 6543 - Có Pooling chống sập)
DATABASE_URL=<Your_Value>

# Dùng để chạy Migration tạo bảng (Port 5432 - Kết nối trực tiếp)
DIRECT_URL=<Your_Value>

# ==========================================
# 2. SUPABASE API & STORAGE (Dành cho @supabase/supabase-js)
# ==========================================
# URL gốc của Project Supabase
SUPABASE_URL=<Your_Value>

# Chìa khóa vạn năng (Bypass mọi RLS Policy để upload file PDF)
SUPABASE_SERVICE_ROLE_KEY=<Your_Value>

# PDF Storage Configuration
SUPABASE_BUCKET=<Your_Value>

# ==========================================
# 3. REDIS CONNECTION (Dành cho Cache, Rate Limit & BullMQ)
# ==========================================
# TCP Redis URL (Dùng cho BullMQ queue, do thư viện BullMQ chỉ hỗ trợ TCP API)
REDIS_URL=<Your_Value>

# Backend Configuration
NODE_ENV=development
PORT=3000

# JWT Configuration
JWT_SECRET=<Your_Value>

# GROQ Configuration (AI model API)
GROQ_API_KEY=<Your_Value>
GROQ_MODEL=<Your_Value>

# Mock payment gateway secret key
MOCK_GATEWAY_CONFIG_API_KEY=<Your_Value>

# Cấu hình SMTP cho Gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<Your_Value>
SMTP_FROM="Unihub Workshop"
SMTP_PASS=<Your_Value>

# CSV Sync Configuration
SUPABASE_CSV_SYNC_BUCKET=<Your_Value>
STUDENT_SYNC_CRON="0 0 * * *"

# Frontend Configuration
FRONTEND_ORIGIN=http://localhost:3001
```

**2. Web Client (web-client/.env.local)**

Create two separate environment files for different running modes:

**For Development (`web-client/.env.local`):**

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

**For Docker Mode (`web-client/.env.production`):**

```env
NEXT_PUBLIC_API_URL=/api
```

**3. Mobile Client (`mobile-client`)**

Create two separate environment files for different running modes:

**For Development (`mobile-client/.env`):**

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000
# Note: For physical devices, change to your IPv4 address (e.g., http://192.168.1.45)
```

**For Docker Mode (mobile-client/.env.production):**

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2
# Note: For physical devices, change to your IPv4 address (e.g., http://192.168.1.45)
```

## 🏃‍♂️ How to Run (Development Mode)

Run these commands in 3 separate terminals:

1. **Terminal 1: Start Backend (NestJS)**

```bash
cd server
npm install
npm run start:dev
```

2. **Terminal 2: Start Web Client (Next.js)**

```bash
cd web-client
npm install
npm run dev
```

3. **Terminal 3: Start Mobile Client (React Native)**

```bash
cd mobile-client
npm install
npm run start
# Press 'a' in the terminal to launch the app on the Android emulator.
```

## 🐳 How to Run (Production / Docker Mode)

This flow simulates the production environment using Docker and Nginx as a Reverse Proxy & Load Balancer.

### 1. Start the entire infrastructure

Run this command in the root directory (where `docker-compose.yml` is located):

```bash
docker-compose up -d --build
```

This will spin up Nginx, the NestJS API Replicas, and the Next.js Web server.

### 2. Run Mobile App

Update the `EXPO_PUBLIC_API_URL` in your mobile `.env.production` file to route traffic through Nginx (Port 80) instead of the backend port:

- **For Android Emulator:** `http://10.0.2.2`
- **For Physical Devices:** `http://<your-ipv4-address>` (e.g., http://192.168.1.45)

Then, start the mobile client:

```bash
cd mobile-client
npm run start:docker
# Press 'a' to open in the Android emulator
```

### 3. Stop the infrastructure

```bash
docker-compose down
```

## 📱 Appendix: Android Emulator Setup (Windows)

If you are using Windows, follow these steps to configure the Android Emulator for a seamless development experience within VS Code.

### Step 1: Add Android Emulator to System PATH
This allows Windows to recognize emulator commands from the terminal.

1. Open File Explorer, paste `%LOCALAPPDATA%\Android\Sdk\emulator` into the address bar, and hit Enter. Copy this directory path (e.g., `C:\Users\Admin\AppData\Local\Android\Sdk\emulator`). *Note: It must end with `\emulator`, not `emulator.exe`.*
2. Press the **Windows** key, search for **Environment Variables**, and select *Edit the system environment variables*.
3. Click the **Environment Variables...** button at the bottom right.
4. In the **System variables** section, find the **`Path`** variable and click **Edit**.
5. Click **New** and paste the emulator path from step 1. Add another **New** entry for the `platform-tools` folder (e.g., `C:\Users\Admin\AppData\Local\Android\Sdk\platform-tools`) to enable ADB commands.
6. Click **OK** to save everything. **Restart VS Code** to apply the new PATH.

### Step 2: Install & Configure VS Code Extension
This extension allows you to launch the emulator with a single click inside VS Code.

1. In VS Code, open the Extensions tab (`Ctrl + Shift + X`), search for and install **Android iOS Emulator** by **Diemas Michiels**.
2. Open Settings (`Ctrl + ,`) and search for `Emulator Path`.
3. Replace the default macOS path with your Windows emulator path from Step 1 (e.g., `C:\Users\<Your_Username>\AppData\Local\Android\Sdk\emulator`).

### Step 3: Start the Emulator
*Rule of thumb: Always start the emulator and wait for the home screen to load completely before running the code.*

1. Open the Command Palette in VS Code (`Ctrl + Shift + P`).
2. Type `Emulator: Run` and press Enter.
3. Select your Android virtual device (e.g., `Pixel_7_API_34`) from the dropdown list. The emulator will boot up in a standalone window.