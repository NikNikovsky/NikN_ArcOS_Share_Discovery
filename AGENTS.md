# AGENTS.md — ArcOS Share Discovery (`NikN_ArcSD`)

Briefing for any agent or human working in this repository. Read this before touching code.

---

## 1. What this app is

An ArcOS v7 third-party app (TPA) for working with **SMB file shares on the local network**. It runs in two modes: a zero-install **manual mode** where the user enters hosts and shares by hand, and a **discovery mode** that unlocks automatic LAN scanning once a locally-run PowerShell helper is connected.

| Fact | Value |
|---|---|
| App ID | `NikN_ArcSD` |
| Package output | `NikN_ArcSD.arc` |
| Payload directory | `src` |
| Dev server port | `3128` |
| Author | Nik Nikovsky |
| Node/tooling | `npx v7cli` only — no `package.json` in the repo root |
| Helper version | `1.3.0` (agent + app) |

**Status: manual mode, discovery, share enumeration and read-only SMB drive are implemented.** `src/process.js` holds the whole UI and talks to `src/agent/agent.ps1` over `http://127.0.0.1:8790`. Manual entries, the setup panel, helper delivery, health polling, mDNS/WS-Discovery/NetBIOS/445-sweep discovery, share enumeration and a read-only virtual drive (one mount per share) are in place. Still open: the `.arc` has not yet been installed on a real ArcOS instance from a build, and the built copy in the repo is older than the source.

### The two modes

| | Manual mode | Discovery mode |
|---|---|---|
| Requires | nothing | the helper running once |
| Entry point | app opens straight into it | app detects `/health` |
| Host list | typed in by the user | scanned from the LAN |
| Share names | typed in by the user | enumerated from each host |
| Scan button | offers to set up the helper | rescans the network |
| Never removed | ✓ | — |

Manual mode is not a degraded placeholder — it is a permanent, first-class part of the app. Discovery mode is an *upgrade* that adds rows to the same window. Both share one storage model, one copy action, and one look.

### Scope lock

- **IN:** a zero-install manual host/share list, plus LAN/SMB host discovery and per-host share enumeration **via the optional helper**.
- **OUT:** ArcOS server shares (`ShareMgmt`), `AdminBootstrapper`, `fs.drives`, mount/unmount of ArcOS shares. This was explicitly considered and **rejected** — do not add it back without being asked. See §15.

---

## 2. Non-negotiable constraints

These are physical properties of the platform, not preferences. Do not design around them.

1. **A TPA cannot touch the network.** It is JavaScript running inside the ArcOS page. There are no raw sockets, no UDP, no multicast, no `child_process`, no ability to execute a local binary. mDNS, WS-Discovery, NetBIOS and TCP/445 are all impossible from the app itself. This is why the helper exists.
2. **The helper must listen on loopback only.** ArcOS is served over HTTPS. An HTTPS page may fetch `http://localhost` / `http://127.0.0.1` (treated as potentially trustworthy), but fetching `http://192.168.1.5:8790` is blocked as mixed content. The agent does the LAN work from the machine it runs on.
3. **Chrome's Private Network Access applies.** A request from a public origin (`https://beta.arcweb.nl`, `https://os.arcweb.nl`) to a local address requires an `OPTIONS` preflight answered with `Access-Control-Allow-Private-Network: true`, plus an explicit `Access-Control-Allow-Origin`. Wildcards are rejected, and so is any origin the helper does not recognise — see §6. Getting this wrong fails silently — the app just says "agent offline".
4. **Anonymous SMB enumeration is usually refused.** Guest access has been off by default on Windows since 10 1709. "Host found, shares need credentials" is the **expected normal outcome**, not an error state.

---

## 3. Architecture

```
ArcOS page (https://os.arcweb.nl)          user's Windows machine
┌──────────────────────────────┐  HTTP/JSON ┌────────────────────────────┐
│ TPA: src/process.js          │ ─────────► │ agent.ps1                  │
│  - polls /health every 2s    │ localhost  │  TcpListener 127.0.0.1:8790│
│  - renders hosts + shares    │   :8790    │  mDNS / WS-Discovery /     │
│  - holds creds in memory     │ ◄───────── │  NetBIOS / 445 sweep /     │
│  - generates the .cmd        │            │  Win32_Share enumeration   │
└──────────────────────────────┘            └────────────────────────────┘
                                                      │ UDP 5353 / 3702 / 137, TCP 445 / 135
                                                      ▼
                                              local network hosts
```

### Mode flow

```
open app
  └─ render manual list immediately        ← never blocked by anything
      ├─ poll /health every 2s ──┐
      └─ [Scan network] ─────────┴─► helper not running ─► setup panel (§10.1)
                                                    └─ helper running ─► discovery view
```

The window never waits on the network to become usable. Manual entries render from preferences synchronously; `/health` polling and the Scan action are strictly additive.

### The handoff (why a `.cmd` is generated at runtime)

The helper source ships **inside** the `.arc` at `src/agent/agent.ps1`. On demand the app reads that file, base64-encodes it as **UTF-8**, and wraps it in a single self-contained `.cmd`:

```
@echo off
setlocal
set "SD_PAYLOAD=%TEMP%\arcos-share-agent.b64"
> "%SD_PAYLOAD%" echo.<base64 chunk 1>
>> "%SD_PAYLOAD%" echo.<base64 chunk 2>
...
powershell -NoProfile -ExecutionPolicy Bypass -Command "...decode %SD_PAYLOAD% as UTF-8, delete it, iex the result..."
pause >nul
```

The user downloads it — or saves a copy to their ArcOS files — and double-clicks it.

**Why not `-EncodedCommand`?** `cmd.exe` truncates any single command line at **8191 characters**. Base64 of UTF-16LE inflates the script by ~2.7×, so the inline form only fits scripts of about 3 KB. This helper is ~26 KB. Any future attempt to "simplify" the `.cmd` back to one `-EncodedCommand` line will silently produce a truncated script — the handoff is a self-extractor for a hard reason, not by preference.

Why each piece is necessary:

