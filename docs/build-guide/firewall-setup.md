# Firewall Setup — Allow Inbound Connections on Port 4000

Other devices on the LAN need to reach the quiz server. By default, your laptop's
firewall blocks incoming connections. This guide opens port 4000 so the admin panel,
projector display, and candidate tablets can connect.

**One-time setup per laptop.** You only need to do this once — after that the rule
persists across restarts.

---

## Windows (Windows Defender Firewall)

1. Press **Win + R**, type `wf.msc`, and press **Enter**.
   (Or: Control Panel → System and Security → Windows Defender Firewall → Advanced Settings.)

2. Click **Inbound Rules** in the left panel.

3. Click **New Rule…** in the right panel.

4. Select **Port** → **Next**.

5. Select **TCP**, then **Specific local ports**: enter `4000` → **Next**.

6. Select **Allow the connection** → **Next**.

7. Leave all three profile checkboxes ticked (**Domain, Private, Public**) → **Next**.
   > If you want to be extra safe, uncheck **Public** — but for a school LAN all
   > three are fine.

8. Give the rule a name like **"Quiz Server (4000)"** → **Finish**.

**To verify:** From another device on the same Wi-Fi, open `http://<host-ip>:4000/api/health`
in a browser. You should see a JSON response with `"status": "ok"`.

**To remove later:** Find the rule in the Inbound Rules list, right-click → **Delete**.

---

## macOS (Built-in Firewall)

1. Open **System Settings** (or System Preferences on older macOS).

2. Go to **Network** → **Firewall**.

3. If the firewall is off, click **Turn On** (or leave it off — the quiz server
   can still work).

4. Click **Options…** (or **Firewall Options…**).

5. Click **Add Application** (the **+** button).

6. In the file picker:
   - Press **Cmd + Shift + G** to open the "Go to Folder" dialog.
   - Type `/usr/local/bin` and click **Go**.
   - Find and select **node** (or `node` if listed).
   - Click **Open**.

7. Make sure **Allow incoming connections** is selected for the `node` entry.

8. Click **OK** (or **Done**).

**To verify:** From another device on the same Wi-Fi, open `http://<host-ip>:4000/api/health`
in a browser. You should see a JSON response with `"status": "ok"`.

**To remove later:** Go back to Firewall Options, find `node` in the list, select it,
and click **Remove** (the **−** button).

---

## Linux (UFW)

```bash
sudo ufw allow 4000/tcp
sudo ufw reload
```

---

## Quick Check — Is the Firewall the Problem?

If a device's browser shows **"This site can't be reached"** or a connection timeout:

1. On the **host laptop**, open a browser and go to `http://localhost:4000/api/health`.
   - If this works but other devices can't connect → it's a firewall or network issue.
   - If this also fails → the server isn't running.
2. Run the verification steps above from another device after applying the firewall rule.
