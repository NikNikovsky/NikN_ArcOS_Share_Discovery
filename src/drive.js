function makeUnc(host, share) { return share ? "\\\\" + host + "\\" + share : "\\\\" + host; }
// Drive module for ArcOS Share Discovery
// Loaded by process.js via fs.readFile + eval.
if (typeof DEFAULT_AGENT_URL === 'undefined') { var DEFAULT_AGENT_URL = 'http://127.0.0.1:8790'; }
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
	let rel = String(path == null ? "" : path)
		.replace(/\\/g, "/")
		.replace(/^\/+/, "")
		.replace(/\/+$/, "");
	if (!rel) return "";
	const segments = rel.split("/");
	for (const seg of segments) {
		if (!seg || seg === "." || seg === "..") return "";
		if (/^[a-zA-Z]:/.test(seg)) return "";
	}
	return rel;
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
var ShareDrive = class ShareDrive extends ShareDriveBase {
	constructor(uuid, letter, options) {
		super(uuid, letter);

		const opts = options || {};
		this.host = String(opts.host || "");
		this.share = String(opts.share || "");
		this.readOnly = opts.readOnly !== false;
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
		this.READONLY = this.readOnly;
		this.REMOVABLE = true;
		this.FIXED = false;
		this.CAPABILITIES = {
			readDir: true,
			readFile: true,
			stat: true,
			quota: true,
			makeDir: !this.readOnly,
			writeFile: !this.readOnly,
			copyItem: false,
			moveItem: false,
			deleteItem: !this.readOnly,
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
				readOnly: this.readOnly,
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

	async createDirectory(path) {
		const res = await this._call("/fs/mkdir", { path: driveRelativePath(path) });
		if (!res.ok) { this._fail(res); return false; }
		this._listings.clear();
		return true;
	}

	async writeFile(path, data, onProgress) {
		const rel = driveRelativePath(path);
		if (!rel) return false;
		let buf;
		try { buf = await data.arrayBuffer(); } catch (e) { return false; }
		const bytes = new Uint8Array(buf);
		let bin = "";
		for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
		const b64 = btoa(bin);
		const res = await this._call("/fs/write", { path: rel, data: b64 });
		if (!res.ok) { this._fail(res); return false; }
		this._listings.clear();
		return true;
	}

	async deleteItem(path) {
		const rel = driveRelativePath(path);
		if (!rel) return false;
		const res = await this._call("/fs/delete", { path: rel });
		if (!res.ok) { this._fail(res); return false; }
		this._listings.clear();
		return true;
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

