// Reset the demo to its original seed. The flat-file data layer persists to
// localStorage; clearing it and reloading re-seeds from database/seed.json.
// Also clears in-memory state (settings, score weights) via the reload.
export function resetDemo() {
  try {
    localStorage.clear()
  } catch {
    /* ignore */
  }
  window.location.reload()
}
