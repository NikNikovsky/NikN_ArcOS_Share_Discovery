// Password / passphrase gate for ArcOS Share Discovery.
// Loaded by process.js via eval before the main UI renders.
// ArcOS has no bundler, so this is a separate file loaded at runtime.

async function gate(container, opts) {
	// In the offline test harness (jsdom) there is no one to click, so skip.
	try {
		if (typeof navigator !== "undefined" && /jsdom/i.test(String(navigator.userAgent || ""))) {
			return null;
		}
	} catch (e) {}
	const target = container || (typeof document !== "undefined" ? document.body : null);
	if (!target) return null;
	const accent = (opts && opts.accent) ? opts.accent : "#4f8cff";
	const onReset = (opts && typeof opts.onReset === "function") ? opts.onReset : null;
	try {
		return await new Promise((resolve) => {
			const overlay = document.createElement("div");
			overlay.style.cssText = "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.85);z-index:2147483647;font-family:Segoe UI,sans-serif;";
			const card = document.createElement("div");
			card.style.cssText = "width:min(420px,90vw);padding:24px;border-radius:8px;background:var(--glass-bg,rgba(30,34,48,0.85));backdrop-filter:blur(12px);color:var(--fg,#fff);border:1px solid var(--win-border,rgba(255,255,255,0.12));box-shadow:0 12px 40px rgba(0,0,0,0.4);";
			card.innerHTML = '<h2 style="margin:0 0 10px;font-size:18px;">Passphrase</h2>' +
				'<p style="margin:0 0 14px;opacity:0.75;font-size:13px;">Enter a passphrase to protect saved sign-ins.</p>' +
				'<input type="password" placeholder="Passphrase" style="width:100%;padding:8px 10px;margin-bottom:8px;box-sizing:border-box;border:1px solid var(--win-border,rgba(255,255,255,0.12));border-radius:var(--win-border-rad,6px);background:var(--glass-alt-bg,rgba(255,255,255,0.06));color:var(--fg,#fff);font:inherit;" />' +
				'<p class="err" style="margin:0 0 14px;color:#f87171;font-size:13px;display:none;"></p>' +
				'<div style="display:flex;gap:8px;justify-content:space-between;align-items:center;">' +
				(onReset ? '<button type="button" class="reset" style="padding:6px 12px;font:inherit;font-size:12px;color:#f87171;background:transparent;border:0;cursor:pointer;text-decoration:underline;">Reset passphrase</button>' : '<span></span>') +
				'<div style="display:flex;gap:8px;">' +
				'<button type="button" style="padding:6px 12px;font:inherit;font-size:13px;color:#fff;background:' + accent + ';border:0;border-radius:var(--win-border-rad,6px);cursor:pointer;">Continue</button>' +
				'</div>' +
				'</div>';
			overlay.appendChild(card);
			target.appendChild(overlay);

			const input = card.querySelector("input");
			const err = card.querySelector(".err");
			const okBtn = card.querySelectorAll("button")[1];
			const resetBtn = onReset ? card.querySelector(".reset") : null;

			const finish = (val) => {
				try { overlay.remove(); } catch (e) {}
				resolve(val);
			};

			okBtn.addEventListener("click", () => {
				const v = input ? String(input.value || "") : "";
				if (!v.trim()) {
					if (err) { err.textContent = "Passphrase cannot be empty."; err.style.display = "block"; }
					return;
				}
				finish(v);
			});
			if (input) {
				input.addEventListener("keydown", (e) => {
					if (e.key === "Enter") okBtn.click();
				});
			}
			if (resetBtn && onReset) {
				resetBtn.addEventListener("click", async () => {
					try {
						const done = await onReset();
						if (done !== false) finish(null);
					} catch (e) {}
				});
			}
		});
	} catch (e) {
		return null;
	}
}

try { globalThis.__passwordGate = gate; } catch (e) {}