# LAN Setup Steps

Step-by-step guide for connecting all devices to the quiz system on a local network.
No internet connection is required — all communication happens over the LAN.

---

## Prerequisites — Build & Start the Server

For event-day deployment, everything runs from a single port (4000). No separate
Vite dev server is needed.

1. **Build the client:**
   ```bash
   cd client
   npm run build        # outputs to client/dist/
   ```
2. **Start the server** (from the repo root):
   ```bash
   cd server
   npm start            # or: node src/index.js
   ```
   The server detects `client/dist/` and serves the built client automatically.
   If the directory doesn't exist (local dev), it skips static serving and you
   use the Vite dev server on port 5173 as usual.

All device URLs below point to `http://<host-ip>:4000/...` — a single origin for
the API, the admin panel, the display, and the candidate tablets.

---

## 1. Connect All Devices to the Same Wi-Fi

Every device that will participate in the quiz must be on the **same Wi-Fi network**:

- **Host laptop** (runs the server) — connect to the Wi-Fi router or hotspot.
- **Admin device** (phone or tablet) — connect to the same network.
- **Projector/display laptop** — connect to the same network (or use the host laptop directly).
- **Candidate tablets** (4 devices) — connect to the same network.

> **Tip:** If no router is available, create a Wi-Fi hotspot from the host laptop
> (Windows: Settings > Network & Internet > Mobile hotspot; macOS: System Settings > Sharing > Internet Sharing).
> All other devices connect to this hotspot.

## 2. Find the Host's LAN IP

The server prints its LAN IP to the console when it starts:

```
Server listening on http://192.168.1.10:4000
```

If you missed it, you can also check via the health endpoint from any device on the network:

```
http://<any-ip-on-network>:4000/api/health
```

The response includes `lanIp`:

```json
{ "status": "ok", "lanIp": "192.168.1.10" }
```

Note this IP — all URLs below use `<host-ip>` to refer to it.

## 3. Open the Right URL on Each Device

| Device | URL | Notes |
|--------|-----|-------|
| **Host laptop** (projector) | `http://<host-ip>:4000/display` | Full-screen this browser tab for the audience. |
| **Admin device** | `http://<host-ip>:4000/admin` | Enter the admin PIN when prompted. |
| **Candidate tablet 1** | `http://<host-ip>:4000/play/<candidateId1>?token=<joinToken1>` | Use the URL shown in Admin > Candidates (with QR code). |
| **Candidate tablet 2** | `http://<host-ip>:4000/play/<candidateId2>?token=<joinToken2>` | Same — each candidate has a unique URL. |
| **Candidate tablet 3** | `http://<host-ip>:4000/play/<candidateId3>?token=<joinToken3>` | |
| **Candidate tablet 4** | `http://<host-ip>:4000/play/<candidateId4>?token=<joinToken4>` | |

### Getting Candidate URLs

1. Open the Admin Panel (`/admin`) and navigate to the **Candidates** tab.
2. Each candidate card shows a **QR code** and a **copyable URL**.
3. You can either:
   - **Scan the QR code** with the tablet's camera to open the URL directly, or
   - **Copy the URL** and paste it into the tablet's browser.

> **Important:** Each candidate URL contains a unique `joinToken`. Do not share one
> candidate's URL with another person — the token authenticates which contestant
> is playing.

## 4. Verify All Devices Are Connected

1. Open the Admin Panel and go to **Live Control**.
2. Before starting a match, each tablet should show as **"connected"** in the Responses panel.
3. If a tablet shows as disconnected:
   - Check that it is on the same Wi-Fi network.
   - Refresh the browser tab on the tablet.
   - Verify the URL is correct (candidate ID and token match).

## 5. Troubleshooting Connection Problems

If devices cannot reach the server at all (browser shows "This site can't be reached"
or similar), the issue is likely a **firewall on the host laptop** blocking incoming
connections on port 4000.

See the Phase 10 firewall guide in the architecture document for platform-specific
instructions on allowing the Node.js process through the firewall:

- **Windows:** Windows Defender Firewall > Allow an app > allow Node.js on Private networks.
- **macOS:** System Settings > Network > Firewall > Options > allow Node.js (or disable the firewall temporarily for the event).
- **Linux:** `sudo ufw allow 4000/tcp` (or equivalent for your firewall).

> **Do not** disable the firewall permanently — only open port 4000 for the duration
> of the event, and only on the Private/Local network profile.

---

## Quick Reference — All URLs

| Purpose | URL |
|---------|-----|
| Server health check | `http://<host-ip>:4000/api/health` |
| Main Display (projector) | `http://<host-ip>:4000/display` |
| Admin Panel | `http://<host-ip>:4000/admin` |
| Candidate tablet | `http://<host-ip>:4000/play/<candidateId>?token=<joinToken>` |
