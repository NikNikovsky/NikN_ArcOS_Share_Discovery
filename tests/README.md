# Offline UI harness

`src/process.js` normally only runs inside ArcOS, which makes every UI change a manual
test. `ui.test.js` and `edge.test.js` load the **real** process class into
[jsdom](https://github.com/jsdom/jsdom), with a fake ArcOS shell (`ThirdPartyAppProcess`,
`userPreferences`, `fs`, `convert`, `util`) and a fake helper that answers the documented
HTTP API. No ArcOS, no network, no helper process required.

```powershell
cd tests
npm install
npm test          # ui.test.js then edge.test.js
powershell -NoProfile -ExecutionPolicy Bypass -File agent-origins.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File mdns-harness.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File share-harness.ps1
```

`agent-origins.ps1` is the odd one out: it does not touch jsdom, it lifts the
`Test-OriginAllowed` block out of `src/agent/agent.ps1` and checks which `Origin` headers
the helper accepts — including that a lookalike such as `https://evil-arcweb.nl` is refused.
`mdns-harness.ps1` lifts the discovery block and builds DNS packets byte by byte — a PTR/SRV/A
answer, an answer with the question echoed, compression pointers, a TTL-0 goodbye, a
self-referential pointer and a truncated packet — so the mDNS parser is tested against fixtures
instead of whatever happens to be on the LAN. `share-harness.ps1` lifts the network and
share-enumeration blocks instead: it checks the pure
helpers (`ConvertFrom-NetViewOutput`, `Get-UserCandidates`, `Get-NetUseReason`, `Get-NetErrorCode`,
`Quote-NetArgument`), then enumerates `127.0.0.1` over DCOM. The live half needs SMB and at least
one share on this machine; pass `-SkipLive` to keep it offline.

Point it at any host with `-Ip` and `-Username` to see why a real sign-in is refused — it prints the
`net use` exit code, the Win32 code, the helper's `reason` and `detail`, and any shares it got. The
password is read with `Read-Host -AsSecureString`, so it never enters the command line or history:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File share-harness.ps1 -Ip 192.168.1.50 -Username alice
```

Nothing here ships inside the `.arc`: `project.arc.json` packs `src` only, and this
directory has its own `package.json` so the repository root still has none.

## What is covered

| Script | Covers |
|---|---|
| `ui.test.js` | first paint in manual mode, pasted `\\HOST\Share`, normalisation, dedupe-by-label-update, hostile-label escaping, Copy, two-click Delete, the 500-entry cap, Browse (setup when offline, a saved host opened and enumerated when connected, a saved share badged, a rescan keeping it selected), helper download (one click, correct `.cmd`, ArcOS file left untouched) plus the secondary ArcOS-copy link, generated `.cmd` contents and origin, connect → tabs + auto passive scan, host rendering, share filter, admin-share toggle, denied state, a refused sign-in (account named, reason turned into advice, Windows detail shown, username kept and password cleared), remembered sign-ins across host switches (and nothing in preferences), Forget, host-switch race, disconnect |
| `edge.test.js` | corrupt/invalid stored preferences, per-entry repair, restart persistence, agent URL normalisation, helper version mismatch, credential relay (and that the password never reaches preferences or the DOM), sweep progress text, cancel + grace window, no false "helper stopped" while the helper is still busy |
| `agent-origins.ps1` | the helper's CORS gate: `*.arcweb.nl`, loopback dev ports, the origin injected by the generated `.cmd`, and rejection of lookalike hosts |
| `mdns-harness.ps1` | the mDNS parser: `_smb._tcp.local` PTR/SRV/A answers, `QDCOUNT=0`, an echoed question, compressed owner names and SRV targets, non-SMB services ignored, TTL-0 goodbye ignored, truncation and a self-referential pointer handled safely, `\DDD` name unescaping, the QU bit in the query, and the discovery merge keeping names and unioning sources |
| `share-harness.ps1` | `net view` parsing against captured Windows output (types, comments, UNC-prefixed names, spaced names, empty listings), hostname-to-IPv4 resolution (`Resolve-IPv4`, including a UNC path and a name that cannot resolve), credential-name resolution, Win32 code mapping and `net.exe` message cleanup, quoting for `ProcessStartInfo`, a live DCOM `Win32_Share` enumeration of `127.0.0.1`, and an optional credentialed run against any host |

## When a check fails

The failure line names the behaviour, not the line number. Grep `process.js` for the
message text or the `data-role`/`data-action` in the check to find the code path. If you
change the UI contract (a `data-role`, a status string, an empty-state sentence), update
the matching assertion — but think first about whether the *behaviour* changed, because
several of these encode decisions from `AGENTS.md` §10 and §14.

These tests do not replace running the app: `/health` polling against a real helper, CORS
and Private Network Access, clipboard permissions and real file delivery can only be
verified inside ArcOS. See `AGENTS.md` §14.
