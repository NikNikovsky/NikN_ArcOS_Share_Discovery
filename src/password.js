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
	try {
		return await new Promise((resolve) => {
			const overlay = document.createElement("div");
			overlay.style.cssText = "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.85);z-index:2147483647;font-family:Segoe UI,sans-serif;";
			const card = document.createElement("div");
			card.style.cssText = "width:min(420px,90vw);padding:24px;border-radius:8px;background:#1e2230;color:#fff;";
			card.innerHTML = '<h2 style="margin:0 0 12px">Passphrase</h2>' +
				'<p style="margin:0 0 12px;opacity:0.8">Enter a passphrase to protect saved sign-ins. Leave blank to skip.</p>' +
				'<input type="password" placeholder="Passphrase" style="width:100%;padding:8px;margin-bottom:12px;box-sizing:border-box;" />' +
				'<div style="display:flex;gap:8px;justify-content:flex-end;">' +
				'<button type="button" style="padding:6px 12px;">Skip</button>' +
				'<button type="button" style="padding:6px 12px;background:' + accent + ';color:#fff;border:0;border-radius:4px;">Continue</button>' +
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