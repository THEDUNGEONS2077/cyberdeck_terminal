/**
 * bridge/grant.js: the grant window's buttons (grant.html).
 *
 * Layer: bridge extension (its own page).
 *
 * ALLOW asks Chrome for the site in the address (`?origin=https://site/*`):
 * chrome.permissions.request works only from an extension's own page and
 * only on a click, which is why this window exists. Either way the answer
 * goes to background.js, which passes it to the dashboard, and the window
 * closes.
 */
const origin = new URLSearchParams(location.search).get('origin') ?? '';
// The same shape background.js accepts: `https://host/*`, nothing else.
const valid = /^https?:\/\/[a-z0-9.-]+\/\*$/i.test(origin);

document.getElementById('site').textContent = valid ? origin.slice(0, -2) : '(NOT A SITE)';
document.getElementById('allow').disabled = !valid;

/** Tells the bridge (and through it the dashboard) the answer, then closes. */
async function answer(granted) {
  try {
    await chrome.runtime.sendMessage({ type: 'granted', origin, granted });
  } finally {
    window.close();
  }
}

document.getElementById('allow').addEventListener('click', async () => {
  // A refusal and a failure are the same answer: no.
  const granted = await chrome.permissions.request({ origins: [origin] }).catch(() => false);
  await answer(granted);
});
document.getElementById('cancel').addEventListener('click', () => answer(false));
document.getElementById('allow').focus();