| Problem | Solution |
|---|---|
| Execution policy blocks downloaded `.ps1` | Nothing is run as a `.ps1` file: the payload is decoded in memory and `iex`'d, and the launcher uses `-ExecutionPolicy Bypass` |
| `cmd.exe` truncates command lines at 8191 chars | Base64 payload is written to `%TEMP%` in ~900-char chunks, then read back |
| `-EncodedCommand` expects UTF-16LE | Not used at all — the payload is UTF-8 and decoded explicitly in the `-Command` string |
| `HttpListener` needs an admin URL ACL | Raw `TcpListener` avoids URL ACL entirely |
| UAC prompt | Not needed — nothing is elevated |
| Windows Firewall prompt | Loopback traffic is exempt from filtering; outbound LAN needs no rule |
| Node / npm / runtime install | PowerShell 5.1 ships with Windows |
| Two files to distribute | Single `.cmd`; the temp payload deletes itself after decoding |

When updating the helper's behaviour, edit `agent.ps1` in the repo — do **not** move PowerShell code into a JS string.

---

## 4. Repository map

| Path | Ships in `.arc` | Purpose |
|---|---|---|
| `AGENTS.md` | no | this document |
| `README.md` | no | user-facing setup/build docs |
| `project.arc.json` | no | v7cli project config |
| `tsconfig.json` | no | typing config, loads `arcos.d.ts` |
| `arcos.d.ts` | no | generated ArcOS v7 global typings (182 KB, do not hand-edit) |
| `.gitignore` | no | ignores `NikN_ArcSD.arc`, `.arcdev-build/`, `tests/node_modules/` |
| `.vscode/settings.json` | no | maps `*.tpa` → JSON |
| `src/_app.tpa` | yes | window/app manifest |
| `src/process.js` | yes | the process class — **all app logic goes here** |
| `src/body.html` | yes | markup fragment (no `<body>` tag) |
| `src/style.css` | yes | styles, must be scoped to `#NikN_ArcSD` |
| `src/agent/agent.ps1` | yes | the scanner, read at runtime to build the `.cmd` |
| `src/main.js` | — | **removed**: legacy `runApp` bootstrap, obsolete since 7.0.10 |
| `tests/ui.test.js` | no | offline jsdom harness: manual list, targets, helper `.cmd`, connect, filter |
| `tests/edge.test.js` | no | offline harness: corrupt prefs, restart, version mismatch, credentials, sweep cancel |
| `tests/package.json` | no | `jsdom` dev dependency + `npm test` (the root still has no `package.json`) |
| `tests/agent-origins.ps1` | no | no browser, no helper: extracts `Test-OriginAllowed` from `agent.ps1` and checks the CORS allowlist |
| `tests/mdns-harness.ps1` | no | no socket, no helper: lifts the discovery block and feeds `ConvertFrom-MdnsMessage` hand-built DNS packets (PTR/SRV/A, compression, TTL 0, truncation) |
| `tests/share-harness.ps1` | no | no helper: `net view` fixtures through `ConvertFrom-NetViewOutput`, credential-name and reason mapping, a live DCOM enumeration of `127.0.0.1`, and an optional credentialed run against any host |
| `tests/share-fs-harness.ps1` | no | no helper: `ConvertTo-SharePath` path guard, `Invoke-FsList`/`Stat`/`Read` against a scratch folder, error mapping, epoch math, and the `/fs/*` routing layer |

There is an initial commit (19 files, no credentials or real hosts). Subsequent drive work is uncommitted.

---

## 5. ArcOS TPA rules

These are the rules that make the difference between "works" and "crashes ArcOS".

### 5.1 Process class shape

`process.js` must **return the class itself**, not an object. Since 7.0.10 there is no `main.js`/`runApp` indirection.

```js
const html = await loadHtml("body.html");

class proc extends ThirdPartyAppProcess {
  constructor(pid, parentPid, app, operationId, workingDirectory, ...args) {
    super(pid, parentPid, app, operationId, workingDirectory);
  }

  async render() {
    if (this._disposed) return;
    this.getBody().innerHTML = html;
    // wire up
  }
}

return proc;
```

- The **current** constructor signature is `(pid, parentPid, app, operationId, workingDirectory, ...args)`. The old `(handler, pid, parentPid, app, workingDirectory, ...args)` in this repo's scaffold is wrong for TPA rev 2.
- Override `render()` for windowed apps (not `onStarted()` — that is for `ThirdPartyProcess`, the windowless variant).
- `this.getBody()` returns the window's body `div`.
- Start **every** async method with `if (this._disposed) return;`.

### 5.2 Logging and error handling

- **Never use `console`.** ArcOS owns the console. Use `this.Log(message, LogLevel.info | warning | error | critical)`. `LogLevel` is a TPA global (7.0.4+).
- **`Debug(msg)` opens a message box.** It is not a logger. Never use it for diagnostics.
- **Wrap the inside of every callback in `try/catch`.** An unhandled error thrown from an event listener or store subscription is not attributed to your app's try/catch scope; ArcOS' global handler treats it as a system-wide crash. Wrapping the `addEventListener` call does *not* help — the body must be guarded.

### 5.3 CSS

- Every selector must be prefixed with the window ID: `#NikN_ArcSD > div.body { ... }`.
- `:root #NikN_ArcSD > div.body { ... }` works for custom properties.
- **Do not** `@import` local stylesheets — they will not resolve. Use multiple `<link>` elements in `body.html`.
- CSS does not hot-reload during `v7cli dev`; the whole app restarts.
- Prefer ArcOS variables so the app follows the user's theme: `--fg`, `--win-bg`, `--win-border`, `--win-border-light`, `--win-border-rad`, `--glass-bg`, `--glass-alt-bg`, `--glass-ultralight`, `--glass-ultradark`, `--darkened-overlay`, `--darkened-overlay-alt`. ArcOS native apps also use `--button-bg` and `--button-glass-bg`.

### 5.4 Window and metadata

- `_app.tpa` `entrypoint` must be `process.js`.
- `metadata.icon` — use the built-in `ShareIcon`. The current `@local:icon.png` points at a file that does not exist.
- `metadata.name`/`version` must stay in sync with `project.arc.json`.
- `state.resizable` and `state.headless` **cannot be changed at runtime**; decide them in `_app.tpa`.
- Runtime window control: `stack.renderer?.toggleMaximize(this.pid)`, `toggleMinimize`, `toggleFullscreen`, `snapWindow(pid, "top-left")`.
- `this.windowTitle.set("...")`, `this.windowIcon.set(url)`.
- The scaffold's 300×300 with `maxSize` 300×300 is unusable for a host/share browser — resize and enable maximize.

