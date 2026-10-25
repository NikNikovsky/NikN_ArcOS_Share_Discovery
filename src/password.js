// Password / passphrase gate for ArcOS Share Discovery.
// Loaded by process.js via eval before the main UI renders.
// ArcOS has no bundler, so this is a separate file loaded at runtime.

async function gate(container) {
	// In the offline test harness (jsdom) there is no one to click, so skip.
	try {
		if (typeof navigator !== "undefined" && /jsdom/i.test(String(navigator.userAgent || ""))) {
			return null;
		}
	} catch (e) {}
	const target = container || (typeof document !== "undefined" ? document.body : null);
	if (!target) return null;
	try {
		return await new Promise((resolve) => {
			const overlay = document.createElement("div");
			overlay.style.cssText = "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:var(--darkened-overlay,rgba(0,0,0,0.6));z-index:2147483647;font-family:Segoe UI,sans-serif;";
			const card = document.createElement("div");
			card.style.cssText = "width:min(420px,90vw);padding:20px 22px;border:var(--win-border,1px solid rgba(255,255,255,0.12));border-radius:var(--win-border-rad,8px);background:var(--win-bg,var(--glass-bg,#1e2230));color:var(--fg,#fff);box-shadow:0 12px 40px rgba(0,0,0,0.4);";
			card.innerHTML = '<h2 style="margin:0 0 10px;font-size:18px;">Passphrase</h2>' +
				'<p style="margin:0 0 14px;opacity:0.75;font-size:13px;">Enter a passphrase to protect saved sign-ins. Leave blank to skip.</p>' +
				'<input type="password" placeholder="Passphrase" style="width:100%;padding:8px 10px;margin-bottom:14px;box-sizing:border-box;border:var(--win-border,1px solid rgba(255,255,255,0.12));border-radius:var(--win-border-rad,6px);background:var(--glass-alt-bg,rgba(255,255,255,0.06));color:var(--fg,#fff);font:inherit;" />' +
				'<div style="display:flex;gap:8px;justify-content:flex-end;">' +
				'<button type="button" style="padding:6px 12px;font:inherit;font-size:13px;color:var(--fg,#fff);background:var(--button-glass-bg,var(--glass-alt-bg,rgba(255,255,255,0.08)));border:var(--win-border,1px solid rgba(255,255,255,0.12));border-radius:var(--win-border-rad,6px);cursor:pointer;">Skip</button>' +
				'<button type="button" style="padding:6px 12px;font:inherit;font-size:13px;color:#fff;background:#4f8cff;border:0;border-radius:var(--win-border-rad,6px);cursor:pointer;">Continue</button>' +
				'</div>';
			overlay.appendChild(card);
			target.appendChild(overlay);

			const input = card.querySelector("input");
			const skipBtn = card.querySelectorAll("button")[0];
			const okBtn = card.querySelectorAll("button")[1];

			const finish = (val) => {
				try { overlay.remove(); } catch (e) {}
				resolve(val);
			};

			skipBtn.addEventListener("click", () => finish(null));
			okBtn.addEventListener("click", () => {
				const v = input ? String(input.value || "") : "";
				finish(v.trim() ? v : null);
			});
			if (input) {
				input.addEventListener("keydown", (e) => {
					if (e.key === "Enter") okBtn.click();
				});
			}
		});
	} catch (e) {
		try { console.log("GATE ERROR:", e && e.message); } catch (x) {}
		return null;
	}
}

try { globalThis.__passwordGate = gate; } catch (e) {}