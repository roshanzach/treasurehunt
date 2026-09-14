# 🧭 The Sovereign Vault — Treasure Hunt Platform

A digital platform for managing and conducting multi-location physical Treasure Hunts. Features secure team progression, in-app camera QR code scanning, 6-character access keys, single-device session enforcement with Admin approval, real-time telemetry-based anti-cheating detection, dual-view leaderboards, dynamic media support, and containerized deployment.

---

## 🌟 Key Features

### 🔐 1. Authentication & Device Session Controls
- **Admin Management Console**: Dedicated secure portal (`/admin/login`) for organizers.
- **Single-Device Enforcement**: Each team receives one set of login credentials.
- **Admin Device Approval Workflow**:
  - When a team logs in on a physical device, the session enters a real-time **Pending Approval** state.
  - The team client displays a live radar waiting screen.
  - Organizers see device details (Browser, OS, IP address, Device ID) and can approve or revoke device access with one click.
  - Upon approval, the participant's screen unlocks immediately via WebSockets.
  - Prevents simultaneous logins from unauthorized devices.

### 🗺️ 2. QR Code & Access Key Progression
- **Physical QR Code Checkpoints**: Participants scan physical QR badges at each location.
- **Direct Level 1 Access**: Scanning the Level 1 QR code opens the puzzle immediately.
- **6-Character Access Keys (Level 2+)**:
  - Auto-generated alphanumeric keys (e.g., `X7K2M9`) protect subsequent checkpoints.
  - When a team solves Question $N$, the system reveals:
    1. **Location Hint** (Text/Image/Audio) guiding them to Checkpoint $N+1$.
    2. **Access Key** required to unlock Checkpoint $N+1$.
  - Progression Engine blocks skipping levels or accessing puzzles out of order.
- **Explorer's Clue Notebook**: In-app inventory storing all unlocked clues, location hints, and access keys.

### 🛡️ 3. Anti-Cheating & Security Telemetry
- **Browser-Level Detection**:
  - `visibilitychange`: Detects tab switching or leaving the site.
  - `blur` / `focus`: Detects minimizing the browser or switching app windows.
  - Developer Tools shortcut and inspection detection.
- **Real-Time Participant Warnings**: Warns the participant immediately with an anti-cheat siren overlay on return.
- **Admin Security Hub**:
  - Real-time alert stream with violation counts, severity tags, and timestamps.
  - Organizers can dispatch custom live warning popups directly to a team's screen or freeze/suspend suspicious teams.

### 🏆 4. Dual-View Live Leaderboards
- **Participant Public Leaderboard (`/leaderboard`)**:
  - Real-time standings updated via WebSockets.
  - **Scores and raw points are strictly hidden** as required.
  - Displays Rank, Team Name, Checkpoint Milestones Completed, and Finish Timestamps.
- **Organizer Master Leaderboard**:
  - Complete metrics including exact solve duration per checkpoint, total attempt counters, and security violation tallies.

### 🧩 5. Reusable Question Template & Media Uploads
- Supports **Text Riddles**, **Image Clues**, **Audio Soundscapes (MP3/WAV)**, and **Video Clues**.
- **Case-Insensitive & Whitespace-Insensitive Answer Normalization**: e.g., `TREASURE HUNT` == `treasurehunt` == `Treasure  Hunt`.
- **Printable QR Code Cards**: High-resolution badges ready to print for physical checkpoint stations.

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **npm** (v9 or higher)

### 2. Installation
```bash
# Clone or enter repository directory
cd /path/to/treasure

# Install all monorepo dependencies
npm install
```

### 3. Initialize Database & Seed Demo Data
```bash
npm run db:push
npm run db:seed
```

