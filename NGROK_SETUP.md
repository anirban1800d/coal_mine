# GeoMine AI — ngrok Remote Access Setup

This document explains how to expose GeoMine AI to the internet using ngrok so
you can open the complete application — including Login, Dashboard, CPCB, DGMS,
PPE camera, real-time detection, and PPE history — from any device including a
mobile phone.

---

## Architecture Overview

```
LOCAL MODE (development)
────────────────────────
Browser → http://localhost:5173 (Vite dev)
Vite dev proxy → http://127.0.0.1:8000 (FastAPI)
WebSocket → ws://localhost:5173/ws/detect → proxy → ws://127.0.0.1:8000

REMOTE MODE (ngrok / phone access)
────────────────────────────────────
Browser → https://<ngrok-url>/         (FastAPI serves frontend/dist)
API calls → https://<ngrok-url>/api/*  (same origin, no CORS needed)
WebSocket → wss://<ngrok-url>/ws/detect (same origin, derived automatically)
```

**Key design**: Remote mode uses a **single ngrok tunnel** to port 8000. FastAPI
serves both the API AND the React production build. This eliminates all
cross-origin cookie and CORS complexity. The browser's `window.location.host`
is `<ngrok-url>`, so the WebSocket URL is automatically `wss://<ngrok-url>/ws/detect`.

---

## Step 1 — Install ngrok

