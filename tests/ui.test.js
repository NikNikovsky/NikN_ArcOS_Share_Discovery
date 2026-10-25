/*
 * Offline UI harness: runs the real src/process.js inside jsdom against a fake
 * ArcOS shell and a fake helper. Catches logic errors that a syntax check
 * cannot â€” form handling, persistence, escaping, filter, connect/disconnect.
 */
const fsNode = require("fs");
const pathNode = require("path");
const { JSDOM } = require("jsdom");

const repo = pathNode.resolve(__dirname, "..");
const source = fsNode.readFileSync(pathNode.join(repo, "src", "process.js"), "utf8");
// Track the helper version the app expects so a bump does not fail the UI suite
// for the wrong reason (the version-mismatch path is exercised in edge.test.js).
const expectedAgentVersion = (source.match(/AGENT_VERSION = "([^"]+)"/) || [])[1];
const bodyHtml = fsNode.readFileSync(pathNode.join(repo, "src", "body.html"), "utf8");
const agentSource = fsNode.readFileSync(pathNode.join(repo, "src", "agent", "agent.ps1"), "utf8");

let failures = 0;
function check(label, condition, extra) {
	if (condition) {
		console.log("ok   " + label);
	} else {
		failures++;
		console.log("FAIL " + label + (extra ? " :: " + extra : ""));
	}
}
function eq(label, actual, expected) {
	check(label, actual === expected, "got " + JSON.stringify(actual) + " want " + JSON.stringify(expected));
}

/* ------------------------------------------------------------------- shell */

const dom = new JSDOM(
	'<!doctype html><html><body><div id="NikN_ArcSD"><div class="body"></div></div></body></html>',
	{ url: "https://beta.arcweb.nl/desktop" }
);
const window = dom.window;
const document = window.document;
const bodyEl = document.querySelector("#NikN_ArcSD > div.body");

let prefsState = { appPreferences: {} };
const userPreferences = {
	get: () => prefsState,
	update: (fn) => {
		prefsState = fn(prefsState);
	},
	subscribe: () => {},
};

const downloads = [];
const writes = [];
const clipboard = [];

Object.defineProperty(window.navigator, "clipboard", {
	value: {
		writeText: async (text) => {
			clipboard.push(text);
		},
	},
	configurable: true,
});

const util = {
	htmlspecialchars: (s) =>
		String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"),
	join: (...parts) => parts.filter((p) => p !== undefined && p !== "").join("/").replace(/\/+/g, "/"),
	DownloadFile: (buffer, name, mime) => downloads.push({ buffer, name, mime }),
	formatBytes: (n) => n + " B",
};

const convert = {
	arrayToText: (buffer) => Buffer.from(new Uint8Array(buffer)).toString("utf8"),
	textToArrayBuffer: (text) => {
		const bytes = Buffer.from(text, "utf8");
		return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
	},
	textToBlob: (text, type) => ({ __text: text, type }),
};

const fakeFs = {
	drives: {},
	nextLetter: "N",
	spinUps: 0,
	lastFailed: null,
	readFile: async (p) => {
		if (String(p).replace(/\\/g, "/").endsWith("agent/agent.ps1")) {
			return convert.textToArrayBuffer(agentSource);
		}
		return undefined;
	},
	writeFile: async (p, blob, onProgress, dispatch) => {
		writes.push({ path: p, text: blob && blob.__text, dispatch });
		return true;
	},
	// Mirrors fs.mountDrive closely enough for the app: construct, spin up,
	// register only when the spin-up says yes.
	mountDrive: async (id, supplier, letter, onProgress, ...args) => {
		const instance = new supplier("UUID-" + id, letter, ...args);
		fakeFs.spinUps++;
		const ready = await instance.__spinUp(onProgress);
		if (!ready) {
			fakeFs.lastFailed = instance;
			return false;
		}
		fakeFs.drives[id] = instance;
		return instance;
	},
	umountDrive: async (id) => {
		if (!fakeFs.drives[id]) return false;
		await fakeFs.drives[id].__spinDown();
		delete fakeFs.drives[id];
		return true;
	},
	nextAvailableDriveLetter: () => fakeFs.nextLetter,
};