### 5.5 Preferences

App settings live at `userPreferences.appPreferences["NikN_ArcSD"]`, which is created automatically on construction.

```js
this.userPreferences.update((v) => {
  v.appPreferences["NikN_ArcSD"].agentUrl = url;
  return v;   // ← MANDATORY. Omitting this WIPES the user's preferences.
});
```

Never hold preferences across a long operation before writing them back — you will silently roll back concurrent changes.

### 5.6 Globals cheat sheet

| Global | Notes |
|---|---|
| `util.join(...parts)` | path join |
| `util.DownloadFile(arrayBuffer, filename, mime?)` | triggers a browser download; takes an **ArrayBuffer** |
| `util.formatBytes(n)` | human-readable size |
| `util.htmlspecialchars(s)` | **use for any untrusted string inserted into HTML** |
| `util.sha256(s)` | async hash, useful for helper versioning |
| `convert.arrayToText(buf)` | `ArrayBuffer` → string |
| `convert.textToArrayBuffer(s)` | string → `ArrayBuffer` (for `DownloadFile`) |
| `convert.textToBlob(s, type?)` | string → `Blob` (for `fs.writeFile`) |
| `workingDirectory` | the app's install directory |
| `fs` | filesystem kernel module |
| `UserPaths` | `Downloads` = `U:/Home/Downloads`, `Documents` = `U:/Home/Documents`, `Applications` = `U:/Applications` |
| `Sleep(ms)` | awaited delay |
| `MessageBox(data, parentPid)` | dialog |
| `env` | environment variables (`env.get("shell_pid")`) |

---

## 6. Agent rules (`agent.ps1`)

- **Windows PowerShell 5.1 syntax only.** No `??`, no `? :` ternary, no `ForEach-Object -Parallel`, no `pwsh`-only cmdlets. Test on 5.1, not 7.
- Bind a raw `System.Net.Sockets.TcpListener` to `127.0.0.1:8790`. Do not use `HttpListener`.
- Parse HTTP/1.1 minimally: read until `\r\n\r\n`, honour `Content-Length`, read the body, respond with `Content-Type: application/json` and `Connection: close`.
- Handle `OPTIONS` per §2.3, echoing `Access-Control-Allow-Private-Network: true` only when `Access-Control-Request-Private-Network: true` was sent.
- Enforce an `Origin` allowlist: any `https://*.arcweb.nl` host (`os.arcweb.nl`, `beta.arcweb.nl`, future ones), any loopback dev server (`http://localhost:<any port>`, `http://127.0.0.1:<any port>`), plus the exact origin written into the generated `.cmd` as `ARCSD_ORIGIN`. Requests bearing any other `Origin` get rejected with no CORS headers. The list must never become a wildcard — the helper listens on loopback, where any page the user visits could otherwise reach it.
- The generated `.cmd` must carry the origin the app was actually served from (`location.origin`), passed through `sanitizeOrigin()` and emitted as `set "ARCSD_ORIGIN=..."`. That is what makes a self-hosted or renamed ArcOS deployment work without editing `agent.ps1`. **Do not** hard-code a single origin again: the public instance has already moved (`os.arcweb.nl` → `beta.arcweb.nl`), and a hard-coded list silently rejects every request from the new one.
- **Never write credentials to disk. Never log credentials. Never include credentials in a response.** Build a `PSCredential` per request, use it, discard it.
- All errors return a JSON body `{ "error": "<machine-readable>", "detail": "<human text>" }` with an appropriate status code — never an HTML error page.
- Log to the console window only: one line per scan phase, no packet dumps.

---

## 7. Agent HTTP API

| Method | Path | Request | Response |
|---|---|---|---|
| `GET` | `/health` | — | `{ ok, version, platform, psVersion, hostname }` |
| `GET` | `/subnet` | — | `{ ip, cidr, gateway }` |
| `POST` | `/scan` | `{ mode: "passive"\|"sweep", timeoutMs }` | `{ hosts: [{ ip, hostname, workgroup, sources[], port445, rttMs }] }` |
| `POST` | `/hosts/:ip/shares` | `{ username?, password?, domain? }`; `:ip` may also be a hostname the helper resolves | `{ shares: [{ name, type, comment, admin }], denied: bool, reason, detail }`; an unresolvable name is a `400` with `error: "unreachable"` and a human `detail` |
| `POST` | `/fs/list` | `{ unc, path?, username?, password?, domain? }` | `{ entries: [{ name, isDir, size, modified, created, hidden }], count, path }` |
| `POST` | `/fs/stat` | `{ unc, path?, ... }` | `{ isFile, isDirectory, size, created, modified }` |
| `POST` | `/fs/read` | `{ unc, path, ... }` | `{ data (base64), size, path }` or `413 too_large` for files over 16 MB |

`/health` must stay unauthenticated and fast — the app polls it every 2 s while disconnected.

---

## 8. Discovery implementation

| Technique | Transport | Finds | ~LOC | Status |
|---|---|---|---|---|
| mDNS `_smb._tcp.local` | `UdpClient`, 224.0.0.251:5353, QCLASS `0x8001` | macOS, avahi Linux, most NAS | 300 | implemented |
| WS-Discovery `Probe` | SOAP over `UdpClient`, 239.255.255.250:3702 | Windows 7+, NAS, printers | 90 | implemented |
| NetBIOS NBSTAT | `UdpClient`, 137 | legacy Windows, Samba, NAS | 90 | implemented |
| TCP/445 sweep | async `Socket.ConnectAsync` + `WaitOne(200)`, 64 concurrent | anything with SMB open | 70 | implemented |
| Reverse DNS | `Dns::GetHostEntry` in try/catch | hostnames | 20 | implemented |

- Merge results by IP; keep a `sources[]` array per host. `Merge-DiscoveredHost` owns that merge: sources are a set, and a name learned by one technique is never overwritten by an answer that carries none.
- **Passive by default.** The sweep is opt-in, must show progress, and must be cancellable.
- mDNS requires a real DNS wire-format parser (name compression pointers, PTR → SRV → A). This is the most bug-prone code in the project — build it against captured fixtures, not live guesswork. `tests/mdns-harness.ps1` does exactly that: it constructs the packets byte by byte instead of depending on what happens to be on the LAN.

### Field notes (learned on a real LAN, do not "simplify" these away)

