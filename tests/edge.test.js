/*
 * Edge-case harness: corrupt preferences, restart persistence, helper version
 * mismatch, credential submission, and cancelling a sweep. Shares the same
 * fake shell/agent approach as ui-test.js.
 */
const fsNode = require("fs");
const pathNode = require("path");
const { JSDOM } = require("jsdom");

const repo = pathNode.resolve(__dirname, "..");
const source = fsNode.readFileSync(pathNode.join(repo, "src", "process.js"), "utf8");
const expectedAgentVersion = (source.match(/AGENT_VERSION = "([^"]+)"/) || [])[1];
const bodyHtml = fsNode.readFileSync(pathNode.join(repo, "src", "body.html"), "utf8");
const agentSource = fsNode.readFileSync(pathNode.join(repo, "src", "agent", "agent.ps1"), "utf8");

let failures = 0;
function check(label, condition, extra) {
	if (condition) console.log("ok   " + label);
	else {
		failures++;
		console.log("FAIL " + label + (extra ? " :: " + extra : ""));
	}
}
function eq(label, actual, expected) {
	check(label, actual === expected, "got " + JSON.stringify(actual) + " want " + JSON.stringify(expected));
}

const dom = new JSDOM('<!doctype html><html><body><div id="NikN_ArcSD"><div class="body"></div></div></body></html>');
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
Object.defineProperty(window.navigator, "clipboard", {
	value: { writeText: async () => {} },
	configurable: true,
});

