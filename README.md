# ArcOS Share Discovery

[![AI Slop Inside](https://sladge.net/badge.svg)](https://sladge.net)

An ArcOS v7 app for finding and browsing SMB file shares on your local network, and mounting them
as read-only drives in ArcOS.

It opens straight into the **discovery setup** until a helper is connected; once connected you can
switch between the discovered-hosts list and your manual entries. Manual entries never require a
helper.

| | |
|---|---|
| App ID | `NikN_ArcSD` |
| Built package | `NikN_ArcSD.arc` |
| Requires | ArcOS v7 |
| Version | 1.0.1 |

---

## What it does

**Manual entries** — always available:

- Type a host or IP (`nas01`, `192.168.1.20`) and optionally a share name and a label.
- Every entry shows its UNC path, e.g. `\\192.168.1.20\media`.
- **Browse** opens that host and lists its shares — even when a scan cannot find it, which is the
  main reason to save a host by hand.
- Edit and delete entries. Everything is saved in your ArcOS preferences and survives restarts.
- Adding the same host/share again just updates its label instead of creating a duplicate.

**Discovery mode** — after you run the helper:

- Scans the local network for machines that speak SMB, using mDNS, WS-Discovery and NetBIOS.
- Shows IP, hostname, workgroup, how the host was found, whether port 445 is open, and round-trip time.
- Lists each host's shares. Administrative shares (`C$`, `ADMIN$`, `IPC$`, `print$`) are hidden, since
  they are not meant to be browsed.
- Anonymous enumeration is attempted; hosts that refuse anonymous access report it as such.
- **Sweep subnet** connects to every address on your subnet when passive discovery misses something.
  It is slower, noisier on the network, and can be cancelled while it runs.
- **Mount as a drive** (discovery mode): any disk share can be mounted as a read-only drive in the
  ArcOS File Manager and the media player. A secure-context prompt confirms the mount; free space is
  shown next to the button.

Your manual entries are never touched by a scan. Both lists live in the same window and share the
same look.

---

## Why a helper is needed

A browser page cannot open SMB connections. There are no raw sockets, no UDP, no multicast and no
ability to launch a local program from inside ArcOS. So the app cannot scan port 445, send an mDNS
query or ask a machine for its share list — none of that is possible from JavaScript in the page.

The helper is a PowerShell script that does that work from the machine it runs on and answers the app
over `http://127.0.0.1:8790`. It only listens on loopback, so nothing on your network can talk to it.

The app **generates** the helper for you as a single `.cmd` file. You do not download anything from a
website, there is no installer, no Node.js, no npm, and nothing is written to your system outside
your own Downloads folder.

---

## Mounting shares as drives

Once connected, every **disk** share has a **Mount** button. Pressing it (after a secure-context
prompt) registers the share as a read-only drive in ArcOS, so it shows up in the File Manager and
the media player just like a local drive. Free space is queried from the server and shown next to
the button.

Unmounting removes the drive, not the files. Drives created by older builds of the app are patched
in place on startup, so an upgrade does not require unmounting and remounting by hand.

Read-only is deliberate: writing back over SMB is a later phase.

---

## Enabling discovery

When the helper is not connected, the app opens straight into the setup panel:

1. Press **Download helper**. The file `arcos-share-agent.cmd` lands in your browser's download folder.
2. Double-click it. No UAC prompt, no firewall prompt, no install.
3. Leave the helper's console window open. The app flips to **Connected** within a few seconds and
   runs its first scan automatically.

Using ArcOS from a device that can't run the file (a phone, a Chromebook)? Press
**save a copy to your ArcOS files** instead. The same helper is written to `U:/Home/Downloads`, then
you fetch it from the File Manager on the PC that will run it. That copy is replaced on each save, so
it doubles as the update path.

The helper asks for **no administrator rights** and triggers **no firewall prompt**. Closing its
window stops it; the app returns to the setup view and keeps working.

### How the `.cmd` works, and why it looks odd

The helper script is about 28 KB. `cmd.exe` truncates any single command line at 8191 characters, so
the script cannot simply be stuffed into one `powershell -EncodedCommand` line — it would be silently
cut in half. Instead, the generated `.cmd` writes its own base64 payload to `%TEMP%`, decodes it as
UTF-8, runs it in memory, and deletes the temp file. You still only handle one file.

It also means the script never exists on disk as a `.ps1`, so Execution Policy does not block it.

> If your browser is set to "ask where to save", a native save dialog appears when you press
> **Download helper**. That is expected.

### Keeping the helper up to date

The app checks the helper's version on connect. If the helper is older than the app expects, it says
so and asks you to download a fresh copy. Saving again overwrites the old file.

---

## Installing

```powershell
npx v7cli build
```

This produces `NikN_ArcSD.arc`. Install it through the ArcOS File Manager like any other app.

## Developing

```powershell
npx v7cli update     # refresh arcos.d.ts against your ArcOS build
npx v7cli dev        # dev server on http://localhost:3128
```

Then, in ArcOS → ArcTerm:

```
devenv connect
```

CSS and `body.html` do not hot-reload; the app restarts when they change.

The helper lives at `src/agent/agent.ps1` and ships inside the `.arc`. To test it directly without
generating a `.cmd`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File src\agent\agent.ps1
```

It must stay compatible with **Windows PowerShell 5.1** — no `??`, no ternary operator, no
`ForEach-Object -Parallel`.

### Offline tests

`tests/` runs the real `src/process.js` in jsdom with a fake ArcOS shell and a fake helper, so most
UI behaviour can be checked without launching ArcOS:

```powershell
cd tests
npm install      # once
npm test
powershell -NoProfile -ExecutionPolicy Bypass -File agent-origins.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File share-harness.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File share-fs-harness.ps1
```

`agent-origins.ps1` lifts `Test-OriginAllowed` out of `src/agent/agent.ps1` and checks which
origins the helper will accept. `share-harness.ps1` checks share enumeration against captured
`net view` output and a live DCOM enumeration of `127.0.0.1`. `share-fs-harness.ps1` checks the
helper's file-access functions and the `/fs/*` routing layer.

---

## Troubleshooting

**"disconnected from helper" never changes to "connected to helper"**

- Is the helper's console window still open? Closing it stops the helper.
- Check `http://127.0.0.1:8790/health` in a normal browser tab on the same PC. You should get
  `{"ok":true,...}`.
- If you changed the helper's port, open **Helper address** in the setup panel and update it.
- Only one helper can run at a time. A second copy exits and says the port is in use.

**The scan finds nothing**

- Passive discovery depends on the other machines answering WS-Discovery or NetBIOS. Many modern
  devices do neither.
- Some Wi-Fi access points drop multicast traffic. WS-Discovery then finds nothing even when the NAS
  or printer supports it — NetBIOS usually still works.
- Try **Sweep subnet**. It connects to every address on your subnet and finds anything with SMB open.
- Know the machine anyway? Save it in the Manual tab and press **Browse** — a saved host does not
  have to be discovered to be browsed.
- Virtual machines, phones and IoT devices usually have no SMB at all — that is not a bug.

**"This host needs credentials"**

Guest access has been disabled by default on Windows since 10 1709 and on most NAS boxes, so a host
that refuses anonymous enumeration reports it as such. The app attempts anonymous enumeration only.

**"Could not turn `nas01` into an IPv4 address"**

A saved host can be a name, but the helper has to resolve it before it can open SMB to it. Flat
names (`nas01`) only resolve if this PC has them in DNS or in its NetBIOS cache; a name from another
subnet or another workgroup often does not. Save the host's IP address instead — Browse then works
without any name lookup.

**"The helper returned HTTP 403" / `Rejected request from origin ...` in the helper window**

The helper only answers the page that generated it. Any `https://*.arcweb.nl` address (`beta.arcweb.nl`,
`os.arcweb.nl`, …) and any `localhost` dev server are accepted out of the box, and the generated `.cmd`
also carries the exact origin this app is served from. A 403 therefore means the helper is an **older
copy** generated before that origin existed: stop it, regenerate the `.cmd`, and run the new one.

---

## Files

| Path | Purpose |
|---|---|
| `src/_app.tpa` | app manifest and window settings |
| `src/process.js` | the entire app: UI, preferences, helper generation, HTTP client |
| `src/drive.js` | the read-only SMB drive (loaded at runtime) |
| `src/body.html` | static markup |
| `src/style.css` | styles, scoped to `#NikN_ArcSD` |
| `src/agent/agent.ps1` | the discovery helper, embedded into the generated `.cmd` |
| `src/store/` | App Store assets (icon, banner, screenshots, README) |
| `project.arc.json` | v7cli project config |
| `AGENTS.md` | design notes, constraints and decision log for contributors |
| `tests/` | offline jsdom harness for the process class (not shipped in the `.arc`) |

`AGENTS.md` is the authoritative description of what is possible on the platform and why the app is
built the way it is. Read it before changing the architecture.