class ThirdPartyAppProcess {
	constructor(pid, parentPid, app, operationId, workingDirectory) {
		this.pid = pid;
		this.app = app;
		this.workingDirectory = workingDirectory;
		this.userPreferences = userPreferences;
		this.logs = [];
		this.windowTitle = { set: () => {} };
	}
	getBody() {
		return bodyEl;
	}
	Log(message, level) {
		this.logs.push({ message, level });
	}
}

/* ------------------------------------------------------------------- agent */

const agent = {
	online: false,
	hosts: [
		{ ip: "10.20.30.20", hostname: "DSM_nas01", workgroup: "WORKGROUP", sources: ["netbios"], port445: true, rttMs: 3 },
		{ ip: "10.20.30.21", hostname: "NAS_OLD", workgroup: "WORKGROUP", sources: ["netbios"], port445: true, rttMs: 2 },
		{ ip: "10.20.30.40", hostname: "<b>broken</b>", workgroup: "", sources: ["netbios"], port445: false, rttMs: 500 },
	],
	shares: {
		"10.20.30.20": [
			{ name: "media", type: "Disk", comment: "Media library" },
			{ name: "C$", type: "Disk", comment: "System" },
			{ name: "IPC$", type: "IPC", comment: "" },
		],
		"10.20.30.21": [],
	},
	denied: {},
	deniedDetail: {},
	deniedReason: {},
	mountDenied: "",
	mountDeniedDetail: "",
	requests: [],
};

function jsonResponse(payload, status) {
	return {
		ok: (status || 200) < 400,
		status: status || 200,
		text: async () => JSON.stringify(payload),
	};
}

const fakeFetch = async (url, init) => {
	const method = (init && init.method) || "GET";
	const body = init && init.body ? JSON.parse(init.body) : null;
	agent.requests.push({ url: String(url), method, body });
	if (!agent.online) throw new TypeError("Failed to fetch");

	const path = new URL(String(url)).pathname;
	if (path === "/health") {
		return jsonResponse({ ok: true, version: expectedAgentVersion, platform: "windows", psVersion: "5.1.26100", hostname: "DESKTOP-TEST" });
	}
	if (path === "/scan") {
		return jsonResponse({ hosts: agent.hosts });
	}
	const m = path.match(/^\/hosts\/([^/]+)\/shares$/);
	if (m) {
		const ip = decodeURIComponent(m[1]);
		if (agent.denied[ip]) {
			return jsonResponse({
				shares: [],
				denied: true,
				reason: agent.deniedReason[ip] || "",
				detail: agent.deniedDetail[ip] || "",
			});
		}
		return jsonResponse({ shares: agent.shares[ip] || [], denied: false });
	}
	if (path === "/fs/stat") {
		if (agent.mountDenied) {
			return jsonResponse(
				{ error: agent.mountDenied, reason: agent.mountDenied, detail: agent.mountDeniedDetail || "" },
				403
			);
		}
		const rel = String((body && body.path) || "");
		if (rel === "missing.txt") return jsonResponse({ error: "not_found", detail: "no such file" }, 404);
		if (rel) return jsonResponse({ isFile: true, isDirectory: false, size: 5, created: 0, modified: 1700000000000 });
		return jsonResponse({ isFile: false, isDirectory: true, size: 0, created: 0, modified: 1700000000000 });
	}
	if (path === "/fs/list") {
		if (agent.mountDenied) {
			return jsonResponse({ error: agent.mountDenied, detail: agent.mountDeniedDetail || "" }, 403);
		}
		return jsonResponse({
			entries: [
				{ name: "photos", isDir: true, size: 0, modified: 1700000000000, created: 1690000000000 },
				{ name: "notes.txt", isDir: false, size: 5, modified: 1700000000001, created: 1690000000001 },
			],
			count: 2,
			path: String((body && body.path) || ""),
		});
	}
	if (path === "/fs/read") {
		return jsonResponse({ data: Buffer.from("hello", "utf8").toString("base64"), size: 5, path: "notes.txt" });
	}
	return jsonResponse({ error: "not_found", detail: "no route" }, 404);
};

/* --------------------------------------------------------------- load app */

