// Password / passphrase gate for ArcOS Share Discovery.
// Loaded by process.js via eval before the main UI renders.
// ArcOS has no bundler, so this is a separate file loaded at runtime.

// Full-screen gate that runs before the main window renders.
// Returns a passphrase string, or null if the user skips.
async function gate(container) {
	// In the offline test harness (jsdom) there is no one to click, so skip.
	try {
		if (typeof navigator !== "undefined" && /jsdom/i.test(String(navigator.userAgent || ""))) {
			return null;
		}
	} catch (e) {}
	const target = container || document.body;
	if (!target) return null;
	return new Promise((resolve) => {
		const overlay = document.createElement("div");
		overlay.style.cssText = "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.75);z-index:9999;font-family:Segoe UI,sans-serif;";
		const card = document.createElement("div");
		card.style.cssText = "width:min(420px,90vw);padding:24px;border-radius:8px;background:#1e2230;color:#fff;";
		card.innerHTML = '<h2 style="margin:0 0 12px">Passphrase</h2>' +
			'<p style="margin:0 0 12px;opacity:0.8">Enter a passphrase to protect saved sign-ins. Leave blank to skip.</p>' +
			'<input type="password" placeholder="Passphrase" style="width:100%;padding:8px;margin-bottom:12px;box-sizing:border-box;" />' +
			'<div style="display:flex;gap:8px;justify-content:flex-end;">' +
			'<button type="button" style="padding:6px 12px;">Skip</button>' +
			'<button type="button" style="padding:6px 12px;background:#4f8cff;color:#fff;border:0;border-radius:4px;">Continue</button>' +
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
}