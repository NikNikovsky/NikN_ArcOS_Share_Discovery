// Password / passphrase gate for ArcOS Share Discovery.
// Loaded by process.js via eval before the main UI renders.
// ArcOS has no bundler, so this is a separate file loaded at runtime.

// Full-screen gate that runs before the main window renders.
// Receives the window body element. Returns a passphrase string, or null if skipped.
async function gate(body) {
	// In the offline test harness (jsdom) there is no one to click, so skip.
	try {
		if (typeof navigator !== "undefined" && /jsdom/i.test(String(navigator.userAgent || ""))) {
			return null;
		}
	} catch (e) {}
	if (!body) return null;
	return new Promise((resolve) => {
		body.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:12px;font-family:Segoe UI,sans-serif;">' +
			'<h2 style="margin:0">Passphrase</h2>' +
			'<p style="margin:0;opacity:0.8;text-align:center;max-width:360px;">Enter a passphrase to protect saved sign-ins. Leave blank to skip.</p>' +
			'<input type="password" placeholder="Passphrase" style="width:280px;padding:8px;box-sizing:border-box;" />' +
			'<div style="display:flex;gap:8px;">' +
			'<button type="button" style="padding:6px 12px;">Skip</button>' +
			'<button type="button" style="padding:6px 12px;background:#4f8cff;color:#fff;border:0;border-radius:4px;">Continue</button>' +
			'</div>' +
			'</div>';

		const input = body.querySelector("input");
		const skipBtn = body.querySelectorAll("button")[0];
		const okBtn = body.querySelectorAll("button")[1];

		const finish = (val) => {
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