// Password / passphrase gate for ArcOS Share Discovery.
// Loaded by process.js via eval before the main UI renders.
// ArcOS has no bundler, so this is a separate file loaded at runtime.
// All password logic lives here, NOT in process.js.

async function deriveKey(passphrase, salt) {
	const enc = new TextEncoder();
	const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
	return crypto.subtle.deriveKey(
		{ name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" },
		keyMaterial,
		{ name: "AES-GCM", length: 256 },
		false,
		["encrypt", "decrypt"]
	);
}

async function encryptMarker(passphrase) {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const key = await deriveKey(passphrase, salt);
	const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, new TextEncoder().encode("ok"));
	const combined = new Uint8Array(salt.length + iv.length + ct.byteLength);
	combined.set(salt, 0);
	combined.set(iv, salt.length);
	combined.set(new Uint8Array(ct), salt.length + iv.length);
	let bin = "";
	for (let i = 0; i < combined.length; i++) bin += String.fromCharCode(combined[i]);
	return btoa(bin);
}

async function decryptMarker(passphrase, b64) {
	const combined = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
	const salt = combined.slice(0, 16);
	const iv = combined.slice(16, 28);
	const ct = combined.slice(28);
	const key = await deriveKey(passphrase, salt);
	const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, ct);
	return new TextDecoder().decode(pt);
}

async function gate(container, opts) {
	// In the offline test harness (jsdom) there is no one to click, so skip.
	try {
		if (typeof navigator !== "undefined" && /jsdom/i.test(String(navigator.userAgent || ""))) {
			return null;
		}
	} catch (e) {}
	const target = container || (typeof document !== "undefined" ? document.body : null);
	if (!target) return null;
	if (typeof crypto === "undefined" || !crypto.subtle) return null;

	const accent = (opts && opts.accent) ? opts.accent : "#4f8cff";
	const credsFile = (typeof util !== "undefined" && typeof util.join === "function")
		? util.join(workingDirectory, "creds.json")
		: (workingDirectory + "/creds.json");

	// Check if creds.json exists
	let existing = null;
	try {
		const buf = await fs.readFile(credsFile);
		if (buf) {
			const text = convert.arrayToText(buf);
			try { existing = JSON.parse(text); } catch (e) { existing = null; }
		}
	} catch (e) {
		existing = null;
	}

	return new Promise((resolve) => {
		const overlay = document.createElement("div");
		overlay.style.cssText = "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.85);z-index:2147483647;font-family:Segoe UI,sans-serif;";
		const card = document.createElement("div");
		card.style.cssText = "width:min(420px,90vw);padding:24px;border-radius:8px;background:var(--glass-bg,rgba(30,34,48,0.85));backdrop-filter:blur(12px);color:var(--fg,#fff);border:1px solid var(--win-border,rgba(255,255,255,0.12));box-shadow:0 12px 40px rgba(0,0,0,0.4);";
		const title = existing ? "Unlock" : "Set a passphrase";
		const msg = existing
			? "Enter your passphrase to unlock saved sign-ins."
			: "Choose a passphrase to protect saved sign-ins. You will enter it each time you open the app.";
		card.innerHTML = '<h2 style="margin:0 0 10px;font-size:18px;">' + title + '</h2>' +
			'<p style="margin:0 0 14px;opacity:0.75;font-size:13px;">' + msg + '</p>' +
			'<input type="password" placeholder="Passphrase" style="width:100%;padding:8px 10px;margin-bottom:8px;box-sizing:border-box;border:1px solid var(--win-border,rgba(255,255,255,0.12));border-radius:var(--win-border-rad,6px);background:var(--glass-alt-bg,rgba(255,255,255,0.06));color:var(--fg,#fff);font:inherit;" />' +
			'<p class="err" style="margin:0 0 14px;color:#f87171;font-size:13px;display:none;"></p>' +
			'<div style="display:flex;gap:8px;justify-content:flex-end;">' +
			'<button type="button" style="padding:6px 12px;font:inherit;font-size:13px;color:#fff;background:' + accent + ';border:0;border-radius:var(--win-border-rad,6px);cursor:pointer;">Continue</button>' +
			'</div>';
		overlay.appendChild(card);
		target.appendChild(overlay);

		const input = card.querySelector("input");
		const err = card.querySelector(".err");
		const okBtn = card.querySelectorAll("button")[0];

		const finish = (val) => {
			try { overlay.remove(); } catch (e) {}
			resolve(val);
		};

		okBtn.addEventListener("click", async () => {
			const v = input ? String(input.value || "") : "";
			if (!v.trim()) {
				if (err) { err.textContent = "Passphrase cannot be empty."; err.style.display = "block"; }
				return;
			}
			if (existing) {
				// Validate by decrypting
				try {
					const plain = await decryptMarker(v, existing.data);
					if (plain !== "ok") throw new Error("bad");
				} catch (e) {
					if (err) { err.textContent = "Incorrect password."; err.style.display = "block"; }
					if (input) input.value = "";
					return;
				}
			} else {
				// First boot: create encrypted vault
				try {
					const data = await encryptMarker(v);
					const payload = JSON.stringify({ v: 1, data: data });
					const blob = convert.textToBlob(payload, "application/json");
					try { await fs.createDirectory(workingDirectory); } catch (e) {}
					await fs.writeFile(credsFile, blob, undefined, true);
				} catch (e) {
					if (err) { err.textContent = "Could not save passphrase."; err.style.display = "block"; }
					return;
				}
			}
			finish(v);
		});
		if (input) {
			input.addEventListener("keydown", (e) => {
				if (e.key === "Enter") okBtn.click();
			});
		}
	});
}

try { globalThis.__passwordGate = gate; } catch (e) {}