- **NetBIOS replies may have `QDCOUNT = 0`.** Synology DSM and some Samba builds do not echo the question section, while Windows does. A parser that unconditionally skips "name + type + class" desyncs and silently drops every reply. Read `QDCOUNT`/`ANCOUNT` from the header (bytes 4–7) and walk the sections — that is what `ConvertFrom-Nbstat` does. Verified: 6 hosts found where the old parser found 0.
- **`255.255.255.255` is often dropped.** Some access points and switches forward only the subnet-directed broadcast. Send the NBSTAT query to both `IPAddress.Broadcast` and the interface's directed broadcast (`Get-DirectedBroadcast`, computed from address + `PrefixLength`) — on the test network the limited broadcast got 0 replies and the directed one got 8.
- **WS-Discovery `XAddrs` usually contains a hostname**, not an IP (`http://nas01:5357/…`). Scraping an IPv4 out of the body therefore finds nothing. Use the **sender address** of the datagram (`IPEndPoint` passed to `UdpClient.Receive`).
- **Some Wi-Fi networks filter multicast entirely.** WS-Discovery then returns nothing even though the devices do answer: a *unicast* probe to the same device on 3702 replies immediately on such a network. This is an environment limitation, not a bug — NetBIOS and the sweep still work, and the UI says so.
- **mDNS needs the unicast-response (QU) bit, or it hears nothing.** A plain mDNS query goes out from an ephemeral port, but a responder that answers by multicast sends to 5353 — a port this helper cannot bind on Windows, where the DNS Client service already owns it. Setting the QCLASS high bit (`0x8001`) asks for the reply to come back to the sender. Avahi and mDNSResponder honour it; a responder that ignores QU is simply missed, which is why NetBIOS and the sweep stay.
- **The SRV target is the hostname, the PTR instance is not.** An instance name is free text (`DiskStation on the shelf`), so `ConvertFrom-MdnsMessage` prefers the first label of the SRV target (`nas01.local` → `nas01`) and falls back to the instance name only when no SRV arrived. Responses put SRV/A in the *additional* section as often as the answer section, so all three sections are walked.
- **mDNS answers often omit the question section** (`QDCOUNT = 0`) exactly like NBSTAT, and **a TTL of 0 is a goodbye packet** — a service announcing that it is leaving. Trusting it would remove a host that is still there.
- **On the test network mDNS was the only passive technique that named the NAS boxes**: WS-Discovery returned nothing (multicast filtered by the access point) while mDNS answered in ~1.2 s and merged with the NetBIOS result into one row per host with both badges. That is the intended shape — no technique is a substitute for the others.

---

## 9. Share enumeration

Primary — `Win32_Share` over **DCOM**:

```powershell
$option  = New-CimSessionOption -Protocol Dcom
$session = New-CimSession -ComputerName <ip> -SessionOption $option [-Credential <pscredential>] -OperationTimeoutSec 30
Get-CimInstance -ClassName Win32_Share -CimSession $session
Remove-CimSession -CimSession $session
```

`Get-CimInstance -ComputerName <ip>` **must not be used**: it defaults to WS-Management, and the WinRM service is *stopped and disabled* on a stock Windows install, so every call fails with "The client cannot connect to the destination". `Win32_Share` is a WMI class; DCOM is the transport that actually works, and it is what `Get-WmiObject` used before it was deprecated. This was a real shipped bug: every host reported `denied` because the primary path always threw and the fallback was unreachable for anonymous requests.

Yields `Name`, `Type` (`Disk` / `IPC` / `Print` / `Device`), `Description`. Requires RPC (135 + dynamic range) — corporate firewalls often block it, which is what the fallback is for.

Fallback (445 only):

```powershell
net use \\<ip>\ipc$ /user:<domain>\<user> <password>
net view \\<ip> /all
net use \\<ip>\ipc$ /delete
```

Always `net use /delete` in a `finally` block so the session is not left behind.