const stripped = source.replace(/^const html = await loadHtml\("body.html"\);\s*/, "").replace(/\nreturn proc;\s*$/, "");

const factory = new Function(
	"globals",
	`return (async () => {
		const {
			util, convert, fs, UserPaths, LogLevel, loadHtml, ThirdPartyAppProcess, FilesystemDrive,
			HTMLInputElement, HTMLFormElement, Element, navigator, document, fetch,
			location, setTimeout, clearTimeout, setInterval, clearInterval, AbortController
		} = globals;
		const html = await loadHtml("body.html");
		${stripped}
		return proc;
	})();`
);

const globals = {
	util,
	convert,
	fs: fakeFs,
	UserPaths: { Downloads: "U:/Home/Downloads", Documents: "U:/Home/Documents" },
	LogLevel: { info: "info", warning: "warning", error: "error", critical: "critical" },
	loadHtml: async (p) => (p === "body.html" ? bodyHtml : undefined),
	ThirdPartyAppProcess,
	// ArcOS supplies the real base class; the harness exercises the fallback
	// stub in process.js by leaving it undefined.
	FilesystemDrive: undefined,
	HTMLInputElement: window.HTMLInputElement,
	HTMLFormElement: window.HTMLFormElement,
	Element: window.Element,
	navigator: window.navigator,
	document,
	location: window.location,
	fetch: fakeFetch,
	setTimeout,
	clearTimeout,
	setInterval,
	clearInterval,
	AbortController,
};