1. Go to https://ngrok.com and create a free account.
2. Download ngrok for Windows from https://ngrok.com/download
3. Extract the `ngrok.exe` to a folder on your PATH (e.g. `C:\ngrok\`) or keep
   it in `c:\Login\`.
4. Save your auth token from https://dashboard.ngrok.com/get-started/your-authtoken

---

## Step 2 — Configure the ngrok Auth Token (one-time)

Run this in any PowerShell terminal. Replace `<token>` with your actual token:

```powershell
ngrok config add-authtoken <token>
```

> This stores the token in `%APPDATA%\ngrok\ngrok.yml` (your user profile).
> It is NOT stored in `.env` or `ngrok.yml` in the project — those files are safe
> to share or commit.

---

## Step 3 — Build the Frontend Production Bundle

The remote mode serves the React app as static files from FastAPI.
You only need to rebuild when you change frontend source code.

```powershell
cd c:\Login\frontend
npm run build
```

This creates `c:\Login\frontend\dist\` which FastAPI will serve automatically.

---

## Step 4 — Start the Backend

Open **Terminal 1**:

```powershell
cd c:\Login
.\myenv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000
```

> `--host 0.0.0.0` allows the server to receive connections from all interfaces
> (needed for ngrok to forward traffic to it).

You should see in the logs:
```
INFO     geomine_api | Frontend dist found — serving as static files from .../frontend/dist
```

This confirms FastAPI will serve the React app.

---

## Step 5 — Start ngrok

Open **Terminal 2**:

```powershell
# Option A: using the project ngrok.yml (recommended)
cd c:\Login
ngrok start geomine --config ngrok.yml

# Option B: one-liner without config file
ngrok http 8000
```

ngrok will display something like:

```
Forwarding  https://abc123.ngrok-free.app -> http://localhost:8000
```

**Copy the HTTPS URL** (e.g. `https://abc123.ngrok-free.app`).

---

## Step 6 — Update .env with the ngrok URL

Open `c:\Login\.env` and set:

```env
NGROK_ORIGIN="https://swarm-duke-kung.ngrok-free.dev"
HTTPS_ONLY=false
```

> `HTTPS_ONLY=false` is fine because ngrok terminates TLS and forwards HTTP to
> your local server. Session cookies still travel over the public HTTPS connection.

**Restart uvicorn** (Ctrl+C in Terminal 1, then run the uvicorn command again)
so it picks up the new `NGROK_ORIGIN` for CORS headers.

---

## Step 6.1 — Add the ngrok Redirect URI to Google Cloud Console

If you want to use **Google OAuth Login** from your phone through ngrok, you must register the ngrok redirect URI in your Google Cloud Console project:

1. Open [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Click on your **OAuth 2.0 Client ID** (under "OAuth 2.0 Client IDs").
3. Under **Authorized redirect URIs**, ensure you have BOTH:
   - For local development:
     `http://localhost:8000/auth/google/callback`
   - For your ngrok domain:
     `https://swarm-duke-kung.ngrok-free.dev/auth/google/callback`
4. Click **Save** at the bottom of the page.

> **Note:** Google changes take effect immediately (or within 1-2 minutes).
> If you change your ngrok subdomain in the future, simply add the new ngrok callback URL to the authorized redirect URIs in Google Cloud Console.

---


## Step 7 — Open From Your Phone

1. Open Chrome or Safari on your phone.
2. Navigate to `https://abc123.ngrok-free.app` (your ngrok URL).
3. ngrok shows a browser interstitial on the free plan — click **"Visit Site"**.
4. The GeoMine AI login page appears.

---

## Step 8 — Test Everything Remotely

### A. Login
- Enter your credentials and log in.
- Session cookie is set as `SameSite=Lax; Path=/` — works correctly because
  the frontend and API are on the same ngrok origin.

### B. CPCB Search
- Switch to CPCB in the domain selector.
- Run a query (e.g. `ambient air quality monitoring`).
- Results should appear.

### C. DGMS Search
- Switch to DGMS.
- Run a query (e.g. `self-rescuer requirement`).

### D. PPE Camera Detection
- Switch to PPE domain.
- Click **Start Camera**.
- The browser asks for camera permission — **allow it**.
  - ✅ This works because ngrok provides HTTPS, which is a secure context.
  - Camera permission is blocked on plain `http://` — ngrok's HTTPS solves this.
- The camera feed appears. Real-time bounding boxes are drawn from YOLO inference.
- The detection list on the right updates every 250ms.

### E. Save PPE Session
- Click **Stop Camera**.
- A toast notification appears: "PPE session saved to history".

### F. PPE History
- Navigate to History → PPE tab.
- Your session record appears with duration and detection count.
- Expand to see detected classes and confidence.
- Delete via the 🗑️ icon.

### G. Logout
- Click Logout in the header.
- Session is cleared. Subsequent protected requests return 401.

---

## Step 9 — Stop ngrok

Press **Ctrl+C** in Terminal 2 (the ngrok terminal).

The public URL is immediately deactivated. Local mode is unaffected.

---

## Step 10 — Return to Local-Only Mode

1. Stop ngrok (Ctrl+C in Terminal 2).
2. Optionally clear `NGROK_ORIGIN=` in `.env` (leave it blank).
3. Restart uvicorn with `--host 127.0.0.1` (local only):

```powershell
cd c:\Login
.\myenv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```

4. Start the Vite dev server as normal:

```powershell
cd c:\Login\frontend
npm run dev
```

5. Open `http://localhost:5173` — everything works exactly as before.

---

## WebSocket Behavior — Technical Notes

**Why the PPE WebSocket works through ngrok without code changes:**

In `PPEView.tsx`:
```typescript
function getWsUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws/detect`;
}
```

When opened via `https://abc123.ngrok-free.app`:
- `window.location.protocol` = `"https:"`
- `window.location.host` = `"abc123.ngrok-free.app"`
- Resulting URL = `wss://abc123.ngrok-free.app/ws/detect`

ngrok supports WebSocket upgrades natively over HTTPS/WSS — no special config needed.

**Session Cookie authentication through ngrok:**
- The session cookie is set with `SameSite=Lax; Path=/` (no `Secure` flag needed
  because the cookie traverses the HTTPS connection established by ngrok).
- Both the frontend page and the WebSocket endpoint are on the same origin
  (`abc123.ngrok-free.app`) so cookies are sent automatically.
- The WebSocket handler reads `websocket.session["user_id"]` from the same
  Starlette SessionMiddleware that handles HTTP routes — no additional auth needed.

---

## CORS — Why It Doesn't Matter in Remote Mode

In the single-tunnel architecture, the browser opens pages from ngrok (port 8000)
and API calls go back to the same origin (port 8000). There are no cross-origin
requests, so CORS headers are irrelevant. The `NGROK_ORIGIN` in `.env` is only
needed as a safety net if you accidentally access the backend from a different origin.

---

## Security Notes

| Item | Status |
|------|--------|
| ngrok authtoken | Stored in ngrok user config, NOT in .env or source code |
| `.env` in git | Blocked by `.gitignore` |
| Session cookie | `SameSite=Lax` — safe against CSRF from cross-site requests |
| PPE WebSocket | Authenticated: unauthenticated connections rejected with code 4001 |
| CORS | Explicit origins only — no wildcards |
| users.json | Server-side only, never sent to frontend |
| Password hashes | Never exposed in `/me` or history responses |

---

## Troubleshooting

**"ERR_NGROK_3200" or "Tunnel not found"**
→ ngrok is not running. Start it with `ngrok http 8000`.

**Camera permission denied on phone**
→ Make sure you're on the `https://` URL, not `http://`. Camera requires HTTPS.

**PPE WebSocket disconnects immediately**
→ Check you are logged in (401 = no session). Log in first, then start camera.

**Login doesn't persist (session lost on page refresh)**
→ Make sure `NGROK_ORIGIN` in `.env` matches your current ngrok URL exactly,
   and restart uvicorn after updating it.

**ngrok shows "Visit Site" interstitial on phone**
→ This is normal on the free plan. Click "Visit Site" to proceed.
   Upgrade to paid plan or add `--inspect false` to remove it.

**`Frontend dist found` not shown in uvicorn log**
→ Run `cd frontend && npm run build` first. Then restart uvicorn.

**CORS error in browser console**
→ Check that `NGROK_ORIGIN` in `.env` exactly matches your ngrok URL (no trailing slash).
   Restart uvicorn after updating `.env`.