### 4. Start Development Server
```bash
npm run dev
```
- **Participant Portal**: [http://localhost:5173/](http://localhost:5173/)
- **Admin Login**: [http://localhost:5173/admin/login](http://localhost:5173/admin/login)
- **Public Leaderboard**: [http://localhost:5173/leaderboard](http://localhost:5173/leaderboard)
- **Backend API & WebSockets**: [http://localhost:5000/](http://localhost:5000/)

---

## 🔑 Default Seed Credentials

### Game Master (Admin)
- **Username**: `admin`
- **Password**: `adminpassword123`

### Demo Participant Teams
| Team Name | Team Code | Password | Initial Level |
| :--- | :--- | :--- | :--- |
| **Team Alpha Pioneers** | `ALPHA` | `alpha123` | Level 1 |
| **The Golden Galleon** | `GALLEON` | `galleon123` | Level 1 |
| **Phoenix Seekers** | `PHOENIX` | `phoenix123` | Level 1 |

---

## 🚢 Production Hosting & Deployment Guide

### Option 1: Docker & Docker Compose (Recommended for 1-Click Hosting)

1. Build and run the container:
```bash
docker compose up -d --build
```
2. The application will be live at `http://YOUR_SERVER_IP:5000`.
3. Persistent database and uploaded media are automatically mapped to `./data` and `./uploads`.

---

### Option 2: Cloud Web Services (Railway, Render, Fly.io)

#### Deploying on **Render / Railway**:
1. Connect your GitHub repository.
2. Select **Web Service** (Node.js environment or Docker).
3. Set Build and Start Commands:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Set Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `5000`
   - `JWT_SECRET`: *(Generate a secure random string)*
   - `DATABASE_URL`: `file:./dev.db` *(or PostgreSQL connection URL)*
   - `CLIENT_ORIGIN`: `*`
5. Click **Deploy**!

---

### Option 3: Standard Linux VPS (Ubuntu / Debian + Nginx + PM2)

1. **Install Node.js, PM2, and Nginx**:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs nginx
sudo npm install -g pm2
```

2. **Clone & Build**:
```bash
git clone <your-repo-url> /var/www/treasure-hunt
cd /var/www/treasure-hunt
npm install
npm run build
npm run db:push
npm run db:seed
```

3. **Start with PM2**:
```bash
pm2 start server/dist/index.js --name "treasure-hunt"
pm2 save
pm2 startup
```

4. **Configure Nginx Reverse Proxy** (`/etc/nginx/sites-available/treasure-hunt`):
```nginx
server {
    listen 80;
    server_name hunt.yourdomain.com;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/treasure-hunt /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 🗄️ Database: Switching from SQLite to PostgreSQL

To use PostgreSQL instead of SQLite in production:

1. Update `server/prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

2. Set your PostgreSQL URL in `.env`:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/treasure_db?schema=public"
```

3. Push schema:
```bash
npm run db:push
npm run db:seed
```

---

## 🧪 Verification & Testing Guide

1. **Device Approval Flow**:
   - Open participant login at `/` and login as `ALPHA` / `alpha123`.
   - Observe the live "Device Awaiting Approval" screen.
   - In a second tab/incognito window, login to `/admin/login` as `admin` / `adminpassword123`.
   - On the Admin Dashboard, click **Approve Device**.
   - Notice the participant window immediately unlocks without refreshing and transitions into Level 1!

2. **Question Solving & Key Progression**:
   - Level 1 Riddle: *"I speak without a mouth and hear without ears..."*
   - Submit Answer: `Echo`
   - Notice the celebration confetti, sound effect, and reveal of **Location Hint 2** and **Access Key for Level 2 (`X7K2M9`)**.
   - Scan / input Level 2 QR Code `QR-L2-CHRONOS-B2` $\rightarrow$ Enter access key `X7K2M9` $\rightarrow$ Level 2 puzzle unlocks!

3. **Anti-Cheating Monitoring**:
   - Switch tabs or minimize window during the hunt.
   - Return to the tab $\rightarrow$ The anti-cheat warning siren and modal appear.
   - Check the Admin Dashboard **Cheating Hub** $\rightarrow$ Incident logged with team name, timestamp, and violation counter!

---

## 📄 License
This project is open-source and customizable for university events, corporate team outings, and city-wide adventure races.
