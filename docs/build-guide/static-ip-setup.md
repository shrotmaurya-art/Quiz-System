# Static IP Setup (DHCP Reservation) — Optional

The quiz server prints its LAN IP address when it starts (e.g.
`http://192.168.1.10:4000`). Every other device uses this IP to connect.

If you use a travel router or school Wi-Fi, the host laptop's IP **can change**
between rehearsal and event day (e.g. `192.168.1.10` one day, `192.168.1.15` the
next). When the IP changes, you'd need to re-type the URL on every device.

A **DHCP reservation** (also called "static DHCP" or "address reservation") tells
the router to always give the host laptop the same IP. This is optional — the
system works fine without it — but it reduces one variable on event day.

---

## How It Works

Every network device has a **MAC address** (a permanent hardware identifier). A
DHCP reservation pairs that MAC address with a fixed IP. The router remembers the
pairing, so every time the host laptop connects, it gets the same IP.

---

## Step-by-Step (Typical Router Admin Page)

1. **Connect** the host laptop to the Wi-Fi network you'll use for the event.

2. **Find the router's admin address:**
   - On the host laptop, open a terminal/command prompt and type:
     ```
     ipconfig           (Windows)
     ```
     or
     ```
     ifconfig           (macOS / Linux)
     ```
   - Look for the **Default Gateway** IP (e.g. `192.168.1.1` or `192.168.0.1`).

3. **Open the router admin page:**
   - Enter the Default Gateway IP in a browser.
   - Log in with the router's admin username/password (often printed on the
     router itself, or set by whoever configured it).

4. **Find the host laptop's MAC address:**
   ```
   ipconfig /all       (Windows — look for "Physical Address")
   ```
   or
   ```
   ifconfig            (macOS — look for "ether" under en0/en1)
   ```
   It looks like `AA:BB:CC:DD:EE:FF`.

5. **Create the reservation:**
   - Navigate to the **DHCP Reservation**, **Address Reservation**, or
     **Static DHCP** section (exact name varies by router brand).
   - Click **Add**.
   - Enter the MAC address from step 4.
   - Enter the IP address you want (pick one that's not already in use, e.g.
     `192.168.1.100`).
   - Save the setting.

6. **Reboot or reconnect** the host laptop so it picks up the reserved IP.

7. **Verify** — the host laptop should now have the IP you reserved
   (`ipconfig` / `ifconfig` again). The server will print this IP at startup.

---

## Router-Specific Menu Names

| Brand | Typical section name |
|-------|---------------------|
| TP-Link | DHCP → Address Reservation |
| Asus | LAN → DHCP Server → Manually Assigned IP |
| Netgear | Advanced → Setup → LAN Setup → Address Reservation |
| D-Link | Setup → Network Settings → Add DHCP Reservation |
| Linksys | Connectivity → Local Network → DHCP Reservation |
| Xiaomi | Settings → Network → DHCP → Static DHCP |
| Travel router (GL.iNet) | Network → DHCP → Static DHCP Leases |

> If you can't find the option, search the router's manual for **"DHCP reservation"**
> or **"static DHCP"**.

---

## If Your Router Doesn't Support Reservations

Most modern travel routers and school access points do. If yours doesn't:

- Use a **phone hotspot** as the Wi-Fi network instead (iPhone hotspot or Android
  hotspot). The host laptop's IP on a hotspot rarely changes between sessions.
- Or, accept that the IP may change on event day — just note the new IP from the
  server's startup message and update the URLs on each device. The system prints
  the current LAN IP every time it starts.

---

## Important Note

The admin panel may regenerate QR codes and join URLs dynamically based on the
server's detected LAN IP (Task 10.4). If that behaviour is confirmed, a static IP
becomes a convenience rather than a necessity — the system self-corrects. Use this
guide as a belt-and-suspenders measure, not a requirement.
