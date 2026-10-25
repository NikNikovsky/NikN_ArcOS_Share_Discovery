const html = await loadHtml("body.html");

const APP_ID = "NikN_ArcSD";
const AGENT_VERSION = "1.0.0";
const AGENT_FILE = "agent.ps1";
const AGENT_CMD_NAME = "arcos-share-agent.cmd";
const DEFAULT_AGENT_URL = "http://127.0.0.1:8790";
const MAX_ENTRIES = 500;
const HEALTH_FAST_MS = 1000;
const HEALTH_SLOW_MS = 5000;
const HEALTH_GIVE_UP_MS = 60000;
const HEALTH_HEARTBEAT_MS = 1000;
// A cancelled sweep keeps running inside the helper (a single-threaded loop it
// cannot interrupt), so health checks must not read "no answer" as "gone" for
// up to the helper's own two-minute sweep ceiling.
const SWEEP_GRACE_MS = 150000;

const ICON_EMBLEM_SHARED = "<?xml version=\"1.0\" encoding=\"UTF-8\"?> <svg xmlns=\"http://www.w3.org/2000/svg\" width=\"64\" height=\"64\" viewBox=\"0 0 64 64\"><defs><linearGradient id=\"l1\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\"><stop offset=\"0\" stop-color=\"#fff0a0\"/><stop offset=\"0.5\" stop-color=\"#e8b830\"/><stop offset=\"1\" stop-color=\"#8a5a04\"/></linearGradient><linearGradient id=\"l2\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\"><stop offset=\"0\" stop-color=\"#fff0a0\"/><stop offset=\"0.5\" stop-color=\"#e8b830\"/><stop offset=\"1\" stop-color=\"#8a5a04\"/></linearGradient><linearGradient id=\"l3\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#e4e8f8\"/><stop offset=\"0.45\" stop-color=\"#8a98d0\"/><stop offset=\"1\" stop-color=\"#3a4680\"/></linearGradient></defs><path d=\"M30,34C30,42 22,42 24,48C26,54 38,50 40,56C41,59 38,61 36,62\" fill=\"none\" stroke=\"#141414\" stroke-width=\"6\" stroke-linecap=\"round\"/><path d=\"M30,34C30,42 22,42 24,48C26,54 38,50 40,56C41,59 38,61 36,62\" fill=\"none\" stroke=\"#f0a020\" stroke-width=\"3.6\" stroke-linecap=\"round\"/><path d=\"M30,34C30,42 22,42 24,48C26,54 38,50 40,56C41,59 38,61 36,62\" fill=\"none\" stroke=\"#ffe0a0\" stroke-width=\"1\" stroke-linecap=\"round\" transform=\"translate(-.6,-.6)\"/><path d=\"M24.2,3H26.2A1.2,1.2 0 0 1 27.4,4.2V16.8A1.2,1.2 0 0 1 26.2,18H24.2A1.2,1.2 0 0 1 23,16.8V4.2A1.2,1.2 0 0 1 24.2,3Z\" fill=\"url(#l1)\" stroke=\"#141414\" stroke-width=\"1.1\" stroke-linejoin=\"round\"/><path d=\"M34.2,3H36.199999999999996A1.2,1.2 0 0 1 37.4,4.2V16.8A1.2,1.2 0 0 1 36.199999999999996,18H34.2A1.2,1.2 0 0 1 33,16.8V4.2A1.2,1.2 0 0 1 34.2,3Z\" fill=\"url(#l2)\" stroke=\"#141414\" stroke-width=\"1.1\" stroke-linejoin=\"round\"/><g><path d=\"M14,16H46V24Q46,34 36,36H24Q14,34 14,24Z\" fill=\"#000\" fill-opacity=\"0.160\" transform=\"translate(0.73,0.60)\"/><path d=\"M14,16H46V24Q46,34 36,36H24Q14,34 14,24Z\" fill=\"#000\" fill-opacity=\"0.160\" transform=\"translate(1.47,1.20)\"/><path d=\"M14,16H46V24Q46,34 36,36H24Q14,34 14,24Z\" fill=\"#000\" fill-opacity=\"0.160\" transform=\"translate(2.20,1.80)\"/></g><path d=\"M14,16H46V24Q46,34 36,36H24Q14,34 14,24Z\" fill=\"url(#l3)\" stroke=\"#141414\" stroke-width=\"1.4\" stroke-linejoin=\"round\"/><path d=\"M17,19H43\" stroke=\"#fff\" stroke-opacity=\".7\" stroke-width=\"1.6\" stroke-linecap=\"round\"/></svg>";
const ICON_EMBLEM_MOUNTED = "<?xml version=\"1.0\" encoding=\"UTF-8\"?> <svg xmlns=\"http://www.w3.org/2000/svg\" width=\"64\" height=\"64\" viewBox=\"0 0 64 64\"><defs><linearGradient id=\"l1\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#b0ff90\"/><stop offset=\"0.5\" stop-color=\"#2fbf2a\"/><stop offset=\"1\" stop-color=\"#0e5a10\"/></linearGradient></defs><g><path d=\"M6,58L58,6V58Z\" fill=\"#000\" fill-opacity=\"0.160\" transform=\"translate(0.67,0.60)\"/><path d=\"M6,58L58,6V58Z\" fill=\"#000\" fill-opacity=\"0.160\" transform=\"translate(1.33,1.20)\"/><path d=\"M6,58L58,6V58Z\" fill=\"#000\" fill-opacity=\"0.160\" transform=\"translate(2.00,1.80)\"/></g><path d=\"M6,58L58,6V58Z\" fill=\"url(#l1)\" stroke=\"#141414\" stroke-width=\"3\" stroke-linejoin=\"round\"/><path d=\"M20,50L50,20\" stroke=\"#fff\" stroke-opacity=\".7\" stroke-width=\"4\" stroke-linecap=\"round\"/><path d=\"M33,51L51,33\" stroke=\"#fff\" stroke-opacity=\".35\" stroke-width=\"3\" stroke-linecap=\"round\"/></svg>";
const ICON_EMBLEM_UNMOUNTED = "<?xml version=\"1.0\" encoding=\"UTF-8\"?> <svg xmlns=\"http://www.w3.org/2000/svg\" width=\"64\" height=\"64\" viewBox=\"0 0 64 64\"><defs><linearGradient id=\"l1\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#f4f5f6\"/><stop offset=\"0.5\" stop-color=\"#9aa0a8\"/><stop offset=\"1\" stop-color=\"#3c4148\"/></linearGradient></defs><g><path d=\"M6,58L58,6V58Z\" fill=\"#000\" fill-opacity=\"0.160\" transform=\"translate(0.67,0.60)\"/><path d=\"M6,58L58,6V58Z\" fill=\"#000\" fill-opacity=\"0.160\" transform=\"translate(1.33,1.20)\"/><path d=\"M6,58L58,6V58Z\" fill=\"#000\" fill-opacity=\"0.160\" transform=\"translate(2.00,1.80)\"/></g><path d=\"M6,58L58,6V58Z\" fill=\"url(#l1)\" stroke=\"#141414\" stroke-width=\"3\" stroke-linejoin=\"round\"/><path d=\"M20,50L50,20\" stroke=\"#fff\" stroke-opacity=\".7\" stroke-width=\"4\" stroke-linecap=\"round\"/><path d=\"M33,51L51,33\" stroke=\"#fff\" stroke-opacity=\".35\" stroke-width=\"3\" stroke-linecap=\"round\"/></svg>";



function esc(value) {
	return util.htmlspecialchars(String(value == null ? "" : value));
}

/*
 * htmlspecialchars does not escape quotes, which is fine for text nodes but
 * not for attribute values. Share names and hostnames come from remote
 * machines, so escape quotes too before putting them inside an attribute.
 */
