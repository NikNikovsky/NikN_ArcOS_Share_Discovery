// Password / passphrase gate for ArcOS Share Discovery.
// Loaded by process.js via eval before the main UI renders.
// ArcOS has no bundler, so this is a separate file loaded at runtime.

// Full-screen gate that runs before the main window renders.
// Returns a passphrase string, or null if the user skips.
async function gate() {
	// No-op for now: password handling removed from the app.
	// Re-add passphrase logic here when needed. Returns immediately so
	// the app (and the offline test harness) are not blocked.
	return null;
}