**`net view` prints an aligned table, not UNC paths.** There is no `\\host\` prefix on the share rows, so a parser that looks for one silently returns zero shares while reporting success — also a shipped bug. Parse rows by the type column instead: split on runs of two or more spaces, and accept a line only when field 2 is `Disk` / `IPC` / `Print` / `Device`. That filters the title, the header and the rule line out without depending on language for anything except those four words. `ConvertFrom-NetViewOutput` does this and is covered by `tests/share-harness.ps1` against captured output.

**Order of attempts:** if RPC endpoint mapping (port 135) is open → DCOM with the current user (or supplied credentials) → `net view` over 445 → `denied`. An anonymous request is still an attempt as the current user, so do not short-circuit it to `denied` when the RPC path fails; on a domain-joined machine the 445 pass often succeeds where RPC is firewalled.

**Probe 135 before DCOM.** A NAS never listens on 135, and a doomed `New-CimSession` costs about 6 seconds before the 445 pass — the one that actually answers — even starts. `Test-TcpPort -Port 135 -TimeoutMs 700` first turns an 11.8 s Synology enumeration into 1.1 s, and leaves DCOM for the hosts where it can work.

**Never let `net.exe` prompt.** `net use` asks for a password on the console when the one supplied is empty, and asks about changing it when the account's password has expired. This helper answers one request at a time, so a prompt does not slow it down — it wedges it until somebody types into its window, while the app times out and reports "the helper did not answer". `Invoke-NetCommand` starts `net.exe` through `ProcessStartInfo` with `RedirectStandardInput = $true`, closes stdin immediately, and `WaitForExit(timeoutMs)` kills it otherwise. Consequence: a blank password can never be tried over 445 (Windows refuses network logon with one anyway), so `Get-SharesViaNetView` skips the `net use` pass and says so in `detail`.

**`net.exe` exits `2` for every failure.** The real Win32 code is only in the message ("System error 1326 has occurred."), so `Get-NetErrorCode` reads the number out of the text and falls back to the exit code. Without it every refusal looks like a generic failure and the app cannot tell a wrong password from a closed port.

**Credential fields are two strings, not a parsed pair.** `Get-UserCandidates` builds the names worth trying, in order: `DOMAIN\user` when a domain was typed and the username is bare; the bare username; `MicrosoftAccount\you@example.com` for an e-mail address, which SMB insists on even though sign-in UI does not. A username that already contains `\` wins over the domain field — blindly concatenating both is how `CONTOSO\CONTOSO\alice` gets sent. `.\user` is stripped because DCOM rejects that prefix.

**A refusal must explain itself.** The response carries `reason` (machine-readable) and `detail` (the verbatim Windows text, already scrubbed of `net.exe` boilerplate). The app turns `reason` into one line of advice and shows `detail` underneath; without it a failed sign-in looks identical to the prompt that preceded it, which is exactly how "it says denied even with the right password" got reported.

| `reason` | Means | App says |
|---|---|---|
| `bad_credentials` | 86 / 1326 / 1327 / 2202 from `net use` | account or password not accepted |
| `access_denied` | 5 | account refused for the file-sharing service |
| `anonymous` | no username given, 445 refused | host refuses anonymous sign-in |
| `guest_blocked` | 1272 | policy blocks guest access |
| `session_conflict` | 1219 | existing connection under another name; `net use \\host /delete` |
| `account_locked` / `account_disabled` / `password_expired` | 1909 / 1331 / 1907 | account state on the host |
| `unreachable` | 53 / 67 / 1231 / 6118 | nothing answered on 445 |
| `empty` | `net view` succeeded, no rows | host answered, publishes nothing for this account |
| `ok` / `failed` | success / anything else | — |

The app must never re-render an empty credential form after a failed attempt: pre-fill the username and domain (never the password) and keep the message, so the user can see the attempt happened.

**Sign-ins are remembered per host in memory, never on disk.** A password typed once is reused when that host is selected again — clicking between hosts must not ask for the same password twice. A password in `userPreferences` would be plain text on disk, so the app holds the map in the process and drops it when the window closes; a **Forget** button clears one host. Reusing a remembered pair that fails is reported as "The saved sign-in was refused", not as a fresh prompt, because the two look different to the user.

UI: hide `IPC$`, `ADMIN$`, `print$` behind a "show administrative shares" toggle rather than dumping them on the user. A Windows box whose only shares are administrative therefore looks empty until that box is ticked — say so in the pane instead of rendering a bare "no shares".

---

## 10. UI spec

One window, two modes. The app must be useful the instant it opens, before any helper exists.

| | Manual mode (always available) | Discovery mode (helper connected) |
|---|---|---|
| Trigger | `/health` unreachable | `/health` returns ok |
| Content | user-entered host/share entries | discovered hosts + their shares |
| Primary action | **Scan network** → setup panel (§10.1) | **Rescan** |
| Message to the user | "the browser can't scan the network — run the helper once to enable discovery" | live results |

### Layout

- **Toolbar:** connection state (`Manual` / `Connected`), primary action button, refresh, settings (agent URL).
- **View tabs**, only when connected: **Discovered** | **Manual**. In manual mode there is a single view and no tabs.
- **Never hide the manual list when the helper connects.** Manual entries may point at subnets the helper cannot see, and they are user-authored data.

### Manual mode content

- **Add form** at the top: `Host / IP` (required), `Share` (optional), `Label` (optional), **[Add]**.
- **Entry rows:** label (or host), the normalized `\\host[\share]` in monospace, plus **Browse**, **Copy**, **Edit**, **Delete**.
- **Browse** opens that host in the discovered view and enumerates its shares. A saved host is not required to appear in a scan — it may sit on a subnet the helper cannot reach, and that is the main reason to save one. With the helper offline, Browse opens the setup panel and names the host, exactly like **Scan network** does. A saved entry may be a hostname rather than an IP: the helper resolves it (`Resolve-IPv4`, DNS then a ping for flat NetBIOS names) before probing 135/445, and reports a plain `unreachable` when the name cannot be resolved at all.
- **Empty state** explains what a UNC path is, shows an example (`\\SERVER\Shared`), and points at the Scan button.
- **Copy is the terminal action.** There is no "open in Explorer" — see §2, it cannot be done. Never render a disabled button implying otherwise.

### Discovery mode content

- **Host list:** IP · hostname · workgroup · source badges · 445 status · RTT. Row click selects. A host opened from a saved entry that no scan returned gets its own row marked **Saved host**, so the pane has visible context for what is selected.
- **Share pane:** filter box, type badges, "show administrative shares", copy `\\host\share`, credential prompt when `denied`.
- **Sign-ins are remembered per host for the life of the window.** Selecting a host that was signed in to earlier reuses that pair instead of showing an empty form again; **Forget** drops it. Nothing is written to preferences — retyping once per app start is the price of never putting a password on disk.
- **States to render explicitly:** scanning · no hosts found · host unreachable on 445 · enumeration denied · success. A denial after a sign-in attempt is its own state: it names the account that was tried, turns `reason` into one line of advice, shows the helper's `detail` underneath, and leaves the username and domain filled in. A refusal of a *remembered* sign-in says so ("The saved sign-in was refused"), because reusing a stored password and failing looks different to the user than typing one. "Denied" printed the same way twice, with an empty form, is indistinguishable from the button doing nothing.

### Setup panel

Appears **inline** when Scan is pressed in manual mode, and whenever the helper needs to be (re)delivered. It must not be a blocking modal — the manual list stays visible and usable behind it.

It must contain: one sentence on *why* a helper is needed (a browser cannot open SMB connections), the delivery actions (§10.1), and a status line that flips to "connected" on its own without further interaction.

Auto-connect: poll `/health` every 2 s (back off to 10 s, stop after ~60 s), then trigger a passive scan automatically on first successful connection.

### 10.1 Helper delivery — download first, ArcOS copy as a fallback

The generated `.cmd` has to reach the user's machine somehow. The setup panel offers **one primary button** plus **one secondary link**. There is no destination chooser and no stored preference: on the machine that will run the helper, the download is the answer, and asking the user to pick a folder only adds a click.

| Action | Call | Lands in |
|---|---|---|
| **Download helper** (primary button) | `util.DownloadFile(convert.textToArrayBuffer(cmd), "arcos-share-agent.cmd", "application/octet-stream")` | browser download folder |
| **save a copy to your ArcOS files** (secondary text link) | `fs.writeFile(util.join(UserPaths.Downloads, "arcos-share-agent.cmd"), convert.textToBlob(cmd, "application/octet-stream"), undefined, true)` | `U:/Home/Downloads` |

Implementation notes:

- **The download is the default and needs no state.** The button is disabled only until the helper payload has loaded; pressing it never asks a question first.
- **The ArcOS copy is a fallback for a browser that cannot run the file** (ArcOS opened on a phone or Chromebook). It is styled as an inline text link, not a second button, so it does not compete with the primary action.
- **API asymmetry — do not mix these up:** `util.DownloadFile` wants an `ArrayBuffer` (`convert.textToArrayBuffer`); `fs.writeFile` wants a `Blob` (`convert.textToBlob`).
- **Download:** `DownloadFile` has no success callback. Show "Saved to your downloads folder as `arcos-share-agent.cmd`", never "download verified". If the browser is set to "ask where to save", a native dialog appears — that is expected, do not try to detect it.
- **ArcOS copy:** `fs` exposes no `exists()`. (`fs.stat()` does exist and resolves `undefined` for a missing path, so a confirmation is *possible* — but the design is deliberate **silent overwrite**, which doubles as the update mechanism.) State that in the UI copy ("replaces any existing copy"). If a confirmation is ever wanted, `fs.stat(path)` or `fs.readDir(UserPaths.Downloads)` both work.
- **ArcOS copy follow-up:** after writing, show the exact path plus a **Copy path** button and tell the user to fetch the file from the File Manager and double-click it on the target PC. An "Open in File Manager" shortcut was **not** implemented: `spawnApp("FileManager", …)` takes an app id plus an args object whose shape could not be verified against a live shell, and a wrong call throws inside a callback. `Copy path` always works. Add the spawn only after confirming the argument shape in a real ArcOS session.
- **Either path:** never write outside `UserPaths.Downloads` without an explicit path picker.
- **Helper updates:** compare `/health.version` against the `AGENT_VERSION` constant baked into `agent.ps1` and mirrored in `process.js`. On mismatch, show "Helper out of date" and point at the same download button — the app does not need to know how the old copy got there.
- The delivery actions are part of the **setup panel only** — they are not global app settings and must not appear in the main toolbar.

### 10.2 Manual entries — data model and rules

Manual entries live at `appPreferences["NikN_ArcSD"].entries` as a flat array. They are user-authored data: never pruned, never rewritten by a scan, never de-duplicated against discovered hosts by deletion.

```js
{
  id: "e_1729000000000_ab12",  // generated client-side, stable across renames
  host: "nas01",               // trimmed, lowercased for comparison only
  share: "media",              // optional; "" means "just the host"
  label: "Home NAS",           // optional; display name, free text
  createdAt: 1729000000000     // ms epoch, used only for stable sort order
}
```

**Normalization**

- `host`: trim whitespace, strip a leading `\\` or `//`, strip any trailing `\` or `/`. Accept IPs, hostnames, and `host:port`-free input only (no ports — SMB is 445).
- `share`: trim, strip leading and trailing `\` / `/`. An entry may legitimately have no share.
- `label`: trimmed, capped at 64 chars, free text. Never used for matching.
- Any `share` beginning with `$` is an administrative share — allowed in manual entries, but badged as such rather than hidden (the user typed it deliberately).

**Dedupe key**

`host.toLowerCase() + "\\" + share.toLowerCase()`. Adding an entry whose key already exists updates the existing row's `label` instead of appending a duplicate, and reports "Updated existing entry" rather than "Added".

**Rendering an entry**

- Display label if present, else `host`, with the UNC path in monospace beneath: `<code>\\host</code>` or `<code>\\host\share</code>`.
- Actions per row: **Browse**, **Copy**, **Edit**, **Delete**. Browse is the discovery entry point for saved data (§10) and must not depend on the host appearing in a scan result.
- Escape `host`, `share`, and `label` with `util.htmlspecialchars` before insertion — they are user text, not trusted markup.
- Never build the UNC string by string-concatenating raw input; build it from normalized fields.

**Limits and failure modes**

- Cap at **500 entries**. On overflow, refuse the add and say so; do not silently drop the oldest.
- Preference writes happen immediately after an add/edit/delete (`userPreferences.update` + `return v`), not batched.
- A corrupt or missing `entries` value must degrade to `[]` with a log line — never throw during `render()`.
- Entries are **not** validated for reachability. A typo is the user's to fix; the app does not probe, because it cannot (§2.1).

---

## 11. Dev workflow

```powershell
npx v7cli update        # refresh arcos.d.ts against the current ArcOS build
npx v7cli dev           # start the dev server on :3128
# in ArcOS → ArcTerm:
devenv connect
npx v7cli build         # produces NikN_ArcSD.arc