const util = {
	htmlspecialchars: (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"),
	join: (...p) => p.filter((x) => x !== undefined && x !== "").join("/").replace(/\/+/g, "/"),
	DownloadFile: (b, n) => downloads.push({ b, n }),
	formatBytes: (n) => n + " B",
};
const convert = {
	arrayToText: (b) => Buffer.from(new Uint8Array(b)).toString("utf8"),
	textToArrayBuffer: (t) => {
		const bytes = Buffer.from(t, "utf8");
		return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
	},
	textToBlob: (t) => ({ __text: t }),
};
const fakeFs = {
	readFile: async (p) =>
		String(p).replace(/\\/g, "/").endsWith("agent/agent.ps1") ? convert.textToArrayBuffer(agentSource) : undefined,
	writeFile: async (p, blob) => {
		writes.push({ path: p, text: blob && blob.__text });
		return true;
	},
};

class ThirdPartyAppProcess {
	constructor(pid, parentPid, app, operationId, workingDirectory) {
		this.pid = pid;
		this.workingDirectory = workingDirectory;
		this.userPreferences = userPreferences;
		this.logs = [];
	}
	getBody() {
		return bodyEl;
	}
	Log(message, level) {
		this.logs.push({ message, level });
	}
}

const agent = {
	online: false,
	version: expectedAgentVersion,
	hangScan: false,
	hosts: [{ ip: "10.20.30.20", hostname: "nas", workgroup: "WORKGROUP", sources: ["netbios"], port445: true, rttMs: 3 }],
	requests: [],
};

function jsonResponse(payload, status) {
	return { ok: (status || 200) < 400, status: status || 200, text: async () => JSON.stringify(payload) };
}

const fakeFetch = async (url, init) => {
	const method = (init && init.method) || "GET";
	agent.requests.push({ url: String(url), method, body: init && init.body ? JSON.parse(init.body) : null });
	if (!agent.online) throw new TypeError("Failed to fetch");
	const path = new URL(String(url)).pathname;
	if (path === "/health") {
		return jsonResponse({ ok: true, version: agent.version, hostname: "DESKTOP-TEST" });
	}
	if (path === "/scan") {
		if (agent.hangScan) {
			return new Promise((resolve, reject) => {
				const signal = init.signal;
				signal.addEventListener("abort", () => {
					const err = new Error("aborted");
					err.name = "AbortError";
					reject(err);
				});
			});
		}
		return jsonResponse({ hosts: agent.hosts });
	}
	const m = path.match(/^\/hosts\/([^/]+)\/shares$/);
	if (m) return jsonResponse({ shares: [], denied: true });
	return jsonResponse({ error: "not_found" }, 404);
};

const stripped = source
	.replace(/^const html = await loadHtml\("body.html"\);\s*/, "")
	.replace(/\nreturn proc;\s*$/, "");

const factory = new Function(
	"globals",
	`return (async () => {
		const {
			util, convert, fs, UserPaths, LogLevel, loadHtml, ThirdPartyAppProcess,
			HTMLInputElement, HTMLFormElement, Element, navigator, document, fetch,
			setTimeout, clearTimeout, setInterval, clearInterval, AbortController
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
	UserPaths: { Downloads: "U:/Home/Downloads" },
	LogLevel: { info: "info", warning: "warning", error: "error", critical: "critical" },
	loadHtml: async () => bodyHtml,
	ThirdPartyAppProcess,
	HTMLInputElement: window.HTMLInputElement,
	HTMLFormElement: window.HTMLFormElement,
	Element: window.Element,
	navigator: window.navigator,
	document,
	fetch: fakeFetch,
	setTimeout,
	clearTimeout,
	setInterval,
	clearInterval,
	AbortController,
};

function appPrefs() {
	return (prefsState.appPreferences && prefsState.appPreferences["NikN_ArcSD"]) || {};
}
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
	el.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
	const Proc = await factory(globals);

	/* ---------------------------------------------- corrupt stored preferences */
	prefsState = {
		appPreferences: {
			NikN_ArcSD: {
				entries: "not-an-array",
				deliveryTarget: "floppy",
				agentUrl: "  http://localhost:9999/  ",
			},
		},
	};
	let proc = new Proc(1, 0, {}, "op", "U:/Applications/NikN_ArcSD");
	await proc.render();
	eq("corrupt entries degrade to empty", proc._entries.length, 0);
	check("empty state still renders", bodyEl.querySelector(".sd-empty") !== null);
	check("legacy deliveryTarget preference no longer gates the button", bodyEl.querySelector('[data-action="generate"]').disabled === false);
	eq("agent url trimmed and de-slashed", proc._agentUrl, "http://localhost:9999");
	check("a log line explains the corrupt list", proc.logs.some((l) => /unreadable/.test(l.message)));

	/* malformed individual entries are dropped or repaired */
	prefsState = {
		appPreferences: {
			NikN_ArcSD: {
				entries: [
					{ host: "" },
					{ host: "a", share: null, id: 7 },
					{ host: "nas02", share: "media", label: "x".repeat(100), createdAt: 5 },
					null,
				],
			},
		},
	};
	bodyEl.innerHTML = "";
	proc = new Proc(1, 0, {}, "op", "U:/Applications/NikN_ArcSD");
	await proc.render();
	eq("only usable entries survive", proc._entries.length, 2);
	const repaired = proc._entries.find((e) => e.host === "a");
	const capped = proc._entries.find((e) => e.host === "nas02");
	check("missing id is regenerated", !!repaired && typeof repaired.id === "string" && repaired.id.length > 2);
	eq("null share becomes empty string", repaired && repaired.share, "");
	eq("label capped at 64 chars", capped && capped.label.length, 64);
	eq("entries sorted by createdAt", proc._entries[0].host, "nas02");

	/* ------------------------------------------------------ restart persistence */
	prefsState = {
		appPreferences: {
			NikN_ArcSD: {
				entries: [{ id: "e_1", host: "NAS01", share: "media", label: "Home NAS", createdAt: 1 }],
				agentUrl: "http://127.0.0.1:8791",
			},
		},
	};
	bodyEl.innerHTML = "";
	proc = new Proc(1, 0, {}, "op", "U:/Applications/NikN_ArcSD");
	await proc.render();
	eq("saved entry restored", bodyEl.querySelectorAll(".sd-entry").length, 1);
	check("generate enabled from the payload alone", bodyEl.querySelector('[data-action="generate"]').disabled === false);
	eq("saved agent url restored", proc._agentUrl, "http://127.0.0.1:8791");

	/* ------------------------------------------------------------- agent url change */
	const urlBox = bodyEl.querySelector('[data-role="agent-url"]');
	urlBox.value = "localhost:1234/";
	click('[data-action="save-url"]');
	eq("agent url normalised on save", appPrefs().agentUrl, "http://localhost:1234");
	eq("live url updated", proc._agentUrl, "http://localhost:1234");
	check("save confirms in the setup panel", /Helper address set to/.test(text('[data-role="setup-status"]')));

	/* --------------------------------------------------------- helper version mismatch */
	proc._agentUrl = "http://127.0.0.1:8790";
	agent.online = true;
	agent.version = "0.9.0";
	await proc._pollHealth();
	check("outdated helper opens the setup panel", bodyEl.querySelector('[data-role="setup"]').hidden === false);
	check("outdated helper message shown", /v0\.9\.0/.test(text('[data-role="setup-status"]')));
	check("still connected (version only warns)", text('[data-role="conn"]') === "connected to helper");
	/* ------------------------------------------------------------- cancel a sweep */
	agent.hangScan = true;
	click('[data-action="sweep"]');
	await wait(1200);
	check("scan status shows elapsed time", /\d+s/.test(text('[data-role="scan-status"]')), text('[data-role="scan-status"]'));
	check("cancel button visible during scan", bodyEl.querySelector('[data-action="cancel-scan"]').hidden === false);
	click('[data-action="cancel-scan"]');
	await wait(50);
	check("cancel reported to the user", /Cancelled here/.test(text('[data-role="scan-status"]')), text('[data-role="scan-status"]'));
	eq("scan state cleared", proc._scanning, false);
	check("sweep grace window set", proc._helperBusyUntil > Date.now());
	check("still considered connected", text('[data-role="conn"]') === "connected to helper");

	/* a health failure inside the grace window must not flip to manual mode */
	agent.online = false;
	await proc._pollHealth();
	check("busy helper is not treated as gone", text('[data-role="conn"]') === "connected to helper");
	proc._helperBusyUntil = 0;
	await proc._pollHealth();
	check("real failure after the grace window flips to manual", text('[data-role="conn"]') === "disconnected from helper");

	console.log(failures ? "\n" + failures + " FAILURE(S)" : "\nall edge checks passed");
	process.exit(failures ? 1 : 0);
})().catch((e) => {
	console.error("HARNESS ERROR:", e && e.stack ? e.stack : e);
	process.exit(2);
});