function escAttr(value) {
	return esc(value).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function normalizeHost(raw) {
	let s = String(raw == null ? "" : raw).trim();
	s = s.replace(/^[\\/]+/, "");
	s = s.replace(/[\\/]+$/, "");
	return s;
}

function normalizeShare(raw) {
	let s = String(raw == null ? "" : raw).trim();
	s = s.replace(/^[\\/]+/, "");
	s = s.replace(/[\\/]+$/, "");
	return s;
}

function makeUnc(host, share) {
	return share ? "\\\\" + host + "\\" + share : "\\\\" + host;
}

function entryKey(host, share) {
	return host.toLowerCase() + "\\" + share.toLowerCase();
}

function isAdminShare(share) {
	// Administrative shares always end in "$": C$, ADMIN$, IPC$, print$.
	return !!share && share.charAt(share.length - 1) === "$";
}

function makeId() {
	return "e_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
}

function utf8Bytes(text) {
	if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(text);
	const out = [];
	for (let i = 0; i < text.length; i++) {
		const c = text.charCodeAt(i);
		if (c < 0x80) out.push(c);
		else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
		else out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
	}
	return new Uint8Array(out);
}

function bytesToBase64(bytes) {
	let binary = "";
	const chunk = 0x8000;
	for (let i = 0; i < bytes.length; i += chunk) {
		const slice = bytes.subarray(i, Math.min(i + chunk, bytes.length));
		binary += String.fromCharCode.apply(null, slice);
	}
	return btoa(binary);
}

/*
 * cmd.exe truncates a single command line at 8191 characters, so a whole
 * scanner script cannot be passed through -EncodedCommand. Instead the .cmd
 * writes its own base64 payload to %TEMP% and executes it from there. The
 * user still only ever downloads one file.
 */
/*
 * The origin this app is served from, pasted into the generated .cmd so the
 * helper accepts that deployment. Restricted to scheme://host[:port] because
 * the value ends up on a cmd.exe line.
 */
function sanitizeOrigin(value) {
	const origin = String(value == null ? "" : value).trim().replace(/\/+$/, "");
	if (!/^https?:\/\/(\[[0-9a-fA-F:]+\]|[A-Za-z0-9.\-]+)(:\d{1,5})?$/.test(origin)) return "";
	return origin;
}

function currentOrigin() {
	try {
		if (typeof location === "undefined" || !location || !location.origin) return "";
		return sanitizeOrigin(location.origin);
	} catch (e) {
		return "";
	}
}

function buildAgentCmd(source, origin) {
	const b64 = bytesToBase64(utf8Bytes(source));
	const chunkSize = 900;
	const out = [
		"@echo off",
		"setlocal",
		"title ArcOS Share Discovery helper",
		'set "SD_PAYLOAD=%TEMP%\\arcos-share-agent.b64"',
	];
	// Tell the helper which origin the app is served from, so a self-hosted or
	// renamed ArcOS deployment is accepted without rebuilding anything.
	const allowedOrigin = sanitizeOrigin(origin);
	if (allowedOrigin) out.push('set "ARCSD_ORIGIN=' + allowedOrigin + '"');
	for (let i = 0; i < b64.length; i += chunkSize) {
		const prefix = i === 0 ? "> " : ">> ";
		out.push(prefix + '"%SD_PAYLOAD%" echo.' + b64.slice(i, i + chunkSize));
	}
	out.push(
		'powershell -NoProfile -ExecutionPolicy Bypass -Command "$s=[IO.File]::ReadAllText(\'%SD_PAYLOAD%\'); Remove-Item -LiteralPath \'%SD_PAYLOAD%\' -Force -ErrorAction SilentlyContinue; iex ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($s)))"'
	);
	out.push("echo.");
	out.push("echo Helper stopped. Press any key to close this window.");
	out.push("pause >nul");
	out.push("");
	return out.join("\r\n");
}

/* --------------------------------------------------------------- SMB drive */

const SHARE_DRIVE_PREFIX = "arcsd-share-";
// The File Manager reads a folder, then stats/reads items inside it. A short
// cache keeps that from becoming three HTTP round trips for one click, while
// still showing a file the user just copied there on the next visit.
const SHARE_LIST_TTL_MS = 3000;
const SHARE_CALL_TIMEOUT_MS = 60000;
const SHARE_MOUNT_PROBE_TIMEOUT_MS = 15000;

/*
 * `FilesystemDrive` only exists inside ArcOS. The offline jsdom harness loads
 * this file without it, so fall back to the smallest object that satisfies the
 * subclass - the drive is never mounted there.
 */
const ShareDriveBase =
	typeof FilesystemDrive === "function"
		? FilesystemDrive
		: class {
				constructor(uuid, letter) {
					this.uuid = uuid;
					this.driveLetter = letter;
					this.label = "";
					this.BUSY = false;
				}
				Log() {}
				isCapable(capability) {
					if (!this.CAPABILITIES || !this.CAPABILITIES[capability]) throw new Error("Drive cannot " + capability);
				}
				tryIsCapable(capability) {
					return !!(this.CAPABILITIES && this.CAPABILITIES[capability]);
				}
				async __spinUp() {
					return this._spinUp();
				}
				async __spinDown() {
					return this._spinDown();
				}
				async lockFile() {}
				async releaseLock() {}
			};

const MIME_BY_EXT = {
	txt: "text/plain",
	log: "text/plain",
	md: "text/markdown",
	csv: "text/csv",
	json: "application/json",
	xml: "application/xml",
	html: "text/html",
	htm: "text/html",
	css: "text/css",
	js: "text/javascript",
	pdf: "application/pdf",
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	gif: "image/gif",
	webp: "image/webp",
	bmp: "image/bmp",
	svg: "image/svg+xml",
	ico: "image/x-icon",
	mp3: "audio/mpeg",
	wav: "audio/wav",
	flac: "audio/flac",
	m4a: "audio/mp4",
	ogg: "audio/ogg",
	mp4: "video/mp4",
	mkv: "video/x-matroska",
	webm: "video/webm",
	mov: "video/quicktime",
	avi: "video/x-msvideo",
	zip: "application/zip",
	"7z": "application/x-7z-compressed",
	rar: "application/vnd.rar",
	tar: "application/x-tar",
	gz: "application/gzip",
	iso: "application/x-iso9660-image",
	doc: "application/msword",
	docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	xls: "application/vnd.ms-excel",
	xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	ppt: "application/vnd.ms-powerpoint",
	pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

function mimeFor(name) {
	const dot = String(name || "").lastIndexOf(".");
	if (dot < 0) return "application/octet-stream";
	const ext = String(name).slice(dot + 1).toLowerCase();
	return MIME_BY_EXT[ext] || "application/octet-stream";
}

// Drive ids are visible to ArcOS, so keep them to characters that cannot be
// confused for a path separator. Two shares that sanitise to the same string
// would collide, so the host is kept apart from the share with a separator the
// replacement never produces.
function shareDriveId(host, share) {
	const clean = (value) => String(value == null ? "" : value).toLowerCase().replace(/[^a-z0-9._$-]+/g, "_");
	return SHARE_DRIVE_PREFIX + clean(host) + "__" + clean(share);
}

// Drive paths arrive as "/sub/dir", "sub/dir" or "\sub\dir" depending on the
// caller; the helper only ever sees a backslash-separated path below the share.
function driveRelativePath(path) {
	return String(path == null ? "" : path)
		.replace(/\\/g, "/")
		.replace(/^\/+/, "")
		.replace(/\/+$/, "");
}

function base64ToArrayBuffer(text) {
	const binary = atob(String(text || ""));
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes.buffer;
}

/*
 * A share mounted as a real ArcOS drive. ArcOS has no SMB driver, so every
 * filesystem call is forwarded to the helper over loopback: this class only
 * translates shapes and keeps a very short listing cache.
 *
 * It is read-only on purpose. `CAPABILITIES` has to match what the class
 * actually implements - `fs.readDir` / `readFile` / `stat` call `isCapable`
 * first and throw when a promised capability is missing.
 */
class ShareDrive extends ShareDriveBase {
	constructor(uuid, letter, options) {
		super(uuid, letter);

		const opts = options || {};
		this.host = String(opts.host || "");
		this.share = String(opts.share || "");
		// A function, so a mounted drive follows the app if the helper address is
		// changed later; a string is accepted too, for direct use in tests.
		this._agentUrlSource = opts.agentUrl == null ? DEFAULT_AGENT_URL : opts.agentUrl;
		this._auth = typeof opts.auth === "function" ? opts.auth : () => null;
		// mountDrive() returns false when __spinUp fails, so the instance is the
		// only place the reason can survive long enough for the app to show it.
		this.state = opts.state || {};
		this._listings = new Map();
		this._directUrls = new Map();

		this.label = makeUnc(this.host, this.share);
		this.IDENTIFIES_AS = "generic";
		this.FILESYSTEM_SHORT = "SMB";
		this.FILESYSTEM_LONG = "SMB share " + makeUnc(this.host, this.share);
		this.READONLY = true;
		this.REMOVABLE = true;
		this.FIXED = false;
		this.CAPABILITIES = {
			readDir: true,
			readFile: true,
			stat: true,
			quota: true,
			makeDir: false,
			writeFile: false,
			copyItem: false,
			moveItem: false,
			deleteItem: false,
			tree: false,
			direct: true,
			bulk: false,
		};
	}

	get unc() {
		return makeUnc(this.host, this.share);
	}

	get agentUrl() {
		const value = typeof this._agentUrlSource === "function" ? this._agentUrlSource() : this._agentUrlSource;
		return String(value || DEFAULT_AGENT_URL).replace(/\/+$/, "");
	}

	async _spinUp() {
		// Fail the mount itself when the share cannot be opened, instead of
		// mounting an empty drive that makes the user wonder where their files went.
		const res = await this._call("/fs/stat", { path: "" }, SHARE_MOUNT_PROBE_TIMEOUT_MS);
		if (res.ok) return true;

		this._fail(res);
		return false;
	}

	async _spinDown() {
		this._listings.clear();
		for (const url of this._directUrls.values()) {
			try {
				URL.revokeObjectURL(url);
			} catch (e) {}
		}
		this._directUrls.clear();
		return true;
	}

	_fail(res) {
		const data = (res && res.data) || {};
		this.state.reason = String(data.error || data.reason || (res && res.status ? "http_" + res.status : "offline"));
		this.state.detail = String(data.detail || res.text || "");
		if (this.state.detail.length > 300) this.state.detail = this.state.detail.slice(0, 300) + "...";
		try {
			this.Log(makeUnc(this.host, this.share) + ": " + this.state.reason + " " + this.state.detail);
		} catch (e) {
			/* logging must never break a filesystem call */
		}
	}

	async _call(route, body, timeoutMs) {
		const auth = this._auth() || {};
		const payload = Object.assign(
			{
				unc: this.unc,
				username: String(auth.username || ""),
				password: String(auth.password || ""),
				domain: String(auth.domain || ""),
			},
			body || {}
		);

		const controller = new AbortController();
		const timer = setTimeout(() => {
			try {
				controller.abort();
			} catch (e) {}
		}, timeoutMs || SHARE_CALL_TIMEOUT_MS);

		try {
			const res = await fetch(this.agentUrl + route, {
				method: "POST",
				signal: controller.signal,
				cache: "no-store",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			const text = await res.text();
			let data = null;
			if (text) {
				try {
					data = JSON.parse(text);
				} catch (e) {
					data = null;
				}
			}
			return { ok: res.ok, status: res.status, data: data, text: text };
		} catch (e) {
			const offline = e && e.name === "AbortError" ? "The helper did not answer in time." : "The helper is not reachable.";
			return { ok: false, status: 0, data: { error: "offline", detail: offline }, text: offline };
		} finally {
			clearTimeout(timer);
		}
	}

	async readDir(path) {
		const rel = driveRelativePath(path);
		const cached = this._listings.get(rel);
		if (cached && Date.now() - cached.at < SHARE_LIST_TTL_MS) return cached.value;

		const res = await this._call("/fs/list", { path: rel });
		if (!res.ok) {
			this._fail(res);
			return undefined;
		}

		const entries = res.data && Array.isArray(res.data.entries) ? res.data.entries : [];
		const files = [];
		const dirs = [];

		for (const entry of entries) {
			const name = String((entry && entry.name) || "");
			if (!name) continue;

			const modified = Number(entry.modified) || 0;
			const created = Number(entry.created) || modified;
			const itemId = this.unc + "\\" + (rel ? rel + "\\" : "") + name;

			if (entry.isDir) {
				dirs.push({
					name: name,
					dateCreated: new Date(created),
					dateModified: new Date(modified),
					itemId: itemId,
				});
			} else {
				files.push({
					name: name,
					size: Number(entry.size) || 0,
					dateCreated: new Date(created),
					dateModified: new Date(modified),
					mimeType: mimeFor(name),
					itemId: itemId,
				});
			}
		}

		const value = {
			files: files,
			dirs: dirs,
			totalFiles: files.length,
			totalFolders: dirs.length,
			totalSize: files.reduce((sum, file) => sum + file.size, 0),
			shortcuts: {},
		};

		this._listings.set(rel, { at: Date.now(), value: value });
		return value;
	}

	async readFile(path) {
		const rel = driveRelativePath(path);
		if (!rel) return undefined;

		const res = await this._call("/fs/read", { path: rel });
		if (!res.ok) {
			this._fail(res);
			return undefined;
		}
		if (!res.data || typeof res.data.data !== "string") return undefined;

		return base64ToArrayBuffer(res.data.data);
	}

	// The media player (and the File Manager's "open") ask the filesystem for a
	// URL they can hand to <audio>/<video>/<img>. An SMB share has no native
	// URL, so read the file once, wrap the bytes in a Blob and hand out an
	// object URL. Capped by the helper's 16 MB read limit; revoked on unmount.
	async direct(path) {
		const rel = driveRelativePath(path);
		if (!rel) return undefined;

		const cached = this._directUrls.get(rel);
		if (cached) return cached;

		const bytes = await this.readFile(path);
		if (!bytes) return undefined;

		let name = rel;
		const slash = Math.max(name.lastIndexOf("/"), name.lastIndexOf("\\"));
		if (slash >= 0) name = name.slice(slash + 1);

		let blob;
		try {
			blob = new Blob([bytes], { type: mimeFor(name) });
		} catch (e) {
			return undefined;
		}
		let url;
		try {
			url = URL.createObjectURL(blob);
		} catch (e) {
			return undefined;
		}
		this._directUrls.set(rel, url);
		return url;
	}

	async stat(path) {
		const res = await this._call("/fs/stat", { path: driveRelativePath(path) });
		if (!res.ok) {
			// A missing file is an expected answer, not a failure worth logging.
			if (String((res.data && res.data.error) || "") !== "not_found") this._fail(res);
			return undefined;
		}

		const data = res.data || {};
		return {
			isFile: !!data.isFile,
			isDirectory: !!data.isDirectory,
			size: Number(data.size) || 0,
			created: Number(data.created) || 0,
			modified: Number(data.modified) || 0,
		};
	}

	// The File Manager asks this of every drive on mount and on every filesystem
	// event, outside any capability check, so it must exist even though an SMB
	// share cannot report a quota without another round trip. `max` must be
	// above zero or the caller divides by zero.
	async quota() {
		const res = await this._call("/fs/quota", { path: "" });
		if (!res.ok) return { used: 0, max: 1, free: 1, percentage: 0, unknown: true, detail: (res.data && res.data.detail) || res.text };
		const d = (res.data || {});
		const max = Number(d.max) || 0;
		if (max <= 0) return { used: 0, max: 1, free: 1, percentage: 0, unknown: true, detail: d.detail || "" };
		return {
			used: Number(d.used) || 0,
			max: max,
			free: Number(d.free) || 0,
			percentage: Number(d.percentage) || 0,
			unknown: !!d.unknown,
			detail: d.detail || "",
			freeText: d.freeText || "",
			totalText: d.totalText || "",
		};
	}
}

/* ------------------------------------------------------------------- proc */

class proc extends ThirdPartyAppProcess {
	constructor(pid, parentPid, app, operationId, workingDirectory, ...args) {
		super(pid, parentPid, app, operationId, workingDirectory);

		this._entries = [];
		this._agentUrl = DEFAULT_AGENT_URL;
		this._agentSource = null;
		this._agentPath = "";
		this._lastSavedPath = "";

		this._agentOnline = false;
		this._agentInfo = null;
		this._helperLogs = [];
		this._view = "manual";
		this._setupOpen = false;
		this._editingId = null;
		this._pendingDeleteId = null;
		this._deleteTimer = null;

		this._pollTimer = null;
		this._pollStartedAt = 0;
		this._healthBusy = false;
		this._heartbeatTimer = null;
		this._pendingRequests = 0;

		this._hosts = [];
		this._initialScanDone = false;
		this._selectedHost = "";
		this._shares = [];
		this._shareState = "idle";
		this._shareError = "";
		this._shareReason = "";
		this._shareDetail = "";
		this._shareCreds = null;
		// Sign-ins are remembered per host for the lifetime of this window, so
		// clicking away and back does not ask for the same password again. They
		// live in memory only: never written to preferences, never logged, gone
		// when the window closes.
		this._creds = Object.create(null);
		this._credsAuto = false;
		this._credsFile = util.join(workingDirectory, "creds.json");
		this._credsPersist = !this._isDevMode();
		this._showAdmin = false;
		this._shareFilter = "";
		this._scanning = false;
		this._scanController = null;
		this._scanTimer = null;
		this._helperBusyUntil = 0;

		// Mounts in flight, keyed by drive id, so the button that started one is
		// disabled instead of asking for a second mount of the same share.
		this._mounting = Object.create(null);
		this._quotaBusy = false;

		this._el = {};
	}

	/* ------------------------------------------------------------- lifecycle */

	async render() {
		if (this._disposed) return;

		const body = this.getBody();
		if (!body) return;
		if (!html) {
			this._log("body.html could not be loaded; the window will stay empty.", true);
			return;
		}
		body.innerHTML = html;

		this._el = {
			root: body.querySelector(".sd-app"),
			dot: body.querySelector('[data-role="dot"]'),
			conn: body.querySelector('[data-role="conn"]'),
			tabs: body.querySelector('[data-role="tabs"]'),
			scanBtn: body.querySelector('[data-action="scan"]'),
			setup: body.querySelector('[data-role="setup"]'),
			setupStatus: body.querySelector('[data-role="setup-status"]'),
			agentUrl: body.querySelector('[data-role="agent-url"]'),
			copyPath: body.querySelector('[data-action="copy-path"]'),
			viewManual: body.querySelector('[data-role="view-manual"]'),
			viewDiscovered: body.querySelector('[data-role="view-discovered"]'),
			entryForm: body.querySelector('[data-role="entry-form"]'),
			fHost: body.querySelector('[data-role="f-host"]'),
			fShare: body.querySelector('[data-role="f-share"]'),
			fLabel: body.querySelector('[data-role="f-label"]'),
			fSubmit: body.querySelector('[data-role="f-submit"]'),
			entries: body.querySelector('[data-role="entries"]'),
			hosts: body.querySelector('[data-role="hosts"]'),
			shares: body.querySelector('[data-role="shares"]'),
			scanStatus: body.querySelector('[data-role="scan-status"]'),
			scanCancel: body.querySelector('[data-action="cancel-scan"]'),
			status: body.querySelector('[data-role="status"]'),
		connBottom: body.querySelector('[data-role="conn-bottom"]'),
		};

		this._loadPreferences();
		await this._loadCredsFromDisk();
		this._bindEvents();
		this._renderEntries();
		this._renderHosts();
		this._renderShares();
		this._syncGenerateButton();
		this._renderView();
		this._syncToolbar();

		if (this._el.agentUrl) this._el.agentUrl.value = this._agentUrl;
		this._status("Add a host and share, then press Add. Copy puts the UNC path on your clipboard.");

		await this._loadAgentSource();
		this._syncGenerateButton();

		this._startPolling();
	}

	async stop() {
		if (this._disposed) return;
		this._disposed = true;
		try {
			if (this._agentOnline) {
				const controller = new AbortController();
				const timer = setTimeout(() => { try { controller.abort(); } catch (e) {} }, 1500);
				try {
					await fetch(this._agentUrl + "/shutdown", { method: "POST", signal: controller.signal });
				} catch (e) {}
				clearTimeout(timer);
			}
		} catch (e) {}
		try {
			if (typeof super.stop === "function") await super.stop();
		} catch (e) {}
	}

	/* ----------------------------------------------------------- preferences */

	_loadPreferences() {
		let prefs = null;
		try {
			prefs = this.userPreferences.get();
		} catch (e) {
			this._log("Could not read preferences: " + (e && e.message), true);
		}

		const app = (prefs && prefs.appPreferences && prefs.appPreferences[APP_ID]) || {};

		if (Array.isArray(app.entries)) {
			this._entries = app.entries
				.filter((e) => e && typeof e === "object" && typeof e.host === "string" && e.host)
				.map((e) => ({
					id: typeof e.id === "string" && e.id ? e.id : makeId(),
					host: String(e.host),
					share: typeof e.share === "string" ? e.share : "",
					label: typeof e.label === "string" ? e.label.slice(0, 64) : "",
					createdAt: typeof e.createdAt === "number" ? e.createdAt : Date.now(),
				}));
		} else if (app.entries !== undefined) {
			this._log("Stored manual entries were unreadable; starting with an empty list.", true);
			this._entries = [];
		}

		this._entries.sort((a, b) => a.createdAt - b.createdAt);

		if (typeof app.agentUrl === "string" && app.agentUrl.trim()) {
			this._agentUrl = app.agentUrl.trim().replace(/\/+$/, "");
		}
	}

	_saveAppPrefs(patch) {
		try {
			this.userPreferences.update((v) => {
				if (!v.appPreferences) v.appPreferences = {};
				const current = v.appPreferences[APP_ID] || {};
				v.appPreferences[APP_ID] = Object.assign(current, patch);
				return v;
			});
		} catch (e) {
			this._log("Could not save preferences: " + (e && e.message), true);
		}
	}

	_persistEntries() {
		this._saveAppPrefs({
			entries: this._entries.map((e) => ({
				id: e.id,
				host: e.host,
				share: e.share,
				label: e.label,
				createdAt: e.createdAt,
			})),
		});
	}

	/* ---------------------------------------------------------------- events */

	_bindEvents() {
		const root = this._el.root;
		if (!root) return;

		root.addEventListener("click", (ev) => {
			try {
				if (!(ev.target instanceof Element)) return;
				const el = ev.target.closest("[data-action]");
				if (!el) return;
				this._onAction(el.getAttribute("data-action"), el);
			} catch (e) {
				this._log("Click handler failed: " + (e && e.message), true);
			}
		});

		root.addEventListener("submit", (ev) => {
			try {
				const form = ev.target;
				if (!(form instanceof HTMLFormElement)) return;
				ev.preventDefault();
				const role = form.getAttribute("data-role");
				if (role === "entry-form") this._onSubmitEntry();
				else if (role === "cred-form") this._onSubmitCreds();
			} catch (e) {
				this._log("Submit handler failed: " + (e && e.message), true);
			}
		});

		root.addEventListener("change", (ev) => {
			try {
				const el = ev.target;
				if (!(el instanceof HTMLInputElement)) return;
				if (el.getAttribute("data-role") === "show-admin") {
					this._showAdmin = el.checked;
					this._renderShares();
				}
			} catch (e) {
				this._log("Change handler failed: " + (e && e.message), true);
			}
		});

		root.addEventListener("input", (ev) => {
			try {
				const el = ev.target;
				if (!(el instanceof HTMLInputElement)) return;
				if (el.getAttribute("data-role") !== "share-filter") return;
				this._shareFilter = el.value;
				this._renderShareList();
			} catch (e) {
				this._log("Filter handler failed: " + (e && e.message), true);
			}
		});
	}

	_onAction(action, el) {
		if (this._disposed) return;

		switch (action) {
			case "scan":
				if (this._agentOnline) {
					this._view = "discovered";
					this._renderView();
					this._scan("passive");
				} else {
					this._openSetup();
					this._startPolling();
				}
				break;
			case "rescan":
				this._scan("passive");
				break;
			case "sweep":
				this._scan("sweep");
				break;
			case "cancel-scan":
				if (this._scanController) {
					try {
						this._scanController.abort();
					} catch (e) {}
				}
				break;
			case "generate":
				this._generateHelper();
				break;
			case "save-arcos":
				this._saveToArcos();
				break;
			case "close-setup":
				this._closeSetup();
				break;
			case "save-url":
				this._saveAgentUrl();
				break;
			case "copy-path":
				this._copy(this._lastSavedPath, "Helper path copied.");
				break;
			case "view":
				this._view = el.getAttribute("data-view") === "discovered" ? "discovered" : "manual";
				this._renderView();
				break;
			case "copy": {
				const entry = this._entries.find((e) => e.id === el.getAttribute("data-id"));
				if (entry) this._copy(makeUnc(entry.host, entry.share), "Copied " + makeUnc(entry.host, entry.share));
				break;
			}
			case "edit":
				this._startEdit(el.getAttribute("data-id"));
				break;
			case "browse":
				this._browseEntry(el.getAttribute("data-id"));
				break;
			case "delete":
				this._deleteEntry(el.getAttribute("data-id"));
				break;
			case "select-host":
				this._selectHost(el.getAttribute("data-ip"));
				break;
			case "retry-shares":
				if (this._selectedHost) this._loadShares(this._selectedHost);
				break;
			case "forget-creds":
				this._forgetSelectedCreds();
				break;
			case "mount-share":
				this._mountShare(el.getAttribute("data-ip"), el.getAttribute("data-share"));
				break;
			case "unmount-share":
				this._unmountShare(el.getAttribute("data-ip"), el.getAttribute("data-share"));
				break;
			default:
				break;
		}
	}

	/* ---------------------------------------------------------- manual list */

	_onSubmitEntry() {
		if (this._disposed) return;

		let host = normalizeHost(this._el.fHost.value);
		let share = normalizeShare(this._el.fShare.value);
		const label = String(this._el.fLabel.value || "").trim().slice(0, 64);

		// Pasting a whole UNC path into the host box ("\\\\NAS01\\media") fills
		// both fields. Extra path segments are dropped — SMB shares end there.
		const pasted = host.split(/[\\/]+/).filter(Boolean);
		if (pasted.length > 1) {
			if (!share) share = pasted[1];
			host = pasted[0];
		}

		if (!host) {
			this._status("Enter a host name or IP address first.", true);
			this._el.fHost.focus();
			return;
		}
		if (host.length > 255 || share.length > 255) {
			this._status("That name is too long to be a host or share.", true);
			return;
		}
		if (/\s/.test(host) || /[\\/]/.test(host)) {
			this._status("That host doesn't look right — use a name or IP like nas01 or 192.168.1.20.", true);
			this._el.fHost.focus();
			return;
		}
		if (/\s/.test(share) || /[\\/]/.test(share)) {
			this._status("Share names can't contain spaces or slashes.", true);
			this._el.fShare.focus();
			return;
		}

		const key = entryKey(host, share);
		const editing = this._editingId ? this._entries.find((e) => e.id === this._editingId) : null;

		if (editing) {
			const clash = this._entries.find((e) => e.id !== editing.id && entryKey(e.host, e.share) === key);
			if (clash) {
				this._status("Another entry already uses " + makeUnc(host, share) + ".", true);
				return;
			}
			editing.host = host;
			editing.share = share;
			editing.label = label;
			this._persistEntries();
			this._resetForm();
			this._renderEntries();
			this._status("Updated " + makeUnc(host, share) + ".");
			return;
		}

		const existing = this._entries.find((e) => entryKey(e.host, e.share) === key);
		if (existing) {
			if (label) existing.label = label;
			this._persistEntries();
			this._resetForm();
			this._renderEntries();
			this._status("Updated the existing entry for " + makeUnc(host, share) + ".");
			return;
		}

		if (this._entries.length >= MAX_ENTRIES) {
			this._status("You've reached the " + MAX_ENTRIES + " entry limit. Delete one before adding another.", true);
			return;
		}

		this._entries.push({ id: makeId(), host, share, label, createdAt: Date.now() });
		this._persistEntries();
		this._resetForm();
		this._renderEntries();
		this._status("Added " + makeUnc(host, share) + ".");
	}

	_renderEntries() {
		const box = this._el.entries;
		if (!box) return;

		if (!this._entries.length) {
			box.innerHTML =
				'<div class="sd-empty">' +
				'<div class="sd-h3">No saved shares yet</div>' +
				"<p>A UNC path is how Windows names a share on another machine — for example <code>\\\\SERVER\\Shared</code>.</p>" +
				"<p>Type a host above to keep it here, or press <strong>Scan network</strong> to find machines automatically.</p>" +
				"<p>With the helper connected, <strong>Browse</strong> on a saved host lists its shares — even when a scan cannot find it.</p>" +
				"</div>";
			return;
		}

		box.innerHTML = this._entries
			.map((entry) => {
				const unc = makeUnc(entry.host, entry.share);
				const badge = isAdminShare(entry.share) ? '<span class="sd-badge">Admin</span>' : "";
				const confirm = this._pendingDeleteId === entry.id ? "Sure?" : "Delete";
				return (
					'<div class="sd-entry">' +
					'<div class="sd-entry-main">' +
					'<span class="sd-entry-label">' +
					esc(entry.label || entry.host) +
					badge +
					"</span>" +
					'<span class="sd-entry-path">' +
					esc(unc) +
					"</span>" +
					"</div>" +
					'<div class="sd-entry-actions">' +
					'<button type="button" class="sd-btn sd-mini" data-action="browse" data-id="' +
					escAttr(entry.id) +
					'" title="List the shares on this host with the discovery helper">Browse</button>' +
					'<button type="button" class="sd-btn sd-mini" data-action="copy" data-id="' +
					escAttr(entry.id) +
					'">Copy</button>' +
					'<button type="button" class="sd-btn sd-mini" data-action="edit" data-id="' +
					escAttr(entry.id) +
					'">Edit</button>' +
					'<button type="button" class="sd-btn sd-mini sd-danger" data-action="delete" data-id="' +
					escAttr(entry.id) +
					'">' +
					confirm +
					"</button>" +
					"</div>" +
					"</div>"
				);
			})
			.join("");
	}

	_startEdit(id) {
		const entry = this._entries.find((e) => e.id === id);
		if (!entry) return;
		this._editingId = id;
		this._el.fHost.value = entry.host;
		this._el.fShare.value = entry.share;
		this._el.fLabel.value = entry.label;
		this._el.fSubmit.textContent = "Save";
		this._el.fHost.focus();
		this._status("Editing " + makeUnc(entry.host, entry.share) + " — press Save to apply.");
	}

	_resetForm() {
		this._editingId = null;
		if (!this._el.fHost) return;
		this._el.fHost.value = "";
		this._el.fShare.value = "";
		this._el.fLabel.value = "";
		this._el.fSubmit.textContent = "Add";
	}

	// Opens a saved host in the discovery view. Saved hosts may live on a subnet
	// the scanner cannot reach, so they do not have to appear in a scan result to
	// be worth enumerating — that is the whole point of saving one.
	_browseEntry(id) {
		if (this._disposed) return;
		const entry = this._entries.find((e) => e.id === id);
		if (!entry) return;

		if (!this._agentOnline) {
			this._openSetup("Connect the helper to list the shares on " + entry.host + ".");
			this._startPolling();
			this._status("The helper has to be running to list shares on " + makeUnc(entry.host) + ".", true);
			return;
		}

		this._view = "discovered";
		this._renderView();
		this._selectHost(entry.host);
	}

	_deleteEntry(id) {
		if (this._pendingDeleteId !== id) {
			this._pendingDeleteId = id;
			this._renderEntries();
			if (this._deleteTimer) clearTimeout(this._deleteTimer);
			this._deleteTimer = setTimeout(() => {
				try {
					if (this._disposed) return;
					this._pendingDeleteId = null;
					this._renderEntries();
				} catch (e) {
					this._log("Delete confirmation failed: " + (e && e.message), true);
				}
			}, 3000);
			this._status("Press Delete again to confirm.", false);
			return;
		}

		this._pendingDeleteId = null;
		if (this._deleteTimer) {
			clearTimeout(this._deleteTimer);
			this._deleteTimer = null;
		}

		const entry = this._entries.find((e) => e.id === id);
		this._entries = this._entries.filter((e) => e.id !== id);
		if (this._editingId === id) this._resetForm();
		this._persistEntries();
		this._renderEntries();
		this._status(entry ? "Removed " + makeUnc(entry.host, entry.share) + "." : "Removed entry.");
	}

	/* --------------------------------------------------------------- helper */

	async _loadAgentSource() {
		const candidates = [
			util.join(this.workingDirectory, "agent", AGENT_FILE),
			util.join(this.workingDirectory, AGENT_FILE),
		];

		for (const path of candidates) {
			try {
				const buffer = await fs.readFile(path);
				if (buffer) {
					this._agentSource = convert.arrayToText(buffer);
					this._agentPath = path;
					this._log("Loaded helper source from " + path);
					return;
				}
			} catch (e) {
				/* try the next location */
			}
		}

		this._agentSource = null;
		this._log("Helper payload is missing from this build.", true);
	}

	_openSetup(message) {
		this._setupOpen = true;
		if (this._el.setup) this._el.setup.hidden = false;
		if (this._el.agentUrl) this._el.agentUrl.value = this._agentUrl;
		if (this._el.copyPath) this._el.copyPath.hidden = !this._lastSavedPath;
		this._syncGenerateButton();
		if (message) this._setSetupStatus(message, "error");
		else if (!this._agentSource) this._setSetupStatus("Helper payload is missing from this build — reinstall the app.", "error");
		else this._setSetupStatus("Press Download helper, then run the file it saves.", "");
	}

	_closeSetup() {
		this._setupOpen = false;
		if (this._el.setup) this._el.setup.hidden = true;
	}

	_setSetupStatus(message, tone) {
		const el = this._el.setupStatus;
		if (!el) return;
		el.textContent = message || "";
		el.classList.toggle("is-error", tone === "error");
		el.classList.toggle("is-ok", tone === "ok");
	}

	_syncGenerateButton() {
		const btn = this._el.root ? this._el.root.querySelector('[data-action="generate"]') : null;
		if (!btn) return;
		// The download is the normal path: it needs nothing but the payload.
		btn.disabled = !this._agentSource;
	}

	/* Builds the self-extracting .cmd, or reports why it could not. */
	_buildHelperCmd() {
		if (!this._agentSource) {
			this._setSetupStatus("Helper payload is missing from this build — reinstall the app.", "error");
			return "";
		}
		try {
			return buildAgentCmd(this._agentSource, currentOrigin());
		} catch (e) {
			this._setSetupStatus("Could not prepare the helper: " + (e && e.message), "error");
			return "";
		}
	}

	/* Primary action: download the .cmd to this machine's download folder. */
	_generateHelper() {
		if (this._disposed) return;
		const cmd = this._buildHelperCmd();
		if (!cmd) return;

		try {
			util.DownloadFile(convert.textToArrayBuffer(cmd), AGENT_CMD_NAME, "application/octet-stream");
		} catch (e) {
			this._setSetupStatus("Could not download the helper: " + (e && e.message), "error");
			return;
		}

		this._lastSavedPath = "";
		if (this._el.copyPath) this._el.copyPath.hidden = true;
		this._setSetupStatus(
			"Saved to your downloads folder as " + AGENT_CMD_NAME + ". Double-click it, then leave its window open.",
			"ok"
		);
		this._startPolling();
	}

	/* Secondary action: keep a copy in ArcOS files for a machine that cannot run
	 * the download directly. Deliberately overwrites any previous helper. */
	async _saveToArcos() {
		if (this._disposed) return;
		const cmd = this._buildHelperCmd();
		if (!cmd) return;

		const path = util.join(UserPaths.Downloads, AGENT_CMD_NAME);
		try {
			const blob = convert.textToBlob(cmd, "application/octet-stream");
			const ok = await fs.writeFile(path, blob, undefined, true);
			if (this._disposed) return;
			if (!ok) {
				this._setSetupStatus("Could not write the helper to " + path + ".", "error");
				return;
			}
		} catch (e) {
			this._setSetupStatus("Could not write the helper: " + (e && e.message), "error");
			return;
		}

		this._lastSavedPath = path;
		if (this._el.copyPath) this._el.copyPath.hidden = false;
		this._setSetupStatus(
			"Saved to " + path + " (replaces any existing copy). Fetch it from the File Manager on this PC, then double-click it.",
			"ok"
		);
		this._startPolling();
	}

	_saveAgentUrl() {
		let url = String(this._el.agentUrl.value || "").trim();
		if (!url) url = DEFAULT_AGENT_URL;
		if (!/^https?:\/\//i.test(url)) url = "http://" + url;
		url = url.replace(/\/+$/, "");
		this._agentUrl = url;
		this._saveAppPrefs({ agentUrl: url });
		this._el.agentUrl.value = url;
		this._setSetupStatus("Helper address set to " + url + ".", "ok");
		// A different address is a different helper: drop the old connection
		// state and look for the new one from scratch.
		if (this._agentOnline) this._setDisconnected();
		else this._startPolling();
	}

	/* ------------------------------------------------------------ agent net */

	async _request(method, path, body, timeoutMs, signal) {
		const base = this._agentUrl.replace(/\/+$/, "");
		const isHealth = path === "/health";
		const controller = new AbortController();
		if (!isHealth) this._pendingRequests++;
		const timer = setTimeout(() => {
			try {
				controller.abort();
			} catch (e) {}
		}, timeoutMs || 8000);

		if (signal) {
			signal.addEventListener("abort", () => {
				try {
					controller.abort();
				} catch (e) {}
			});
		}

		try {
			const init = { method, signal: controller.signal, cache: "no-store" };
			if (body !== null && body !== undefined) {
				init.headers = { "Content-Type": "application/json" };
				init.body = JSON.stringify(body);
			}
			const res = await fetch(base + path, init);
			const text = await res.text();
			let data = null;
			if (text) {
				try {
					data = JSON.parse(text);
				} catch (e) {
					data = null;
				}
			}
			return { ok: res.ok, status: res.status, data: data, text: text };
		} finally {
			clearTimeout(timer);
			if (!isHealth && this._pendingRequests > 0) this._pendingRequests--;
		}
	}

	_startPolling() {
		if (this._disposed) return;
		this._pollStartedAt = Date.now();
		this._schedulePoll(0);
	}

	_stopPolling() {
		if (this._pollTimer) {
			clearTimeout(this._pollTimer);
			this._pollTimer = null;
		}
	}

	_schedulePoll(delay) {
		if (this._disposed) return;
		this._stopPolling();
		this._pollTimer = setTimeout(async () => {
			try {
				if (this._disposed) return;
				await this._pollHealth();
				if (this._disposed || this._agentOnline) return;

				const elapsed = Date.now() - this._pollStartedAt;
				if (elapsed >= HEALTH_GIVE_UP_MS) {
					if (this._setupOpen) {
						this._setSetupStatus("No helper detected yet. Start it, then press Scan network again.", "error");
					}
					return;
				}
				this._schedulePoll(elapsed > 15000 ? HEALTH_SLOW_MS : HEALTH_FAST_MS);
			} catch (e) {
				this._log("Health poll failed: " + (e && e.message), true);
			}
		}, delay);
	}

	async _pollHealth() {
		if (this._disposed || this._healthBusy || this._scanning) return;
		// A scan or share enumeration already proves the helper is alive, and a
		// health check in the middle of one can flip the UI to "Manual mode"
		// while a long request is still running.
		if (this._pendingRequests > 0) return;
		this._healthBusy = true;
		try {
			const res = await this._request("GET", "/health", null, 2500);
			if (this._disposed) return;
			if (res.ok && res.data && res.data.ok) this._setConnected(res.data);
			else if (this._agentOnline && !this._helperBusy()) this._setDisconnected();
		} catch (e) {
			if (!this._disposed && this._agentOnline && !this._helperBusy()) this._setDisconnected();
		} finally {
			this._healthBusy = false;
		}
	}

	/* True while a cancelled sweep may still be blocking the helper's accept loop. */
	_helperBusy() {
		return this._helperBusyUntil > Date.now();
	}

	/* Heartbeat while connected: a slow 15 s ping so a helper that was closed
	   is noticed without hammering loopback. */
	_startHeartbeat() {
		if (this._disposed) return;
		this._stopHeartbeat();
		this._heartbeatTimer = setTimeout(async () => {
			try {
				if (this._disposed || !this._agentOnline) return;
				await this._pollHealth();
				if (this._disposed || !this._agentOnline) return;
				this._startHeartbeat();
			} catch (e) {
				this._log("Heartbeat failed: " + (e && e.message), true);
			}
		}, HEALTH_HEARTBEAT_MS);
	}

	_stopHeartbeat() {
		if (this._heartbeatTimer) {
			clearTimeout(this._heartbeatTimer);
			this._heartbeatTimer = null;
		}
	}

	_setConnected(info) {
		if (this._disposed) return;
		const wasOnline = this._agentOnline;
		this._agentOnline = true;
		this._agentInfo = info;
		this._helperLogs = Array.isArray(info.logs) ? info.logs : [];
		this._helperBusyUntil = 0;

		if (this._el.dot) this._el.dot.classList.add("is-online");
		if (this._el.conn) this._el.conn.textContent = "connected to helper";
		if (this._el.tabs) this._el.tabs.hidden = false;
		this._syncToolbar();

		if (wasOnline) return;

		this._startHeartbeat();
		this._view = "discovered";
		this._renderView();

		const version = info && info.version ? String(info.version) : "unknown";
		if (version !== AGENT_VERSION) {
			this._openSetup(
				"Connected, but the helper is v" +
					version +
					" and this app expects v" +
					AGENT_VERSION +
					". Generate a fresh copy and restart it."
			);
			return;
		}

		this._closeSetup();
		this._log("Helper connected: " + (info.hostname || "unknown host") + " (v" + version + ")");
		// Only scan automatically the first time ever. Reconnects (helper restart,
		// flaky connection) must not kick off another scan the user did not ask for.
		if (!this._initialScanDone) {
			this._initialScanDone = true;
			this._scan("passive").catch((e) => {
				this._log("Automatic scan failed: " + (e && e.message), true);
			});
		}
	}

	_setDisconnected() {
		if (this._disposed) return;
		if (!this._agentOnline) return;
		this._agentOnline = false;
		this._agentInfo = null;
		this._helperBusyUntil = 0;
		this._stopHeartbeat();
		if (this._el.dot) this._el.dot.classList.remove("is-online");
		if (this._el.conn) this._el.conn.textContent = "disconnected from helper";
		if (this._el.tabs) this._el.tabs.hidden = true;
		this._view = "manual";
		this._renderView();
		this._syncToolbar();
		this._hosts = [];
		this._selectedHost = "";
		this._shares = [];
		this._shareState = "idle";
		this._shareError = "";
		this._shareReason = "";
		this._shareDetail = "";
		this._shareCreds = null;
		// The remembered sign-ins deliberately survive a helper restart: it is the
		// same window, and making the user retype everything because the helper
		// blinked would be worse than keeping a password in memory a while longer.
		this._credsAuto = false;
		this._renderHosts();
		this._renderShares();
		this._status("The helper stopped. Manual entries still work.");
		this._startPolling();
	}

	/* ------------------------------------------------------------- discovery */

	_syncToolbar() {
		const text = this._agentOnline ? "connected to helper" : "disconnected from helper";
		if (this._el.conn) this._el.conn.textContent = text;
		if (this._el.connBottom) {
			if (this._agentOnline && this._helperLogs && this._helperLogs.length) {
				this._el.connBottom.textContent = this._helperLogs[this._helperLogs.length - 1];
			} else if (this._agentOnline) {
				this._el.connBottom.textContent = "connected to helper";
			} else {
				this._el.connBottom.textContent = "helper not connected";
			}
		}
		if (this._el.dot) this._el.dot.classList.toggle("is-online", this._agentOnline);
	}

	_renderView() {
		const showDiscovered = this._agentOnline && this._view === "discovered";
		if (this._el.viewManual) this._el.viewManual.hidden = !this._agentOnline || showDiscovered;
		if (this._el.viewDiscovered) this._el.viewDiscovered.hidden = !showDiscovered;

		// Until the helper is connected, the discovery setup is the main thing,
		// not the manual list. Once connected, tabs offer a choice between the
		// discovered list and manual typing.
		if (this._el.setup) this._el.setup.hidden = this._agentOnline;
		if (this._el.tabs) this._el.tabs.hidden = !this._agentOnline;

		// The Close button only makes sense once setup is a secondary panel.
		const closeBtn = this._el.setup ? this._el.setup.querySelector('[data-action="close-setup"]') : null;
		if (closeBtn) closeBtn.hidden = !this._agentOnline;

		if (!this._el.tabs) return;
		this._el.tabs.querySelectorAll("[data-action='view']").forEach((tab) => {
			const isActive = (tab.getAttribute("data-view") === "discovered") === showDiscovered;
			tab.classList.toggle("is-active", isActive);
		});
	}

	async _scan(mode) {
		if (this._disposed) return;
		if (!this._agentOnline) {
			this._openSetup();
			this._startPolling();
			return;
		}
		if (this._scanning) return;

		this._scanning = true;
		this._scanController = new AbortController();
		if (this._el.scanCancel) this._el.scanCancel.hidden = false;

		const progress =
			mode === "sweep"
				? "Sweeping every address on your subnet"
				: "Listening for machines on the local network";
		this._setScanStatus(progress + "…");

		const started = Date.now();

		// The helper does not stream per-address progress, so elapsed time is the
		// honest signal that a long sweep is still alive and cancellable.
		if (this._scanTimer) clearInterval(this._scanTimer);
		this._scanTimer = setInterval(() => {
			try {
				if (this._disposed || !this._scanning) return;
				const seconds = Math.round((Date.now() - started) / 1000);
				this._setScanStatus(progress + "… " + seconds + "s");
			} catch (e) {
				this._log("Scan progress update failed: " + (e && e.message), true);
			}
		}, 1000);

		try {
			const timeoutMs = mode === "sweep" ? 120000 : 6000;
			const res = await this._request(
				"POST",
				"/scan",
				{ mode: mode, timeoutMs: timeoutMs },
				mode === "sweep" ? 200000 : 30000,
				this._scanController.signal
			);
			if (this._disposed) return;

			if (!res.ok) {
				const detail =
					res.data && res.data.detail
						? res.data.detail
						: "The helper returned HTTP " + res.status + " for /scan.";
				this._setScanStatus(detail, true);
				return;
			}

			const hosts = res.data && Array.isArray(res.data.hosts) ? res.data.hosts : [];
			hosts.sort((a, b) => compareIp(a.ip, b.ip));
			this._hosts = hosts;
			this._initialScanDone = true;
			this._helperBusyUntil = 0;
			this._renderHosts();

			const seconds = ((Date.now() - started) / 1000).toFixed(1);
			if (hosts.length) {
				this._setScanStatus(hosts.length + (hosts.length === 1 ? " host" : " hosts") + " found in " + seconds + "s.");
				const selected = String(this._selectedHost || "").toLowerCase();
				const stillThere = hosts.some((h) => String(h.ip || "").toLowerCase() === selected);
				// A saved host is a deliberate choice, and it may legitimately be
				// absent from every scan. Do not yank the user away from it just
				// because the scanner found other machines.
				const selectedSaved = !!selected && this._entries.some((e) => e.host.toLowerCase() === selected);
				if (!stillThere && !selectedSaved) this._selectHost(hosts[0].ip);
				else if (stillThere) this._loadShares(this._selectedHost);
				else this._renderHosts();
			} else {
				this._setScanStatus("Nothing answered in " + seconds + "s. Try Sweep subnet.", false);
			}
		} catch (e) {
			if (this._disposed) return;
			const aborted = e && e.name === "AbortError";
			if (aborted) {
				// The helper cannot stop mid-sweep; it keeps the CPU busy until its
				// own loop finishes, so allow for that before trusting a silent
				// /health as "the helper is gone".
				if (mode === "sweep") this._helperBusyUntil = Date.now() + SWEEP_GRACE_MS;
				this._setScanStatus(
					mode === "sweep"
						? "Cancelled here. The helper finishes its sweep in the background."
						: "Scan cancelled.",
					false
				);
			} else {
				this._setScanStatus("Couldn't reach the helper.", true);
				this._pollHealth();
			}
		} finally {
			if (this._scanTimer) {
				clearInterval(this._scanTimer);
				this._scanTimer = null;
			}
			this._scanning = false;
			this._scanController = null;
			if (this._el.scanCancel) this._el.scanCancel.hidden = true;
		}
	}

	_setScanStatus(message, isError) {
		const el = this._el.scanStatus;
		if (!el) return;
		el.textContent = message || "";
		el.classList.toggle("is-error", !!isError);
	}

	_renderHosts() {
		const box = this._el.hosts;
		if (!box) return;

		const rows = this._hosts.slice();
		const selected = String(this._selectedHost || "");
		const selectedKey = selected.toLowerCase();

		// A host opened from a saved entry is not in the scan results — it may sit
		// on a subnet the helper cannot see. Give it a row of its own so the share
		// pane has visible context and the list can highlight what is selected.
		const listed = rows.some((h) => String(h.ip || "").toLowerCase() === selectedKey);
		if (selectedKey && !listed) {
			rows.push({
				ip: selected,
				hostname: "",
				workgroup: "",
				sources: [],
				port445: null,
				rttMs: null,
				saved: true,
			});
		}

		if (!rows.length) {
			box.innerHTML =
				'<div class="sd-empty"><div class="sd-h3">No hosts yet</div>' +
				"<p>Press Rescan to look for machines again, or open a host from your saved list in the Manual tab.</p></div>";
			return;
		}

		box.innerHTML = rows
			.map((host) => {
				const ip = String(host.ip || "");
				const sources = Array.isArray(host.sources) ? host.sources : [];
				const bits = [];
				if (host.hostname) bits.push('<span>' + esc(host.hostname) + "</span>");
				if (host.workgroup) bits.push('<span>' + esc(host.workgroup) + "</span>");
				if (sources.length) bits.push("<span>" + esc(sources.join(" + ")) + "</span>");
				if (host.port445 === false) bits.push('<span class="sd-off">445 closed</span>');
				else if (host.port445 === true) bits.push("<span>SMB</span>");
				if (typeof host.rttMs === "number") bits.push("<span>" + host.rttMs + " ms</span>");
				if (host.saved) bits.push("<span>Saved host</span>");

				return (
					'<button type="button" class="sd-host' +
					(selectedKey && ip.toLowerCase() === selectedKey ? " is-active" : "") +
					'" data-action="select-host" data-ip="' +
					escAttr(ip) +
					'">' +
					'<span class="sd-host-ip">' +
					esc(ip) +
					"</span>" +
					'<span class="sd-host-meta">' +
					(bits.length ? bits.join(" · ") : "<span>no details</span>") +
					"</span>" +
					"</button>"
				);
			})
			.join("");
	}

	_selectHost(ip) {
		if (!ip) return;
		this._selectedHost = ip;
		this._renderHosts();

		// The scan already knows whether 445 answered. Asking the helper to
		// enumerate a host with a closed port would just burn a 45 s timeout.
		const host = this._hosts.find((h) => h.ip === ip);
		if (host && host.port445 === false) {
			this._shares = [];
			this._shareError = "";
			this._shareState = "no445";
			this._renderShares();
			return;
		}

		this._loadShares(ip);
	}

	/*
	 * Per-host sign-ins, held in memory for the life of the window. Saving a
	 * password to preferences would put it on disk in plain text, which the
	 * design forbids, so the trade is: retype once per app start, never per
	 * host click. "Forget" drops one host's pair immediately.
	 */
	_credsKey(ip) {
		return String(ip == null ? "" : ip).trim().toLowerCase();
	}

	_rememberCreds(ip, credentials) {
		const key = this._credsKey(ip);
		const username = String((credentials && credentials.username) || "").trim();
		if (!key || !username) return;
		this._creds[key] = {
			username: username,
			password: String((credentials && credentials.password) || ""),
			domain: String((credentials && credentials.domain) || "").trim(),
		};
		this._saveCredsToDisk();
	}

	_recallCreds(ip) {
		return this._creds[this._credsKey(ip)] || null;
	}

	_isDevMode() {
		try {
			const h = String((typeof location !== "undefined" && location && location.hostname) || "");
			return h === "localhost" || h === "127.0.0.1" || h === "";
		} catch (e) {
			return false;
		}
	}

	async _loadCredsFromDisk() {
		if (this._disposed || !this._credsPersist) return;
		try {
			const buf = await fs.readFile(this._credsFile);
			if (!buf) return;
			const text = convert.arrayToText(buf);
			const data = JSON.parse(text);
			if (data && typeof data === "object") {
				for (const k in data) {
					if (data[k] && data[k].username) this._creds[k] = data[k];
				}
			}
		} catch (e) {
			/* no creds file yet, or unreadable — start empty */
		}
	}

	_saveCredsToDisk() {
		if (this._disposed || !this._credsPersist) return;
		try {
			const blob = convert.textToBlob(JSON.stringify(this._creds), "application/json");
			fs.writeFile(this._credsFile, blob, undefined, true).catch(() => {});
		} catch (e) {
			/* best effort */
		}
	}

	_forgetSelectedCreds() {
		if (this._disposed) return;
		const host = this._selectedHost;
		if (!host) return;
		delete this._creds[this._credsKey(host)];
		this._credsAuto = false;
		this._shareCreds = null;
		this._shareReason = "";
		this._shareDetail = "";
		this._shares = [];
		this._shareState = "signed-out";
		this._saveCredsToDisk();
		this._renderShares();
		this._status("Forgot the saved sign-in for " + host + ".");
	}

	async _loadShares(ip, credentials) {
		if (this._disposed || !ip) return;

		// New credentials replace whatever was remembered; without them, the pair
		// remembered for this host is used, so switching hosts and back does not
		// ask again. `_credsAuto` only changes the wording of a refusal.
		let creds = credentials && String(credentials.username || "").trim() ? credentials : null;
		if (creds) this._rememberCreds(ip, creds);
		else creds = this._recallCreds(ip);
		this._credsAuto = !credentials && !!creds;

		this._shareState = "loading";
		this._shareError = "";
		this._shareReason = "";
		this._shareDetail = "";
		this._shares = [];
		// Kept so a refusal can name the account that was tried and the form comes
		// back filled. The password itself never leaves `_creds`.
		this._shareCreds = creds ? { username: creds.username, domain: creds.domain } : null;
		this._renderShares();

		try {
			const res = await this._request(
				"POST",
				"/hosts/" + encodeURIComponent(ip) + "/shares",
				creds || {},
				45000
			);
			if (this._disposed || this._selectedHost !== ip) return;
			if (!res.ok) {
				this._shareState = "error";
				this._shareError =
					res.data && res.data.detail ? res.data.detail : "The helper returned HTTP " + res.status + ".";
				this._renderShares();
				return;
			}
			const data = res.data || {};
			this._shares = Array.isArray(data.shares) ? data.shares : [];
			this._shareReason = String(data.reason || "");
			this._shareDetail = String(data.detail || "");
			this._shareState = data.denied ? "denied" : "ok";
			if (this._shareState === "denied") {
				this._log("Share enumeration refused by " + ip + " (" + (this._shareReason || "unknown") + ").");
			}
			this._renderShares();
		} catch (e) {
			// A slow answer for the host the user already clicked away from must
			// not overwrite the pane for the host they are looking at now.
			if (this._disposed || this._selectedHost !== ip) return;
			this._shareState = "error";
			this._shareError = e && e.name === "AbortError" ? "The helper took too long to answer." : "Couldn't reach the helper.";
			this._renderShares();
			this._pollHealth();
		}
	}

	_onSubmitCreds() {
		if (this._disposed) return;
		const box = this._el.shares;
		if (!box) return;
		const user = String((box.querySelector('[data-role="c-user"]') || {}).value || "").trim();
		const pass = String((box.querySelector('[data-role="c-pass"]') || {}).value || "");
		const domain = String((box.querySelector('[data-role="c-domain"]') || {}).value || "").trim();

		if (!user) {
			this._status("Enter a username to enumerate shares.", true);
			return;
		}
		if (!this._selectedHost) return;

		this._loadShares(this._selectedHost, { username: user, password: pass, domain: domain });
	}

	_renderShares() {
		const box = this._el.shares;
		if (!box) return;

		if (!this._selectedHost) {
			box.innerHTML =
				'<div class="sd-empty"><div class="sd-h3">Pick a host</div><p>Select a machine on the left to list its shares.</p></div>';
			return;
		}

		// The bar is rebuilt only on state changes; typing in the filter redraws
		// just the list, so the input keeps focus and the caret does not jump.
		box.innerHTML =
			'<div class="sd-scanbar">' +
			"<strong>" +
			esc(this._selectedHost) +
			"</strong>" +
			'<input class="sd-input sd-filter" data-role="share-filter" placeholder="Filter shares" spellcheck="false" value="' +
			escAttr(this._shareFilter) +
			'" />' +
			'<span class="sd-grow"></span>' +
			'<button type="button" class="sd-btn sd-mini" data-action="retry-shares">Reload</button>' +
			"</div>" +
			'<div class="sd-shares-list" data-role="share-list">' +
			this._shareListHtml() +
			"</div>";
		this._updateQuotaNotes();
	}

	_renderShareList() {
		if (!this._el.shares) return;
		const list = this._el.shares.querySelector('[data-role="share-list"]');
		if (list) list.innerHTML = this._shareListHtml();
		this._updateQuotaNotes();
	}

	_shareListHtml() {
		const ip = this._selectedHost;
		if (!ip) return "";

		if (this._shareState === "no445") {
			return (
				'<div class="sd-empty"><div class="sd-h3">No SMB service on this host</div>' +
				"<p>Nothing answered on port 445, so there is nothing to enumerate. File sharing may be off, or the device may be a printer or IoT gadget that does not speak SMB.</p>" +
				'<p><button type="button" class="sd-btn sd-mini" data-action="retry-shares">Try anyway</button></p>' +
				"</div>"
			);
		}

		if (this._shareState === "loading") {
			return '<div class="sd-empty"><p>Asking the host for its share list…</p></div>';
		}

		if (this._shareState === "error") {
			return (
				'<div class="sd-empty"><div class="sd-h3">Could not list shares</div><p>' +
				esc(this._shareError) +
				"</p>" +
				(this._shareCreds
					? "<p>The helper could not get an answer from that host. Check the address, and that file sharing is switched on there.</p>"
					: "<p>Windows usually blocks anonymous enumeration. Try it with credentials below.</p>") +
				(this._shareDetail ? '<p class="sd-detail">' + esc(this._shareDetail) + "</p>" : "") +
				this._renderCredsForm() +
				"</div>"
			);
		}

		if (this._shareState === "signed-out") {
			return (
				'<div class="sd-empty"><div class="sd-h3">Sign in to list shares</div>' +
				"<p>Guest access is off by default on Windows and on most NAS boxes, so this host needs an account that exists on it.</p>" +
				this._renderCredsForm() +
				"</div>"
			);
		}

		if (this._shareState === "denied") {
			const tried = this._shareCreds;
			const who = tried
				? (tried.domain ? tried.domain + "\\" + tried.username : tried.username)
				: "";
			const reused = this._credsAuto && !!who;
			const hint = this._deniedHint();
			return (
				'<div class="sd-empty">' +
				'<div class="sd-h3">' +
				(reused
					? "The saved sign-in was refused"
					: tried
						? "Those credentials were refused"
						: "This host needs credentials") +
				"</div>" +
				(reused
					? "<p>Used the sign-in remembered for this host (<code>" +
						esc(who) +
						"</code>), and it was not accepted. Correct it below, or press Forget to drop it.</p>"
					: tried && who
						? "<p>Tried <code>" + esc(who) + "</code>, and the host would not open its share list for it.</p>"
						: "<p>Guest access is off by default on modern Windows and on most NAS boxes, so needing an account is normal. Sign in with an account that exists on that machine.</p>") +
				(hint ? "<p>" + hint + "</p>" : "") +
				(this._shareDetail ? '<p class="sd-detail">' + esc(this._shareDetail) + "</p>" : "") +
				this._renderCredsForm() +
				"</div>"
			);
		}

		const needle = this._shareFilter.trim().toLowerCase();
		const matches = (share) => {
			if (!needle) return true;
			const name = String(share.name || "").toLowerCase();
			const comment = String(share.comment || "").toLowerCase();
			return name.indexOf(needle) > -1 || comment.indexOf(needle) > -1;
		};

		const visible = this._shares.filter((s) => {
			const name = String(s.name || "");
			const admin = isAdminShare(name) || String(s.type || "").toLowerCase() === "ipc";
			return !admin && matches(s);
		});

		if (!visible.length) {
			return (
				'<div class="sd-empty"><div class="sd-h3">No shares to show</div><p>' +
				(!this._shares.length
					? "The host answered but reported no shares."
					: needle
						? "No share matches “" + esc(this._shareFilter.trim()) + "”."
						: "Only administrative shares were returned. Tick the box above to see them.") +
				"</p></div>"
			);
		}

		return visible
				.map((share) => {
					const name = String(share.name || "");
					const type = String(share.type || "Disk");
					const comment = String(share.comment || "");
					const unc = makeUnc(ip, name);
					// A share the user saved is marked, so browsing a host still shows
					// which of its shares was the reason they kept it.
					const saved = this._entries.some(
						(e) =>
							e.host.toLowerCase() === ip.toLowerCase() &&
							!!e.share &&
							e.share.toLowerCase() === name.toLowerCase()
					);
					return (
						'<div class="sd-share">' +
						'<div class="sd-share-main">' +
						'<span class="sd-share-name">' +
						esc(unc) +
						'<span class="sd-badge">' +
						esc(type) +
						"</span>" +
						(saved ? '<span class="sd-badge">Saved</span>' : "") +
						"</span>" +
						(comment ? '<span class="sd-share-desc">' + esc(comment) + "</span>" : "") +
						"</div>" +
						this._mountButtonHtml(ip, name, type) +
						"</div>"
					);
				})
				.join("");
	}

	_renderCredsForm() {
		const tried = this._shareCreds;
		const user = tried ? tried.username : "";
		const domain = tried ? tried.domain : "";
		const saved = !!this._recallCreds(this._selectedHost);
		return (
			'<form class="sd-creds" data-role="cred-form" autocomplete="off">' +
			'<input class="sd-input" data-role="c-user" placeholder="Username (or DOMAIN\\user)" spellcheck="false" value="' +
			escAttr(user) +
			'" />' +
			'<input class="sd-input" data-role="c-pass" type="password" placeholder="Password" />' +
			'<input class="sd-input" data-role="c-domain" placeholder="Domain (optional)" spellcheck="false" value="' +
			escAttr(domain) +
			'" />' +
			'<button type="submit" class="sd-btn sd-primary">Sign in</button>' +
			(saved
				? '<button type="button" class="sd-btn sd-mini" data-action="forget-creds" title="Stop using the sign-in remembered for this host">Forget</button>'
				: "") +
			"</form>"
		);
	}

	// Turns the helper's machine-readable reason into one line of advice. The
	// detail line underneath carries the raw Windows text; this says what to do.
	_deniedHint() {
		switch (this._shareReason) {
			case "bad_credentials":
				return "The host did not accept that account or password.";
			case "account_locked":
				return "That account is locked out on the host.";
			case "account_disabled":
				return "That account is disabled on the host.";
			case "password_expired":
				return "That account's password has expired and has to be changed on the host itself.";
			case "guest_blocked":
				return "The host's policy blocks guest sign-in, so it needs a real account on that machine.";
			case "session_conflict":
				return "This PC already has a connection to that host under another name. Run <code>net use \\\\host /delete</code> in a command prompt, then try again.";
			case "unreachable":
				return "Nothing answered on port 445, so there is no file-sharing service to sign in to.";
			case "access_denied":
				return "The host refused that account for its file-sharing service.";
			case "anonymous":
				return "The host refuses anonymous sign-in. That is the default on Windows and on most NAS boxes.";
		}
		return "";
	}

	/* ------------------------------------------------------------- SMB drive */

	// Older app builds mounted drives without `direct` support, so a drive left
	// over from such a build still throws "illegal direct" in the media player.
	// Patch on demand in _driveFor instead of on every render, to avoid
	// iterating the whole drive registry each time the share list re-renders.
	_patchLegacyDrive(drive) {
		if (!drive) return drive;
		try {
			if (!drive.CAPABILITIES) drive.CAPABILITIES = {};
			if (!drive.CAPABILITIES.direct) {
				drive.CAPABILITIES.direct = true;
				drive.direct = ShareDrive.prototype.direct.bind(drive);
				if (drive._directUrls === undefined) drive._directUrls = new Map();
			}
		} catch (e) {
			/* patching must never break the app */
		}
		return drive;
	}

	// The mounted drive for a share, if any. `fs.drives` is the registry ArcOS
	// itself uses, so asking it means a drive left over from an earlier window
	// shows as mounted (and can be unmounted) instead of being mounted twice.
	_driveFor(ip, share) {
		let drives = null;
		try {
			if (typeof fs !== "undefined" && fs && fs.drives) drives = fs.drives;
		} catch (e) {
			drives = null;
		}
		const drive = (drives && drives[shareDriveId(ip, share)]) || null;
		return this._patchLegacyDrive(drive);
	}

	// Only a disk share has a filesystem to show. A print queue or IPC$ gets no
	// button rather than a drive that fails on the first click.
	_mountButtonHtml(ip, share, type) {
		if (String(type || "").toLowerCase() !== "disk") return "";

		const id = shareDriveId(ip, share);
		const attrs = ' data-ip="' + escAttr(ip) + '" data-share="' + escAttr(share) + '"';
		if (this._mounting[id]) {
			return '<button type="button" class="sd-btn sd-mini" disabled>Working…</button>';
		}

		const drive = this._driveFor(ip, share);
		if (drive) {
			const letter = String(drive.driveLetter || "?") + ":";
			return (
				'<button type="button" class="sd-btn sd-mini" data-action="unmount-share"' +
				attrs +
				' title="Remove the drive, not the files">' +
				ICON_EMBLEM_MOUNTED +
				" Unmount " +
				esc(letter) +
				"</button>" +
				'<span class="sd-note sd-quota">quota n/a</span>'
			);
		}

		return (
			'<button type="button" class="sd-btn sd-mini" data-action="mount-share"' +
			attrs +
			' title="Show this share as a drive in the File Manager">' +
			ICON_EMBLEM_SHARED +
			" Mount</button>"
		);
	}

	async _mountShare(ip, share) {
		if (this._disposed || !ip || !share) return;

		const id = shareDriveId(ip, share);
		if (this._mounting[id]) return;

		if (typeof fs === "undefined" || !fs || typeof fs.mountDrive !== "function") {
			this._status("This ArcOS build has no filesystem module, so a share cannot be mounted.", true);
			return;
		}

		if (this._driveFor(ip, share)) {
			this._status(makeUnc(ip, share) + " is already mounted.");
			this._renderShareList();
			return;
		}

		// Ask the user before mounting: a secure-context prompt keeps a stray
		// click from registering a drive the user did not want.
		const mountOk = await this._elevateAction("mountShare", "Mount " + makeUnc(ip, share) + " as a drive in the File Manager?");
		if (!mountOk) {
			this._status("Mount cancelled.", true);
			return;
		}

		let letter = "";
		try {
			letter = String(fs.nextAvailableDriveLetter() || "");
		} catch (e) {
			letter = "";
		}
		if (!letter) {
			this._status("No free drive letter. Unmount a drive first.", true);
			return;
		}

		this._mounting[id] = true;
		this._status("Mounting " + makeUnc(ip, share) + " as " + letter + ":…");
		this._renderShareList();

		// mountDrive() answers false when the drive refuses to spin up and throws
		// the instance away, so this object is the only place the reason survives.
		const state = {};
		try {
			const mounted = await fs.mountDrive(id, ShareDrive, letter, undefined, {
				host: ip,
				share: share,
				agentUrl: () => this._agentUrl,
				auth: () => this._recallCreds(ip),
				state: state,
			});

			if (this._disposed) return;
			if (!mounted) {
				this._status(this._mountFailureText(state, ip, share), true);
				this._log(
					"Could not mount " + makeUnc(ip, share) + " (" + (state.reason || "unknown") + "). " + (state.detail || "")
				);
				return;
			}

			this._status("Mounted " + makeUnc(ip, share) + " as " + letter + ":. It is in the File Manager.");
		} catch (e) {
			this._status(
				"Could not mount " + makeUnc(ip, share) + ": " + ((e && e.message) || "the filesystem refused it."),
				true
			);
		} finally {
			delete this._mounting[id];
			if (!this._disposed) this._renderShareList();
		}
	}

	async _unmountShare(ip, share) {
		if (this._disposed || !ip || !share) return;

		const id = shareDriveId(ip, share);
		if (this._mounting[id]) return;
		if (typeof fs === "undefined" || !fs || typeof fs.umountDrive !== "function") return;

		const drive = this._driveFor(ip, share);
		if (!drive) {
			this._renderShareList();
			return;
		}

		const ok = await this._elevateAction("unmountShare", "Unmount " + makeUnc(ip, share) + " from " + String(drive.driveLetter || "?") + ": ?");
		if (!ok) {
			this._status("Unmount cancelled.", true);
			return;
		}

		const letter = String(drive.driveLetter || "");
		this._mounting[id] = true;
		this._renderShareList();

		try {
			const gone = await fs.umountDrive(id);
			if (this._disposed) return;
			if (gone) {
				this._status("Unmounted " + makeUnc(ip, share) + (letter ? " from " + letter + ":" : "") + ".");
			} else {
				this._status("Could not unmount " + makeUnc(ip, share) + ".", true);
			}
		} catch (e) {
			if (!this._disposed) {
				this._status(
					"Could not unmount " + makeUnc(ip, share) + ": " + ((e && e.message) || "the filesystem refused it."),
					true
				);
			}
		} finally {
			delete this._mounting[id];
			if (!this._disposed) this._renderShareList();
		}
	}

	// Fills in the free-space note on each mounted share row. SMB shares do not
	// report a quota, but fsutil can ask the server for free/total bytes, so
	// try that and fall back to "free space n/a" when it is unavailable.
	async _updateQuotaNotes() {
		if (this._disposed || this._quotaBusy) return;
		this._quotaBusy = true;
		const box = this._el.shares;
		if (!box) { this._quotaBusy = false; return; }
		const spans = box.querySelectorAll(".sd-quota");
		for (const span of spans) {
			const row = span.closest(".sd-share");
			const btn = row ? row.querySelector('[data-action="unmount-share"]') : null;
			if (!btn) continue;
			const ip = btn.getAttribute("data-ip");
			const share = btn.getAttribute("data-share");
			const drive = this._driveFor(ip, share);
			if (!drive) continue;
			try {
				const q = await drive.quota();
				if (this._disposed) return;
				if (q && !q.unknown && q.max > 0) {
					const freeText = q.freeText || this._formatBytes(q.free);
					const totalText = q.totalText || this._formatBytes(q.max);
					span.textContent = freeText + " free of " + totalText;
					span.title = "";
				} else {
					span.textContent = "free space n/a";
					span.title = (q && q.detail) ? q.detail : "fsutil returned no size";
				}
			} catch (e) {
				span.textContent = "free space n/a";
				span.title = (e && e.message) || "";
			}
		}
		this._quotaBusy = false;
	}

	// Local formatter so we never depend on util.formatBytes behaving a certain way.
	_formatBytes(n) {
		n = Number(n) || 0;
		if (n < 1024) return n + " B";
		const units = ["KB", "MB", "GB", "TB", "PB"];
		let i = -1;
		let v = n;
		do {
			v = v / 1024;
			i++;
		} while (v >= 1024 && i < units.length - 1);
		return (Math.round(v * 10) / 10) + " " + units[i];
	}

	// Returns true when the action is allowed to proceed. Uses ArcOS secure
	// context when available; otherwise treats it as approved so the app still
	// works in environments without elevation (and in the offline test harness).
	async _elevateAction(key, what) {
		if (typeof this.elevate !== "function") return true;
		try {
			if (!this.elevations) this.elevations = {};
			if (!this.elevations[key]) {
				let image = undefined;
				try {
					if (typeof fs.direct === "function") {
						image = await fs.direct(util.join(this.workingDirectory, "store/image.svg"));
					}
				} catch (e) {
					image = undefined;
				}
				this.elevations[key] = {
					what: what,
					image: image,
					title: "ArcOS Share Discovery",
					description: "by Nik Nikovsky",
					level: 1,
				};
			}
			const approved = await this.elevate(key);
			return approved !== false;
		} catch (e) {
			return true;
		}
	}

	// mountDrive() only answers yes or no. The reason the drive recorded is what
	// tells the user whether to sign in, check the name, or start the helper.
	_mountFailureText(state, ip, share) {
		const reason = String((state && state.reason) || "");
		const advice = {
			bad_credentials: "the host did not accept the saved sign-in — press Forget, then sign in again",
			access_denied: "that account is not allowed to open this share",
			anonymous: "the host refuses anonymous access, so sign in to it first",
			guest_blocked: "the host blocks guest access, so it needs an account on that machine",
			session_conflict: "this PC already has a connection to that host under another name",
			unreachable: "nothing answered on port 445",
			not_found: "the host has no share by that name",
			bad_path: "the share path was rejected",
			bad_unc: "the share path was rejected",
			not_a_file: "the host answered for something that is not a folder",
			too_large: "the file is larger than the drive can read",
			fs_failed: "the helper could not read the share",
			offline: "the helper did not answer — check that it is still running",
		}[reason];

		const base = "Could not mount " + makeUnc(ip, share);
		if (advice) return base + ": " + advice + ".";
		const detail = String((state && state.detail) || "");
		return detail ? base + ": " + detail : base + ".";
	}

	/* ----------------------------------------------------------------- util */

	async _copy(text, successMessage) {
		if (this._disposed || !text) return;
		let ok = false;
		try {
			if (navigator.clipboard && navigator.clipboard.writeText) {
				await navigator.clipboard.writeText(text);
				ok = true;
			}
		} catch (e) {
			ok = false;
		}

		if (!ok) {
			try {
				const area = document.createElement("textarea");
				area.value = text;
				area.setAttribute("readonly", "");
				area.style.position = "fixed";
				area.style.opacity = "0";
				this.getBody().appendChild(area);
				area.select();
				ok = document.execCommand("copy");
				area.remove();
			} catch (e) {
				ok = false;
			}
		}

		this._status(ok ? successMessage : "Could not copy to the clipboard. Select the text manually.", !ok);
	}

	_status(message, isError) {
		const els = this.getBody().querySelectorAll('[data-role="status"]');
		if (!els.length) return;
		els.forEach((el) => {
			el.textContent = message || "";
			el.classList.toggle("is-error", !!isError);
		});
	}

	_log(message, isError) {
		try {
			this.Log(message, isError ? LogLevel.error : LogLevel.info);
		} catch (e) {
			/* logging must never throw */
		}
	}
}

function compareIp(a, b) {
	const pa = String(a || "").split(".").map((n) => parseInt(n, 10) || 0);
	const pb = String(b || "").split(".").map((n) => parseInt(n, 10) || 0);
	for (let i = 0; i < 4; i++) {
		if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
	}
	return 0;
}

return proc;