cd tests
npm install             # jsdom, once
npm test                # 127 offline UI assertions, no ArcOS needed
powershell -NoProfile -ExecutionPolicy Bypass -File agent-origins.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File mdns-harness.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File share-harness.ps1
# point the harness at a real host with real credentials (it prompts for the password):
powershell -NoProfile -ExecutionPolicy Bypass -File share-harness.ps1 -Ip 10.20.30.40 -Username alice
```

`tests/` loads the real `src/process.js` into jsdom with a fake shell and a fake helper — use it before every rebuild to catch logic regressions that a syntax check cannot. `tests/agent-origins.ps1` extracts `Test-OriginAllowed` straight out of `agent.ps1` and checks the CORS gate without starting the helper. `tests/share-harness.ps1` loads the network and share blocks, checks the pure helpers (`Get-UserCandidates`, `Get-NetUseReason`, `Get-NetErrorCode`, `Quote-NetArgument`, `ConvertFrom-NetViewOutput`), enumerates `127.0.0.1` over DCOM, and — with `-Ip` and `-Username` — reports exactly which step refuses real credentials, printing the `net use` exit code, the Win32 code and the reason. `-SkipLive` keeps it offline. None of them can verify PNA in a real browser, clipboard permissions, real file delivery, or live discovery; that still needs ArcOS (§14).

Install the built `.arc` via the File Manager to verify outside dev mode.

`project.arc.json` → `logLevel`: set to `process` to echo this app's logs in the terminal, `all` for everything.

---

## 12. Coding conventions

- **Tabs** for indentation in `src/` files, matching the existing scaffold.
- No bundler, no transpiler, no npm imports in `src/` — `JsExec` loads the files raw. Use only the documented TPA globals.
- Keep DOM work in `process.js`; keep static structure in `body.html`; no `<body>`, `<html>`, or `<head>` tags in `body.html`.
- Don't inline `<script>` in `body.html`; it will not run.
- Escape every server- or network-supplied string with `util.htmlspecialchars` before inserting into HTML.
- Never trust `Win32_Share.Description` — it is free text from a remote machine.

---

## 13. Known traps

| Trap | Consequence |
|---|---|
| Old constructor signature | class never constructs correctly |
| `return { proc }` | app fails to launch; must be `return proc` |
| `Debug()` for logging | opens a message box per call |
| Un-guarded callback body | crashes ArcOS, not just the app |
| `console.log` | not shown in ArcOS logs; against house style |
| Missing `Access-Control-Allow-Private-Network` | Chrome blocks everything; looks like "agent offline" |
| Hard-coded single `Origin` | a new ArcOS deployment (`beta.arcweb.nl`) is rejected on every poll; the app looks dead while the helper logs `Rejected request from origin` — accept `*.arcweb.nl` and inject the live origin into the `.cmd` |
| `HttpListener` on Windows | needs admin URL ACL; use `TcpListener` |
| `String.fromCharCode(...bigArray)` | stack overflow; chunk when base64-encoding the script |
| Inline `-EncodedCommand` for a big script | `cmd.exe` cuts the line at 8191 chars; the payload must be written to `%TEMP%` and decoded there |
| `-EncodedCommand` with UTF-8 base64 | it decodes as UTF-16LE; we avoid `-EncodedCommand` entirely and decode UTF-8 ourselves |
| Setting `display` on an element you also toggle with the `hidden` attribute | the author rule beats the UA `[hidden]` rule; `style.css` re-asserts `[hidden] { display: none }` |
| Forgetting `return v` in `userPreferences.update` | wipes the user's settings |
| `fs.readFile` returns `ArrayBuffer` | use `convert.arrayToText`, not string methods |
| Passing `ArrayBuffer` to `fs.writeFile` | it wants a `Blob`; use `convert.textToBlob` |
| Passing a `Blob` to `util.DownloadFile` | it wants an `ArrayBuffer`; use `convert.textToArrayBuffer` |
| Assuming `fs.exists()` exists | it does not; `stat()` does (and resolves `undefined` when missing), but the design overwrites on purpose |
| Defaulting the storage selector when no preference is stored | writes/downloads to a destination the user never chose |
| Re-adding a destination chooser to helper delivery | the download is the normal path; a chooser asks a question whose answer is almost always "this PC" — keep the ArcOS copy as a secondary link |
| `@local:icon.png` with no icon.png | missing/broken icon |
| Expecting anonymous enumeration to work | looks like a bug; it is the platform default |
| `Get-CimInstance Win32_Share -ComputerName <ip>` | it uses WS-Management; WinRM is disabled on a stock Windows box, so **every** enumeration fails. Use a DCOM `CimSession` |
| Parsing `net view` as if it printed `\\host\share` | the share rows are an aligned table with no UNC prefix; the old check matched nothing and returned "successfully, zero shares". Parse by the type column |
| NetBIOS parser that always skips a question section | DSM/Samba send `QDCOUNT=0`; every reply is dropped and passive discovery looks broken |
| mDNS query sent without the QU bit | responders multicast their answer to 5353, which Windows already owns, so an ephemeral socket hears nothing and mDNS looks broken. Use QCLASS `0x8001` |
| Following a DNS compression pointer without a jump cap | a self-referential pointer in a hand-built packet is an infinite loop inside the helper; cap it (`Read-DnsName`, 8 jumps) |
| Trusting a mDNS record with `TTL = 0` | that is a goodbye packet; the host is announced as leaving and would vanish |
| Taking the mDNS instance name as the hostname | it is free text; prefer the SRV target (`nas01.local` → `nas01`) |
| A discovery merge that overwrites names | WS-Discovery answers without a hostname and would erase what NetBIOS or mDNS learned; `Merge-DiscoveredHost` keeps the first name and unions `sources` |
| `net use` allowed to read the console | with an empty or expired password it prompts, and the single-threaded helper then hangs until someone types — the app reports a timeout instead of a refusal. Close stdin and time `net.exe` out |
| Reading `net.exe`'s exit code as the Win32 error | it exits `2` for every failure; the real number is only in "System error 1326 has occurred." Parse the text, or every refusal is a generic failure |
| Concatenating the domain field onto a qualified username | `CONTOSO\CONTOSO\alice`; a `DOMAIN\user` or `user@domain` in the username field must win |
| Re-rendering an empty credential form after a refusal | the second "needs credentials" pane looks exactly like the first, so a real rejection reads as a dead button |
| Asking for the same password on every host click | credentials are remembered per host in memory (`_creds`); do not persist them to preferences — that is a plain-text password on disk |
| A saved host that can only be copied | the list is the user's own data and may point at hosts a scan cannot reach; **Browse** it, and give it a host row when it was not discovered |
| Rejecting a hostname at `/hosts/:ip/shares` | saved entries may be names (`nas01`, `nas01.local`); resolve with `Resolve-IPv4` before the 135/445 probes instead of answering "not a valid IPv4" to a valid host |
| A rescan that force-selects the first discovered host | it yanks the user away from the saved host they deliberately opened; keep a saved selection through a scan |
| Trying DCOM against a NAS | 135 is closed, so the connect burns ~6 s before the 445 pass starts; probe 135 first |
| Sending NBSTAT only to `255.255.255.255` | some APs drop it; also send the directed broadcast |
| Scraping an IP out of WS-Discovery `XAddrs` | those URLs usually contain hostnames; use the sender address |
| Testing the agent with `curl -d '{"mode":"sweep"}'` from PowerShell 5.1 | PS strips the double quotes from native arguments, so the helper receives invalid JSON and silently falls back to a passive scan — use `--data-binary @file` |

---

## 14. Verification checklist

0. `cd tests && npm test` — 165 offline assertions pass against the real `src/process.js` in jsdom. `powershell -File tests\agent-origins.ps1` checks the helper's Origin allowlist (20 checks); `powershell -File tests\mdns-harness.ps1` feeds hand-built DNS packets to the mDNS parser (39 checks); `powershell -File tests\share-harness.ps1` checks share enumeration (58 checks offline, 62 with the live `127.0.0.1` DCOM call; add `-Ip <host> -Username <user>` to diagnose a real host); `powershell -File tests\share-fs-harness.ps1` checks the helper's file access (59 checks). Together they cover most of the *logic* in steps 3–7, 10, 11, 14 and 15; they cannot cover CORS/PNA in a real browser, clipboard permissions, real file delivery or live discovery; that still needs ArcOS (§14).
1. `npx v7cli update` completes and `arcos.d.ts` changes.
2. `npx v7cli dev` + `devenv connect` — app opens with no console errors and no message boxes.
3. **With no helper running**, the window still renders a usable manual list plus the Scan action — no waiting, no spinner, no exception.
4. **Manual mode:** adding `\\SERVER\Shared` produces one row, survives an app restart, and Copy puts exactly that UNC string on the clipboard.
5. **Manual mode:** adding the same host/share twice with a different label updates the existing row instead of creating a duplicate; the 500-entry cap refuses the 501st with a visible message.
6. **Manual mode:** deleting a row persists across restart; a hostile label (`<img src=x onerror=…>`) renders as text, not markup.
7. Unconnected state shows the setup panel with a working **Download helper** button, not an exception.
8. **Download:** one press produces exactly one download; double-clicking it starts the agent with **no UAC prompt and no firewall prompt**.
9. **ArcOS copy:** the secondary link writes `U:/Home/Downloads/arcos-share-agent.cmd`, reveals **Copy path**, and the file survives closing the app and can be fetched later via the File Manager.
10. Helper delivery asks no destination question and stores no delivery preference: the download button is enabled as soon as the payload loads.
11. App flips to "connected" within a few seconds without interaction, and the manual list is **still present** alongside the discovered view.
12. Passive scan finds at least one real LAN device; a second scan is idempotent. A NAS or a Mac should come back with `mdns` in its source badges and a hostname from its SRV record; hosts learned by two techniques must show both badges and keep one name.
13. Sweep finds a host that passive discovery missed, its status line counts elapsed seconds, and Cancel stops the app waiting (the helper finishes its own loop in the background and must not be reported as "stopped").
14. Share enumeration works with credentials on a Windows box **and** on a NAS (a Synology here: DCOM refused, `net view` over 445 returns `homes`/`main` in ~1 s). A hardened box reports `denied` rather than throwing, a wrong password reports `bad_credentials` with the Windows text, and neither leaves the helper stuck. Signing in twice must not look like nothing happened: the second pane names the account and keeps it filled in.
15. **Credentials stick:** sign in to two hosts, click back and forth between them; the second visit lists shares without asking again, and a refusal of a remembered pair says "The saved sign-in was refused". **Forget** returns the form, and after restarting the app the password is asked for again — nothing was written to preferences.
16. **Saved hosts are browsable:** with the helper connected, **Browse** on a saved host that no scan returned opens it in the discovered view with a **Saved host** row, lists its shares (the saved share is badged), and a rescan does not steal the selection. With the helper stopped, Browse opens the setup panel naming the host.
17. Bumping `AGENT_VERSION` triggers the "helper out of date" prompt and points back at the download button.
18. `npx v7cli build` produces `NikN_ArcSD.arc`; installed copy repeats steps 3–17.

---

## 15. Decision log

Settled during planning. Do not re-litigate without new information.

| Decision | Rationale |
|---|---|
| **SMB/LAN only — no ArcOS share listing** | User explicitly chose this after being offered the hybrid. |
| **Dual mode: manual is permanent, discovery is an upgrade** | User chose this over helper-only. A browser-only build cannot scan (§2.1), but making the helper a prerequisite would leave the app dead until one `.cmd` is run. Manual mode keeps it useful on open. |
| **Manual entries are never pruned or merged into discovered data** | They are user-authored and may point at subnets the helper cannot reach. A scan must never delete something the user typed. |
| **One generated `.cmd` per user, not an installer** | Only way to satisfy "nothing to download" as far as physics allows. |
| **Helper delivery: one download button, ArcOS copy as a secondary link** | On the machine that will run the helper the download is the answer; a chooser asks a question whose answer is almost always "this PC". The ArcOS copy stays available for browsers that cannot run the file, demoted to a text link so it does not compete. |
| **PowerShell, not a Node agent** | Node is not guaranteed present; PS 5.1 is. Removes npm and a runtime. |
| **Raw `TcpListener`, not `HttpListener`** | Avoids admin URL ACL. |
| **`Get-CimInstance Win32_Share` first, `net view` fallback** | Structured output; fallback survives RPC-restricted networks. |
| **`node-smb2` dropped** | It has no SRVSVC/DCE-RPC, so it cannot enumerate shares; PS covers everything with fewer dependencies. |
| **Passive discovery by default, sweep opt-in** | Avoids unsolicited 254-connection bursts and IDS alerts. |
| **Rejected: pure-JS SRVSVC** | ~500 lines of NDR encoding; highest-risk, lowest-payoff component. |
| **Rejected: ArcOS-filesystem bridge (script writes JSON)** | Stale results by design; localhost HTTP gives live state. |
| **Rejected: wordlist tree-connect enumeration** | Guessy, noisy, misses real shares. |

---

## 16. References

- Docs index: <https://docs.arcweb.nl/llms.txt>
- The basics / process shape: <https://docs.arcweb.nl/developers/your-apps-code/the-basics.md>
- Third-party app process: <https://docs.arcweb.nl/developers/your-apps-code/third-party-app-process.md>
- Project configuration: <https://docs.arcweb.nl/developers/your-apps-code/project-configuration.md>
- Style your app (CSS vars): <https://docs.arcweb.nl/developers/your-apps-code/style-your-app.md>
- Error handling: <https://docs.arcweb.nl/developers/your-apps-code/error-handling.md>
- Verbose logging: <https://docs.arcweb.nl/developers/your-apps-code/verbose-logging.md>
- Built-in utilities: <https://docs.arcweb.nl/developers/arcos-apis/built-in-utilities.md>
- Preferences: <https://docs.arcweb.nl/developers/arcos-apis/read-and-write-preferences.md>
- Window states: <https://docs.arcweb.nl/developers/windows/window-states.md>
- ArcOS source: <https://github.com/ArcOS-Project/v7>
- TPA templates: <https://github.com/ArcOS-Project/v7cli-templates>
- v7cli: <https://github.com/ArcOS-Project/arcv7-dev-cli>

Note: the GitHub wiki for `ArcOS-Project/v7` does not exist (the `/wiki` path redirects to the repository root). The documentation site above is the authoritative source.