function text(sel) {
	const el = bodyEl.querySelector(sel);
	return el ? el.textContent.trim() : "";
}
function click(sel) {
	const el = bodyEl.querySelector(sel);
	if (!el) throw new Error("missing element for click: " + sel);
	el.click();
}
function submit(sel) {
	const el = bodyEl.querySelector(sel);
	if (!el) throw new Error("missing element for submit: " + sel);
	const ev = new window.Event("submit", { bubbles: true, cancelable: true });
	el.dispatchEvent(ev);
}
function appPrefs() {
	return (prefsState.appPreferences && prefsState.appPreferences["NikN_ArcSD"]) || {};
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------- tests */

(async () => {
	const Proc = await factory(globals);
	const proc = new Proc(1, 0, {}, "op", "U:/Applications/NikN_ArcSD");

	await proc.render();

	check("render() produced the app shell", !!bodyEl.querySelector(".sd-app"));
	eq("starts disconnected from helper", text('[data-role="conn"]'), "disconnected from helper");
	check("tabs hidden while disconnected", bodyEl.querySelector('[data-role="tabs"]').hidden === true);
	check("setup is the main view while disconnected", bodyEl.querySelector('[data-role="setup"]').hidden === false);
	check("manual view hidden while disconnected", bodyEl.querySelector('[data-role="view-manual"]').hidden === true);
	check("discovered view hidden", bodyEl.querySelector('[data-role="view-discovered"]').hidden === true);
	check("empty state explains UNC", bodyEl.querySelector('[data-role="entries"]').innerHTML.indexOf("UNC path") > -1);
	check("generate enabled once the payload is loaded", bodyEl.querySelector('[data-action="generate"]').disabled === false);
	eq("no delivery target preference is written", appPrefs().deliveryTarget, undefined);
	check("helper source loaded from the payload", proc._agentSource === agentSource);

	/* manual entry: pasted UNC fills both fields */
	const fHost = bodyEl.querySelector('[data-role="f-host"]');
	const fShare = bodyEl.querySelector('[data-role="f-share"]');
	const fLabel = bodyEl.querySelector('[data-role="f-label"]');
	fHost.value = "\\\\NAS01\\media";
	fShare.value = "";
	fLabel.value = "Home NAS";
	submit('[data-role="entry-form"]');

	let entries = appPrefs().entries || [];
	eq("one entry stored", entries.length, 1);
	eq("host normalised from pasted UNC", entries[0].host, "NAS01");
	eq("share adopted from pasted UNC", entries[0].share, "media");
	eq("label stored", entries[0].label, "Home NAS");
	eq("form cleared after add", fHost.value, "");
	check("row rendered", bodyEl.querySelectorAll(".sd-entry").length === 1);
	check("row shows the UNC path", bodyEl.querySelector(".sd-entry-path").textContent === "\\\\NAS01\\media");

	/* Browse on a saved host: without the helper it must offer setup, not fail silently */
	check("saved host has a Browse action", !!bodyEl.querySelector('.sd-entry [data-action="browse"]'));
	click('.sd-entry [data-action="browse"]');
	check("browse opens the helper setup when offline", bodyEl.querySelector('[data-role="setup"]').hidden === false);
	check("setup names the host that needed the helper", /NAS01/.test(text('[data-role="setup-status"]')));
	click('[data-action="close-setup"]');
	check("setup closes again", bodyEl.querySelector('[data-role="setup"]').hidden === true);

	/* duplicate updates the label instead of appending */
	fHost.value = "nas01";
	fShare.value = "MEDIA";
	fLabel.value = "Renamed";
	submit('[data-role="entry-form"]');
	entries = appPrefs().entries;
	eq("duplicate does not append", entries.length, 1);
	eq("duplicate updates the label", entries[0].label, "Renamed");
	check("status says updated", /Updated/.test(text('[data-role="status"]')));

	/* hostile label must render as text */
	fHost.value = "nas01";
	fShare.value = "evil";
	fLabel.value = '<img src=x onerror="alert(1)">';
	submit('[data-role="entry-form"]');
	entries = appPrefs().entries;
	eq("second entry stored", entries.length, 2);
	check("no injected img element", bodyEl.querySelectorAll(".sd-entry img").length === 0);
	check("markup escaped in the row", bodyEl.innerHTML.indexOf("&lt;img src=x") > -1);

	/* copy uses the exact UNC string */
	clipboard.length = 0;
	click('.sd-entry [data-action="copy"]');
	await new Promise((r) => setTimeout(r, 10));
	eq("clipboard got the UNC path", clipboard[0], "\\\\NAS01\\media");

	/* delete needs two clicks */
	click('.sd-entry [data-action="delete"]');
	check("first delete asks for confirmation", bodyEl.querySelector('.sd-entry [data-action="delete"]').textContent.trim() === "Sure?");
	eq("entry still present", (appPrefs().entries || []).length, 2);
	click('.sd-entry [data-action="delete"]');
	eq("second delete removes it", (appPrefs().entries || []).length, 1);

	/* 500-entry cap */
	const many = [];
	for (let i = 0; i < 500; i++) many.push({ id: "e_" + i, host: "h" + i, share: "", label: "", createdAt: i });
	proc._entries = many.slice();
	proc._persistEntries();
	bodyEl.querySelector('[data-role="f-host"]').value = "overflow";
	bodyEl.querySelector('[data-role="f-share"]').value = "";
	submit('[data-role="entry-form"]');
	eq("cap refuses the 501st", (appPrefs().entries || []).length, 500);
	check("cap message visible", /500/.test(text('[data-role="status"]')));

	/* restore a small manual list for the connected-mode checks */
	proc._entries = [{ id: "e_keep", host: "NAS01", share: "media", label: "Home NAS", createdAt: 1 }];
	proc._persistEntries();
	proc._renderEntries();
	eq("manual list restored", bodyEl.querySelectorAll(".sd-entry").length, 1);

	/* helper delivery: download is the primary action */
	click('[data-action="generate"]');
	eq("one download triggered", downloads.length, 1);
	eq("download filename", downloads[0].name, "arcos-share-agent.cmd");
	const downloaded = Buffer.from(new Uint8Array(downloads[0].buffer)).toString("utf8");
	check("downloaded file is the self-extracting cmd", downloaded.indexOf("@echo off") === 0 && downloaded.indexOf("%TEMP%\\arcos-share-agent.b64") > -1);
	check(
		"cmd carries the origin the app is served from",
		downloaded.indexOf('set "ARCSD_ORIGIN=https://beta.arcweb.nl"') > -1,
		downloaded.split("\r\n").slice(0, 6).join(" | ")
	);
	check("cmd does not leak a wildcard origin", downloaded.indexOf("ARCSD_ORIGIN=*") === -1);
	eq("download writes nothing to ArcOS files", writes.length, 0);
	check("download keeps copy-path hidden", bodyEl.querySelector('[data-action="copy-path"]').hidden === true);
	check("download status names the file", text('[data-role="setup-status"]').indexOf("arcos-share-agent.cmd") > -1);

	/* secondary link: keep a copy in ArcOS files */
	click('[data-action="save-arcos"]');
	await new Promise((r) => setTimeout(r, 30));
	eq("one fs write triggered", writes.length, 1);
	eq("written to ArcOS downloads", writes[0].path, "U:/Home/Downloads/arcos-share-agent.cmd");
	check("written content is the cmd", String(writes[0].text).indexOf("@echo off") === 0);
	check("copy path button revealed", bodyEl.querySelector('[data-action="copy-path"]').hidden === false);

	/* connect */
	agent.online = true;
	await proc._pollHealth();
	check("connected after health", text('[data-role="conn"]') === "connected to helper");
	check("tabs shown", bodyEl.querySelector('[data-role="tabs"]').hidden === false);
	check("discovered view active", bodyEl.querySelector('[data-role="view-discovered"]').hidden === false);
	check("rescan button present", !!bodyEl.querySelector('[data-action="rescan"]'));
	await new Promise((r) => setTimeout(r, 50));
	eq("hosts rendered after the automatic scan", bodyEl.querySelectorAll(".sd-host").length, 3);
	check("host HTML is escaped", bodyEl.querySelector('[data-role="hosts"]').innerHTML.indexOf("<b>broken") === -1);
	eq("manual entries still present behind the tab", bodyEl.querySelectorAll(".sd-entry").length, 1);

	/* shares: admin hidden by default, filter narrows */
	await proc._loadShares("10.20.30.20");
	await new Promise((r) => setTimeout(r, 20));
	eq("non-admin shares listed", bodyEl.querySelectorAll(".sd-share").length, 1);
	check("filter box rendered", !!bodyEl.querySelector('[data-role="share-filter"]'));
	const filter = bodyEl.querySelector('[data-role="share-filter"]');
	filter.value = "zzz";
	filter.dispatchEvent(new window.Event("input", { bubbles: true }));
	eq("filter hides everything", bodyEl.querySelectorAll(".sd-share").length, 0);
	check("filter explains the empty list", /No share matches/.test(bodyEl.querySelector('[data-role="share-list"]').textContent));
	const filter2 = bodyEl.querySelector('[data-role="share-filter"]');
	filter2.value = "";
	filter2.dispatchEvent(new window.Event("input", { bubbles: true }));
	eq("clearing the filter restores rows", bodyEl.querySelectorAll(".sd-share").length, 1);
	check("filter input kept focus-able identity", bodyEl.querySelector('[data-role="share-filter"]') !== null);

	eq("administrative shares are hidden entirely", bodyEl.querySelectorAll(".sd-share").length, 1);
	check("no show-admin toggle anymore", bodyEl.querySelector('[data-role="show-admin"]') === null);

	/* denied state */
	agent.denied["10.20.30.21"] = true;
	proc._selectedHost = "10.20.30.21";
	await proc._loadShares("10.20.30.21");
	check("denied state explains credentials", /needs credentials/.test(bodyEl.querySelector('[data-role="shares"]').textContent));
	check("credential form present", !!bodyEl.querySelector('[data-role="cred-form"]'));

	/* A refused sign-in has to say so. Re-prompting with an empty form looks
	   exactly like nothing happened, which is how "even with real creds" reads. */
	agent.denied["10.20.30.22"] = true;
	agent.deniedReason["10.20.30.22"] = "bad_credentials";
	agent.deniedDetail["10.20.30.22"] =
		"Signing in to \\\\10.20.30.22\\ipc$ as CONTOSO\\alice failed with system error 2. System error 1326 has occurred.";
	proc._selectedHost = "10.20.30.22";
	await proc._loadShares("10.20.30.22", { username: "alice", password: "nope", domain: "CONTOSO" });
	const deniedPane = bodyEl.querySelector('[data-role="shares"]').textContent;
	check("credentialed refusal is reported as such", /credentials were refused/.test(deniedPane));
	check("refusal names the account that was tried", deniedPane.indexOf("CONTOSO\\alice") > -1);
	check("refusal explains a wrong password", /did not accept that account or password/.test(deniedPane));
	check("refusal shows the helper's raw detail", /System error 1326/.test(deniedPane));
	eq("username is kept in the form after a refusal", bodyEl.querySelector('[data-role="c-user"]').value, "alice");
	eq("domain is kept in the form after a refusal", bodyEl.querySelector('[data-role="c-domain"]').value, "CONTOSO");
	eq("password is never put back in the form", bodyEl.querySelector('[data-role="c-pass"]').value, "");

	/* The sign-in sticks to the host. Clicking away and back must not ask again —
	   that is the whole point of remembering it for the window. */
	agent.requests.length = 0;
	proc._selectedHost = "10.20.30.21";
	await proc._loadShares("10.20.30.21");
	const anonAttempt = agent.requests.filter((r) => /10\.20\.30\.21\/shares$/.test(r.url)).pop();
	check(
		"a host without a saved sign-in is still asked anonymously",
		!(anonAttempt.body && anonAttempt.body.username),
		JSON.stringify(anonAttempt.body)
	);

	proc._selectedHost = "10.20.30.22";
	await proc._loadShares("10.20.30.22");
	const reused = agent.requests.filter((r) => /10\.20\.30\.22\/shares$/.test(r.url)).pop();
	eq("returning to a host reuses the username", reused.body && reused.body.username, "alice");
	eq("returning to a host reuses the password", reused.body && reused.body.password, "nope");
	check(
		"a reused sign-in that fails says it was remembered",
		/saved sign-in was refused/.test(bodyEl.querySelector('[data-role="shares"]').textContent)
	);

	/* in memory only: a password on disk would be a plain-text credential */
	check("no password value reaches preferences", JSON.stringify(prefsState).indexOf("nope") === -1);
	check("no password field reaches preferences", JSON.stringify(prefsState).indexOf("password") === -1);

	/* Forget drops the pair, so the host is asked anonymously again */
	check("a remembered sign-in can be forgotten", !!bodyEl.querySelector('[data-action="forget-creds"]'));
	click('[data-action="forget-creds"]');
	check("forgetting returns the sign-in form", /Sign in to list shares/.test(bodyEl.querySelector('[data-role="shares"]').textContent));
	agent.requests.length = 0;
	proc._selectedHost = "10.20.30.22";
	await proc._loadShares("10.20.30.22");
	const afterForget = agent.requests.filter((r) => /10\.20\.30\.22\/shares$/.test(r.url)).pop();
	check(
		"after Forget the host is asked anonymously",
		!(afterForget.body && afterForget.body.username),
		JSON.stringify(afterForget.body)
	);

	/* the helper's reason picks the advice, so a closed port is not blamed on passwords */
	agent.deniedReason["10.20.30.22"] = "unreachable";
	await proc._loadShares("10.20.30.22");
	check("an unreachable host is not blamed on the password", /Nothing answered on port 445/.test(bodyEl.querySelector('[data-role="shares"]').textContent));

	/* a fresh anonymous attempt must go back to the neutral wording */
	agent.deniedReason["10.20.30.22"] = "";
	agent.deniedDetail["10.20.30.22"] = "";
	await proc._loadShares("10.20.30.22");
	check("anonymous denial returns to the neutral wording", /needs credentials/.test(bodyEl.querySelector('[data-role="shares"]').textContent));

	/* a slow answer for a host the user left must not repaint the pane */
	proc._selectedHost = "10.20.30.20";
	const late = proc._loadShares("10.20.30.21");
	await late;
	check("stale host answer ignored", !/needs credentials/.test(bodyEl.querySelector('[data-role="shares"]').textContent));

	await proc._loadShares("10.20.30.20");
	await new Promise((r) => setTimeout(r, 20));

	/* ------------------------------------------------------------ SMB drive */
	/* A disk share can be mounted as a read-only drive; a print queue or IPC$
	   has no filesystem, so it gets no button at all. */
	eq("mount offered for each disk share only", bodyEl.querySelectorAll('[data-action="mount-share"]').length, 1);
	check("administrative shares are hidden from the list", bodyEl.querySelectorAll(".sd-share").length === 1);

	click('[data-action="mount-share"]');
	await wait(60);
	eq("one drive mounted", Object.keys(fakeFs.drives).length, 1);
	const mediaDrive = fakeFs.drives["arcsd-share-10.20.30.20__media"];
	check("the drive id names the share", !!mediaDrive, Object.keys(fakeFs.drives).join(","));
	eq("the next free letter is used", mediaDrive && mediaDrive.driveLetter, "N");
	eq("the drive is labelled with its UNC path", mediaDrive && mediaDrive.label, "\\\\10.20.30.20\\media");
	eq("the drive is read-only", mediaDrive && mediaDrive.READONLY, true);
	eq("the drive does not claim write support", mediaDrive && mediaDrive.CAPABILITIES.writeFile, false);
	eq("the drive does not claim delete support", mediaDrive && mediaDrive.CAPABILITIES.deleteItem, false);
	check("mount reports the letter", /Mounted .* as N:/.test(text('[data-role="status"]')), text('[data-role="status"]'));
	check("the row now offers Unmount", (bodyEl.querySelector('[data-action="unmount-share"]') || {}).textContent.indexOf("N:") > -1);

	const root = await mediaDrive.readDir("/");
	eq("readDir lists the folders", root.totalFolders, 1);
	eq("readDir lists the files", root.totalFiles, 1);
	eq("readDir totals the sizes", root.totalSize, 5);
	eq("a folder keeps its name", root.dirs[0].name, "photos");
	eq("a file gets a mime type", root.files[0].mimeType, "text/plain");
	eq("an item id is the share path", root.files[0].itemId, "\\\\10.20.30.20\\media\\notes.txt");
	eq("readDir returns a shortcut store", typeof root.shortcuts, "object");

	const bytes = await mediaDrive.readFile("/notes.txt");
	eq("readFile decodes the base64 body", Buffer.from(new Uint8Array(bytes)).toString("utf8"), "hello");
	eq("readFile on the root reads nothing", await mediaDrive.readFile(""), undefined);

	const st = await mediaDrive.stat("/");
	eq("stat reports a folder", st.isDirectory, true);
	eq("stat keeps the modification time", st.modified, 1700000000000);
	eq("stat of a missing file is undefined", await mediaDrive.stat("/missing.txt"), undefined);

	const quota = await mediaDrive.quota();
	check("quota never divides by zero", quota.max > 0 && quota.unknown === true, JSON.stringify(quota));

	/* A short cache saves round trips for one click, but must not outlive it. */
	const listCalls = () => agent.requests.filter((r) => r.url.indexOf("/fs/list") > -1).length;
	const before = listCalls();
	await mediaDrive.readDir("/");
	eq("a second readDir inside the cache window costs no request", listCalls(), before);
	mediaDrive._listings.clear();
	await mediaDrive.readDir("/");
	eq("a listing that left the cache is fetched again", listCalls(), before + 1);
	/* Mounting the same share twice must not register a second drive. */
	await proc._mountShare("10.20.30.20", "media");
	eq("a second mount of the same share is refused", Object.keys(fakeFs.drives).length, 1);
	check("it says the share is already mounted", /already mounted/.test(text('[data-role="status"]')));

	/* A refused spin-up must leave no drive behind and explain itself. */
	// Unmount first so the next mount is a fresh attempt.
	click('[data-action="unmount-share"]');
	await wait(60);
	agent.mountDenied = "anonymous";
	agent.mountDeniedDetail = "The host refuses anonymous sign-in.";
	fakeFs.nextLetter = "O";
	click('.sd-share [data-action="mount-share"][data-share="media"]');
	await wait(60);
	eq("a failed mount registers nothing", Object.keys(fakeFs.drives).length, 0);
	check("a failed mount explains why", /refuses anonymous access/.test(text('[data-role="status"]')), text('[data-role="status"]'));
	const retryBtn = bodyEl.querySelector('.sd-share [data-action="mount-share"][data-share="media"]');
	check("a failed mount leaves the button usable again", !!retryBtn && retryBtn.disabled === false);
	eq("the reason survives on the discarded drive", fakeFs.lastFailed.state.reason, "anonymous");
	check(
		"an unknown reason falls back to the helper's detail",
		proc._mountFailureText({ reason: "", detail: "boom" }, "h", "s") === "Could not mount \\\\h\\s: boom"
	);
	agent.mountDenied = "";
	agent.mountDeniedDetail = "";

	/* Unmount removes the drive, not the files. */
	// Re-mount so there is something to unmount.
	click('[data-action="mount-share"][data-share="media"]');
	await wait(60);
	click('[data-action="unmount-share"]');
	await wait(60);
	eq("unmount drops the drive", Object.keys(fakeFs.drives).length, 0);
	check("unmount reports it", /Unmounted .*\\\\10\.20\.30\.20\\media/.test(text('[data-role="status"]')), text('[data-role="status"]'));
	eq("the row offers Mount again", bodyEl.querySelectorAll('[data-action="mount-share"]').length, 1);

	/* A drive the helper cannot open must not mount an empty folder either. */
	agent.mountDenied = "unreachable";
	agent.mountDeniedDetail = "Nothing answered on 445.";
	click('.sd-share [data-action="mount-share"][data-share="media"]');
	await wait(60);
	eq("an unreachable share mounts nothing", Object.keys(fakeFs.drives).length, 0);
	check("an unreachable share is not blamed on credentials", /nothing answered on port 445/.test(text('[data-role="status"]')));
	agent.mountDenied = "";
	agent.mountDeniedDetail = "";
	fakeFs.nextLetter = "N";

	/* a host with 445 closed is explained without asking the helper */
	agent.requests.length = 0;
	click('.sd-host[data-ip="10.20.30.40"]');
	await wait(30);
	check("closed 445 explained", /No SMB service/.test(bodyEl.querySelector('[data-role="shares"]').textContent));
	eq("no enumeration request for a closed port", agent.requests.filter((r) => /\/shares$/.test(r.url)).length, 0);
	click('.sd-shares [data-action="retry-shares"]');
	await wait(30);
	check("Try anyway does ask the helper", agent.requests.some((r) => /\/shares$/.test(r.url)));
	check("Try anyway reports an empty result", /reported no shares/.test(bodyEl.querySelector('[data-role="shares"]').textContent));

	/* A saved host need not appear in a scan — Browse must still open it. */
	agent.requests.length = 0;
	agent.shares["NAS01"] = [{ name: "media", type: "Disk", comment: "Media library" }];
	click('[data-action="view"][data-view="manual"]');
	click('.sd-entry [data-action="browse"]');
	await wait(40);
	eq("browse switches to the discovered view", bodyEl.querySelector('[data-role="view-discovered"]').hidden, false);
	eq("browse selects the saved host", proc._selectedHost, "NAS01");
	check("saved host gets a row of its own", !!bodyEl.querySelector('.sd-host[data-ip="NAS01"]'));
	check("saved host row says where it came from", /Saved host/.test(bodyEl.querySelector('.sd-host[data-ip="NAS01"]').textContent));
	check("saved host is enumerated", agent.requests.some((r) => /\/hosts\/NAS01\/shares$/.test(r.url)));
	check("the share that was saved is marked", /Saved/.test(bodyEl.querySelector('[data-role="share-list"]').textContent));

	/* A rescan must not steal the selection from a saved host it did not find. */
	await proc._scan("passive");
	eq("a rescan keeps the saved host selected", proc._selectedHost, "NAS01");
	delete agent.shares["NAS01"];

	/* disconnect */
	agent.online = false;
	await proc._pollHealth();
	check("back to disconnected from helper", text('[data-role="conn"]') === "disconnected from helper");
	check("tabs hidden again", bodyEl.querySelector('[data-role="tabs"]').hidden === true);
	eq("manual list survives disconnect", bodyEl.querySelectorAll(".sd-entry").length, 1);
	check("status says the helper stopped", /helper stopped/i.test(text('[data-role="status"]')));

	console.log(failures ? "\n" + failures + " FAILURE(S)" : "\nall UI checks passed");
	process.exit(failures ? 1 : 0);
})().catch((e) => {
	console.error("HARNESS ERROR:", e && e.stack ? e.stack : e);
	process.exit(2);
});
